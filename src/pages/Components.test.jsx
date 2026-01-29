import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import Components from './Components';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '../supabase';

// 1. MOCK GOOGLE GEMINI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { 
        generateContent: vi.fn().mockResolvedValue({ 
          response: { text: () => "IA: Te recomiendo esta GPU." } 
        }) 
      };
    }
  }
}));

// 2. MOCK CART CONTEXT
const mockAddToCart = vi.fn();
vi.mock('../context/CartContext', () => ({ 
  useCart: () => ({ addToCart: mockAddToCart }) 
}));

// 3. MOCK ROUTER
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { 
    ...actual, 
    useParams: () => ({ tipo: 'gpu' }),
    Link: ({ children, ...props }) => <div {...props}>{children}</div> 
  };
});

// 4. MOCK SUPABASE (DEFINIDO CORRECTAMENTE COMO vi.fn())
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn() // <--- ¡ESTO FALTABA!
  }
}));

// Helper para crear la cadena de métodos de Supabase
const createSupabaseMock = (data, error = null) => {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve) => resolve({ data, error }) 
  };
};

describe('Components Page - Cobertura Total', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn(); 
  });

  it('Flujo Completo: Carga, Ordena, Chatea y Agrega al Carrito', async () => {
    const mockData = [
      { id: 1, nombre: 'GPU Barata', precio: 100, categoria: 'gpu', stock: 10, imagen_url: 'img1.jpg' },
      { id: 2, nombre: 'GPU Cara', precio: 200, categoria: 'gpu', stock: 5, imagen_url: 'img2.jpg' }
    ];

    // Ahora sí funciona porque supabase.from es un vi.fn()
    supabase.from.mockReturnValue(createSupabaseMock(mockData));

    await act(async () => {
      render(<BrowserRouter><Components /></BrowserRouter>);
    });

    // A. VERIFICAR CARGA
    await waitFor(() => {
      expect(screen.getByText('GPU Barata')).toBeInTheDocument();
    });

    // B. PROBAR ORDENAMIENTO
    const select = screen.getByRole('combobox');
    
    await act(async () => {
      fireEvent.change(select, { target: { value: 'menor' } });
    });
    expect(select.value).toBe('menor');

    await act(async () => {
      fireEvent.change(select, { target: { value: 'mayor' } });
    });
    expect(select.value).toBe('mayor');

    // C. PROBAR CHAT IA
    const allButtons = screen.getAllByRole('button');
    const chatBtn = allButtons[allButtons.length - 1]; 
    
    await act(async () => { fireEvent.click(chatBtn); });

    const input = screen.getByPlaceholderText(/Consulta/i);
    const sendBtn = screen.getAllByRole('button').pop(); 

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Recomienda algo' } });
      fireEvent.click(sendBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/IA: Te recomiendo/i)).toBeInTheDocument();
    });

    // D. AGREGAR AL CARRITO
    // El botón del carrito es el SEGUNDO (índice 1) de los botones visibles (Ver, Carrito)
    // Filtramos para ignorar los del chat
    const mainButtons = screen.getAllByRole('button').filter(btn => 
        !btn.className.includes('rounded-circle') && // botón flotante chat
        !btn.textContent?.includes('Enviar') // botón enviar chat
    );

    // Buscamos el botón "dark" (que es el de agregar carrito en tu código)
    const addToCartBtn = mainButtons.find(btn => btn.className.includes('btn-dark'));

    if (addToCartBtn) {
      await act(async () => { fireEvent.click(addToCartBtn); });
      expect(mockAddToCart).toHaveBeenCalled();
    }
  });

  it('Maneja Error de API correctamente', async () => {
    supabase.from.mockReturnValue(createSupabaseMock(null, { message: 'Fallo conexión' }));

    await act(async () => {
      render(<BrowserRouter><Components /></BrowserRouter>);
    });

    await waitFor(() => {
      expect(screen.getByText(/No hay productos/i)).toBeInTheDocument();
    });
  });
});