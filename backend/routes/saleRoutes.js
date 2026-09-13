const express = require("express");

const {
    createOfflineSale,
    getSales,
    getSaleById,
} = require("../controllers/saleController");

const {
    authenticate,
    requireStaff,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/",
    authenticate,
    requireStaff,
    getSales
);

router.get(
    "/:id",
    authenticate,
    requireStaff,
    getSaleById
);

router.post(
    "/offline",
    authenticate,
    requireStaff,
    createOfflineSale
);

module.exports = router;