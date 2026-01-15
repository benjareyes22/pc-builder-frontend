import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Spinner, Form } from 'react-bootstrap';
import { supabase } from '../supabase';
import { useCart } from '../context/CartContext';

export default function Components() {
  const { tipo } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  // --- ESTADOS DE LA IA ---
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "👋 Hola. Soy tu consultor técnico. Pregúntame si un i3 hace cuello de botella o qué fuente necesitas.", sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { fetchProducts(); }, [tipo]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatOpen]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = supabase.from('productos').select('*');
      if (tipo && tipo !== 'all') {
        const categoriaMap = {
          'gpu': 'GPU', 'cpu': 'CPU', 'ram': 'RAM', 'motherboard': 'Motherboard',
          'case': 'Case', 'psu': 'PSU', 'storage': 'Storage',
          'Case': 'Case', 'PSU': 'PSU', 'Storage': 'Storage'
        };
        const categoriaReal = categoriaMap[tipo] || tipo;
        query = query.eq('categoria', categoriaReal);
      }
      const { data } = await query;
      setProducts(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // --- CEREBRO INTELIGENTE DE LA IA ---
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const originalText = inputText;
    const t = inputText.toLowerCase().replace(/\s/g, ''); 
    
    setMessages(prev => [...prev, { text: originalText, sender: 'user' }]);
    setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      let respuesta = "";
      
      // 1. Detección de Gamas de GPU
      let gamaGPU = 0;
      if (/(\d{1,2})[89]0(ti|xt|super)?/.test(t)) gamaGPU = 3; // Serie 80/90
      else if (/(\d{1,2})70(ti|xt|super)?/.test(t)) gamaGPU = 2; // Serie 70
      else if (/(\d{1,2})[56]0(ti|xt|super)?/.test(t)) gamaGPU = 1; // Serie 50/60

      // 2. Detección de CPUs
      const esCPUBasico = t.includes("i3") || t.includes("ryzen3");
      const esCPUMedio = t.includes("i5") || t.includes("ryzen5");
      const esCPUAlto = t.includes("i7") || t.includes("i9") || t.includes("ryzen7") || t.includes("ryzen9");

      // 3. Lógica de Respuesta
      if (t.includes("cuello") || t.includes("botella")) {
          if (esCPUBasico && (t.includes("3060") || gamaGPU >= 1)) {
              respuesta = "📉 Efectivamente, un i3 o Ryzen 3 te dará cuello de botella con una RTX 3060. El procesador es muy básico para esa potencia gráfica.";
          } else if (esCPUMedio && gamaGPU === 3) {
              respuesta = "⚠️ Tendrás un cuello de botella ligero. Para una serie 80 o 90, lo ideal es un i7 o Ryzen 7.";
          } else if (esCPUAlto || (esCPUMedio && gamaGPU <= 2)) {
              respuesta = "✅ ¡Excelente combinación! No tendrás problemas de cuello de botella con esos componentes.";
          } else {
              respuesta = "Para decirte si hay cuello de botella, dime qué CPU y GPU quieres combinar.";
          }
      } 
      else if (t.includes("fuente") || t.includes("watts") || t.includes(" w")) {
          const wattsMatch = originalText.match(/(\d{3})/);
          const watts = wattsMatch ? parseInt(wattsMatch[0]) : 0;
          if (watts > 0 && watts < 500 && gamaGPU >= 1) {
              respuesta = `🛑 ${watts}W es muy poco para una serie '60' o superior. Te recomiendo mínimo 600W 80 Plus.`;
          } else {
              respuesta = "Siempre recomiendo fuentes certificadas. Para gama media, 600W está perfecto; para gama alta, busca 750W o más.";
          }
      } else {
          respuesta = "Es una buena duda. Recuerda que lo más importante es el equilibrio entre tu procesador y tu tarjeta de video.";
      }

      setMessages(prev => [...prev, { text: respuesta, sender: 'bot' }]);
      setIsTyping(false);
    }, 1000);
  };

  const placeholderImages = {
    'GPU': 'https://cdn-icons-png.flaticon.com/512/1902/1902409.png',
    'CPU': 'https://cdn-icons-png.flaticon.com/512/3474/3474360.png',
    'RAM': 'https://cdn-icons-png.flaticon.com/512/2287/2287959.png',
    'Motherboard': 'https://cdn-icons-png.flaticon.com/512/900/900618.png',
    'Case': 'https://cdn-icons-png.flaticon.com/512/3067/3067260.png',
    'PSU': 'https://cdn-icons-png.flaticon.com/512/900/900609.png',
    'Storage': 'https://cdn-icons-png.flaticon.com/512/2885/2885273.png'
  };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" variant="info" /></Container>;

  return (
    <Container className="mt-4 pb-5">
      <h2 className="text-white mb-4 border-bottom pb-2">Catálogo de Componentes</h2>
      <Row>
        {products.length > 0 ? products.map(prod => (
          <Col key={prod.id} xs={12} sm={6} md={4} lg={3} className="mb-4">
            <Card className="h-100 shadow border-0 bg-white">
              <div className="p-3 text-center bg-light">
                <Card.Img 
                  variant="top" 
                  src={prod.imagen_url || placeholderImages[prod.categoria]} 
                  style={{ height: '150px', objectFit: 'contain' }}
                />
              </div>
              <Card.Body className="d-flex flex-column text-dark">
                <Badge bg="info" className="mb-2 w-50">{prod.categoria}</Badge>
                <Card.Title className="fs-6 fw-bold">{prod.nombre}</Card.Title>
                <h5 className="text-primary mt-auto">${parseInt(prod.precio).toLocaleString()}</h5>
                <Button variant="dark" className="mt-2 w-100" onClick={() => addToCart(prod)}>🛒 Comprar</Button>
              </Card.Body>
            </Card>
          </Col>
        )) : <h4 className="text-white text-center mt-5">No hay productos disponibles</h4>}
      </Row>

      {/* CHATBOT FLOTANTE */}
      <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}>
        {!chatOpen && (
          <Button variant="info" className="rounded-circle shadow-lg p-3 fw-bold text-white" onClick={() => setChatOpen(true)}>💬 IA</Button>
        )}
        {chatOpen && (
          <Card className="shadow-lg border-0" style={{ width: '350px', height: '500px', display: 'flex', flexDirection: 'column' }}>
            <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
              <span className="fw-bold">Asistente Técnico</span>
              <Button variant="link" className="text-white p-0" onClick={() => setChatOpen(false)}>✖</Button>
            </Card.Header>
            <Card.Body className="bg-light p-3 overflow-auto" style={{ flex: 1 }}>
              {messages.map((msg, idx) => (
                <div key={idx} className={`d-flex mb-2 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div className={`p-2 rounded shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-white text-dark'}`} style={{ maxWidth: '85%', fontSize: '0.9rem' }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && <div className="text-muted small ms-2">Escribiendo...</div>}
              <div ref={chatEndRef} />
            </Card.Body>
            <Card.Footer className="p-2 bg-white">
              <Form onSubmit={handleSendMessage} className="d-flex gap-2">
                <Form.Control size="sm" placeholder="Escribe tu duda..." value={inputText} onChange={(e) => setInputText(e.target.value)} />
                <Button type="submit" variant="info" size="sm" className="text-white">➤</Button>
              </Form>
            </Card.Footer>
          </Card>
        )}
      </div>
    </Container>
  );
}