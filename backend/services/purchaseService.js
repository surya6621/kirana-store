const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

async function createPurchaseTransaction(client, {
    supplierId,
    amountPaid,
    paymentStatus,
    paymentMethod = "CASH",
    items,
    userId,
}) {
    if (!supplierId || !Array.isArray(items) || items.length === 0) {
        throw Object.assign(new Error("Supplier and purchase items are required"), { statusCode: 400 });
    }

    const supplierResult = await client.query(
        `SELECT id FROM suppliers WHERE id = $1 AND is_active = true`,
        [supplierId]
    );
    if (supplierResult.rows.length === 0) {
        throw Object.assign(new Error("Supplier not found"), { statusCode: 404 });
    }

    const productIds = items.map((item) => item.product_id);
    const productResult = await client.query(
        `SELECT id, purchase_price
         FROM products
         WHERE id = ANY($1::bigint[]) AND is_active = true`,
        [productIds]
    );
    if (productResult.rows.length !== productIds.length) {
        throw Object.assign(new Error("One or more products were not found"), { statusCode: 400 });
    }

    const productMap = new Map(productResult.rows.map((product) => [String(product.id), product]));
    const purchaseItems = [];
    let totalAmount = 0;
    for (const item of items) {
        const product = productMap.get(String(item.product_id));
        const quantity = Number(item.quantity);
        const purchasePrice = Number(item.purchase_price ?? product.purchase_price);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw Object.assign(new Error("Invalid product quantity"), { statusCode: 400 });
        }
        if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
            throw Object.assign(new Error("Invalid purchase price"), { statusCode: 400 });
        }
        totalAmount += quantity * purchasePrice;
        purchaseItems.push({ product_id: product.id, quantity, purchase_price: purchasePrice });
    }

    totalAmount = roundMoney(totalAmount);
    let paidAmount = amountPaid === undefined || amountPaid === null || amountPaid === ""
        ? totalAmount
        : roundMoney(amountPaid);
    if (paymentStatus === "PAID") paidAmount = totalAmount;
    if (paymentStatus === "PENDING") paidAmount = 0;
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > totalAmount) {
        throw Object.assign(new Error("Amount paid must be between ₹0 and the purchase total"), { statusCode: 400 });
    }

    const dueAmount = roundMoney(totalAmount - paidAmount);
    const finalPaymentStatus = dueAmount === 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "PENDING";
    const purchaseResult = await client.query(
        `INSERT INTO purchases (supplier_id, total_amount, amount_paid, payment_status, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [supplierId, totalAmount, paidAmount, finalPaymentStatus, userId]
    );
    const purchase = purchaseResult.rows[0];

    for (const item of purchaseItems) {
        await client.query(
            `INSERT INTO purchase_items (purchase_id, product_id, quantity, purchase_price)
             VALUES ($1, $2, $3, $4)`,
            [purchase.id, item.product_id, item.quantity, item.purchase_price]
        );
        const inventoryResult = await client.query(
            `SELECT quantity FROM inventory WHERE product_id = $1 FOR UPDATE`,
            [item.product_id]
        );
        if (inventoryResult.rows.length === 0) {
            throw Object.assign(new Error(`Inventory not found for product ${item.product_id}`), { statusCode: 404 });
        }
        const newStock = Number(inventoryResult.rows[0].quantity) + item.quantity;
        await client.query(
            `UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE product_id = $2`,
            [newStock, item.product_id]
        );
        await client.query(
            `INSERT INTO inventory_transactions
                (product_id, transaction_type, quantity_change, reason, reference_id, created_by)
             VALUES ($1, 'PURCHASE', $2, $3, $4, $5)`,
            [item.product_id, item.quantity, `Purchase #${purchase.id}`, purchase.id, userId]
        );
    }

    if (dueAmount > 0) {
        await client.query(
            `INSERT INTO supplier_credit_transactions
                (supplier_id, purchase_id, transaction_type, amount, description, created_by)
             VALUES ($1, $2, 'CREDIT', $3, $4, $5)`,
            [supplierId, purchase.id, totalAmount, `Amount due from Purchase #${purchase.id}`, userId]
        );
    }
    if (paidAmount > 0) {
        await client.query(
            `INSERT INTO supplier_credit_transactions
                (supplier_id, purchase_id, transaction_type, amount, description, created_by)
             VALUES ($1, $2, 'PAYMENT', $3, $4, $5)`,
            [supplierId, purchase.id, paidAmount, `Purchase payment via ${paymentMethod}`, userId]
        );
    }

    return {
        purchase_id: purchase.id,
        total_amount: totalAmount,
        amount_paid: paidAmount,
        due_amount: dueAmount,
        payment_status: finalPaymentStatus,
        items: purchaseItems,
    };
}

module.exports = { createPurchaseTransaction };