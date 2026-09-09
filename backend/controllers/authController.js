const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =========================================
// OWNER LOGIN
// =========================================

const login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        // Check required fields
        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: "Phone and password are required",
            });
        }

        // Find user
        const result = await pool.query(
            `SELECT
                id,
                name,
                phone,
                password_hash,
                role
             FROM users
             WHERE phone = $1`,
            [phone]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid phone or password",
            });
        }

        const user = result.rows[0];

        // Only owner/staff can use owner application
        if (user.role !== "OWNER" && user.role !== "STAFF") {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to access this application",
            });
        }

        // Check password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid phone or password",
            });
        }

        // Create JWT
        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d",
            }
        );

        res.json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                },
            },
        });
    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed",
        });
    }
};


module.exports = {
    login,
};