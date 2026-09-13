import { useState } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useCustomerCart } from '../context/CustomerCartContext';
import { Store, Search, ShoppingBag, Menu, X, User, ShieldCheck } from 'lucide-react';

export function CustomerLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { totalItemsCount } = useCustomerCart();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/store/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Top Announcement Bar */}
      <div className="bg-indigo-600 text-white text-xs py-2 px-4 text-center font-medium">
        🛒 Welcome to Kirana Store! Fresh groceries delivered straight from your local neighborhood shop.
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/store" className="flex items-center space-x-2 flex-shrink-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-gray-900 block leading-none">Kirana Store</span>
              <span className="text-xs text-indigo-600 font-medium">Local Grocery</span>
            </div>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:flex items-center relative">
            <input
              type="text"
              placeholder="Search for rice, oil, dal, snacks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-12 py-2.5 bg-gray-100 border border-transparent rounded-full text-sm focus:outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
            />
            <button type="submit" className="absolute right-3 p-1.5 text-gray-500 hover:text-indigo-600">
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center space-x-8">
            <NavLink to="/store" end className={({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-950'}`}>
              Home
            </NavLink>
            <NavLink to="/store/categories" className={({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-950'}`}>
              Categories
            </NavLink>
            <NavLink to="/store/products" className={({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-950'}`}>
              All Products
            </NavLink>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            <Link to="/store/cart" className="relative p-2.5 bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 rounded-full transition-colors flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow">
                  {totalItemsCount}
                </span>
              )}
            </Link>

            <Link to="/login" className="hidden sm:flex items-center space-x-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Owner Login">
              <User className="w-4 h-4" />
              <span>Owner Portal</span>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-4 pb-3">
          <form onSubmit={handleSearch} className="flex items-center relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-gray-100 border border-transparent rounded-full text-sm focus:outline-none focus:bg-white focus:border-indigo-500"
            />
            <button type="submit" className="absolute right-3 p-1 text-gray-500">
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200 px-4 pt-2 pb-4 space-y-2">
            <Link
              to="/store"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              Home
            </Link>
            <Link
              to="/store/categories"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              Categories
            </Link>
            <Link
              to="/store/products"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              All Products
            </Link>
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-indigo-600 hover:bg-indigo-50"
            >
              Owner Portal Login
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 mt-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-white">
              <Store className="w-6 h-6 text-indigo-400" />
              <span className="text-lg font-bold">Kirana Store</span>
            </div>
            <p className="text-sm text-slate-400">
              Your trusted local neighborhood kirana store for fresh groceries, daily essentials, and fair prices.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/store" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/store/categories" className="hover:text-white transition-colors">Categories</Link></li>
              <li><Link to="/store/products" className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link to="/store/cart" className="hover:text-white transition-colors">Shopping Cart</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Store Info</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Local Neighborhood Store</li>
              <li>Open Daily: 8:00 AM - 9:00 PM</li>
              <li>Fresh Stock Guaranteed</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Trust & Quality</h4>
            <div className="flex items-center space-x-2 text-sm text-slate-400 mb-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>100% Genuine Products</span>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              © {new Date().getFullYear()} Kirana Store. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
