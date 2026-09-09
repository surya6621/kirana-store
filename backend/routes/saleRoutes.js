const express = require("express");

const {
    createOfflineSale,
    getSales,
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

router.post(
    "/offline",
    authenticate,
    requireStaff,
    createOfflineSale
);

module.exports = router;