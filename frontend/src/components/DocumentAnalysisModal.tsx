import React, { useState, useRef, useCallback } from 'react';
import { visionAnalysisService, VisionAnalysisRequest, VisionAnalysisResult } from '../services/visionAnalysisService';
import { multiAgentSystem, AgentInput } from '../services/multiAgentSystem';
import { historicalDataService } from '../services/historicalDataService';

interface DocumentAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete: (result: VisionAnalysisResult) => void;
}

const DocumentAnalysisModal: React.FC<DocumentAnalysisModalProps> = ({
  isOpen,
  onClose,
  onAnalysisComplete
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<VisionAnalysisRequest['documentType']>('general');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Process selected file
  const handleFile = (file: File) => {
    const validation = visionAnalysisService.validateImageFile(file);
    
    // Handle both synchronous and asynchronous validation
    if (validation instanceof Promise) {
      validation.then(result => {
        if (!result.valid) {
          setError(result.error || 'Archivo no válido');
          return;
        }
        handleFileUpload(file);
      }).catch(() => {
        setError('Error validando archivo');
      });
    } else {
      if (!validation.valid) {
        setError(validation.error || 'Archivo no válido');
        return;
      }
      handleFileUpload(file);
    }
  };

  const handleFileUpload = (file: File) => {
    setSelectedFile(file);
    
    // Auto-suggest document type based on filename
    const suggestedType = visionAnalysisService.suggestDocumentType(file.name);
    setDocumentType(suggestedType);
    
    // Create preview (only for images, not PDFs)
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  // Analyze document with Multi-Agent System
  const analyzeDocument = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      console.log('🔧 [DEBUG] DocumentAnalysisModal.analyzeDocument iniciando...');
      console.log('🔧 [DEBUG] File:', {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size
      });

      // 1. Crear input para el sistema multiagente
      const agentInput: AgentInput = {
        id: `doc_${Date.now()}`,
        type: selectedFile.type.startsWith('image/') ? 'image' : 
              selectedFile.type === 'application/pdf' ? 'pdf' : 'file',
        content: selectedFile,
        timestamp: new Date(),
        userId: 'current_user', // TODO: obtener del contexto de auth
        context: {
          documentType: documentType,
          fileName: selectedFile.name,
          fileSize: selectedFile.size
        }
      };

      console.log('🔧 [DEBUG] AgentInput creado:', {
        id: agentInput.id,
        type: agentInput.type,
        contextKeys: Object.keys(agentInput.context || {})
      });

      // 2. Procesar con sistema multiagente con manejo robusto de errores
      console.log('🤖 Procesando con sistema multiagente...');
      let agentOutput;
      
      try {
        agentOutput = await multiAgentSystem.processInput(agentInput);
        console.log('✅ Sistema multiagente completado exitosamente');
      } catch (agentError) {
        console.error('❌ Error en sistema multiagente:', agentError);
        
        // Crear fallback robusto si el sistema multiagente falla
        agentOutput = {
          agentId: 'fallback_agent',
          classification: documentType,
          extractedData: {
            patientInfo: {
              name: 'Procesamiento fallido',
              age: undefined,
              birthDate: undefined
            },
            date: new Date().toISOString().split('T')[0],
            provider: 'Sistema de respaldo',
            medications: [],
            measurements: {
              weight: undefined,
              height: undefined,
              temperature: undefined,
              other: {
                error: agentError instanceof Error ? agentError.message : 'Error desconocido',
                fileName: selectedFile.name
              }
            },
            recommendations: ['Revisar documento manualmente'],
            urgentFlags: ['Error en procesamiento automático']
          },
          confidence: 0.3,
          recommendations: [
            'Error en el procesamiento automático',
            'Se requiere revisión manual del documento',
            'Verificar que el archivo no esté corrupto'
          ],
          shouldUpdateFicha: false,
          timestamp: new Date()
        };
      }
      
      // 3. Guardar datos históricos si los hay (con manejo de errores)
      if (agentOutput.historicalData && agentOutput.historicalData.length > 0) {
        try {
          await historicalDataService.initialize();
          for (const record of agentOutput.historicalData) {
            await historicalDataService.saveHistoricalRecord(record);
          }
          console.log('✅ Datos históricos guardados');
        } catch (historyError) {
          console.error('❌ Error guardando datos históricos:', historyError);
          // No fallar por errores en datos históricos
        }
      }

      // 4. Crear resultado compatible con la interfaz existente
      const visionResult: VisionAnalysisResult = {
        success: true,
        data: {
          documentType: agentOutput.classification || documentType,
          patientInfo: {
            name: agentOutput.extractedData?.patientInfo?.name || 'No detectado',
            age: agentOutput.extractedData?.patientInfo?.age || 'No detectado',
            dateOfBirth: agentOutput.extractedData?.patientInfo?.birthDate || 'No detectado'
          },
          extractedData: {
            date: agentOutput.extractedData?.date || new Date().toISOString().split('T')[0],
            provider: agentOutput.extractedData?.provider || 'No detectado',
            mainFindings: agentOutput.recommendations || ['Documento procesado'],
            medications: agentOutput.extractedData?.medications || [],
            measurements: agentOutput.extractedData?.measurements || {
              weight: undefined,
              height: undefined,
              temperature: undefined,
              other: {}
            },
            recommendations: agentOutput.extractedData?.recommendations || [
              'Revisar documento completo',
              'Verificar información extraída'
            ],
            nextAppointment: agentOutput.extractedData?.nextAppointment || undefined,
            urgentFlags: agentOutput.extractedData?.urgentFlags || []
          },
          analysisNotes: {
            confidence: agentOutput.confidence > 0.8 ? 'alto' : 
                       agentOutput.confidence > 0.6 ? 'medio' : 'bajo',
            allergyWarnings: agentOutput.extractedData?.allergyWarnings || [],
            ageAppropriate: agentOutput.extractedData?.ageAppropriate || 'Sí',
            requiresPhysicianReview: agentOutput.confidence < 0.7
          }
        },
        rawResponse: JSON.stringify(agentOutput, null, 2)
      };

      console.log('✅ Análisis completado:', {
        agent: agentOutput.agentId,
        classification: agentOutput.classification,
        confidence: agentOutput.confidence,
        historicalRecords: agentOutput.historicalData?.length || 0
      });

      onAnalysisComplete(visionResult);
      onClose();
      
    } catch (error) {
      console.error('❌ Error crítico en análisis de documento:', error);
      
      // Crear resultado de error que no cause crash en la UI
      const errorResult: VisionAnalysisResult = {
        success: true, // Mantener success para evitar crashes
        data: {
          documentType: documentType,
          patientInfo: {
            name: 'Error en procesamiento',
            age: undefined,
            dateOfBirth: undefined
          },
          extractedData: {
            date: new Date().toISOString().split('T')[0],
            provider: 'Error en sistema',
            mainFindings: [
              'Error crítico en el procesamiento',
              `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
              'Se requiere intervención manual'
            ],
            medications: [],
            measurements: {
              weight: undefined,
              height: undefined,
              temperature: undefined,
              other: {
                error: error instanceof Error ? error.message : 'Error desconocido',
                fileName: selectedFile.name,
                fileSize: `${(selectedFile.size / 1024).toFixed(1)} KB`
              }
            },
            recommendations: [
              'Revisar archivo manualmente',
              'Verificar que el archivo no esté corrupto',
              'Contactar soporte si el problema persiste'
            ],
            nextAppointment: undefined,
            urgentFlags: ['Error crítico en procesamiento']
          },
          analysisNotes: {
            confidence: 'bajo',
            allergyWarnings: [],
            ageAppropriate: 'Error en procesamiento',
            requiresPhysicianReview: true
          }
        },
        rawResponse: `Error crítico: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };

      console.log('🔄 Usando resultado de error para prevenir crash');
      onAnalysisComplete(errorResult);
      onClose();
      
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Clean up on close
  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setDragActive(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content document-analysis-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📄 Analizar Documento Médico</h3>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>
        
        <div className="modal-body">
          {!selectedFile ? (
            <div
              className={`file-drop-zone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="drop-zone-content">
                <div className="drop-zone-icon">📷</div>
                <p className="drop-zone-text">
                  Arrastra una imagen aquí o 
                  <button 
                    className="file-select-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    selecciona un archivo
                  </button>
                </p>
                <p className="drop-zone-subtext">
                  Soporta: JPEG, PNG, WebP, PDF (máx. 20MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          ) : (
            <div className="file-preview-section">
              <div className="file-preview">
                {selectedFile.type === 'application/pdf' ? (
                  <div className="pdf-preview">
                    <div className="pdf-icon">📄</div>
                    <div className="pdf-preview-text">Archivo PDF</div>
                    <div className="pdf-preview-note">
                      Se procesará con análisis básico
                    </div>
                  </div>
                ) : (
                  <img src={previewUrl || ''} alt="Vista previa" className="preview-image" />
                )}
                <div className="file-info">
                  <div className="file-name">{selectedFile.name}</div>
                  <div className="file-size">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
              
              <div className="document-type-selector">
                <label htmlFor="document-type">Tipo de documento:</label>
                <select
                  id="document-type"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as VisionAnalysisRequest['documentType'])}
                  className="document-type-select"
                >
                  <option value="general">General</option>
                  <option value="medical_report">Informe médico</option>
                  <option value="prescription">Receta médica</option>
                  <option value="lab_result">Resultado de laboratorio</option>
                  <option value="vaccine_record">Registro de vacunas</option>
                  <option value="growth_chart">Gráfica de crecimiento</option>
                </select>
              </div>
              
              <button
                className="change-file-btn"
                onClick={() => {
                  setSelectedFile(null);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
              >
                Cambiar archivo
              </button>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={isAnalyzing}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={analyzeDocument}
            disabled={!selectedFile || isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <div className="loading-spinner small"></div>
                Analizando...
              </>
            ) : (
              <>
                🔍 Analizar documento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentAnalysisModal;