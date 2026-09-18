import { Link } from 'react-router-dom';
import { useCustomerCart } from '../context/CustomerCartContext';
import { ShoppingBag, Plus, Check } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;
const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

function resolveImageUrl(imageUrl) {
  if (!imageUrl) return '';
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${SERVER_URL}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

export function ProductCard({ product }) {
  const { cart, addToCart } = useCustomerCart();
  const prodId = product.product_id || product.id;
  const inCartItem = cart.find(item => item.product_id === prodId);

  const stock = Number(product.current_stock !== undefined ? product.current_stock : product.stock);
  const isOut = stock <= 0;
  const isLow = stock > 0 && stock <= (product.minimum_stock || 5);
  const price = product.selling_price || product.price;

  const resolvedImage = resolveImageUrl(product.image_url);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
      <Link to={`/store/products/${prodId}`} className="block relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
        {resolvedImage ? (
          <img
            src={resolvedImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 p-4">
            <ShoppingBag className="w-12 h-12 text-gray-300 mb-2" />
            <span className="text-xs text-gray-400 font-medium">Grocery Item</span>
          </div>
        )}

        <div className="absolute top-2 left-2">
          {isOut ? (
            <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-sm">
              OUT OF STOCK
            </span>
          ) : isLow ? (
            <span className="px-2.5 py-1 bg-amber-500 text-white text-xs font-bold rounded-full shadow-sm">
              LOW STOCK
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-sm">
              IN STOCK
            </span>
          )}
        </div>
      </Link>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-xs font-medium text-indigo-600 block mb-1 uppercase tracking-wider">
            {product.category_name || 'Grocery'}
          </span>
          <Link to={`/store/products/${prodId}`} className="text-sm font-bold text-gray-900 line-clamp-2 hover:text-indigo-600 transition-colors">
            {product.name}
          </Link>
          <span className="text-xs text-gray-500 mt-1 block">
            {product.unit ? `Unit: ${product.unit}` : 'Standard Pack'}
          </span>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 block font-normal">Price</span>
            <span className="text-lg font-extrabold text-gray-900">₹{price}</span>
          </div>

          <button
            onClick={() => addToCart(product, 1)}
            disabled={isOut}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm ${
              isOut
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : inCartItem
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {inCartItem ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added ({inCartItem.quantity})</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
