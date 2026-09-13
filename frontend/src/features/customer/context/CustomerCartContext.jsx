import { createContext, useContext, useState, useEffect } from 'react';

const CustomerCartContext = createContext(null);

export function CustomerCartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('customer_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load cart from localStorage", e);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('customer_cart', JSON.stringify(cart));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  }, [cart]);

  const addToCart = (product, quantity = 1) => {
    const prodId = product.product_id || product.id;
    const price = Number(product.selling_price || product.price);
    const stock = Number(product.current_stock !== undefined ? product.current_stock : product.stock);
    const name = product.name;
    const unit = product.unit || 'pcs';
    const image_url = product.image_url || null;

    setCart(prev => {
      const existing = prev.find(item => item.product_id === prodId);
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > stock) {
          alert(`Cannot add more than available stock (${stock})`);
          return prev;
        }
        return prev.map(item =>
          item.product_id === prodId
            ? { ...item, quantity: newQty, total: newQty * price }
            : item
        );
      } else {
        if (quantity > stock) {
          alert(`Product is out of stock or insufficient stock (${stock})`);
          return prev;
        }
        return [...prev, {
          product_id: prodId,
          name,
          price,
          quantity,
          total: quantity * price,
          stock,
          unit,
          image_url
        }];
      }
    });
  };

  const updateQuantity = (product_id, quantity) => {
    const q = parseInt(quantity) || 0;
    const item = cart.find(i => i.product_id === product_id);
    if (item && q > item.stock) {
      alert(`Cannot exceed available stock (${item.stock})`);
      return;
    }
    if (q <= 0) {
      removeFromCart(product_id);
      return;
    }
    setCart(prev => prev.map(i =>
      i.product_id === product_id
        ? { ...i, quantity: q, total: q * i.price }
        : i
    ));
  };

  const removeFromCart = (product_id) => {
    setCart(prev => prev.filter(item => item.product_id !== product_id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);

  return (
    <CustomerCartContext.Provider value={{
      cart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      totalItemsCount,
      subtotal
    }}>
      {children}
    </CustomerCartContext.Provider>
  );
}

export function useCustomerCart() {
  return useContext(CustomerCartContext);
}
