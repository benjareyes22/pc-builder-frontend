import { render, screen, act } from '@testing-library/react';
import { describe, it, vi } from 'vitest';
import Home from './Home';
import { BrowserRouter } from 'react-router-dom';

// Mock de componentes Link para que no fallen fuera del Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>
  };
});

describe('Home Page', () => {
  it('Renderiza la portada correctamente', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );
    });
    // Verifica textos clave
    expect(screen.getByText(/Arma tu PC Gamer/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin Errores/i)).toBeInTheDocument();
  });
});