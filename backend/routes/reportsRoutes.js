const express = require("express");
const { getReports } = require("../controllers/reportsController");
const { authenticate, requireStaff } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, requireStaff, getReports);

module.exports = router;
