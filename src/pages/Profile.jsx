import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { supabase } from '../supabase';

export default function Profile() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email);
      // Aquí buscamos si ya tiene un apodo guardado en su "mochila" (metadata)
      setUsername(user.user_metadata?.username || '');
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Guardamos el nuevo nombre en la metadata del usuario
      const { error } = await supabase.auth.updateUser({
        data: { username: username }
      });

      if (error) throw error;
      setMessage('✅ ¡Nombre actualizado con éxito!');
      
      // Recargamos la página después de 1 segundo para ver el cambio arriba
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center mt-5">
      <Card className="shadow p-4" style={{ width: '100%', maxWidth: '500px' }}>
        <h2 className="text-center mb-4 text-warning fw-bold">Mi Perfil 👤</h2>
        
        {message && <Alert variant={message.includes('Error') ? 'danger' : 'success'}>{message}</Alert>}

        <Form onSubmit={updateProfile}>
          <Form.Group className="mb-3">
            <Form.Label>Correo (No editable)</Form.Label>
            <Form.Control type="text" value={email} disabled className="bg-light" />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Nombre de Usuario / Nickname</Form.Label>
            <Form.Control 
              type="text" 
              placeholder="Ej: MasterPC_2026" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Form.Text className="text-muted">
              Este es el nombre que se verá en la barra de navegación.
            </Form.Text>
          </Form.Group>

          <Button variant="primary" type="submit" className="w-100" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </Form>
      </Card>
    </Container>
  );
}