const pool = require("../config/db");
const { getAllSupplierBalances, roundMoney } = require("../services/supplierBalance");

const STORE_TIMEZONE = "Asia/Kolkata";

function getPeriodBounds(period, start, end) {
    const allowedPeriods = ["today", "week", "month", "year", "custom"];
    const selectedPeriod = allowedPeriods.includes(period) ? period : "today";

    if (selectedPeriod === "custom") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start || "") || !/^\d{4}-\d{2}-\d{2}$/.test(end || "")) {
            return null;
        }
        if (start > end) return null;
        return { period: selectedPeriod, start, end };
    }

    return { period: selectedPeriod, start: null, end: null };
}

const getReports = async (req, res) => {
    const bounds = getPeriodBounds(req.query.period, req.query.start, req.query.end);
    if (!bounds) {
        return res.status(400).json({ success: false, message: "A valid custom date range is required" });
    }

    const values = [bounds.period, bounds.start, bounds.end];
    const periodSql = `
        CROSS JOIN LATERAL (
            SELECT
                CASE
                    WHEN $1 = 'custom' THEN $2::date
                    WHEN $1 = 'year' THEN date_trunc('year', local_now)::date
                    WHEN $1 = 'month' THEN date_trunc('month', local_now)::date
                    WHEN $1 = 'week' THEN (local_now::date - (EXTRACT(ISODOW FROM local_now)::int - 1))::date
                    ELSE local_now::date
                END AS period_start,
                CASE
                    WHEN $1 = 'custom' THEN ($3::date + 1)
                    ELSE local_now::date + 1
                END AS period_end
            FROM (SELECT CURRENT_TIMESTAMP AT TIME ZONE '${STORE_TIMEZONE}' AS local_now) clock
        ) bounds
    `;

    try {
        const [salesResult, purchasesResult, receivedResult, sentResult, inventoryResult, topProductsResult, trendResult, recentSalesResult, recentPurchasesResult] = await Promise.all([
            pool.query(`
                SELECT
                    COALESCE(SUM(s.total_amount), 0) AS revenue,
                    COUNT(*) AS bills,
                    COALESCE(SUM(s.total_amount - COALESCE(paid.amount, 0)), 0) AS credit_sales,
                    COALESCE(SUM(CASE WHEN COALESCE(paid.amount, 0) >= s.total_amount THEN s.total_amount ELSE 0 END), 0) AS paid_sales,
                    COALESCE(AVG(s.total_amount), 0) AS average_bill
                FROM sales s
                ${periodSql}
                LEFT JOIN LATERAL (
                    SELECT COALESCE(SUM(p.amount), 0) AS amount
                    FROM payments p
                    WHERE p.sale_id = s.id
                ) paid ON TRUE
                WHERE s.status = 'COMPLETED'
                  AND s.created_at AT TIME ZONE '${STORE_TIMEZONE}' >= bounds.period_start
                  AND s.created_at AT TIME ZONE '${STORE_TIMEZONE}' < bounds.period_end
            `, values),
            pool.query(`
                SELECT
                    COALESCE(SUM(total_amount), 0) AS total,
                    COUNT(*) AS count,
                    COALESCE(SUM(amount_paid), 0) AS amount_paid,
                    COALESCE(SUM(total_amount - amount_paid), 0) AS amount_due
                FROM purchases
                ${periodSql}
                                WHERE created_at AT TIME ZONE '${STORE_TIMEZONE}' >= bounds.period_start
                                    AND created_at AT TIME ZONE '${STORE_TIMEZONE}' < bounds.period_end
            `, values),
            pool.query(`
                WITH received AS (
                    SELECT p.amount, p.payment_method, p.created_at
                    FROM payments p
                    JOIN sales s ON s.id = p.sale_id
                    WHERE s.status = 'COMPLETED'
                    UNION ALL
                    SELECT ct.amount,
                        CASE
                            WHEN ct.description ILIKE '%CASH%' THEN 'CASH'
                            WHEN ct.description ILIKE '%UPI%' THEN 'UPI'
                            ELSE 'OTHER'
                        END,
                        ct.created_at
                    FROM customer_credit_transactions ct
                    WHERE ct.transaction_type = 'PAYMENT' AND ct.sale_id IS NULL
                )
                SELECT COALESCE(SUM(amount), 0) AS total,
                    COALESCE(SUM(amount) FILTER (WHERE payment_method = 'CASH'), 0) AS cash,
                    COALESCE(SUM(amount) FILTER (WHERE payment_method = 'UPI'), 0) AS upi,
                    COALESCE(SUM(amount) FILTER (WHERE payment_method = 'OTHER'), 0) AS other
                FROM received
                ${periodSql}
                                WHERE received.created_at AT TIME ZONE '${STORE_TIMEZONE}' >= bounds.period_start
                                    AND received.created_at AT TIME ZONE '${STORE_TIMEZONE}' < bounds.period_end
            `, values),
            pool.query(`
                WITH sent AS (
                    SELECT p.amount_paid AS amount, 'OTHER' AS payment_method, p.created_at
                    FROM purchases p
                    WHERE p.amount_paid > 0
                    UNION ALL
                    SELECT sct.amount,
                        CASE
                            WHEN sct.description ILIKE '%CASH%' THEN 'CASH'
                            WHEN sct.description ILIKE '%UPI%' THEN 'UPI'
                            ELSE 'OTHER'
                        END,
                        sct.created_at
                    FROM supplier_credit_transactions sct
                    WHERE sct.transaction_type = 'PAYMENT'
                )
                SELECT COALESCE(SUM(amount), 0) AS total,
                    COALESCE(SUM(amount) FILTER (WHERE payment_method = 'CASH'), 0) AS cash,
                    COALESCE(SUM(amount) FILTER (WHERE payment_method = 'UPI'), 0) AS upi,
                    COALESCE(SUM(amount) FILTER (WHERE payment_method = 'OTHER'), 0) AS other
                FROM sent
                ${periodSql}
                                WHERE sent.created_at AT TIME ZONE '${STORE_TIMEZONE}' >= bounds.period_start
                                    AND sent.created_at AT TIME ZONE '${STORE_TIMEZONE}' < bounds.period_end
            `, values),
            pool.query(`
                SELECT
                    COUNT(*) AS total_products,
                    COUNT(*) FILTER (WHERE COALESCE(i.quantity, 0) > 0 AND COALESCE(i.quantity, 0) <= p.minimum_stock) AS low_stock,
                    COUNT(*) FILTER (WHERE COALESCE(i.quantity, 0) <= 0) AS out_of_stock,
                    COUNT(*) FILTER (WHERE COALESCE(i.quantity, 0) > p.minimum_stock) AS well_stocked,
                    COALESCE(SUM(COALESCE(i.quantity, 0) * COALESCE(p.purchase_price, 0)), 0) AS stock_value
                FROM products p
                LEFT JOIN inventory i ON i.product_id = p.id
                WHERE p.is_active = true
            `),
            pool.query(`
                SELECT p.id, p.name, p.unit,
                    SUM(si.quantity) AS quantity_sold,
                    SUM((si.quantity * si.price) - si.discount) AS sales_value
                FROM sale_items si
                JOIN sales s ON s.id = si.sale_id AND s.status = 'COMPLETED'
                JOIN products p ON p.id = si.product_id
                ${periodSql}
                WHERE s.created_at AT TIME ZONE '${STORE_TIMEZONE}' >= bounds.period_start AND s.created_at AT TIME ZONE '${STORE_TIMEZONE}' < bounds.period_end
                GROUP BY p.id, p.name, p.unit
                ORDER BY quantity_sold DESC, sales_value DESC
                LIMIT 8
            `, values),
            pool.query(`
                SELECT date_bucket, SUM(amount) AS sales
                FROM (
                    SELECT date_trunc(
                        CASE WHEN $1 = 'year' THEN 'month' ELSE 'day' END,
                        s.created_at AT TIME ZONE '${STORE_TIMEZONE}'
                    ) AS date_bucket, s.total_amount AS amount
                    FROM sales s
                    ${periodSql}
                    WHERE s.status = 'COMPLETED'
                      AND s.created_at AT TIME ZONE '${STORE_TIMEZONE}' >= bounds.period_start AND s.created_at AT TIME ZONE '${STORE_TIMEZONE}' < bounds.period_end
                ) period_sales
                GROUP BY date_bucket
                ORDER BY date_bucket ASC
            `, values),
            pool.query(`
                SELECT s.id, s.total_amount, s.payment_status, s.created_at, c.name AS customer_name
                FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
                ${periodSql}
                WHERE s.status = 'COMPLETED' AND s.created_at AT TIME ZONE '${STORE_TIMEZONE}' >= bounds.period_start AND s.created_at AT TIME ZONE '${STORE_TIMEZONE}' < bounds.period_end
                ORDER BY s.created_at DESC LIMIT 8
            `, values),
            pool.query(`
                SELECT p.id, p.total_amount, p.amount_paid, p.payment_status, p.created_at, s.name AS supplier_name
                FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id
                ${periodSql}
                WHERE p.created_at AT TIME ZONE '${STORE_TIMEZONE}' >= bounds.period_start AND p.created_at AT TIME ZONE '${STORE_TIMEZONE}' < bounds.period_end
                ORDER BY p.created_at DESC LIMIT 8
            `, values),
        ]);

        const inventoryWatchResult = await pool.query(`
            SELECT p.id, p.name, p.unit, COALESCE(i.quantity, 0) AS current_stock, p.minimum_stock
            FROM products p LEFT JOIN inventory i ON i.product_id = p.id
            WHERE p.is_active = true AND COALESCE(i.quantity, 0) <= p.minimum_stock
            ORDER BY CASE WHEN COALESCE(i.quantity, 0) <= 0 THEN 0 ELSE 1 END, COALESCE(i.quantity, 0) ASC, p.name ASC
            LIMIT 10
        `);

        const client = await pool.connect();
        let supplierBalances;
        try {
            supplierBalances = await getAllSupplierBalances(client);
        } finally {
            client.release();
        }

        const sales = salesResult.rows[0];
        const purchases = purchasesResult.rows[0];
        const received = receivedResult.rows[0];
        const sent = sentResult.rows[0];
        const inventory = inventoryResult.rows[0];
        const supplierDue = roundMoney(supplierBalances.reduce((total, supplier) => total + Number(supplier.total_due), 0));
        const customerDueResult = await pool.query(`
            SELECT COALESCE(SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE -amount END), 0) AS total_due
            FROM customer_credit_transactions
        `);

        res.json({
            success: true,
            data: {
                period: bounds,
                sales: {
                    revenue: Number(sales.revenue), bills: Number(sales.bills), average_bill: Number(sales.average_bill),
                    paid_sales: Number(sales.paid_sales), credit_sales: Number(sales.credit_sales),
                },
                purchases: {
                    total: Number(purchases.total), count: Number(purchases.count), amount_paid: Number(purchases.amount_paid), amount_due: Number(purchases.amount_due),
                },
                money: {
                    received: Number(received.total), sent: Number(sent.total), net_cash_movement: roundMoney(Number(received.total) - Number(sent.total)),
                    received_breakdown: { cash: Number(received.cash), upi: Number(received.upi), other: Number(received.other) },
                    sent_breakdown: { cash: Number(sent.cash), upi: Number(sent.upi), other: Number(sent.other) },
                },
                dues: { customer: Number(customerDueResult.rows[0].total_due), supplier: supplierDue },
                inventory: {
                    total_products: Number(inventory.total_products), low_stock: Number(inventory.low_stock), out_of_stock: Number(inventory.out_of_stock), well_stocked: Number(inventory.well_stocked), stock_value: Number(inventory.stock_value),
                },
                low_stock: inventoryWatchResult.rows,
                top_products: topProductsResult.rows,
                sales_trend: trendResult.rows,
                recent_sales: recentSalesResult.rows,
                recent_purchases: recentPurchasesResult.rows,
            },
        });
    } catch (error) {
        console.error("Reports error:", error);
        res.status(500).json({ success: false, message: "Failed to load reports" });
    }
};

module.exports = { getReports };
