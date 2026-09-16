import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { Plus, X } from 'lucide-react';

export function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Purchase Modal
  const [showModal, setShowModal] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([{ product_id: '', quantity: '', purchase_price: '' }]);
  const [amountPaid, setAmountPaid] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purRes, supRes, prodRes] = await Promise.all([
        api.get('/purchases'),
        api.get('/suppliers'),
        api.get('/products')
      ]);

      if (purRes.success) setPurchases(purRes.data || []);
      if (supRes.success) setSuppliers(supRes.data || []);
      if (prodRes.success) setProducts(prodRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItemRow = () => {
    setPurchaseItems([...purchaseItems, { product_id: '', quantity: '', purchase_price: '' }]);
  };

  const updateItemRow = (index, field, value) => {
    const newItems = [...purchaseItems];
    newItems[index][field] = value;
    if (field === 'product_id') {
      const prod = products.find(p => p.id === Number(value));
      if (prod) {
        newItems[index]['purchase_price'] = prod.purchase_price || '';
      }
    }
    setPurchaseItems(newItems);
  };

  const removeItemRow = (index) => {
    setPurchaseItems(purchaseItems.filter((_, idx) => idx !== index));
  };

  const calculateTotal = () => {
    return purchaseItems.reduce((acc, item) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.purchase_price) || 0;
      return acc + (q * p);
    }, 0);
  };

  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    if (!supplierId) {
      alert('Please select a supplier');
      return;
    }

    try {
      setSubmitting(true);
      const total = calculateTotal();
      const paid = amountPaid !== '' ? Number(amountPaid) : total;
      
      const payload = {
        supplier_id: Number(supplierId),
        amount_paid: paid,
        items: purchaseItems.map(item => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          purchase_price: Number(item.purchase_price)
        }))
      };

      const res = await api.post('/purchases', payload);
      if (res.success) {
        setShowModal(false);
        setSupplierId('');
        setPurchaseItems([{ product_id: '', quantity: '', purchase_price: '' }]);
        setAmountPaid('');
        fetchData();
      } else {
        alert(res.message || 'Failed to create purchase');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader text="Loading purchases..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Purchases Management</h1>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <Button onClick={() => setShowModal(true)} className="flex items-center space-x-2 text-sm">
            <Plus className="w-4 h-4" />
            <span>New Purchase</span>
          </Button>
          <Button onClick={fetchData} variant="outline" className="text-sm">
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        {error && <ErrorMessage message={error} />}

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="pb-3">Purchase ID</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Supplier</th>
                <th className="pb-3">Total Amount</th>
                <th className="pb-3">Paid</th>
                <th className="pb-3">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-500">No purchases recorded.</td>
                </tr>
              ) : (
                purchases.map((p, idx) => {
                  const total = Number(p.total_amount || 0);
                  const paid = Number(p.amount_paid || 0);
                  const due = p.due_amount !== undefined ? Number(p.due_amount) : Math.max(0, total - paid);
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-4 font-semibold text-gray-900">#{p.id}</td>
                      <td className="py-4 text-gray-600">{new Date(p.created_at).toLocaleString()}</td>
                      <td className="py-4 text-gray-900">{p.supplier_name || 'Unknown Supplier'}</td>
                      <td className="py-4 font-bold">₹{total}</td>
                      <td className="py-4 text-green-600 font-medium">₹{paid}</td>
                      <td className="py-4 text-red-600 font-medium">₹{due}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 sm:hidden">
          {purchases.length === 0 ? <p className="py-6 text-center text-gray-500">No purchases recorded.</p> : purchases.map((p) => {
            const total = Number(p.total_amount || 0);
            const paid = Number(p.amount_paid || 0);
            const due = p.due_amount !== undefined ? Number(p.due_amount) : Math.max(0, total - paid);
            return <article key={p.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-gray-900">Purchase #{p.id}</p><p className="mt-1 text-xs text-gray-500">{new Date(p.created_at).toLocaleString()}</p></div><span className="text-sm font-bold text-red-600">Due ₹{due}</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-gray-500">Supplier</p><p className="mt-1 font-semibold text-gray-900 break-words">{p.supplier_name || 'Unknown Supplier'}</p></div><div><p className="text-xs text-gray-500">Total</p><p className="mt-1 font-bold">₹{total}</p></div><div><p className="text-xs text-gray-500">Paid</p><p className="mt-1 font-medium text-green-600">₹{paid}</p></div></div></article>;
          })}
        </div>
      </Card>

      {/* New Purchase Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="modal-window bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">New Purchase Order</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Items</label>
                  <Button type="button" onClick={addItemRow} variant="outline" className="text-xs py-1">
                    + Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {purchaseItems.map((item, index) => (
                    <div key={index} className="grid gap-2 bg-gray-50 p-3 rounded-lg sm:grid-cols-[minmax(0,1fr)_6rem_7rem_auto] sm:items-center">
                      <div className="min-w-0">
                        <select
                          value={item.product_id}
                          onChange={(e) => updateItemRow(index, 'product_id', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          required
                        >
                          <option value="">Select Product</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full sm:w-24">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItemRow(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          required
                        />
                      </div>
                      <div className="w-full sm:w-28">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={item.purchase_price}
                          onChange={(e) => updateItemRow(index, 'purchase_price', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          required
                        />
                      </div>
                      {purchaseItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-100 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total:</span>
                  <span className="text-lg font-bold text-gray-900">₹{calculateTotal()}</span>
                </div>
                <Input
                  label="Amount Paid (₹)"
                  type="number"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="Leave empty for full payment"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Purchase'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
