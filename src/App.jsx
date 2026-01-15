import { useState } from 'react';
import './index.css';

// 1. TU INVENTARIO (Aquí metí tus productos para que React los "lea")
const inventario = [
  { id: 1, nombre: "Tarjeta de Video Gigabyte RTX 3060 Ti", precio: 365000, img: "/3060ti.jpg" },
  { id: 2, nombre: "Procesador AMD Ryzen 5 5600G", precio: 135000, img: "/Ryzen5.jpg" },
  { id: 3, nombre: "Kit Gamer Monster 4 en 1", precio: 16990, img: "/kitGamer.jpg" },
  { id: 4, nombre: "Placa Madre GIGABYTE Z790 AORUS", precio: 320000, img: "/placamaire.jpg" }, // Ojo con el nombre del archivo
  { id: 5, nombre: "PC Gamer Navi 7900XTX (Armado)", precio: 1300000, img: "/pcArmaoR5.jpg" },
  { id: 6, nombre: "Micrófono HyperX QUADCAST", precio: 90000, img: "/microfono.jpg" },
];

function App() {
  // Estados para el Chat
  const [chatAbierto, setChatAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([{ sender: 'ia', text: '¡Hola! Soy el experto de PC Hub. ¿Buscas algo para jugar o trabajar?' }]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);

  // Función para enviar mensaje a TU Backend
  const enviarMensaje = async () => {
    if (!input.trim()) return;
    
    const nuevoMensaje = { sender: 'user', text: input };
    setMensajes([...mensajes, nuevoMensaje]);
    setInput("");
    setCargando(true);

    try {
      // AQUÍ LE MANDAMOS EL INVENTARIO A LA IA COMO "CONTEXTO"
      const promptContexto = `
        Eres el vendedor experto de la tienda "PC Hub".
        Tus productos disponibles son EXACTAMENTE estos: ${JSON.stringify(inventario)}.
        
        Reglas:
        1. Si el usuario pide una recomendación, busca SOLO en la lista de arriba.
        2. Menciona el precio exacto de la lista.
        3. Si no tenemos el producto, dilo amablemente y sugiere otro de la lista.
        4. Responde corto y carismático.
        
        Usuario dice: "${input}"
      `;

      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: promptContexto })
      });
      
      const data = await response.json();
      setMensajes(prev => [...prev, { sender: 'ia', text: data.respuesta }]);
    } catch (error) {
      setMensajes(prev => [...prev, { sender: 'ia', text: "🔴 Error: No puedo conectar con el servidor." }]);
    }
    setCargando(false);
  };

  return (
    <div>
      {/* --- NAVBAR --- */}
      <nav className="navbar navbar-expand-lg bg-light navbar-light">
        <div className="container-fluid">
          <a className="navbar-brand fw-bold" href="#">PC HUB 🤖</a>
          <div className="collapse navbar-collapse">
            <ul className="navbar-nav me-auto">
              <li className="nav-item"><a className="nav-link active" href="#">Inicio</a></li>
              <li className="nav-item"><a className="nav-link" href="#">Componentes</a></li>
            </ul>
          </div>
        </div>
      </nav>

      {/* --- CAROUSEL (Simplificado) --- */}
      <div id="carouselExample" className="carousel slide" data-bs-ride="carousel">
        <div className="carousel-inner">
          <div className="carousel-item active">
            {/* Asegúrate de tener esta imagen en /public */}
            <img src="/Tarjetasgraficas.jpg" className="d-block w-100" alt="Banner" />
            <div className="carousel-caption d-none d-md-block bg-dark opacity-75 rounded">
              <h5>POTENCIA TU JUEGO</h5>
              <p>Las mejores RTX están aquí.</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- GRILLA DE PRODUCTOS --- */}
      <div className="container mt-5 text-center">
        <h1 className="section-title">🔥 Los productos más comprados</h1>
        
        <div className="row row-cols-1 row-cols-md-3 g-4">
          {inventario.map((producto) => (
            <div className="col" key={producto.id}>
              <div className="card h-100">
                <img src={producto.img} className="card-img-top p-3" alt={producto.nombre} style={{borderRadius: '20px'}} />
                <div className="card-body text-start text-white">
                  <h3 className="fw-bold">${producto.precio.toLocaleString('es-CL')}</h3>
                  <p className="card-text">{producto.nombre}</p>
                  <button className="btn btn-primary w-100">Ver Detalles</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- CHATBOT FLOTANTE --- */}
      <div className="chat-widget">
        <div className="chat-header" onClick={() => setChatAbierto(!chatAbierto)}>
          🤖 Asistente PC Hub {chatAbierto ? '▼' : '▲'}
        </div>
        
        {chatAbierto && (
          <>
            <div className="chat-body">
              {mensajes.map((msg, i) => (
                <div key={i} style={{ 
                  textAlign: msg.sender === 'user' ? 'right' : 'left',
                  margin: '5px 0' 
                }}>
                  <span style={{
                    background: msg.sender === 'user' ? '#007bff' : '#e9ecef',
                    color: msg.sender === 'user' ? 'white' : 'black',
                    padding: '8px 12px',
                    borderRadius: '15px',
                    display: 'inline-block'
                  }}>
                    {msg.text}
                  </span>
                </div>
              ))}
              {cargando && <small className="text-muted">Escribiendo...</small>}
            </div>
            <div className="chat-input">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && enviarMensaje()}
                placeholder="Pregunta por un PC..."
              />
              <button onClick={enviarMensaje}>Enviar</button>
            </div>
          </>
        )}
      </div>

      <div style={{height: '100px'}}></div> {/* Espacio extra abajo */}
    </div>
  );
}

export default App;