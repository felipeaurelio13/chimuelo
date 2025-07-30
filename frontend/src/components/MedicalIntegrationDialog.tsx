import React, { useState, useEffect } from 'react';
import { IntegrationProposal, MedicalDataExtraction } from '../services/medicalRecordIntegrator';

interface MedicalIntegrationDialogProps {
  proposal: IntegrationProposal | null;
  isVisible: boolean;
  onConfirm: (proposal: IntegrationProposal) => Promise<void>;
  onCancel: () => void;
  isProcessing?: boolean;
}

const MedicalIntegrationDialog: React.FC<MedicalIntegrationDialogProps> = ({
  proposal,
  isVisible,
  onConfirm,
  onCancel,
  isProcessing = false
}) => {
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (proposal) {
      // Pre-seleccionar todas las actualizaciones por defecto
      const allUpdates = new Set<string>();
      proposal.proposedUpdates.timelineEntries.forEach((entry, index) => {
        allUpdates.add(`timeline_${index}`);
      });
      Object.keys(proposal.proposedUpdates.statsUpdates).forEach(key => {
        allUpdates.add(`stats_${key}`);
      });
      setSelectedUpdates(allUpdates);
    }
  }, [proposal]);

  if (!isVisible || !proposal) {
    return null;
  }

  const handleUpdateToggle = (updateId: string) => {
    const newSelected = new Set(selectedUpdates);
    if (newSelected.has(updateId)) {
      newSelected.delete(updateId);
    } else {
      newSelected.add(updateId);
    }
    setSelectedUpdates(newSelected);
  };

  const handleConfirm = async () => {
    if (proposal) {
      await onConfirm(proposal);
    }
  };

  const getIconForMeasurement = (type: string): string => {
    const iconMap: { [key: string]: string } = {
      weight: '⚖️',
      height: '📏',
      temperature: '🌡️',
      heartRate: '💓',
      milestone: '🎯',
      medication: '💊',
      visit: '🏥'
    };
    return iconMap[type] || '📊';
  };

  const getSeverityColor = (severity: string): string => {
    const colorMap: { [key: string]: string } = {
      mild: 'text-green-600 bg-green-50',
      moderate: 'text-yellow-600 bg-yellow-50',
      severe: 'text-red-600 bg-red-50'
    };
    return colorMap[severity] || 'text-gray-600 bg-gray-50';
  };

  const getAlertColor = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      critical: 'text-red-700 bg-red-100 border-red-300',
      warning: 'text-yellow-700 bg-yellow-100 border-yellow-300',
      info: 'text-blue-700 bg-blue-100 border-blue-300'
    };
    return colorMap[type] || 'text-gray-700 bg-gray-100 border-gray-300';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <div className="text-2xl">📋</div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Incorporar a Ficha Médica
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Revisar y confirmar datos extraídos del análisis multi-agente
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 text-2xl"
            disabled={isProcessing}
          >
            ×
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`text-sm px-3 py-1 rounded-full ${
                proposal.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                proposal.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                Confianza: {(proposal.confidence * 100).toFixed(0)}%
              </div>
              {proposal.requiresReview && (
                <div className="text-sm px-3 py-1 rounded-full bg-orange-100 text-orange-800">
                  ⚠️ Requiere Revisión
                </div>
              )}
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              {showDetails ? 'Ocultar' : 'Ver'} Detalles Técnicos
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Measurements Section */}
          {Object.keys(proposal.extractedData.measurements).length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📊 Mediciones Detectadas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(proposal.extractedData.measurements).map(([type, measurement]) => {
                  if (!measurement) return null;
                  
                  return (
                    <div key={type} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getIconForMeasurement(type)}</span>
                          <span className="font-medium capitalize">{type}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {(measurement.confidence * 100).toFixed(0)}% confianza
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {measurement.value} {measurement.unit}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(measurement.date).toLocaleString('es-ES')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Symptoms Section */}
          {proposal.extractedData.symptoms.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🩺 Síntomas Identificados
              </h3>
              <div className="space-y-2">
                {proposal.extractedData.symptoms.map((symptom, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(symptom.severity)}`}>
                        {symptom.severity}
                      </span>
                      <span>{symptom.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {(symptom.confidence * 100).toFixed(0)}% confianza
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestones Section */}
          {proposal.extractedData.milestones.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🎯 Hitos de Desarrollo
              </h3>
              <div className="space-y-2">
                {proposal.extractedData.milestones.map((milestone, index) => (
                  <div key={index} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="font-medium">{milestone.description}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Tipo: {milestone.type} • {new Date(milestone.date).toLocaleDateString('es-ES')}
                      {milestone.ageAtAchievement && ` • Edad: ${milestone.ageAtAchievement}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts Section */}
          {proposal.extractedData.alerts.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🚨 Alertas Médicas
              </h3>
              <div className="space-y-2">
                {proposal.extractedData.alerts.map((alert, index) => (
                  <div key={index} className={`p-3 border rounded-lg ${getAlertColor(alert.type)}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{alert.message}</div>
                      {alert.requiresAttention && (
                        <span className="text-xs px-2 py-1 bg-red-600 text-white rounded-full">
                          Requiere Atención
                        </span>
                      )}
                    </div>
                    <div className="text-sm opacity-75 mt-1">
                      Relacionado a: {alert.relatedTo}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Context Analysis */}
          {proposal.contextAnalysis && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📈 Análisis Contextual
              </h3>
              
              {proposal.contextAnalysis.comparisons.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Comparaciones con Historial:
                  </h4>
                  <div className="space-y-1">
                    {proposal.contextAnalysis.comparisons.map((comparison, index) => (
                      <div key={index} className="text-sm text-gray-600 dark:text-gray-400 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        {comparison}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {proposal.contextAnalysis.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recomendaciones:
                  </h4>
                  <div className="space-y-1">
                    {proposal.contextAnalysis.recommendations.map((rec, index) => (
                      <div key={index} className="text-sm text-gray-600 dark:text-gray-400 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        • {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Technical Details */}
          {showDetails && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                🔧 Detalles Técnicos
              </h3>
              <div className="space-y-2 text-sm">
                <div><strong>ID Propuesta:</strong> {proposal.id}</div>
                <div><strong>Actualizaciones Timeline:</strong> {proposal.proposedUpdates.timelineEntries.length}</div>
                <div><strong>Actualizaciones Estadísticas:</strong> {Object.keys(proposal.proposedUpdates.statsUpdates).length}</div>
                <div><strong>Requiere Revisión:</strong> {proposal.requiresReview ? 'Sí' : 'No'}</div>
              </div>
              
              <details className="mt-4">
                <summary className="cursor-pointer font-medium">Ver JSON Raw</summary>
                <pre className="mt-2 p-3 bg-black text-green-400 text-xs rounded overflow-auto max-h-40">
                  {JSON.stringify(proposal, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {proposal.proposedUpdates.timelineEntries.length} elementos serán incorporados a la ficha médica
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                disabled={isProcessing}
              >
                Cancelar
              </button>
              
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isProcessing || selectedUpdates.size === 0}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Incorporando...
                  </>
                ) : (
                  <>
                    💾 Incorporar a Ficha
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalIntegrationDialog;