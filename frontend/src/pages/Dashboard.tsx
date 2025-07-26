import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
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
  const { state: dataState } = useData();
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  
  // Procesar datos reales cuando cambien
  useEffect(() => {
    if (!dataState.healthRecords) return;
    
    // Ordenar registros por fecha
    const sortedRecords = [...dataState.healthRecords].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Obtener último peso
    const lastWeight = sortedRecords.find(r => r.type === 'weight');
    const weightValue = lastWeight ? 
      `${lastWeight.data.value} ${lastWeight.data.unit || 'kg'}` : 
      'Sin datos';
    
    // Obtener última altura
    const lastHeight = sortedRecords.find(r => r.type === 'height');
    const heightValue = lastHeight ? 
      `${lastHeight.data.value} ${lastHeight.data.unit || 'cm'}` : 
      'Sin datos';
    
    // Contar registros con atención requerida
    const attentionCount = sortedRecords.filter(r => r.requiresAttention).length;
    
    // Actualizar estadísticas rápidas
    setQuickStats([
      {
        label: 'Último peso',
        value: weightValue,
        icon: '⚖️',
        color: 'blue'
      },
      {
        label: 'Altura actual',
        value: heightValue,
        icon: '📏',
        color: 'green'
      },
      {
        label: 'Total registros',
        value: sortedRecords.length.toString(),
        icon: '📊',
        color: 'purple'
      },
      {
        label: 'Requieren atención',
        value: attentionCount.toString(),
        icon: attentionCount > 0 ? '🚨' : '✅',
        color: attentionCount > 0 ? 'red' : 'green'
      }
    ]);
    
    // Preparar registros recientes
    const recent = sortedRecords.slice(0, 5).map(record => {
      const date = new Date(record.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateStr = '';
      if (date.toDateString() === today.toDateString()) {
        dateStr = 'Hoy';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateStr = 'Ayer';
      } else {
        const days = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        dateStr = `Hace ${days} días`;
      }
      
      let value = '';
      let icon = '📝';
      
      switch (record.type) {
        case 'weight':
          value = `${record.data.value} ${record.data.unit || 'kg'}`;
          icon = '⚖️';
          break;
        case 'height':
          value = `${record.data.value} ${record.data.unit || 'cm'}`;
          icon = '📏';
          break;
        case 'temperature':
          value = `${record.data.value} ${record.data.unit || '°C'}`;
          icon = '🌡️';
          break;
        case 'symptom':
          value = record.data.description || 'Síntoma registrado';
          icon = '🤒';
          break;
        case 'note':
          value = record.data.content || 'Nota';
          icon = '📝';
          break;
        default:
          value = record.notes || 'Registro';
      }
      
      return {
        id: record.id,
        type: record.type.charAt(0).toUpperCase() + record.type.slice(1),
        value,
        date: dateStr,
        icon
      };
    });
    
    setRecentRecords(recent);
  }, [dataState.healthRecords]);

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
export { Dashboard };