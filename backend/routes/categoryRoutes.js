const express = require("express");

const {
    getCategories,
    createCategory,
} = require("../controllers/categoryController");

const {
    authenticate,
    requireStaff,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Public
router.get("/", getCategories);

// Owner / Staff only
router.post(
    "/",
    authenticate,
    requireStaff,
    createCategory
);

module.exports = router;