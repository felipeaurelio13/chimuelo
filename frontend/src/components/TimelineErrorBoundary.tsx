import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class TimelineErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Timeline Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
    
    // Log to analytics service if available
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.logError(error, 'Timeline', errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="timeline-error">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h2>Error en Timeline</h2>
            <p>Hubo un problema cargando tu línea de tiempo. No te preocupes, tus datos están seguros.</p>
            
            {/* Show error details in development */}
            {import.meta.env.VITE_DEV === 'TRUE' && this.state.error && (
              <details className="error-details">
                <summary>Detalles técnicos (desarrollo)</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="error-actions">
              <button 
                className="btn btn-primary" 
                onClick={this.handleReset}
              >
                Intentar de nuevo
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={this.handleReload}
              >
                Recargar página
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => window.history.back()}
              >
                Volver atrás
              </button>
            </div>
            
            <div className="error-help">
              <h3>¿Qué puedes hacer?</h3>
              <ul>
                <li>Intenta recargar la página</li>
                <li>Verifica tu conexión a internet</li>
                <li>Si el problema persiste, ve al Dashboard y regresa</li>
                <li>Como último recurso, limpia el caché del navegador</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Styled error container
const styles = `
.timeline-error {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 2rem;
}

.error-container {
  max-width: 600px;
  text-align: center;
  background: var(--bg-card);
  padding: 3rem 2rem;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-primary);
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.error-container h2 {
  margin: 0 0 1rem 0;
  font-size: 1.75rem;
  color: var(--text-primary);
  font-weight: 600;
}

.error-container p {
  margin: 0 0 2rem 0;
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 1.1rem;
}

.error-details {
  margin: 1rem 0;
  text-align: left;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-sm);
  padding: 1rem;
}

.error-details summary {
  cursor: pointer;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.error-stack {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
  overflow-x: auto;
  background: var(--bg-tertiary);
  padding: 1rem;
  border-radius: var(--border-radius-sm);
  margin-top: 0.5rem;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.error-help {
  text-align: left;
  background: var(--info-light);
  border: 1px solid var(--info);
  border-radius: var(--border-radius-sm);
  padding: 1.5rem;
  margin-top: 2rem;
}

.error-help h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-size: 1.125rem;
  font-weight: 600;
}

.error-help ul {
  margin: 0;
  padding-left: 1.5rem;
  color: var(--text-secondary);
}

.error-help li {
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .timeline-error {
    padding: 1rem;
  }
  
  .error-container {
    padding: 2rem 1rem;
  }
  
  .error-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .error-actions .btn {
    width: 100%;
    max-width: 200px;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default TimelineErrorBoundary;