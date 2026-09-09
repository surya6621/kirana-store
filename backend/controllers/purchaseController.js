const pool = require("../config/db");

// =========================================
// CREATE PURCHASE
// =========================================

const createPurchase = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            supplier_id,
            payment_status,
            amount_paid,
            items,
        } = req.body;

        // -----------------------------
        // Basic validation
        // -----------------------------

        if (!supplier_id || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Supplier and purchase items are required",
            });
        }

        const paidAmount = Number(amount_paid || 0);

        if (!Number.isFinite(paidAmount) || paidAmount < 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount paid",
            });
        }

        // -----------------------------
        // Start transaction
        // -----------------------------

        await client.query("BEGIN");

        // -----------------------------
        // Check supplier
        // -----------------------------

        const supplierResult = await client.query(
            `SELECT id
             FROM suppliers
             WHERE id = $1`,
            [supplier_id]
        );

        if (supplierResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
        }

        // -----------------------------
        // Get products from database
        // -----------------------------

        const productIds = items.map(item => item.product_id);

        const productResult = await client.query(
            `SELECT id, purchase_price
             FROM products
             WHERE id = ANY($1::bigint[])
               AND is_active = true`,
            [productIds]
        );

        if (productResult.rows.length !== productIds.length) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "One or more products were not found",
            });
        }

        const productMap = new Map();

        productResult.rows.forEach(product => {
            productMap.set(String(product.id), product);
        });

        // -----------------------------
        // Calculate total
        // -----------------------------

        let totalAmount = 0;
        const purchaseItems = [];

        for (const item of items) {
            const product = productMap.get(String(item.product_id));

            const quantity = Number(item.quantity);
            const purchasePrice = Number(
                item.purchase_price ?? product.purchase_price
            );

            if (!Number.isFinite(quantity) || quantity <= 0) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    success: false,
                    message: "Invalid product quantity",
                });
            }

            if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    success: false,
                    message: "Invalid purchase price",
                });
            }

            const itemTotal = quantity * purchasePrice;

            totalAmount += itemTotal;

            purchaseItems.push({
                product_id: product.id,
                quantity,
                purchase_price: purchasePrice,
            });
        }

        // Round to 2 decimal places
        totalAmount = Number(totalAmount.toFixed(2));

        // -----------------------------
        // Validate payment
        // -----------------------------

        if (paidAmount > totalAmount) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Amount paid cannot be greater than purchase total",
            });
        }

        const dueAmount = Number(
            (totalAmount - paidAmount).toFixed(2)
        );

        let finalPaymentStatus;

        if (dueAmount === 0) {
            finalPaymentStatus = "PAID";
        } else if (paidAmount > 0) {
            finalPaymentStatus = "PARTIAL";
        } else {
            finalPaymentStatus = "PENDING";
        }

        // -----------------------------
        // Create purchase
        // -----------------------------

        const purchaseResult = await client.query(
            `INSERT INTO purchases (
                supplier_id,
                total_amount,
                amount_paid,
                payment_status,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
                supplier_id,
                totalAmount,
                paidAmount,
                finalPaymentStatus,
                req.user.userId,
            ]
        );

        const purchase = purchaseResult.rows[0];

        // -----------------------------
        // Insert purchase items
        // -----------------------------

        for (const item of purchaseItems) {
            await client.query(
                `INSERT INTO purchase_items (
                    purchase_id,
                    product_id,
                    quantity,
                    purchase_price
                )
                VALUES ($1, $2, $3, $4)`,
                [
                    purchase.id,
                    item.product_id,
                    item.quantity,
                    item.purchase_price,
                ]
            );

            // -------------------------
            // Lock inventory row
            // -------------------------

            const inventoryResult = await client.query(
                `SELECT quantity
                 FROM inventory
                 WHERE product_id = $1
                 FOR UPDATE`,
                [item.product_id]
            );

            if (inventoryResult.rows.length === 0) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    success: false,
                    message: `Inventory not found for product ${item.product_id}`,
                });
            }

            const currentStock = Number(
                inventoryResult.rows[0].quantity
            );

            const newStock = currentStock + item.quantity;

            // -------------------------
            // Update inventory
            // -------------------------

            await client.query(
                `UPDATE inventory
                 SET quantity = $1,
                     updated_at = NOW()
                 WHERE product_id = $2`,
                [
                    newStock,
                    item.product_id,
                ]
            );

            // -------------------------
            // Record inventory movement
            // -------------------------

            await client.query(
                `INSERT INTO inventory_transactions (
                    product_id,
                    transaction_type,
                    quantity_change,
                    reason,
                    reference_id,
                    created_by
                )
                VALUES ($1, 'PURCHASE', $2, $3, $4, $5)`,
                [
                    item.product_id,
                    item.quantity,
                    `Purchase #${purchase.id}`,
                    purchase.id,
                    req.user.userId,
                ]
            );
        }

        // -----------------------------
        // Supplier credit
        // -----------------------------

        if (dueAmount > 0) {
            await client.query(
                `INSERT INTO supplier_credit_transactions (
                    supplier_id,
                    purchase_id,
                    transaction_type,
                    amount,
                    description,
                    created_by
                )
                VALUES ($1, $2, 'CREDIT', $3, $4, $5)`,
                [
                    supplier_id,
                    purchase.id,
                    dueAmount,
                    `Amount due from Purchase #${purchase.id}`,
                    req.user.userId,
                ]
            );
        }

        // -----------------------------
        // Commit
        // -----------------------------

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: "Purchase created successfully",
            data: {
                purchase_id: purchase.id,
                total_amount: totalAmount,
                amount_paid: paidAmount,
                due_amount: dueAmount,
                payment_status: finalPaymentStatus,
                items: purchaseItems,
            },
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Create purchase error:", error);

        res.status(500).json({
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


module.exports = {
    createPurchase,
    getPurchases,
};