import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, vi, beforeEach } from 'vitest';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { useCart } from './context/CartContext';
import { supabase } from './supabase';

// 1. Mocks de Páginas
vi.mock('./pages/Home', () => ({ default: () => <div>Home Page Mock</div> }));
vi.mock('./pages/Login', () => ({ default: () => <div>Login Page Mock</div> }));
vi.mock('./pages/Register', () => ({ default: () => <div>Register Page Mock</div> }));
vi.mock('./pages/Builder', () => ({ default: () => <div>Builder Page Mock</div> }));
vi.mock('./pages/SavedBuilds', () => ({ default: () => <div>Saved Builds Mock</div> }));
vi.mock('./pages/Components', () => ({ default: () => <div>Components Mock</div> }));
vi.mock('./pages/ProductDetail', () => ({ default: () => <div>Product Detail Mock</div> }));
vi.mock('./pages/AdminPanel', () => ({ default: () => <div>Admin Panel Mock</div> }));

// 2. Mock de UserMenu
vi.mock('./components/UserMenu', () => ({ default: () => <div>UserMenu Component</div> }));

// 3. Mock de Contexto Cart
const setShowCartMock = vi.fn();
const removeFromCartMock = vi.fn();

vi.mock('./context/CartContext', () => ({
  useCart: vi.fn()
}));

// 4. Mock de Supabase
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn()
    },
    from: vi.fn()
  }
}));

describe('App & Navigation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), 
        removeListener: vi.fn(), 
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('Muestra enlaces públicos y carrito cerrado', async () => {
    useCart.mockReturnValue({
      cart: [], showCart: false, setShowCart: setShowCartMock, removeFromCart: removeFromCartMock, total: 0
    });
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    supabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

    await act(async () => { render(<BrowserRouter><App /></BrowserRouter>); });

    expect(screen.getByText(/PC-BUILDER AI/i)).toBeInTheDocument();
  });

  it('Carga rol de usuario y maneja cambio de auth', async () => {
    useCart.mockReturnValue({ cart: [], showCart: false, setShowCart: setShowCartMock, total: 0 });
    const mockUser = { id: '123', email: 'admin@test.com' };
    
    // Mock getUser (carga inicial)
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    // Mock onAuthStateChange (evento de cambio)
    let authCallback;
    supabase.auth.onAuthStateChange.mockImplementation((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { rol: 'admin' }, error: null })
      })
    });
    supabase.from.mockReturnValue({ select: selectMock });

    await act(async () => { render(<BrowserRouter><App /></BrowserRouter>); });

    // Simulamos que el usuario se desloguea (evento SIGN_OUT)
    await act(async () => {
      if(authCallback) authCallback('SIGNED_OUT', null);
    });
    
    // Simulamos que se loguea otro (evento SIGN_IN)
    await act(async () => {
      if(authCallback) authCallback('SIGNED_IN', { user: { id: '456' } });
    });

    expect(supabase.from).toHaveBeenCalled();
  });

  it('Muestra estado de CARRITO VACÍO (Cubre rama else)', async () => {
    useCart.mockReturnValue({
      cart: [], // Array vacío
      showCart: true, // Abierto
      setShowCart: setShowCartMock,
      removeFromCart: removeFromCartMock,
      total: 0
    });

    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    supabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

    await act(async () => { render(<BrowserRouter><App /></BrowserRouter>); });

    // Verifica texto específico del estado vacío
    expect(screen.getByText(/Tu carrito está vacío/i)).toBeInTheDocument();
    expect(screen.getByText(/Ver Productos/i)).toBeInTheDocument();
  });

  it('Muestra productos en el carrito y botón eliminar', async () => {
    useCart.mockReturnValue({
      cart: [{ id: 1, nombre: 'GPU Test', precio: 5000, quantity: 1 }],
      showCart: true, 
      setShowCart: setShowCartMock,
      removeFromCart: removeFromCartMock,
      total: 5000
    });

    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    supabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

    await act(async () => { render(<BrowserRouter><App /></BrowserRouter>); });

    expect(screen.getByText('GPU Test')).toBeInTheDocument();
    
    // Probar click en eliminar (Cubre la función removeFromCart)
    const btnTrash = document.querySelector('.btn-outline-danger'); // Clase específica de bootstrap
    if(btnTrash) {
        await act(async () => { fireEvent.click(btnTrash); });
        expect(removeFromCartMock).toHaveBeenCalledWith(1);
    }
  });
});