export function Receipt({ sale, onClose }) {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="modal-window bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden print:shadow-none print:m-0 print:w-full">
        <div className="p-6 print:p-2 space-y-4">
          <div className="text-center border-b pb-4">
            <h2 className="text-xl font-bold text-gray-900">Kirana Store</h2>
            <p className="text-xs text-gray-500">Tax Invoice / Receipt</p>
          </div>

          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Bill Number:</span>
              <span className="font-semibold">{sale.bill_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date:</span>
              <span>{new Date(sale.created_at || Date.now()).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Customer:</span>
              <span className="font-semibold">{sale.customer_name || 'Walk-in Customer'}</span>
            </div>
          </div>

          <div className="border-t border-b py-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="pb-1">Item</th>
                  <th className="pb-1 text-center">Qty</th>
                  <th className="pb-1 text-right">Price</th>
                  <th className="pb-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed">
                {sale.items && sale.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 font-medium">{item.product_name || item.name}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">₹{item.price}</td>
                    <td className="py-2 text-right font-semibold">₹{item.total || (item.quantity * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1 text-sm border-b pb-4">
            <div className="flex justify-between font-semibold text-base">
              <span>Grand Total:</span>
              <span>₹{sale.total_amount || sale.total}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Payment Method:</span>
              <span className="uppercase font-medium">{sale.payment_method}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Payment Status:</span>
              <span className="uppercase font-medium">{sale.payment_status}</span>
            </div>
            {sale.amount_paid !== undefined && (
              <div className="flex justify-between text-gray-600">
                <span>Amount Paid:</span>
                <span>₹{sale.amount_paid}</span>
              </div>
            )}
            {sale.due_amount !== undefined && sale.due_amount > 0 && (
              <div className="flex justify-between text-red-600 font-semibold">
                <span>Due Amount:</span>
                <span>₹{sale.due_amount}</span>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-gray-500 pt-2">
            <p>Thank you for shopping with us!</p>
            <p>Please visit again.</p>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3 print:hidden border-t">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
