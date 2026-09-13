import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { 
  LayoutDashboard, 
  Receipt, 
  ShoppingBag, 
  Package, 
  ShoppingCart, 
  Truck, 
  Users, 
  CreditCard,
  BarChart3, 
  LogOut, 
  Menu, 
  X,
  Store
} from 'lucide-react';

export function OwnerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 bg-slate-950">
          <div className="flex items-center space-x-3">
            <Store className="w-8 h-8 text-indigo-400" />
            <span className="text-xl font-bold tracking-wider">Kirana POS</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-sm font-medium text-white truncate">{user?.username || 'Owner'}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role || 'Admin'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 lg:px-8 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-4 ml-auto">
            <div className="text-right">
              <span className="block text-sm font-medium text-gray-900">{user?.username || 'Owner'}</span>
              <span className="block text-xs text-gray-500">Active Session</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
