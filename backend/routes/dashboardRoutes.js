const express = require("express");

const {
    getDashboard,
} = require("../controllers/dashboardController");

const {
    authenticate,
    requireStaff,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/",
    authenticate,
    requireStaff,
    getDashboard
);

module.exports = router;