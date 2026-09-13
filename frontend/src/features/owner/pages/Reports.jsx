import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Loader } from '../../../components/ui/Loader';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { BarChart3, TrendingUp, Users, Package, AlertCircle } from 'lucide-react';

export function Reports() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard');
      if (res.success) {
        setDashboardData(res.data);
      } else {
        setError(res.message || 'Failed to load report analytics');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader text="Loading reports data..." />;

  const stats = dashboardData?.stats || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Business Reports & Analytics</h1>
        <Button onClick={fetchReportsData} variant="outline" className="text-sm">
          Refresh
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Sales Summary</h3>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Today's Revenue:</span>
              <span className="font-bold text-gray-900">₹{stats.todaySales || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Transactions:</span>
              <span className="font-bold text-gray-900">{stats.todaySalesCount || 0}</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Udhaar & Dues</h3>
            <Users className="w-5 h-5 text-orange-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Customer Udhaar:</span>
              <span className="font-bold text-orange-600">₹{stats.customerUdhaar || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Supplier Dues:</span>
              <span className="font-bold text-red-600">₹{stats.supplierDue || 0}</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Inventory Status</h3>
            <Package className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Catalog Products:</span>
              <span className="font-bold text-gray-900">{stats.totalProducts || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Low Stock Items:</span>
              <span className="font-bold text-red-600">{dashboardData?.lowStock?.length || 0}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-blue-50 border border-blue-100">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900">Advanced Analytics Notice</h4>
            <p className="text-sm text-blue-700 mt-1">
              Detailed multi-month graphs and advanced tax reporting endpoints are currently not provided by the backend API. 
              The metrics above reflect real-time aggregated data directly from the active backend database.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
