import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { Plus, X, CreditCard, Printer } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// Calculate per-bill outstanding due using FIFO payment allocation.
// Credits (bills) are applied oldest-first; payments are applied oldest-first to the oldest outstanding bill.
function computeOutstandingBills(history) {
  if (!Array.isArray(history)) return [];

  const credits = history
    .filter(t => t.transaction_type === 'CREDIT' && t.sale_id)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const payments = history
    .filter(t => t.transaction_type === 'PAYMENT')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Build bill map keyed by sale_id (unique bill identifier)
  const billMap = new Map();
  for (const credit of credits) {
    const key = String(credit.sale_id);
    if (!billMap.has(key)) {
      billMap.set(key, {
        sale_id: credit.sale_id,
        bill_number: `BILL #${credit.sale_id}`,
        credit_id: credit.id,
        total_credited: Number(credit.amount) || 0,
        payments_applied: 0,
        created_at: credit.created_at,
        description: credit.description || '',
      });
    } else {
      const existing = billMap.get(key);
      existing.total_credited += Number(credit.amount) || 0;
    }
  }

  // Apply payments FIFO: each payment is fully consumed by one bill before moving to next
  const paymentQueue = payments.map(p => ({ id: p.id, amount: Number(p.amount) || 0, remaining: Number(p.amount) || 0 }));
  let pqIndex = 0;
  for (const [, bill] of billMap) {
    let billRemaining = bill.total_credited;
    while (pqIndex < paymentQueue.length && billRemaining > 0) {
      const pqPayment = paymentQueue[pqIndex];
      if (pqPayment.remaining <= billRemaining) {
        bill.payments_applied += pqPayment.remaining;
        billRemaining -= pqPayment.remaining;
        pqIndex++;
      } else {
        bill.payments_applied += billRemaining;
        pqPayment.remaining -= billRemaining;
        billRemaining = 0;
      }
    }
  }

  const bills = Array.from(billMap.values()).map(bill => {
    const due = bill.total_credited - bill.payments_applied;
    return {
      ...bill,
      current_due: Math.max(0, Number(due.toFixed(2))),
      paid_amount: Number(bill.payments_applied.toFixed(2)),
    };
  }).filter(bill => bill.current_due > 0);

  return bills;
}

export function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected customer detail state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Receipt modal state
  const [receiptSale, setReceiptSale] = useState(null);
  const [receiptBill, setReceiptBill] = useState(null);
  const [receiptCustomer, setReceiptCustomer] = useState(null);

  // Add Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', address: '' });

  // Receive Payment Modal & Pay Specific Bill Modal
  const [payCustomer, setPayCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [payBill, setPayBill] = useState(null);
  const [billPaymentAmount, setBillPaymentAmount] = useState('');
  const [billPaymentMethod, setBillPaymentMethod] = useState('CASH');
  const [billPaymentLoading, setBillPaymentLoading] = useState(false);

  // Fetch all customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customers');
      if (res.success) {
        setCustomers(res.data || []);
      } else {
        setError(res.message || 'Failed to load customers');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter to only outstanding customers (due > 0)
  const outstandingCustomers = useMemo(() => {
    return customers.filter(c => {
      const due = Number(c.total_due || c.current_udhaar || c.udhaar_amount || c.due_amount || 0);
      return due > 0;
    });
  }, [customers]);

  // Search outstanding customers by name or phone
  const filteredOutstandingCustomers = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return outstandingCustomers;
    return outstandingCustomers.filter(c =>
      c.name?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.phone?.includes(term)
    );
  }, [outstandingCustomers, search]);

  // Total outstanding udhaar
  const totalOutstandingUdhaar = useMemo(() => {
    return outstandingCustomers.reduce((acc, c) => {
      return acc + Number(c.total_due || c.current_udhaar || c.udhaar_amount || c.due_amount || 0);
    }, 0);
  }, [outstandingCustomers]);

  // Load customer detail (credit history)
  const loadCustomerDetail = useCallback(async (customer) => {
    setSelectedCustomer(customer);
    setCustomerHistory(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/customers/${customer.id}/credit-history`);
      if (res.success) {
        setCustomerHistory(res.data);
      } else {
        setDetailError(res.message || 'Failed to load customer history');
      }
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Calculate outstanding bills for selected customer
  const outstandingBills = useMemo(() => {
    if (!customerHistory?.history) return [];
    return computeOutstandingBills(customerHistory.history);
  }, [customerHistory]);

  // Fetch sale details for receipt
  const fetchSaleForReceipt = useCallback(async (saleId) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      if (res.success && res.data) {
        setReceiptSale({
          ...res.data,
          bill_number: `BILL #${res.data.id}`,
        });
        setReceiptCustomer(selectedCustomer);
      }
    } catch (err) {
      console.error('Failed to fetch sale details:', err);
    }
  }, [selectedCustomer]);

  // Open receipt modal for a bill
  const openReceiptModal = useCallback((bill, customer) => {
    setReceiptBill(bill);
    setReceiptCustomer(customer);
    fetchSaleForReceipt(bill.sale_id);
  }, [fetchSaleForReceipt]);

  // Close receipt modal
  const closeReceiptModal = useCallback(() => {
    setReceiptSale(null);
    setReceiptBill(null);
    setReceiptCustomer(null);
  }, []);

  // Handle Add Customer
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/customers', customerForm);
      if (res.success) {
        setShowAddModal(false);
        setCustomerForm({ name: '', phone: '', address: '' });
        fetchCustomers();
      } else {
        alert(res.message || 'Failed to add customer');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Pay Specific Bill
  const handlePayBill = async (e) => {
    e.preventDefault();
    if (!payBill || !selectedCustomer) return;

    const amt = Number(billPaymentAmount);
    const billDue = payBill.current_due;

    if (isNaN(amt) || amt <= 0) {
      alert('Payment amount must be greater than 0.');
      return;
    }

    if (amt > billDue) {
      alert(`Payment amount cannot exceed bill due of ₹${billDue}.`);
      return;
    }

    try {
      setBillPaymentLoading(true);
      const res = await api.post(`/customers/${selectedCustomer.id}/payments`, {
        amount: amt,
        payment_method: billPaymentMethod,
        sale_id: payBill.sale_id,
      });

      if (res.success) {
        setPayBill(null);
        setBillPaymentAmount('');
        setBillPaymentMethod('CASH');
        await fetchCustomers();
        await loadCustomerDetail(selectedCustomer);
      } else {
        alert(res.message || 'Bill payment collection failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setBillPaymentLoading(false);
    }
  };

  // Handle Receive Payment (general payment)
  const handleReceivePayment = async (e) => {
    e.preventDefault();
    if (!payCustomer) return;

    const amt = Number(paymentAmount);
    const customerDue = getCustomerDue(payCustomer);

    if (isNaN(amt) || amt <= 0) {
      alert('Payment amount must be greater than 0.');
      return;
    }

    if (amt > customerDue) {
      alert(`Payment amount cannot exceed current due of ₹${customerDue}.`);
      return;
    }

    try {
      setPaymentLoading(true);
      const res = await api.post(`/customers/${payCustomer.id}/payments`, {
        amount: amt,
        payment_method: paymentMethod,
      });

      if (res.success) {
        setPayCustomer(null);
        setPaymentAmount('');
        setPaymentMethod('CASH');
        await fetchCustomers();
        setSelectedCustomer(null);
        setCustomerHistory(null);
      } else {
        alert(res.message || 'Payment collection failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Get customer display name
  const getCustomerName = (c) => c.name || 'Unknown';
  const getCustomerPhone = (c) => c.phone || '-';
  const getCustomerDue = (c) => Number(c.total_due || c.current_udhaar || c.udhaar_amount || c.due_amount || 0);

  if (loading) return <Loader text="Loading customers..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers & Udhaar Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Total Outstanding Udhaar: <span className="font-bold text-orange-600">₹{totalOutstandingUdhaar.toFixed(2)}</span>
          </p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2 text-sm">
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </Button>
          <Button onClick={fetchCustomers} variant="outline" className="text-sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Outstanding Customers List */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Outstanding Customers</h2>
          <div className="w-72">
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-0"
            />
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="pb-3">Customer Name</th>
                <th className="pb-3">Phone</th>
                <th className="pb-3">Outstanding Bills</th>
                <th className="pb-3">Current Udhaar</th>
                <th className="pb-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredOutstandingCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-gray-500">
                    {search ? 'No matching customers found.' : 'No outstanding customers.'}
                  </td>
                </tr>
              ) : (
                filteredOutstandingCustomers.map(c => {
                  const due = getCustomerDue(c);
                  const isSelected = selectedCustomer && String(selectedCustomer.id) === String(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}
                      onClick={() => loadCustomerDetail(c)}
                    >
                      <td className="py-4 font-semibold text-gray-900">{getCustomerName(c)}</td>
                      <td className="py-4 text-gray-600">{getCustomerPhone(c)}</td>
                      <td className="py-4 text-gray-600">
                        {outstandingBills.length > 0 && selectedCustomer && String(selectedCustomer.id) === String(c.id)
                          ? outstandingBills.length
                          : '-'}
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                          due > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                        }`}>
                          ₹{due}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <Button
                          onClick={(e) => { e.stopPropagation(); loadCustomerDetail(c); }}
                          variant="outline"
                          className="text-xs px-2.5 py-1 flex items-center space-x-1 mx-auto text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>View Bills</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Selected Customer Detail Panel */}
      {selectedCustomer && (
        <Card className="print:hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {getCustomerName(selectedCustomer)}
              </h2>
              <p className="text-sm text-gray-500">
                Phone: {getCustomerPhone(selectedCustomer)}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-bold">
                Current Udhaar: ₹{getCustomerDue(selectedCustomer)}
              </span>
              <Button
                onClick={() => setPayCustomer(selectedCustomer)}
                className="text-xs px-3 py-1.5 flex items-center space-x-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Receive Payment</span>
              </Button>
              <button
                onClick={() => { setSelectedCustomer(null); setCustomerHistory(null); }}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {detailLoading && <Loader text="Loading customer details..." />}
          {detailError && <ErrorMessage message={detailError} />}

          {!detailLoading && !detailError && customerHistory && (
            <>
              {outstandingBills.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No outstanding bills for this customer.
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Outstanding Bills</h3>
                  {outstandingBills.map((bill) => (
                    <div
                      key={bill.sale_id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <button
                            onClick={() => openReceiptModal(bill, selectedCustomer)}
                            className="text-lg font-bold text-indigo-600 hover:text-indigo-800 transition-colors text-left"
                          >
                            {bill.bill_number}
                          </button>
                          <p className="text-sm text-gray-500">
                            Date: {formatDate(bill.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Total</p>
                            <p className="font-semibold text-gray-900">₹{bill.total_credited}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Paid</p>
                            <p className="font-semibold text-green-700">₹{bill.paid_amount}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Due</p>
                            <p className="font-bold text-orange-700">₹{bill.current_due}</p>
                          </div>
                          <Button
                            onClick={() => openReceiptModal(bill, selectedCustomer)}
                            variant="outline"
                            className="text-xs px-2 py-1 flex items-center space-x-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add New Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <Input
                label="Customer Name"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                required
              />
              <Input
                label="Phone Number"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                required
              />
              <Input
                label="Address (Optional)"
                value={customerForm.address}
                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
              />

              <div className="flex justify-end space-x-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Customer</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Payment Modal */}
      {payCustomer && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Receive Udhaar: {getCustomerName(payCustomer)}</h3>
              <button onClick={() => setPayCustomer(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg flex justify-between">
              <span className="text-sm text-gray-600">Current Udhaar:</span>
              <span className="font-bold text-orange-600">₹{getCustomerDue(payCustomer)}</span>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Outstanding Bills:</p>
              {outstandingBills && outstandingBills.length > 0 ? (
                <div className="space-y-1">
                  {outstandingBills.map(bill => (
                    <div key={bill.sale_id} className="flex justify-between text-sm">
                      <span>{bill.bill_number}</span>
                      <span className="font-medium">₹{bill.current_due}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No outstanding bills.</p>
              )}
            </div>

            <form onSubmit={handleReceivePayment} className="space-y-4">
              <Input
                label="Payment Amount Received (₹)"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setPayCustomer(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={paymentLoading}>
                  {paymentLoading ? 'Processing...' : 'Confirm Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Specific Bill Modal */}
      {payBill && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Pay {payBill.bill_number}</h3>
              <button onClick={() => setPayBill(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Customer:</span>
                <span className="font-semibold text-gray-900">{getCustomerName(selectedCustomer)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Bill Total:</span>
                <span className="font-semibold text-gray-900">₹{payBill.total_credited}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Already Paid:</span>
                <span className="font-semibold text-green-700">₹{payBill.paid_amount}</span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
                <span className="font-bold text-gray-900">Remaining Due:</span>
                <span className="font-bold text-orange-600">₹{payBill.current_due}</span>
              </div>
            </div>

            <form onSubmit={handlePayBill} className="space-y-4">
              <Input
                label="Payment Amount (₹)"
                type="number"
                step="0.01"
                max={payBill.current_due}
                value={billPaymentAmount}
                onChange={(e) => setBillPaymentAmount(e.target.value)}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={billPaymentMethod}
                  onChange={(e) => setBillPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setPayBill(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={billPaymentLoading}>
                  {billPaymentLoading ? 'Processing...' : 'Pay Bill'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptSale && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-lg font-bold text-gray-900">Receipt</h3>
                <button onClick={closeReceiptModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {receiptBill && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="text-center border-b pb-3">
                    <h4 className="text-xl font-bold text-gray-900">Kirana Store</h4>
                    <p className="text-xs text-gray-500">Receipt</p>
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bill #:</span>
                      <span className="font-semibold">{receiptBill.bill_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date:</span>
                      <span>{formatDateTime(receiptBill.created_at)}</span>
                    </div>
                    {receiptCustomer && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Customer:</span>
                          <span className="font-semibold">{getCustomerName(receiptCustomer)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Phone:</span>
                          <span>{getCustomerPhone(receiptCustomer)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="border-t border-b py-3 space-y-3">
                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Purchased Items</h5>
                    {receiptSale.items && receiptSale.items.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {receiptSale.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-gray-100 shadow-xs">
                            <div>
                              <p className="font-semibold text-gray-900">{item.product_name}</p>
                              <p className="text-xs text-gray-500">
                                {item.quantity} {item.unit} × ₹{item.price} {item.discount > 0 ? `(Disc: ₹${item.discount})` : ''}
                              </p>
                            </div>
                            <span className="font-bold text-gray-900">₹{item.item_total}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 text-center italic py-1">
                        Item details are not available for this historical bill.
                      </div>
                    )}
                  </div>

                  <div className="border-b py-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bill Total</span>
                      <span className="font-semibold text-gray-900">₹{receiptBill.total_credited}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Amount Paid</span>
                      <span className="font-semibold text-green-700">₹{receiptBill.paid_amount}</span>
                    </div>
                    <div className="border-t border-dashed border-gray-300 pt-2 flex justify-between items-center">
                      <span className="font-bold text-gray-900">Remaining Due</span>
                      <span className="text-xl font-extrabold text-orange-600">₹{receiptBill.current_due}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-1 text-gray-600">
                      <span>Payment Status:</span>
                      <span className="uppercase font-bold tracking-wide text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-800">
                        {receiptBill.current_due === 0 ? 'PAID' : receiptBill.current_due < receiptBill.total_credited ? 'PARTIAL' : 'CREDIT'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3 print:hidden border-t">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                Print Receipt
              </button>
              <button
                onClick={closeReceiptModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
