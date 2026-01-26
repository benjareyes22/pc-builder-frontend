import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Spinner, Form } from 'react-bootstrap';
import { supabase } from '../supabase';
import { useCart } from '../context/CartContext';
import { GoogleGenerativeAI } from "@google/generative-ai"; // <--- GEMINI
import { Eye, ShoppingCart, MessageCircle, X, Send, Loader2, Bot, ArrowDownUp } from 'lucide-react';

// --- API KEY AQUÍ TAMBIÉN ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export default function Components() {
  const { tipo } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [sortOrder, setSortOrder] = useState(""); 

  const titulos = {
    'gpu': 'Tarjetas de Video', 'cpu': 'Procesadores', 'ram': 'Memorias RAM',
    'motherboard': 'Placas Madre', 'case': 'Gabinetes', 'psu': 'Fuentes de Poder',
    'storage': 'Almacenamiento', 'all': 'Catálogo Completo'
  };

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hola, soy tu asistente. Pregúntame sobre estos productos.", sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { fetchProducts(); }, [tipo]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatOpen, isTyping]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = supabase.from('productos').select('*');
      if (tipo && tipo !== 'all') {
        const categoriaMap = {
          'gpu': 'GPU', 'cpu': 'CPU', 'ram': 'RAM', 'motherboard': 'Motherboard',
          'case': 'Case', 'psu': 'PSU', 'storage': 'Storage'
        };
        query = query.eq('categoria', categoriaMap[tipo.toLowerCase()] || tipo);
      }
      const { data } = await query;
      setProducts(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSort = (e) => {
    const orden = e.target.value;
    setSortOrder(orden);
    let productosOrdenados = [...products];
    if (orden === 'menor') productosOrdenados.sort((a, b) => parseInt(a.precio) - parseInt(b.precio));
    else if (orden === 'mayor') productosOrdenados.sort((a, b) => parseInt(b.precio) - parseInt(a.precio));
    setProducts(productosOrdenados);
  };

  // --- IA FRONTEND ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const userMsg = inputText;
    setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
    setInputText("");
    setIsTyping(true);

    try {
      const inventarioTexto = products.length > 0 
        ? products.map(p => `- ${p.nombre}: $${parseInt(p.precio).toLocaleString('es-CL')}`).join('\n')
        : "Sin stock visible.";

      const prompt = `Actúa como vendedor experto de PC.
      Contexto: El usuario está viendo la categoría '${titulos[tipo?.toLowerCase()] || 'General'}'.
      
      PRODUCTOS EN PANTALLA:
      ${inventarioTexto}
      
      Usuario pregunta: "${userMsg}"
      
      Responde breve y útilmente recomendando SOLO productos de la lista anterior si es posible.`;

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      setMessages(prev => [...prev, { text: text, sender: 'bot' }]);

    } catch (error) {
      console.error("Error chat:", error);
      setMessages(prev => [...prev, { text: "Error de conexión.", sender: 'bot' }]);
    } finally {
      setIsTyping(false);
    }
  };

  // ... (El resto del renderizado es IGUAL, con las Cards, el return, etc.)
  // Para ahorrar espacio, mantén el return que ya tenías, solo cambió handleSendMessage e imports.
  // SI QUIERES TE MANDO EL RETURN TAMBIÉN PERO ES EL MISMO DE ANTES.
  
  // AQUI ABAJO IRIA EL RETURN COMPLETO...
  // (Usa el mismo return de tu archivo Components.jsx actual)
  
  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" variant="light" /></Container>;
  
  const tituloPagina = titulos[tipo?.toLowerCase()] || 'Catálogo de Componentes';
  const placeholderImages = { 'GPU': 'https://cdn-icons-png.flaticon.com/512/1902/1902409.png', 'CPU': 'https://cdn-icons-png.flaticon.com/512/3474/3474360.png' }; // (resumido)

  return (
    <Container className="mt-4 pb-5">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4">
        <h2 className="section-title mb-3 mb-md-0">{tituloPagina}</h2>
        <div className="d-flex align-items-center gap-2 bg-light p-2 rounded border">
          <ArrowDownUp size={16} className="text-dark" />
          <Form.Select size="sm" style={{ width: '150px' }} onChange={handleSort} value={sortOrder}>
            <option value="defecto">Relevancia</option>
            <option value="menor">Precio: Menor a Mayor</option>
            <option value="mayor">Precio: Mayor a Menor</option>
          </Form.Select>
        </div>
      </div>
      
      <Row>
        {products.length > 0 ? products.map(prod => (
          <Col key={prod.id} xs={12} sm={6} md={4} lg={3} className="mb-4">
            <Card className="h-100 shadow-lg border-0 bg-white">
              <div className="p-3 text-center bg-light">
                <Card.Img variant="top" src={prod.imagen_url || placeholderImages['CPU']} style={{ height: '150px', objectFit: 'contain' }} />
              </div>
              <Card.Body className="d-flex flex-column text-dark">
                <Badge bg="info" className="mb-2 w-50">{prod.categoria}</Badge>
                <Card.Title className="fs-6 fw-bold" style={{minHeight: '40px'}}>{prod.nombre}</Card.Title>
                <h5 className="text-primary mt-auto">${parseInt(prod.precio).toLocaleString('es-CL')}</h5>
                <div className="d-flex gap-2 mt-2 w-100">
                    <Button variant="outline-primary" className="w-50 fw-bold d-flex align-items-center justify-content-center gap-2" as={Link} to={`/producto/${prod.id}`}>
                        <Eye size={18} /> Ver
                    </Button>
                    <Button variant="dark" className="w-50 fw-bold d-flex align-items-center justify-content-center gap-2" onClick={() => addToCart(prod)}>
                        <ShoppingCart size={18} />
                    </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        )) : <h4 className="text-white text-center mt-5">No hay productos disponibles</h4>}
      </Row>

      <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}>
        {!chatOpen && (
          <Button variant="info" className="rounded-circle shadow-lg p-3 text-white d-flex align-items-center justify-content-center" style={{width: '60px', height: '60px'}} onClick={() => setChatOpen(true)}>
            <MessageCircle size={28} />
          </Button>
        )}
        {chatOpen && (
          <Card className="shadow-lg border-0" style={{ width: '350px', height: '500px', display: 'flex', flexDirection: 'column' }}>
            <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2"><Bot size={20} /><span className="fw-bold">Asistente</span></div>
              <Button variant="link" className="text-white p-0" onClick={() => setChatOpen(false)}><X size={20} /></Button>
            </Card.Header>
            <Card.Body className="bg-light p-3 overflow-auto" style={{ flex: 1 }}>
              {messages.map((msg, idx) => (
                <div key={idx} className={`d-flex mb-2 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div className={`p-2 rounded shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-white text-dark'}`} style={{ maxWidth: '85%', fontSize: '0.9rem' }}>{msg.text}</div>
                </div>
              ))}
              {isTyping && <div className="text-muted small ms-2 d-flex align-items-center gap-2"><Loader2 size={14} className="animate-spin" /> ...</div>}
              <div ref={chatEndRef} />
            </Card.Body>
            <Card.Footer className="p-2 bg-white">
              <Form onSubmit={handleSendMessage} className="d-flex gap-2">
                <Form.Control size="sm" placeholder="Consulta..." value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={isTyping} />
                <Button type="submit" variant="info" size="sm" className="text-white" disabled={isTyping}><Send size={16} /></Button>
              </Form>
            </Card.Footer>
          </Card>
        )}
      </div>
    </Container>
  );
}