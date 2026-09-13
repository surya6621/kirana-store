import { useCustomerCart } from '../context/CustomerCartContext';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Info, Phone, Store } from 'lucide-react';

export function Cart() {
  const { cart, updateQuantity, removeFromCart, subtotal, totalItemsCount } = useCustomerCart();

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-12 h-12 text-gray-300" />
        </div>
        <h1 className="text-2xl font-black text-gray-900">Your cart is empty</h1>
        <p className="text-gray-500 mt-2 mb-8 max-w-xs mx-auto">Looks like you haven't added anything to your cart yet.</p>
        <Link to="/store/products">
          <Button className="px-8 py-3 rounded-2xl">Start Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-black text-gray-900 mb-10">Your Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <Card key={item.product_id} className="p-4 sm:p-6 !rounded-3xl border-gray-100 shadow-sm">
              <div className="flex items-center space-x-4 sm:space-x-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag className="w-10 h-10 text-gray-200" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1">{item.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Unit: {item.unit} | Price: ₹{item.price}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-indigo-600"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-bold text-gray-900 text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-indigo-600"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="font-black text-gray-900">₹{item.total}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          <div className="pt-4">
            <Link to="/store/products" className="text-indigo-600 font-bold text-sm flex items-center hover:underline">
              <Plus className="w-4 h-4 mr-1" /> Add more items
            </Link>
          </div>
        </div>

        {/* Order Summary & Checkout Info */}
        <div className="space-y-6">
          <Card className="p-6 !rounded-3xl border-gray-100 shadow-md">
            <h2 className="text-lg font-black text-gray-900 mb-6">Order Summary</h2>
            <div className="space-y-4 border-b border-gray-100 pb-6">
              <div className="flex justify-between text-gray-600 text-sm font-medium">
                <span>Items ({totalItemsCount})</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-sm font-medium">
                <span>Delivery Fee</span>
                <span className="text-emerald-600 font-bold uppercase text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Free</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-6 mb-8">
              <span className="text-gray-900 font-black">Grand Total</span>
              <span className="text-2xl font-black text-indigo-600">₹{subtotal}</span>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
              <div className="flex space-x-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-black text-amber-900">Online Ordering Coming Soon</h4>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    We are currently setting up our online payment gateway. Please visit our store or call us to complete your purchase.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button className="w-full py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-100">
                <span>Contact Store to Order</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center justify-center space-x-4 pt-2">
                <div className="flex flex-col items-center">
                   <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mb-1">
                      <Phone className="w-4 h-4" />
                   </div>
                   <span className="text-[10px] font-bold text-gray-500 uppercase">Call</span>
                </div>
                <div className="flex flex-col items-center">
                   <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mb-1">
                      <Store className="w-4 h-4" />
                   </div>
                   <span className="text-[10px] font-bold text-gray-500 uppercase">Visit</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
