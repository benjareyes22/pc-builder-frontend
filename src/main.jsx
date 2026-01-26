import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // O tus estilos globales
import { BrowserRouter } from 'react-router-dom'

// IMPORTANTE: Importar los contextos
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* 1. El AuthProvider debe envolver todo para saber quién está logueado */}
      <AuthProvider>
        {/* 2. El CartProvider va dentro para que el carrito funcione en todas partes */}
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)