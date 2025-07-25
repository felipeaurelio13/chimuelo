import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import apiService from '../services/apiService';
import SchemaService from '../services/schemas';
import '../styles/Capture.css';

interface CaptureData {
  input: string;
  inputType: 'text' | 'image' | 'audio' | 'video' | 'pdf';
  file?: File;
  metadata?: {
    timestamp: Date;
    location?: GeolocationCoordinates;
    context?: string;
  };
}

interface ExtractedData {
  extractionType: string;
  confidence: number;
  timestamp: string;
  data: any;
  notes?: string;
  requiresAttention: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const Capture: React.FC = () => {
  const { user } = useAuth();
  const { createHealthRecord, createInsight } = useData();
  const navigate = useNavigate();
  
  // Core state
  const [captureData, setCaptureData] = useState<CaptureData>({
    input: '',
    inputType: 'text'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [], warnings: [] });
  const [showPreview, setShowPreview] = useState(false);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // File handling
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Smart suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [detectedType, setDetectedType] = useState<string>('note');

  // Update suggestions based on input
  useEffect(() => {
    if (captureData.input.length > 10) {
      const inputLower = captureData.input.toLowerCase();
      const newSuggestions: string[] = [];
      
      // Smart suggestions based on content
      if (inputLower.includes('peso')) {
        newSuggestions.push('¿Incluir condiciones de la medición? (con ropa, sin ropa, etc.)');
        newSuggestions.push('¿Quién realizó la medición?');
      }
      
      if (inputLower.includes('fiebre') || inputLower.includes('temperatura')) {
        newSuggestions.push('¿Cómo se midió la temperatura? (oral, axilar, etc.)');
        newSuggestions.push('¿Qué síntomas acompañan la fiebre?');
      }
      
      if (inputLower.includes('síntoma') || inputLower.includes('dolor')) {
        newSuggestions.push('¿Cuándo comenzaron los síntomas?');
        newSuggestions.push('¿Qué tan severos son? (leve, moderado, severo)');
      }
      
      setSuggestions(newSuggestions);
      
      // Detect probable type
      const schema = SchemaService.getSchemaForInput(captureData.input, captureData.inputType);
      const detectedExtractionType = schema.properties.extractionType?.const || 
                                   schema.properties.extractionType?.enum?.[0] || 'note';
      setDetectedType(detectedExtractionType);
    } else {
      setSuggestions([]);
      setDetectedType('note');
    }
  }, [captureData.input]);

  // Handle text input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCaptureData(prev => ({
      ...prev,
      input: e.target.value
    }));
    setExtractedData(null);
    setValidation({ isValid: true, errors: [], warnings: [] });
  };

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result as string;
      
      setCaptureData({
        input: result,
        inputType: file.type.startsWith('image/') ? 'image' : 
                  file.type.startsWith('audio/') ? 'audio' :
                  file.type.startsWith('video/') ? 'video' :
                  file.type === 'application/pdf' ? 'pdf' : 'text',
        file,
        metadata: {
          timestamp: new Date(),
          context: `Archivo: ${file.name}`
        }
      });
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  }, []);

  // Voice recording functions
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const file = new File([blob], `recording-${Date.now()}.wav`, { type: 'audio/wav' });
        handleFileUpload(file);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('No se pudo acceder al micrófono');
    }
  }, [handleFileUpload]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  // Process with AI
  const processWithAI = useCallback(async () => {
    if (!captureData.input.trim()) return;
    
    setIsProcessing(true);
    
    try {
      // Get smart schema based on input content
      const schema = SchemaService.getSchemaForInput(captureData.input, captureData.inputType);
      
      // Build enriched prompt with context
      const prompt = SchemaService.buildExtractionPrompt(
        captureData.input, 
        captureData.inputType, 
        schema
      );
      
      const result = await apiService.extractData({
        input: captureData.input,
        inputType: captureData.inputType,
        schema,
        options: {
          model: 'gpt-4-turbo-preview',
          temperature: 0.2,
          maxTokens: 1024
        }
      });
      
      if (result.success && result.data) {
        setExtractedData(result.data);
        setShowPreview(true);
        
        // Validate extracted data
        const validationResult = validateExtractedData(result.data);
        setValidation(validationResult);
      } else {
        throw new Error(result.error || 'Error procesando con IA');
      }
      
    } catch (error: any) {
      console.error('AI processing error:', error);
      setValidation({
        isValid: false,
        errors: [error.message || 'Error procesando con IA'],
        warnings: []
      });
    } finally {
      setIsProcessing(false);
    }
  }, [captureData]);

  // Validate extracted data
  const validateExtractedData = (data: ExtractedData): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic validation
    if (data.confidence < 0.3) {
      warnings.push('Confianza baja en la extracción. Revisa los datos.');
    }
    
    if (data.confidence < 0.1) {
      errors.push('Confianza muy baja. La IA no pudo procesar correctamente el input.');
    }
    
    // Type-specific validation
    if (data.extractionType === 'weight' && data.data?.weight) {
      if (data.data.weight < 1 || data.data.weight > 30) {
        warnings.push('Peso fuera del rango normal para bebés/niños.');
      }
    }
    
    if (data.extractionType === 'temperature' && data.data?.temperature) {
      if (data.data.temperature > 38) {
        warnings.push('Temperatura alta detectada. Considera consultar al pediatra.');
      }
    }
    
    // Check for attention required
    if (data.requiresAttention) {
      warnings.push('Este registro requiere atención médica según la IA.');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  // Save extracted data
  const saveData = useCallback(async () => {
    if (!extractedData || !user) return;
    
    try {
      // Create health record using context
      const healthRecord = {
        userId: user.id,
        type: extractedData.extractionType as any,
        data: extractedData.data,
        timestamp: new Date(extractedData.timestamp),
        confidence: extractedData.confidence,
        requiresAttention: extractedData.requiresAttention,
        notes: extractedData.notes,
        tags: [], // TODO: Extract tags from AI or allow manual tagging
        metadata: {
          source: 'ai_extraction' as const,
          inputType: captureData.inputType,
          originalInput: captureData.input,
          location: captureData.metadata?.location,
          context: captureData.metadata?.context
        },
        encrypted: false // TODO: Implement encryption
      };

      // Save using DataContext (automatically updates state)
      const savedRecord = await createHealthRecord(healthRecord);
      console.log('Health record saved:', savedRecord);

      // Create insight if requires attention
      if (extractedData.requiresAttention) {
        await createInsight({
          userId: user.id,
          type: 'alert',
          title: `Atención requerida: ${extractedData.extractionType}`,
          description: `Este registro de ${extractedData.extractionType} requiere atención médica según la IA.`,
          data: { relatedRecord: savedRecord.id },
          confidence: extractedData.confidence,
          urgency: 4, // High urgency for attention-required items
          isRead: false,
          isResolved: false,
          relatedRecords: [savedRecord.id]
        });
      }

      // Show success message (you could add a toast notification here)
      alert('¡Datos guardados exitosamente!');
      
      // Navigate to timeline to see the new record
      navigate('/timeline');
      
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Error al guardar los datos. Por favor intenta de nuevo.');
    }
  }, [extractedData, user, captureData, navigate]);

  // Quick input templates
  const quickTemplates = [
    { label: 'Peso', template: 'Maxi pesó [peso] kg hoy' },
    { label: 'Altura', template: 'Maxi mide [altura] cm' },
    { label: 'Fiebre', template: 'Maxi tiene fiebre de [temperatura]°C' },
    { label: 'Síntoma', template: 'Maxi presenta [síntoma] desde [cuándo]' },
    { label: 'Medicamento', template: 'Le di [medicamento] [dosis] a Maxi' },
    { label: 'Hito', template: 'Maxi logró [hito] hoy' },
  ];

  const applyTemplate = (template: string) => {
    setCaptureData(prev => ({
      ...prev,
      input: template
    }));
  };

  return (
    <div className="capture-page">
      <header className="capture-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1>Capturar Datos</h1>
        <div className="header-actions">
          <span className={`detection-badge ${detectedType}`}>
            {detectedType === 'weight' && '⚖️ Peso'}
            {detectedType === 'height' && '📏 Altura'}
            {detectedType === 'temperature' && '🌡️ Temperatura'}
            {detectedType === 'symptom' && '🤒 Síntoma'}
            {detectedType === 'medication' && '💊 Medicamento'}
            {detectedType === 'milestone' && '🎯 Hito'}
            {detectedType === 'note' && '📝 Nota'}
          </span>
        </div>
      </header>

      <div className="capture-content">
        {/* Quick Templates */}
        <section className="quick-templates">
          <h3>Plantillas rápidas</h3>
          <div className="template-grid">
            {quickTemplates.map((template, index) => (
              <button
                key={index}
                className="template-button"
                onClick={() => applyTemplate(template.template)}
              >
                {template.label}
              </button>
            ))}
          </div>
        </section>

        {/* Main Input Area */}
        <section className="input-section">
          <div className="input-header">
            <h3>Describe lo que quieres registrar</h3>
            <div className="input-type-selector">
              <button 
                className={`type-button ${captureData.inputType === 'text' ? 'active' : ''}`}
                onClick={() => setCaptureData(prev => ({ ...prev, inputType: 'text' }))}
              >
                📝 Texto
              </button>
              <button 
                className="type-button"
                onClick={() => imageInputRef.current?.click()}
              >
                📷 Foto
              </button>
              <button 
                className={`type-button ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? `🔴 ${recordingTime}s` : '🎤 Audio'}
              </button>
              <button 
                className="type-button"
                onClick={() => fileInputRef.current?.click()}
              >
                📎 Archivo
              </button>
            </div>
          </div>

          <textarea
            className="main-input"
            value={captureData.input}
            onChange={handleInputChange}
            placeholder="Ejemplo: 'Maxi pesó 8.5kg hoy después del baño' o 'Tiene fiebre de 38.2°C y está un poco irritable'"
            rows={6}
          />

          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <div className="suggestions">
              <h4>💡 Sugerencias para completar:</h4>
              <ul>
                {suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            style={{ display: 'none' }}
          />

          {/* Process Button */}
          <div className="action-buttons">
            <button
              className={`process-button ${captureData.input.trim() ? 'active' : 'disabled'}`}
              onClick={processWithAI}
              disabled={!captureData.input.trim() || isProcessing}
            >
              {isProcessing ? (
                <span className="processing">
                  <span className="spinner"></span>
                  Procesando con IA...
                </span>
              ) : (
                '🧠 Procesar con IA'
              )}
            </button>
          </div>
        </section>

        {/* Preview Section */}
        {showPreview && extractedData && (
          <section className="preview-section">
            <div className="preview-header">
              <h3>Vista previa de datos extraídos</h3>
              <div className={`confidence-indicator ${extractedData.confidence > 0.7 ? 'high' : extractedData.confidence > 0.4 ? 'medium' : 'low'}`}>
                Confianza: {Math.round(extractedData.confidence * 100)}%
              </div>
            </div>

            {/* Validation Messages */}
            {validation.errors.length > 0 && (
              <div className="validation-errors">
                {validation.errors.map((error, index) => (
                  <div key={index} className="error-message">❌ {error}</div>
                ))}
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="validation-warnings">
                {validation.warnings.map((warning, index) => (
                  <div key={index} className="warning-message">⚠️ {warning}</div>
                ))}
              </div>
            )}

            {/* Extracted Data Display */}
            <div className="extracted-data">
              <div className="data-header">
                <span className="data-type">{extractedData.extractionType}</span>
                <span className="data-timestamp">
                  {new Date(extractedData.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="data-content">
                {JSON.stringify(extractedData.data, null, 2)}
              </div>

              {extractedData.notes && (
                <div className="data-notes">
                  <strong>Notas:</strong> {extractedData.notes}
                </div>
              )}

              {extractedData.requiresAttention && (
                <div className="attention-required">
                  🚨 Este registro requiere atención médica
                </div>
              )}
            </div>

            <div className="preview-actions">
              <button className="edit-button" onClick={() => setShowPreview(false)}>
                ✏️ Editar
              </button>
              <button 
                className={`save-button ${validation.isValid ? 'active' : 'disabled'}`}
                onClick={saveData}
                disabled={!validation.isValid}
              >
                💾 Guardar
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Capture;