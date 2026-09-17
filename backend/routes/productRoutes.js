const express = require("express");

const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    setProductActive,
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

router.patch("/:id/archive", authenticate, requireStaff, setProductActive);
router.patch("/:id/restore", authenticate, requireStaff, setProductActive);
router.patch("/:id", authenticate, requireStaff, updateProduct);

module.exports = router;