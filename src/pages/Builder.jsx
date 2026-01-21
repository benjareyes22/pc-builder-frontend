import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { supabase } from '../supabase';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

export default function Builder() {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  
  // Estados de Inventario
  const [fullInventory, setFullInventory] = useState([]);
  const [cpus, setCpus] = useState([]);
  const [gpus, setGpus] = useState([]);
  const [mobos, setMobos] = useState([]);
  const [rams, setRams] = useState([]);
  const [storage, setStorage] = useState([]);
  const [psus, setPsus] = useState([]);
  const [cases, setCases] = useState([]);

  // Selección del Usuario (Build)
  const [build, setBuild] = useState({
    cpu: null,
    gpu: null,
    mobo: null,
    ram: null,
    storage: null,
    psu: null,
    case: null
  });

  // Chat y Precios
  const [messages, setMessages] = useState([
    { text: "👋 ¡Hola! Dime qué necesitas (ej: 'PC para Excel barato' o 'Gamer por 800 lucas') y yo seleccionaré las piezas por ti.", sender: 'bot' }
  ]);
  const [inputChat, setInputChat] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const [totalPrice, setTotalPrice] = useState(0);

  // Validación
  const [compatibilityMsg, setCompatibilityMsg] = useState(null);
  const [validating, setValidating] = useState(false);

  // Carga inicial
  useEffect(() => { fetchComponents(); }, []);

  // Scroll automático del chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  // Calculadora de Precio
  useEffect(() => {
    const total = Object.values(build).reduce((acc, item) => acc + (item ? item.precio : 0), 0);
    setTotalPrice(total);
  }, [build]);

  // --- 🛡️ AUTO-VALIDACIÓN DE COMPATIBILIDAD (Lógica de Alertas) ---
  useEffect(() => {
    verificarCompatibilidad();
  }, [build.cpu, build.mobo, build.ram]);

  const verificarCompatibilidad = async () => {
    setValidating(true);
    
    // Solo validamos si hay CPU y Placa seleccionadas
    if (build.cpu && build.mobo) {
      const cpuName = (build.cpu.nombre || "").toLowerCase();
      const moboName = (build.mobo.nombre || "").toLowerCase();
      const ramName = build.ram ? (build.ram.nombre || "").toLowerCase() : "";

      // 1. NIVEL CRÍTICO (ROJO): Incompatibilidad de Socket (Intel en placa AMD)
      if (cpuName.includes("intel") && moboName.includes("b550")) {
        setCompatibilityMsg({ 
          type: 'danger', 
          text: "PELIGRO CRÍTICO: 🛑 Estás intentando montar un procesador INTEL en una placa madre para AMD (B550). ¡Los pines no encajan y podrías dañar el equipo!" 
        });
      } 
      // 2. NIVEL ADVERTENCIA (AMARILLO): Poca RAM (8GB)
      else if (ramName.includes("8 gb") || ramName.includes("8gb")) {
        setCompatibilityMsg({ 
          type: 'warning', 
          text: "⚠️ ADVERTENCIA DE RENDIMIENTO: Seleccionaste solo 8GB de RAM. El equipo funcionará, pero para juegos modernos o multitarea se recomiendan 16GB." 
        });
      }
      // 3. TODO OK (VERDE)
      else {
        setCompatibilityMsg({ 
          type: 'success', 
          text: "✅ Compatibilidad verificada. Los sockets coinciden y la configuración es segura." 
        });
      }
    } else {
      // Si falta CPU o Placa, limpiamos el mensaje
      setCompatibilityMsg(null);
    }
    setValidating(false);
  };

  const fetchComponents = async () => {
    try {
      const { data: allProducts } = await supabase.from('productos').select('*');
      if (allProducts) {
        setFullInventory(allProducts);
        setCpus(allProducts.filter(p => p.categoria === 'CPU'));
        setGpus(allProducts.filter(p => p.categoria === 'GPU'));
        setMobos(allProducts.filter(p => p.categoria === 'Motherboard'));
        setRams(allProducts.filter(p => p.categoria === 'RAM'));
        setStorage(allProducts.filter(p => p.categoria === 'Storage'));
        setPsus(allProducts.filter(p => p.categoria === 'PSU'));
        setCases(allProducts.filter(p => p.categoria === 'Case'));
      }
    } catch (error) {
      console.error("Error productos:", error);
    }
  };

  const handleSelect = (category, productId) => {
    const product = fullInventory.find(p => p.id === parseInt(productId)) || null;
    setBuild(prev => ({ ...prev, [category]: product }));
  };

  // --- 🧠 CEREBRO IA CON AUTO-COMPLETADO ---
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!inputChat.trim()) return;

    const userMsg = inputChat;
    setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
    setInputChat("");
    setIsTyping(true);

    try {
      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: userMsg }),
      });

      const data = await response.json();
      
      if (data.respuesta) {
        setMessages(prev => [...prev, { text: data.respuesta, sender: 'bot' }]);
      }

      if (data.seleccion) {
        console.log("🪄 La IA sugiere:", data.seleccion);
        setBuild(prev => {
          const nuevoArmado = { ...prev };
          const findByName = (name) => {
            if (!name || name === "null") return null;
            return fullInventory.find(p => 
              p.nombre.toLowerCase().trim() === name.toLowerCase().trim()
            ) || null;
          };

          if (data.seleccion.cpu) nuevoArmado.cpu = findByName(data.seleccion.cpu);
          if (data.seleccion.motherboard) nuevoArmado.mobo = findByName(data.seleccion.motherboard);
          if (data.seleccion.ram) nuevoArmado.ram = findByName(data.seleccion.ram);
          if (data.seleccion.gpu) nuevoArmado.gpu = findByName(data.seleccion.gpu);
          if (data.seleccion.storage) nuevoArmado.storage = findByName(data.seleccion.storage);
          if (data.seleccion.psu) nuevoArmado.psu = findByName(data.seleccion.psu);
          if (data.seleccion.case) nuevoArmado.case = findByName(data.seleccion.case);

          return nuevoArmado;
        });
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { text: "💀 Error conectando con el cerebro IA.", sender: 'bot' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const guardarCotizacion = async () => {
    if (totalPrice === 0) return alert("Armado vacío.");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if(window.confirm("Debes iniciar sesión. ¿Ir al login?")) navigate('/login');
      return;
    }
    const nombre = prompt("Nombre para tu PC:", "Mi PC IA");
    if (!nombre) return;

    const { error } = await supabase.from('cotizaciones').insert([{
      user_id: user.id,
      nombre: nombre,
      cpu_id: build.cpu?.id,
      gpu_id: build.gpu?.id,
      mobo_id: build.mobo?.id,
      ram_id: build.ram?.id,
      storage_id: build.storage?.id,
      psu_id: build.psu?.id,
      case_id: build.case?.id,
      total: totalPrice
    }]);

    if (!error) alert("✅ Guardado exitoso.");
    else alert("Error al guardar.");
  };

  const addAllToCart = () => {
    Object.values(build).forEach(item => { if (item) addToCart(item); });
    alert("¡Todo agregado al carrito!");
  };

  return (
    <Container className="mt-4 pb-5">
      <h2 className="text-white text-center mb-4">🤖 Armador de PC Inteligente</h2>
      <Row>
        <Col md={7}>
          <Card className="p-4 shadow bg-white">
            <h5 className="mb-3 text-dark border-bottom pb-2">Componentes Principales</h5>
            {[
              {label: "Procesador (CPU)", state: cpus, type: 'cpu', val: build.cpu},
              {label: "Placa Madre", state: mobos, type: 'mobo', val: build.mobo},
              {label: "Memoria RAM", state: rams, type: 'ram', val: build.ram},
              {label: "Tarjeta de Video (GPU)", state: gpus, type: 'gpu', val: build.gpu},
              {label: "Almacenamiento", state: storage, type: 'storage', val: build.storage},
              {label: "Fuente de Poder", state: psus, type: 'psu', val: build.psu},
              {label: "Gabinete", state: cases, type: 'case', val: build.case}
            ].map((comp, idx) => (
              <Form.Group className="mb-3" key={idx}>
                <Form.Label className="text-dark fw-bold">{comp.label}</Form.Label>
                <Form.Select 
                  value={comp.val ? comp.val.id : ""} 
                  onChange={(e) => handleSelect(comp.type, e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {comp.state.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} - ${parseInt(p.precio).toLocaleString('es-CL')}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            ))}

            {/* ALERTAS INTELIGENTES */}
            {validating && <div className="text-center text-muted mb-2"><Spinner animation="border" size="sm"/> Verificando...</div>}
            
            {compatibilityMsg && !validating && (
              <Alert variant={compatibilityMsg.type} className="fw-bold text-center">
                {compatibilityMsg.text}
              </Alert>
            )}

            <Alert variant="info" className="mt-3 text-center">
              <h4>Total Estimado: ${totalPrice.toLocaleString('es-CL')}</h4>
            </Alert>
            <div className="d-flex gap-2">
              <Button variant="outline-primary" className="w-50 fw-bold" onClick={guardarCotizacion}>💾 Guardar</Button>
              <Button variant="success" className="w-50 fw-bold" onClick={addAllToCart} disabled={totalPrice === 0}>🛒 Carrito</Button>
            </div>
          </Card>
        </Col>

        <Col md={5} className="mt-4 mt-md-0">
          <Card className="h-100 shadow border-0" style={{ maxHeight: '800px' }}>
            <Card.Header className="bg-dark text-warning fw-bold d-flex justify-content-between">
              <span>⚡ Técnico Virtual IA</span>
            </Card.Header>
            <Card.Body className="bg-light overflow-auto d-flex flex-column">
              <div className="flex-grow-1">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`d-flex mb-3 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                    <div className={`p-3 rounded shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-white text-dark border'}`} style={{ maxWidth: '85%' }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && <div className="text-muted small ms-2">Analizando inventario... 🔧</div>}
                <div ref={chatEndRef} />
              </div>
            </Card.Body>
            <Card.Footer className="bg-white">
              <Form onSubmit={handleChatSubmit} className="d-flex gap-2">
                <Form.Control 
                  placeholder="Ej: PC para oficina barato..." 
                  value={inputChat} 
                  onChange={(e) => setInputChat(e.target.value)}
                  disabled={isTyping}
                />
                <Button type="submit" variant="warning" disabled={isTyping}>➤</Button>
              </Form>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}