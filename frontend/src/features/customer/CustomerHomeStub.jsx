import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Loader } from '../../components/ui/Loader';
import { ErrorMessage } from '../../components/ui/ErrorMessage';

export function CustomerHomeStub() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Test API connection via /api/health
    const checkApi = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        // Note: health endpoint is at root /api/health or just check a public endpoint
        const res = await fetch(`${apiUrl.replace('/api', '')}/api/health`);
        const data = await res.json();
        setHealth(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    checkApi();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Kirana Store - Customer Portal</h1>
          <p className="text-gray-600 mt-2">Modern Grocery Shopping Interface (Stub)</p>
        </div>

        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Backend Connection Status</h2>
          {loading && <Loader text="Checking backend health..." />}
          {error && <ErrorMessage message={`Failed to connect to backend: ${error}`} />}
          {health && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-green-800 font-medium">Status: {health.message}</p>
              <p className="text-green-600 text-sm mt-1">Database: {health.database}</p>
              <p className="text-green-600 text-sm">Server Time: {health.time}</p>
            </div>
          )}
        </Card>

        <div className="text-center">
          <a href="/login" className="text-indigo-600 hover:underline font-medium">Go to Owner Login</a>
        </div>
      </div>
    </div>
  );
}
