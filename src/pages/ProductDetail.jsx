import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { supabase } from '../supabase'; // Aquí usamos dos puntos (..) porque estamos dentro de 'pages'
import { useCart } from '../context/CartContext';
import { GoogleGenerativeAI } from "@google/generative-ai"; 

// --- CONFIGURACIÓN IA DIRECTA ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

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
      
      // Si la base de datos no tiene descripción, la pedimos a la IA
      if (!data.descripcion || data.descripcion === "Descripción no disponible") {
        // Le pasamos precio para que la descripción sea más realista
        generateAIDescription(data.nombre, data.categoria, data.precio);
      } else {
        setAiDescription(data.descripcion);
      }

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 🧠 MAGIA IA ---
  const generateAIDescription = async (nombre, categoria, precio) => {
    setLoadingAI(true);
    try {
      // Usamos el modelo que sabemos que te funciona
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        Actúa como un redactor técnico experto en hardware de PC (estilo sitio web SoloTodo).
        Genera una descripción técnica y comercial para el producto: "${nombre}" (Categoría: ${categoria}).
        Precio referencial: $${precio}.
        
        REGLAS:
        - Máximo 4 líneas de texto.
        - Destaca especificaciones técnicas clave.
        - Usa un tono profesional.
        - NO inventes datos falsos, si no sabes algo sé general pero positivo.
        - NO saludes, ve directo al grano.
      `;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      setAiDescription(response);

    } catch (error) {
      console.error("Error IA:", error);
      setAiDescription("Detalles técnicos no disponibles temporalmente.");
    } finally {
      setLoadingAI(false);
    }
  };

  if (loading) return <Container className="mt-5 text-center"><Spinner animation="border" variant="warning" /></Container>;
  if (!product) return <Container className="mt-5"><Alert variant="danger">Producto no encontrado</Alert></Container>;

  return (
    <Container className="mt-5">
      <Button variant="outline-dark" className="mb-4" onClick={() => navigate(-1)}>⬅ Volver atrás</Button>
      
      <Card className="shadow-lg border-0 overflow-hidden bg-white">
        <Row className="g-0">
          {/* COLUMNA IZQUIERDA: IMAGEN */}
          <Col md={5} className="bg-white d-flex align-items-center justify-content-center p-4 border-end">
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
                <Badge bg="warning" text="dark" className="mb-3 px-3 py-2">{product.categoria}</Badge>
                <h2 className="fw-bold mb-3">{product.nombre}</h2>
                <h3 className="text-primary fw-bold mb-4" style={{fontSize: '2rem'}}>
                    ${parseInt(product.precio).toLocaleString('es-CL')}
                </h3>
                
                <div className="p-3 bg-light rounded border mb-4">
                    <h6 className="fw-bold text-dark mb-2">Detalles Técnicos:</h6>
                    {loadingAI ? (
                    <div className="text-muted d-flex align-items-center gap-2">
                        <Spinner size="sm" animation="border" variant="primary" /> 
                        <span>Analizando especificaciones...</span>
                    </div>
                    ) : (
                    <p className="text-secondary mb-0" style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
                        {aiDescription}
                    </p>
                    )}
                </div>
                
                <div className="mt-2">
                  <Badge bg={product.stock > 0 ? "success" : "danger"} className="p-2">
                    {product.stock > 0 ? `Stock Disponible: ${product.stock} un.` : "Producto Agotado"}
                  </Badge>
                </div>
              </div>

              <div className="d-grid gap-2 mt-4">
                <Button variant="dark" size="lg" className="py-3 fw-bold" onClick={() => addToCart(product)} disabled={product.stock <= 0}>
                  Añadir al Carrito
                </Button>
              </div>
            </Card.Body>
          </Col>
        </Row>
      </Card>
    </Container>
  );
}