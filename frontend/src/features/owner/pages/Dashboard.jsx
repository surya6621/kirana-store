import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Loader } from '../../../components/ui/Loader';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { Button } from '../../../components/ui/Button';
import { 
  IndianRupee, 
  ShoppingBag, 
  Users, 
  Package, 
  Truck, 
  AlertTriangle, 
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard');
      if (res.success) {
        setDashboardData(res.data);
      } else {
        setError(res.message || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader text="Loading business dashboard..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!dashboardData) return <ErrorMessage message="No dashboard data found." />;

  // Mapped from backend field names
  const { 
    today_sales, 
    today_sales_count, 
    total_products, 
    customer_due, 
    supplier_due, 
    low_stock, 
    recent_sales 
  } = dashboardData;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Business Dashboard</h1>
        <Button onClick={fetchDashboardData} variant="outline" className="text-sm">
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="flex items-center p-4">
          <div className="p-3 bg-green-100 rounded-lg text-green-600 mr-4">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Today's Sales</p>
            <h3 className="text-xl font-bold text-gray-900">₹{today_sales || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center p-4">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600 mr-4">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Sales Count</p>
            <h3 className="text-xl font-bold text-gray-900">{today_sales_count || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center p-4">
          <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600 mr-4">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Products</p>
            <h3 className="text-xl font-bold text-gray-900">{total_products || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center p-4">
          <div className="p-3 bg-orange-100 rounded-lg text-orange-600 mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Customer Due</p>
            <h3 className="text-xl font-bold text-gray-900">₹{customer_due || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center p-4">
          <div className="p-3 bg-red-100 rounded-lg text-red-600 mr-4">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Supplier Due</p>
            <h3 className="text-xl font-bold text-gray-900">₹{supplier_due || 0}</h3>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Button onClick={() => navigate('/owner/billing')} className="flex items-center justify-center space-x-2">
            <span>New Sale (POS)</span>
          </Button>
          <Button onClick={() => navigate('/owner/inventory')} variant="secondary" className="flex items-center justify-center space-x-2">
            <span>Manage Inventory</span>
          </Button>
          <Button onClick={() => navigate('/owner/purchases')} variant="secondary" className="flex items-center justify-center space-x-2">
            <span>Add Purchase</span>
          </Button>
          <Button onClick={() => navigate('/owner/customers')} variant="secondary" className="flex items-center justify-center space-x-2">
            <span>Add Customer</span>
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Products */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              Low Stock Alert
            </h2>
            <Button onClick={() => navigate('/owner/inventory')} variant="outline" className="text-xs">
              View All
            </Button>
          </div>
          {low_stock && low_stock.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="pb-2">Product</th>
                    <th className="pb-2">Stock</th>
                    <th className="pb-2">Min Stock</th>
                    <th className="pb-2">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {low_stock.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="py-3 text-red-600 font-bold">{item.current_stock}</td>
                      <td className="py-3 text-gray-500">{item.minimum_stock}</td>
                      <td className="py-3 text-gray-400">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4 text-center">All products are sufficiently stocked.</p>
          )}
        </Card>

        {/* Recent Sales */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 text-indigo-500 mr-2" />
              Recent Sales
            </h2>
            <Button onClick={() => navigate('/owner/sales')} variant="outline" className="text-xs">
              View All
            </Button>
          </div>
          {recent_sales && recent_sales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="pb-2">Bill #</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recent_sales.map((sale, idx) => (
                    <tr key={idx}>
                      <td className="py-3 font-semibold text-gray-900">BILL #{sale.id}</td>
                      <td className="py-3 text-gray-600">{sale.customer_name || 'Walk-in Customer'}</td>
                      <td className="py-3 font-bold text-gray-900">₹{sale.total_amount}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                          sale.payment_status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {sale.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4 text-center">No recent sales recorded.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
