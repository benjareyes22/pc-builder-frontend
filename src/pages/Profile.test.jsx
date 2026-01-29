import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Profile from './Profile';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

describe('Profile Component', () => {
  const reloadMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock seguro de window.location
    delete window.location;
    window.location = { reload: reloadMock };
  });

  it('Debe cargar y mostrar los datos del usuario al iniciar', async () => {
    supabase.auth.getUser.mockResolvedValue({ 
      data: { user: { email: 'benja@test.com', user_metadata: { username: 'BenjaMaster' } } } 
    });

    await act(async () => {
      render(<Profile />);
    });

    expect(screen.getByDisplayValue('benja@test.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('BenjaMaster')).toBeInTheDocument();
  });

  it('Debe actualizar el nombre y recargar la página', async () => {
    supabase.auth.getUser.mockResolvedValue({ 
      data: { user: { email: 'test@test.com', user_metadata: { username: 'Viejo' } } } 
    });
    supabase.auth.updateUser.mockResolvedValue({ error: null });

    await act(async () => {
      render(<Profile />);
    });

    const inputName = screen.getByPlaceholderText('Ej: MasterPC_2026');
    fireEvent.change(inputName, { target: { value: 'NuevoNombre' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/¡Nombre actualizado con éxito!/i)).toBeInTheDocument();
    });

    // Esperamos a que pase el segundo real (con timeout de 2s por si acaso)
    await waitFor(() => {
      expect(reloadMock).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('Debe mostrar error si falla la actualización', async () => {
    supabase.auth.getUser.mockResolvedValue({ 
      data: { user: { email: 'a@a.com' } } 
    });
    supabase.auth.updateUser.mockResolvedValue({ 
      error: { message: 'Fallo de red' } 
    });

    await act(async () => {
      render(<Profile />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Error: Fallo de red/i)).toBeInTheDocument();
    });
  });

  it('Debe mostrar "Guardando..." mientras se procesa', async () => {
    supabase.auth.getUser.mockResolvedValue({ 
      data: { user: { email: 'a@a.com' } } 
    });
    
    let resolveUpdate;
    const promise = new Promise(r => resolveUpdate = r);
    supabase.auth.updateUser.mockReturnValue(promise);

    await act(async () => {
      render(<Profile />);
    });

    const btn = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(btn).toHaveTextContent('Guardando...');
      expect(btn).toBeDisabled();
    });

    await act(async () => { resolveUpdate({}) });
  });
});