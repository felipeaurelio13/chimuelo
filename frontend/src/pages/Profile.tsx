import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>⚙️ Perfil y Configuración</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
        <h2>Información del Usuario</h2>
        <p><strong>Nombre:</strong> {user?.name}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Miembro desde:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
      </div>

      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
        <h2>Próximamente</h2>
        <ul>
          <li>Configuración de notificaciones</li>
          <li>Preferencias de unidades (kg/lb, cm/in)</li>
          <li>Temas (claro/oscuro/bebé dormido)</li>
          <li>Configuración de backup</li>
          <li>Gestión de datos</li>
        </ul>
      </div>

      <button 
        onClick={handleLogout}
        style={{
          background: '#dc2626',
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          fontSize: '1rem',
          cursor: 'pointer',
          transition: 'background 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#b91c1c'}
        onMouseOut={(e) => e.currentTarget.style.background = '#dc2626'}
      >
        Cerrar Sesión
      </button>
    </div>
  );
};

export default Profile;