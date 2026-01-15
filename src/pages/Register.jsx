import React, { useState } from 'react';
import { Container, Form, Button, Card, Alert } from 'react-bootstrap';
import { supabase } from '../supabase'; // Tu llave maestra
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // Para mostrar errores o éxito
  const [isError, setIsError] = useState(false); // ¿Es mensaje bueno o malo?

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // 1. Enviamos los datos a Supabase para crear el usuario
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) throw error;

      // 2. Si sale bien:
      setIsError(false);
      setMessage("¡Cuenta creada con éxito! Ahora puedes iniciar sesión.");
      
      // Opcional: Esperar 2 segundos y mandar al Login
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      setIsError(true);
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <Card className="shadow p-4" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 className="text-center mb-4 fw-bold text-warning">Crear Cuenta</h2>
        
        {/* Aquí mostramos las alertas */}
        {message && (
          <Alert variant={isError ? "danger" : "success"}>
            {message}
          </Alert>
        )}

        <Form onSubmit={handleRegister}>
          <Form.Group className="mb-3">
            <Form.Label>Correo Electrónico</Form.Label>
            <Form.Control 
              type="email" 
              placeholder="tu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Contraseña</Form.Label>
            <Form.Control 
              type="password" 
              placeholder="Mínimo 6 caracteres" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </Form.Group>

          <Button variant="warning" type="submit" className="w-100 fw-bold" disabled={loading}>
            {loading ? 'Creando...' : 'Registrarme'}
          </Button>
        </Form>

        <div className="text-center mt-3">
          <small>
            ¿Ya tienes cuenta? <Link to="/login">Inicia Sesión aquí</Link>
          </small>
        </div>
      </Card>
    </Container>
  );
}