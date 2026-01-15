import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

export default function SavedBuilds() {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBuilds(); }, []);

  const fetchBuilds = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('cotizaciones').select('*').order('fecha', { ascending: false });
    if (error) console.error(error);
    else setBuilds(data || []);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if(!window.confirm("⚠ ¿Eliminar cotización?")) return;
    const { error } = await supabase.from('cotizaciones').delete().eq('id', id);
    if (!error) setBuilds(builds.filter(b => b.id !== id));
  };

  const ProductRow = ({ label, name, icon, linkCategory }) => {
    if (!name) return null;
    return (
      <div className="d-flex align-items-center justify-content-between p-2 mb-2 bg-light border rounded">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-white border text-dark rounded p-2 d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px', fontSize: '1.2rem'}}>
            {icon}
          </div>
          <div>
            <small className="text-secondary text-uppercase fw-bold" style={{ fontSize: '0.6rem' }}>{label}</small>
            <div className="fw-bold text-dark small">{name}</div>
          </div>
        </div>
        <Button as={Link} to={`/componentes/${linkCategory}`} variant="outline-primary" size="sm" style={{ fontSize: '0.7rem'}}>Ver</Button>
      </div>
    );
  };

  if (loading) return <Container className="mt-5 text-center"><Spinner animation="border" variant="warning" /></Container>;

  return (
    <Container className="mt-4 mb-5">
      <h2 className="mb-4 text-center fw-bold text-dark">
        📂 Mis Cotizaciones <Badge bg="warning" text="dark" pill>{builds.length}</Badge>
      </h2>
      {builds.length === 0 ? (
        <Alert variant="info" className="text-center py-5 shadow-sm bg-white border-0">
          <h4>Sin cotizaciones guardadas 😢</h4>
          <Button as={Link} to="/cotizador" variant="warning" className="fw-bold mt-2">🤖 Ir al Armador</Button>
        </Alert>
      ) : (
        <div className="d-flex flex-column gap-4">
          {builds.map((b) => (
            <Card key={b.id} className="border-0 shadow-sm">
              <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center py-2">
                <div><h6 className="mb-0 fw-bold text-warning">🖥️ PC Gamer - {new Date(b.fecha).toLocaleDateString()}</h6></div>
                <Button variant="danger" size="sm" onClick={() => handleDelete(b.id)}>🗑️</Button>
              </Card.Header>
              <Card.Body className="bg-white">
                <Row>
                  <Col lg={8}>
                    <Row>
                        <Col md={6}>
                            <ProductRow label="Procesador" name={b.cpu} icon="🧠" linkCategory="cpu" />
                            <ProductRow label="Placa Madre" name={b.motherboard} icon="🔌" linkCategory="motherboard" />
                            <ProductRow label="Memoria RAM" name={b.ram} icon="⚡" linkCategory="ram" />
                            <ProductRow label="Tarjeta Video" name={b.gpu} icon="🎮" linkCategory="gpu" />
                        </Col>
                        <Col md={6}>
                            <ProductRow label="Almacenamiento" name={b.almacenamiento} icon="💾" linkCategory="Storage" />
                            <ProductRow label="Fuente Poder" name={b.fuente} icon="🔋" linkCategory="PSU" />
                            <ProductRow label="Gabinete" name={b.gabinete} icon="📦" linkCategory="Case" />
                        </Col>
                    </Row>
                  </Col>
                  <Col lg={4} className="d-flex flex-column justify-content-center align-items-center border-start ps-lg-4">
                    <div className="text-center mb-3 p-3 bg-light rounded w-100 border">
                      <div className="text-muted text-uppercase small">Total</div>
                      <div className="display-6 fw-bold text-success">${b.total.toLocaleString()}</div>
                    </div>
                    <Button variant="warning" size="lg" className="w-100 mb-2 fw-bold">🛒 Comprar Todo</Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}