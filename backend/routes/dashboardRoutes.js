const express = require("express");

const {
    getDashboard,
    getPaymentHistory,
} = require("../controllers/dashboardController");

const {
    authenticate,
    requireStaff,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/payment-history",
    authenticate,
    requireStaff,
    getPaymentHistory
);

router.get(
    "/",
    authenticate,
    requireStaff,
    getDashboard
);

module.exports = router;