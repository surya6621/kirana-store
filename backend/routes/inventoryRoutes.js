const express = require("express");

const {
    getInventory,
    getLowStock,
    updateStock,
    getStockHistory,
    updateMinimumStock,
} = require("../controllers/inventoryController");

const {
    authenticate,
    requireStaff,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All inventory operations require login
router.get(
    "/",
    authenticate,
    requireStaff,
    getInventory
);

router.get(
    "/low-stock",
    authenticate,
    requireStaff,
    getLowStock
);

router.patch(
    "/:productId",
    authenticate,
    requireStaff,
    updateStock
);

router.put(
    "/:productId/minimum-stock",
    authenticate,
    requireStaff,
    updateMinimumStock
);

router.get(
    "/:productId/history",
    authenticate,
    requireStaff,
    getStockHistory
);

module.exports = router;