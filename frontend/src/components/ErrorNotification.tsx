import React, { useState, useEffect } from 'react';
import { type ErrorInfo } from '../services/errorHandler';
import '../styles/ErrorNotification.css';

interface ErrorNotificationProps {
  error: ErrorInfo;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ 
  error, 
  onClose, 
  autoClose = true, 
  duration = 5000 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#e74c3c';
      case 'high':
        return '#f39c12';
      case 'medium':
        return '#f1c40f';
      case 'low':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
      default:
        return '❓';
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className="error-notification"
      style={{ borderLeftColor: getSeverityColor(error.severity) }}
    >
      <div className="error-header">
        <div className="error-icon">
          {getSeverityIcon(error.severity)}
        </div>
        <div className="error-content">
          <h4 className="error-title">
            {error.code === 'NETWORK_ERROR' && 'Error de Conexión'}
            {error.code === 'AI_ERROR' && 'Error de IA'}
            {error.code === 'VALIDATION_ERROR' && 'Error de Validación'}
            {error.code === 'DATABASE_ERROR' && 'Error de Base de Datos'}
            {error.code === 'UI_ERROR' && 'Error de Interfaz'}
            {error.code === 'UNKNOWN_ERROR' && 'Error Desconocido'}
          </h4>
          <p className="error-message">{error.userMessage}</p>
        </div>
        <button 
          className="error-close"
          onClick={handleClose}
          aria-label="Cerrar notificación"
        >
          ✕
        </button>
      </div>
      
      {import.meta.env.VITE_DEV === 'TRUE' && (
        <div className="error-details">
          <button 
            className="error-toggle-details"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Ocultar' : 'Mostrar'} detalles técnicos
          </button>
          
          {isExpanded && (
            <div className="error-technical-details">
              <div className="detail-item">
                <strong>Código:</strong> {error.code}
              </div>
              <div className="detail-item">
                <strong>Severidad:</strong> {error.severity}
              </div>
              <div className="detail-item">
                <strong>Categoría:</strong> {error.category}
              </div>
              <div className="detail-item">
                <strong>Reintentable:</strong> {error.retryable ? 'Sí' : 'No'}
              </div>
              <div className="detail-item">
                <strong>Mensaje técnico:</strong> {error.message}
              </div>
              {error.context && (
                <div className="detail-item">
                  <strong>Contexto:</strong>
                  <pre>{JSON.stringify(error.context, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorNotification;