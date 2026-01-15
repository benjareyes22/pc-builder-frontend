import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Form, Modal, Badge, Nav, Card, Spinner, Row, Col } from 'react-bootstrap';
import { supabase } from '../supabase';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('inventario');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    nombre: '', precio: '', categoria: 'GPU', stock: '', imagen_url: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchInventory(), fetchUsers()]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchInventory = async () => {
    const { data } = await supabase.from('productos').select('*').order('id', { ascending: true });
    setProducts(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('perfiles').select('*').order('email', { ascending: true });
    setUsers(data || []);
  };

  const changeRole = async (userId, newRole) => {
    const { error } = await supabase.from('perfiles').update({ rol: newRole }).eq('id', userId);
    if (!error) fetchUsers();
  };

  const updateStock = async (id, currentStock, amount) => {
    const newStock = Math.max(0, currentStock + amount);
    await supabase.from('productos').update({ stock: newStock }).eq('id', id);
    fetchInventory();
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('productos').insert([{
      nombre: newProduct.nombre,
      precio: parseInt(newProduct.precio),
      stock: parseInt(newProduct.stock),
      categoria: newProduct.categoria,
      imagen_url: newProduct.imagen_url
    }]);
    
    if (!error) {
      setShowModal(false);
      fetchInventory();
      setNewProduct({ nombre: '', precio: '', categoria: 'GPU', stock: '', imagen_url: '' });
    } else {
      alert("Error: " + error.message);
    }
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" variant="warning" />
        <p className="mt-2 text-white">Cargando datos del servidor...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4 mb-5">
      <h2 className="fw-bold text-white mb-4">👨‍💼 Centro de Gestión</h2>

      <Nav variant="tabs" activeKey={activeTab} className="mb-4 custom-tabs">
        <Nav.Item>
          <Nav.Link eventKey="inventario" onClick={() => setActiveTab('inventario')}>📦 Inventario</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="usuarios" onClick={() => setActiveTab('usuarios')}>👥 Gestión de Personal</Nav.Link>
        </Nav.Item>
      </Nav>

      {activeTab === 'inventario' && (
        <>
          <div className="d-flex justify-content-between mb-3 align-items-center text-white">
            <h4>Stock de Productos</h4>
            <Button variant="success" onClick={() => setShowModal(true)}>+ Agregar Producto</Button>
          </div>
          <Card className="shadow border-0">
            <Table hover responsive className="align-middle mb-0">
              <thead className="bg-dark text-white">
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th className="text-center">Stock</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><b className="text-dark">{p.nombre}</b></td>
                    <td><Badge bg="secondary">{p.categoria}</Badge></td>
                    <td className="text-dark">${parseInt(p.precio).toLocaleString()}</td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center align-items-center gap-2">
                        <Button variant="outline-danger" size="sm" onClick={() => updateStock(p.id, p.stock, -1)}>-</Button>
                        <span className="fw-bold text-dark">{p.stock}</span>
                        <Button variant="outline-success" size="sm" onClick={() => updateStock(p.id, p.stock, 1)}>+</Button>
                      </div>
                    </td>
                    <td>
                      <Button variant="link" className="text-danger p-0" onClick={async () => {
                        if(window.confirm("¿Borrar producto?")) {
                          await supabase.from('productos').delete().eq('id', p.id);
                          fetchInventory();
                        }
                      }}>Eliminar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}

      {activeTab === 'usuarios' && (
        <>
          <h4 className="text-white mb-3">Control de Usuarios</h4>
          <Card className="shadow border-0">
            <Table hover responsive className="align-middle mb-0">
              <thead className="bg-primary text-white">
                <tr>
                  <th>Email</th>
                  <th>Rol Actual</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white text-dark">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>
                      <Badge bg={u.rol === 'admin' ? 'danger' : u.rol === 'moderador' ? 'info' : 'secondary'}>
                        {(u.rol || 'cliente').toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      {u.rol !== 'admin' && (
                        <div className="d-flex gap-2">
                          <Button variant="outline-info" size="sm" onClick={() => changeRole(u.id, 'moderador')}>Hacer Moderador</Button>
                          <Button variant="outline-secondary" size="sm" onClick={() => changeRole(u.id, 'cliente')}>Hacer Cliente</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}

      {/* MODAL DEFINITIVO Y SEGURO */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>Nuevo Producto</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateProduct}>
          <Modal.Body className="bg-white text-dark">
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Nombre</Form.Label>
              <Form.Control 
                required 
                placeholder="Nombre del componente"
                onChange={e => setNewProduct({...newProduct, nombre: e.target.value})} 
              />
            </Form.Group>

            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Precio</Form.Label>
                  <Form.Control 
                    type="number" 
                    required 
                    placeholder="0"
                    onChange={e => setNewProduct({...newProduct, precio: e.target.value})} 
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Stock</Form.Label>
                  <Form.Control 
                    type="number" 
                    required 
                    placeholder="0"
                    onChange={e => setNewProduct({...newProduct, stock: e.target.value})} 
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Categoría</Form.Label>
              <Form.Select 
                required
                value={newProduct.categoria}
                onChange={e => setNewProduct({...newProduct, categoria: e.target.value})}
              >
                <option value="GPU">Tarjeta Gráfica (GPU)</option>
                <option value="CPU">Procesador (CPU)</option>
                <option value="RAM">Memoria RAM</option>
                <option value="Motherboard">Placa Madre</option>
                <option value="PSU">Fuente de Poder</option>
                <option value="Case">Gabinete</option>
                <option value="Storage">Almacenamiento</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">URL Imagen</Form.Label>
              <Form.Control 
                required 
                placeholder="https://link-de-la-imagen.jpg"
                onChange={e => setNewProduct({...newProduct, imagen_url: e.target.value})} 
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cerrar</Button>
            <Button variant="success" type="submit">Guardar Producto</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}