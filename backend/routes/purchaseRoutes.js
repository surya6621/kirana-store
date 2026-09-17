const express = require("express");

const {
    createPurchase,
    getPurchases,
    getPurchaseById,
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

router.get(
    "/:purchaseId",
    authenticate,
    requireStaff,
    getPurchaseById
);

router.post(
    "/",
    authenticate,
    requireStaff,
    createPurchase
);

module.exports = router;
