import React, { useState, useRef, useCallback } from 'react';
import { visionAnalysisService, VisionAnalysisRequest, VisionAnalysisResult } from '../services/visionAnalysisService';

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
    // Validate file
    const validation = visionAnalysisService.validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Archivo no válido');
      return;
    }

    setSelectedFile(file);
    
    // Auto-suggest document type based on filename
    const suggestedType = visionAnalysisService.suggestDocumentType(file.name);
    setDocumentType(suggestedType);
    
    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  // Analyze document
  const analyzeDocument = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const request: VisionAnalysisRequest = {
        imageFile: selectedFile,
        documentType: documentType
      };
      
      const result = await visionAnalysisService.analyzeDocument(request);
      
      if (result.success) {
        onAnalysisComplete(result);
        onClose();
      } else {
        setError(result.error || 'Error en el análisis');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error desconocido');
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
                  Soporta: JPEG, PNG, WebP (máx. 20MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          ) : (
            <div className="file-preview-section">
              <div className="file-preview">
                <img src={previewUrl || ''} alt="Vista previa" className="preview-image" />
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