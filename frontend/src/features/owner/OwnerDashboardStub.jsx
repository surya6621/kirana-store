import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

export function OwnerDashboardStub() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard (Foundation)</h1>
            <p className="text-gray-600">Welcome back, {user?.username || 'Owner'}</p>
          </div>
          <Button variant="danger" onClick={logout}>Logout</Button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Phase 1 Foundation Complete</h2>
          <p className="text-gray-600">
            The frontend foundation, routing, API service, and authentication are successfully established. 
            Subsequent phases will populate full pages for Billing, Inventory, Sales, etc.
          </p>
        </div>
      </div>
    </div>
  );
}
