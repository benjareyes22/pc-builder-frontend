import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '../supabase';

// 1. MOCKEAMOS SUPABASE
// Es vital simular la estructura exacta que usa tu código:
// auth.getSession, auth.onAuthStateChange, auth.signOut
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Componente falso para consumir el contexto y ver si funciona
const TestComponent = () => {
  const { user, signOut } = useAuth();
  return (
    <div>
      <p data-testid="user-display">{user ? user.email : 'No Logueado'}</p>
      <button onClick={signOut}>Cerrar Sesión</button>
    </div>
  );
};

describe('AuthContext', () => {
  
  // Variables para controlar los espías
  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Configuración por defecto del mock de onAuthStateChange
    // Debe devolver una suscripción con una función unsubscribe para que no falle el useEffect
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } }
    });
  });

  // --- TEST 1: USUARIO NO LOGUEADO ---
  it('Debe iniciar con usuario NULL si no hay sesión', async () => {
    // Simulamos que Supabase dice: "No hay sesión"
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    // Esperamos a que termine el "loading" y muestre el componente
    await waitFor(() => {
      expect(screen.getByTestId('user-display')).toHaveTextContent('No Logueado');
    });
  });

  // --- TEST 2: USUARIO LOGUEADO ---
  it('Debe iniciar con el usuario cargado si existe sesión', async () => {
    // Simulamos que Supabase dice: "Sí, este es el usuario"
    const mockUser = { id: '123', email: 'benja@test.com' };
    supabase.auth.getSession.mockResolvedValue({ 
      data: { session: { user: mockUser } } 
    });

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    // Verificamos que el contexto entregó el usuario al componente
    await waitFor(() => {
      expect(screen.getByTestId('user-display')).toHaveTextContent('benja@test.com');
    });
  });

  // --- TEST 3: CERRAR SESIÓN (signOut) ---
  it('Debe llamar a supabase.auth.signOut al ejecutar la función signOut', async () => {
    // Iniciamos sesión primero
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    // Hacemos click en el botón que llama a signOut()
    const btn = screen.getByText('Cerrar Sesión');
    fireEvent.click(btn);

    // Verificamos que se llamó a la función de Supabase
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  // --- TEST 4: CAMBIO DE ESTADO (onAuthStateChange) ---
  // Este test es avanzado: verificamos que si Supabase avisa un cambio, el estado se actualice
  it('Debe actualizar el usuario cuando onAuthStateChange detecta cambios', async () => {
    // 1. Preparamos el mock para que podamos disparar el evento manualmente
    let authCallback;
    supabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authCallback = callback; // Guardamos la función para llamarla después
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });

    // 2. Iniciamos sin usuario
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Verificamos estado inicial
    await waitFor(() => {
      expect(screen.getByTestId('user-display')).toHaveTextContent('No Logueado');
    });

    // 3. ¡SIMULAMOS EL LOGIN! Disparamos el callback manualmente
    const newUser = { id: '999', email: 'nuevo@login.com' };
    
    await act(async () => {
      // Simulamos evento 'SIGNED_IN'
      if (authCallback) {
        authCallback('SIGNED_IN', { user: newUser });
      }
    });

    // 4. Verificamos que el contexto se actualizó solo
    expect(screen.getByTestId('user-display')).toHaveTextContent('nuevo@login.com');
  });

});
