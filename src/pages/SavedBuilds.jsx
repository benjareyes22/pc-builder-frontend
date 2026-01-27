import React, { useEffect, useState } from 'react';
import { Container, Card, Button, Row, Col, Spinner, Badge } from 'react-bootstrap';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Trash2, Lock, Ghost, ArrowRight, Download, ShoppingCart, Plus,
  Cpu, CircuitBoard, MemoryStick, Gamepad2, HardDrive, Zap, Box, Monitor
} from 'lucide-react';

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
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(session.user);

      // Traemos todos los detalles (JOINs)
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
    if (!window.confirm('¿Confirmar eliminación de cotización?')) return;
    try {
      const { error } = await supabase.from('cotizaciones').delete().eq('id', id);
      if (error) throw error;
      setBuilds(builds.filter(build => build.id !== id));
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const handleBuyAll = (build) => {
    const components = [build.cpu, build.mobo, build.ram, build.gpu, build.storage, build.psu, build.case];
    let count = 0;
    components.forEach(comp => {
      if (comp) { addToCart(comp); count++; }
    });
    if(count > 0) alert(`✅ ${count} ítems agregados al carrito`);
  };

  const downloadPDF = (build) => {
    try {
      const doc = new jsPDF();
      const fecha = new Date(build.created_at).toLocaleDateString();
      // CORRECCIÓN AQUÍ: Aseguramos que el ID sea string
      const safeId = String(build.id); 

      // Header Corporativo
      doc.setFillColor(33, 37, 41); // Dark Gray
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text("PC-BUILDER AI", 14, 16);
      doc.setFontSize(10);
      doc.text("Reporte Técnico", 170, 16);

      // Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`ID Cotización: #${safeId}`, 14, 40);
      doc.text(`Fecha: ${fecha}`, 14, 48);

      const components = [
        { tipo: 'Procesador', item: build.cpu },
        { tipo: 'Gráfica', item: build.gpu },
        { tipo: 'Placa Madre', item: build.mobo },
        { tipo: 'Memoria RAM', item: build.ram },
        { tipo: 'Almacenamiento', item: build.storage },
        { tipo: 'Fuente Poder', item: build.psu },
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
        theme: 'grid',
        headStyles: { fillColor: [33, 37, 41] },
      });

      const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 150) + 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`TOTAL: $${(build.total_price || build.total || 0).toLocaleString('es-CL')}`, 14, finalY);

      doc.save(`Cotizacion_${safeId}.pdf`);
    } catch (error) {
      console.error(error);
    }
  };

  // --- FILA DE PRODUCTO SIN EMOJIS ---
  const ProductRow = ({ label, product, icon: Icon }) => {
    if (!product) return null;
    return (
      <div className="d-flex align-items-center justify-content-between p-3 mb-2 bg-white border rounded-1 shadow-sm">
        <div className="d-flex align-items-center gap-3">
          {/* Ícono técnico en gris suave */}
          <div className="text-secondary opacity-75">
            <Icon size={24} strokeWidth={1.5} />
          </div>
          <div>
            <small className="text-secondary text-uppercase fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
              {label}
            </small>
            <div className="fw-bold text-dark text-truncate" style={{ maxWidth: '220px', fontSize: '0.9rem' }}>
              {product.nombre}
            </div>
            <div className="text-muted small">
              ${parseInt(product.precio).toLocaleString('es-CL')}
            </div>
          </div>
        </div>
        <Button as={Link} to={`/producto/${product.id}`} variant="outline-dark" size="sm" className="px-3" style={{ fontSize: '0.75rem' }}>
          Ver
        </Button>
      </div>
    );
  };

  if (loading) return <div className="d-flex justify-content-center mt-5"><Spinner animation="border" /></div>;

  if (!user) {
    return (
      <Container className="py-5">
        <div className="text-center bg-white p-5 rounded-3 shadow-sm mx-auto border" style={{ maxWidth: '500px' }}>
          <Lock size={48} className="text-secondary mb-3" />
          <h3 className="fw-bold">Acceso Restringido</h3>
          <p className="text-muted">Inicia sesión para gestionar tus proyectos.</p>
          <Button as={Link} to="/login" variant="dark">Iniciar Sesión</Button>
        </div>
      </Container>
    );
  }

  if (builds.length === 0) {
    return (
      <Container className="py-5 text-center">
        <div className="bg-white p-5 rounded-3 shadow-sm border mx-auto" style={{ maxWidth: '600px' }}>
          <Ghost size={64} className="text-muted mb-3" />
          <h3>Sin proyectos guardados</h3>
          <Button as={Link} to="/cotizador" variant="primary" className="mt-3">
            Crear Nueva Cotización
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
           Mis Proyectos <Badge bg="secondary" style={{ fontSize: '0.5em', verticalAlign: 'middle' }}>{builds.length}</Badge>
        </h2>
        <Button as={Link} to="/cotizador" variant="dark" size="sm" className="d-flex align-items-center gap-2">
          <Plus size={16} /> Nuevo Proyecto
        </Button>
      </div>
      
      {builds.map((b) => (
        <Card key={b.id} className="border-0 shadow-sm mb-5 overflow-hidden rounded-3">
          <Card.Header className="bg-dark text-white py-3 px-4 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <Monitor size={20} className="text-white-50" />
              <div>
                <h5 className="mb-0 fw-bold" style={{ fontSize: '1rem' }}>{b.nombre || "Workstation Personalizada"}</h5>
                {/* CORRECCIÓN AQUÍ: String(b.id) para evitar el crash */}
                <small className="text-white-50" style={{ fontSize: '0.75rem' }}>ID: {String(b.id).slice(0,8)} • {new Date(b.created_at).toLocaleDateString()}</small>
              </div>
            </div>
            <Button variant="link" className="text-danger p-0" onClick={() => deleteBuild(b.id)}>
              <Trash2 size={18} />
            </Button>
          </Card.Header>
          <Card.Body className="bg-light p-4">
            <Row>
              <Col lg={8}>
                <Row className="g-2">
                  <Col md={6}>
                    <ProductRow label="Procesador" product={b.cpu} icon={Cpu} />
                    <ProductRow label="Placa Madre" product={b.mobo} icon={CircuitBoard} />
                    <ProductRow label="Memoria RAM" product={b.ram} icon={MemoryStick} />
                    <ProductRow label="Gráficos" product={b.gpu} icon={Gamepad2} />
                  </Col>
                  <Col md={6}>
                    <ProductRow label="Almacenamiento" product={b.storage} icon={HardDrive} />
                    <ProductRow label="Fuente de Poder" product={b.psu} icon={Zap} />
                    <ProductRow label="Gabinete" product={b.case} icon={Box} />
                  </Col>
                </Row>
              </Col>
              
              <Col lg={4} className="d-flex flex-column justify-content-center align-items-center mt-4 mt-lg-0 border-start ps-lg-5">
                <div className="text-center mb-4 w-100">
                  <div className="text-secondary text-uppercase small fw-bold mb-1">Presupuesto Total</div>
                  <div className="display-6 fw-bold text-dark">
                    ${(b.total_price || b.total || 0).toLocaleString('es-CL')}
                  </div>
                </div>
                
                <div className="d-grid gap-2 w-100">
                  <Button variant="primary" className="py-2 fw-bold d-flex align-items-center justify-content-center gap-2" onClick={() => handleBuyAll(b)}>
                      <ShoppingCart size={18} /> Agregar al Carrito
                  </Button>
                  
                  <Button variant="outline-secondary" className="py-2 fw-bold d-flex align-items-center justify-content-center gap-2" onClick={() => downloadPDF(b)}>
                      <Download size={18} /> Exportar PDF
                  </Button>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      ))}
    </Container>
  );
}