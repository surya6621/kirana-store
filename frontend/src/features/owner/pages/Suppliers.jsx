import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { Plus, X, CreditCard, Archive, Edit } from 'lucide-react';

export function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Supplier Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [editSupplier, setEditSupplier] = useState(null);
  const [editSupplierForm, setEditSupplierForm] = useState({ name: '', phone: '', address: '' });
  const [editSupplierErrors, setEditSupplierErrors] = useState({});
  const [editSupplierSaving, setEditSupplierSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Payment Modal
  const [paySupplier, setPaySupplier] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentError, setPaymentError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [archivingSupplierId, setArchivingSupplierId] = useState(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
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
  }

  const archiveSupplier = async (supplier) => {
    const confirmed = window.confirm(`${supplier.name} will be removed from active suppliers. Existing purchases, payments and transaction history will be preserved.`);
    if (!confirmed || archivingSupplierId) return;
    setArchivingSupplierId(supplier.id);
    setError(null);
    try {
      const response = await api.patch(`/suppliers/${supplier.id}/archive`);
      if (!response.success) throw new Error(response.message || 'Unable to remove supplier.');
      await fetchSuppliers();
    } catch (err) {
      setError(err.message || 'Unable to remove supplier. Please try again.');
    } finally {
      setArchivingSupplierId(null);
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

  const openEditSupplier = (supplier) => {
    setEditSupplier(supplier);
    setEditSupplierForm({
      name: supplier.name || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
    });
    setEditSupplierErrors({});
  };

  const validateEditSupplier = () => {
    const next = {};
    if (!editSupplierForm.name.trim()) next.name = 'Supplier name is required.';
    if (editSupplierForm.phone.trim() && !/^[0-9+\-\s()]{6,20}$/.test(editSupplierForm.phone.trim())) {
      next.phone = 'Enter a valid phone number.';
    }
    setEditSupplierErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleEditSupplier = async (e) => {
    e.preventDefault();
    if (!editSupplier || !validateEditSupplier()) return;

    try {
      setEditSupplierSaving(true);
      setEditSupplierErrors({});
      const res = await api.patch(`/suppliers/${editSupplier.id}`, {
        name: editSupplierForm.name.trim(),
        phone: editSupplierForm.phone.trim() || null,
        address: editSupplierForm.address.trim() || null,
      });
      if (!res.success) throw new Error(res.message || 'Unable to update supplier.');

      setSuppliers((current) =>
        current.map((supplier) =>
          String(supplier.id) === String(editSupplier.id)
            ? { ...supplier, ...res.data, total_due: supplier.total_due, outstanding_purchases: supplier.outstanding_purchases }
            : supplier
        )
      );
      if (paySupplier && String(paySupplier.id) === String(editSupplier.id)) {
        setPaySupplier({ ...paySupplier, ...res.data });
      }
      setEditSupplier(null);
      setSuccessMessage('Supplier updated successfully.');
      await fetchSuppliers();
    } catch (err) {
      setEditSupplierErrors({ form: err.message || 'Unable to update supplier. Please try again.' });
    } finally {
      setEditSupplierSaving(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paySupplier) return;

    const outstanding = Number(paySupplier.total_due || paySupplier.current_due || paySupplier.due_amount || 0);
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Payment amount must be greater than ₹0.');
      return;
    }
    if (amount > outstanding) {
      setPaymentError(`Payment cannot exceed the outstanding amount of ₹${outstanding.toFixed(2)}.`);
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentError('');
      const res = await api.post(`/suppliers/${paySupplier.id}/payments`, {
        amount,
        payment_method: paymentMethod
      });

      if (res.success) {
        setPaySupplier(null);
        setPaymentAmount('');
        setPaymentError('');
        await fetchSuppliers();
      } else {
        setPaymentError(res.message || 'Payment failed. Please try again.');
      }
    } catch (err) {
      setPaymentError(err.message || 'Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
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
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Total Suppliers: <span className="font-semibold text-gray-900">{suppliers.length}</span> | Total Supplier Due: <span className="font-bold text-red-600">₹{totalSupplierDue}</span>
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
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
        {successMessage && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {successMessage}
            <button className="ml-3 text-emerald-700 underline" onClick={() => setSuccessMessage('')}>
              Dismiss
            </button>
          </div>
        )}
        <div className="mb-6 flex items-center justify-between">
          <div className="w-full sm:w-72">
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
          <table className="min-w-[640px] w-full text-left text-sm">
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
                          onClick={() => openEditSupplier(s)}
                          variant="outline"
                          className="text-xs px-2.5 py-1 inline-flex items-center space-x-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Button>
                        {due > 0 ? (
                          <Button
                            onClick={() => { setPaymentError(''); setPaymentAmount(''); setPaySupplier(s); }}
                            variant="outline"
                            className="text-xs px-2.5 py-1 inline-flex items-center space-x-1 text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay Due</span>
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-xs px-2">No Due</span>
                        )}
                        <Button
                          onClick={() => archiveSupplier(s)}
                          variant="outline"
                          disabled={archivingSupplierId === s.id}
                          aria-label={`Remove ${s.name} from active suppliers`}
                          className="text-xs px-2.5 py-1 inline-flex items-center space-x-1 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>{archivingSupplierId === s.id ? 'Removing...' : 'Remove'}</span>
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

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="modal-window bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
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

      {/* Edit Supplier Modal */}
      {editSupplier && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="modal-window bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Edit Supplier</h3>
              <button
                onClick={() => !editSupplierSaving && setEditSupplier(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSupplier} className="space-y-4">
              {editSupplierErrors.form && (
                <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {editSupplierErrors.form}
                </p>
              )}
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <span className="text-gray-500">Supplier ID</span>
                <p className="font-mono font-bold text-emerald-700">
                  {editSupplier.id}
                </p>
              </div>
              <Input
                label="Supplier Name"
                value={editSupplierForm.name}
                error={editSupplierErrors.name}
                onChange={(e) => setEditSupplierForm({ ...editSupplierForm, name: e.target.value })}
                required
              />
              <Input
                label="Phone Number"
                value={editSupplierForm.phone}
                error={editSupplierErrors.phone}
                onChange={(e) => setEditSupplierForm({ ...editSupplierForm, phone: e.target.value })}
              />
              <Input
                label="Address (Optional)"
                value={editSupplierForm.address}
                onChange={(e) => setEditSupplierForm({ ...editSupplierForm, address: e.target.value })}
              />

              <div className="flex justify-end space-x-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setEditSupplier(null)} disabled={editSupplierSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editSupplierSaving}>
                  {editSupplierSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {paySupplier && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="modal-window bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
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

              {paymentError && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{paymentError}</p>}

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
                <Button type="submit" disabled={paymentLoading}>
                  {paymentLoading ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
