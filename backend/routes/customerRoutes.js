const express = require("express");

const {
    getCustomers,
    createCustomer,
    getCustomerCreditHistory,
    recordCustomerPayment,
} = require("../controllers/customerController");

const {
    authenticate,
    requireStaff,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/",
    authenticate,
    requireStaff,
    getCustomers
);

router.post(
    "/",
    authenticate,
    requireStaff,
    createCustomer
);

router.post(
    "/:customerId/payments",
    authenticate,
    requireStaff,
    recordCustomerPayment
);

router.get(
    "/:customerId/credit-history",
    authenticate,
    requireStaff,
    getCustomerCreditHistory
);


module.exports = router;