import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom'; // <--- 1. AGREGAMOS "Link" AQUÍ
import { Container, Row, Col, Card, Button, Badge, Spinner, Form } from 'react-bootstrap';
import { supabase } from '../supabase';
import { useCart } from '../context/CartContext';

export default function Components() {
  const { tipo } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [sortOrder, setSortOrder] = useState(""); 

  // --- MAPA DE TÍTULOS ---
  const titulos = {
    'gpu': '🎮 Tarjetas de Video',
    'cpu': '🧠 Procesadores',
    'ram': '⚡ Memorias RAM',
    'motherboard': '🔌 Placas Madre',
    'case': '📦 Gabinetes',
    'psu': '🔋 Fuentes de Poder',
    'storage': '💾 Almacenamiento',
    'all': '📚 Catálogo Completo'
  };

  // --- ESTADOS DE LA IA ---
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "👋 ¡Hola! Soy el vendedor inteligente. Pregúntame qué producto te conviene de nuestro stock actual.", sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { fetchProducts(); }, [tipo]);
  
  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages, chatOpen, isTyping]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = supabase.from('productos').select('*');
      
      if (tipo && tipo !== 'all') {
        const categoriaMap = {
          'gpu': 'GPU', 'cpu': 'CPU', 'ram': 'RAM', 'motherboard': 'Motherboard',
          'case': 'Case', 'psu': 'PSU', 'storage': 'Storage'
        };
        const key = tipo.toLowerCase();
        const categoriaReal = categoriaMap[key] || tipo;
        query = query.eq('categoria', categoriaReal);
      }
      
      const { data } = await query;
      setProducts(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSort = (e) => {
    const orden = e.target.value;
    setSortOrder(orden);

    let productosOrdenados = [...products];

    if (orden === 'menor') {
      productosOrdenados.sort((a, b) => parseInt(a.precio) - parseInt(b.precio));
    } else if (orden === 'mayor') {
      productosOrdenados.sort((a, b) => parseInt(b.precio) - parseInt(a.precio));
    }
    
    setProducts(productosOrdenados);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const userMsg = inputText;
    setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
    setInputText("");
    setIsTyping(true);

    try {
      const inventarioTexto = products.length > 0 
        ? products.map(p => `- ${p.nombre} (${p.categoria}): $${parseInt(p.precio).toLocaleString('es-CL')}`).join('\n')
        : "No hay productos visibles.";

      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mensaje: userMsg,
          contexto: `Categoría: '${titulos[tipo?.toLowerCase()] || 'General'}'.\n\nINVENTARIO EN PANTALLA:\n${inventarioTexto}`
        }),
      });

      if (!response.ok) throw new Error("Error del servidor");
      const data = await response.json();
      setMessages(prev => [...prev, { text: data.respuesta, sender: 'bot' }]);

    } catch (error) {
      setMessages(prev => [...prev, { text: "💀 Error de conexión.", sender: 'bot' }]);
    } finally {
      setIsTyping(false);
    }
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

  const tituloPagina = titulos[tipo?.toLowerCase()] || 'Catálogo de Componentes';

  return (
    <Container className="mt-4 pb-5">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 border-bottom pb-2">
        <h2 className="text-white fw-bold mb-3 mb-md-0">{tituloPagina}</h2>
        
        <div className="d-flex align-items-center gap-2">
          <span className="text-white-50 small">Ordenar por:</span>
          <Form.Select size="sm" style={{ width: '200px' }} onChange={handleSort} value={sortOrder}>
            <option value="defecto">Relevancia</option>
            <option value="menor">Precio: Menor a Mayor 📉</option>
            <option value="mayor">Precio: Mayor a Menor 📈</option>
          </Form.Select>
        </div>
      </div>
      
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
                <Card.Title className="fs-6 fw-bold" style={{minHeight: '40px'}}>{prod.nombre}</Card.Title>
                <h5 className="text-primary mt-auto">${parseInt(prod.precio).toLocaleString('es-CL')}</h5>
                
                {/* 👇 2. AQUI ESTÁ EL CAMBIO: BOTONES DOBLES 👇 */}
                <div className="d-flex gap-2 mt-2 w-100">
                    <Button variant="outline-primary" className="w-50 fw-bold" as={Link} to={`/producto/${prod.id}`}>
                        👁️ Ver
                    </Button>
                    <Button variant="dark" className="w-50 fw-bold" onClick={() => addToCart(prod)}>
                        🛒
                    </Button>
                </div>
                {/* ☝️ ------------------------------------- ☝️ */}

              </Card.Body>
            </Card>
          </Col>
        )) : <h4 className="text-white text-center mt-5">No hay productos disponibles en esta categoría</h4>}
      </Row>

      {/* CHATBOT */}
      <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}>
        {!chatOpen && (
          <Button variant="info" className="rounded-circle shadow-lg p-3 fw-bold text-white" onClick={() => setChatOpen(true)}>💬 IA</Button>
        )}
        {chatOpen && (
          <Card className="shadow-lg border-0" style={{ width: '350px', height: '500px', display: 'flex', flexDirection: 'column' }}>
            <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
              <span className="fw-bold">Asistente de Ventas</span>
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
              {isTyping && <div className="text-muted small ms-2">Consultando stock... 📦</div>}
              <div ref={chatEndRef} />
            </Card.Body>
            <Card.Footer className="p-2 bg-white">
              <Form onSubmit={handleSendMessage} className="d-flex gap-2">
                <Form.Control size="sm" placeholder="Consulta sobre estos productos..." value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={isTyping} />
                <Button type="submit" variant="info" size="sm" className="text-white" disabled={isTyping}>➤</Button>
              </Form>
            </Card.Footer>
          </Card>
        )}
      </div>
    </Container>
  );
}