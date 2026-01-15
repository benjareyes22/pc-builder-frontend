import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Form, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { supabase } from '../supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

export default function Builder() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const [seleccion, setSeleccion] = useState({
    cpu: null, gpu: null, ram: null, motherboard: null,
    cabinet: null, psu: null, storage: null
  });

  const [saveStatus, setSaveStatus] = useState({ show: false, message: '', type: 'info' });
  const [chatOpen, setChatOpen] = useState(false);
  
  const [messages, setMessages] = useState([
    { text: "👨‍🔧 Hola. Soy tu Técnico Virtual. Reviso compatibilidad real (Chipsets, Watts, Cuello de Botella).", sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { fetchHardware(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatOpen, isTyping]);

  const fetchHardware = async () => {
    const { data, error } = await supabase.from('productos').select('*');
    if (error) console.error(error);
    else setProducts(data || []);
    setLoading(false);
  };

  const cpus = products.filter(p => p.categoria === 'CPU');
  const gpus = products.filter(p => p.categoria === 'GPU');
  const rams = products.filter(p => p.categoria === 'RAM');
  const mothers = products.filter(p => p.categoria === 'Motherboard');
  const cabinets = products.filter(p => p.categoria === 'Case');
  const psus = products.filter(p => p.categoria === 'PSU');
  const storages = products.filter(p => p.categoria === 'Storage');

  const calcularTotal = () => {
    let total = 0;
    Object.values(seleccion).forEach(item => { if(item) total += item.precio; });
    return total;
  };

  const handleChange = (categoria, id) => {
    const producto = products.find(p => p.id === parseInt(id));
    const nuevaSeleccion = { ...seleccion, [categoria]: producto };
    setSeleccion(nuevaSeleccion);
    
    // Alerta visual inmediata si detectamos error de SOCKET
    if (categoria === 'cpu' && nuevaSeleccion.motherboard) {
        checkSocket(producto, nuevaSeleccion.motherboard);
    } else if (categoria === 'motherboard' && nuevaSeleccion.cpu) {
        checkSocket(nuevaSeleccion.cpu, producto);
    }
  };

  // --- VALIDACIÓN DE SOCKET POR CHIPSET (La clave para arreglar tu error) ---
  const checkSocket = (cpu, mobo) => {
      const nCpu = cpu.nombre.toLowerCase();
      const nMobo = mobo.nombre.toLowerCase();

      // Detectamos Familia de CPU
      const esIntel = nCpu.includes("intel") || nCpu.includes("core") || nCpu.includes("i3") || nCpu.includes("i5") || nCpu.includes("i7") || nCpu.includes("i9");
      const esAMD = nCpu.includes("ryzen") || nCpu.includes("athlon") || nCpu.includes("amd");

      // Detectamos Familia de Placa por sus CHIPSETS específicos
      // AMD: B450, B550, X570, A320, A520, X670
      const esPlacaAMD = nMobo.includes("b550") || nMobo.includes("x570") || nMobo.includes("a520") || nMobo.includes("b450") || nMobo.includes("a320") || nMobo.includes("am4") || nMobo.includes("am5");
      
      // INTEL: H610, B660, B760, Z690, Z790, H510, B560
      const esPlacaIntel = nMobo.includes("h610") || nMobo.includes("b660") || nMobo.includes("b760") || nMobo.includes("z790") || nMobo.includes("z690") || nMobo.includes("h410") || nMobo.includes("intel");

      let error = null;
      if (esIntel && esPlacaAMD) error = "⚠️ ¡ALTO! Estás poniendo un CPU INTEL en una placa con chipset AMD (B550/X570). Físicamente no entra.";
      if (esAMD && esPlacaIntel) error = "⚠️ ¡ALTO! Estás poniendo un CPU RYZEN en una placa para INTEL.";

      if (error) {
          setTimeout(() => addBotMessage(error), 500);
          setChatOpen(true);
      }
      return error; // Retornamos el error para usarlo en el reporte completo
  };

  const analizarTextoTecnico = (texto) => {
    const t = texto.toLowerCase().replace(/\s/g, ''); 
    let gama = 0; 
    let componenteDetectado = "";

    // Regex mejorado para detectar series 30, 40, 50
    if (/(\d{1,2})[89]0(ti|xt|super)?/.test(t)) { gama = 3; componenteDetectado = "Gama Alta (Serie 80/90)"; }
    else if (/(\d{1,2})70(ti|xt|super)?/.test(t)) { gama = 2; componenteDetectado = "Gama Media-Alta (Serie 70)"; }
    else if (/(\d{1,2})[56]0(ti|xt|super)?/.test(t)) { gama = 1; componenteDetectado = "Gama Media (Serie 50/60)"; }

    const wattsMatch = texto.match(/(\d{3})\s*w/i) || texto.match(/fuente\s*de\s*(\d{3})/i);
    const watts = wattsMatch ? parseInt(wattsMatch[1]) : 0;

    return { gama, watts, componenteDetectado };
  };

  // --- CEREBRO MAESTRO: REVISA TU ARMADO ---
  const analizarArmadoActual = () => {
    const { cpu, gpu, psu, motherboard } = seleccion;
    
    if (!cpu && !gpu && !psu) return "Selecciona componentes primero para que pueda revisarlos.";

    let reporte = "🔧 **Diagnóstico del Armado:**\n";
    let problemas = 0;

    // 1. REVISIÓN CPU vs GPU (Balance)
    if (cpu && gpu) {
        // Detectar nivel CPU
        const nCpu = cpu.nombre.toLowerCase();
        let gamaCPU = 1;
        if (nCpu.includes("i9") || nCpu.includes("ryzen 9")) gamaCPU = 3;
        else if (nCpu.includes("i7") || nCpu.includes("ryzen 7")) gamaCPU = 2;

        const analisisGPU = analizarTextoTecnico(gpu.nombre); 
        
        // Caso A: Cuello de Botella (CPU muy débil)
        if (gamaCPU === 1 && analisisGPU.gama === 3) {
            reporte += "❌ **Cuello de Botella:** CPU básico con GPU tope de gama. Desperdiciarás potencia gráfica.\n";
            problemas++;
        } 
        // Caso B: CPU Sobrado (i9 con 3060) - Lo que te pasó a ti
        else if (gamaCPU === 3 && analisisGPU.gama === 1) {
            reporte += "ℹ️ **Desbalance:** Tienes MUCHO procesador (Gama Ultra) para esa tarjeta gráfica (Gama Media). No es un error técnico, pero podrías ahorrar dinero comprando un CPU más barato (i5/Ryzen 5) y te andaría igual.\n";
        } else {
            reporte += "✅ **Balance:** CPU y Gráfica se ven equilibrados.\n";
        }
    }

    // 2. REVISIÓN FUENTE (Watts)
    if (gpu && psu) {
        const wattsPSU = parseInt(psu.nombre.match(/(\d{3})/)?.[0] || 0);
        const analisisGPU = analizarTextoTecnico(gpu.nombre);

        if (analisisGPU.gama === 3 && wattsPSU < 750) {
            reporte += `⚠️ **Fuente:** Esa GPU consume mucho. ${wattsPSU}W es arriesgado. Ve por 850W+.\n`;
            problemas++;
        } else if (analisisGPU.gama >= 1 && wattsPSU < 500) {
            reporte += `⚠️ **Fuente:** ${wattsPSU}W es muy poco para gaming serio. Busca 550W+.\n`;
            problemas++;
        } else {
            reporte += "✅ **Energía:** Fuente suficiente.\n";
        }
    }

    // 3. REVISIÓN SOCKET (Chipset Check)
    if (cpu && motherboard) {
        const errorSocket = checkSocket(cpu, motherboard); // Reusamos la lógica de chipsets
        if (errorSocket) {
             reporte += `🛑 **ERROR FATAL:** ${errorSocket}\n`;
             problemas++;
        } else {
             reporte += "✅ **Socket:** Compatible.\n";
        }
    }

    if (problemas === 0) reporte += "\n✨ **Conclusión:** Todo parece técnicamente compatible.";
    
    return reporte;
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const originalText = inputText;
    const userText = inputText.toLowerCase();
    
    setMessages(prev => [...prev, { text: originalText, sender: 'user' }]);
    setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      let respuesta = "";
      const analisisTexto = analizarTextoTecnico(originalText);

      // CASO 1: Chat Técnico Directo (Pregunta específica con datos)
      if (analisisTexto.gama > 0 || analisisTexto.watts > 0) {
          if (analisisTexto.watts > 0) {
              if (analisisTexto.gama === 3 && analisisTexto.watts < 750) respuesta = `Para gama alta (Serie 80/90), ${analisisTexto.watts}W es poco. Ve por 850W+.`;
              else if (analisisTexto.gama === 2 && analisisTexto.watts < 600) respuesta = `Para gama media-alta, mejor asegura con 650W.`;
              else if (analisisTexto.gama === 1 && analisisTexto.watts < 450) respuesta = `Cuidado, ${analisisTexto.watts}W es riesgoso. Busca 500W+ certificada.`;
              else respuesta = `Sí, una fuente de ${analisisTexto.watts}W debería funcionar bien.`;
          } else {
             respuesta = "Suena a una pieza potente. ¿Con qué fuente la vas a usar?";
          }
      } 
      
      // CASO 2: Revisión del Armado Actual
      else if (userText.includes("esta bien") || userText.includes("cotizacion") || userText.includes("armado") || userText.includes("sirve") || userText.includes("cuello") || userText.includes("compatible")) {
          respuesta = analizarArmadoActual();
      }

      // CASO 3: Saludos / Default
      else if (userText.includes("hola")) {
          respuesta = "¡Hola! Arma tu PC en el menú y pregúntame '¿Está bien así?' para revisarlo al detalle.";
      }
      else {
          respuesta = "Soy un Técnico IA. Pregúntame si tu armado está bien o dudas sobre Watts y Gamas.";
      }

      setMessages(prev => [...prev, { text: respuesta, sender: 'bot' }]);
      setIsTyping(false);
    }, 1000);
  };

  const addBotMessage = (text) => setMessages(prev => [...prev, { text, sender: 'bot' }]);

  const handleSaveAndPDF = async () => {
    setSaveStatus({ show: true, message: 'Procesando...', type: 'info' });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSaveStatus({ show: true, message: '⚠️ Inicia sesión para guardar.', type: 'warning' });
        return;
      }
      const total = calcularTotal();
      const doc = new jsPDF();
      doc.text("Cotización PC-Builder AI", 20, 20);
      autoTable(doc, { startY: 50, head: [['Componente', 'Modelo', 'Precio']], body: [
        ['CPU', seleccion.cpu?.nombre || '-', `$${seleccion.cpu?.precio || 0}`],
        ['GPU', seleccion.gpu?.nombre || '-', `$${seleccion.gpu?.precio || 0}`],
        ['TOTAL', '', `$${total.toLocaleString()}`]
      ]});
      doc.save("Mi_PC.pdf");
      
      await supabase.from('cotizaciones').insert({
        user_id: user.id,
        cpu: seleccion.cpu?.nombre,
        gpu: seleccion.gpu?.nombre,
        ram: seleccion.ram?.nombre,
        motherboard: seleccion.motherboard?.nombre,
        gabinete: seleccion.cabinet?.nombre,
        fuente: seleccion.psu?.nombre,
        almacenamiento: seleccion.storage?.nombre,
        total: total
      });
      
      setSaveStatus({ show: true, message: '✅ ¡Guardado!', type: 'success' });
      setTimeout(() => navigate('/mis-cotizaciones'), 1500);
    } catch (error) {
      setSaveStatus({ show: true, message: '❌ Error: ' + error.message, type: 'danger' });
    }
  };

  if (loading) return <Container className="mt-5 text-center"><Spinner animation="border" variant="warning" /></Container>;

  return (
    <Container className="mt-4 position-relative">
      <h2 className="text-center mb-4 fw-bold">🤖 Armador de PC Completo</h2>
      
      {saveStatus.show && (
        <Alert variant={saveStatus.type} onClose={() => setSaveStatus({ ...saveStatus, show: false })} dismissible>
          {saveStatus.message}
        </Alert>
      )}

      <Row>
        <Col md={8}>
          <Card className="shadow-sm p-4 mb-4 border-0">
            <h4 className="mb-4 text-secondary">Componentes Principales</h4>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Procesador (CPU)</Form.Label>
                <Form.Select onChange={(e) => handleChange('cpu', e.target.value)} defaultValue="">
                  <option value="" disabled>Seleccionar...</option>
                  {cpus.map(p => <option key={p.id} value={p.id}>{p.nombre} - ${p.precio.toLocaleString()}</option>)}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Placa Madre</Form.Label>
                <Form.Select onChange={(e) => handleChange('motherboard', e.target.value)} defaultValue="">
                  <option value="" disabled>Seleccionar...</option>
                  {mothers.map(p => <option key={p.id} value={p.id}>{p.nombre} - ${p.precio.toLocaleString()}</option>)}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Memoria RAM</Form.Label>
                <Form.Select onChange={(e) => handleChange('ram', e.target.value)} defaultValue="">
                  <option value="" disabled>Seleccionar...</option>
                  {rams.map(p => <option key={p.id} value={p.id}>{p.nombre} - ${p.precio.toLocaleString()}</option>)}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Tarjeta de Video (GPU)</Form.Label>
                <Form.Select onChange={(e) => handleChange('gpu', e.target.value)} defaultValue="">
                  <option value="" disabled>Seleccionar...</option>
                  {gpus.map(p => <option key={p.id} value={p.id}>{p.nombre} - ${p.precio.toLocaleString()}</option>)}
                </Form.Select>
              </Form.Group>
              
              <h5 className="mt-4 mb-3 text-secondary border-top pt-3">Almacenamiento y Energía</h5>
              
              <Form.Group className="mb-3">
                <Form.Label>Almacenamiento (SSD/HDD)</Form.Label>
                <Form.Select onChange={(e) => handleChange('storage', e.target.value)} defaultValue="">
                  <option value="" disabled>Seleccionar...</option>
                  {storages.map(p => <option key={p.id} value={p.id}>{p.nombre} - ${p.precio.toLocaleString()}</option>)}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Fuente de Poder (PSU)</Form.Label>
                <Form.Select onChange={(e) => handleChange('psu', e.target.value)} defaultValue="">
                  <option value="" disabled>Seleccionar...</option>
                  {psus.map(p => <option key={p.id} value={p.id}>{p.nombre} - ${p.precio.toLocaleString()}</option>)}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Gabinete (Case)</Form.Label>
                <Form.Select onChange={(e) => handleChange('cabinet', e.target.value)} defaultValue="">
                  <option value="" disabled>Seleccionar...</option>
                  {cabinets.map(p => <option key={p.id} value={p.id}>{p.nombre} - ${p.precio.toLocaleString()}</option>)}
                </Form.Select>
              </Form.Group>
            </Form>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow border-warning text-center position-sticky" style={{ top: '20px' }}>
            <Card.Header className="bg-warning fw-bold text-dark">RESUMEN</Card.Header>
            <Card.Body>
              <ul className="list-unstyled text-start mb-4 small">
                <li>🧠 <strong>CPU:</strong> {seleccion.cpu?.nombre || '-'}</li>
                <li>🔌 <strong>MoBo:</strong> {seleccion.motherboard?.nombre || '-'}</li>
                <li>⚡ <strong>RAM:</strong> {seleccion.ram?.nombre || '-'}</li>
                <li>🎮 <strong>GPU:</strong> {seleccion.gpu?.nombre || '-'}</li>
                <li>💾 <strong>SSD:</strong> {seleccion.storage?.nombre || '-'}</li>
                <li>🔋 <strong>PSU:</strong> {seleccion.psu?.nombre || '-'}</li>
                <li>📦 <strong>Case:</strong> {seleccion.cabinet?.nombre || '-'}</li>
              </ul>
              <h3 className="fw-bold text-success mb-3">${calcularTotal().toLocaleString('es-CL')}</h3>
              <Button variant="dark" size="lg" className="w-100" disabled={calcularTotal() === 0} onClick={handleSaveAndPDF}>
                💾 Guardar Cotización
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* CHATBOT */}
      <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}>
        {!chatOpen && (
          <Button variant="warning" className="rounded-circle shadow-lg p-3 fw-bold animate__animated animate__bounceIn" style={{ width: '80px', height: '80px', fontSize: '2rem' }} onClick={() => setChatOpen(true)}>🤖</Button>
        )}
        {chatOpen && (
          <Card className="shadow-lg border-0" style={{ width: '450px', height: '600px', display: 'flex', flexDirection: 'column' }}>
            <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center py-3">
              <span className="fs-5 fw-bold">⚡ Técnico Virtual</span>
              <Button variant="link" className="text-white p-0 text-decoration-none fs-4" onClick={() => setChatOpen(false)}>✖</Button>
            </Card.Header>
            <Card.Body className="bg-light p-4" style={{ flex: 1, overflowY: 'auto' }}>
              {messages.map((msg, idx) => (
                <div key={idx} className={`d-flex mb-3 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div className={`p-3 rounded shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-white text-dark'}`} style={{ maxWidth: '85%', fontSize: '1.1rem' }}>
                      {msg.text.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                </div>
              ))}
              {isTyping && <div className="text-muted small ms-2">Escribiendo...</div>}
              <div ref={chatEndRef} />
            </Card.Body>
            <Card.Footer className="p-3 bg-white">
              <Form onSubmit={handleSendMessage} className="d-flex gap-2">
                <Form.Control size="lg" placeholder="Ej: ¿Está bien mi armado?" value={inputText} onChange={(e) => setInputText(e.target.value)} />
                <Button type="submit" variant="warning" size="lg">➤</Button>
              </Form>
            </Card.Footer>
          </Card>
        )}
      </div>
    </Container>
  );
}