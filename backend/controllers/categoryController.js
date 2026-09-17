const pool = require("../config/db");

// Get all categories
const getCategories = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM categories
             WHERE is_active = true
             ORDER BY name ASC`
        );

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Get categories error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get categories",
        });
    }
};


// Create category
const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Category name is required",
            });
        }

        const result = await pool.query(
            `INSERT INTO categories (name, description)
             VALUES ($1, $2)
             RETURNING *`,
            [name, description || null]
        );

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Create category error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Category already exists",
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to create category",
        });
    }
};

const updateCategory = async (req, res) => {
    const updates = {};

    try {
        if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
            const { name } = req.body;
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Category name is required",
                });
            }
            updates.name = name.trim().slice(0, 100);
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
            const { description } = req.body;
            updates.description =
                typeof description === "string" && description.trim()
                    ? description.trim()
                    : null;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No category changes were provided",
            });
        }

        const values = Object.values(updates);
        const setClause = Object.keys(updates)
            .map((column, index) => `${column} = $${index + 1}`)
            .join(", ");

        const result = await pool.query(
            `UPDATE categories
             SET ${setClause}
             WHERE id = $${values.length + 1}
               AND is_active = true
             RETURNING *`,
            [...values, req.params.categoryId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        res.json({
            success: true,
            message: "Category updated successfully",
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Update category error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Category already exists",
            });
        }

        res.status(500).json({
            success: false,
            message: "Unable to update category. Please try again.",
        });
    }
};

const archiveCategory = async (req, res) => {
    try {
        const usage = await pool.query(
            `SELECT COUNT(*)::int AS product_count
             FROM products
             WHERE category_id = $1
               AND is_active = true`,
            [req.params.categoryId]
        );
        const productCount = usage.rows[0]?.product_count || 0;

        if (productCount > 0) {
            return res.status(409).json({
                success: false,
                message: `This category is currently used by ${productCount} products. Assign those products to another category before removing it.`,
            });
        }

        const result = await pool.query(
            `UPDATE categories
             SET is_active = false
             WHERE id = $1
               AND is_active = true
             RETURNING *`,
            [req.params.categoryId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Active category not found",
            });
        }

        res.json({
            success: true,
            message: "Category removed successfully",
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Archive category error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to remove category. Please try again.",
        });
    }
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    archiveCategory,
};
