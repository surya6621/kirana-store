const pool = require("../config/db");

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

        // Supplier outstanding
        const supplierDueResult = await pool.query(`
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
                ) AS supplier_due
            FROM supplier_credit_transactions
        `);

        // Low stock
        const lowStockResult = await pool.query(`
            SELECT
                p.id,
                p.name,
                p.unit,
                i.quantity AS current_stock,
                i.minimum_stock
            FROM products p
            JOIN inventory i
                ON p.id = i.product_id
            WHERE p.is_active = true
              AND i.quantity <= i.minimum_stock
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

                supplier_due:
                    Number(
                        supplierDueResult.rows[0].supplier_due
                    ),

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

module.exports = {
    getDashboard,
};