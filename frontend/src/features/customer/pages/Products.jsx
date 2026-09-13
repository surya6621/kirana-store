import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { Loader } from '../../../components/ui/Loader';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { Button } from '../../../components/ui/Button';
import { Search, Filter, X } from 'lucide-react';

export function Products() {
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [search, setSearch] = useState(queryParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(queryParams.get('category') || '');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prodRes, catRes] = await Promise.all([
          api.get('/inventory'),
          api.get('/categories')
        ]);
        if (prodRes.success) setAllProducts(prodRes.data || []);
        if (catRes.success) setCategories(catRes.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Synchronize internal state with URL params
  useEffect(() => {
    setSearch(queryParams.get('search') || '');
    setSelectedCategory(queryParams.get('category') || '');
  }, [location.search]);

  // Client-side filtering logic
  useEffect(() => {
    const term = search.toLowerCase().trim();
    
    const results = allProducts.filter(p => {
      // Search by name, category, or unit
      const matchesSearch = !term || 
                           p.name?.toLowerCase().includes(term) || 
                           (p.category_name && p.category_name.toLowerCase().includes(term)) ||
                           (p.unit && p.unit.toLowerCase().includes(term));
      
      // Filter by category ID
      const matchesCategory = !selectedCategory || String(p.category_id) === String(selectedCategory);
      
      return matchesSearch && matchesCategory;
    });
    
    setFilteredProducts(results);
  }, [search, selectedCategory, allProducts]);

  if (loading) return <Loader text="Finding products for you..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Product Catalog</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Showing {filteredProducts.length} items
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search rice, dal, snacks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
            />
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          </div>

          <div className="relative flex-1 sm:w-56">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm appearance-none cursor-pointer transition-all"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <Filter className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {(search || selectedCategory) && (
        <div className="flex flex-wrap gap-2 mb-8">
          {search && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
              Search: {search}
              <button onClick={() => setSearch('')} className="ml-2 hover:text-indigo-900 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
              Category: {categories.find(c => String(c.id) === String(selectedCategory))?.name}
              <button onClick={() => setSelectedCategory('')} className="ml-2 hover:text-emerald-900 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {(search || selectedCategory) && (
            <button 
              onClick={() => { setSearch(''); setSelectedCategory(''); }}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors px-2"
            >
              Clear All
            </button>
          )}
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      {filteredProducts.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No products found</h3>
          <p className="text-gray-500 max-w-xs mx-auto mt-2">Try adjusting your search or filters to find what you're looking for.</p>
          <Button 
            variant="outline" 
            className="mt-6 rounded-xl font-bold"
            onClick={() => { setSearch(''); setSelectedCategory(''); }}
          >
            Show All Products
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredProducts.map(prod => (
            <ProductCard key={prod.product_id} product={prod} />
          ))}
        </div>
      )}
    </div>
  );
}
