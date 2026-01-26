import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Form, Card, Button, Spinner, InputGroup } from 'react-bootstrap';
import { supabase } from '../supabase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GoogleGenerativeAI } from "@google/generative-ai"; 
import { Shield, Zap, Bot, Save, ShoppingCart, Send, Loader2 } from 'lucide-react';

// API Key protegida
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export default function Builder() {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [categoriasData, setCategoriasData] = useState({});
  const [loading, setLoading] = useState(true);
  const [seleccionados, setSeleccionados] = useState({});
  const [total, setTotal] = useState(0);
  const [nombreCotizacion, setNombreCotizacion] = useState("");
  
  // Chat IA
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
      { role: 'assistant', content: "¡Hola! Soy tu Asesor Experto en Hardware. Cuéntame qué uso le darás al PC (ej: Gaming, Edición, Oficina) y tu presupuesto aproximado. Yo me encargo del resto." }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { calcularTotal(); }, [seleccionados]);
  useEffect(() => { scrollToBottom(); }, [chatMessages]);

  const fetchData = async () => {
      setLoading(true);
      const cats = ['CPU', 'Motherboard', 'RAM', 'GPU', 'Storage', 'PSU', 'Case'];
      const dataMap = {};
      for (const cat of cats) {
        const { data } = await supabase.from('productos').select('*').eq('categoria', cat);
        dataMap[cat] = data || [];
      }
      setCategoriasData(dataMap);
      setLoading(false);
  };

  const handleSelect = (categoria, productoId) => {
      const producto = categoriasData[categoria].find(p => p.id === parseInt(productoId));
      setSeleccionados(prev => ({ ...prev, [categoria]: producto }));
  };

  const calcularTotal = () => {
      let sum = 0;
      Object.values(seleccionados).forEach(prod => { if (prod) sum += parseInt(prod.precio); });
      setTotal(sum);
  };

  const handleSave = async () => {
    if (!user) return alert("Inicia sesión para guardar.");
    const nombre = prompt("Nombre de la cotización:", nombreCotizacion || "Mi PC");
    if (!nombre) return;

    const productosGuardar = Object.values(seleccionados).filter(p => p !== undefined);
    if (productosGuardar.length === 0) return alert("Selecciona componentes primero.");

    const cotizacionObj = {
        user_id: user.id,
        nombre: nombre,
        total: total,
        created_at: new Date(),
        cpu_id: seleccionados['CPU']?.id || null,
        mobo_id: seleccionados['Motherboard']?.id || null,
        ram_id: seleccionados['RAM']?.id || null,
        gpu_id: seleccionados['GPU']?.id || null,
        storage_id: seleccionados['Storage']?.id || null,
        psu_id: seleccionados['PSU']?.id || null,
        case_id: seleccionados['Case']?.id || null
    };

    const { error } = await supabase.from('cotizaciones').insert([cotizacionObj]);
    if (error) { console.error(error); alert("Error al guardar."); } 
    else { alert("¡Cotización guardada!"); setSeleccionados({}); }
  };

  const handleAddToCart = () => {
    const productosAgregar = Object.values(seleccionados).filter(p => p !== undefined);
    if (productosAgregar.length === 0) return alert("Selecciona componentes.");
    productosAgregar.forEach(prod => addToCart(prod));
    alert("Agregado al carrito.");
  };

  const handleChatSubmit = async (e) => {
      e.preventDefault();
      if (!chatInput.trim()) return;

      const userMessage = { role: 'user', content: chatInput };
      setChatMessages(prev => [...prev, userMessage]);
      setChatInput("");
      setIsChatLoading(true);

      try {
          // Contexto para la IA
          let inventarioContext = "--- INVENTARIO DISPONIBLE (ID | NOMBRE | PRECIO) ---\n";
          for (const [cat, prods] of Object.entries(categoriasData)) {
              inventarioContext += `\nCATEGORÍA: ${cat}\n`;
              prods.forEach(p => {
                  inventarioContext += `- ID:${p.id} | ${p.nombre} | $${parseInt(p.precio).toLocaleString('es-CL')}\n`;
              });
          }
          
          inventarioContext += `
          \n--- ROL ---
          Actúa como un Asesor Técnico Senior de PC-Builder AI. Tu tono debe ser profesional, útil y persuasivo.
          
          --- OBJETIVO ---
          Recomendar una configuración de PC COMPLETA basada estrictamente en el inventario de arriba y la solicitud del usuario.
          
          --- REGLAS IMPORTANTES ---
          1. SOLO recomienda productos que estén en la lista de "INVENTARIO DISPONIBLE".
          2. Si el presupuesto del usuario es bajo, prioriza rendimiento sobre estética.
          3. Si el usuario pide algo imposible con el stock actual, explícalo amablemente.
          4. Justifica brevemente la elección de CPU y GPU.
          5. **IMPORTANTE:** NUNCA menciones "JSON", "IDs", "código" o "bloques ocultos" en tu respuesta de texto. Si te falta información para armar el PC, solo pídela amablemente.
          
          --- FORMATO DE RESPUESTA ---
          - Parte 1 (Texto Visible): Saluda y explica la configuración (o pide más datos).
          - Parte 2 (Código Oculto): SOLO SI RECOMIENDAS PIEZAS, agrega al final un bloque JSON estricto.
          
          El bloque JSON debe verse EXACTAMENTE así (no lo expliques, solo ponlo):
          JSON_START
          {
            "CPU": 12,
            "Motherboard": 45,
            "RAM": 32,
            "GPU": 55,
            "Storage": 22,
            "PSU": 10,
            "Case": 5
          }
          JSON_END
          
          --- MENSAJE DEL USUARIO ---
          "${chatInput}"`;

          // USANDO EL MODELO QUE TE FUNCIONA
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const result = await model.generateContent(inventarioContext);
          const responseText = result.response.text();

          let finalText = responseText;
          const jsonMatch = responseText.match(/JSON_START([\s\S]*?)JSON_END/);
          
          if (jsonMatch && jsonMatch[1]) {
              finalText = responseText.replace(/JSON_START[\s\S]*?JSON_END/, "").trim();
              try {
                  const selectionData = JSON.parse(jsonMatch[1]);
                  const nuevaSeleccion = { ...seleccionados };
                  let itemsEncontrados = 0;
                  
                  for (const [cat, id] of Object.entries(selectionData)) {
                      const producto = categoriasData[cat]?.find(p => p.id === parseInt(id));
                      if (producto) {
                          nuevaSeleccion[cat] = producto;
                          itemsEncontrados++;
                      }
                  }
                  
                  if (itemsEncontrados > 0) {
                      setSeleccionados(nuevaSeleccion);
                      finalText += "\n\n✅ ¡He actualizado la tabla con las piezas recomendadas!";
                  }
              } catch (err) { console.error("Error JSON:", err); }
          }

          setChatMessages(prev => [...prev, { role: 'assistant', content: finalText }]);

      } catch (error) {
          console.error("Error Gemini:", error);
          setChatMessages(prev => [...prev, { role: 'assistant', content: "Lo siento, tuve un problema de conexión. Intenta de nuevo." }]);
      } finally {
          setIsChatLoading(false);
      }
  };

  const scrollToBottom = () => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" variant="info" /></Container>;

  const categoriasMap = { 'CPU': 'Procesador', 'Motherboard': 'Placa Madre', 'RAM': 'RAM', 'GPU': 'Video', 'Storage': 'Disco', 'PSU': 'Fuente', 'Case': 'Gabinete' };

  return (
    <Container className="mt-4 pb-5">
        <h2 className="section-title text-center mb-4 d-flex align-items-center justify-content-center gap-2" style={{color: '#1c2f87'}}>
            <Shield size={28} /> Armador de PC Inteligente
        </h2>

        <Row className="h-100 align-items-stretch"> 
            <Col md={8} className="mb-4 mb-md-0">
                <Card className="shadow-lg border-0 h-100">
                    <Card.Header className="text-white fw-bold py-3" style={{backgroundColor: '#e56503'}}>Componentes</Card.Header>
                    <Card.Body className="p-4 bg-light">
                        <Form>
                            {Object.entries(categoriasMap).map(([key, label]) => (
                                <Form.Group key={key} className="mb-3">
                                    <Form.Label className="fw-bold text-dark">{label}</Form.Label>
                                    <Form.Select 
                                        value={seleccionados[key]?.id || ""} 
                                        onChange={(e) => handleSelect(key, e.target.value)}
                                        className="border-secondary shadow-sm"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {categoriasData[key]?.map(prod => (
                                            <option key={prod.id} value={prod.id}>
                                                {prod.nombre} - ${parseInt(prod.precio).toLocaleString('es-CL')}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            ))}
                        </Form>
                    </Card.Body>
                    <Card.Footer className="bg-white p-3 d-flex flex-column gap-3 mt-auto">
                        <div className="bg-dark text-white p-3 rounded text-center fw-bold fs-4 shadow-sm">
                            Total: ${total.toLocaleString('es-CL')}
                        </div>
                        <div className="d-flex gap-3">
                            <Button variant="secondary" size="lg" className="w-50 fw-bold d-flex align-items-center justify-content-center gap-2" onClick={handleSave}>
                                <Save size={20} /> Guardar
                            </Button>
                            <Button variant="success" size="lg" className="w-50 fw-bold d-flex align-items-center justify-content-center gap-2" onClick={handleAddToCart}>
                                <ShoppingCart size={20} /> Carrito
                            </Button>
                        </div>
                    </Card.Footer>
                </Card>
            </Col>

            <Col md={4} className="d-flex flex-column">
                <Card className="shadow-lg border-0 bg-white h-100 w-100">
                    <Card.Header className="text-white fw-bold py-3 d-flex align-items-center gap-2" style={{backgroundColor: '#1c2f87'}}>
                        <Zap size={20} /> Asesor IA
                    </Card.Header>
                    
                    <Card.Body className="p-0 d-flex flex-column flex-grow-1" style={{ minHeight: '500px' }}>
                        
                        <div className="flex-grow-1 overflow-auto p-3" style={{ maxHeight: '70vh' }}>
                            {chatMessages.map((msg, idx) => (
                                <div key={idx} className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                                    {msg.role === 'assistant' && <Bot size={24} className="text-primary me-2 mt-1" />}
                                    <div className={`p-3 rounded-4 shadow-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-light text-dark border'}`} style={{ maxWidth: '85%', whiteSpace: 'pre-wrap' }}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isChatLoading && (
                                <div className="text-muted small ms-2 d-flex align-items-center gap-2">
                                    <Loader2 size={16} className="animate-spin text-primary" /> Pensando...
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-2 bg-light border-top mt-auto">
                             <Form onSubmit={handleChatSubmit}>
                                <InputGroup>
                                    <Form.Control
                                        placeholder="Ej: PC para Fortnite..."
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        disabled={isChatLoading}
                                    />
                                    <Button variant="warning" type="submit" disabled={isChatLoading}>
                                        {isChatLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                    </Button>
                                </InputGroup>
                            </Form>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    </Container>
  );
}