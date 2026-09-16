const pool = require("../config/db");
const { getAllSupplierBalances, roundMoney } = require("../services/supplierBalance");

const getDashboard = async (req, res) => {
    try {
        // Today's sales
        const salesResult = await pool.query(`
            SELECT
                COALESCE(SUM(total_amount), 0) AS today_sales,
                COUNT(*) AS today_sales_count
            FROM sales
            WHERE status = 'COMPLETED'
              AND created_at >= CURRENT_DATE
              AND created_at < CURRENT_DATE + INTERVAL '1 day'
        `);

        // Total active products
        const productsResult = await pool.query(`
            SELECT COUNT(*) AS total_products
            FROM products
            WHERE is_active = true
        `);

        // Customer outstanding
        const customerDueResult = await pool.query(`
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN transaction_type = 'CREDIT'
                            THEN amount
                            WHEN transaction_type = 'PAYMENT'
                            THEN -amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS customer_due
            FROM customer_credit_transactions
        `);

        // Supplier outstanding uses the same purchase-aware allocation as the supplier pages.
        const supplierBalanceClient = await pool.connect();
        let supplierBalances;
        try {
            supplierBalances = await getAllSupplierBalances(supplierBalanceClient);
        } finally {
            supplierBalanceClient.release();
        }
        const supplierDue = roundMoney(
            supplierBalances.reduce((total, supplier) => total + supplier.total_due, 0)
        );

        // Low stock
        const lowStockResult = await pool.query(`
            SELECT
                p.id,
                p.name,
                p.unit,
                COALESCE(i.quantity, 0) AS current_stock,
                p.minimum_stock,
                p.image_url
            FROM products p
                        LEFT JOIN inventory i
                ON p.id = i.product_id
            WHERE p.is_active = true
                            AND COALESCE(i.quantity, 0) <= p.minimum_stock
            ORDER BY i.quantity ASC
            LIMIT 10
        `);

        // Recent sales
        const recentSalesResult = await pool.query(`
            SELECT
                s.id,
                s.total_amount,
                s.payment_status,
                s.sale_type,
                s.created_at,
                c.name AS customer_name
            FROM sales s
            LEFT JOIN customers c
                ON s.customer_id = c.id
            WHERE s.status = 'COMPLETED'
            ORDER BY s.created_at DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                today_sales:
                    Number(
                        salesResult.rows[0].today_sales
                    ),

                today_sales_count:
                    Number(
                        salesResult.rows[0].today_sales_count
                    ),

                total_products:
                    Number(
                        productsResult.rows[0].total_products
                    ),

                customer_due:
                    Number(
                        customerDueResult.rows[0].customer_due
                    ),

                supplier_due: supplierDue,

                low_stock:
                    lowStockResult.rows,

                recent_sales:
                    recentSalesResult.rows,
            },
        });

    } catch (error) {
        console.error(
            "Dashboard error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load dashboard",
        });
    }
};

const getPaymentHistory = async (req, res) => {
    try {
        const period = ["all", "today", "month", "year"].includes(req.query.period)
            ? req.query.period
            : "all";
        const periodCondition = {
            all: "TRUE",
            today: "local_date = store_today",
            month: "local_date >= store_month",
            year: "local_date >= store_year",
        }[period];

        const result = await pool.query(`
            WITH all_payments AS (
                SELECT
                    'customer-' || ct.id AS payment_id,
                    c.name AS party_name,
                    c.customer_code,
                    'CUSTOMER' AS party_type,
                    c.phone,
                    ct.sale_id AS reference_id,
                    CASE WHEN ct.sale_id IS NOT NULL THEN 'Bill #' || ct.sale_id ELSE NULL END AS reference_number,
                    ct.amount,
                    'MONEY IN' AS direction,
                    COALESCE(pm.payment_method,
                        CASE
                            WHEN ct.description ILIKE '%CASH%' THEN 'CASH'
                            WHEN ct.description ILIKE '%UPI%' THEN 'UPI'
                            ELSE NULL
                        END
                    ) AS payment_method,
                    ct.created_at,
                    ct.description,
                    ct.created_at AT TIME ZONE 'Asia/Kolkata' AS local_created_at
                FROM customer_credit_transactions ct
                JOIN customers c ON c.id = ct.customer_id
                LEFT JOIN LATERAL (
                    SELECT p.payment_method
                    FROM payments p
                    WHERE p.sale_id = ct.sale_id
                      AND p.amount = ct.amount
                    ORDER BY ABS(EXTRACT(EPOCH FROM (p.created_at - ct.created_at))), p.id
                    LIMIT 1
                ) pm ON TRUE
                WHERE ct.transaction_type = 'PAYMENT'

                UNION ALL

                SELECT
                    'supplier-' || sct.id AS payment_id,
                    s.name AS party_name,
                    NULL AS customer_code,
                    'SUPPLIER' AS party_type,
                    s.phone,
                    sct.purchase_id AS reference_id,
                    CASE WHEN sct.purchase_id IS NOT NULL THEN 'Purchase #' || sct.purchase_id ELSE NULL END AS reference_number,
                    sct.amount,
                    'MONEY OUT' AS direction,
                    CASE
                        WHEN sct.description ILIKE '%CASH%' THEN 'CASH'
                        WHEN sct.description ILIKE '%UPI%' THEN 'UPI'
                        ELSE NULL
                    END AS payment_method,
                    sct.created_at,
                    sct.description,
                    sct.created_at AT TIME ZONE 'Asia/Kolkata' AS local_created_at
                FROM supplier_credit_transactions sct
                JOIN suppliers s ON s.id = sct.supplier_id
                WHERE sct.transaction_type = 'PAYMENT'
            ), dated_payments AS (
                SELECT
                    all_payments.*,
                    local_created_at::date AS local_date,
                    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date AS store_today,
                    date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date AS store_month,
                    date_trunc('year', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date AS store_year
                FROM all_payments
            ), filtered_payments AS (
                SELECT * FROM dated_payments
                WHERE ${periodCondition}
            )
            SELECT
                json_agg(
                    json_build_object(
                        'payment_id', payment_id,
                        'party_name', party_name,
                        'customer_code', customer_code,
                        'party_type', party_type,
                        'phone', phone,
                        'reference_id', reference_id,
                        'reference_number', reference_number,
                        'amount', amount,
                        'direction', direction,
                        'payment_method', payment_method,
                        'created_at', created_at,
                        'description', description
                    ) ORDER BY created_at DESC
                ) FILTER (WHERE payment_id IS NOT NULL) AS payments,
                COALESCE(SUM(amount) FILTER (WHERE party_type = 'SUPPLIER' AND local_date = store_today), 0) AS sent_today,
                COALESCE(SUM(amount) FILTER (WHERE party_type = 'SUPPLIER' AND local_date >= store_month), 0) AS sent_this_month,
                COALESCE(SUM(amount) FILTER (WHERE party_type = 'SUPPLIER' AND local_date >= store_year), 0) AS sent_this_year,
                COALESCE(SUM(amount) FILTER (WHERE party_type = 'CUSTOMER' AND local_date = store_today), 0) AS received_today,
                COALESCE(SUM(amount) FILTER (WHERE party_type = 'CUSTOMER' AND local_date >= store_month), 0) AS received_this_month,
                COALESCE(SUM(amount) FILTER (WHERE party_type = 'CUSTOMER' AND local_date >= store_year), 0) AS received_this_year
            FROM filtered_payments
        `);

        const row = result.rows[0];
        res.json({
            success: true,
            data: {
                payments: row.payments || [],
                summary: {
                    sent_today: Number(row.sent_today),
                    sent_this_month: Number(row.sent_this_month),
                    sent_this_year: Number(row.sent_this_year),
                    received_today: Number(row.received_today),
                    received_this_month: Number(row.received_this_month),
                    received_this_year: Number(row.received_this_year),
                },
            },
        });
    } catch (error) {
        console.error("Payment history error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load payment history",
        });
    }
};

module.exports = {
    getDashboard,
    getPaymentHistory,
};