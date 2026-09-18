import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { formatStockWithUnit } from '../../../utils/format';
import {
  BarChart3, Bell, ChevronLeft, ChevronRight, CreditCard, LayoutDashboard,
  LogOut, Menu, Package, Receipt, Search, Settings, ShoppingBag,
  ShoppingCart, Store, Truck, Users, X,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/owner', icon: LayoutDashboard, exact: true },
  { name: 'Billing / POS', path: '/owner/billing', icon: Receipt },
  { name: 'Sales', path: '/owner/sales', icon: ShoppingBag },
  { name: 'Inventory', path: '/owner/inventory', icon: Package },
  { name: 'Purchases', path: '/owner/purchases', icon: ShoppingCart },
  { name: 'Suppliers', path: '/owner/suppliers', icon: Truck },
  { name: 'Customers / Udhaar', path: '/owner/customers', icon: Users },
  { name: 'Payment History', path: '/owner/payment-history', icon: CreditCard },
  { name: 'Reports', path: '/owner/reports', icon: BarChart3 },
];

export function OwnerLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [lowStock, setLowStock] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState(false);
  const notificationRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = navItems.find((item) => item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path));

  const handleLogout = () => { logout(); navigate('/login'); };
  const loadLowStock = async () => {
    try {
      const response = await api.get('/inventory/low-stock');
      if (!response.success) throw new Error(response.message);
      setLowStock(response.data || []);
      setNotificationsError(false);
    } catch (error) {
      setNotificationsError(true);
      console.error(error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    loadLowStock();
    const refresh = window.setInterval(loadLowStock, 15000);
    return () => window.clearInterval(refresh);
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    notificationRef.current = document.querySelector('button[aria-label="Notifications"]')?.parentElement || null;

    const handlePointerDown = (event) => {
      if (!notificationRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [notificationsOpen]);

  return (
    <div className="owner-shell flex">
      {mobileOpen && <button aria-label="Close navigation" className="modal-backdrop fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`owner-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(18rem,calc(100vw-2rem))] flex-col transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <div className={`flex items-center gap-3 ${collapsed ? 'lg:justify-center' : ''}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-emerald-950"><Store className="h-5 w-5" /></div>
            <div className={collapsed ? 'lg:hidden' : ''}><p className="owner-brand text-base font-extrabold">SURYA KIRANA STORE</p><p className="text-xs text-emerald-200/60">Store operations</p></div>
          </div>
          <button aria-label="Close navigation" className="text-emerald-100/60 lg:hidden" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className={`mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-200/45 ${collapsed ? 'lg:hidden' : ''}`}>Workspace</p>
          {navItems.map(({ name, path, icon: Icon, exact }) => <NavLink key={path} to={path} end={exact} title={collapsed ? name : undefined} onClick={() => setMobileOpen(false)} className={({ isActive }) => `owner-nav-link flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${isActive ? 'active' : ''} ${collapsed ? 'lg:justify-center' : ''}`}><Icon className="h-[18px] w-[18px] shrink-0" /><span className={collapsed ? 'lg:hidden' : ''}>{name}</span></NavLink>)}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className={`flex items-center gap-3 rounded-xl bg-white/5 p-3 ${collapsed ? 'lg:justify-center' : ''}`}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-200 font-bold text-emerald-900">{(user?.name || user?.username || 'O').slice(0, 1).toUpperCase()}</div><div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}><p className="truncate text-sm font-bold">{user?.name || user?.username || 'Store owner'}</p><p className="text-xs text-emerald-100/55">{user?.role || 'Owner'}</p></div><button onClick={handleLogout} aria-label="Sign out" title="Sign out" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-emerald-100/65 hover:bg-white/10 hover:text-white"><LogOut className="h-[18px] w-[18px]" /></button></div>
        </div>
      </aside>
      <div className={`owner-content flex min-h-screen flex-1 flex-col ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[var(--line)] bg-white/95 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-4"><button aria-label="Open navigation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button><div><p className="hidden text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted)] sm:block">Store workspace</p><h1 className="text-lg font-extrabold text-[var(--ink)] sm:text-xl">{currentPage?.name || 'Overview'}</h1></div></div>
          <div className="flex items-center gap-2 sm:gap-4"><div className="hidden h-10 w-64 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 md:flex"><Search className="h-4 w-4 text-[var(--muted)]" /><input aria-label="Global search" placeholder="Search workspace" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /></div><div className="relative"><button aria-label="Notifications" onClick={() => setNotificationsOpen((open) => !open)} className="relative rounded-xl p-2.5 text-[var(--muted)] hover:bg-[var(--brand-100)] hover:text-[var(--brand-700)]"><Bell className="h-5 w-5" />{lowStock.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">{lowStock.length}</span>}</button>{notificationsOpen && <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-xl"><div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3"><h2 className="font-extrabold text-[var(--ink)]">Notifications</h2>{lowStock.length > 0 && <span className="text-xs font-bold text-amber-700">{lowStock.length} low stock</span>}</div>{notificationsLoading ? <p className="px-4 py-6 text-sm text-[var(--muted)]">Loading notifications...</p> : notificationsError ? <p className="px-4 py-6 text-sm text-[var(--muted)]">Unable to load notifications.</p> : lowStock.length === 0 ? <div className="px-4 py-6"><p className="text-sm font-bold text-[var(--ink)]">No notifications</p><p className="mt-1 text-xs text-[var(--muted)]">Everything is sufficiently stocked.</p></div> : <div className="max-h-80 overflow-y-auto">{lowStock.map((item) => <div key={item.product_id} className="border-b border-slate-100 px-4 py-3 last:border-0"><p className="text-sm font-bold text-[var(--ink)]">{item.current_stock <= 0 ? 'Out of stock' : 'Low stock'} · {item.name}</p><p className="mt-1 text-xs text-[var(--muted)]">Only {formatStockWithUnit(item.current_stock, item.unit)} remaining</p><p className="mt-1 text-xs text-[var(--muted)]">Low-stock threshold: {formatStockWithUnit(item.minimum_stock, item.unit)}</p></div>)}</div>}<button type="button" onClick={() => { setNotificationsOpen(false); navigate('/owner/inventory'); }} className="w-full border-t border-[var(--line)] px-4 py-3 text-left text-sm font-bold text-emerald-700 hover:bg-emerald-50">View Inventory</button></div>}</div><button aria-label="Settings" className="hidden rounded-xl p-2.5 text-[var(--muted)] hover:bg-[var(--brand-100)] hover:text-[var(--brand-700)] sm:block"><Settings className="h-5 w-5" /></button><button aria-label="Toggle sidebar" onClick={() => setCollapsed((value) => !value)} className="hidden rounded-xl p-2.5 text-[var(--muted)] hover:bg-[var(--brand-100)] lg:block">{collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}</button></div>
        </header>
        <main className="flex-1 p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
