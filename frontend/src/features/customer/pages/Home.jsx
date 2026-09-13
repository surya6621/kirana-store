import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { CategoryCard } from '../components/CategoryCard';
import { Loader } from '../../../components/ui/Loader';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { ChevronRight, ArrowRight, Zap, ShieldCheck, Clock, Award } from 'lucide-react';

export function Home() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [catRes, prodRes] = await Promise.all([
          api.get('/categories'),
          api.get('/inventory')
        ]);
        
        if (catRes.success) setCategories(catRes.data.slice(0, 6));
        if (prodRes.success) setProducts(prodRes.data.slice(0, 8));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Loader text="Setting up the shop for you..." />;

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative bg-indigo-900 rounded-3xl mx-4 sm:mx-6 lg:mx-8 mt-6 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-16 sm:py-24 lg:py-32 flex flex-col items-center text-center">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Fresh Groceries <br />
            <span className="text-indigo-400">Delivered From Your Local Store</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-indigo-100 max-w-2xl">
            Order fresh vegetables, grains, and daily essentials from your favorite neighborhood kirana store. Quality products at fair prices.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link to="/store/products" className="px-8 py-4 bg-white text-indigo-900 font-bold rounded-2xl hover:bg-indigo-50 transition-all shadow-lg flex items-center justify-center">
              Shop Now <ChevronRight className="ml-2 w-5 h-5" />
            </Link>
            <Link to="/store/categories" className="px-8 py-4 bg-indigo-700 text-white font-bold rounded-2xl hover:bg-indigo-600 transition-all border border-indigo-500/30 flex items-center justify-center">
              Browse Categories
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Shop by Category</h2>
            <p className="text-sm text-gray-500 mt-1 font-medium">Quickly find what you need</p>
          </div>
          <Link to="/store/categories" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center">
            View All <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map(cat => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Fresh & Popular</h2>
            <p className="text-sm text-gray-500 mt-1 font-medium">Bestsellers this week</p>
          </div>
          <Link to="/store/products" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center">
            View All <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(prod => (
            <ProductCard key={prod.product_id} product={prod} />
          ))}
        </div>
      </section>

      {/* Why Shop With Us */}
      <section className="bg-white py-16 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900">Why Shop With Us?</h2>
            <p className="text-gray-500 mt-2 font-medium">Your satisfaction is our priority</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center p-6 rounded-3xl hover:bg-gray-50 transition-colors">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Fast Service</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Quickest local store service in the neighborhood.</p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-3xl hover:bg-gray-50 transition-colors">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">100% Genuine</h3>
              <p className="text-sm text-gray-500 leading-relaxed">We source products directly from trusted distributors.</p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-3xl hover:bg-gray-50 transition-colors">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-4 shadow-sm">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Fair Prices</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Best market rates for all daily grocery essentials.</p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-3xl hover:bg-gray-50 transition-colors">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-4 shadow-sm">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Always Fresh</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Daily arrivals of fresh vegetables and perishables.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
