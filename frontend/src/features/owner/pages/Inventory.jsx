import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, ChevronRight, ImagePlus, PackagePlus, Plus, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../../../services/api';
import { ProductImage } from '../../../components/ui/ProductImage';
import { formatCurrency, formatDate, formatStockWithUnit, stockStatus } from '../../../utils/format';

const emptyForm = { name: '', description: '', category_id: '', purchase_price: '', selling_price: '', initial_stock: '', minimum_stock: '5', unit: 'Piece', image_url: '' };
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function StatusBadge({ status }) { return <span className={`status-badge status-${status.tone}`}>{status.label}</span>; }
function Field({ label, required, error, ...props }) { return <label className="block text-sm font-semibold text-slate-700">{label}{required && <span className="ml-1 text-red-500">*</span>}<input {...props} className={`mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${error ? 'border-red-400' : 'border-slate-200'}`} />{error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}</label>; }

export function Inventory() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [adjustment, setAdjustment] = useState(null);
  const [adjustmentForm, setAdjustmentForm] = useState({ quantity: '', direction: 'ADD', reason: '' });
  const [adjustmentError, setAdjustmentError] = useState('');
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const [inventoryResponse, categoryResponse] = await Promise.all([api.get('/inventory'), api.get('/categories')]);
      if (!inventoryResponse.success) throw new Error('Unable to load inventory.');
      setItems(inventoryResponse.data || []);
      setCategories(categoryResponse.data || []);
    } catch (err) { setError('Unable to load inventory. Please try again.'); console.error(err); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const filteredItems = useMemo(() => items.filter((item) => {
    const status = stockStatus(item.current_stock, item.minimum_stock);
    const matchesQuery = `${item.name} ${item.category_name}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === 'all' || status.tone === statusFilter);
  }), [items, query, statusFilter]);

  const openCreate = () => { setForm(emptyForm); setFormErrors({}); setImageError(''); setFormOpen(true); };
  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const uploadImage = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setImageError('Use a JPG, PNG, or WEBP image.'); return; }
    if (file.size > 5 * 1024 * 1024) { setImageError('Image must be 5 MB or smaller.'); return; }
    setImageUploading(true); setImageError('');
    try {
      const body = new FormData(); body.append('image', file);
      const response = await fetch(`${API_URL}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, body });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Image upload failed.');
      updateForm('image_url', result.imageUrl);
    } catch (err) { setImageError(err.message || 'Image upload failed.'); } finally { setImageUploading(false); }
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Product name is required.';
    if (!form.category_id) next.category_id = 'Choose a category.';
    if (!form.unit.trim()) next.unit = 'Unit is required.';
    if (form.selling_price === '' || Number(form.selling_price) < 0) next.selling_price = 'Enter a valid selling price.';
    if (form.purchase_price !== '' && Number(form.purchase_price) < 0) next.purchase_price = 'Price cannot be negative.';
    if (form.initial_stock === '' || Number(form.initial_stock) < 0) next.initial_stock = 'Stock cannot be negative.';
    if (form.minimum_stock === '' || Number(form.minimum_stock) < 0) next.minimum_stock = 'Minimum stock cannot be negative.';
    setFormErrors(next); return Object.keys(next).length === 0;
  };

  const createProduct = async (event) => {
    event.preventDefault(); if (!validate()) return;
    setSaving(true); setMessage('');
    try {
      const response = await api.post('/products', { ...form, category_id: Number(form.category_id), selling_price: Number(form.selling_price), purchase_price: form.purchase_price === '' ? null : Number(form.purchase_price), initial_stock: Number(form.initial_stock), minimum_stock: Number(form.minimum_stock) });
      if (!response.success) throw new Error(response.message || 'Product could not be created.');
      setFormOpen(false); setMessage(`${form.name} added to inventory.`); await fetchData();
    } catch (err) { setFormErrors({ form: err.message || 'Product could not be created.' }); } finally { setSaving(false); }
  };

  const openDetails = async (item) => {
    setSelected(item); setHistory([]);
    try { const response = await api.get(`/inventory/${item.product_id}/history`); if (response.success) setHistory(response.data || []); } catch (err) { console.error(err); }
  };
  const applyAdjustment = async (event) => {
    event.preventDefault();
    const quantity = Number(adjustmentForm.quantity);
    if (!adjustment || !adjustmentForm.quantity || !adjustmentForm.reason.trim()) return;
    if (!Number.isFinite(quantity) || quantity < 0) { setAdjustmentError('Enter a positive quantity.'); return; }
    if (quantity === 0) { setAdjustmentError('Quantity must be greater than 0.'); return; }
    if (adjustmentForm.direction === 'REMOVE' && quantity > Number(adjustment.current_stock)) {
      setAdjustmentError(`Cannot remove ${formatStockWithUnit(quantity, adjustment.unit)}. Only ${formatStockWithUnit(adjustment.current_stock, adjustment.unit)} is available.`);
      return;
    }
    setSaving(true);
    setAdjustmentError('');
    try {
      const change = adjustmentForm.direction === 'REMOVE' ? -quantity : quantity;
      const actionLabel = adjustmentForm.direction === 'REMOVE' ? 'REMOVE STOCK' : 'ADD STOCK';
      const response = await api.patch(`/inventory/${adjustment.product_id}`, { transaction_type: 'ADJUSTMENT', quantity: change, reason: `${actionLabel}: ${adjustmentForm.reason.trim()}` });
      if (!response.success) throw new Error(response.message || 'Stock adjustment failed.');
      setAdjustment(null); setAdjustmentForm({ quantity: '', direction: 'ADD', reason: '' }); setMessage('Stock adjusted successfully.'); await fetchData();
    } catch (err) { setAdjustmentError(err.message || 'Stock adjustment failed.'); } finally { setSaving(false); }
  };

  const adjustmentQuantity = Number(adjustmentForm.quantity);
  const adjustmentIsRemoval = adjustmentForm.direction === 'REMOVE';
  const adjustmentAfterStock = adjustment && Number.isFinite(adjustmentQuantity) && adjustmentQuantity > 0
    ? Number(adjustment.current_stock) + (adjustmentIsRemoval ? -adjustmentQuantity : adjustmentQuantity)
    : null;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-sm font-semibold text-emerald-700">Catalog & stock control</p><h2 className="page-title text-3xl font-extrabold">Inventory</h2><p className="mt-2 text-sm text-[var(--muted)]">Keep every shelf, price, and reorder point in view.</p></div><div className="flex gap-2"><button onClick={fetchData} className="focus-ring rounded-xl border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-50" aria-label="Refresh inventory"><RefreshCw className="h-4 w-4" /></button><button onClick={openCreate} className="focus-ring flex items-center gap-2 rounded-xl bg-[var(--brand-700)] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[var(--brand-900)]"><Plus className="h-4 w-4" /> Add product</button></div></div>
    {message && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><Check className="h-4 w-4" />{message}<button className="ml-auto" onClick={() => setMessage('')} aria-label="Dismiss message"><X className="h-4 w-4" /></button></div>}
    {error && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"><AlertCircle className="h-4 w-4" />{error}<button className="ml-auto underline" onClick={fetchData}>Retry</button></div>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Products" value={items.length} /><Metric label="In stock" value={items.filter((item) => stockStatus(item.current_stock, item.minimum_stock).tone === 'success').length} tone="green" /><Metric label="Low stock" value={items.filter((item) => stockStatus(item.current_stock, item.minimum_stock).tone === 'warning').length} tone="amber" /><Metric label="Out of stock" value={items.filter((item) => stockStatus(item.current_stock, item.minimum_stock).tone === 'danger').length} tone="red" /></div>
    <section className="surface overflow-hidden rounded-2xl"><div className="flex flex-col gap-3 border-b border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:max-w-sm"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or categories" className="w-full bg-transparent text-sm outline-none" /></div><div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-slate-400" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"><option value="all">All stock statuses</option><option value="success">In stock</option><option value="warning">Low stock</option><option value="danger">Out of stock</option></select></div></div>{loading ? <div className="space-y-3 p-5">{[1, 2, 3, 4].map((row) => <div key={row} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div> : filteredItems.length === 0 ? <div className="p-14 text-center"><PackagePlus className="mx-auto h-10 w-10 text-emerald-600" /><h3 className="mt-3 text-lg font-bold">{items.length ? 'No matching products' : 'No products yet'}</h3><p className="mt-1 text-sm text-[var(--muted)]">{items.length ? 'Try another search or filter.' : 'Add your first product to start managing inventory.'}</p>{!items.length && <button onClick={openCreate} className="mt-5 rounded-xl bg-[var(--brand-700)] px-4 py-2.5 text-sm font-bold text-white">Add your first product</button>}</div> : <div className="table-shell"><table className="data-table"><thead><tr><th>Product</th><th>Category</th><th>Prices</th><th>Current stock</th><th>Status</th><th>Updated</th><th aria-label="Actions" /></tr></thead><tbody>{filteredItems.map((item) => { const status = stockStatus(item.current_stock, item.minimum_stock); return <tr key={item.product_id}><td><button onClick={() => openDetails(item)} className="flex items-center gap-3 text-left"><ProductImage src={item.image_url} alt={item.name} size="sm" /><span><span className="block font-bold text-slate-800">{item.name}</span><span className="block text-xs text-slate-500">{item.unit}</span></span></button></td><td className="text-slate-600">{item.category_name || 'Uncategorized'}</td><td><span className="block font-bold text-slate-800">{formatCurrency(item.selling_price)}</span><span className="text-xs text-slate-500">Buy {formatCurrency(item.purchase_price)}</span></td><td><span className="font-bold">{item.current_stock}</span> <span className="text-xs text-slate-500">/ min {item.minimum_stock}</span></td><td><StatusBadge status={status} /></td><td className="text-slate-500">{formatDate(item.updated_at)}</td><td><div className="flex justify-end gap-1"><button onClick={() => setAdjustment(item)} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" title="Adjust stock"><PackagePlus className="h-4 w-4" /></button><button onClick={() => openDetails(item)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="View details"><ChevronRight className="h-4 w-4" /></button></div></td></tr>; })}</tbody></table></div>}</section>
    {formOpen && <Modal title="Add product" onClose={() => !saving && setFormOpen(false)}><form onSubmit={createProduct} className="space-y-5">{formErrors.form && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{formErrors.form}</p>}<div className="grid gap-4 sm:grid-cols-2"><Field label="Product name" required value={form.name} error={formErrors.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="e.g. Duracell AA Batteries" /><label className="block text-sm font-semibold text-slate-700">Category<span className="ml-1 text-red-500">*</span><select value={form.category_id} onChange={(e) => updateForm('category_id', e.target.value)} className={`mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 ${formErrors.category_id ? 'border-red-400' : 'border-slate-200'}`}><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{formErrors.category_id && <span className="mt-1 block text-xs text-red-600">{formErrors.category_id}</span>}</label></div><div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4"><div className="flex items-center gap-4"><ProductImage src={form.image_url} alt="Product preview" size="lg" /><div><p className="font-bold">Product image</p><p className="mt-1 text-xs text-slate-500">JPG, PNG, or WEBP up to 5 MB</p><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-emerald-700 shadow-sm"><ImagePlus className="h-4 w-4" />{imageUploading ? 'Uploading...' : form.image_url ? 'Replace image' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={imageUploading} onChange={(e) => uploadImage(e.target.files?.[0])} /></label>{form.image_url && <button type="button" onClick={() => updateForm('image_url', '')} className="ml-2 text-xs font-semibold text-red-600">Remove</button>}</div></div>{imageError && <p className="mt-2 text-xs font-semibold text-red-600">{imageError}</p>}</div><div className="grid gap-4 sm:grid-cols-2"><Field label="Purchase price (₹)" type="number" min="0" step="0.01" value={form.purchase_price} error={formErrors.purchase_price} onChange={(e) => updateForm('purchase_price', e.target.value)} placeholder="0.00" /><Field label="Selling price (₹)" required type="number" min="0" step="0.01" value={form.selling_price} error={formErrors.selling_price} onChange={(e) => updateForm('selling_price', e.target.value)} placeholder="0.00" /><Field label="Initial stock" required type="number" min="0" step="0.001" value={form.initial_stock} error={formErrors.initial_stock} onChange={(e) => updateForm('initial_stock', e.target.value)} placeholder="50" /><Field label="Minimum stock" required type="number" min="0" step="0.001" value={form.minimum_stock} error={formErrors.minimum_stock} onChange={(e) => updateForm('minimum_stock', e.target.value)} placeholder="5" /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Unit" required value={form.unit} error={formErrors.unit} onChange={(e) => updateForm('unit', e.target.value)} placeholder="Piece, pack, kg" /><Field label="Description" value={form.description} onChange={(e) => updateForm('description', e.target.value)} placeholder="Optional product notes" /></div><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setFormOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button disabled={saving || imageUploading} className="rounded-xl bg-[var(--brand-700)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save product'}</button></div></form></Modal>}
    {adjustment && <Modal title={`Adjust stock: ${adjustment.name}`} onClose={() => !saving && setAdjustment(null)}><form onSubmit={applyAdjustment} className="space-y-5">{adjustmentError && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{adjustmentError}</p>}<div className={`rounded-xl p-4 ${adjustmentIsRemoval ? 'bg-amber-50' : 'bg-emerald-50'}`}><p className={`text-sm ${adjustmentIsRemoval ? 'text-amber-800' : 'text-emerald-800'}`}>Current stock</p><p className={`mt-1 text-2xl font-extrabold ${adjustmentIsRemoval ? 'text-amber-950' : 'text-emerald-950'}`}>{formatStockWithUnit(adjustment.current_stock, adjustment.unit)}</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Transaction type<select value={adjustmentForm.direction} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, direction: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"><option value="ADD">Add Stock</option><option value="REMOVE">Remove Stock</option></select></label><Field label={adjustmentIsRemoval ? 'Quantity to remove' : 'Quantity to add'} required type="number" min="0" step="0.001" value={adjustmentForm.quantity} onChange={(e) => { setAdjustmentError(''); setAdjustmentForm({ ...adjustmentForm, quantity: e.target.value }); }} placeholder="Enter quantity" /></div><Field label="Reason" required value={adjustmentForm.reason} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })} placeholder="e.g. Physical stock count" />{adjustmentAfterStock !== null && <div className={`rounded-xl border p-4 text-sm ${adjustmentIsRemoval ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}><p>Stock will {adjustmentIsRemoval ? 'decrease' : 'increase'} from <strong>{formatStockWithUnit(adjustment.current_stock, adjustment.unit)}</strong> to <strong>{formatStockWithUnit(adjustmentAfterStock, adjustment.unit)}</strong>.</p><p className="mt-1 font-bold">Adjustment: {adjustmentIsRemoval ? '-' : '+'}{formatStockWithUnit(adjustmentQuantity, adjustment.unit)}</p></div>}<div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-4 sm:flex-row"><button type="button" onClick={() => setAdjustment(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button disabled={saving} className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${adjustmentIsRemoval ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[var(--brand-700)] hover:bg-[var(--brand-900)]'}`}>{saving ? 'Saving...' : adjustmentIsRemoval ? 'Remove Stock' : 'Add Stock'}</button></div></form></Modal>}
    {selected && <Modal title={selected.name} onClose={() => setSelected(null)}><div className="space-y-6"><div className="flex items-center gap-4"><ProductImage src={selected.image_url} alt={selected.name} size="lg" /><div><p className="text-sm text-slate-500">{selected.category_name || 'Uncategorized'} · {selected.unit}</p><p className="mt-1 text-2xl font-extrabold">{formatCurrency(selected.selling_price)}</p><StatusBadge status={stockStatus(selected.current_stock, selected.minimum_stock)} /></div></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Current stock', selected.current_stock], ['Minimum stock', selected.minimum_stock], ['Purchase price', formatCurrency(selected.purchase_price)], ['Last updated', formatDate(selected.updated_at)]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold">{value}</p></div>)}</div><div><h3 className="mb-3 font-bold">Stock history</h3>{history.length ? <div className="space-y-2">{history.map((entry) => <div key={entry.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-sm"><div><p className="font-bold">{entry.transaction_type}</p><p className="text-xs text-slate-500">{entry.reason || 'No reason'} · {formatDate(entry.created_at)}</p></div><span className={`font-extrabold ${Number(entry.quantity_change) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{Number(entry.quantity_change) >= 0 ? '+' : ''}{entry.quantity_change}</span></div>)}</div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No stock movements recorded yet.</p>}</div></div></Modal>}
  </div>;
}

function Metric({ label, value, tone = 'neutral' }) { const color = { neutral: 'text-slate-800', green: 'text-emerald-700', amber: 'text-amber-700', red: 'text-red-600' }[tone]; return <div className="surface rounded-2xl p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p><p className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</p></div>; }
function Modal({ title, onClose, children }) { return <div className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center p-4"><div role="dialog" aria-modal="true" className="modal-window rounded-lg bg-white p-6 shadow-xl sm:max-w-2xl"><div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-3"><h2 className="text-xl font-extrabold">{title}</h2><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button></div>{children}</div></div>; }
