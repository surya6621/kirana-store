const pool = require("../config/db");

// =========================================
// GET ALL SUPPLIERS
// =========================================

const getSuppliers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                name,
                phone,
                address,
                created_at
            FROM suppliers
            ORDER BY name ASC
        `);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Get suppliers error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get suppliers",
        });
    }
};


// =========================================
// CREATE SUPPLIER
// =========================================

const createSupplier = async (req, res) => {
    try {
        const {
            name,
            phone,
            address,
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Supplier name is required",
            });
        }

        const result = await pool.query(
            `INSERT INTO suppliers (
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
            message: "Supplier created successfully",
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Create supplier error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create supplier",
        });
    }
};

// =========================================
// GET SUPPLIER DUES
// =========================================

const getSupplierDues = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                s.id,
                s.name,
                s.phone,
                COALESCE(
                    SUM(
                        CASE
                            WHEN sct.transaction_type = 'CREDIT'
                            THEN sct.amount
                            WHEN sct.transaction_type = 'PAYMENT'
                            THEN -sct.amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_due
            FROM suppliers s
            LEFT JOIN supplier_credit_transactions sct
                ON s.id = sct.supplier_id
            GROUP BY
                s.id,
                s.name,
                s.phone
            ORDER BY
                total_due DESC,
                s.name ASC
        `);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Get supplier dues error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get supplier dues",
        });
    }
};


// =========================================
// GET SUPPLIER CREDIT HISTORY
// =========================================

const getSupplierCreditHistory = async (req, res) => {
    try {
        const { supplierId } = req.params;

        const supplierResult = await pool.query(
            `SELECT id, name, phone
             FROM suppliers
             WHERE id = $1`,
            [supplierId]
        );

        if (supplierResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
        }

        const historyResult = await pool.query(
            `SELECT
                sct.id,
                sct.transaction_type,
                sct.amount,
                sct.description,
                sct.purchase_id,
                sct.created_at,
                u.name AS created_by_name
             FROM supplier_credit_transactions sct
             LEFT JOIN users u
                ON sct.created_by = u.id
             WHERE sct.supplier_id = $1
             ORDER BY sct.created_at DESC`,
            [supplierId]
        );

        res.json({
            success: true,
            data: {
                supplier: supplierResult.rows[0],
                history: historyResult.rows,
            },
        });
    } catch (error) {
        console.error("Supplier credit history error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get supplier credit history",
        });
    }
};

// =========================================
// RECORD SUPPLIER PAYMENT
// =========================================

const recordSupplierPayment = async (req, res) => {
    const client = await pool.connect();

    try {
        const { supplierId } = req.params;
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

        // Check supplier
        const supplierResult = await client.query(
            `SELECT id, name
             FROM suppliers
             WHERE id = $1`,
            [supplierId]
        );

        if (supplierResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
        }

        // Calculate current supplier due
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
             FROM supplier_credit_transactions
             WHERE supplier_id = $1`,
            [supplierId]
        );

        const currentDue = Number(
            dueResult.rows[0].total_due
        );

        if (currentDue <= 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Supplier has no outstanding due",
            });
        }

        // Cannot pay more than supplier due
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

        // Record supplier payment
        await client.query(
            `INSERT INTO supplier_credit_transactions (
                supplier_id,
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
                supplierId,
                paymentAmount,
                description ||
                    `Supplier payment via ${payment_method}`,
                req.user.userId,
            ]
        );

        await client.query("COMMIT");

        res.json({
            success: true,
            message: "Supplier payment recorded successfully",
            data: {
                supplier_id: supplierId,
                supplier_name:
                    supplierResult.rows[0].name,
                payment_method,
                amount_paid: paymentAmount,
                previous_due: currentDue,
                remaining_due: remainingDue,
            },
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Record supplier payment error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to record supplier payment",
        });
    } finally {
        client.release();
    }
};

module.exports = {
    getSuppliers,
    createSupplier,
    getSupplierDues,
    getSupplierCreditHistory,
    recordSupplierPayment,
};