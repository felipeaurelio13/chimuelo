import React, { Component, ErrorInfo, ReactNode } from 'react';
import ErrorHandler, { type ErrorInfo as AppErrorInfo } from '../services/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Crear error info para logging
    const appErrorInfo = ErrorHandler.createUIError(error, { 
      errorInfo,
      componentStack: errorInfo.componentStack 
    });
    ErrorHandler.getInstance().logError(appErrorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Renderizar fallback personalizado o el default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback por defecto
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>😔 Algo salió mal</h2>
            <p>Ocurrió un error inesperado. Por favor, recarga la página.</p>
            <button 
              onClick={() => window.location.reload()}
              className="reload-button"
            >
              🔄 Recargar página
            </button>
            {import.meta.env.VITE_DEV === 'TRUE' && this.state.error && (
              <details className="error-details">
                <summary>Detalles del error (solo desarrollo)</summary>
                <pre>{this.state.error.toString()}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;