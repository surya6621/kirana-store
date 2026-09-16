const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { Pool } = require("pg");

const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const customerRoutes = require("./routes/customerRoutes");
const saleRoutes = require("./routes/saleRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportsRoutes = require("./routes/reportsRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded product images statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

// Health check
app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            success: true,
            message: "Kirana Store backend is working",
            database: "Connected",
            time: result.rows[0].now,
        });
    } catch (error) {
        console.error("Database error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed",
        });
    }
});

// Category routes
app.use("/api/categories", categoryRoutes);

// Product routes
app.use("/api/products", productRoutes);

// Authentication routes
app.use("/api/auth", authRoutes);

// Supplier routes
app.use("/api/suppliers", supplierRoutes);

// Inventory routes
app.use("/api/inventory", inventoryRoutes);

// Purchase routes
app.use("/api/purchases", purchaseRoutes);

// Customer routes
app.use("/api/customers", customerRoutes);

// Sale routes
app.use("/api/sales", saleRoutes);

// Dashboard routes
app.use("/api/dashboard", dashboardRoutes);

// Reports routes
app.use("/api/reports", reportsRoutes);

// Upload routes
app.use("/api/upload", uploadRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`Kirana Store backend running on port ${PORT}`);
});