import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import '../styles/Dashboard.css';

interface QuickStat {
  label: string;
  value: string;
  icon: string;
  color: string;
}

interface RecentRecord {
  id: string;
  type: string;
  value: string;
  date: string;
  icon: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [recentRecords] = useState<RecentRecord[]>([
    {
      id: '1',
      type: 'Peso',
      value: '8.5 kg',
      date: 'Hoy',
      icon: '⚖️'
    },
    {
      id: '2',
      type: 'Altura',
      value: '68 cm',
      date: 'Ayer',
      icon: '📏'
    },
    {
      id: '3',
      type: 'Vacuna',
      value: 'Hepatitis B',
      date: 'Hace 3 días',
      icon: '💉'
    }
  ]);

  const quickStats: QuickStat[] = [
    {
      label: 'Último peso',
      value: '8.5 kg',
      icon: '⚖️',
      color: 'blue'
    },
    {
      label: 'Altura actual',
      value: '68 cm',
      icon: '📏',
      color: 'green'
    },
    {
      label: 'Edad',
      value: '7 meses',
      icon: '🎂',
      color: 'purple'
    },
    {
      label: 'Registros',
      value: '23',
      icon: '📊',
      color: 'orange'
    }
  ];

  // Check Worker connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await apiService.healthCheck();
        setIsConnected(response.success);
      } catch (error) {
        console.error('Worker connection failed:', error);
        setIsConnected(false);
      }
    };

    checkConnection();
  }, []);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'capture':
        navigate('/capture');
        break;
      case 'timeline':
        navigate('/timeline');
        break;
      case 'chat':
        navigate('/chat');
        break;
      case 'profile':
        navigate('/profile');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const formatGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="greeting">
          <h1>{formatGreeting()}, {user?.name || 'Usuario'}</h1>
          <p>¿Cómo está Maxi hoy?</p>
        </div>
        <div className="header-actions">
          <button 
            className="connection-status"
            title={isConnected ? 'Conectado al servidor' : 'Sin conexión al servidor'}
          >
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
            {isConnected ? 'Online' : 'Offline'}
          </button>
          <button className="profile-button" onClick={() => navigate('/profile')}>
            <span className="profile-avatar">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </button>
        </div>
      </header>

      <section className="quick-stats">
        <h2 className="section-title">Resumen</h2>
        <div className="stats-grid">
          {quickStats.map((stat, index) => (
            <div key={index} className={`stat-card ${stat.color}`}>
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-content">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="quick-actions">
        <h2 className="section-title">Acciones rápidas</h2>
        <div className="actions-grid">
          <button 
            className="action-card primary"
            onClick={() => handleQuickAction('capture')}
          >
            <div className="action-icon">📸</div>
            <div className="action-content">
              <h3>Capturar datos</h3>
              <p>Foto, texto o audio</p>
            </div>
          </button>
          
          <button 
            className="action-card"
            onClick={() => handleQuickAction('timeline')}
          >
            <div className="action-icon">📅</div>
            <div className="action-content">
              <h3>Timeline</h3>
              <p>Ver historial</p>
            </div>
          </button>
          
          <button 
            className="action-card"
            onClick={() => handleQuickAction('chat')}
          >
            <div className="action-icon">💬</div>
            <div className="action-content">
              <h3>Preguntar a IA</h3>
              <p>Dudas sobre salud</p>
            </div>
          </button>
          
          <button 
            className="action-card"
            onClick={() => handleQuickAction('profile')}
          >
            <div className="action-icon">⚙️</div>
            <div className="action-content">
              <h3>Configuración</h3>
              <p>Perfil y ajustes</p>
            </div>
          </button>
        </div>
      </section>

      <section className="recent-activity">
        <div className="section-header">
          <h2 className="section-title">Actividad reciente</h2>
          <button 
            className="view-all-button"
            onClick={() => navigate('/timeline')}
          >
            Ver todo
          </button>
        </div>
        
        <div className="activity-list">
          {recentRecords.map((record) => (
            <div key={record.id} className="activity-item">
              <div className="activity-icon">{record.icon}</div>
              <div className="activity-content">
                <div className="activity-title">{record.type}</div>
                <div className="activity-value">{record.value}</div>
              </div>
              <div className="activity-date">{record.date}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Emergency/Quick Actions FAB */}
      <button 
        className="fab primary"
        onClick={() => handleQuickAction('capture')}
        title="Capturar datos rápidamente"
      >
        <span className="fab-icon">+</span>
      </button>
    </div>
  );
};

export default Dashboard;