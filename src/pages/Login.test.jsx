import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Login from './Login';
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
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Debe renderizar el formulario correctamente', async () => {
    await act(async () => {
      render(<Login />);
    });
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('nombre@ejemplo.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('********')).toBeInTheDocument();
  });

  it('Debe llamar a supabase y redirigir al home en caso de éxito', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ 
      data: { user: { id: '123' } }, 
      error: null 
    });

    await act(async () => {
      render(<Login />);
    });

    // CORRECCIÓN: Usar email válido para que el form no bloquee el submit
    fireEvent.change(screen.getByPlaceholderText('nombre@ejemplo.com'), { target: { value: 'test@admin.com' } });
    fireEvent.change(screen.getByPlaceholderText('********'), { target: { value: '123456' } });
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('Debe mostrar alerta de error si las credenciales fallan', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ 
      data: null, 
      error: { message: 'Credenciales invalidas' } 
    });

    await act(async () => {
      render(<Login />);
    });

    fireEvent.change(screen.getByPlaceholderText('nombre@ejemplo.com'), { target: { value: 'error@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('********'), { target: { value: 'badpass' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Error: Credenciales invalidas/i)).toBeInTheDocument();
    });
  });

  it('Debe mostrar "Entrando..." mientras carga', async () => {
    // Promesa infinita para congelar el estado de carga
    supabase.auth.signInWithPassword.mockReturnValue(new Promise(() => {}));

    await act(async () => {
      render(<Login />);
    });

    // CORRECCIÓN: Usar email válido aquí también
    fireEvent.change(screen.getByPlaceholderText('nombre@ejemplo.com'), { target: { value: 'loading@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('********'), { target: { value: 'password' } });

    const btn = screen.getByRole('button', { name: /Ingresar/i });
    
    fireEvent.click(btn);

    await waitFor(() => {
      expect(btn).toHaveTextContent('Entrando...');
      expect(btn).toBeDisabled();
    });
  });
});