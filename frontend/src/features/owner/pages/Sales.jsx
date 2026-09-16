import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { Receipt } from '../components/Receipt';
import { Printer } from 'lucide-react';

export function Sales() {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales');
      if (res.success) {
        setSales(res.data || []);
      } else {
        setError(res.message || 'Failed to load sales');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(s => 
    String(s.id).toLowerCase().includes(search.toLowerCase()) ||
    s.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.payment_status?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader text="Loading sales history..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
        <Button onClick={fetchSales} variant="outline" className="text-sm">
          Refresh
        </Button>
      </div>

      <Card>
        <div className="mb-6 flex items-center justify-between">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search by ID, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-0"
            />
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="pb-3">Bill Number</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Amount</th>
                <th className="pb-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-gray-500">No sales found.</td>
                </tr>
              ) : (
                filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="py-4 font-semibold text-gray-900">BILL #{sale.id}</td>
                    <td className="py-4 text-gray-600">{new Date(sale.created_at).toLocaleString()}</td>
                    <td className="py-4 text-gray-900">{sale.customer_name || 'Walk-in'}</td>
                    <td className="py-4">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs uppercase font-medium">
                        {sale.sale_type}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        sale.payment_status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.payment_status}
                      </span>
                    </td>
                    <td className="py-4 text-right font-bold text-gray-900">₹{sale.total_amount}</td>
                    <td className="py-4 text-center">
                      <button
                        onClick={() => setSelectedSale({
                          ...sale,
                          bill_number: `BILL #${sale.id}`
                        })}
                        className="p-1 text-indigo-600 hover:text-indigo-800 rounded hover:bg-indigo-50 transition-colors"
                        title="View Receipt"
                      >
                        <Printer className="w-5 h-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedSale && (
        <Receipt sale={selectedSale} onClose={() => setSelectedSale(null)} />
      )}
    </div>
  );
}
