import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown, Badge, Button, Offcanvas, ListGroup } from 'react-bootstrap';
import { supabase } from './supabase'; 
import { useCart } from './context/CartContext';
import { Cpu, Home, Grid, FileText, Shield, Bot, ShoppingCart, LogIn, LogOut, User, Trash2, CheckCircle } from 'lucide-react';

// Importación de Páginas
import ProductDetail from './pages/ProductDetail';
import HomePage from './pages/Home'; 
import Login from './pages/Login';
import Register from './pages/Register';
import Builder from './pages/Builder';
import SavedBuilds from './pages/SavedBuilds';
import Components from './pages/Components';
import AdminPanel from './pages/AdminPanel';

const Navigation = () => {
  const { cart, showCart, setShowCart, removeFromCart, total } = useCart();
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
      {/* --- TRUCO CSS PARA OCULTAR LA FLECHA DEL DROPDOWN --- */}
      <style type="text/css">
        {`
          .navbar-nav .dropdown-toggle::after {
            display: none !important;
          }
        `}
      </style>

      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm py-3 sticky-top" style={{ backgroundColor: '#111827' }}>
        <Container>
          <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2 fw-bold text-white fs-4">
            <Cpu size={32} className="text-warning" /> 
            <span>PC-BUILDER AI</span>
          </Navbar.Brand>
          
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto ms-lg-4">
              <Nav.Link as={Link} to="/" className="d-flex align-items-center gap-1">
                <Home size={18} /> Inicio
              </Nav.Link>
              
              {/* DROPDOWN SIN FLECHA */}
              <NavDropdown title={<span className="d-flex align-items-center gap-1"><Grid size={18} /> Componentes</span>} id="nav-dropdown">
                <NavDropdown.Item as={Link} to="/componentes/gpu">Tarjetas Gráficas</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/componentes/cpu">Procesadores</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/componentes/motherboard">Placas Madre</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/componentes/ram">Memorias RAM</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as={Link} to="/componentes/case">Gabinetes</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/componentes/psu">Fuentes de Poder</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/componentes/storage">Almacenamiento</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as={Link} to="/componentes/all" className="fw-bold text-primary">Ver Catálogo Completo</NavDropdown.Item>
              </NavDropdown>

              <Nav.Link as={Link} to="/mis-cotizaciones" className="d-flex align-items-center gap-1">
                <FileText size={18} /> Mis Cotizaciones
              </Nav.Link>
              
              {isStaff && (
                <Nav.Link as={Link} to="/admin" className="d-flex align-items-center gap-1 text-info fw-bold ms-lg-2">
                    <Shield size={18} /> Panel Admin
                </Nav.Link>
              )}
            </Nav>

            <Nav className="gap-2 mt-3 mt-lg-0 align-items-lg-center">
              <Button as={Link} to="/cotizador" variant="warning" size="sm" className="fw-bold text-dark d-flex align-items-center gap-2 px-3 shadow-sm">
                <Bot size={20} /> Armar PC con IA
              </Button>
              
              <Button variant="outline-light" size="sm" onClick={() => setShowCart(true)} className="position-relative d-flex align-items-center gap-2 px-3">
                <ShoppingCart size={20} /> Carrito
                {cart.length > 0 && (
                  <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle border border-light">
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </Badge>
                )}
              </Button>

              <div className="vr d-none d-lg-block mx-2 bg-secondary opacity-50"></div>

              {user ? (
                <NavDropdown 
                    title={<span className="d-flex align-items-center gap-2"><div className="bg-secondary rounded-circle p-1"><User size={16} /></div> {role === 'admin' ? 'Admin' : 'Usuario'}</span>} 
                    id="user-dropdown" 
                    align="end"
                >
                  <NavDropdown.Item disabled className="small text-muted">{user.email}</NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={() => supabase.auth.signOut()} className="text-danger d-flex align-items-center gap-2">
                    <LogOut size={16} /> Cerrar Sesión
                  </NavDropdown.Item>
                </NavDropdown>
              ) : (
                <Button as={Link} to="/login" variant="primary" size="sm" className="d-flex align-items-center gap-2 px-3">
                    <LogIn size={18} /> Entrar
                </Button>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Offcanvas show={showCart} onHide={() => setShowCart(false)} placement="end">
        <Offcanvas.Header closeButton className="bg-light border-bottom">
            <Offcanvas.Title className="d-flex align-items-center gap-2">
                <ShoppingCart size={24} className="text-primary" /> Tu Carrito
            </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          {cart.length === 0 ? (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                <ShoppingCart size={64} className="mb-3 opacity-25" />
                <p>Tu carrito está vacío</p>
                <Button as={Link} to="/componentes/all" variant="outline-primary" size="sm" onClick={() => setShowCart(false)}>
                    Ver Productos
                </Button>
            </div>
          ) : (
            <div className="d-flex flex-column h-100">
              <ListGroup variant="flush" className="flex-grow-1 overflow-auto">
                {cart.map(item => (
                  <ListGroup.Item key={item.id} className="d-flex justify-content-between align-items-center p-3">
                    <div>
                        <div className="fw-bold text-dark">{item.nombre}</div>
                        <small className="text-muted">
                            {item.quantity} x <span className="text-primary">${parseInt(item.precio).toLocaleString('es-CL')}</span>
                        </small>
                    </div>
                    <Button variant="outline-danger" size="sm" className="border-0" onClick={() => removeFromCart(item.id)}>
                        <Trash2 size={18} />
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
              <div className="p-3 bg-light border-top">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="h5 mb-0 text-muted">Total:</span>
                    <span className="h4 mb-0 text-success fw-bold">${total.toLocaleString('es-CL')}</span>
                </div>
                <Button variant="success" size="lg" className="w-100 fw-bold d-flex align-items-center justify-content-center gap-2" onClick={() => alert("¡Gracias por tu compra!")}>
                    <CheckCircle size={20} /> Finalizar Compra
                </Button>
              </div>
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default function App() {
  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/cotizador" element={<Builder />} />
        <Route path="/mis-cotizaciones" element={<SavedBuilds />} />
        <Route path="/componentes/:tipo" element={<Components />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/producto/:id" element={<ProductDetail />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}