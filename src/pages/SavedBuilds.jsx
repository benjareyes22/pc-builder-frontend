import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SavedBuilds() {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => { fetchBuilds(); }, []);

  const fetchBuilds = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) console.error("Error cargando cotizaciones:", error);
    else setBuilds(data || []);
    
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if(!window.confirm("⚠ ¿Estás seguro de eliminar esta cotización?")) return;
    const { error } = await supabase.from('cotizaciones').delete().eq('id', id);
    if (!error) setBuilds(builds.filter(b => b.id !== id));
  };

  const handleBuyAll = (build) => {
    const components = [build.cpu, build.mobo, build.ram, build.gpu, build.storage, build.psu, build.case];
    let count = 0;
    components.forEach(comp => {
      if (comp) { addToCart(comp); count++; }
    });
    if(count > 0) alert(`✅ ¡${count} productos agregados al carrito!`);
  };

  // --- 📄 FUNCIÓN GENERAR PDF ---
  const downloadPDF = (build) => {
    try {
      const doc = new jsPDF();
      const fecha = new Date(build.created_at).toLocaleDateString();

      // Encabezado
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text("PC-BUILDER AI - Cotización Oficial", 14, 13);

      // Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Nombre: ${build.nombre || 'Sin Nombre'}`, 14, 30);
      doc.text(`Fecha: ${fecha}`, 14, 38);
      doc.text(`ID Referencia: #${build.id}`, 150, 38);

      // Tabla
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
        startY: 45,
        head: [['Componente', 'Modelo', 'Precio']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] },
      });

      // Total
      const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 150) + 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(39, 174, 96);
      doc.text(`TOTAL ESTIMADO: $${(build.total || 0).toLocaleString('es-CL')}`, 14, finalY);

      // Pie de página
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150);
      doc.text("Generado automáticamente por Inteligencia Artificial.", 14, 280);

      doc.save(`Cotizacion_${build.nombre ? build.nombre.replace(/\s+/g, '_') : 'PC'}.pdf`);
      
    } catch (error) {
      console.error("❌ Error PDF:", error);
      alert("Hubo un error al generar el PDF. Revisa la consola.");
    }
  };

  // --- COMPONENTE DE FILA (CON BOTÓN RESTAURADO) ---
  const ProductRow = ({ label, product, icon }) => {
    if (!product) return null;
    return (
      <div className="d-flex align-items-center justify-content-between p-2 mb-2 bg-light border rounded">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-white border text-dark rounded p-2 d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px', fontSize: '1.2rem'}}>
            {icon}
          </div>
          <div>
            <small className="text-secondary text-uppercase fw-bold" style={{ fontSize: '0.6rem' }}>{label}</small>
            <div className="fw-bold text-dark small">{product.nombre}</div>
            <div className="text-muted small">${parseInt(product.precio).toLocaleString('es-CL')}</div>
          </div>
        </div>
        
        {/* 👇 AQUÍ ESTÁ EL BOTÓN QUE FALTABA 👇 */}
        <Button as={Link} to={`/producto/${product.id}`} variant="outline-primary" size="sm" style={{ fontSize: '0.7rem'}}>
            Ver
        </Button>
        {/* ☝️ ------------------------------- ☝️ */}
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
                <div>
                    <h6 className="mb-0 fw-bold text-warning">{b.nombre || "PC Sin Nombre"}</h6>
                    <small className="text-white-50">{new Date(b.created_at).toLocaleDateString()}</small>
                </div>
                <Button variant="danger" size="sm" onClick={() => handleDelete(b.id)}>🗑️</Button>
              </Card.Header>
              <Card.Body className="bg-white">
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
                  <Col lg={4} className="d-flex flex-column justify-content-center align-items-center border-start ps-lg-4 mt-3 mt-lg-0">
                    <div className="text-center mb-3 p-3 bg-light rounded w-100 border">
                      <div className="text-muted text-uppercase small">Total</div>
                      <div className="display-6 fw-bold text-success">${(b.total || 0).toLocaleString('es-CL')}</div>
                    </div>
                    
                    <Button variant="warning" size="lg" className="w-100 mb-2 fw-bold shadow-sm" onClick={() => handleBuyAll(b)}>
                        🛒 Agregar Todo
                    </Button>
                    
                    <Button variant="outline-danger" className="w-100 fw-bold" onClick={() => downloadPDF(b)}>
                        📄 Descargar PDF
                    </Button>
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