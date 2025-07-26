import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

interface DashboardHeaderProps {
  babyName?: string;
  lastUpdate?: Date;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  babyName, 
  lastUpdate 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();

  const formatLastUpdate = (date?: Date) => {
    if (!date) return 'Sin datos';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `Hace ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours}h`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-ES');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      case 'system': return '🖥️';
      default: return '🎨';
    }
  };

  return (
    <header className="dashboard-header">
      <div className="header-main">
        <div className="greeting-section">
          <div className="greeting">
            {getGreeting()}{user?.email && `, ${user.email.split('@')[0]}`}
          </div>
          <h1 className="baby-name">
            {babyName ? `${babyName} 👶` : 'Tu bebé 👶'}
          </h1>
          {lastUpdate && (
            <div className="last-update">
              Última actualización: {formatLastUpdate(lastUpdate)}
            </div>
          )}
        </div>
        
        <div className="header-actions">
          <button 
            className="btn btn-secondary theme-indicator"
            onClick={() => navigate('/settings')}
            title={`Tema: ${theme}`}
          >
            {getThemeIcon()}
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/profile')}
            title="Perfil"
          >
            👤
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/settings')}
            title="Configuración"
          >
            ⚙️
          </button>
        </div>
      </div>
      
      <div className="quick-actions">
        <button 
          className="quick-action btn btn-primary"
          onClick={() => navigate('/capture')}
        >
          <span className="action-icon">📝</span>
          <span className="action-text">Agregar datos</span>
        </button>
        
        <button 
          className="quick-action btn btn-secondary"
          onClick={() => navigate('/chat')}
        >
          <span className="action-icon">💬</span>
          <span className="action-text">Consultar IA</span>
        </button>
        
        <button 
          className="quick-action btn btn-secondary"
          onClick={() => navigate('/timeline')}
        >
          <span className="action-icon">📅</span>
          <span className="action-text">Ver timeline</span>
        </button>
      </div>
    </header>
  );
};

// Inject specific styles for this component
const styles = `
.dashboard-header {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-primary);
  padding: 1.5rem 2rem;
  box-shadow: var(--shadow-sm);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.greeting-section {
  flex: 1;
}

.greeting {
  color: var(--text-secondary);
  font-size: 0.925rem;
  margin-bottom: 0.5rem;
}

.baby-name {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.last-update {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.theme-indicator {
  font-size: 1.25rem;
  min-width: 44px;
  height: 44px;
}

.quick-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.quick-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: var(--border-radius);
  transition: all var(--transition-fast);
  text-decoration: none;
  min-width: 140px;
  justify-content: center;
}

.quick-action:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.action-icon {
  font-size: 1.25rem;
}

.action-text {
  font-weight: 500;
  font-size: 0.925rem;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-header {
    padding: 1rem;
  }
  
  .header-main {
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .header-actions {
    align-self: flex-end;
  }
  
  .baby-name {
    font-size: 1.5rem;
  }
  
  .quick-actions {
    justify-content: center;
  }
  
  .quick-action {
    flex: 1;
    min-width: 100px;
    max-width: 150px;
  }
  
  .action-text {
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .quick-actions {
    flex-direction: column;
  }
  
  .quick-action {
    width: 100%;
    max-width: none;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const existingStyles = document.getElementById('dashboard-header-styles');
  if (!existingStyles) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'dashboard-header-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
}

export default DashboardHeader;