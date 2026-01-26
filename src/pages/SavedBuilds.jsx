import React, { useEffect, useState } from 'react';
import { Container, Card, Button, Row, Col, Spinner, Badge } from 'react-bootstrap';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import { Trash2, FileText, Lock, Ghost, ArrowRight } from 'lucide-react';

export default function SavedBuilds() {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchBuilds();
  }, []);

  const fetchBuilds = async () => {
    try {
      setLoading(true);
      
      // 1. Revisar si hay usuario logueado
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        setLoading(false); // Dejamos de cargar inmediatamente
        return;
      }

      setUser(session.user);

      // 2. Si hay usuario, buscamos sus cotizaciones
      const { data, error } = await supabase
        .from('cotizaciones')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBuilds(data || []);

    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteBuild = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta cotización?')) return;
    
    try {
      const { error } = await supabase
        .from('cotizaciones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      // Actualizar la lista localmente
      setBuilds(builds.filter(build => build.id !== id));
    } catch (error) {
      console.error('Error eliminando:', error);
      alert('No se pudo eliminar la cotización');
    }
  };

  // --- VISTA: CARGANDO ---
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="warning" role="status">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
      </div>
    );
  }

  // --- VISTA: NO LOGUEADO (El cambio que pediste) ---
  if (!user) {
    return (
      <Container className="py-5">
        <div className="text-center bg-white p-5 rounded-4 shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
          <div className="mb-4">
            <div className="bg-light rounded-circle d-inline-flex p-4">
              <Lock size={48} className="text-secondary" />
            </div>
          </div>
          <h2 className="fw-bold text-dark mb-3">Inicia Sesión</h2>
          <p className="text-muted mb-4 fs-5">
            Necesitas una cuenta para ver y gestionar tus cotizaciones guardadas.
          </p>
          <Button as={Link} to="/register" variant="dark" size="lg" className="w-100 fw-bold">
            Ingresar o Crear Cuenta
          </Button>
        </div>
      </Container>
    );
  }

  // --- VISTA: LOGUEADO PERO SIN COTIZACIONES ---
  if (builds.length === 0) {
    return (
      <Container className="py-5 text-center">
        <div className="bg-white p-5 rounded-4 shadow-sm border mx-auto" style={{ maxWidth: '600px' }}>
          <Ghost size={64} className="text-muted mb-3" />
          <h3 className="fw-bold text-dark">No tienes cotizaciones guardadas</h3>
          <p className="text-secondary mb-4">
            ¡Aún no has armado ningún PC! Ve al asistente y crea tu primera máquina.
          </p>
          <Button as={Link} to="/cotizador" variant="warning" size="lg" className="fw-bold px-4 shadow-sm text-dark">
            <span className="d-flex align-items-center gap-2">
              Ir a Armar PC <ArrowRight size={20} />
            </span>
          </Button>
        </div>
      </Container>
    );
  }

  // --- VISTA: LISTA DE COTIZACIONES (Normal) ---
  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark mb-0">Mis Cotizaciones</h2>
        <Button as={Link} to="/cotizador" variant="dark" size="sm">
          + Nueva Cotización
        </Button>
      </div>
      
      <Row className="g-4">
        {builds.map((build) => (
          <Col key={build.id} md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm hover-card">
              <Card.Header className="bg-white border-bottom-0 pt-4 px-4 d-flex justify-content-between align-items-start">
                <Badge bg="success" className="rounded-pill px-3 py-2">
                  PC Completo
                </Badge>
                <Button 
                  variant="link" 
                  className="text-danger p-0 opacity-50 hover-opacity-100"
                  onClick={() => deleteBuild(build.id)}
                >
                  <Trash2 size={20} />
                </Button>
              </Card.Header>
              <Card.Body className="px-4 pb-4">
                <h4 className="fw-bold text-dark mb-3">
                  {new Date(build.created_at).toLocaleDateString()}
                </h4>
                <div className="mb-4">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Presupuesto:</span>
                    <span className="fw-bold text-success">${build.total_price?.toLocaleString()}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Componentes:</span>
                    <span className="fw-bold text-dark">{build.components?.length || 0}</span>
                  </div>
                </div>
                
                <div className="d-grid">
                  {/* Aquí podrías agregar un botón para "Ver detalle" o "Generar PDF" en el futuro */}
                  <Button variant="outline-dark" className="d-flex align-items-center justify-content-center gap-2">
                    <FileText size={18} /> Ver Detalle
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}