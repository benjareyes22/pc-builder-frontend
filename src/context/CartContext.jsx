import React, { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false); // Para abrir/cerrar el carrito

  // Agregar al carrito (si ya existe, suma cantidad)
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setShowCart(true); // Abre el carrito automáticamente al agregar
  };

  // Quitar del carrito
  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Calcular total
  const total = cart.reduce((acc, item) => acc + (item.precio * item.quantity), 0);

  // Vaciar carrito
  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, total, clearCart, showCart, setShowCart }}>
      {children}
    </CartContext.Provider>
  );
};