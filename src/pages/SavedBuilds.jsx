import React, { useEffect, useState } from 'react';
import { Container, Card, Button, Row, Col, Spinner, Alert, Badge } from 'react-bootstrap';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext'; // Asegúrate de tener este contexto
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trash2, Lock, Ghost, ArrowRight, Download, ShoppingCart } from 'lucide-react';

export default function SavedBuilds() {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchBuilds();
  }, []);

  const fetchBuilds = async () => {
    try {
      setLoading(true);
      
      // 1. Revisar seguridad
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(session.user);

      // 2. Consulta con JOINS (La que trae los detalles)
      const { data, error } = await supabase
        .from('cotizaciones')
        .select(`
          *,
          cpu:cpu_id(*),
          gpu:gpu_id(*),
          mobo:mobo_id(*),
          ram:ram_id(*),
          storage:storage_id(*),
          psu:psu_id(*),
          case:case_id(*)
        `)
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
      const { error } = await supabase.from('cotizaciones').delete().eq('id', id);
      if (error) throw error;
      setBuilds(builds.filter(build => build.id !== id));
    } catch (error) {
      console.error('Error eliminando:', error);
      alert('No se pudo eliminar la cotización');
    }
  };

  const handleBuyAll = (build) => {
    const components = [build.cpu, build.mobo, build.ram, build.gpu, build.storage, build.psu, build.case];
    let count = 0;
    components.forEach(comp => {
      if (comp) { addToCart(comp); count++; }
    });
    if(count > 0) alert(`✅ ¡${count} productos agregados al carrito!`);
  };

  // --- FUNCIÓN PDF RESTAURADA ---
  const downloadPDF = (build) => {
    try {
      const doc = new jsPDF();
      const fecha = new Date(build.created_at).toLocaleDateString();

      // Encabezado
      doc.setFillColor(17, 24, 39); // Color oscuro (Tailwind gray-900)
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text("PC-BUILDER AI", 14, 16);
      doc.setFontSize(10);
      doc.text("Cotización Oficial", 160, 16);

      // Info Usuario
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`ID Referencia: #${build.id.slice(0, 8)}`, 14, 40);
      doc.text(`Fecha: ${fecha}`, 14, 48);

      // Preparar datos tabla
      const components = [
        { tipo: 'Procesador', item: build.cpu },
        { tipo: 'Tarjeta de Video', item: build.gpu },
        { tipo: 'Placa Madre', item: build.mobo },
        { tipo: 'Memoria RAM', item: build.ram },
        { tipo: 'Almacenamiento', item: build.storage },
        { tipo: 'Fuente de Poder', item: build.psu },
        { tipo: 'Gabinete', item: build.case },
      ];

      const tableData = components
        .filter(c => c.item)
        .map(c => [
            c.tipo, 
            c.item.nombre, 
            `$${parseInt(c.item.precio).toLocaleString('es-CL')}`
        ]);

      autoTable(doc, {
        startY: 55,
        head: [['Componente', 'Modelo', 'Precio']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }, // Azul bonito
      });

      // Total
      const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 150) + 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 163, 74); // Verde
      doc.text(`TOTAL FINAL: $${(build.total_price || build.total || 0).toLocaleString('es-CL')}`, 14, finalY);

      // Footer
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("Generado por Inteligencia Artificial - PC-Builder AI", 14, 280);

      doc.save(`Cotizacion_${fecha}.pdf`);
      
    } catch (error) {
      console.error("❌ Error PDF:", error);
      alert("Hubo un error al generar el PDF.");
    }
  };

  // --- SUB-COMPONENTE PARA FILAS ---
  const ProductRow = ({ label, product, icon }) => {
    if (!product) return null;
    return (
      <div className="d-flex align-items-center justify-content-between p-2 mb-2 bg-light border rounded-3">
        <div className="d-flex align-items-center gap-3">
          <div className="fs-4">{icon}</div>
          <div>
            <small className="text-secondary text-uppercase fw-bold" style={{ fontSize: '0.65rem' }}>{label}</small>
            <div className="fw-bold text-dark small text-truncate" style={{ maxWidth: '200px' }}>{product.nombre}</div>
            <div className="text-muted small">${parseInt(product.precio).toLocaleString('es-CL')}</div>
          </div>
        </div>
        <Button as={Link} to={`/producto/${product.id}`} variant="outline-primary" size="sm" style={{ fontSize: '0.7rem' }}>
          Ver
        </Button>
      </div>
    );
  };

  // --- RENDERIZADO ---

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="warning" />
      </div>
    );
  }

  // 1. VISTA BLOQUEADA (NO LOGUEADO)
  if (!user) {
    return (
      <Container className="py-5">
        <div className="text-center bg-white p-5 rounded-4 shadow-sm mx-auto border" style={{ maxWidth: '500px' }}>
          <div className="mb-4">
            <div className="bg-light rounded-circle d-inline-flex p-4">
              <Lock size={48} className="text-secondary" />
            </div>
          </div>
          <h2 className="fw-bold text-dark mb-3">Inicia Sesión</h2>
          <p className="text-muted mb-4 fs-5">
            Necesitas una cuenta para ver tus cotizaciones guardadas.
          </p>
          <Button as={Link} to="/register" variant="dark" size="lg" className="w-100 fw-bold">
            Ingresar o Crear Cuenta
          </Button>
        </div>
      </Container>
    );
  }

  // 2. VISTA LOGUEADO PERO VACÍO
  if (builds.length === 0) {
    return (
      <Container className="py-5 text-center">
        <div className="bg-white p-5 rounded-4 shadow-sm border mx-auto" style={{ maxWidth: '600px' }}>
          <Ghost size={64} className="text-muted mb-3" />
          <h3 className="fw-bold text-dark">No tienes cotizaciones</h3>
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

  // 3. VISTA COMPLETA (TU DISEÑO ORIGINAL)
  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark mb-0">
          📂 Mis Cotizaciones <Badge bg="warning" text="dark" pill>{builds.length}</Badge>
        </h2>
        <Button as={Link} to="/cotizador" variant="dark" size="sm">
          + Nueva Cotización
        </Button>
      </div>
      
      {builds.map((b) => (
        <Card key={b.id} className="border-0 shadow-sm mb-4 overflow-hidden">
          <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center py-3 px-4">
            <div>
              <h5 className="mb-0 fw-bold text-warning">🖥️ {b.nombre || "PC Gamer Personalizado"}</h5>
              <small className="text-white-50">Creado el {new Date(b.created_at).toLocaleDateString()}</small>
            </div>
            <Button variant="danger" size="sm" onClick={() => deleteBuild(b.id)} title="Eliminar">
              <Trash2 size={18} />
            </Button>
          </Card.Header>
          <Card.Body className="bg-white p-4">
            <Row>
              <Col lg={8}>
                <Row>
                  <Col md={6}>
                    <ProductRow label="Procesador" product={b.cpu} icon="🧠" />
                    <ProductRow label="Placa Madre" product={b.mobo} icon="🔌" />
                    <ProductRow label="Memoria RAM" product={b.ram} icon="⚡" />
                    <ProductRow label="Tarjeta Video" product={b.gpu} icon="🎮" />
                  </Col>
                  <Col md={6}>
                    <ProductRow label="Almacenamiento" product={b.storage} icon="💾" />
                    <ProductRow label="Fuente Poder" product={b.psu} icon="🔋" />
                    <ProductRow label="Gabinete" product={b.case} icon="📦" />
                  </Col>
                </Row>
              </Col>
              
              <Col lg={4} className="d-flex flex-column justify-content-center align-items-center border-start ps-lg-4 mt-4 mt-lg-0">
                <div className="text-center mb-4 p-3 bg-light rounded-3 w-100 border">
                  <div className="text-muted text-uppercase small fw-bold">Total Estimado</div>
                  <div className="display-6 fw-bold text-success">
                    ${(b.total_price || b.total || 0).toLocaleString('es-CL')}
                  </div>
                </div>
                
                <Button variant="warning" size="lg" className="w-100 mb-3 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2" onClick={() => handleBuyAll(b)}>
                    <ShoppingCart size={20} /> Agregar al Carrito
                </Button>
                
                <Button variant="outline-dark" className="w-100 fw-bold d-flex align-items-center justify-content-center gap-2" onClick={() => downloadPDF(b)}>
                    <Download size={20} /> Descargar PDF
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      ))}
    </Container>
  );
}