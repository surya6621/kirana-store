import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../services/api';
import { useCustomerCart } from '../context/CustomerCartContext';
import { Loader } from '../../../components/ui/Loader';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { ShoppingBag, ArrowLeft, ShieldCheck, Truck, RefreshCw, Check, Plus, Minus } from 'lucide-react';

export function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qty, setQty] = useState(1);
  const { addToCart, cart } = useCustomerCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/products/${id}`);
        if (res.success) {
          setProduct(res.data);
        } else {
          setError(res.message);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <Loader text="Loading product details..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!product) return <ErrorMessage message="Product not found" />;

  const inCartItem = cart.find(item => String(item.product_id) === String(id));
  const stock = Number(product.stock !== undefined ? product.stock : 0);
  const isOut = stock <= 0;

  const handleAddToCart = () => {
    if (qty > stock) {
      alert(`Only ${stock} items available in stock`);
      return;
    }
    addToCart(product, qty);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/store/products" className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-indigo-600 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Catalog
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
        {/* Left: Image */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 flex items-center justify-center shadow-sm overflow-hidden aspect-square md:aspect-auto md:h-[500px]">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-300">
              <ShoppingBag className="w-32 h-32 mb-4" />
              <span className="font-bold">No Image Available</span>
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="flex flex-col">
          <div className="mb-6">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100 uppercase tracking-widest">
              {product.category_name}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mt-4 leading-tight">
              {product.name}
            </h1>
            <div className="flex items-center mt-4 space-x-4">
              <span className="text-3xl font-black text-indigo-600">₹{product.selling_price}</span>
              <span className="text-gray-500 text-sm font-medium">/ {product.unit}</span>
            </div>
          </div>

          <div className="prose prose-sm text-gray-600 mb-8">
            <p className="leading-relaxed">
              {product.description || "High quality product sourced from trusted local suppliers. Guaranteed freshness and best value for your daily essentials."}
            </p>
          </div>

          <div className="space-y-6 pt-6 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-gray-900 w-24">Availability:</span>
              {isOut ? (
                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">Out of Stock</span>
              ) : (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">In Stock ({stock} {product.unit} available)</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex items-center bg-gray-100 rounded-2xl p-1 w-full sm:w-auto">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 bg-transparent text-center font-bold text-gray-900 focus:outline-none"
                />
                <button
                  onClick={() => setQty(qty + 1)}
                  className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isOut}
                className={`flex-1 sm:flex-none px-10 py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-indigo-200 ${
                  isOut
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                <span>{inCartItem ? `Update Cart (${inCartItem.quantity + qty})` : 'Add to Cart'}</span>
              </button>
            </div>
            
            {inCartItem && (
              <p className="text-xs text-emerald-600 font-bold flex items-center">
                <Check className="w-3 h-3 mr-1" /> Currently in your cart: {inCartItem.quantity} {product.unit}
              </p>
            )}
          </div>

          {/* Product Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <ShieldCheck className="w-6 h-6 text-indigo-600" />
              <span className="text-xs font-bold text-gray-700">Quality Assured</span>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <RefreshCw className="w-6 h-6 text-indigo-600" />
              <span className="text-xs font-bold text-gray-700">Easy Returns</span>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <Truck className="w-6 h-6 text-indigo-600" />
              <span className="text-xs font-bold text-gray-700">Local Pickup</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
