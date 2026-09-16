import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { Receipt } from '../components/Receipt';
import { ArrowDownLeft, ArrowUpRight, Printer } from 'lucide-react';

export function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [partyFilter, setPartyFilter] = useState('all');
  const [period, setPeriod] = useState('all');
  const [summary, setSummary] = useState({
    sent_today: 0,
    sent_this_month: 0,
    sent_this_year: 0,
    received_today: 0,
    received_this_month: 0,
    received_this_year: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Receipt modal state
  const [selectedSale, setSelectedSale] = useState(null);
  const [fetchingSale, setFetchingSale] = useState(false);

  const fetchPayments = async (selectedPeriod = period) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/dashboard/payment-history?period=${selectedPeriod}`);
      if (res.success) {
        setPayments(res.data?.payments || []);
        setSummary(res.data?.summary || {});
      } else {
        setError(res.message || 'Failed to load payment history');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(period);
  }, [period]);

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
    const matchesParty = partyFilter === 'all' || p.party_type === partyFilter;
    return matchesParty && (
      p.party_name?.toLowerCase().includes(searchTerm) ||
      p.phone?.toLowerCase().includes(searchTerm) ||
      p.reference_number?.toLowerCase().includes(searchTerm) ||
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

  const formatAmount = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const summaryGroups = [
    {
      title: 'Supplier Money Sent',
      icon: ArrowUpRight,
      color: 'text-rose-700 bg-rose-50',
      values: [
        ['Sent Today', summary.sent_today],
        ['Sent This Month', summary.sent_this_month],
        ['Sent This Year', summary.sent_this_year],
      ],
    },
    {
      title: 'Customer Money Received',
      icon: ArrowDownLeft,
      color: 'text-emerald-700 bg-emerald-50',
      values: [
        ['Received Today', summary.received_today],
        ['Received This Month', summary.received_this_month],
        ['Received This Year', summary.received_this_year],
      ],
    },
  ];

  if (loading) return <Loader text="Loading payment history..." />;

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
          <p className="text-sm text-gray-600 mt-1">
            {payments.length} record{payments.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button onClick={() => fetchPayments()} variant="outline" className="text-sm">
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {summaryGroups.map(({ title, icon: Icon, color, values }) => (
          <Card key={title} className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className={`p-2 rounded-lg ${color}`}><Icon className="w-5 h-5" /></span>
              <h2 className="font-bold text-gray-900">{title}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {values.map(([label, value]) => (
                <div key={label} className="border-l-2 border-gray-100 pl-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{formatAmount(value)}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">All Payment Records</h2>
          <div className="flex flex-col sm:flex-row gap-3 lg:w-auto">
            <div className="flex flex-wrap rounded-lg border border-gray-200 p-1 bg-gray-50">
              {[['all', 'All'], ['CUSTOMER', 'Customer Payments'], ['SUPPLIER', 'Supplier Payments']].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPartyFilter(value)}
                  className={`px-3 py-2 text-xs font-semibold rounded-md whitespace-nowrap ${partyFilter === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap rounded-lg border border-gray-200 p-1 bg-gray-50">
              {[['all', 'All'], ['today', 'Today'], ['month', 'This Month'], ['year', 'This Year']].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={`px-3 py-2 text-xs font-semibold rounded-md whitespace-nowrap ${period === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="w-full sm:w-72">
            <Input
              placeholder="Search party, phone, bill, purchase..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-0"
            />
            </div>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="pb-3 px-4">Party Name</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Phone</th>
                <th className="pb-3">Bill / Purchase</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Direction</th>
                <th className="pb-3">Payment Method</th>
                <th className="pb-3">Date & Time</th>
                <th className="pb-3">Description</th>
                <th className="pb-3 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-6 text-gray-500">
                    {search ? 'No matching payment records found.' : 'No payment history yet.'}
                  </td>
                </tr>
              ) : (
                filteredPayments.map(payment => (
                  <tr key={payment.payment_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 font-semibold text-gray-900">
                      {payment.customer_code ? `${payment.customer_code} · ${payment.party_name}` : payment.party_name}
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${payment.party_type === 'SUPPLIER' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {payment.party_type}
                      </span>
                    </td>
                    <td className="py-4 text-gray-600">{payment.phone || '-'}</td>
                    <td className="py-4">
                      {payment.reference_number ? (
                        <button
                          onClick={() => handleViewBill(payment.reference_id)}
                          disabled={payment.party_type !== 'CUSTOMER'}
                          className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline transition-colors disabled:text-gray-600 disabled:no-underline disabled:cursor-default"
                        >
                          {payment.reference_number}
                        </button>
                      ) : (
                        <span className="text-gray-400 italic">General Payment</span>
                      )}
                    </td>
                    <td className="py-4 font-bold text-gray-900">
                      {formatAmount(payment.amount)}
                    </td>
                    <td className={`py-4 font-semibold ${payment.direction === 'MONEY OUT' ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {payment.direction}
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
                      {payment.party_type === 'CUSTOMER' && payment.reference_id && (
                        <button
                          onClick={() => handleViewBill(payment.reference_id)}
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
