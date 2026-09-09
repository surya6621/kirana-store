const pool = require("../config/db");

// =========================================
// GET ALL CUSTOMERS
// =========================================

const getCustomers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                c.id,
                c.name,
                c.phone,
                c.address,
                c.created_at,
                COALESCE(
                    SUM(
                        CASE
                            WHEN ct.transaction_type = 'CREDIT'
                            THEN ct.amount
                            WHEN ct.transaction_type = 'PAYMENT'
                            THEN -ct.amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_due
            FROM customers c
            LEFT JOIN customer_credit_transactions ct
                ON c.id = ct.customer_id
            GROUP BY
                c.id,
                c.name,
                c.phone,
                c.address,
                c.created_at
            ORDER BY c.name ASC
        `);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Get customers error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get customers",
        });
    }
};


// =========================================
// CREATE CUSTOMER
// =========================================

const createCustomer = async (req, res) => {
    try {
        const {
            name,
            phone,
            address,
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Customer name is required",
            });
        }

        const result = await pool.query(
            `INSERT INTO customers (
                name,
                phone,
                address
            )
            VALUES ($1, $2, $3)
            RETURNING *`,
            [
                name,
                phone || null,
                address || null,
            ]
        );

        res.status(201).json({
            success: true,
            message: "Customer created successfully",
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Create customer error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Customer phone number already exists",
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to create customer",
        });
    }
};


// =========================================
// GET CUSTOMER CREDIT HISTORY
// =========================================

const getCustomerCreditHistory = async (req, res) => {
    try {
        const { customerId } = req.params;

        const customerResult = await pool.query(
            `SELECT id, name, phone, address
             FROM customers
             WHERE id = $1`,
            [customerId]
        );

        if (customerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        const historyResult = await pool.query(
            `SELECT
                ct.id,
                ct.transaction_type,
                ct.amount,
                ct.description,
                ct.sale_id,
                ct.created_at,
                u.name AS created_by_name
             FROM customer_credit_transactions ct
             LEFT JOIN users u
                ON ct.created_by = u.id
             WHERE ct.customer_id = $1
             ORDER BY ct.created_at DESC`,
            [customerId]
        );

        res.json({
            success: true,
            data: {
                customer: customerResult.rows[0],
                history: historyResult.rows,
            },
        });
    } catch (error) {
        console.error("Customer credit history error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get customer credit history",
        });
    }
};

// =========================================
// RECORD CUSTOMER PAYMENT
// =========================================

const recordCustomerPayment = async (req, res) => {
    const client = await pool.connect();

    try {
        const { customerId } = req.params;
        const {
            amount,
            payment_method,
            description,
        } = req.body;

        const paymentAmount = Number(amount);

        // Validate amount
        if (
            !Number.isFinite(paymentAmount) ||
            paymentAmount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment amount must be greater than 0",
            });
        }

        // Validate payment method
        if (!["CASH", "UPI"].includes(payment_method)) {
            return res.status(400).json({
                success: false,
                message: "Payment method must be CASH or UPI",
            });
        }

        await client.query("BEGIN");

        // Check customer
        const customerResult = await client.query(
            `SELECT id, name
             FROM customers
             WHERE id = $1`,
            [customerId]
        );

        if (customerResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        // Calculate current due
        const dueResult = await client.query(
            `SELECT
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
                ) AS total_due
             FROM customer_credit_transactions
             WHERE customer_id = $1`,
            [customerId]
        );

        const currentDue = Number(
            dueResult.rows[0].total_due
        );

        if (currentDue <= 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Customer has no outstanding due",
            });
        }

        // Cannot pay more than due
        if (paymentAmount > currentDue) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    `Payment cannot be greater than current due of ₹${currentDue}`,
            });
        }

        const remainingDue = Number(
            (currentDue - paymentAmount).toFixed(2)
        );

        // Record payment
        await client.query(
            `INSERT INTO customer_credit_transactions (
                customer_id,
                transaction_type,
                amount,
                description,
                created_by
            )
            VALUES (
                $1,
                'PAYMENT',
                $2,
                $3,
                $4
            )`,
            [
                customerId,
                paymentAmount,
                description ||
                    `Customer payment via ${payment_method}`,
                req.user.userId,
            ]
        );

        await client.query("COMMIT");

        res.json({
            success: true,
            message: "Customer payment recorded successfully",
            data: {
                customer_id: customerId,
                customer_name:
                    customerResult.rows[0].name,
                payment_method,
                amount_paid: paymentAmount,
                previous_due: currentDue,
                remaining_due: remainingDue,
            },
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Record customer payment error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to record customer payment",
        });
    } finally {
        client.release();
    }
};

module.exports = {
    getCustomers,
    createCustomer,
    getCustomerCreditHistory,
    recordCustomerPayment,
};
