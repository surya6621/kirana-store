const pool = require("../config/db");
const { createPurchaseTransaction } = require("../services/purchaseService");

// =========================================
// CREATE PURCHASE
// =========================================

const createPurchase = async (req, res) => {
    const client = await pool.connect();

    try {
        const { supplier_id, payment_status, amount_paid, payment_method, items } = req.body;

        await client.query("BEGIN");
        const purchase = await createPurchaseTransaction(client, {
            supplierId: supplier_id,
            amountPaid: amount_paid === undefined ? 0 : amount_paid,
            paymentStatus: payment_status,
            paymentMethod: payment_method || "CASH",
            items,
            userId: req.user.userId,
        });

        // -----------------------------
        // Commit
        // -----------------------------

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: "Purchase created successfully",
            data: {
                ...purchase,
            },
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Create purchase error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: "Failed to create purchase",
        });
    } finally {
        client.release();
    }
};


// =========================================
// GET ALL PURCHASES
// =========================================

const getPurchases = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                p.id,
                p.total_amount,
                p.amount_paid,
                p.payment_status,
                p.created_at,
                s.name AS supplier_name
            FROM purchases p
            LEFT JOIN suppliers s
                ON p.supplier_id = s.id
            ORDER BY p.created_at DESC
        `);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Get purchases error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get purchases",
        });
    }
};

// =========================================
// GET PURCHASE DETAILS
// =========================================

const getPurchaseById = async (req, res) => {
    try {
        const { purchaseId } = req.params;

        const purchaseResult = await pool.query(
            `SELECT
                p.id,
                p.supplier_id,
                p.total_amount,
                p.amount_paid,
                GREATEST(p.total_amount - p.amount_paid, 0) AS due_amount,
                p.payment_status,
                p.created_at,
                s.name AS supplier_name,
                s.phone AS supplier_phone
             FROM purchases p
             LEFT JOIN suppliers s
                ON p.supplier_id = s.id
             WHERE p.id = $1`,
            [purchaseId]
        );

        if (purchaseResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Purchase not found",
            });
        }

        const itemsResult = await pool.query(
            `SELECT
                pi.id,
                pi.product_id,
                pr.name AS product_name,
                pr.unit,
                pi.quantity,
                pi.purchase_price,
                (pi.quantity * pi.purchase_price) AS line_total
             FROM purchase_items pi
             LEFT JOIN products pr
                ON pi.product_id = pr.id
             WHERE pi.purchase_id = $1
             ORDER BY pi.id ASC`,
            [purchaseId]
        );

        const paymentsResult = await pool.query(
            `SELECT
                sct.id,
                sct.amount,
                sct.description,
                sct.created_at,
                CASE
                    WHEN sct.description ILIKE '%UPI%' THEN 'UPI'
                    WHEN sct.description ILIKE '%CASH%' THEN 'Cash'
                    ELSE NULL
                END AS payment_method
             FROM supplier_credit_transactions sct
             WHERE sct.purchase_id = $1
               AND sct.transaction_type = 'PAYMENT'
             ORDER BY sct.created_at DESC, sct.id DESC`,
            [purchaseId]
        );

        res.json({
            success: true,
            data: {
                ...purchaseResult.rows[0],
                items: itemsResult.rows,
                payments: paymentsResult.rows,
            },
        });
    } catch (error) {
        console.error("Get purchase details error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load purchase details.",
        });
    }
};


module.exports = {
    createPurchase,
    getPurchases,
    getPurchaseById,
};
