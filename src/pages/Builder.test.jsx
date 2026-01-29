import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import Builder from './Builder';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '../supabase';
import { CartContext } from '../context/CartContext';
import * as AuthContextModule from '../context/AuthContext';

// 1. MOCKS GLOBALES
vi.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn(), getSession: vi.fn() },
    from: vi.fn()
  }
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Builder Page', () => {
  const mockAddToCart = vi.fn();

  // Datos mockeados
  const mockProductos = [
    { id: 1, nombre: 'Intel Core i9', precio: 500, categoria: 'CPU', image_url: 'cpu.jpg' },
    { id: 2, nombre: 'AMD Ryzen 9', precio: 450, categoria: 'CPU', image_url: 'amd.jpg' },
    { id: 3, nombre: 'RTX 4090', precio: 1500, categoria: 'GPU', image_url: 'gpu.jpg' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mocks de ventana y consola
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'prompt').mockImplementation(() => "Mi PC Gamer");
    
    // 🔥 Mock CRUCIAL para scroll (evita error JSDOM)
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    // Mock del usuario logueado (Espía para no romper otros tests)
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: '123', email: 'test@test.com' },
      session: { user: { id: '123' } }
    });

    // Mock de fetch para la IA (Definido como vi.fn para poder usar mockImplementationOnce)
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
            candidates: [{ content: { parts: [{ text: "Te recomiendo una RTX 4090." }] } }] 
        }),
      })
    );
  });

  const renderComponent = () => {
    return render(
      <CartContext.Provider value={{ addToCart: mockAddToCart }}>
        <BrowserRouter>
          <Builder />
        </BrowserRouter>
      </CartContext.Provider>
    );
  };

  // --- TESTS PRINCIPALES ---

  it('Carga componentes y permite seleccionar uno', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } });
    
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }),
      select: vi.fn().mockReturnThis()
    });
    supabase.from.mockReturnValue({ select: selectMock });

    await act(async () => { renderComponent(); });

    await waitFor(() => {
      expect(screen.getByText('Armador de PC Inteligente')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    await act(async () => { fireEvent.change(selects[0], { target: { value: '1' } }); });

    await waitFor(() => {
        expect(screen.getByText(/Total:.*500/)).toBeInTheDocument();
    });
  });

  it('Reemplaza un componente de la misma categoría', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }),
      select: vi.fn().mockReturnThis()
    });
    supabase.from.mockReturnValue({ select: selectMock });

    await act(async () => { renderComponent(); });

    const selects = screen.getAllByRole('combobox');
    
    await act(async () => { fireEvent.change(selects[0], { target: { value: '1' } }); });
    expect(screen.getByText(/Total:.*500/)).toBeInTheDocument();

    await act(async () => { fireEvent.change(selects[0], { target: { value: '2' } }); });
    expect(screen.getByText(/Total:.*450/)).toBeInTheDocument();
  });

  it('Interactúa con el Chat IA', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }),
      select: vi.fn().mockReturnThis()
    });
    supabase.from.mockReturnValue({ select: selectMock });

    await act(async () => { renderComponent(); });

    const chatInput = screen.getByPlaceholderText(/PC para Fortnite/i);
    fireEvent.change(chatInput, { target: { value: 'Ayuda con mi PC' } });
    
    const submitBtn = chatInput.parentElement.querySelector('button[type="submit"]');
    await act(async () => { fireEvent.click(submitBtn); });

    expect(global.fetch).toHaveBeenCalled();
    await waitFor(() => { expect(chatInput.value).toBe(''); });
  });

  it('Guarda la cotización exitosamente', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }),
      select: vi.fn().mockReturnThis()
    });
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    supabase.from.mockReturnValue({ select: selectMock, insert: insertMock });

    await act(async () => { renderComponent(); });

    const selects = screen.getAllByRole('combobox');
    await act(async () => { fireEvent.change(selects[0], { target: { value: '1' } }); });

    const saveBtn = screen.getByText(/Guardar/i);
    await act(async () => { fireEvent.click(saveBtn); });

    expect(window.prompt).toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('guardada'));
  });

  // --- BRANCH COVERAGE ---

  it('Muestra alerta si intenta guardar sin sesión', async () => {
    AuthContextModule.useAuth.mockReturnValue({ user: null, session: null });
    
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }),
      select: vi.fn().mockReturnThis()
    });
    supabase.from.mockReturnValue({ select: selectMock });

    await act(async () => { renderComponent(); });

    const saveBtn = screen.getByText(/Guardar/i);
    await act(async () => { fireEvent.click(saveBtn); });

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('sesión'));
  });

  it('Maneja error al guardar en la base de datos', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }),
      select: vi.fn().mockReturnThis()
    });
    const insertMock = vi.fn().mockResolvedValue({ error: { message: 'Error Fatal DB' } });

    supabase.from.mockReturnValue({ select: selectMock, insert: insertMock });

    await act(async () => { renderComponent(); });

    const selects = screen.getAllByRole('combobox');
    await act(async () => { fireEvent.change(selects[0], { target: { value: '1' } }); });
    
    const saveBtn = screen.getByText(/Guardar/i);
    await act(async () => { fireEvent.click(saveBtn); });

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Error'));
  });

  it('Maneja error al cargar componentes (Silencioso)', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error Fetch' } }),
      select: vi.fn().mockReturnThis()
    });
    supabase.from.mockReturnValue({ select: selectMock });

    await act(async () => { renderComponent(); });
    expect(screen.getByText('Armador de PC Inteligente')).toBeInTheDocument();
  });

  it('No guarda si el usuario cancela el nombre', async () => {
    window.prompt.mockReturnValue(null); 

    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }),
      select: vi.fn().mockReturnThis()
    });
    const insertMock = vi.fn();

    supabase.from.mockReturnValue({ select: selectMock, insert: insertMock });

    await act(async () => { renderComponent(); });

    const selects = screen.getAllByRole('combobox');
    await act(async () => { fireEvent.change(selects[0], { target: { value: '1' } }); });

    const saveBtn = screen.getByText(/Guardar/i);
    await act(async () => { fireEvent.click(saveBtn); });

    expect(insertMock).not.toHaveBeenCalled();
  });

  // --- NUEVOS TESTS FINALES (PARA EL 100%) ---

  it('Agrega todos los componentes al carrito desde el footer', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }),
      select: vi.fn().mockReturnThis()
    });
    supabase.from.mockReturnValue({ select: selectMock });

    await act(async () => { renderComponent(); });

    // Seleccionamos un componente para que el carrito no esté vacío
    const selects = screen.getAllByRole('combobox');
    await act(async () => { fireEvent.change(selects[0], { target: { value: '1' } }); });

    // Buscamos el botón "Carrito" (el del footer)
    // El texto en tu HTML es " Carrito" (con espacio) o está dentro de un botón
    const cartBtn = screen.getByText(/Carrito/i); 
    await act(async () => { fireEvent.click(cartBtn); });

    expect(mockAddToCart).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('carrito'));
  });

  it('Maneja error cuando la IA falla', async () => {
    // Forzamos que fetch falle UNA sola vez
    global.fetch.mockImplementationOnce(() => Promise.reject("API Error"));

    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }),
      select: vi.fn().mockReturnThis()
    });
    supabase.from.mockReturnValue({ select: selectMock });

    await act(async () => { renderComponent(); });

    const chatInput = screen.getByPlaceholderText(/PC para Fortnite/i);
    fireEvent.change(chatInput, { target: { value: 'Hola' } });
    
    const submitBtn = chatInput.parentElement.querySelector('button[type="submit"]');
    await act(async () => { fireEvent.click(submitBtn); });

    // Verificamos que el error se capturó
    expect(console.error).toHaveBeenCalled();
  });
});