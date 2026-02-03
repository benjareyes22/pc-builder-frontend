import React, { useState } from 'react';
import { Container, Form, Button, Card, Alert } from 'react-bootstrap';
import { supabase } from '../supabase'; 
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); 
  const [isError, setIsError] = useState(false); 
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) throw error;

      // --- FIX DEL BUG: DETECTAR SI EL USUARIO YA EXISTE ---
      // Si Supabase devuelve un usuario pero "identities" está vacío,
      // significa que el correo ya está registrado (en la mayoría de las configuraciones).
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error("User already registered");
      }
      
      setIsError(false);
      setMessage("¡Cuenta creada con éxito! Ahora puedes iniciar sesión.");
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      setIsError(true);
      // Traducimos el error al español para que se entienda clarito
      if (error.message.includes("already registered") || error.message.includes("User already registered")) {
        setMessage("⚠️ Este correo ya está ocupado. Intenta iniciar sesión.");
      } else if (error.message.includes("Password")) {
        setMessage("⚠️ La contraseña es muy débil (Mínimo 6 caracteres).");
      } else {
        setMessage("Error: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      {/* Tarjeta Oscura */}
      <Card className="shadow p-4 border-secondary" style={{ width: '100%', maxWidth: '400px', backgroundColor: '#1e1f22' }}>
        
        <h2 className="text-center mb-4 fw-bold text-white">Crear Cuenta</h2>
        
        {message && (
          <Alert variant={isError ? "danger" : "success"} className={isError ? "bg-danger text-white border-0" : "bg-success text-white border-0"}>
            {message}
          </Alert>
        )}

        <Form onSubmit={handleRegister}>
          <Form.Group className="mb-3">
            <Form.Label className="text-white">Correo Electrónico</Form.Label>
            <Form.Control 
              type="email" 
              placeholder="tu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-dark text-white border-secondary"
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="text-white">Contraseña</Form.Label>
            <Form.Control 
              type="password" 
              placeholder="Mínimo 6 caracteres" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-dark text-white border-secondary"
            />
          </Form.Group>

          {/* Botón Azul (Primary) con texto blanco */}
          <Button variant="primary" type="submit" className="w-100 fw-bold text-white" disabled={loading}>
            {loading ? 'Creando...' : 'Registrarme'}
          </Button>
        </Form>

        {/* Texto de abajo todo blanco */}
        <div className="text-center mt-3">
          <small className="text-white">
            ¿Ya tienes cuenta? <Link to="/login" className="text-white fw-bold text-decoration-underline">Inicia Sesión aquí</Link>
          </small>
        </div>
      </Card>
    </Container>
  );
}