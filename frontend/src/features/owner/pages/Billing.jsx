import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { Receipt } from '../components/Receipt';
import { Search, Plus, Trash2, ShoppingCart } from 'lucide-react';

export function Billing() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [completedSale, setCompletedSale] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [prodRes, custRes] = await Promise.all([
        api.get('/inventory'), // inventory endpoint returns product info + current stock
        api.get('/customers')
      ]);

      if (prodRes.success) {
        setProducts(prodRes.data || []);
      }
      if (custRes.success) {
        setCustomers(custRes.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category_name && p.category_name.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (product) => {
    const prodId = product.product_id || product.id;
    const price = Number(product.selling_price || product.price);
    const stock = Number(product.current_stock !== undefined ? product.current_stock : product.stock);

    setCart(prev => {
      const existing = prev.find(item => item.product_id === prodId);
      if (existing) {
        if (existing.quantity + 1 > stock) {
          alert('Cannot add more than available stock');
          return prev;
        }
        return prev.map(item => 
          item.product_id === prodId 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * price }
            : item
        );
      } else {
        if (1 > stock) {
          alert('Product is out of stock');
          return prev;
        }
        return [...prev, {
          product_id: prodId,
          name: product.name,
          price,
          quantity: 1,
          total: price,
          stock
        }];
      }
    });
  };

  const updateQuantity = (product_id, qty) => {
    const q = parseInt(qty) || 0;
    const item = cart.find(i => i.product_id === product_id);
    if (item && q > item.stock) {
      alert(`Cannot exceed available stock (${item.stock})`);
      return;
    }
    if (q <= 0) {
      removeFromCart(product_id);
      return;
    }
    setCart(prev => prev.map(i => 
      i.product_id === product_id 
        ? { ...i, quantity: q, total: q * i.price }
        : i
    ));
  };

  const removeFromCart = (product_id) => {
    setCart(prev => prev.filter(item => item.product_id !== product_id));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const paid = amountPaid !== '' ? Number(amountPaid) : (paymentMethod === 'UDHAAR' ? 0 : subtotal);
      
      let payments = [];
      if (paid > 0) {
        payments.push({
          payment_method: paymentMethod === 'CASH+UPI' ? 'CASH' : (paymentMethod === 'UDHAAR' ? 'CASH' : paymentMethod),
          amount: paid
        });
      }

      const payload = {
        customer_id: selectedCustomer ? Number(selectedCustomer) : null,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        payments
      };

      const res = await api.post('/sales/offline', payload);
      if (res.success) {
        const customerObj = customers.find(c => c.id === Number(selectedCustomer));
        setCompletedSale({
          bill_number: `BILL #${res.data?.sale_id || Date.now()}`,
          created_at: new Date(),
          customer_name: customerObj ? customerObj.name : 'Walk-in Customer',
          items: [...cart],
          total_amount: res.data?.total_amount || subtotal,
          payment_method: paymentMethod,
          payment_status: res.data?.payment_status || (paymentMethod === 'UDHAAR' ? 'CREDIT' : 'PAID'),
          amount_paid: res.data?.amount_paid !== undefined ? res.data.amount_paid : paid,
          due_amount: res.data?.due_amount !== undefined ? res.data.due_amount : Math.max(0, subtotal - paid)
        });

        // Reset cart
        setCart([]);
        setSelectedCustomer('');
        setAmountPaid('');
        fetchInitialData(); // Refresh stock
      } else {
        setError(res.message || 'Checkout failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader text="Loading POS inventory and customers..." />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-7rem)]">
      {/* Left: Product Selection */}
      <div className="lg:col-span-7 flex flex-col space-y-4 h-full overflow-hidden">
        <Card className="p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Products Catalog</h2>
            <div className="w-64">
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-0"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map(product => {
                const stock = product.current_stock !== undefined ? product.current_stock : product.stock;
                const price = product.selling_price || product.price;
                return (
                  <div
                    key={product.product_id || product.id}
                    onClick={() => addToCart(product)}
                    className="border rounded-lg p-3 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all bg-white flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
                      <p className="text-xs text-gray-500">{product.category_name || 'General'}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-bold text-indigo-600">₹{price}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        Stock: {stock} {product.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Right: Current Bill / Cart */}
      <div className="lg:col-span-5 flex flex-col h-full">
        <Card className="p-4 flex flex-col h-full justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2 text-indigo-600" />
              Current Bill
            </h2>

            {error && <ErrorMessage message={error} />}

            {/* Cart Items List */}
            <div className="overflow-y-auto max-h-64 divide-y mb-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-sm">Cart is empty. Click products to add.</p>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className="py-2 flex items-center justify-between">
                    <div className="flex-1 pr-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">₹{item.price} each</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product_id, e.target.value)}
                        className="w-16 px-2 py-1 border rounded text-center text-sm"
                      />
                      <span className="text-sm font-semibold w-16 text-right">₹{item.total}</span>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleCheckout} className="border-t pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
              >
                <option value="">Walk-in Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH+UPI">Cash + UPI</option>
                  <option value="UDHAAR">Udhaar (Credit)</option>
                </select>
              </div>

              {(paymentMethod === 'UDHAAR' || paymentMethod === 'CASH+UPI') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="mb-0 text-sm py-1.5"
                  />
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
              <span className="font-semibold text-gray-900">Grand Total:</span>
              <span className="text-xl font-bold text-indigo-600">₹{subtotal}</span>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || cart.length === 0}
            >
              {submitting ? 'Processing...' : 'Complete Sale & Print'}
            </Button>
          </form>
        </Card>
      </div>

      {completedSale && (
        <Receipt sale={completedSale} onClose={() => setCompletedSale(null)} />
      )}
    </div>
  );
}
