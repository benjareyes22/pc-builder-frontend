import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import UserMenu from './UserMenu';
import { supabase } from '../supabase';

// 1. MOCKEAMOS LAS LIBRERÍAS
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock de Supabase más robusto
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      signOut: vi.fn(),
    },
  },
}));

describe('UserMenu Component', () => {
  
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@ejemplo.com',
    },
  };

  // Variables para controlar los espías (spies) de las funciones
  let selectMock, updateMock, eqMock, singleMock;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    // --- CONFIGURACIÓN DEL MOCK MAESTRO ---
    // Preparamos funciones falsas que podamos interrogar después
    singleMock = vi.fn().mockResolvedValue({ data: { nombre_usuario: 'Usuario' }, error: null });
    
    // Cadena para el SELECT: .select().eq().single()
    eqMock = vi.fn().mockReturnValue({ single: singleMock });
    selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    
    // Cadena para el UPDATE: .update().eq()
    updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    // Hacemos que supabase.from devuelva AMBAS capacidades (select y update)
    // Así no falla la carga inicial cuando probamos el update
    supabase.from.mockReturnValue({
      select: selectMock,
      update: updateMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- TEST 1: RENDERIZADO INICIAL ---
  it('Debe renderizar correctamente con el nombre por defecto', async () => {
    // Simulamos que no trae datos al principio
    singleMock.mockResolvedValue({ data: null, error: null });

    await act(async () => {
      render(<UserMenu session={mockSession} />);
    });

    // Usamos getAllByText porque el nombre puede salir en el botón y en el menú
    expect(screen.getAllByText('Usuario')[0]).toBeInTheDocument();
  });

  // --- TEST 2: CARGAR PERFIL ---
  it('Debe cargar el nombre de usuario desde Supabase al iniciar', async () => {
    // Simulamos que Supabase devuelve un nombre personalizado
    singleMock.mockResolvedValue({ data: { nombre_usuario: 'BenjaDev' }, error: null });

    await act(async () => {
      render(<UserMenu session={mockSession} />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('BenjaDev')[0]).toBeInTheDocument();
    });
  });

  // --- TEST 3: CERRAR SESIÓN ---
  it('Debe llamar a signOut y navegar al login al cerrar sesión', async () => {
    await act(async () => {
      render(<UserMenu session={mockSession} />);
    });

    // Abrir dropdown (Click en el primero que diga Usuario)
    const toggleBtn = screen.getAllByText('Usuario')[0];
    fireEvent.click(toggleBtn);

    // Click en Cerrar Sesión
    const logoutBtn = screen.getByText(/Cerrar Sesión/i);
    fireEvent.click(logoutBtn);

    expect(supabase.auth.signOut).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  // --- TEST 4: ABRIR Y CANCELAR EDICIÓN ---
  it('Debe permitir abrir y cancelar la edición del nombre', async () => {
    await act(async () => {
      render(<UserMenu session={mockSession} />);
    });

    // 1. Abrir menú
    fireEvent.click(screen.getAllByText('Usuario')[0]);

    // 2. Click en editar (buscamos por el título del botón)
    const editBtn = screen.getByTitle('Editar nombre'); 
    fireEvent.click(editBtn);

    // 3. Verificar que aparece el input
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();

    // 4. Escribir algo y Cancelar
    fireEvent.change(input, { target: { value: 'NuevoNombre' } });
    
    // El botón de cancelar suele ser el segundo o buscamos por clase si fuera necesario
    // Aquí asumimos que es el que sigue al de guardar.
    // Una forma segura: buscar el icono X o el botón secondary
    const buttons = screen.getAllByRole('button');
    // buttons[0] = input (si bootstrap lo trata asi), buttons[1] = save, buttons[2] = cancel
    // Ojo: en tu código hay iconos dentro de botones. 
    // Vamos a buscar el botón que NO es el de guardar (variant success)
    const cancelBtn = buttons.find(b => b.classList.contains('btn-outline-secondary'));
    fireEvent.click(cancelBtn);

    // 5. Verificar que volvió a texto
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getAllByText('Usuario').length).toBeGreaterThan(0);
  });

  // --- TEST 5: GUARDAR NOMBRE ---
  it('Debe guardar el nuevo nombre correctamente', async () => {
    await act(async () => {
      render(<UserMenu session={mockSession} />);
    });

    fireEvent.click(screen.getAllByText('Usuario')[0]);
    fireEvent.click(screen.getByTitle('Editar nombre'));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'SuperAdmin' } });

    const saveBtn = screen.getAllByRole('button').find(b => b.classList.contains('btn-success'));
    
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // Verificamos que se llamó al update
    expect(updateMock).toHaveBeenCalled(); // Verificamos que se usó la función updateMock
    // Y verificamos que el texto cambió en la pantalla
    await waitFor(() => {
      expect(screen.getAllByText('SuperAdmin')[0]).toBeInTheDocument();
    });
  });

  // --- TEST 6: VALIDACIÓN VACÍO ---
  it('No debe guardar si el nombre está vacío', async () => {
    await act(async () => {
      render(<UserMenu session={mockSession} />);
    });
    
    fireEvent.click(screen.getAllByText('Usuario')[0]);
    fireEvent.click(screen.getByTitle('Editar nombre'));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '   ' } });
    
    const saveBtn = screen.getAllByRole('button').find(b => b.classList.contains('btn-success'));
    
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // Verificamos que NO se llamó al update (el select sí se llamó al inicio, eso es normal)
    expect(updateMock).not.toHaveBeenCalled();
    expect(input).toBeInTheDocument(); // Sigue en modo edición
  });

  // --- TEST 7: ERROR EN UPDATE ---
  it('Debe manejar errores al actualizar', async () => {
    // Configuramos el updateMock para fallar
    updateMock.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'Error DB' } }) });

    await act(async () => {
      render(<UserMenu session={mockSession} />);
    });
    
    fireEvent.click(screen.getAllByText('Usuario')[0]);
    fireEvent.click(screen.getByTitle('Editar nombre'));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Fallo' } });
    
    const saveBtn = screen.getAllByRole('button').find(b => b.classList.contains('btn-success'));
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error al actualizar el nombre');
    });
  });

});