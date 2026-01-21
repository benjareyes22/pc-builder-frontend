import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { supabase } from '../supabase';
import { useCart } from '../context/CartContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiDescription, setAiDescription] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setProduct(data);
      
      // Si no hay descripción en la BD, la pedimos a la IA
      if (!data.descripcion) {
        generateAIDescription(data.nombre, data.categoria);
      } else {
        setAiDescription(data.descripcion);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 🧠 MAGIA IA: Genera descripción si no existe ---
  const generateAIDescription = async (nombre, categoria) => {
    setLoadingAI(true);
    try {
      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mensaje: "DESCRIBE_PRODUCTO", 
          contexto: `Genera una descripción técnica y atractiva (máximo 3 líneas) para vender este producto: ${nombre} (Categoría: ${categoria}).`
        }),
      });
      const data = await response.json();
      setAiDescription(data.respuesta);
    } catch (error) {
      console.error(error);
      setAiDescription("Descripción no disponible.");
    } finally {
      setLoadingAI(false);
    }
  };

  if (loading) return <Container className="mt-5 text-center"><Spinner animation="border" variant="warning" /></Container>;
  if (!product) return <Container className="mt-5"><Alert variant="danger">Producto no encontrado</Alert></Container>;

  return (
    <Container className="mt-5">
      <Button variant="outline-light" className="mb-4" onClick={() => navigate(-1)}>⬅ Volver atrás</Button>
      
      <Card className="shadow-lg border-0 overflow-hidden">
        <Row className="g-0">
          {/* COLUMNA IZQUIERDA: IMAGEN */}
          <Col md={5} className="bg-light d-flex align-items-center justify-content-center p-4">
            <img 
              src={product.imagen_url || "https://via.placeholder.com/400"} 
              alt={product.nombre} 
              className="img-fluid" 
              style={{ maxHeight: '400px', objectFit: 'contain' }}
            />
          </Col>
          
          {/* COLUMNA DERECHA: INFO */}
          <Col md={7}>
            <Card.Body className="p-5 d-flex flex-column h-100">
              <div className="mb-auto">
                <Badge bg="warning" text="dark" className="mb-2">{product.categoria}</Badge>
                <h2 className="fw-bold display-6">{product.nombre}</h2>
                <h3 className="text-primary fw-bold my-3">${parseInt(product.precio).toLocaleString('es-CL')}</h3>
                
                <hr />
                
                <h5 className="text-muted fw-bold">Descripción del Producto:</h5>
                {loadingAI ? (
                  <div className="text-muted"><Spinner size="sm" animation="grow" /> La IA está analizando este componente...</div>
                ) : (
                  <p className="lead fs-6 text-secondary">
                    {aiDescription || "Sin descripción disponible."}
                  </p>
                )}
                
                <div className="mt-3">
                  <Badge bg={product.stock > 0 ? "success" : "danger"} className="p-2">
                    {product.stock > 0 ? `En Stock: ${product.stock} un.` : "Agotado"}
                  </Badge>
                </div>
              </div>

              <div className="d-grid gap-2 mt-4">
                <Button variant="dark" size="lg" onClick={() => addToCart(product)} disabled={product.stock <= 0}>
                  🛒 Añadir al Carrito
                </Button>
              </div>
            </Card.Body>
          </Col>
        </Row>
      </Card>
    </Container>
  );
}