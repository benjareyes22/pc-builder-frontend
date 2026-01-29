import React, { createContext, useState, useContext, useEffect } from 'react';

// 1. Exportamos el Contexto (Vital para los tests)
export const CartContext = createContext();

// 2. Hook para usar el carrito
export const useCart = () => useContext(CartContext);

// 3. Provider
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const savedCart = localStorage.getItem('pc_builder_cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pc_builder_cart', JSON.stringify(cart));
    const newTotal = cart.reduce((acc, item) => acc + (parseInt(item.precio) * item.quantity), 0);
    setTotal(newTotal);
  }, [cart]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setShowCart(true);
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      total,
      showCart,
      setShowCart
    }}>
      {children}
    </CartContext.Provider>
  );
};