import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CustomerCartProvider } from './features/customer/context/CustomerCartContext';
import { LoginPage } from './features/auth/LoginPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { OwnerLayout } from './features/owner/components/OwnerLayout';
import { Dashboard } from './features/owner/pages/Dashboard';
import { Billing } from './features/owner/pages/Billing';
import { Sales } from './features/owner/pages/Sales';
import { Inventory } from './features/owner/pages/Inventory';
import { Purchases } from './features/owner/pages/Purchases';
import { Suppliers } from './features/owner/pages/Suppliers';
import { Customers } from './features/owner/pages/Customers';
import { Reports } from './features/owner/pages/Reports';
import { PaymentHistory } from './features/owner/pages/PaymentHistory';

// Customer Components
import { CustomerLayout } from './features/customer/components/CustomerLayout';
import { Home } from './features/customer/pages/Home';
import { Categories } from './features/customer/pages/Categories';
import { Products } from './features/customer/pages/Products';
import { ProductDetails } from './features/customer/pages/ProductDetails';
import { Cart } from './features/customer/pages/Cart';

export function App() {
  return (
    <AuthProvider>
      <CustomerCartProvider>
        <BrowserRouter>
          <Routes>
            {/* Customer Store Routes */}
            <Route path="/store" element={<CustomerLayout />}>
              <Route index element={<Home />} />
              <Route path="categories" element={<Categories />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:id" element={<ProductDetails />} />
              <Route path="cart" element={<Cart />} />
            </Route>

            {/* Auth Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Owner Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/owner" element={<OwnerLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="billing" element={<Billing />} />
                <Route path="sales" element={<Sales />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="purchases" element={<Purchases />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="customers" element={<Customers />} />
                <Route path="reports" element={<Reports />} />
                <Route path="payment-history" element={<PaymentHistory />} />
              </Route>
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/store" replace />} />
            <Route path="*" element={<Navigate to="/store" replace />} />
          </Routes>
        </BrowserRouter>
      </CustomerCartProvider>
    </AuthProvider>
  );
}

export default App;
