import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { Plus, X } from 'lucide-react';

export function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stock Adjustment Modal
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [transactionType, setTransactionType] = useState('ADJUSTMENT');
  const [reason, setReason] = useState('');

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category_id: '',
    purchase_price: '',
    selling_price: '',
    stock: '',
    minimum_stock: '',
    unit: 'pcs',
    image_url: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, catRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/categories')
      ]);

      if (invRes.success) {
        setInventory(invRes.data || []);
      }
      if (catRes.success) {
        setCategories(catRes.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustingItem) return;

    try {
      const res = await api.patch(`/inventory/${adjustingItem.product_id}`, {
        quantity: Number(quantity),
        transaction_type: transactionType,
        reason
      });

      if (res.success) {
        setAdjustingItem(null);
        setQuantity('');
        setReason('');
        fetchData();
      } else {
        alert(res.message || 'Adjustment failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...productForm,
        category_id: productForm.category_id ? Number(productForm.category_id) : null,
        purchase_price: Number(productForm.purchase_price),
        selling_price: Number(productForm.selling_price),
        stock: Number(productForm.stock),
        minimum_stock: Number(productForm.minimum_stock)
      };

      const res = await api.post('/products', payload);
      if (res.success) {
        setShowAddModal(false);
        setProductForm({
          name: '',
          description: '',
          category_id: '',
          purchase_price: '',
          selling_price: '',
          stock: '',
          minimum_stock: '',
          unit: 'pcs',
          image_url: ''
        });
        fetchData();
      } else {
        alert(res.message || 'Failed to add product');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.category_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader text="Loading inventory..." />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Inventory & Products</h1>
        <div className="flex space-x-3">
          <Button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2 text-sm">
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Button>
          <Button onClick={fetchData} variant="outline" className="text-sm">
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="w-72">
            <Input
              placeholder="Search product or category..."
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
                <th className="pb-3">Product Name</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Selling Price</th>
                <th className="pb-3">Current Stock</th>
                <th className="pb-3">Unit</th>
                <th className="pb-3">Min Stock</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-gray-500">No inventory items found.</td>
                </tr>
              ) : (
                filteredInventory.map((item, idx) => {
                  const stock = Number(item.current_stock ?? item.stock ?? 0);
                  const minStock = Number(item.minimum_stock ?? 5);
                  const isLow = stock <= minStock;
                  const isOut = stock <= 0;
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-4 font-semibold text-gray-900">{item.name}</td>
                      <td className="py-4 text-gray-600">{item.category_name || 'General'}</td>
                      <td className="py-4 font-medium">₹{item.selling_price || item.price}</td>
                      <td className="py-4 font-bold">{stock}</td>
                      <td className="py-4 text-gray-600">{item.unit || 'pcs'}</td>
                      <td className="py-4 text-gray-500">{minStock}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isOut ? 'bg-red-100 text-red-800' : isLow ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <Button
                          onClick={() => setAdjustingItem(item)}
                          variant="outline"
                          className="text-xs px-2 py-1"
                        >
                          Adjust Stock
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

      {/* Adjust Stock Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Adjust Stock: {adjustingItem.name}</h3>
              <button onClick={() => setAdjustingItem(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="ADJUSTMENT">Adjustment</option>
                  <option value="PURCHASE">Purchase</option>
                  <option value="RETURN">Return</option>
                  <option value="DAMAGE">Damage</option>
                </select>
              </div>

              <Input
                label="Quantity Change (+ or -)"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />

              <Input
                label="Reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Physical count correction"
                required
              />

              <div className="flex justify-end space-x-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setAdjustingItem(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Adjustment</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add New Product</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <Input
                label="Product Name"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={productForm.category_id}
                  onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Purchase Price (₹)"
                  type="number"
                  step="0.01"
                  value={productForm.purchase_price}
                  onChange={(e) => setProductForm({ ...productForm, purchase_price: e.target.value })}
                  required
                />
                <Input
                  label="Selling Price (₹)"
                  type="number"
                  step="0.01"
                  value={productForm.selling_price}
                  onChange={(e) => setProductForm({ ...productForm, selling_price: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Initial Stock"
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  required
                />
                <Input
                  label="Minimum Stock Alert"
                  type="number"
                  value={productForm.minimum_stock}
                  onChange={(e) => setProductForm({ ...productForm, minimum_stock: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Unit (e.g. kg, pcs, pkt)"
                value={productForm.unit}
                onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                required
              />

              <Input
                label="Image URL (Optional)"
                value={productForm.image_url}
                onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
              />

              <div className="flex justify-end space-x-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Product</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
