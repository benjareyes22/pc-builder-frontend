import React from 'react';
import { Container, Row, Col, Button, Card, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { BrainCircuit, Zap, FileDown, Search, ArrowRight, Bot } from 'lucide-react';

export default function Home() {
  return (
    <div style={{ backgroundColor: '#f0f2f5' }}>
      
      {/* --- HERO SECTION (PORTADA) --- */}
      <div className="text-white text-center py-5 position-relative overflow-hidden" style={{ 
        backgroundColor: '#111827',
        backgroundImage: 'radial-gradient(circle at top right, #1f2937 0%, #111827 100%)',
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Patrón de fondo sutil */}
        <div className="position-absolute top-0 start-0 w-100 h-100 opacity-10" style={{ 
            backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")',
            pointerEvents: 'none' 
        }}></div>

        <Container className="position-relative z-1">
          <h1 className="display-3 fw-bold mb-3 lh-1">
            Arma tu PC Gamer <br/> 
            <span className="text-warning">Sin Errores</span>
          </h1>
          <p className="lead mb-5 mx-auto text-light opacity-75" style={{ maxWidth: '700px', fontSize: '1.25rem' }}>
            Deja que nuestra **Inteligencia Artificial** analice compatibilidad, cuellos de botella y precios en tiempo real. 
            Armar tu setup nunca fue tan fácil y seguro.
          </p>
          <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
            <Button as={Link} to="/cotizador" variant="warning" size="lg" className="fw-bold px-5 py-3 d-flex align-items-center justify-content-center gap-2 shadow-lg text-dark">
              <Bot size={28} /> Asistente IA
            </Button>
            <Button as={Link} to="/componentes/all" variant="outline-light" size="lg" className="px-4 py-3 d-flex align-items-center justify-content-center gap-2">
              <Search size={24} /> Ver Catálogo
            </Button>
          </div>
          
          <div className="mt-5 text-white-50 small fw-bold">
            Compatible con AMD, Intel, NVIDIA y más • +1000 Componentes
          </div>
        </Container>
      </div>

      {/* --- CARACTERÍSTICAS (SECCIÓN CORREGIDA) --- */}
      <Container className="my-5 py-5">
        <Row className="g-4">
          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm p-4 bg-white text-center">
              {/* Icono centrado explícitamente */}
              <div className="mb-3 d-flex justify-content-center">
                <BrainCircuit size={55} className="text-primary" />
              </div>
              {/* Título bien oscuro */}
              <Card.Title className="fw-bolder h4 text-dark">IA Experta</Card.Title>
              {/* Texto oscuro y legible */}
              <Card.Text style={{ color: '#1f2937', fontWeight: '500' }}>
                Nuestro algoritmo detecta automáticamente cuellos de botella entre CPU y GPU, y te sugiere la fuente de poder exacta.
              </Card.Text>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm p-4 bg-white text-center">
              <div className="mb-3 d-flex justify-content-center">
                <Zap size={55} className="text-warning" />
              </div>
              <Card.Title className="fw-bolder h4 text-dark">Optimización Real</Card.Title>
              <Card.Text style={{ color: '#1f2937', fontWeight: '500' }}>
                Priorizamos rendimiento por dólar. Si tu presupuesto es ajustado, la IA recortará en estética para darte más FPS.
              </Card.Text>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm p-4 bg-white text-center">
              <div className="mb-3 d-flex justify-content-center">
                <FileDown size={55} className="text-success" />
              </div>
              <Card.Title className="fw-bolder h4 text-dark">Reportes PDF</Card.Title>
              <Card.Text style={{ color: '#1f2937', fontWeight: '500' }}>
                Descarga un PDF profesional con tu cotización detallada para llevar a la tienda o compartir con amigos.
              </Card.Text>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* --- CALL TO ACTION SECUNDARIO --- */}
      <div className="bg-white py-5 border-top font-dark">
        <Container>
          <Row className="align-items-center g-4">
            <Col md={6}>
               <div className="bg-light rounded-4 p-5 text-center shadow-sm border text-dark">
                  <Bot size={70} className="text-primary mb-3" />
                  <h3 className="fw-bold">¿No sabes por dónde empezar?</h3>
                  <p className="text-muted mb-0 fs-5">Dile a la IA qué juegos quieres jugar y tu presupuesto. Ella hace el resto.</p>
               </div>
            </Col>
            <Col md={6} className="ps-md-5 text-dark">
              <h2 className="fw-bold display-6 mb-3">Encuentra la pieza que falta</h2>
              <p className="text-secondary fs-5 mb-4">
                Explora nuestro catálogo completo de Tarjetas de Video, Procesadores, Gabinetes y más. Stock actualizado en tiempo real.
              </p>
              <Button as={Link} to="/componentes/all" variant="dark" size="lg" className="d-inline-flex align-items-center gap-2 px-4">
                Explorar Todo <ArrowRight size={20} />
              </Button>
            </Col>
          </Row>
        </Container>
      </div>

    </div>
  );
}