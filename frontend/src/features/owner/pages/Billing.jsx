import { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { ProductImage } from '../../../components/ui/ProductImage';
import { QuantityControl } from '../../../components/ui/QuantityControl';
import { Receipt } from '../components/Receipt';
import { formatStockWithUnit } from '../../../utils/format';
import { Trash2, ShoppingCart, Search } from 'lucide-react';

const WALK_IN_CUSTOMER = { id: '', customer_code: '', name: 'Walk-in Customer', phone: '', isWalkIn: true };

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightText = (text, query) => {
  const rawText = String(text ?? '');
  const trimmedQuery = query.trim();

  if (!trimmedQuery || !rawText) return rawText;

  const regex = new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'ig');
  return rawText.split(regex).map((part, index) => {
    const isMatch = part.toLowerCase() === trimmedQuery.toLowerCase();

    return isMatch ? (
      <mark key={`${part}-${index}`} className="rounded bg-indigo-100 px-0.5 font-semibold text-indigo-700">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    );
  });
};

const getCustomerSummary = (customer) => {
  if (!customer) return 'Walk-in Customer';
  const code = customer.customer_code || '';
  const name = customer.name || 'Customer';
  const phone = customer.phone ? ` · ${customer.phone}` : '';
  return `${code}${code ? ' · ' : ''}${name}${phone}`;
};

export function Billing() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [quantityNotice, setQuantityNotice] = useState('');
  const [completedSale, setCompletedSale] = useState(null);

  const pickerRef = useRef(null);
  const inputRef = useRef(null);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [prodRes, custRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/customers')
      ]);

      if (prodRes.success) {
        const nextProducts = prodRes.data || [];
        setProducts(nextProducts);
        setCart((currentCart) => currentCart.map((item) => {
          const freshProduct = nextProducts.find((product) => (product.product_id || product.id) === item.product_id);
          return freshProduct ? { ...item, stock: Number(freshProduct.current_stock ?? freshProduct.stock ?? 0) } : item;
        }));
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsCustomerPickerOpen(false);
      }
    };

    if (isCustomerPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCustomerPickerOpen]);

  const selectedCustomerData = useMemo(
    () => customers.find((customer) => String(customer.id) === String(selectedCustomer)) || null,
    [customers, selectedCustomer]
  );

  const filteredCustomerResults = useMemo(() => {
    const normalizedQuery = customerQuery.trim().toLowerCase();

    const results = !normalizedQuery
      ? customers
      : customers.filter((customer) => {
          const searchText = [customer.customer_code, customer.name, customer.phone]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return searchText.includes(normalizedQuery);
        });

    const walkInEntry = { ...WALK_IN_CUSTOMER, isWalkIn: true };
    const options = [walkInEntry, ...results].slice(0, 18);
    return options;
  }, [customerQuery, customers]);


  const filteredProducts = products.filter((product) => {
    const searchText = `${product.name || ''} ${product.category_name || ''}`.toLowerCase();
    return searchText.includes(search.toLowerCase());
  });

  const highlightedCustomerId = filteredCustomerResults[highlightedCustomerIndex]?.isWalkIn
    ? ''
    : String(filteredCustomerResults[highlightedCustomerIndex]?.id ?? '');

  const focusCustomerInput = () => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleCustomerFocus = () => {
    setIsCustomerPickerOpen(true);
    focusCustomerInput();
    setHighlightedCustomerIndex(0);
    if (selectedCustomerData) {
      setCustomerQuery(`${selectedCustomerData.customer_code || ''} ${selectedCustomerData.name || ''} ${selectedCustomerData.phone || ''}`.trim());
    } else {
      setCustomerQuery('');
    }
  };

  const handleCustomerSelection = (customer) => {
    if (customer?.isWalkIn) {
      setSelectedCustomer('');
      setCustomerQuery('Walk-in Customer');
    } else {
      setSelectedCustomer(String(customer.id));
      setCustomerQuery(getCustomerSummary(customer));
    }

    setHighlightedCustomerIndex(0);
    setIsCustomerPickerOpen(false);
  };

  const handleCustomerKeyDown = (event) => {
    if (!filteredCustomerResults.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsCustomerPickerOpen(true);
      const nextIndex = (highlightedCustomerIndex + 1) % filteredCustomerResults.length;
      setHighlightedCustomerIndex(nextIndex);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsCustomerPickerOpen(true);
      const nextIndex = highlightedCustomerIndex > 0 ? highlightedCustomerIndex - 1 : filteredCustomerResults.length - 1;
      setHighlightedCustomerIndex(nextIndex);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const targetOption = filteredCustomerResults[highlightedCustomerIndex] || filteredCustomerResults[0];
      if (targetOption) {
        handleCustomerSelection(targetOption);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsCustomerPickerOpen(false);
      setCustomerQuery(selectedCustomerData ? getCustomerSummary(selectedCustomerData) : '');
    }
  };

  const addToCart = (product) => {
    const prodId = product.product_id || product.id;
    const price = Number(product.selling_price || product.price);
    const stock = Number(product.current_stock !== undefined ? product.current_stock : product.stock);

    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === prodId);
      if (existing) {
        if (existing.quantity + 1 > stock) {
          setQuantityNotice(`Only ${stock} ${product.unit || 'units'} available.`);
          return prev;
        }
        return prev.map((item) =>
          item.product_id === prodId
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * price }
            : item
        );
      }

      if (1 > stock) {
        setQuantityNotice(`${product.name} is out of stock.`);
        return prev;
      }

      return [...prev, {
        product_id: prodId,
        name: product.name,
        image_url: product.image_url,
        price,
        quantity: 1,
        total: price,
        stock,
        unit: product.unit || 'units'
      }];
    });
  };

  const updateQuantity = (product_id, qty) => {
    const q = Number(qty);
    const item = cart.find((i) => i.product_id === product_id);
    if (item && q > item.stock) {
      setQuantityNotice(`Only ${item.stock} ${item.unit || 'units'} available.`);
      return;
    }
    if (!Number.isFinite(q) || q < 1) {
      setQuantityNotice('Quantity must be at least 1.');
      return;
    }
    setQuantityNotice('');
    setCart((prev) => prev.map((i) =>
      i.product_id === product_id
        ? { ...i, quantity: q, total: q * i.price }
        : i
    ));
  };

  const changeQuantity = (productId, change) => {
    const item = cart.find((cartItem) => cartItem.product_id === productId);
    if (!item) return;
    const nextQuantity = item.quantity + change;
    if (nextQuantity < 1) return;
    if (nextQuantity > item.stock) {
      setQuantityNotice(`Only ${item.stock} ${item.unit || 'units'} available.`);
      return;
    }
    updateQuantity(productId, nextQuantity);
  };

  const removeFromCart = (product_id) => {
    setCart((prev) => prev.filter((item) => item.product_id !== product_id));
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

      const payments = [];
      if (paid > 0) {
        payments.push({
          payment_method: paymentMethod === 'CASH+UPI' ? 'CASH' : (paymentMethod === 'UDHAAR' ? 'CASH' : paymentMethod),
          amount: paid
        });
      }

      const payload = {
        customer_id: selectedCustomer ? Number(selectedCustomer) : null,
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        payments
      };

      const res = await api.post('/sales/offline', payload);
      if (res.success) {
        const customerObj = customers.find((c) => c.id === Number(selectedCustomer));
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

        setCart([]);
        setSelectedCustomer('');
        setCustomerQuery('');
        setAmountPaid('');
        setIsCustomerPickerOpen(false);
        fetchInitialData();
      } else {
        setError(res.message || 'Checkout failed');
      }
    } catch (err) {
      if (/insufficient stock|available:/i.test(err.message || '')) {
        setError('Stock changed. Please review the cart before completing the sale.');
        await fetchInitialData();
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader text="Loading POS inventory and customers..." />;

  return (
    <div className="pos-workspace grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="pos-panel lg:col-span-7">
        <Card className="pos-card flex flex-col p-4">
          <div className="pos-panel-header mb-4 flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-gray-900">Products Catalog</h2>
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-0"
              />
            </div>
          </div>

          <div className="pos-scroll-region pr-2">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
              {filteredProducts.map((product) => {
                const stock = product.current_stock !== undefined ? product.current_stock : product.stock;
                const price = product.selling_price || product.price;
                return (
                  <div
                    key={product.product_id || product.id}
                    onClick={() => addToCart(product)}
                    className="border rounded-lg p-3 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all bg-white flex flex-col justify-between"
                  >
                    <div>
                      <ProductImage src={product.image_url} alt={product.name} size="sm" className="mb-2" />
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
                      <p className="text-xs text-gray-500">{product.category_name || 'General'}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-bold text-indigo-600">₹{price}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        Stock: {formatStockWithUnit(stock, product.unit)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      <div className="pos-panel pos-bill-panel lg:col-span-5">
        <Card className="pos-card pos-bill-card flex flex-col p-4">
          <div className="pos-panel-header pos-bill-header shrink-0">
            <h2 className="mb-4 flex items-center text-lg font-bold text-gray-900">
              <ShoppingCart className="w-5 h-5 mr-2 text-indigo-600" />
              Current Bill
            </h2>

            {error && <ErrorMessage message={error} />}

            {quantityNotice && <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800" role="status">{quantityNotice}</p>}
            <div className="pos-cart-scroll pos-bill-cart mb-4 divide-y">
              {cart.length === 0 ? (
                <div className="pos-bill-empty py-8 text-center text-sm"><ShoppingCart className="h-8 w-8 text-slate-300" /><p className="mt-2 font-semibold text-slate-700">Your bill is empty</p><p className="mt-1 text-slate-500">Add products from the catalog to start a sale.</p></div>
              ) : (
                cart.map((item) => (
                  <div key={item.product_id} className="flex flex-col items-stretch gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                      <ProductImage src={item.image_url} alt={item.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">₹{item.price} each · {formatStockWithUnit(Math.max(0, item.stock - item.quantity), item.unit)} available</p>
                      </div>
                    </div>
                    <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                      <QuantityControl
                        value={item.quantity}
                        max={item.stock}
                        allowDecimal={!/piece|pcs|pack|box|dozen/i.test(item.unit || '')}
                        onIncrease={() => changeQuantity(item.product_id, 1)}
                        onDecrease={() => changeQuantity(item.product_id, -1)}
                        onChange={(nextQuantity) => updateQuantity(item.product_id, nextQuantity)}
                        onInvalid={setQuantityNotice}
                      />
                      <div className="w-16 text-right"><span className="block text-sm font-semibold text-slate-900">₹{item.total}</span><span className="text-[10px] text-slate-500">line total</span></div>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        aria-label={`Remove ${item.name}`}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleCheckout} className="pos-checkout pos-bill-checkout shrink-0 space-y-4 border-t pt-4">
            <div className="relative" ref={pickerRef}>
              <label className="mb-1 block text-sm font-medium text-gray-700">Customer</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  role="combobox"
                  aria-label="Search customer"
                  aria-expanded={isCustomerPickerOpen}
                  aria-controls="customer-picker-results"
                  placeholder="Search customer by ID, name or phone..."
                  value={isCustomerPickerOpen ? customerQuery : (selectedCustomerData ? getCustomerSummary(selectedCustomerData) : customerQuery || '')}
                  onFocus={handleCustomerFocus}
                  onChange={(event) => {
                    setCustomerQuery(event.target.value);
                    setHighlightedCustomerIndex(0);
                    setIsCustomerPickerOpen(true);
                  }}
                  onKeyDown={handleCustomerKeyDown}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-10 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                {selectedCustomerData && !isCustomerPickerOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomerPickerOpen(true);
                      focusCustomerInput();
                      setCustomerQuery(`${selectedCustomerData.customer_code || ''} ${selectedCustomerData.name || ''} ${selectedCustomerData.phone || ''}`.trim());
                    }}
                    className="absolute inset-y-1 right-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Change
                  </button>
                )}
              </div>

              {isCustomerPickerOpen && (
                <div
                  id="customer-picker-results"
                  role="listbox"
                  aria-label="Customer search results"
                  className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
                >
                  {filteredCustomerResults.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">
                      <p className="font-medium text-slate-700">No customers found</p>
                      <p className="mt-1">Try searching by customer ID, name or phone.</p>
                    </div>
                  ) : (
                    filteredCustomerResults.map((customer) => {
                      const optionId = customer.isWalkIn ? '' : String(customer.id);
                      const isActive = highlightedCustomerId === optionId;

                      return (
                        <button
                          key={customer.isWalkIn ? 'walk-in' : customer.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleCustomerSelection(customer)}
                          className={`flex w-full flex-col border-b border-slate-100 px-3 py-2.5 text-left transition ${isActive ? 'bg-indigo-50' : 'bg-white hover:bg-slate-50'}`}
                        >
                          {customer.isWalkIn ? (
                            <>
                              <span className="text-sm font-semibold text-slate-800">Walk-in Customer</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                                {highlightText(customer.customer_code || 'N/A', customerQuery)}
                              </span>
                              <span className="mt-0.5 text-sm font-semibold text-slate-900">
                                {highlightText(customer.name || 'Customer', customerQuery)}
                              </span>
                              {customer.phone && (
                                <span className="mt-0.5 text-xs text-slate-500">
                                  {highlightText(customer.phone, customerQuery)}
                                </span>
                              )}
                            </>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
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
