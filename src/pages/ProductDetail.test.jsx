import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import ProductDetail from './ProductDetail';

// ===============================
// MOCK GOOGLE GEMINI (IA)
// ===============================
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => 'AI Desc' }
          })
        };
      }
    }
  };
});

// ===============================
// MOCK SUPABASE
// ===============================
const mockProduct = {
  id: 1,
  nombre: 'RTX 4090 Test',
  precio: 1500000,
  categoria: 'GPU',
  stock: 5,
  descripcion: ''
};

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockProduct,
            error: null
          })
        }))
      }))
    }))
  }
}));

// ===============================
// MOCK CART CONTEXT
// ===============================
const addToCartMock = vi.fn();

vi.mock('../context/CartContext', () => ({
  useCart: () => ({
    addToCart: addToCartMock
  })
}));

// ===============================
// MOCK REACT ROUTER
// ===============================
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => vi.fn()
  };
});

// ===============================
// TESTS
// ===============================
describe('ProductDetail Page', () => {
  it('Renderiza el detalle del producto', async () => {
    await act(async () => {
      render(<ProductDetail />);
    });

    expect(screen.getByText('RTX 4090 Test')).toBeInTheDocument();
    expect(screen.getByText(/1\.500\.000/)).toBeInTheDocument();
    expect(screen.getByText(/stock disponible/i)).toBeInTheDocument();
  });

  it('Muestra mensaje cuando el producto no existe', async () => {
    const { supabase } = await import('../supabase');

    supabase.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: true
          })
        })
      })
    });

    await act(async () => {
      render(<ProductDetail />);
    });

    expect(
      screen.getByText(/producto no encontrado/i)
    ).toBeInTheDocument();
  });

  it('Permite agregar el producto al carrito', async () => {
    await act(async () => {
      render(<ProductDetail />);
    });

    const button = screen.getByRole('button', {
      name: /añadir al carrito/i
    });

    fireEvent.click(button);

    expect(addToCartMock).toHaveBeenCalled();
  });

  it('Genera descripción con IA cuando está vacía', async () => {
    await act(async () => {
      render(<ProductDetail />);
    });

    expect(screen.getByText('AI Desc')).toBeInTheDocument();
  });

  it('NO genera descripción con IA si ya existe', async () => {
    const { supabase } = await import('../supabase');

    supabase.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({
            data: {
              ...mockProduct,
              descripcion: 'Descripción existente'
            },
            error: null
          })
        })
      })
    });

    await act(async () => {
      render(<ProductDetail />);
    });

    expect(
      screen.getByText('Descripción existente')
    ).toBeInTheDocument();
  });

  it('Muestra mensaje cuando no hay stock disponible', async () => {
    const { supabase } = await import('../supabase');

    supabase.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({
            data: {
              ...mockProduct,
              stock: 0
            },
            error: null
          })
        })
      })
    });

    await act(async () => {
      render(<ProductDetail />);
    });

    expect(
      screen.getByText(/producto agotado/i)
    ).toBeInTheDocument();

    const button = screen.getByRole('button', {
      name: /añadir al carrito/i
    });

    expect(button).toBeDisabled();
  });
});
