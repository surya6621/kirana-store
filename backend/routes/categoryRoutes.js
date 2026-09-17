const express = require("express");

const {
    getCategories,
    createCategory,
    updateCategory,
    archiveCategory,
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

router.patch(
    "/:categoryId",
    authenticate,
    requireStaff,
    updateCategory
);

router.delete(
    "/:categoryId",
    authenticate,
    requireStaff,
    archiveCategory
);

module.exports = router;
