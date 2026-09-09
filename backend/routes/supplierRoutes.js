const express = require("express");

const {
    getSuppliers,
    createSupplier,
    getSupplierDues,
    getSupplierCreditHistory,
    recordSupplierPayment,
} = require("../controllers/supplierController");

const {
    authenticate,
    requireStaff,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/",
    authenticate,
    requireStaff,
    getSuppliers
);

router.post(
    "/",
    authenticate,
    requireStaff,
    createSupplier
);

router.get(
    "/dues",
    authenticate,
    requireStaff,
    getSupplierDues
);

router.post(
    "/:supplierId/payments",
    authenticate,
    requireStaff,
    recordSupplierPayment
);

router.get(
    "/:supplierId/credit-history",
    authenticate,
    requireStaff,
    getSupplierCreditHistory
);

module.exports = router;