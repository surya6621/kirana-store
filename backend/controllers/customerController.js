const pool = require("../config/db");

// =========================================
// GET ALL CUSTOMERS
// =========================================

const getCustomers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                c.id,
                c.customer_code,
                c.name,
                c.phone,
                c.address,
                c.created_at,
                COALESCE(
                    SUM(
                        CASE
                            WHEN ct.transaction_type = 'CREDIT'
                            THEN ct.amount
                            WHEN ct.transaction_type = 'PAYMENT'
                            THEN -ct.amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_due
            FROM customers c
            LEFT JOIN customer_credit_transactions ct
                ON c.id = ct.customer_id
            WHERE c.is_active = true
            GROUP BY
                c.id,
                c.name,
                c.phone,
                c.address,
                c.created_at,
                c.customer_code
            ORDER BY c.name ASC
        `);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Get customers error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get customers",
        });
    }
};

const updateCustomer = async (req, res) => {
    const allowedFields = {
        name: "name",
        phone: "phone",
        address: "address",
    };
    const updates = {};

    try {
        for (const [field, column] of Object.entries(allowedFields)) {
            if (!Object.prototype.hasOwnProperty.call(req.body, field)) {
                continue;
            }

            const value = req.body[field];

            if (field === "name") {
                if (typeof value !== "string" || !value.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: "Customer name is required",
                    });
                }
                updates.name = value.trim().slice(0, 100);
            } else if (field === "phone") {
                if (value === "" || value === null || value === undefined) {
                    updates.phone = null;
                } else if (typeof value !== "string" || !value.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: "Phone number is required",
                    });
                } else {
                    updates.phone = value.trim().slice(0, 20);
                }
            } else if (field === "address") {
                updates.address =
                    typeof value === "string" && value.trim()
                        ? value.trim()
                        : null;
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No customer changes were provided",
            });
        }

        if (updates.phone) {
            const phoneCheck = await pool.query(
                `SELECT id FROM customers WHERE phone = $1 AND id != $2`,
                [updates.phone, req.params.customerId]
            );
            if (phoneCheck.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Phone number already exists for another customer",
                });
            }
        }

        const values = Object.values(updates);
        const setClause = Object.keys(updates)
            .map(
                (column, index) =>
                    `${column} = $${index + 1}`
            )
            .join(", ");
        const result = await pool.query(
            `UPDATE customers
             SET ${setClause}
             WHERE id = $${values.length + 1}
             RETURNING id, customer_code, name, phone, address, is_active, created_at`,
            [...values, req.params.customerId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        res.json({
            success: true,
            message: "Customer updated successfully",
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Update customer error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Phone number already exists",
            });
        }

        res.status(500).json({
            success: false,
            message: "Unable to update customer. Please try again.",
        });
    }
};


const archiveCustomer = async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE customers
             SET is_active = false
             WHERE id = $1 AND is_active = true
            RETURNING id, customer_code, name, is_active`,
            [req.params.customerId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Active customer not found" });
        }

        res.json({ success: true, message: "Customer removed from active customers", data: result.rows[0] });
    } catch (error) {
        console.error("Archive customer error:", error);
        res.status(500).json({ success: false, message: "Unable to remove customer" });
    }
};

const getDeletedCustomers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, customer_code, name, phone, address, created_at
            FROM customers
            WHERE is_active = false
            ORDER BY name ASC
        `);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Get deleted customers error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get deleted customers",
        });
    }
};

const restoreCustomer = async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE customers
             SET is_active = true
             WHERE id = $1 AND is_active = false
             RETURNING id, customer_code, name, phone, address, is_active, created_at`,
            [req.params.customerId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Deleted customer not found" });
        }

        res.json({
            success: true,
            message: "Customer restored successfully",
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Restore customer error:", error);
        res.status(500).json({ success: false, message: "Unable to restore customer" });
    }
};

const permanentlyDeleteCustomer = async (req, res) => {
    try {
        const customerResult = await pool.query(
            `SELECT id FROM customers WHERE id = $1 AND is_active = false`,
            [req.params.customerId]
        );

        if (customerResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Deleted customer not found" });
        }

        const dependencyResult = await pool.query(
            `SELECT
                EXISTS (SELECT 1 FROM sales WHERE customer_id = $1) AS has_sales,
                EXISTS (SELECT 1 FROM customer_credit_transactions WHERE customer_id = $1) AS has_credit_transactions`,
            [req.params.customerId]
        );
        const dependencies = dependencyResult.rows[0];

        if (dependencies.has_sales || dependencies.has_credit_transactions) {
            return res.status(409).json({
                success: false,
                message: "Customer cannot be permanently deleted because financial history exists. Restore or keep the customer archived instead.",
            });
        }

        const result = await pool.query(
            `DELETE FROM customers
             WHERE id = $1 AND is_active = false
             RETURNING id, customer_code`,
            [req.params.customerId]
        );

        res.json({
            success: true,
            message: "Customer permanently deleted",
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Permanently delete customer error:", error);

        if (error.code === "23503") {
            return res.status(409).json({
                success: false,
                message: "Customer cannot be permanently deleted because related records exist.",
            });
        }

        res.status(500).json({ success: false, message: "Unable to permanently delete customer" });
    }
};


// =========================================
// CREATE CUSTOMER
// =========================================

const createCustomer = async (req, res) => {
    try {
        const {
            name,
            phone,
            address,
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Customer name is required",
            });
        }

        const result = await pool.query(
            `INSERT INTO customers (
                name,
                phone,
                address
            )
            VALUES ($1, $2, $3)
            RETURNING *`,
            [
                name,
                phone || null,
                address || null,
            ]
        );

        res.status(201).json({
            success: true,
            message: "Customer created successfully",
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Create customer error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Customer phone number already exists",
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to create customer",
        });
    }
};


// =========================================
// GET CUSTOMER CREDIT HISTORY
// =========================================

const getCustomerCreditHistory = async (req, res) => {
    try {
        const { customerId } = req.params;

        const customerResult = await pool.query(
            `SELECT id, customer_code, name, phone, address
             FROM customers
             WHERE id = $1`,
            [customerId]
        );

        if (customerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        const historyResult = await pool.query(
            `SELECT
                ct.id,
                ct.transaction_type,
                ct.amount,
                ct.description,
                ct.sale_id,
                ct.created_at,
                u.name AS created_by_name
             FROM customer_credit_transactions ct
             LEFT JOIN users u
                ON ct.created_by = u.id
             WHERE ct.customer_id = $1
             ORDER BY ct.created_at DESC`,
            [customerId]
        );

        res.json({
            success: true,
            data: {
                customer: customerResult.rows[0],
                history: historyResult.rows,
            },
        });
    } catch (error) {
        console.error("Customer credit history error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get customer credit history",
        });
    }
};

// =========================================
// RECORD CUSTOMER PAYMENT
// =========================================

const recordCustomerPayment = async (req, res) => {
    const client = await pool.connect();

    try {
        const { customerId } = req.params;
        const {
            amount,
            payment_method,
            description,
            sale_id,
        } = req.body;

        const paymentAmount = Number(amount);

        // Validate amount
        if (
            !Number.isFinite(paymentAmount) ||
            paymentAmount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment amount must be greater than 0",
            });
        }

        // Validate payment method
        if (!["CASH", "UPI"].includes(payment_method)) {
            return res.status(400).json({
                success: false,
                message: "Payment method must be CASH or UPI",
            });
        }

        await client.query("BEGIN");

        // Check customer
        const customerResult = await client.query(
            `SELECT id, name
             FROM customers
             WHERE id = $1`,
            [customerId]
        );

        if (customerResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        let targetSaleId = null;

        if (sale_id !== undefined && sale_id !== null && sale_id !== "") {
            targetSaleId = Number(sale_id);
            if (!Number.isFinite(targetSaleId)) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    success: false,
                    message: "Invalid sale ID",
                });
            }

            // Verify sale exists and belongs to this customer
            const saleCheck = await client.query(
                `SELECT id, customer_id, total_amount FROM sales WHERE id = $1`,
                [targetSaleId]
            );

            if (saleCheck.rows.length === 0) {
                await client.query("ROLLBACK");
                return res.status(404).json({
                    success: false,
                    message: "Sale not found",
                });
            }

            const sale = saleCheck.rows[0];
            if (String(sale.customer_id) !== String(customerId)) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    success: false,
                    message: "Sale does not belong to this customer",
                });
            }

            // Calculate current due for this specific bill using existing credit/payment history
            const billHistoryCheck = await client.query(
                `SELECT transaction_type, amount FROM customer_credit_transactions WHERE customer_id = $1 AND sale_id = $2`,
                [customerId, targetSaleId]
            );

            const billCredits = billHistoryCheck.rows
                .filter(t => t.transaction_type === 'CREDIT')
                .reduce((acc, t) => acc + Number(t.amount), 0);

            // Payments applied to this sale (general payments or direct payments)
            // To be precise, let's fetch all customer credit transactions to compute FIFO or direct bill dues.
            // Alternatively, query payments table for this sale:
            const billPaymentsCheck = await client.query(
                `SELECT SUM(amount) AS total_paid FROM payments WHERE sale_id = $1`,
                [targetSaleId]
            );
            const billPaid = Number(billPaymentsCheck.rows[0]?.total_paid || 0);
            const billDue = Number((billCredits - billPaid).toFixed(2));

            if (billDue <= 0) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    success: false,
                    message: "Selected bill is already fully paid",
                });
            }

            if (paymentAmount > billDue) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    success: false,
                    message: `Payment cannot be greater than bill due of ₹${billDue}`,
                });
            }
        }

        // Calculate current due
        const dueResult = await client.query(
            `SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN transaction_type = 'CREDIT'
                            THEN amount
                            WHEN transaction_type = 'PAYMENT'
                            THEN -amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_due
             FROM customer_credit_transactions
             WHERE customer_id = $1`,
            [customerId]
        );

        const currentDue = Number(
            dueResult.rows[0].total_due
        );

        if (currentDue <= 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Customer has no outstanding due",
            });
        }

        // Cannot pay more than due
        if (paymentAmount > currentDue) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    `Payment cannot be greater than current due of ₹${currentDue}`,
            });
        }

        const remainingDue = Number(
            (currentDue - paymentAmount).toFixed(2)
        );
        const paymentDescription = description
            ? `${description} via ${payment_method}`
            : targetSaleId
                ? `Payment for Bill #${targetSaleId} via ${payment_method}`
                : `Customer payment via ${payment_method}`;

        // Record payment in payments table if targetSaleId exists, or record customer payment transaction
        if (targetSaleId) {
            await client.query(
                `INSERT INTO payments (
                    sale_id,
                    payment_method,
                    amount,
                    created_by
                )
                VALUES ($1, $2, $3, $4)`,
                [
                    targetSaleId,
                    payment_method,
                    paymentAmount,
                    req.user.userId,
                ]
            );
        }

        // Record payment transaction
        await client.query(
            `INSERT INTO customer_credit_transactions (
                customer_id,
                sale_id,
                transaction_type,
                amount,
                description,
                created_by
            )
            VALUES (
                $1,
                $2,
                'PAYMENT',
                $3,
                $4,
                $5
            )`,
            [
                customerId,
                targetSaleId,
                paymentAmount,
                paymentDescription,
                req.user.userId,
            ]
        );

        await client.query("COMMIT");

        res.json({
            success: true,
            message: "Customer payment recorded successfully",
            data: {
                customer_id: customerId,
                customer_name:
                    customerResult.rows[0].name,
                payment_method,
                amount_paid: paymentAmount,
                previous_due: currentDue,
                remaining_due: remainingDue,
                sale_id: targetSaleId,
            },
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Record customer payment error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to record customer payment",
        });
    } finally {
        client.release();
    }
};

// =========================================
// GET ALL CUSTOMER PAYMENT HISTORY
// =========================================

const getAllCustomerPayments = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                ct.id AS payment_id,
                ct.customer_id,
                c.name AS customer_name,
                c.customer_code,
                c.phone AS customer_phone,
                ct.sale_id,
                CASE
                    WHEN ct.sale_id IS NOT NULL THEN ct.sale_id
                    ELSE NULL
                END AS bill_number,
                ct.amount,
                CASE
                    WHEN ct.description LIKE '%CASH%' THEN 'CASH'
                    WHEN ct.description LIKE '%UPI%' THEN 'UPI'
                    ELSE NULL
                END AS payment_method,
                ct.description,
                ct.created_at,
                u.name AS created_by_name
            FROM customer_credit_transactions ct
            LEFT JOIN customers c
                ON ct.customer_id = c.id
            LEFT JOIN users u
                ON ct.created_by = u.id
            WHERE ct.transaction_type = 'PAYMENT'
            ORDER BY ct.created_at DESC
        `);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Get all customer payments error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get customer payment history",
        });
    }
};

module.exports = {
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
};
