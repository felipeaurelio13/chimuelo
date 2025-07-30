import React from 'react';
import AppVersion from './AppVersion';

interface AppFooterProps {
  className?: string;
}

const AppFooter: React.FC<AppFooterProps> = ({ className = '' }) => {
  return (
    <footer className={`app-footer ${className}`}>
      <div className="footer-content">
        <div className="footer-info">
          <span className="app-name">Chimuelo</span>
          <span className="footer-separator">•</span>
          <AppVersion showLabel format="detailed" showTooltip />
        </div>
        <div className="footer-love">
          <span>Hecho con 💙 para Maxi</span>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;