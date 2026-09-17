const pool = require("../config/db");
const { createPurchaseTransaction } = require("../services/purchaseService");

// =========================================
// GET ALL PRODUCTS
// =========================================

const getProducts = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                p.id,
                p.name,
                p.description,
                p.unit,
                p.selling_price,
                p.purchase_price,
                p.minimum_stock,
                p.image_url,
                p.is_active,
                c.id AS category_id,
                c.name AS category_name,
                COALESCE(i.quantity, 0) AS stock_quantity
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
        console.error("Get products error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get products",
        });
    }
};


// =========================================
// GET SINGLE PRODUCT
// =========================================

const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT
                p.id,
                p.name,
                p.description,
                p.unit,
                p.selling_price,
                p.purchase_price,
                p.minimum_stock,
                p.image_url,
                p.is_active,
                c.id AS category_id,
                c.name AS category_name,
                COALESCE(i.quantity, 0) AS stock_quantity
            FROM products p
            JOIN categories c
                ON p.category_id = c.id
            LEFT JOIN inventory i
                ON p.id = i.product_id
            WHERE p.id = $1
              AND p.is_active = true
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Get product error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get product",
        });
    }
};


// =========================================
// CREATE PRODUCT
// =========================================

const updateProduct = async (req, res) => {
    const allowedFields = {
        name: "name",
        category_id: "category_id",
        description: "description",
        unit: "unit",
        selling_price: "selling_price",
        purchase_price: "purchase_price",
        minimum_stock: "minimum_stock",
        image_url: "image_url",
    };
    const updates = {};

    try {
        for (const [field, column] of Object.entries(allowedFields)) {
            if (!Object.prototype.hasOwnProperty.call(req.body, field)) {
                continue;
            }

            const value = req.body[field];

            if (field === "name") {
                if (typeof value !== "string" || !value.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: "Product name is required",
                    });
                }
                updates.name = value.trim().slice(0, 150);
            } else if (field === "category_id") {
                const categoryId = Number(value);
                if (
                    !Number.isSafeInteger(categoryId) ||
                    categoryId <= 0 ||
                    String(value).trim() === ""
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Choose a valid category",
                    });
                }
                updates.category_id = categoryId;
            } else if (field === "unit") {
                if (typeof value !== "string" || !value.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: "Unit is required",
                    });
                }
                updates.unit = value.trim().slice(0, 30);
            } else if (field === "selling_price") {
                const sellingPrice = Number(value);
                if (
                    value === "" ||
                    !Number.isFinite(sellingPrice) ||
                    sellingPrice <= 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Selling price must be greater than 0",
                    });
                }
                updates.selling_price = sellingPrice;
            } else if (field === "purchase_price") {
                if (value === "" || value === null || value === undefined) {
                    updates.purchase_price = null;
                } else {
                    const purchasePrice = Number(value);
                    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
                        return res.status(400).json({
                            success: false,
                            message: "Purchase price cannot be negative",
                        });
                    }
                    updates.purchase_price = purchasePrice;
                }
            } else if (field === "minimum_stock") {
                const minimumStock = Number(value);
                if (
                    value === "" ||
                    !Number.isFinite(minimumStock) ||
                    minimumStock < 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Minimum stock must be 0 or greater",
                    });
                }
                updates.minimum_stock = minimumStock;
            } else if (field === "description") {
                updates.description =
                    typeof value === "string" && value.trim()
                        ? value.trim()
                        : null;
            } else if (field === "image_url") {
                updates.image_url =
                    typeof value === "string" && value.trim()
                        ? value.trim().slice(0, 2000)
                        : null;
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No product changes were provided",
            });
        }

        if (updates.category_id) {
            const categoryResult = await pool.query(
                `SELECT id
                 FROM categories
                 WHERE id = $1 AND is_active = true`,
                [updates.category_id]
            );

            if (categoryResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Category not found",
                });
            }
        }

        const values = Object.values(updates);
        const setClause = Object.keys(updates)
            .map(
                (column, index) =>
                    `${column} = $${index + 1}`
            )
            .join(", ");
        const result = await pool.query(
            `UPDATE products
             SET ${setClause}, updated_at = NOW()
             WHERE id = $${values.length + 1}
             RETURNING id`,
            [...values, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        const productResult = await pool.query(
            `SELECT
                 p.id,
                 p.name,
                 p.description,
                 p.unit,
                 p.selling_price,
                 p.purchase_price,
                 p.minimum_stock,
                 p.image_url,
                 p.is_active,
                 c.id AS category_id,
                 c.name AS category_name,
                 COALESCE(i.quantity, 0) AS stock_quantity
             FROM products p
             JOIN categories c
                 ON p.category_id = c.id
             LEFT JOIN inventory i
                 ON p.id = i.product_id
             WHERE p.id = $1`,
            [req.params.id]
        );

        res.json({
            success: true,
            message: "Product updated successfully",
            data: productResult.rows[0],
        });
    } catch (error) {
        console.error("Update product error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update product. Please try again.",
        });
    }
};


// =========================================
// CREATE PRODUCT
// =========================================

const createProduct = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            name,
            category_id,
            description,
            unit,
            selling_price,
            purchase_price,
            minimum_stock,
            image_url,
            opening_stock,
        } = req.body;

        // Required fields
        if (
            !name ||
            !category_id ||
            !unit ||
            selling_price === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, category, unit and selling price are required",
            });
        }

        // Start transaction
        await client.query("BEGIN");

        // Check category exists
        const categoryResult = await client.query(
            `SELECT id FROM categories
             WHERE id = $1 AND is_active = true`,
            [category_id]
        );

        if (categoryResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Category not found",
            });
        }

        // Create product
        const productResult = await client.query(
            `INSERT INTO products (
                name,
                category_id,
                description,
                unit,
                selling_price,
                purchase_price,
                minimum_stock,
                image_url
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *`,
            [
                name,
                category_id,
                description || null,
                unit,
                selling_price,
                purchase_price ?? null,
                minimum_stock ?? 0,
                image_url || null,
            ]
        );

        const product = productResult.rows[0];

        // Create inventory record
        const inventoryResult = await client.query(
            `INSERT INTO inventory (
                product_id,
                quantity
            )
            VALUES ($1, $2)
            RETURNING *`,
            [product.id, 0]
        );

        let openingPurchase = null;
        if (opening_stock?.enabled) {
            const quantity = Number(opening_stock.quantity);
            const openingPrice = Number(opening_stock.purchase_price);
            if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(openingPrice) || openingPrice < 0) {
                await client.query("ROLLBACK");
                return res.status(400).json({ success: false, message: "Opening quantity and purchase price must be valid" });
            }
            openingPurchase = await createPurchaseTransaction(client, {
                supplierId: opening_stock.supplier_id,
                amountPaid: opening_stock.amount_paid,
                paymentStatus: opening_stock.payment_status,
                paymentMethod: "CASH",
                items: [{ product_id: product.id, quantity, purchase_price: openingPrice }],
                userId: req.user.userId,
            });
        }

        // Finish transaction
        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: openingPurchase
                ? "Product and opening purchase created successfully."
                : "Product created successfully.",
            data: {
                ...product,
                stock_quantity: openingPurchase
                    ? opening_stock.quantity
                    : inventoryResult.rows[0].quantity,
                opening_purchase: openingPurchase,
            },
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Create product error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: "Failed to create product",
        });
    } finally {
        client.release();
    }
};


const setProductActive = async (req, res) => {
    try {
        const { id } = req.params;
        const isActive = req.path.endsWith("/restore");
        const result = await pool.query(
            `UPDATE products
             SET is_active = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, name, is_active, updated_at`,
            [isActive, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.json({
            success: true,
            message: isActive ? "Product restored successfully" : "Product archived successfully",
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Update product lifecycle error:", error);
        res.status(500).json({ success: false, message: "Failed to update product" });
    }
};

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    setProductActive,
};