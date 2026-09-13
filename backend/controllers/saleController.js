const pool = require("../config/db");

// =========================================
// CREATE OFFLINE SALE
// =========================================

const createOfflineSale = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            customer_id,
            items,
            payments,
        } = req.body;

        // -----------------------------------------
        // Validate items
        // -----------------------------------------

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one product is required",
            });
        }

        // -----------------------------------------
        // Validate payments
        // -----------------------------------------

        if (!Array.isArray(payments)) {
            return res.status(400).json({
                success: false,
                message: "Payments must be an array",
            });
        }

        // -----------------------------------------
        // Start database transaction
        // -----------------------------------------

        await client.query("BEGIN");

        // -----------------------------------------
        // Check customer if provided
        // -----------------------------------------

        if (customer_id !== null && customer_id !== undefined) {
            const customerResult = await client.query(
                `SELECT id
                 FROM customers
                 WHERE id = $1`,
                [customer_id]
            );

            if (customerResult.rows.length === 0) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    success: false,
                    message: "Customer not found",
                });
            }
        }

        // -----------------------------------------
        // Get product IDs
        // -----------------------------------------

        const productIds = items.map(
            item => item.product_id
        );

        const uniqueProductIds = [
            ...new Set(productIds.map(String))
        ];

        if (uniqueProductIds.length !== productIds.length) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "A product cannot appear more than once in a sale",
            });
        }

        // -----------------------------------------
        // Get products from database
        // -----------------------------------------

        const productResult = await client.query(
            `SELECT
                p.id,
                p.name,
                p.unit,
                p.selling_price,
                i.quantity AS stock_quantity
             FROM products p
             JOIN inventory i
                ON p.id = i.product_id
             WHERE p.id = ANY($1::bigint[])
               AND p.is_active = true
             FOR UPDATE OF i`,
            [productIds]
        );

        if (productResult.rows.length !== productIds.length) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "One or more products were not found",
            });
        }

        const productMap = new Map();

        productResult.rows.forEach(product => {
            productMap.set(
                String(product.id),
                product
            );
        });

        // -----------------------------------------
        // Calculate sale
        // -----------------------------------------

        let totalAmount = 0;

        const saleItems = [];

        for (const item of items) {
            const product = productMap.get(
                String(item.product_id)
            );

            const quantity = Number(item.quantity);

            if (
                !Number.isFinite(quantity) ||
                quantity <= 0
            ) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    success: false,
                    message: `Invalid quantity for ${product.name}`,
                });
            }

            const currentStock = Number(
                product.stock_quantity
            );

            if (quantity > currentStock) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    success: false,
                    message:
                        `Insufficient stock for ${product.name}. ` +
                        `Available: ${currentStock}`,
                });
            }

            const price = Number(
                product.selling_price
            );

            const itemTotal = quantity * price;

            totalAmount += itemTotal;

            saleItems.push({
                product_id: product.id,
                product_name: product.name,
                quantity,
                price,
                item_total: itemTotal,
                previous_stock: currentStock,
                new_stock: currentStock - quantity,
            });
        }

        totalAmount = Number(
            totalAmount.toFixed(2)
        );

        // -----------------------------------------
        // Validate payment methods
        // -----------------------------------------

        const allowedPaymentMethods = [
            "CASH",
            "UPI",
        ];

        let paymentTotal = 0;

        for (const payment of payments) {
            if (
                !allowedPaymentMethods.includes(
                    payment.payment_method
                )
            ) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    success: false,
                    message: "Invalid payment method",
                });
            }

            const amount = Number(payment.amount);

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    success: false,
                    message: "Invalid payment amount",
                });
            }

            paymentTotal += amount;
        }

        paymentTotal = Number(
            paymentTotal.toFixed(2)
        );

        // Payment cannot exceed sale
        if (paymentTotal > totalAmount) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    "Payment cannot be greater than sale total",
            });
        }

        const dueAmount = Number(
            (totalAmount - paymentTotal).toFixed(2)
        );

        // -----------------------------------------
        // Udhaar requires customer
        // -----------------------------------------

        if (
            dueAmount > 0 &&
            (customer_id === null ||
                customer_id === undefined)
        ) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    "Customer is required when there is an unpaid amount",
            });
        }

        // -----------------------------------------
        // Determine payment status
        // -----------------------------------------

        let paymentStatus;

        if (dueAmount === 0) {
            paymentStatus = "PAID";
        } else if (paymentTotal > 0) {
            paymentStatus = "PARTIAL";
        } else {
            paymentStatus = "CREDIT";
        }

        // -----------------------------------------
        // Create sale
        // -----------------------------------------

        const saleResult = await client.query(
            `INSERT INTO sales (
                customer_id,
                sale_type,
                total_amount,
                payment_status,
                status,
                created_by
            )
            VALUES (
                $1,
                'OFFLINE',
                $2,
                $3,
                'COMPLETED',
                $4
            )
            RETURNING *`,
            [
                customer_id || null,
                totalAmount,
                paymentStatus,
                req.user.userId,
            ]
        );

        const sale = saleResult.rows[0];

        // -----------------------------------------
        // Create sale items + decrease inventory
        // -----------------------------------------

        for (const item of saleItems) {
            await client.query(
                `INSERT INTO sale_items (
                    sale_id,
                    product_id,
                    quantity,
                    price,
                    discount
                )
                VALUES ($1, $2, $3, $4, $5)`,
                [
                    sale.id,
                    item.product_id,
                    item.quantity,
                    item.price,
                    0,
                ]
            );

            // Update stock
            await client.query(
                `UPDATE inventory
                 SET quantity = $1,
                     updated_at = NOW()
                 WHERE product_id = $2`,
                [
                    item.new_stock,
                    item.product_id,
                ]
            );

            // Record inventory transaction
            await client.query(
                `INSERT INTO inventory_transactions (
                    product_id,
                    transaction_type,
                    quantity_change,
                    reason,
                    reference_id,
                    created_by
                )
                VALUES (
                    $1,
                    'SALE',
                    $2,
                    $3,
                    $4,
                    $5
                )`,
                [
                    item.product_id,
                    -item.quantity,
                    `Offline Sale #${sale.id}`,
                    sale.id,
                    req.user.userId,
                ]
            );
        }

        // -----------------------------------------
        // Record payments
        // -----------------------------------------

        for (const payment of payments) {
            await client.query(
                `INSERT INTO payments (
                    sale_id,
                    payment_method,
                    amount,
                    created_by
                )
                VALUES ($1, $2, $3, $4)`,
                [
                    sale.id,
                    payment.payment_method,
                    payment.amount,
                    req.user.userId,
                ]
            );
        }

        // -----------------------------------------
        // Record customer Udhaar
        // -----------------------------------------

        if (dueAmount > 0) {
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
                    'CREDIT',
                    $3,
                    $4,
                    $5
                )`,
                [
                    customer_id,
                    sale.id,
                    dueAmount,
                    `Udhaar from Offline Sale #${sale.id}`,
                    req.user.userId,
                ]
            );
        }

        // -----------------------------------------
        // Commit everything
        // -----------------------------------------

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: "Offline sale created successfully",

            data: {
                sale_id: sale.id,
                sale_type: "OFFLINE",
                total_amount: totalAmount,
                amount_paid: paymentTotal,
                due_amount: dueAmount,
                payment_status: paymentStatus,

                items: saleItems.map(item => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price: item.price,
                    item_total: Number(
                        item.item_total.toFixed(2)
                    ),
                })),
            },
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Create offline sale error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to create offline sale",
        });
    } finally {
        client.release();
    }
};


// =========================================
// GET SALES
// =========================================

const getSales = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                s.id,
                s.sale_type,
                s.total_amount,
                s.payment_status,
                s.status,
                s.created_at,
                c.name AS customer_name,
                c.phone AS customer_phone
            FROM sales s
            LEFT JOIN customers c
                ON s.customer_id = c.id
            ORDER BY s.created_at DESC
        `);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Get sales error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get sales",
        });
    }
};


// =========================================
// GET SALE BY ID
// =========================================

const getSaleById = async (req, res) => {
    try {
        const { id } = req.params;

        const saleResult = await pool.query(`
            SELECT
                s.id,
                s.customer_id,
                s.sale_type,
                s.total_amount,
                s.payment_status,
                s.status,
                s.created_at,
                c.name AS customer_name,
                c.phone AS customer_phone
            FROM sales s
            LEFT JOIN customers c
                ON s.customer_id = c.id
            WHERE s.id = $1
        `, [id]);

        if (saleResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Sale not found",
            });
        }

        const sale = saleResult.rows[0];

        const itemsResult = await pool.query(`
            SELECT
                si.product_id,
                p.name AS product_name,
                p.unit,
                si.quantity,
                si.price,
                si.discount
            FROM sale_items si
            JOIN products p
                ON si.product_id = p.id
            WHERE si.sale_id = $1
        `, [id]);

        const items = itemsResult.rows.map(item => {
            const qty = Number(item.quantity);
            const price = Number(item.price);
            const disc = Number(item.discount || 0);
            const itemTotal = (qty * price) - disc;
            return {
                product_id: item.product_id,
                product_name: item.product_name,
                unit: item.unit,
                quantity: qty,
                price: price,
                discount: disc,
                item_total: Number(itemTotal.toFixed(2)),
            };
        });

        res.json({
            success: true,
            data: {
                ...sale,
                total_amount: Number(sale.total_amount),
                items,
            },
        });
    } catch (error) {
        console.error("Get sale by ID error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get sale details",
        });
    }
};


module.exports = {
    createOfflineSale,
    getSales,
    getSaleById,
};
