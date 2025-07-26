import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  description?: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '📊', description: 'Vista general' },
  { path: '/capture', label: 'Capturar', icon: '📱', description: 'Registrar datos' },
  { path: '/timeline', label: 'Timeline', icon: '📅', description: 'Historial médico' },
  { path: '/chat', label: 'Chat IA', icon: '💬', description: 'Consultar IA' },
  { path: '/profile', label: 'Perfil', icon: '👶', description: 'Perfil del niño' },
  { path: '/settings', label: 'Ajustes', icon: '⚙️', description: 'Configuración' },
];

export const ModernNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <nav className="ds-nav">
      <div className="ds-container">
        <div className="ds-nav-content">
          {/* Logo/Brand */}
          <div className="ds-flex ds-items-center ds-gap-3">
            <div className="ds-flex ds-items-center ds-gap-2">
              <span style={{ fontSize: '1.5rem' }}>🦷</span>
              <span className="ds-text-xl ds-font-bold ds-text-primary">Chimuelo</span>
            </div>
            {user && (
              <div className="ds-text-sm ds-text-secondary">
                para {user.childName || 'Maxi'}
              </div>
            )}
          </div>

          {/* Navigation Links - Desktop */}
          <div className="ds-flex ds-items-center ds-gap-2" style={{ display: 'none' }}>
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`ds-nav-link ${isActive(item.path) ? 'active' : ''}`}
                title={item.description}
              >
                <span style={{ marginRight: '0.5rem' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* User Actions */}
          <div className="ds-flex ds-items-center ds-gap-3">
            {user && (
              <>
                <div className="ds-text-sm ds-text-secondary" style={{ display: 'none' }}>
                  {user.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="ds-button ds-button-ghost ds-button-sm"
                >
                  Salir
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="mobile-nav ds-flex ds-gap-1 ds-p-2" style={{ 
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`mobile-nav-item ds-flex ds-flex-col ds-items-center ds-gap-1 ds-p-2 ds-rounded-lg ${
                isActive(item.path) ? 'active' : ''
              }`}
              style={{
                minWidth: '4rem',
                fontSize: '0.75rem',
                border: 'none',
                background: isActive(item.path) ? 'var(--color-primary-light)' : 'transparent',
                color: isActive(item.path) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                transition: 'all var(--transition-fast)',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
              <span style={{ fontSize: '0.625rem', fontWeight: 'var(--font-medium)' }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .mobile-nav {
          border-top: 1px solid var(--color-border);
          background-color: var(--color-surface);
        }
        
        .mobile-nav::-webkit-scrollbar {
          display: none;
        }
        
        .mobile-nav-item:hover {
          background-color: var(--color-surface-hover) !important;
          color: var(--color-text-primary) !important;
          transform: translateY(-1px);
        }
        
        .mobile-nav-item.active {
          background-color: var(--color-primary-light) !important;
          color: var(--color-primary) !important;
        }
        
        @media (min-width: 768px) {
          .mobile-nav {
            display: none;
          }
          
          .ds-nav-content > .ds-flex:nth-child(2) {
            display: flex !important;
          }
          
          .ds-nav-content > .ds-flex:nth-child(3) .ds-text-sm {
            display: block !important;
          }
        }
      `}</style>
    </nav>
  );
};

export default ModernNav;