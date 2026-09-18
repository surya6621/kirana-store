const express = require("express");

const {
    getCustomers,
    createCustomer,
    getCustomerCreditHistory,
    recordCustomerPayment,
    getAllCustomerPayments,
    updateCustomer,
    archiveCustomer,
    getDeletedCustomers,
    restoreCustomer,
    permanentlyDeleteCustomer,
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

router.patch(
    "/:customerId/archive",
    authenticate,
    requireStaff,
    archiveCustomer
);

router.get(
    "/trash",
    authenticate,
    requireStaff,
    getDeletedCustomers
);

router.patch(
    "/:customerId/restore",
    authenticate,
    requireStaff,
    restoreCustomer
);

router.delete(
    "/:customerId/permanent",
    authenticate,
    requireStaff,
    permanentlyDeleteCustomer
);

router.patch(
    "/:customerId",
    authenticate,
    requireStaff,
    updateCustomer
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

router.get(
    "/credit-history",
    authenticate,
    requireStaff,
    getAllCustomerPayments
);


module.exports = router;