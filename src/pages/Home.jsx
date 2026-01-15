import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      {/* --- HERO SECTION (Banner Principal) --- */}
      <div className="bg-dark text-white text-center py-5" style={{ 
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url("https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=2574&auto=format&fit=crop")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Container>
          <h1 className="display-3 fw-bold mb-3">Arma tu PC Gamer con <span className="text-warning">Inteligencia Artificial</span></h1>
          <p className="lead mb-4 mx-auto" style={{ maxWidth: '700px' }}>
            Olvídate de los problemas de compatibilidad. Nuestro asistente virtual analiza cada componente para asegurar que tu máquina funcione al 100% sin cuellos de botella.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Button as={Link} to="/cotizador" variant="warning" size="lg" className="fw-bold px-5 text-dark">
              🤖 Armar PC Ahora
            </Button>
            <Button as={Link} to="/register" variant="outline-light" size="lg" className="px-4">
              Crear Cuenta
            </Button>
          </div>
        </Container>
      </div>

      {/* --- CARACTERÍSTICAS (Ventajas) --- */}
      <Container className="my-5">
        <Row className="text-center g-4">
          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm p-3 hover-effect">
              <div className="display-4 text-warning mb-3">🧠</div>
              <Card.Title className="fw-bold text-dark">IA Experta</Card.Title>
              <Card.Text className="text-secondary">
                Detecta automáticamente si tu procesador y gráfica hacen cuello de botella o si la fuente de poder es insuficiente.
              </Card.Text>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm p-3 hover-effect">
              <div className="display-4 text-warning mb-3">⚡</div>
              <Card.Title className="fw-bold text-dark">Rápido y Fácil</Card.Title>
              <Card.Text className="text-secondary">
                Selecciona tus piezas en menús intuitivos. No necesitas ser un experto en hardware para armar una bestia.
              </Card.Text>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm p-3 hover-effect">
              <div className="display-4 text-warning mb-3">📄</div>
              <Card.Title className="fw-bold text-dark">Exporta a PDF</Card.Title>
              <Card.Text className="text-secondary">
                Guarda tus cotizaciones en tu perfil o descárgalas en PDF listas para ir a comprar a la tienda.
              </Card.Text>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* --- LLAMADO A LA ACCIÓN SECUNDARIO --- */}
      {/* AQUÍ ESTABA EL ERROR: Agregué 'text-dark' para que las letras se vean negras sobre el fondo blanco */}
      <div className="bg-light py-5 text-dark">
        <Container>
          <Row className="align-items-center">
            <Col md={6}>
              <img 
                src="https://cdn-icons-png.flaticon.com/512/3067/3067260.png" 
                alt="PC Gamer" 
                className="img-fluid d-none d-md-block mx-auto"
                style={{ maxHeight: '250px' }}
              />
            </Col>
            <Col md={6}>
              <h2 className="fw-bold text-dark">¿Buscas una pieza específica?</h2>
              <p className="text-secondary"> {/* Usamos text-secondary para un gris oscuro legible */}
                Explora nuestro catálogo completo de Tarjetas de Video, Procesadores, Gabinetes y más. Tenemos stock actualizado.
              </p>
              <Button as={Link} to="/componentes/all" variant="dark">
                Ver Catálogo Completo
              </Button>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
}