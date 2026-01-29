import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Register from './Register';
import { supabase } from '../supabase';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ to, children }) => <a href={to}>{children}</a>,
  };
});

vi.mock('../supabase', () => ({
  supabase: {
    auth: { signUp: vi.fn() },
  },
}));

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Debe renderizar el formulario correctamente', async () => {
    await act(async () => {
      render(<Register />);
    });
    expect(screen.getByText('Crear Cuenta')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument();
  });

  it('Debe registrar al usuario y redirigir al login', async () => {
    supabase.auth.signUp.mockResolvedValue({ 
      data: { user: { id: 'new-user' } }, 
      error: null 
    });

    await act(async () => {
      render(<Register />);
    });

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'nuevo@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: 'password123' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Registrarme/i }));
    });

    // 1. Verificar mensaje de éxito
    await waitFor(() => {
      expect(screen.getByText(/¡Cuenta creada con éxito!/i)).toBeInTheDocument();
    });

    // 2. Verificar redirección (Damos 3 segundos de tolerancia al test)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    }, { timeout: 3000 }); 
  });

  it('Debe mostrar un error si el registro falla', async () => {
    supabase.auth.signUp.mockResolvedValue({ 
      data: null, 
      error: { message: 'User already registered' } 
    });

    await act(async () => {
      render(<Register />);
    });

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'fail@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: '123456' } });
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Registrarme/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Error: User already registered/i)).toBeInTheDocument();
    });
  });

  it('Debe deshabilitar el botón mientras carga', async () => {
    // Promesa controlada para loading
    let resolveSign;
    const promise = new Promise(r => resolveSign = r);
    supabase.auth.signUp.mockReturnValue(promise);

    await act(async () => {
      render(<Register />);
    });

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'a@a.com' } });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: '123456' } });
    
    const btn = screen.getByRole('button', { name: /Registrarme/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(btn).toHaveTextContent('Creando...');
      expect(btn).toBeDisabled();
    });

    await act(async () => { resolveSign({}) });
  });
});