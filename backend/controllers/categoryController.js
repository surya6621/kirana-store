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


module.exports = {
    getCategories,
    createCategory,
};