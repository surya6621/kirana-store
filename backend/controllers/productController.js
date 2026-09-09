const pool = require("../config/db");

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
            initial_stock,
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
        const stock = initial_stock ?? 0;

        const inventoryResult = await client.query(
            `INSERT INTO inventory (
                product_id,
                quantity
            )
            VALUES ($1, $2)
            RETURNING *`,
            [product.id, stock]
        );

        // If initial stock exists, record the transaction
        if (Number(stock) > 0) {
            await client.query(
                `INSERT INTO inventory_transactions (
                    product_id,
                    transaction_type,
                    quantity_change,
                    reason
                )
                VALUES ($1, 'ADJUSTMENT', $2, $3)`,
                [
                    product.id,
                    stock,
                    "Initial stock",
                ]
            );
        }

        // Finish transaction
        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: {
                ...product,
                stock_quantity: inventoryResult.rows[0].quantity,
            },
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Create product error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create product",
        });
    } finally {
        client.release();
    }
};


module.exports = {
    getProducts,
    getProductById,
    createProduct,
};