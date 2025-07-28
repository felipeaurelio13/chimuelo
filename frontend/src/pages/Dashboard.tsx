import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { dataIntegrityService } from '../services/dataIntegrityService';
import AppVersion from '../components/AppVersion';

const getActivityIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    weight: '⚖️',
    height: '📏',
    temperature: '🌡️',
    symptom: '🤒',
    medication: '💊',
    vaccine: '💉',
    milestone: '🎯',
    note: '📝'
  };
  return iconMap[type] || '📝';
};

const getActivityTitle = (type: string): string => {
  const titleMap: Record<string, string> = {
    weight: 'Peso',
    height: 'Altura',
    temperature: 'Temperatura',
    symptom: 'Síntoma',
    medication: 'Medicación',
    vaccine: 'Vacuna',
    milestone: 'Hito',
    note: 'Nota'
  };
  return titleMap[type] || 'Actividad';
};

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { state } = useData();
  const navigate = useNavigate();
  const [babyAge, setBabyAge] = useState<string>('');

  useEffect(() => {
    // Get baby's age from data integrity service
    setBabyAge(dataIntegrityService.calculateAge());
  }, []);

  const quickActions = [
    {
      id: 'capture',
      icon: '📝',
      title: 'Registrar',
      subtitle: 'Nueva actividad',
      color: 'var(--primary-calm)',
      action: () => navigate('/capture')
    },
    {
      id: 'medical-file',
      icon: '🩺',
      title: 'Ficha Médica',
      subtitle: 'Ver perfil completo',
      color: 'var(--primary-warm)',
      action: () => navigate('/medical-file')
    },
    {
      id: 'chat',
      icon: '💭',
      title: 'Consultar IA',
      subtitle: 'Preguntas y consejos',
      color: 'var(--success-gentle)',
      action: () => navigate('/chat')
    }
  ];

  const recentStats = [
    {
      label: 'Registros hoy',
      value: state.healthRecords.filter(record => {
        const today = new Date().toDateString();
        return new Date(record.timestamp).toDateString() === today;
      }).length.toString()
    },
    {
      label: 'Edad de Maxi',
      value: babyAge
    },
    {
      label: 'Total registros',
      value: state.healthRecords.length.toString()
    }
  ];

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header safe-area-top">
        <div className="container">
          <div className="header-content">
            <div className="greeting">
              <h1 className="greeting-text">
                Hola, {user?.name || 'Mamá'} 👋
              </h1>
              <p className="greeting-subtitle">
                ¿Cómo está Maxi hoy?
              </p>
            </div>
            <div className="header-actions">
              <AppVersion className="header-version" showLabel />
              <button 
                className="btn btn-minimal"
                onClick={logout}
                aria-label="Cerrar sesión"
              >
                ↗️
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <section className="quick-stats">
        <div className="container">
          <div className="stats-grid">
            {recentStats.map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <div className="container">
          <h2 className="section-title">Acciones rápidas</h2>
          <div className="actions-grid">
            {quickActions.map((action) => (
              <button
                key={action.id}
                className="action-card"
                onClick={action.action}
                style={{ '--accent-color': action.color } as React.CSSProperties}
              >
                <div className="action-icon">{action.icon}</div>
                <div className="action-content">
                  <div className="action-title">{action.title}</div>
                  <div className="action-subtitle">{action.subtitle}</div>
                </div>
                <div className="action-arrow">→</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Activity Preview */}
      {state.healthRecords.length > 0 && (
        <section className="recent-activity">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Actividad reciente</h2>
              <button 
                className="btn btn-minimal"
                onClick={() => navigate('/medical-file')}
              >
                Ver todo
              </button>
            </div>
            <div className="activity-list">
              {state.healthRecords
                .slice(0, 3)
                .map((record, index) => (
                                     <div key={record.id || index} className="activity-item">
                     <div className="activity-type">
                       {getActivityIcon(record.type)}
                     </div>
                     <div className="activity-content">
                       <div className="activity-title">
                         {getActivityTitle(record.type)}
                       </div>
                       <div className="activity-time">
                         {new Date(record.timestamp).toLocaleTimeString('es-ES', {
                           hour: '2-digit',
                           minute: '2-digit'
                         })}
                       </div>
                     </div>
                   </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State for New Users */}
      {state.healthRecords.length === 0 && (
        <section className="empty-state">
          <div className="container">
            <div className="empty-state-content">
              <div className="empty-state-icon">🌟</div>
              <h3 className="empty-state-title">
                ¡Bienvenida a Chimuelo!
              </h3>
              <p className="empty-state-description">
                Comienza registrando la primera actividad de Maxi para crear su perfil médico completo.
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/capture')}
              >
                Primer registro
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Safe Area Bottom Padding */}
      <div className="safe-area-bottom" style={{ height: 'var(--space-8)' }} />
    </div>
  );
};

export default Dashboard;