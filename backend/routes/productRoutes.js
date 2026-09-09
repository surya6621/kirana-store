const express = require("express");

const {
    getProducts,
    getProductById,
    createProduct,
} = require("../controllers/productController");

const {
    authenticate,
    requireStaff,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Public
router.get("/", getProducts);
router.get("/:id", getProductById);

// Owner / Staff only
router.post(
    "/",
    authenticate,
    requireStaff,
    createProduct
);

module.exports = router;