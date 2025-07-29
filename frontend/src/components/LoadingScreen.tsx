import React from 'react';
import Logo from './Logo';
import '../styles/LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Cargando Maxi..." 
}) => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <div className="pulse-circle">
            <Logo size="xlarge" variant="animated" />
          </div>
        </div>
        <h2 className="loading-title">Chimuelo</h2>
        <p className="loading-message">{message}</p>
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;