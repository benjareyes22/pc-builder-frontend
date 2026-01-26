import React, { useEffect, useState } from 'react';
import { Container, Card, Button, Row, Col, Spinner, Badge } from 'react-bootstrap';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // <--- 1. CAMBIO AQUÍ: Importamos la función directa
import { 
  Trash2, ShoppingCart, FileDown, Eye, FolderOpen,
  Cpu, CircuitBoard, Zap, Gamepad2, HardDrive, Battery, Box, Monitor
} from 'lucide-react';

export default function SavedBuilds() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const categoryIcons = {
    'Procesador': <Cpu size={20} className="text-danger" />, 'CPU': <Cpu size={20} className="text-danger" />,
    'Placa Madre': <CircuitBoard size={20} className="text-secondary" />, 'Motherboard': <CircuitBoard size={20} className="text-secondary" />,
    'Memoria RAM': <Zap size={20} className="text-warning" />, 'RAM': <Zap size={20} className="text-warning" />,
    'Tarjeta Video': <Gamepad2 size={20} className="text-success" />, 'GPU': <Gamepad2 size={20} className="text-success" />,
    'Almacenamiento': <HardDrive size={20} className="text-primary" />, 'Storage': <HardDrive size={20} className="text-primary" />,
    'Fuente Poder': <Battery size={20} className="text-info" />, 'PSU': <Battery size={20} className="text-info" />,
    'Gabinete': <Box size={20} className="text-dark" />, 'Case': <Box size={20} className="text-dark" />
  };

  useEffect(() => {
    if (user) fetchCotizaciones();
  }, [user]);

  const fetchCotizaciones = async () => {
    try {
      setLoading(true);
      
      const { data: cotizacionesData, error } = await supabase
        .from('cotizaciones')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!cotizacionesData || cotizacionesData.length === 0) {
        setCotizaciones([]);
        return;
      }

      const productIds = new Set();
      cotizacionesData.forEach(c => {
        if (c.cpu_id) productIds.add(c.cpu_id);
        if (c.gpu_id) productIds.add(c.gpu_id);
        if (c.mobo_id) productIds.add(c.mobo_id);
        if (c.ram_id) productIds.add(c.ram_id);
        if (c.storage_id) productIds.add(c.storage_id);
        if (c.psu_id) productIds.add(c.psu_id);
        if (c.case_id) productIds.add(c.case_id);
      });

      const { data: productosReales } = await supabase
        .from('productos')
        .select('*')
        .in('id', Array.from(productIds));

      const productosMap = {};
      productosReales?.forEach(p => { productosMap[p.id] = p; });

      const cotizacionesFormateadas = cotizacionesData.map(c => {
        const misProductos = [];
        if (c.cpu_id && productosMap[c.cpu_id]) misProductos.push(productosMap[c.cpu_id]);
        if (c.mobo_id && productosMap[c.mobo_id]) misProductos.push(productosMap[c.mobo_id]);
        if (c.ram_id && productosMap[c.ram_id]) misProductos.push(productosMap[c.ram_id]);
        if (c.gpu_id && productosMap[c.gpu_id]) misProductos.push(productosMap[c.gpu_id]);
        if (c.storage_id && productosMap[c.storage_id]) misProductos.push(productosMap[c.storage_id]);
        if (c.psu_id && productosMap[c.psu_id]) misProductos.push(productosMap[c.psu_id]);
        if (c.case_id && productosMap[c.case_id]) misProductos.push(productosMap[c.case_id]);

        return {
          id: c.id,
          nombre_cotizacion: c.nombre,
          fecha_creacion: c.created_at,
          total: c.total,
          productos: misProductos
        };
      });

      setCotizaciones(cotizacionesFormateadas);

    } catch (error) {
      console.error("Error cargando cotizaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteCotizacion = async (id) => {
    if (!window.confirm("¿Borrar cotización?")) return;
    const { error } = await supabase.from('cotizaciones').delete().eq('id', id);
    if (!error) setCotizaciones(prev => prev.filter(c => c.id !== id));
  };

  const addAllToCart = (productos) => {
    productos.forEach(prod => addToCart(prod));
    alert("¡Componentes agregados al carrito! 🛒");
  };

  // --- FUNCIÓN PDF CORREGIDA ---
  const generatePDF = (cotizacion) => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setTextColor(28, 47, 135); 
      doc.text("PC-BUILDER AI - Cotización", 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Nombre: ${cotizacion.nombre_cotizacion}`, 14, 32);
      doc.text(`Fecha: ${new Date(cotizacion.fecha_creacion).toLocaleDateString()}`, 14, 38);
      
      doc.setFontSize(14);
      doc.setTextColor(229, 101, 3); 
      doc.text(`Total: $${parseInt(cotizacion.total).toLocaleString('es-CL')}`, 14, 48);

      const tableRows = cotizacion.productos.map(prod => [
        prod.categoria,
        prod.nombre,
        `$${parseInt(prod.precio).toLocaleString('es-CL')}`
      ]);

      // 2. CAMBIO AQUÍ: Usamos autoTable(doc, ...) en vez de doc.autoTable(...)
      autoTable(doc, {
        head: [["Categoría", "Producto", "Precio"]],
        body: tableRows,
        startY: 55,
        theme: 'grid',
        headStyles: { fillColor: [28, 47, 135] }
      });

      doc.save(`cotizacion_${cotizacion.nombre_cotizacion.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Error PDF Detallado:", error);
      alert("Error al generar PDF: " + error.message);
    }
  };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" variant="light" /></Container>;

  return (
    <Container className="mt-4 pb-5">
      <div className="text-center mb-4">
        <h2 className="section-title d-inline-flex align-items-center gap-2" style={{color: '#1c2f87', fontWeight: 'bold'}}>
            <FolderOpen size={28} /> Mis Cotizaciones
            <Badge bg="light" text="dark" pill className="fs-6 ms-2">{cotizaciones.length}</Badge>
        </h2>
      </div>

      {cotizaciones.length === 0 ? (
        <div className="text-center mt-5 p-5 bg-light rounded shadow text-dark">
            <Monitor size={48} className="mb-3 text-muted"/>
            <h4>No tienes cotizaciones guardadas.</h4>
            <Button as={Link} to="/cotizador" variant="primary" className="mt-3">Ir a Armar PC</Button>
        </div>
      ) : (
        cotizaciones.map(cot => (
          <Card key={cot.id} className="mb-4 shadow-lg border-0 overflow-hidden">
            <Card.Header className="d-flex justify-content-between align-items-center py-3" style={{backgroundColor: '#e56503', color: '#1c2f87'}}>
              <div>
                <h5 className="mb-0 fw-bold text-white">{cot.nombre_cotizacion}</h5>
                <small className="text-white-50">{new Date(cot.fecha_creacion).toLocaleDateString()}</small>
              </div>
              <Button variant="danger" size="sm" onClick={() => deleteCotizacion(cot.id)}><Trash2 size={18} /></Button>
            </Card.Header>
            <Card.Body className="bg-light">
              <Row>
                <Col md={8}>
                  <Row>
                    {cot.productos.map((prod, index) => (
                      <Col md={6} key={index} className="mb-3">
                        <Card className="h-100 shadow-sm border-0">
                          <Card.Body className="d-flex align-items-center p-2">
                            <div className="me-3 text-muted">{categoryIcons[prod.categoria] || <Box size={20} />}</div>
                            <div className="flex-grow-1">
                              <small className="fw-bold text-muted" style={{fontSize: '0.7rem'}}>{prod.categoria}</small>
                              <h6 className="mb-0 text-truncate" style={{maxWidth: '200px'}} title={prod.nombre}>{prod.nombre}</h6>
                              <span className="text-primary fw-bold">${parseInt(prod.precio).toLocaleString('es-CL')}</span>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Col>
                <Col md={4} className="d-flex flex-column justify-content-center align-items-center bg-white p-3 rounded border">
                    <h5 className="text-muted mb-1">TOTAL</h5>
                    <h2 className="text-success fw-bold mb-3">${parseInt(cot.total).toLocaleString('es-CL')}</h2>
                    <Button variant="warning" className="w-100 mb-2 fw-bold" onClick={() => addAllToCart(cot.productos)}>
                        <ShoppingCart size={18} className="me-2"/> Agregar al Carrito
                    </Button>
                    <Button variant="outline-danger" className="w-100 fw-bold" onClick={() => generatePDF(cot)}>
                        <FileDown size={18} className="me-2"/> PDF
                    </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        ))
      )}
    </Container>
  );
}