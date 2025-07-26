import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';

interface QuickStat {
  label: string;
  value: string;
  icon: string;
  trend?: string;
  color: string;
}

interface QuickAction {
  label: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}

const ModernDashboard: React.FC = () => {
  const { user } = useAuth();
  const { state: { healthRecords = [], isLoading }, refreshHealthRecords } = useData();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      refreshHealthRecords();
    }
  }, [user?.id, refreshHealthRecords]);

  // Quick stats from health records
  const quickStats: QuickStat[] = useMemo(() => {
    if (!Array.isArray(healthRecords) || healthRecords.length === 0) {
      return [
        { label: 'Peso actual', value: 'Sin datos', icon: '⚖️', color: 'var(--color-text-muted)' },
        { label: 'Altura actual', value: 'Sin datos', icon: '📏', color: 'var(--color-text-muted)' },
        { label: 'Total registros', value: '0', icon: '📊', color: 'var(--color-text-muted)' },
        { label: 'Alertas', value: '0', icon: '✅', color: 'var(--color-success)' }
      ];
    }

    const sortedRecords = [...healthRecords].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Get latest weight
    const lastWeight = sortedRecords.find(r => r.type === 'weight');
    const weightValue = lastWeight ? 
      `${lastWeight.data.value}${lastWeight.data.unit || 'kg'}` : 
      'Sin datos';

    // Get latest height
    const lastHeight = sortedRecords.find(r => r.type === 'height');
    const heightValue = lastHeight ? 
      `${lastHeight.data.value}${lastHeight.data.unit || 'cm'}` : 
      'Sin datos';

    // Count attention needed
    const attentionCount = sortedRecords.filter(r => r.requiresAttention).length;

    // Recent records for trends
    const recentCount = sortedRecords.filter(r => {
      const recordDate = new Date(r.timestamp);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return recordDate >= weekAgo;
    }).length;

    return [
      {
        label: 'Peso actual',
        value: weightValue,
        icon: '⚖️',
        trend: lastWeight ? 'Actualizado' : undefined,
        color: 'var(--color-success)'
      },
      {
        label: 'Altura actual',
        value: heightValue,
        icon: '📏',
        trend: lastHeight ? 'Actualizado' : undefined,
        color: 'var(--color-primary)'
      },
      {
        label: 'Esta semana',
        value: recentCount.toString(),
        icon: '📊',
        trend: `${recentCount} registros`,
        color: 'var(--color-secondary)'
      },
      {
        label: 'Alertas médicas',
        value: attentionCount.toString(),
        icon: attentionCount > 0 ? '🚨' : '✅',
        trend: attentionCount > 0 ? 'Requiere atención' : 'Todo bien',
        color: attentionCount > 0 ? 'var(--color-danger)' : 'var(--color-success)'
      }
    ];
  }, [healthRecords]);

  // Recent activity
  const recentActivity = useMemo(() => {
    if (!Array.isArray(healthRecords)) return [];

    return healthRecords
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
      .map(record => {
        const date = new Date(record.timestamp);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        
        let dateStr = '';
        if (isToday) {
          dateStr = `Hoy ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
          dateStr = date.toLocaleDateString('es-ES', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }

        return {
          ...record,
          displayDate: dateStr,
          isToday
        };
      });
  }, [healthRecords]);

  // Quick actions
  const quickActions: QuickAction[] = [
    {
      label: 'Registrar datos',
      description: 'Peso, altura, temperatura, síntomas...',
      icon: '📱',
      path: '/capture',
      color: 'var(--color-primary)'
    },
    {
      label: 'Consultar IA',
      description: 'Haz preguntas sobre la salud de Maxi',
      icon: '💬',
      path: '/chat',
      color: 'var(--color-secondary)'
    },
    {
      label: 'Ver historial',
      description: 'Timeline completo de registros médicos',
      icon: '📅',
      path: '/timeline',
      color: 'var(--color-health)'
    },
    {
      label: 'Perfil médico',
      description: 'Información y configuración del niño',
      icon: '👶',
      path: '/profile',
      color: 'var(--color-warning)'
    }
  ];

  const getTypeIcon = (type: string): string => {
    const iconMap: { [key: string]: string } = {
      'weight': '⚖️',
      'height': '📏',
      'temperature': '🌡️',
      'medication': '💊',
      'symptom': '🤒',
      'feeding': '🍼',
      'note': '📝'
    };
    return iconMap[type] || '📋';
  };

  if (isLoading) {
    return (
      <div className="ds-page">
        <div className="ds-container">
          <div className="ds-section">
            <div className="ds-flex ds-flex-col ds-items-center ds-justify-center" style={{ minHeight: '60vh' }}>
              <div className="ds-spinner" style={{ width: '2rem', height: '2rem', marginBottom: '1rem' }}></div>
              <div className="ds-text-secondary">Cargando dashboard...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ds-page">
      <div className="ds-container">
        {/* Welcome Header */}
        <div className="ds-header">
          <div className="ds-flex ds-items-center ds-gap-3 ds-mb-4">
            <span style={{ fontSize: '3rem' }}>👋</span>
            <div>
              <h1 className="ds-header-title">
                ¡Hola! {currentTime.getHours() < 12 ? 'Buenos días' : 
                       currentTime.getHours() < 18 ? 'Buenas tardes' : 'Buenas noches'}
              </h1>
              <p className="ds-header-subtitle">
                                 Aquí tienes el resumen de salud de Maxi
              </p>
            </div>
          </div>
          <div className="ds-text-sm ds-text-tertiary">
            {currentTime.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="ds-mb-8">
          <h2 className="ds-text-xl ds-font-semibold ds-mb-4 ds-text-primary">
            📊 Resumen rápido
          </h2>
          <div className="ds-flex ds-gap-4" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
          }}>
            {quickStats.map((stat, index) => (
              <div 
                key={index}
                className="ds-card"
                style={{ textAlign: 'center' }}
              >
                <div 
                  style={{ 
                    fontSize: '2rem',
                    marginBottom: '0.5rem',
                    color: stat.color
                  }}
                >
                  {stat.icon}
                </div>
                <div className="ds-text-sm ds-text-secondary ds-mb-1">
                  {stat.label}
                </div>
                <div className="ds-text-lg ds-font-bold ds-text-primary ds-mb-1">
                  {stat.value}
                </div>
                {stat.trend && (
                  <div className="ds-text-xs ds-text-tertiary">
                    {stat.trend}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="ds-mb-8">
          <h2 className="ds-text-xl ds-font-semibold ds-mb-4 ds-text-primary">
            🚀 Acciones rápidas
          </h2>
          <div className="ds-flex ds-gap-4" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
          }}>
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className="ds-card"
                style={{
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  padding: 'var(--space-6)',
                  transition: 'all var(--transition-normal)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                  e.currentTarget.style.borderColor = action.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
              >
                <div className="ds-flex ds-items-start ds-gap-3">
                  <div 
                    style={{ 
                      fontSize: '1.5rem',
                      color: action.color
                    }}
                  >
                    {action.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="ds-font-semibold ds-text-primary ds-mb-1">
                      {action.label}
                    </div>
                    <div className="ds-text-sm ds-text-secondary">
                      {action.description}
                    </div>
                  </div>
                  <div className="ds-text-secondary">→</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="ds-mb-8">
          <div className="ds-flex ds-items-center ds-justify-between ds-mb-4">
            <h2 className="ds-text-xl ds-font-semibold ds-text-primary">
              📋 Actividad reciente
            </h2>
            {recentActivity.length > 0 && (
              <button
                onClick={() => navigate('/timeline')}
                className="ds-button ds-button-ghost ds-button-sm"
              >
                Ver todo
              </button>
            )}
          </div>

          {recentActivity.length === 0 ? (
            <div className="ds-card ds-text-center ds-p-8">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
              <h3 className="ds-text-lg ds-font-semibold ds-mb-2">No hay registros aún</h3>
              <p className="ds-text-secondary ds-mb-4">
                                 Comienza registrando el primer dato médico de Maxi
              </p>
              <button 
                onClick={() => navigate('/capture')}
                className="ds-button ds-button-primary"
              >
                Crear primer registro
              </button>
            </div>
          ) : (
            <div className="ds-flex ds-flex-col ds-gap-3">
              {recentActivity.map((record) => (
                <div 
                  key={record.id}
                  className="ds-card"
                  style={{ 
                    borderLeft: `4px solid ${record.requiresAttention ? 'var(--color-danger)' : 'var(--color-success)'}`
                  }}
                >
                  <div className="ds-flex ds-items-center ds-gap-3">
                    <div style={{ fontSize: '1.25rem' }}>
                      {getTypeIcon(record.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="ds-flex ds-items-center ds-gap-2 ds-mb-1">
                        <span className="ds-font-medium ds-text-primary">
                          {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                        </span>
                        {record.requiresAttention && (
                          <span 
                            className="ds-text-xs ds-rounded-full ds-p-1"
                            style={{ 
                              backgroundColor: 'var(--color-danger-light)',
                              color: 'var(--color-danger)'
                            }}
                          >
                            ¡Atención!
                          </span>
                        )}
                      </div>
                      <div className="ds-text-sm ds-text-secondary">
                        {record.data?.value && record.data?.unit ? 
                          `${record.data.value}${record.data.unit}` :
                          record.data?.notes?.substring(0, 50) + '...' || 'Sin detalles'
                        }
                      </div>
                    </div>
                    <div className="ds-text-xs ds-text-tertiary">
                      {record.displayDate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Health Tips */}
        <div className="ds-card" style={{ 
          background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-surface) 100%)',
          border: '1px solid var(--color-primary)'
        }}>
          <div className="ds-flex ds-items-start ds-gap-3">
            <div style={{ fontSize: '2rem' }}>💡</div>
            <div>
              <h3 className="ds-font-semibold ds-text-primary ds-mb-2">
                Consejo del día
              </h3>
              <p className="ds-text-sm ds-text-secondary">
                                 Recuerda registrar el peso y la altura de Maxi semanalmente 
                para hacer un seguimiento preciso de su crecimiento. 
                La IA puede ayudarte a interpretar los datos y detectar patrones importantes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;