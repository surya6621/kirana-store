const pool = require("../config/db");
const {
    getAllSupplierBalances,
    getSupplierLiabilities,
    removeSettledCredits,
    roundMoney,
} = require("../services/supplierBalance");

// =========================================
// GET ALL SUPPLIERS
// =========================================

const getSuppliers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                name,
                phone,
                address,
                created_at
            FROM suppliers
            WHERE is_active = true
            ORDER BY name ASC
        `);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Get suppliers error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get suppliers",
        });
    }
};


// =========================================
// CREATE SUPPLIER
// =========================================

const createSupplier = async (req, res) => {
    try {
        const {
            name,
            phone,
            address,
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Supplier name is required",
            });
        }

        const result = await pool.query(
            `INSERT INTO suppliers (
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
            message: "Supplier created successfully",
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Create supplier error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create supplier",
        });
    }
};

const updateSupplier = async (req, res) => {
    const allowedFields = {
        name: "name",
        phone: "phone",
        address: "address",
    };
    const updates = {};

    try {
        for (const [field] of Object.entries(allowedFields)) {
            if (!Object.prototype.hasOwnProperty.call(req.body, field)) {
                continue;
            }

            const value = req.body[field];

            if (field === "name") {
                if (typeof value !== "string" || !value.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: "Supplier name is required",
                    });
                }
                updates.name = value.trim().slice(0, 150);
            } else if (field === "phone") {
                updates.phone =
                    typeof value === "string" && value.trim()
                        ? value.trim().slice(0, 20)
                        : null;
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
                message: "No supplier changes were provided",
            });
        }

        const values = Object.values(updates);
        const setClause = Object.keys(updates)
            .map((column, index) => `${column} = $${index + 1}`)
            .join(", ");

        const result = await pool.query(
            `UPDATE suppliers
             SET ${setClause}
             WHERE id = $${values.length + 1}
             RETURNING id, name, phone, address, is_active, created_at`,
            [...values, req.params.supplierId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
        }

        res.json({
            success: true,
            message: "Supplier updated successfully",
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Update supplier error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update supplier. Please try again.",
        });
    }
};

// =========================================
// GET SUPPLIER DUES
// =========================================

const getSupplierDues = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const data = (await getAllSupplierBalances(client, true)).filter((supplier) => supplier.is_active);

        await client.query("COMMIT");
        data.sort((left, right) => Number(right.total_due) - Number(left.total_due) || left.name.localeCompare(right.name));

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Get supplier dues error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get supplier dues",
        });
    } finally {
        client.release();
    }
};


// =========================================
// GET SUPPLIER CREDIT HISTORY
// =========================================

const getSupplierCreditHistory = async (req, res) => {
    const client = await pool.connect();
    try {
        const { supplierId } = req.params;

        const supplierResult = await pool.query(
            `SELECT id, name, phone
             FROM suppliers
             WHERE id = $1`,
            [supplierId]
        );

        if (supplierResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
        }

        const historyResult = await client.query(
            `SELECT
                sct.id,
                sct.transaction_type,
                sct.amount,
                sct.description,
                sct.purchase_id,
                sct.created_at,
                u.name AS created_by_name
             FROM supplier_credit_transactions sct
             LEFT JOIN users u
                ON sct.created_by = u.id
             WHERE sct.supplier_id = $1
             ORDER BY sct.created_at DESC`,
            [supplierId]
        );
        const liabilities = await getSupplierLiabilities(client, supplierId);

        res.json({
            success: true,
            data: {
                supplier: supplierResult.rows[0],
                history: historyResult.rows,
                outstanding_purchases: liabilities
                    .filter((item) => item.dueAmount > 0)
                    .map((item) => ({
                        purchase_id: item.purchase_id,
                        original_amount: item.originalAmount,
                        paid_amount: item.paidAmount,
                        due_amount: item.dueAmount,
                    })),
                current_due: roundMoney(
                    liabilities.reduce((total, item) => total + item.dueAmount, 0)
                ),
            },
        });
    } catch (error) {
        console.error("Supplier credit history error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get supplier credit history",
        });
    } finally {
        client.release();
    }
};

// =========================================
// RECORD SUPPLIER PAYMENT
// =========================================

const archiveSupplier = async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE suppliers
             SET is_active = false
             WHERE id = $1 AND is_active = true
             RETURNING id, name, is_active`,
            [req.params.supplierId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Active supplier not found" });
        }

        res.json({ success: true, message: "Supplier removed from active suppliers", data: result.rows[0] });
    } catch (error) {
        console.error("Archive supplier error:", error);
        res.status(500).json({ success: false, message: "Unable to remove supplier" });
    }
};

const recordSupplierPayment = async (req, res) => {
    const client = await pool.connect();

    try {
        const { supplierId } = req.params;
        const {
            amount,
            payment_method,
            description,
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

        // Check supplier
        const supplierResult = await client.query(
            `SELECT id, name
             FROM suppliers
             WHERE id = $1`,
            [supplierId]
        );

        if (supplierResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
        }

        const liabilities = await getSupplierLiabilities(client, supplierId, true);
        const currentDue = roundMoney(
            liabilities.reduce((total, item) => total + item.dueAmount, 0)
        );

        if (currentDue <= 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Supplier has no outstanding due",
            });
        }

        // Cannot pay more than supplier due
        if (paymentAmount > currentDue) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    `Payment cannot be greater than current due of ₹${currentDue}`,
            });
        }

        let remainingPayment = paymentAmount;
        const paymentDescription = description
            ? `${description} via ${payment_method}`
            : `Supplier payment via ${payment_method}`;
        for (const liability of liabilities) {
            if (remainingPayment <= 0 || liability.dueAmount <= 0) break;
            const applied = roundMoney(Math.min(remainingPayment, liability.dueAmount));
            await client.query(
                `INSERT INTO supplier_credit_transactions (
                    supplier_id,
                    purchase_id,
                    transaction_type,
                    amount,
                    description,
                    created_by
                )
                VALUES ($1, $2, 'PAYMENT', $3, $4, $5)`,
                [
                    supplierId,
                    liability.purchase_id,
                    applied,
                    paymentDescription,
                    req.user.userId,
                ]
            );
            remainingPayment = roundMoney(remainingPayment - applied);
        }

        const updatedLiabilities = await getSupplierLiabilities(client, supplierId, true);
        for (const liability of updatedLiabilities) {
            const purchaseResult = await client.query(
                `SELECT total_amount
                 FROM purchases
                 WHERE id = $1
                 FOR UPDATE`,
                [liability.purchase_id]
            );
            if (purchaseResult.rows.length === 0) continue;

            const totalAmount = roundMoney(purchaseResult.rows[0].total_amount);
            const paidAmount = roundMoney(totalAmount - liability.dueAmount);
            const paymentStatus = liability.dueAmount <= 0
                ? "PAID"
                : paidAmount > 0 ? "PARTIAL" : "PENDING";
            await client.query(
                `UPDATE purchases
                 SET amount_paid = $1, payment_status = $2
                 WHERE id = $3`,
                [paidAmount, paymentStatus, liability.purchase_id]
            );
        }
        await removeSettledCredits(client, updatedLiabilities);
        const updatedDue = roundMoney(
            updatedLiabilities.reduce((total, item) => total + item.dueAmount, 0)
        );

        await client.query("COMMIT");

        res.json({
            success: true,
            message: "Supplier payment recorded successfully",
            data: {
                supplier_id: supplierId,
                supplier_name:
                    supplierResult.rows[0].name,
                payment_method,
                amount_paid: paymentAmount,
                previous_due: currentDue,
                remaining_due: updatedDue,
            },
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Record supplier payment error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to record supplier payment",
        });
    } finally {
        client.release();
    }
};

module.exports = {
    getSuppliers,
    createSupplier,
    updateSupplier,
    getSupplierDues,
    getSupplierCreditHistory,
    recordSupplierPayment,
    archiveSupplier,
};
