import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import AdminPanel from './AdminPanel';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn(), getSession: vi.fn() },
    from: vi.fn()
  }
}));

describe('AdminPanel Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {}); 
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );
  };

  const mockProductos = [
    { id: 1, nombre: 'CPU Intel', precio: 200, stock: 10, categoria: 'Procesador', descripcion: 'Potente', imagen_url: 'img.jpg' }
  ];

  const mockUsuarios = [
    { id: 'user1', email: 'admin@test.com', rol: 'admin' },
    { id: 'user2', email: 'cliente@test.com', rol: 'cliente' }
  ];

  // --- TESTS DE INVENTARIO (YA FUNCIONAN) ---

  it('Carga y muestra inventario y usuarios', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin123' } } });
    
    const selectMock = vi.fn().mockReturnValue({
      order: vi.fn()
        .mockResolvedValueOnce({ data: mockProductos, error: null }) // Productos
        .mockResolvedValueOnce({ data: mockUsuarios, error: null })  // Usuarios
    });
    supabase.from.mockReturnValue({ select: selectMock });

    await act(async () => { renderComponent(); });

    await waitFor(() => {
      expect(screen.getByText('Stock de Productos')).toBeInTheDocument();
    });
  });

  it('Permite crear un nuevo producto', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin123' } } });
    const selectMock = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) });
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    supabase.from.mockReturnValue({ select: selectMock, insert: insertMock });

    await act(async () => { renderComponent(); });

    const openModalBtn = screen.getByText(/\+ Agregar Producto/i);
    await act(async () => { fireEvent.click(openModalBtn); });

    await waitFor(() => {
        fireEvent.change(screen.getByPlaceholderText('Nombre del componente'), { target: { value: 'Nuevo Item' } });
        const numberInputs = screen.getAllByPlaceholderText('0');
        if (numberInputs.length >= 2) {
            fireEvent.change(numberInputs[0], { target: { value: '100' } });
            fireEvent.change(numberInputs[1], { target: { value: '10' } });
        }
        fireEvent.change(screen.getByPlaceholderText('https://link-de-la-imagen.jpg'), { target: { value: 'http://img.com/a.jpg' } });
    });
    
    const submitBtn = screen.getByText('Guardar Producto');
    await act(async () => { fireEvent.click(submitBtn); });

    expect(insertMock).toHaveBeenCalled();
  });

  it('Elimina un producto correctamente', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin123' } } });
    const selectMock = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockProductos, error: null }) });
    const deleteMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    supabase.from.mockReturnValue({ select: selectMock, delete: deleteMock });

    await act(async () => { renderComponent(); });
    const deleteBtns = screen.getAllByText('Eliminar');
    await act(async () => { fireEvent.click(deleteBtns[0]); });
    expect(deleteMock).toHaveBeenCalled();
  });

  it('Actualiza el stock (+ y -)', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin123' } } });
    const selectMock = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockProductos, error: null }) });
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    supabase.from.mockReturnValue({ select: selectMock, update: updateMock });

    await act(async () => { renderComponent(); });
    const plusBtns = screen.getAllByText('+');
    const minusBtns = screen.getAllByText('-');
    
    await act(async () => { fireEvent.click(plusBtns[0]); });
    await act(async () => { fireEvent.click(minusBtns[0]); });

    expect(updateMock).toHaveBeenCalledTimes(2);
  });

  // --- TESTS DE GESTIÓN DE USUARIOS (NUEVO) ---

  it('Cambia a la pestaña de usuarios y modifica roles', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin123' } } });
    
    // Mock para devolver productos y usuarios
    const selectMock = vi.fn().mockReturnValue({
      order: vi.fn()
        .mockResolvedValueOnce({ data: mockProductos, error: null })
        .mockResolvedValueOnce({ data: mockUsuarios, error: null })
        // Para cuando se recarga tras el update
        .mockResolvedValue({ data: mockUsuarios, error: null }) 
    });

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    supabase.from.mockReturnValue({ select: selectMock, update: updateMock });

    await act(async () => { renderComponent(); });

    // 1. Cambiar tab
    const usersTab = screen.getByText(/Gestión de Personal/i);
    await act(async () => { fireEvent.click(usersTab); });

    await waitFor(() => {
        expect(screen.getByText('Control de Usuarios')).toBeInTheDocument();
        expect(screen.getByText('cliente@test.com')).toBeInTheDocument();
    });

    // 2. Cambiar rol a Moderador
    const modBtn = screen.getByText(/Hacer Moderador/i);
    await act(async () => { fireEvent.click(modBtn); });

    expect(updateMock).toHaveBeenCalledWith({ rol: 'moderador' });

    // 3. Cambiar rol a Cliente
    const clientBtn = screen.getByText(/Hacer Cliente/i);
    await act(async () => { fireEvent.click(clientBtn); });

    expect(updateMock).toHaveBeenCalledWith({ rol: 'cliente' });
  });

  // --- COBERTURA DE ERRORES ---

  it('Maneja error al crear producto (Alert)', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin123' } } });
    const selectMock = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) });
    const insertMock = vi.fn().mockResolvedValue({ error: { message: 'Error Fatal DB' } });
    supabase.from.mockReturnValue({ select: selectMock, insert: insertMock });

    await act(async () => { renderComponent(); });

    const openModalBtn = screen.getByText(/\+ Agregar Producto/i);
    await act(async () => { fireEvent.click(openModalBtn); });

    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText('Nombre del componente'), { target: { value: 'Test' } });
      const numberInputs = screen.getAllByPlaceholderText('0');
      if (numberInputs.length >= 2) {
          fireEvent.change(numberInputs[0], { target: { value: '100' } });
          fireEvent.change(numberInputs[1], { target: { value: '1' } });
      }
      fireEvent.change(screen.getByPlaceholderText('https://link-de-la-imagen.jpg'), { target: { value: 'http://img.com/a.jpg' } });
    });

    const submitBtn = screen.getByText('Guardar Producto');
    await act(async () => { fireEvent.click(submitBtn); });

    await waitFor(() => { expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Error Fatal DB')); });
  });

  it('Maneja error en carga inicial', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin123' } } });
    
    // Hacemos que fetchInventory falle
    const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockRejectedValue(new Error("Error de Red"))
    });
    supabase.from.mockReturnValue({ select: selectMock });

    const consoleSpy = vi.spyOn(console, 'error'); // Espiamos console.error

    await act(async () => { renderComponent(); });

    // Verificamos que se logueó el error
    expect(consoleSpy).toHaveBeenCalled();
  });
});