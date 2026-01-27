import React, { useState, useEffect } from 'react';
import { NavDropdown, Form, Button, Spinner } from 'react-bootstrap';
import { supabase } from '../supabase'; // Asegúrate que la ruta sea correcta
import { User, LogOut, Edit2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UserMenu({ session }) {
  const [nickname, setNickname] = useState('Usuario');
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 1. Cargar el nombre al iniciar el componente
  useEffect(() => {
    if (session?.user) {
      getProfile();
    }
  }, [session]);

  const getProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('nombre_usuario')
        .eq('id', session.user.id)
        .single();

      if (data && data.nombre_usuario) {
        setNickname(data.nombre_usuario);
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
    }
  };

  // 2. Función para guardar el nuevo nombre
  const updateProfile = async () => {
    if (!tempName.trim()) return; // No guardar vacíos
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('perfiles')
        .update({ nombre_usuario: tempName })
        .eq('id', session.user.id);

      if (error) throw error;

      setNickname(tempName);
      setIsEditing(false);
    } catch (error) {
      alert('Error al actualizar el nombre');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Evita que se cierre el dropdown
    setTempName(nickname);
    setIsEditing(true);
  };

  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    updateProfile();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <NavDropdown 
      title={
        <span className="d-inline-flex align-items-center gap-2">
          <div className="bg-light text-dark rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
            <User size={18} />
          </div>
          <span className="fw-bold text-white">{nickname}</span>
        </span>
      } 
      id="user-nav-dropdown" 
      align="end"
    >
      {/* SECCIÓN DE EDICIÓN DE NOMBRE */}
      <div className="px-3 py-2 border-bottom" style={{ minWidth: '250px' }}>
        <small className="text-muted d-block mb-1">Hola,</small>
        
        {isEditing ? (
          <div className="d-flex gap-2 align-items-center">
            <Form.Control 
              size="sm" 
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            <Button variant="success" size="sm" className="p-1" onClick={handleSave} disabled={loading}>
              {loading ? <Spinner size="sm" animation="border" /> : <Check size={16} />}
            </Button>
            <Button variant="outline-secondary" size="sm" className="p-1" onClick={handleCancel}>
              <X size={16} />
            </Button>
          </div>
        ) : (
          <div className="d-flex justify-content-between align-items-center group-hover-edit">
            <h6 className="mb-0 fw-bold text-dark text-truncate" style={{ maxWidth: '180px' }}>
              {nickname}
            </h6>
            <Button variant="link" size="sm" className="text-muted p-0" onClick={handleEditClick} title="Editar nombre">
              <Edit2 size={14} />
            </Button>
          </div>
        )}
        <small className="text-muted" style={{ fontSize: '0.75rem' }}>{session.user.email}</small>
      </div>

      {/* BOTÓN DE CERRAR SESIÓN */}
      <NavDropdown.Item onClick={handleLogout} className="text-danger mt-2 d-flex align-items-center gap-2">
        <LogOut size={16} /> Cerrar Sesión
      </NavDropdown.Item>
    </NavDropdown>
  );
}