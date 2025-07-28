import React, { useState } from 'react';
import { AgentConversation, ProcessingStep, QualityMetrics } from '../services/aiAgents';
import '../styles/AgentConversationViewer.css';

interface AgentConversationViewerProps {
  conversations?: AgentConversation[];
  processingSteps?: ProcessingStep[];
  qualityMetrics?: QualityMetrics;
  isVisible: boolean;
  onClose: () => void;
}

const AgentConversationViewer: React.FC<AgentConversationViewerProps> = ({
  conversations = [],
  processingSteps = [],
  qualityMetrics,
  isVisible,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'steps' | 'conversations' | 'metrics'>('steps');

  if (!isVisible) return null;

  const getStepIcon = (action: string) => {
    if (action.includes('Análisis')) return '🔍';
    if (action.includes('individual')) return '🤖';
    if (action.includes('Consolidación')) return '📊';
    if (action.includes('Discusión')) return '💬';
    return '⚙️';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'var(--success)';
    if (confidence >= 0.6) return 'var(--warning)';
    return 'var(--error)';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'var(--success)';
      case 'medium': return 'var(--warning)';
      case 'high': return 'var(--error)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="agent-conversation-overlay">
      <div className="agent-conversation-modal">
        <div className="modal-header">
          <h2>🤖 Detalles del Procesamiento Multi-Agente</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab ${activeTab === 'steps' ? 'active' : ''}`}
            onClick={() => setActiveTab('steps')}
          >
            📋 Pasos ({processingSteps.length})
          </button>
          <button 
            className={`tab ${activeTab === 'conversations' ? 'active' : ''}`}
            onClick={() => setActiveTab('conversations')}
          >
            💬 Conversaciones ({conversations.length})
          </button>
          <button 
            className={`tab ${activeTab === 'metrics' ? 'active' : ''}`}
            onClick={() => setActiveTab('metrics')}
          >
            📊 Métricas
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'steps' && (
            <div className="processing-steps">
              <div className="steps-header">
                <h3>Pasos de Procesamiento</h3>
                <p>Seguimiento detallado de cada agente durante el análisis</p>
              </div>
              {processingSteps.length === 0 ? (
                <div className="empty-state">
                  <p>No hay pasos de procesamiento registrados</p>
                </div>
              ) : (
                <div className="steps-list">
                  {processingSteps.map((step, index) => (
                    <div key={index} className="step-item">
                      <div className="step-header">
                        <div className="step-info">
                          <span className="step-icon">{getStepIcon(step.action)}</span>
                          <div className="step-details">
                            <h4>Paso {step.step}: {step.agentName}</h4>
                            <p className="step-action">{step.action}</p>
                          </div>
                        </div>
                        <div className="step-confidence" style={{ color: getConfidenceColor(step.confidence) }}>
                          {Math.round(step.confidence * 100)}%
                        </div>
                      </div>
                      
                      <div className="step-content">
                        <div className="step-section">
                          <strong>Entrada:</strong>
                          <div className="step-text">{step.input}</div>
                        </div>
                        
                        <div className="step-section">
                          <strong>Resultado:</strong>
                          <div className="step-text">{step.output}</div>
                        </div>
                        
                        {step.reasoningChain && step.reasoningChain.length > 0 && (
                          <div className="step-section">
                            <strong>Razonamiento:</strong>
                            <ul className="reasoning-list">
                              {step.reasoningChain.map((reason, idx) => (
                                <li key={idx}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="step-timestamp">
                          {new Date(step.timestamp).toLocaleString('es-ES')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'conversations' && (
            <div className="agent-conversations">
              <div className="conversations-header">
                <h3>Conversaciones entre Agentes</h3>
                <p>Intercambio de información y coordinación</p>
              </div>
              {conversations.length === 0 ? (
                <div className="empty-state">
                  <p>No hay conversaciones registradas</p>
                </div>
              ) : (
                <div className="conversations-list">
                  {conversations.map((conv, index) => (
                    <div key={index} className={`conversation-item ${conv.messageType}`}>
                      <div className="conversation-header">
                        <span className="agent-from">{conv.from}</span>
                        <span className="arrow">→</span>
                        <span className="agent-to">{conv.to}</span>
                        <span className="message-type">{conv.messageType}</span>
                      </div>
                      <div className="conversation-message">{conv.message}</div>
                      <div className="conversation-timestamp">
                        {new Date(conv.timestamp).toLocaleString('es-ES')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'metrics' && qualityMetrics && (
            <div className="quality-metrics">
              <div className="metrics-header">
                <h3>Métricas de Calidad</h3>
                <p>Evaluación del procesamiento y consenso</p>
              </div>
              
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-label">Confianza General</div>
                  <div className="metric-value" style={{ color: getConfidenceColor(qualityMetrics.overallConfidence) }}>
                    {Math.round(qualityMetrics.overallConfidence * 100)}%
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill" 
                      style={{ 
                        width: `${qualityMetrics.overallConfidence * 100}%`,
                        backgroundColor: getConfidenceColor(qualityMetrics.overallConfidence)
                      }}
                    />
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-label">Fuerza del Consenso</div>
                  <div className="metric-value" style={{ color: getConfidenceColor(qualityMetrics.consensusStrength) }}>
                    {Math.round(qualityMetrics.consensusStrength * 100)}%
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill" 
                      style={{ 
                        width: `${qualityMetrics.consensusStrength * 100}%`,
                        backgroundColor: getConfidenceColor(qualityMetrics.consensusStrength)
                      }}
                    />
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-label">Calidad de Evidencia</div>
                  <div className="metric-value" style={{ color: getConfidenceColor(qualityMetrics.evidenceQuality) }}>
                    {Math.round(qualityMetrics.evidenceQuality * 100)}%
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill" 
                      style={{ 
                        width: `${qualityMetrics.evidenceQuality * 100}%`,
                        backgroundColor: getConfidenceColor(qualityMetrics.evidenceQuality)
                      }}
                    />
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-label">Completitud</div>
                  <div className="metric-value" style={{ color: getConfidenceColor(qualityMetrics.completeness) }}>
                    {Math.round(qualityMetrics.completeness * 100)}%
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill" 
                      style={{ 
                        width: `${qualityMetrics.completeness * 100}%`,
                        backgroundColor: getConfidenceColor(qualityMetrics.completeness)
                      }}
                    />
                  </div>
                </div>

                <div className="metric-card risk-assessment">
                  <div className="metric-label">Evaluación de Riesgo</div>
                  <div className="metric-value" style={{ color: getRiskColor(qualityMetrics.riskAssessment) }}>
                    {qualityMetrics.riskAssessment.toUpperCase()}
                  </div>
                  <div className="risk-indicator" style={{ backgroundColor: getRiskColor(qualityMetrics.riskAssessment) }} />
                </div>
              </div>

              {qualityMetrics.recommendedActions && qualityMetrics.recommendedActions.length > 0 && (
                <div className="recommended-actions">
                  <h4>Acciones Recomendadas</h4>
                  <ul>
                    {qualityMetrics.recommendedActions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentConversationViewer;