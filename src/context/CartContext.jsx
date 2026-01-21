import React, { createContext, useState, useContext, useEffect } from 'react';

// 1. Creamos el contexto
const CartContext = createContext();

// 2. Hook personalizado para usar el carrito fácil
export const useCart = () => useContext(CartContext);

// 3. El Proveedor que envuelve a toda la app
export const CartProvider = ({ children }) => {
  // Estado del carrito (array de productos)
  const [cart, setCart] = useState([]);
  // Estado para mostrar/ocultar el carrito lateral
  const [showCart, setShowCart] = useState(false);
  // Total en dinero
  const [total, setTotal] = useState(0);

  // Cargar carrito del LocalStorage al iniciar (para no perderlo si recargas)
  useEffect(() => {
    const savedCart = localStorage.getItem('pc_builder_cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Guardar en LocalStorage y calcular total cada vez que el carrito cambie
  useEffect(() => {
    localStorage.setItem('pc_builder_cart', JSON.stringify(cart));
    
    // Calcular el precio total
    const newTotal = cart.reduce((acc, item) => acc + (parseInt(item.precio) * item.quantity), 0);
    setTotal(newTotal);
  }, [cart]);

  // Función: Agregar al carrito
  const addToCart = (product) => {
    setCart(prev => {
      // ¿El producto ya está en el carrito?
      const existing = prev.find(item => item.id === product.id);
      
      if (existing) {
        // Si ya existe, solo aumentamos la cantidad
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      // Si no existe, lo agregamos con cantidad 1
      return [...prev, { ...product, quantity: 1 }];
    });
    // Abrimos el carrito automáticamente para mostrar que se agregó
    setShowCart(true);
  };

  // Función: Eliminar del carrito
  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Función: Vaciar carrito
  const clearCart = () => {
    setCart([]);
  };

  // Exportamos todo para que el resto de la app lo pueda usar
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