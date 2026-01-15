import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown, Badge, Button, Offcanvas, ListGroup } from 'react-bootstrap';
import { supabase } from './supabase'; 
import { CartProvider, useCart } from './context/CartContext';

// Páginas
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Builder from './pages/Builder';
import SavedBuilds from './pages/SavedBuilds';
import Components from './pages/Components';
import AdminPanel from './pages/AdminPanel';

const Navigation = () => {
  const { cart, showCart, setShowCart, removeFromCart, total, clearCart } = useCart();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('cliente');

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) fetchRole(user.id);
    };
    getData();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchRole(session.user.id);
      else setRole('cliente');
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId) => {
    const { data } = await supabase.from('perfiles').select('rol').eq('id', userId).single();
    if (data) setRole(data.rol);
  };

  const isStaff = role === 'admin' || role === 'moderador';

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm py-3 sticky-top">
        <Container>
          <Navbar.Brand as={Link} to="/" className="fw-bold text-warning fs-4">⚡ PC-BUILDER AI</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">Inicio</Nav.Link>
              
              {/* MENÚ DE COMPONENTES COMPLETO RE-ACTIVADO */}
              <NavDropdown title="Componentes" id="nav-dropdown">
                <NavDropdown.Item as={Link} to="/componentes/gpu">Tarjetas Gráficas</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/componentes/cpu">Procesadores</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/componentes/ram">Memorias RAM</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as={Link} to="/componentes/Case">Gabinetes</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/componentes/PSU">Fuentes de Poder</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/componentes/Storage">Almacenamiento</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as={Link} to="/componentes/all">Ver Catálogo Completo</NavDropdown.Item>
              </NavDropdown>

              <Nav.Link as={Link} to="/mis-cotizaciones">📁 Mis Cotizaciones</Nav.Link>
              
              {isStaff && (
                <Nav.Link as={Link} to="/admin" className="text-info fw-bold border border-info rounded px-2 ms-lg-2 mt-2 mt-lg-0">
                   {role === 'admin' ? '👤 Panel Jefe' : '🛡️ Moderación'}
                </Nav.Link>
              )}
            </Nav>

            <Nav className="gap-2 mt-3 mt-lg-0">
              <Button as={Link} to="/cotizador" variant="warning" size="sm" className="fw-bold text-dark">🤖 Armar PC</Button>
              
              <Button variant="outline-light" size="sm" onClick={() => setShowCart(true)} className="position-relative">
                🛒 Carrito
                {cart.length > 0 && (
                  <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle">
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </Badge>
                )}
              </Button>

              {user ? (
                <NavDropdown title={`Hola, ${role.toUpperCase()}`} id="user-dropdown" align="end">
                  <NavDropdown.Item disabled className="small text-muted">{user.email}</NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={() => supabase.auth.signOut()}>Cerrar Sesión</NavDropdown.Item>
                </NavDropdown>
              ) : (
                <Button as={Link} to="/login" variant="light" size="sm">Entrar</Button>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Offcanvas show={showCart} onHide={() => setShowCart(false)} placement="end">
        <Offcanvas.Header closeButton><Offcanvas.Title>🛒 Tu Carrito</Offcanvas.Title></Offcanvas.Header>
        <Offcanvas.Body>
          {cart.length === 0 ? <p className="text-center mt-5">Tu carrito está vacío</p> : (
            <>
              <ListGroup variant="flush">
                {cart.map(item => (
                  <ListGroup.Item key={item.id} className="d-flex justify-content-between align-items-center">
                    <div><b>{item.nombre}</b><br/><small>{item.quantity} x ${item.precio.toLocaleString()}</small></div>
                    <Button variant="outline-danger" size="sm" onClick={() => removeFromCart(item.id)}>🗑️</Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
              <div className="mt-3 border-top pt-3">
                <h5>Total: <span className="text-success">${total.toLocaleString()}</span></h5>
                <Button variant="warning" className="w-100 mt-2 fw-bold" onClick={() => alert("¡Gracias por tu compra!")}>Finalizar Compra</Button>
              </div>
            </>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default function App() {
  return (
    <CartProvider>
      <Router>
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cotizador" element={<Builder />} />
          <Route path="/mis-cotizaciones" element={<SavedBuilds />} />
          <Route path="/componentes/:tipo" element={<Components />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </CartProvider>
  );
}