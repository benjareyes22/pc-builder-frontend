import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CartProvider, useCart } from './CartContext';

describe('CartContext (Lógica del Carrito)', () => {
  
  // Limpiamos la memoria antes de cada test para que no se mezclen datos
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('Debe iniciar con el carrito vacío', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    expect(result.current.cart).toEqual([]);
  });

  it('Debe agregar un producto correctamente', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    const producto = { id: 1, nombre: 'GPU', precio: 100 };

    act(() => {
      result.current.addToCart(producto);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].nombre).toBe('GPU');
  });

  it('Debe aumentar la cantidad si agregamos el mismo producto', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    const producto = { id: 1, nombre: 'GPU', precio: 100 };

    // Primer agregado
    act(() => {
      result.current.addToCart(producto);
    });

    // Segundo agregado (en otro act para que React actualice bien)
    act(() => {
      result.current.addToCart(producto);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(2);
  });

  it('Debe eliminar un producto del carrito', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    
    act(() => {
      result.current.addToCart({ id: 1, nombre: 'GPU' });
      result.current.addToCart({ id: 2, nombre: 'CPU' });
    });

    act(() => {
      result.current.removeFromCart(1);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].id).toBe(2);
  });

  it('Debe vaciar el carrito completamente', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    
    act(() => {
      result.current.addToCart({ id: 1, nombre: 'RAM' });
    });

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cart).toEqual([]);
  });

  // --- EL TEST CORREGIDO ---
  it('Debe recuperar datos guardados en localStorage al iniciar', () => {
    // 1. Preparamos datos falsos en la llave CORRECTA ('pc_builder_cart')
    const carritoGuardado = [
      { id: 99, nombre: 'PC Gamer Guardado', precio: 500000, quantity: 1 }
    ];
    localStorage.setItem('pc_builder_cart', JSON.stringify(carritoGuardado));

    // 2. Iniciamos el hook
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    // 3. Verificamos
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].nombre).toBe('PC Gamer Guardado');
  });

  // 4. Test de sumar cantidad (MEJORADO para 100% Branch Coverage)
  it('Debe aumentar la cantidad si agregamos el mismo producto (respetando los otros)', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    const gpu = { id: 1, nombre: 'GPU', precio: 100 };
    const ram = { id: 2, nombre: 'RAM', precio: 50 }; // Producto "relleno"

    // 1. Llenamos el carrito con dos cosas distintas
    act(() => {
      result.current.addToCart(gpu);
      result.current.addToCart(ram);
    });

    // 2. Agregamos de nuevo la GPU
    act(() => {
      result.current.addToCart(gpu);
    });

    // Verificaciones:
    // - La GPU debe subir a 2
    expect(result.current.cart.find(item => item.id === 1).quantity).toBe(2);
    // - La RAM debe seguir ahí intacta (esto cubre la rama ": item")
    expect(result.current.cart.find(item => item.id === 2).quantity).toBe(1);
    // - El total de ítems únicos sigue siendo 2
    expect(result.current.cart).toHaveLength(2);
  });

});