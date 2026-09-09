const express = require("express");

const {
    createPurchase,
    getPurchases,
} = require("../controllers/purchaseController");

const {
    authenticate,
    requireStaff,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/",
    authenticate,
    requireStaff,
    getPurchases
);

router.post(
    "/",
    authenticate,
    requireStaff,
    createPurchase
);

module.exports = router;