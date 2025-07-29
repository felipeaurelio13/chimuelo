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

      // 2. Procesar con sistema multiagente
      console.log('🤖 Procesando con sistema multiagente:', agentInput);
      const agentOutput = await multiAgentSystem.processInput(agentInput);
      
      // 3. Guardar datos históricos si los hay
      if (agentOutput.historicalData) {
        await historicalDataService.initialize();
        for (const record of agentOutput.historicalData) {
          await historicalDataService.saveHistoricalRecord(record);
        }
      }

      // 4. Crear resultado compatible con la interfaz existente
      const visionResult: VisionAnalysisResult = {
        success: true,
        data: {
          documentType: agentOutput.classification,
          patientInfo: {
            name: agentOutput.extractedData?.patientInfo?.name || 'No detectado',
            age: agentOutput.extractedData?.patientInfo?.age || 'No detectado',
            dateOfBirth: agentOutput.extractedData?.patientInfo?.birthDate || 'No detectado'
          },
          extractedData: {
            date: agentOutput.extractedData?.date || new Date().toISOString().split('T')[0],
            provider: agentOutput.extractedData?.provider || 'No detectado',
            mainFindings: agentOutput.recommendations || [],
            medications: agentOutput.extractedData?.medications || [],
            measurements: agentOutput.extractedData?.measurements || {
              weight: undefined,
              height: undefined,
              temperature: undefined,
              other: {}
            },
            recommendations: agentOutput.extractedData?.recommendations || [],
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

      console.log('✅ Análisis multiagente completado:', {
        agent: agentOutput.agentId,
        classification: agentOutput.classification,
        confidence: agentOutput.confidence,
        historicalRecords: agentOutput.historicalData?.length || 0
      });

      onAnalysisComplete(visionResult);
      onClose();
      
    } catch (error) {
      console.error('❌ Error en análisis multiagente:', error);
      setError(error instanceof Error ? error.message : 'Error en el procesamiento multiagente');
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