import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { Plus, X, CreditCard, History } from 'lucide-react';

export function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Supplier Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '', address: '' });

  // Payment Modal
  const [paySupplier, setPaySupplier] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // History Modal
  const [historySupplier, setHistorySupplier] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/suppliers/dues');
      if (res.success) {
        setSuppliers(res.data || []);
      } else {
        setError(res.message || 'Failed to load suppliers');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (supplier) => {
    setHistorySupplier(supplier);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await api.get(`/suppliers/${supplier.id}/credit-history`);
      if (res.success) {
        setHistoryData(res.data);
      } else {
        setHistoryError(res.message || 'Failed to load transaction history');
      }
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/suppliers', supplierForm);
      if (res.success) {
        setShowAddModal(false);
        setSupplierForm({ name: '', phone: '', email: '', address: '' });
        fetchSuppliers();
      } else {
        alert(res.message || 'Failed to add supplier');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paySupplier) return;

    try {
      const res = await api.post(`/suppliers/${paySupplier.id}/payments`, {
        amount: Number(paymentAmount),
        payment_method: paymentMethod
      });

      if (res.success) {
        setPaySupplier(null);
        setPaymentAmount('');
        fetchSuppliers();
        if (historySupplier && historySupplier.id === paySupplier.id) {
          fetchHistory(paySupplier);
        }
      } else {
        alert(res.message || 'Payment recording failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  );

  const totalSupplierDue = suppliers.reduce((acc, s) => acc + Number(s.total_due || s.current_due || s.due_amount || 0), 0);

  if (loading) return <Loader text="Loading suppliers..." />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Total Suppliers: <span className="font-semibold text-gray-900">{suppliers.length}</span> | Total Supplier Due: <span className="font-bold text-red-600">₹{totalSupplierDue}</span>
          </p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2 text-sm">
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </Button>
          <Button onClick={fetchSuppliers} variant="outline" className="text-sm">
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
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
                <th className="pb-3">Supplier Name</th>
                <th className="pb-3">Phone</th>
                <th className="pb-3">Current Due</th>
                <th className="pb-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-6 text-gray-500">No suppliers found.</td>
                </tr>
              ) : (
                filteredSuppliers.map(s => {
                  const due = Number(s.total_due || s.current_due || s.due_amount || 0);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="py-4 font-semibold text-gray-900">{s.name}</td>
                      <td className="py-4 text-gray-600">{s.phone || '-'}</td>
                      <td className="py-4 font-bold text-red-600">₹{due}</td>
                      <td className="py-4 text-center space-x-2">
                        <Button
                          onClick={() => fetchHistory(s)}
                          variant="outline"
                          className="text-xs px-2.5 py-1 inline-flex items-center space-x-1"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>History</span>
                        </Button>
                        {due > 0 ? (
                          <Button
                            onClick={() => setPaySupplier(s)}
                            variant="outline"
                            className="text-xs px-2.5 py-1 inline-flex items-center space-x-1 text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay Due</span>
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-xs px-2">No Due</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add New Supplier</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-4">
              <Input
                label="Supplier Name"
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                required
              />
              <Input
                label="Phone Number"
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                required
              />
              <Input
                label="Email (Optional)"
                type="email"
                value={supplierForm.email}
                onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
              />
              <Input
                label="Address (Optional)"
                value={supplierForm.address}
                onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              />

              <div className="flex justify-end space-x-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Supplier</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {paySupplier && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Pay Supplier: {paySupplier.name}</h3>
              <button onClick={() => setPaySupplier(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg flex justify-between">
                <span className="text-sm text-gray-600">Current Due:</span>
                <span className="font-bold text-red-600">₹{paySupplier.total_due || paySupplier.current_due || paySupplier.due_amount || 0}</span>
              </div>

              <Input
                label="Payment Amount (₹)"
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
                <Button type="button" variant="secondary" onClick={() => setPaySupplier(null)}>
                  Cancel
                </Button>
                <Button type="submit">Record Payment</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Transaction History Modal */}
      {historySupplier && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Transaction History: {historySupplier.name}</h3>
                <p className="text-xs text-gray-500">Phone: {historySupplier.phone || 'N/A'}</p>
              </div>
              <button onClick={() => setHistorySupplier(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {historyLoading && <Loader text="Loading transaction history..." />}
            {historyError && <ErrorMessage message={historyError} />}

            {!historyLoading && !historyError && historyData && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-medium">Current Outstanding Due</span>
                    <h4 className="text-xl font-bold text-red-600">₹{historySupplier.total_due || historySupplier.current_due || 0}</h4>
                  </div>
                  <div>
                    <Button 
                      onClick={() => { setPaySupplier(historySupplier); setHistorySupplier(null); }}
                      className="text-xs py-1.5"
                    >
                      Pay Due Now
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-gray-500">
                        <th className="pb-2">Date & Time</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Description</th>
                        <th className="pb-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {historyData.history && historyData.history.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-6 text-gray-500">No transactions recorded for this supplier.</td>
                        </tr>
                      ) : (
                        historyData.history?.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-3 text-gray-600">{new Date(tx.created_at).toLocaleString()}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                tx.transaction_type === 'CREDIT' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {tx.transaction_type}
                              </span>
                            </td>
                            <td className="py-3 text-gray-900">{tx.description || '-'}</td>
                            <td className={`py-3 text-right font-bold ${
                              tx.transaction_type === 'CREDIT' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {tx.transaction_type === 'CREDIT' ? '+' : '-'}₹{tx.amount}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <Button type="button" variant="secondary" onClick={() => setHistorySupplier(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
