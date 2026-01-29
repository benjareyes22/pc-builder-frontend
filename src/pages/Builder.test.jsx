import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';

// 1. MOCK DE GOOGLE GEMINI (ROBUSTO)
const { mockGenerateContent } = vi.hoisted(() => {
  return { mockGenerateContent: vi.fn() };
});

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      constructor(apiKey) {}
      getGenerativeModel() {
        return { generateContent: mockGenerateContent };
      }
    }
  };
});

// 2. MOCK DE SUPABASE
vi.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn(), getSession: vi.fn() },
    from: vi.fn()
  }
}));

// 3. MOCK DE REACT-ROUTER
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

// Importamos los componentes DESPUÉS de los mocks
import Builder from './Builder';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '../supabase';
import { CartContext } from '../context/CartContext';
import * as AuthContextModule from '../context/AuthContext';

describe('Builder Page', () => {
  const mockAddToCart = vi.fn();

  // Datos de prueba
  const mockProductos = [
    { id: 1, nombre: 'Intel Core i9', precio: 500, categoria: 'CPU', image_url: 'cpu.jpg' },
    { id: 2, nombre: 'AMD Ryzen 9', precio: 450, categoria: 'CPU', image_url: 'amd.jpg' },
    { id: 3, nombre: 'RTX 4090', precio: 1500, categoria: 'GPU', image_url: 'gpu.jpg' },
    { id: 4, nombre: 'Placa Madre Z790', precio: 300, categoria: 'Motherboard', image_url: 'mobo.jpg' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'prompt').mockImplementation(() => "Mi PC Gamer");
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: '123', email: 'test@test.com' },
      session: { user: { id: '123' } }
    });
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

  // --- TESTS ORIGINALES ---

  it('Carga componentes y permite seleccionar uno', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }),
      select: vi.fn().mockReturnThis()
    });
    supabase.from.mockReturnValue({ select: selectMock });

    await act(async () => { renderComponent(); });
    expect(screen.getByText('Armador de PC Inteligente')).toBeInTheDocument();
    
    const selects = screen.getAllByRole('combobox');
    await act(async () => { fireEvent.change(selects[0], { target: { value: '1' } }); });
    await waitFor(() => { expect(screen.getByText(/Total:.*500/)).toBeInTheDocument(); });
  });

  it('Interactúa con el Chat IA', async () => {
    supabase.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }), select: vi.fn().mockReturnThis() }) });
    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => "Claro, te recomiendo este PC." } });

    await act(async () => { renderComponent(); });
    const chatInput = screen.getByPlaceholderText(/PC para Fortnite/i);
    fireEvent.change(chatInput, { target: { value: 'Ayuda con mi PC' } });
    const submitBtn = chatInput.parentElement.querySelector('button[type="submit"]');
    await act(async () => { fireEvent.click(submitBtn); });

    await waitFor(() => { expect(screen.getByText("Claro, te recomiendo este PC.")).toBeInTheDocument(); });
  });

  it('Muestra alerta de ERROR (DANGER) en validación manual', async () => {
    supabase.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }), select: vi.fn().mockReturnThis() }) });
    await act(async () => { renderComponent(); });
    const selects = screen.getAllByRole('combobox');
    await act(async () => { fireEvent.change(selects[0], { target: { value: '1' } }); });

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify({ status: "DANGER", title: "Incompatibilidad", message: "Error socket" }) }
    });

    const validateBtn = screen.getByText(/Verificar Compatibilidad/i);
    await act(async () => { fireEvent.click(validateBtn); });
    await waitFor(() => { expect(screen.getByText("🛑 ERROR DE COMPATIBILIDAD")).toBeInTheDocument(); });
  });

  it('Muestra alerta de ÉXITO (OK) en validación manual', async () => {
    supabase.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }), select: vi.fn().mockReturnThis() }) });
    await act(async () => { renderComponent(); });
    const selects = screen.getAllByRole('combobox');
    await act(async () => { fireEvent.change(selects[0], { target: { value: '1' } }); });

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify({ status: "OK", title: "Bien", message: "Compatible" }) }
    });

    const validateBtn = screen.getByText(/Verificar Compatibilidad/i);
    await act(async () => { fireEvent.click(validateBtn); });
    await waitFor(() => { expect(screen.getByText("✅ TODO COMPATIBLE")).toBeInTheDocument(); });
  });

  it('No valida si no hay componentes seleccionados', async () => {
    supabase.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }), select: vi.fn().mockReturnThis() }) });
    await act(async () => { renderComponent(); });
    const validateBtn = screen.getByText(/Verificar Compatibilidad/i);
    await act(async () => { fireEvent.click(validateBtn); });
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Selecciona al menos un componente"));
  });

  it('Guarda la cotización exitosamente', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    supabase.from.mockReturnValue({ 
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }), select: vi.fn().mockReturnThis() }), 
      insert: insertMock 
    });
    await act(async () => { renderComponent(); });
    const selects = screen.getAllByRole('combobox');
    await act(async () => { fireEvent.change(selects[0], { target: { value: '1' } }); });
    const saveBtn = screen.getByText(/Guardar/i);
    await act(async () => { fireEvent.click(saveBtn); });
    expect(insertMock).toHaveBeenCalled();
  });

  it('Muestra error si intenta guardar sin sesión', async () => {
    AuthContextModule.useAuth.mockReturnValue({ user: null, session: null });
    supabase.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }), select: vi.fn().mockReturnThis() }) });
    await act(async () => { renderComponent(); });
    const saveBtn = screen.getByText(/Guardar/i);
    await act(async () => { fireEvent.click(saveBtn); });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Inicia sesión'));
  });

  it('Maneja error de la API de IA', async () => {
    supabase.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }), select: vi.fn().mockReturnThis() }) });
    await act(async () => { renderComponent(); });
    const selects = screen.getAllByRole('combobox');
    await act(async () => { fireEvent.change(selects[0], { target: { value: '1' } }); });
    mockGenerateContent.mockRejectedValueOnce(new Error("API Error"));
    const validateBtn = screen.getByText(/Verificar Compatibilidad/i);
    await act(async () => { fireEvent.click(validateBtn); });
    await waitFor(() => { expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Error al conectar")); });
  });

  it('Agrega al carrito correctamente', async () => {
     supabase.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }), select: vi.fn().mockReturnThis() }) });
     await act(async () => { renderComponent(); });
     const selects = screen.getAllByRole('combobox');
     await act(async () => { fireEvent.change(selects[0], { target: { value: '1' } }); });
     const cartBtn = screen.getAllByText(/Carrito/i).find(el => el.tagName === 'BUTTON' || el.closest('button'));
     await act(async () => { fireEvent.click(cartBtn); });
     expect(mockAddToCart).toHaveBeenCalled();
  });

  // --- TESTS NUEVOS Y CORREGIDOS ---

  it('Actualiza el armador cuando la IA retorna un JSON válido (Auto-completado)', async () => {
    supabase.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }), select: vi.fn().mockReturnThis() }) });
    await act(async () => { renderComponent(); });

    const chatInput = screen.getByPlaceholderText(/PC para Fortnite/i);
    fireEvent.change(chatInput, { target: { value: 'Dame un PC Gamer' } });
    
    // JSON con IDs que existen en mockProductos
    const jsonRespuesta = JSON.stringify({ "CPU": 1, "GPU": 3 });
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => `Claro: JSON_START ${jsonRespuesta} JSON_END` }
    });

    const submitBtn = chatInput.parentElement.querySelector('button[type="submit"]');
    await act(async () => { fireEvent.click(submitBtn); });

    await waitFor(() => {
        expect(screen.getByText(/He actualizado la tabla/i)).toBeInTheDocument();
        // CPU(500) + GPU(1500) = 2000
        expect(screen.getByText(/Total:.*2\.000/)).toBeInTheDocument();
    });
  });

  it('Maneja error cuando la IA retorna un JSON inválido (Branch Coverage)', async () => {
    supabase.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProductos, error: null }), select: vi.fn().mockReturnThis() }) });
    await act(async () => { renderComponent(); });

    const chatInput = screen.getByPlaceholderText(/PC para Fortnite/i);
    fireEvent.change(chatInput, { target: { value: 'Dame PC' } });
    
    // CORRECCIÓN: Agregamos texto visible "Intento fallido"
    // El código borrará "JSON_START...JSON_END", pero "Intento fallido" quedará.
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => `Intento fallido. JSON_START { "CPU": "ID_MALO" } JSON_END` }
    });

    const submitBtn = chatInput.parentElement.querySelector('button[type="submit"]');
    await act(async () => { fireEvent.click(submitBtn); });

    // Verificamos que el texto visible aparece (confirma que el código corrió bien)
    await waitFor(() => { expect(screen.getByText(/Intento fallido/)).toBeInTheDocument(); });
    
    // Verificamos que el JSON feo YA NO ESTÁ (porque tu código lo limpió)
    expect(screen.queryByText(/JSON_START/)).not.toBeInTheDocument();
  });

});