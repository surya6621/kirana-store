const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

async function getSupplierLiabilities(client, supplierId, forUpdate = false) {
    const lock = forUpdate ? " FOR UPDATE" : "";
    const result = await client.query(
        `SELECT
            sct.id,
            sct.purchase_id,
            sct.supplier_id,
            sct.transaction_type,
            sct.amount,
            sct.created_at
         FROM supplier_credit_transactions sct
         WHERE sct.supplier_id = $1
         ORDER BY sct.created_at ASC, sct.id ASC${lock}`,
        [supplierId]
    );

    const credits = result.rows
        .filter((row) => row.transaction_type === "CREDIT" && row.purchase_id)
        .map((row) => ({
            ...row,
            originalAmount: roundMoney(row.amount),
            paymentsApplied: 0,
        }));
    const linkedPayments = result.rows.filter(
        (row) => row.transaction_type === "PAYMENT" && row.purchase_id
    );
    const legacyPayments = result.rows
        .filter((row) => row.transaction_type === "PAYMENT" && !row.purchase_id)
        .map((row) => ({
            amount: roundMoney(row.amount),
            createdAt: new Date(row.created_at).getTime(),
        }));

    for (const credit of credits) {
        credit.paymentsApplied = roundMoney(
            linkedPayments
                .filter((payment) => String(payment.purchase_id) === String(credit.purchase_id))
                .reduce((total, payment) => total + Number(payment.amount || 0), 0)
        );
    }

    // Legacy payments may not have a purchase_id. They can only settle liabilities
    // that already existed when the payment was made. They must never reduce a
    // purchase created later.
    for (const payment of legacyPayments) {
        let remainingPayment = payment.amount;
        for (const credit of credits) {
            if (new Date(credit.created_at).getTime() > payment.createdAt) continue;
            const remainingCredit = roundMoney(credit.originalAmount - credit.paymentsApplied);
            if (remainingPayment <= 0 || remainingCredit <= 0) break;
            const applied = Math.min(remainingPayment, remainingCredit);
            credit.paymentsApplied = roundMoney(credit.paymentsApplied + applied);
            remainingPayment = roundMoney(remainingPayment - applied);
        }
    }

    return credits.map((credit) => ({
        ...credit,
        paidAmount: roundMoney(credit.paymentsApplied),
        dueAmount: Math.max(0, roundMoney(credit.originalAmount - credit.paymentsApplied)),
    }));
}

async function getSupplierBalance(client, supplierId, forUpdate = false) {
    const liabilities = await getSupplierLiabilities(client, supplierId, forUpdate);
    return {
        liabilities,
        currentDue: roundMoney(
            liabilities.reduce((total, liability) => total + liability.dueAmount, 0)
        ),
    };
}

async function getAllSupplierBalances(client, cleanupSettled = false) {
    const suppliersResult = await client.query(`
        SELECT id, name, phone, address, is_active
        FROM suppliers
        ORDER BY name ASC
    `);
    const suppliers = [];

    for (const supplier of suppliersResult.rows) {
        const balance = await getSupplierBalance(client, supplier.id);
        if (cleanupSettled) {
            await removeSettledCredits(client, balance.liabilities);
        }
        suppliers.push({
            ...supplier,
            total_due: balance.currentDue,
            outstanding_purchases: balance.liabilities.filter((item) => item.dueAmount > 0),
        });
    }

    return suppliers;
}

async function removeSettledCredits(client, liabilities) {
    if (liabilities.length === 0) return;

    for (const liability of liabilities.filter((item) => item.dueAmount <= 0)) {
        await client.query(
            `DELETE FROM supplier_credit_transactions
             WHERE id = $1 AND transaction_type = 'CREDIT'`,
            [liability.id]
        );
    }
}

module.exports = {
    getSupplierLiabilities,
    getSupplierBalance,
    getAllSupplierBalances,
    removeSettledCredits,
    roundMoney,
};
