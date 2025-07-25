import React from 'react';

const Chat: React.FC = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>💬 Chat con IA</h1>
      <p>Próximamente: Chat inteligente con contexto médico</p>
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
        <p><strong>Funcionalidades planeadas:</strong></p>
        <ul style={{ textAlign: 'left', display: 'inline-block' }}>
          <li>Chat contextual con IA</li>
          <li>Búsqueda web integrada</li>
          <li>Historial de conversaciones</li>
          <li>Recomendaciones personalizadas</li>
        </ul>
      </div>
    </div>
  );
};

export default Chat;