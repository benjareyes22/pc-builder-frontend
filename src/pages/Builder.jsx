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
  
  // Chat IA States
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
      { role: 'assistant', content: "¡Hola! Soy tu Asesor Experto en Hardware. Cuéntame qué uso le darás al PC (ej: Gaming, Edición) y tu presupuesto. Revisaré el stock real para ver qué podemos armar." }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const [validationResult, setValidationResult] = useState(null); 
  const [isValidating, setIsValidating] = useState(false);

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
      setValidationResult(null);
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

  // --- VALIDACIÓN DE COMPATIBILIDAD ---
  const handleValidateBuild = async () => {
    const partesActuales = Object.values(seleccionados).filter(p => p !== undefined);
    
    if (partesActuales.length < 1) {
      alert("Selecciona al menos un componente para validar.");
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const listaPiezas = partesActuales.map(p => `${p.categoria}: ${p.nombre}`).join(', ');

      const promptValidacion = `
        Actúa como un Técnico Experto en Hardware PC.
        Analiza la compatibilidad de esta lista de componentes seleccionados:
        [ ${listaPiezas} ]

        Responde ESTRICTAMENTE en formato JSON con esta estructura:
        {
          "status": "DANGER" | "WARNING" | "OK",
          "title": "Título corto del resultado",
          "message": "Explicación técnica breve."
        }

        Reglas:
        - Usa "DANGER" (Rojo) si las piezas NO ENCAJAN físicamente o la PC no encenderá.
        - Usa "WARNING" (Amarillo) si funciona pero hay cuellos de botella o faltan piezas importantes.
        - Usa "OK" (Verde) si la selección actual es compatible.
        - NO escribas nada fuera del JSON.
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(promptValidacion);
      const text = result.response.text();
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleanJson);
      
      setValidationResult(data);

    } catch (error) {
      console.error("Error validando:", error);
      alert("Error al conectar con el Técnico Virtual. Intenta de nuevo.");
    } finally {
      setIsValidating(false);
    }
  };

  // --- LÓGICA DEL CHATBOT ---
  const handleChatSubmit = async (e) => {
      e.preventDefault();
      if (!chatInput.trim()) return;

      const userMessage = { role: 'user', content: chatInput };
      setChatMessages(prev => [...prev, userMessage]);
      setChatInput("");
      setIsChatLoading(true);

      try {
          let inventarioContext = "--- INVENTARIO DISPONIBLE Y PRECIOS (CLP) ---\n";
          for (const [cat, prods] of Object.entries(categoriasData)) {
              inventarioContext += `\nCATEGORÍA: ${cat}\n`;
              prods.forEach(p => {
                  inventarioContext += `- ID:${p.id} | ${p.nombre} | PRECIO: $${parseInt(p.precio)}\n`;
              });
          }
          
          inventarioContext += `
          \n--- ROL ---
          Actúa como un Asesor Técnico HONESTO de PC-Builder AI. Tienes acceso al stock real.

          --- REGLAS CRÍTICAS ---
          1. **CHEQUEO DE PRESUPUESTO:** Si el usuario pide un PC por un monto específico (ej: "PC de 100.000"), SUMA el precio de los componentes mínimos.
             - Si el costo real supera el presupuesto, **RECHAZA** la solicitud educadamente y **NO GENERES JSON**.
          
          2. **SOLO STOCK REAL:** No inventes componentes. Usa solo los IDs de la lista.

          3. **LIMPIEZA:** Si el usuario pide "Armar un PC", asume que quiere una cotización NUEVA desde cero.

          --- FORMATO DE RESPUESTA SI ES POSIBLE ARMARLO ---
          Responde con texto explicativo y AL FINAL agrega este JSON:
          JSON_START
          { "CPU": ID, "Motherboard": ID, "RAM": ID, ... }
          JSON_END
          
          \n--- MENSAJE DEL USUARIO ---
          "${chatInput}"`;

          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const result = await model.generateContent(inventarioContext);
          const responseText = result.response.text();

          let finalText = responseText;
          const jsonMatch = responseText.match(/JSON_START([\s\S]*?)JSON_END/);
          
          if (jsonMatch && jsonMatch[1]) {
              finalText = responseText.replace(/JSON_START[\s\S]*?JSON_END/, "").trim();
              try {
                  const selectionData = JSON.parse(jsonMatch[1]);
                  const nuevaSeleccion = {}; 
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
                      finalText += "\n\n✅ ¡He actualizado la tabla con la nueva cotización!";
                  }
              } catch (err) { console.error("Error JSON:", err); }
          }

          setChatMessages(prev => [...prev, { role: 'assistant', content: finalText }]);

      } catch (error) {
          console.error("Error Gemini:", error);
          setChatMessages(prev => [...prev, { role: 'assistant', content: "Lo siento, tuve un problema técnico de conexión." }]);
      } finally {
          setIsChatLoading(false);
      }
  };

  const scrollToBottom = () => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" variant="info" /></Container>;

  const categoriasMap = { 'CPU': 'Procesador', 'Motherboard': 'Placa Madre', 'RAM': 'RAM', 'GPU': 'Tarjeta de Video', 'Storage': 'SSD "Unidad De Estado Solido"', 'PSU': 'Fuente', 'Case': 'Gabinete' };

  return (
    <Container className="mt-4 pb-5">
        <style>
            {`
                .btn-verify-custom {
                    color: black !important;
                    border: 2px solid black;
                    background-color: transparent;
                    transition: 0.3s;
                }
                .btn-verify-custom:hover {
                    color: black !important;
                    background-color: white;
                    border-color: white;
                }
                .btn-verify-custom:disabled {
                    color: #ddd !important;
                    border-color: #aaa;
                }
            `}
        </style>

        {/* TÍTULO PRINCIPAL */}
        <h2 className="section-title text-center mb-4 d-flex align-items-center justify-content-center gap-2 text-white">
            <Shield size={28} className="text-primary" /> Armador Inteligente
        </h2>

        <Row className="h-100 align-items-stretch"> 
            
            {/* IZQUIERDA: Componentes (AMARILLO - Estilo Construcción) */}
            <Col md={8} className="mb-4 mb-md-0">
                <Card className="shadow-lg border-0 h-100">
                    <Card.Header className="text-dark fw-bold py-3" style={{backgroundColor: '#e56503', color: 'white'}}>Componentes</Card.Header>
                    <Card.Body className="p-4" style={{ backgroundColor: '#ffc107' }}> 
                        <div className="mb-4">
                            <Button 
                                className="w-100 mb-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm btn-verify-custom"
                                onClick={handleValidateBuild}
                                disabled={isValidating}
                            >
                                {isValidating ? <Loader2 className="animate-spin" /> : <Shield size={20} />}
                                {isValidating ? " Analizando..." : " Verificar Compatibilidad con IA"}
                            </Button>

                            {validationResult && (
                                <div className={`alert ${
                                    validationResult.status === 'DANGER' ? 'alert-danger bg-danger text-white border-0' : 
                                    validationResult.status === 'WARNING' ? 'alert-warning bg-light text-dark border-0' : 
                                    'alert-success bg-success text-white border-0'
                                } shadow-sm fade show`} role="alert">
                                    <h5 className="alert-heading fw-bold d-flex align-items-center gap-2">
                                        {validationResult.status === 'DANGER' && '🛑 ERROR'}
                                        {validationResult.status === 'WARNING' && '⚠️ CUIDADO'}
                                        {validationResult.status === 'OK' && '✅ EXCELENTE'}
                                    </h5>
                                    <p className="mb-0 fw-medium"><strong>{validationResult.title}:</strong> {validationResult.message}</p>
                                </div>
                            )}
                        </div>

                        <Form>
                            {Object.entries(categoriasMap).map(([key, label]) => (
                                <Form.Group key={key} className="mb-3">
                                    <Form.Label className="fw-bold fs-5" style={{ color: 'black', textShadow: 'none' }}>
                                        {label}
                                    </Form.Label>
                                    <Form.Select 
                                        value={seleccionados[key]?.id || ""} 
                                        onChange={(e) => handleSelect(key, e.target.value)}
                                        className="bg-dark text-white border-secondary"
                                        style={{ border: '2px solid #333' }}
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
                    <Card.Footer className="bg-dark border-top border-secondary p-3 d-flex flex-column gap-3 mt-auto">
                        <div className="bg-black text-warning p-3 rounded text-center fw-bold fs-4 border border-warning">
                            Total: ${total.toLocaleString('es-CL')}
                        </div>
                        <div className="d-flex gap-3">
                            <Button variant="light" size="lg" className="w-50 fw-bold d-flex align-items-center justify-content-center gap-2" onClick={handleSave}>
                                <Save size={20} /> Guardar
                            </Button>
                            <Button variant="warning" size="lg" className="w-50 fw-bold d-flex align-items-center justify-content-center gap-2 text-dark" onClick={handleAddToCart}>
                                <ShoppingCart size={20} /> Carrito
                            </Button>
                        </div>
                    </Card.Footer>
                </Card>
            </Col>

            {/* DERECHA: Asesor IA */}
            <Col md={4} className="d-flex flex-column">
                
                {/* 1. FONDO: Blanco (bg-white) */}
                <Card className="shadow-lg border-0 h-100 w-100 bg-white">
                    
                    {/* 2. ENCABEZADO: Negro (bg-black) con texto Blanco (text-white) */}
                    <Card.Header className="bg-black text-white fw-bold py-3 d-flex align-items-center gap-2 border-bottom border-secondary">
                        <Zap size={20} className="text-primary" /> Asesor IA
                    </Card.Header>
                    
                    {/* CUERPO: Fondo Blanco */}
                    <Card.Body className="p-0 d-flex flex-column flex-grow-1" style={{ minHeight: '500px', backgroundColor: '#ffffff' }}>
                        <div className="flex-grow-1 overflow-auto p-3" style={{ maxHeight: '70vh' }}>
                            {chatMessages.map((msg, idx) => (
                                <div key={idx} className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                                    {/* Icono del Bot */}
                                    {msg.role === 'assistant' && <Bot size={24} className="text-primary me-2 mt-1" />}
                                    
                                    {/* 3. BURBUJAS */}
                                    <div 
                                        className={`p-3 rounded-4 shadow-sm ${
                                            msg.role === 'user' 
                                            ? 'bg-primary text-white'        // Usuario: Azul
                                            : 'bg-dark text-white border border-secondary'  // IA: Negra (bg-dark) con texto blanco
                                        }`} 
                                        style={{ maxWidth: '85%', whiteSpace: 'pre-wrap' }}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isChatLoading && <div className="text-muted small ms-2"><Loader2 size={16} className="animate-spin text-primary" /> Escribiendo...</div>}
                            <div ref={chatEndRef} />
                        </div>

                        {/* INPUT: Fondo Blanco/Claro */}
                        <div className="p-2 bg-white border-top mt-auto">
                             <Form onSubmit={handleChatSubmit}>
                                <InputGroup>
                                    <Form.Control
                                        placeholder="Ej: PC para Fortnite..."
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        disabled={isChatLoading}
                                        className="bg-light text-dark border-secondary"
                                    />
                                    <Button variant="primary" type="submit" disabled={isChatLoading}>
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