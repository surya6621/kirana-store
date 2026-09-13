import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { Receipt } from '../components/Receipt';
import { Printer } from 'lucide-react';

export function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Receipt modal state
  const [selectedSale, setSelectedSale] = useState(null);
  const [fetchingSale, setFetchingSale] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customers/credit-history');
      if (res.success) {
        setPayments(res.data || []);
      } else {
        setError(res.message || 'Failed to load payment history');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBill = async (saleId) => {
    if (!saleId) return;
    
    try {
      setFetchingSale(true);
      const res = await api.get(`/sales/${saleId}`);
      if (res.success && res.data) {
        setSelectedSale({
          ...res.data,
          bill_number: `BILL #${res.data.id}`
        });
      } else {
        alert(res.message || 'Failed to fetch bill details');
      }
    } catch (err) {
      alert(err.message || 'An error occurred while fetching bill details');
    } finally {
      setFetchingSale(false);
    }
  };

  const filteredPayments = payments.filter(p => {
    const searchTerm = search.toLowerCase();
    return (
      p.customer_name?.toLowerCase().includes(searchTerm) ||
      p.customer_phone?.toLowerCase().includes(searchTerm) ||
      p.bill_number?.toString().includes(searchTerm) ||
      p.description?.toLowerCase().includes(searchTerm) ||
      p.payment_method?.toLowerCase().includes(searchTerm)
    );
  });

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) return <Loader text="Loading payment history..." />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
          <p className="text-sm text-gray-600 mt-1">
            Total Records: {payments.length}
          </p>
        </div>
        <Button onClick={fetchPayments} variant="outline" className="text-sm">
          Refresh
        </Button>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">All Payment Records</h2>
          <div className="w-72">
            <Input
              placeholder="Search by customer, phone, bill, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-0"
            />
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="pb-3 px-4">Customer Name</th>
                <th className="pb-3">Phone</th>
                <th className="pb-3">Bill Number</th>
                <th className="pb-3">Amount Paid</th>
                <th className="pb-3">Payment Method</th>
                <th className="pb-3">Date & Time</th>
                <th className="pb-3">Description</th>
                <th className="pb-3 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-gray-500">
                    {search ? 'No matching payment records found.' : 'No payment history yet.'}
                  </td>
                </tr>
              ) : (
                filteredPayments.map(payment => (
                  <tr key={payment.payment_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 font-semibold text-gray-900">
                      {payment.customer_name}
                    </td>
                    <td className="py-4 text-gray-600">{payment.customer_phone}</td>
                    <td className="py-4">
                      {payment.bill_number ? (
                        <button
                          onClick={() => handleViewBill(payment.sale_id)}
                          className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline transition-colors"
                          title="View Bill Details"
                        >
                          BILL #{payment.bill_number}
                        </button>
                      ) : (
                        <span className="text-gray-400 italic">General Payment</span>
                      )}
                    </td>
                    <td className="py-4 font-bold text-gray-900">
                      ₹{payment.amount}
                    </td>
                    <td className="py-4">
                      {payment.payment_method ? (
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          payment.payment_method === 'CASH' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {payment.payment_method}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Unknown</span>
                      )}
                    </td>
                    <td className="py-4 text-gray-600">{formatDateTime(payment.created_at)}</td>
                    <td className="py-4 text-gray-600 max-w-xs truncate" title={payment.description}>
                      {payment.description}
                    </td>
                    <td className="py-4 text-center">
                      {payment.sale_id && (
                        <button
                          onClick={() => handleViewBill(payment.sale_id)}
                          className="p-1 text-indigo-600 hover:text-indigo-800 rounded hover:bg-indigo-50 transition-colors"
                          title="View Receipt"
                        >
                          <Printer className="w-5 h-5 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Receipt Modal */}
      {selectedSale && (
        <Receipt 
          sale={selectedSale} 
          onClose={() => setSelectedSale(null)} 
        />
      )}

      {/* Global Loader for Bill Fetching */}
      {fetchingSale && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-25 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
            <span className="text-sm font-medium">Fetching bill details...</span>
          </div>
        </div>
      )}
    </div>
  );
}
