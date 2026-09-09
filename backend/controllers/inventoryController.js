const pool = require("../config/db");

// =========================================
// GET ALL INVENTORY
// =========================================

const getInventory = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                p.id AS product_id,
                p.name,
                p.unit,
                p.selling_price,
                p.purchase_price,
                p.minimum_stock,
                COALESCE(i.quantity, 0) AS current_stock,
                CASE
                    WHEN COALESCE(i.quantity, 0) <= p.minimum_stock
                    THEN true
                    ELSE false
                END AS low_stock,
                c.name AS category_name
            FROM products p
            JOIN categories c
                ON p.category_id = c.id
            LEFT JOIN inventory i
                ON p.id = i.product_id
            WHERE p.is_active = true
            ORDER BY p.name ASC
        `);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Get inventory error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get inventory",
        });
    }
};


// =========================================
// GET LOW STOCK PRODUCTS
// =========================================

const getLowStock = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                p.id AS product_id,
                p.name,
                p.unit,
                p.minimum_stock,
                COALESCE(i.quantity, 0) AS current_stock
            FROM products p
            LEFT JOIN inventory i
                ON p.id = i.product_id
            WHERE p.is_active = true
              AND COALESCE(i.quantity, 0) <= p.minimum_stock
            ORDER BY
                COALESCE(i.quantity, 0) ASC,
                p.name ASC
        `);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Get low stock error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get low stock products",
        });
    }
};


// =========================================
// UPDATE STOCK
// =========================================

const updateStock = async (req, res) => {
    const client = await pool.connect();

    try {
        const { productId } = req.params;
        const {
            quantity,
            transaction_type,
            reason,
        } = req.body;

        if (
            quantity === undefined ||
            !transaction_type
        ) {
            return res.status(400).json({
                success: false,
                message: "Quantity and transaction type are required",
            });
        }

        const change = Number(quantity);

        if (!Number.isFinite(change) || change === 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a valid non-zero number",
            });
        }

        const allowedTypes = [
            "PURCHASE",
            "SALE",
            "RETURN",
            "DAMAGE",
            "ADJUSTMENT",
        ];

        if (!allowedTypes.includes(transaction_type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid transaction type",
            });
        }

        // Start transaction
        await client.query("BEGIN");

        // Lock inventory row while updating
        const inventoryResult = await client.query(
            `SELECT quantity
             FROM inventory
             WHERE product_id = $1
             FOR UPDATE`,
            [productId]
        );

        if (inventoryResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Inventory record not found",
            });
        }

        const currentStock = Number(
            inventoryResult.rows[0].quantity
        );

        /*
         * Positive quantity:
         * PURCHASE / RETURN / positive ADJUSTMENT
         *
         * Negative quantity:
         * SALE / DAMAGE / negative ADJUSTMENT
         */

        const newStock = currentStock + change;

        if (newStock < 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Current stock: ${currentStock}`,
            });
        }

        // Update inventory
        const updatedInventory = await client.query(
            `UPDATE inventory
             SET quantity = $1,
                 updated_at = NOW()
             WHERE product_id = $2
             RETURNING *`,
            [newStock, productId]
        );

        // Record transaction
        await client.query(
            `INSERT INTO inventory_transactions (
                product_id,
                transaction_type,
                quantity_change,
                reason,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5)`,
            [
                productId,
                transaction_type,
                change,
                reason || null,
                req.user.userId,
            ]
        );

        await client.query("COMMIT");

        res.json({
            success: true,
            message: "Stock updated successfully",
            data: {
                product_id: productId,
                previous_stock: currentStock,
                quantity_change: change,
                current_stock: newStock,
            },
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Update stock error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update stock",
        });
    } finally {
        client.release();
    }
};


// =========================================
// GET STOCK HISTORY
// =========================================

const getStockHistory = async (req, res) => {
    try {
        const { productId } = req.params;

        const result = await pool.query(
            `SELECT
                it.id,
                it.transaction_type,
                it.quantity_change,
                it.reason,
                it.created_at,
                u.name AS created_by_name
             FROM inventory_transactions it
             LEFT JOIN users u
                ON it.created_by = u.id
             WHERE it.product_id = $1
             ORDER BY it.created_at DESC`,
            [productId]
        );

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Stock history error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get stock history",
        });
    }
};


module.exports = {
    getInventory,
    getLowStock,
    updateStock,
    getStockHistory,
};