import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import apiService from '../services/apiService';
import SchemaService from '../services/schemas';
import { aiCoordinator, type ProcessingResult } from '../services/aiAgents';
import '../styles/Capture.css';

interface CaptureData {
  input: string;
  inputType: 'text' | 'image' | 'audio' | 'video' | 'pdf';
  file?: File;
  metadata?: {
    timestamp: Date;
    location?: GeolocationCoordinates;
    context?: string;
    fileType?: string;
    fileName?: string;
  };
}

interface ExtractedData {
  type: string;
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
  
  // State
  const [captureData, setCaptureData] = useState<CaptureData>({
    input: '',
    inputType: 'text'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [], warnings: [] });
  const [showPreview, setShowPreview] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState<string>('');
  
  // Multi-agent AI state
  const [aiProcessingResult, setAiProcessingResult] = useState<ProcessingResult | null>(null);
  const [showClarificationDialog, setShowClarificationDialog] = useState(false);
  const [userResponses, setUserResponses] = useState<{[question: string]: string}>({});
  
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
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCaptureData(prev => ({
      ...prev,
      input: value,
      inputType: 'text',
      file: undefined
    }));
    setImagePreview(null); // Limpiar preview de imagen
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    console.log('Archivo cargado:', file.name, file.type);
    
    if (file.type.startsWith('image/')) {
      // Para imágenes, crear preview y placeholder
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      setCaptureData({
        input: `[Imagen adjunta: ${file.name}] Por favor describe el contenido de esta imagen médica.`,
        inputType: 'image',
        file,
        metadata: {
          timestamp: new Date(),
          context: `Imagen: ${file.name}`,
          fileType: 'image',
          fileName: file.name
        }
      });
    } else if (file.type === 'application/pdf') {
      // Para PDFs, indicar que es un documento
      setCaptureData({
        input: `[PDF adjunto: ${file.name}] Por favor describe el contenido de este documento médico.`,
        inputType: 'pdf',
        file,
        metadata: {
          timestamp: new Date(),
          context: `PDF: ${file.name}`,
          fileType: 'pdf',
          fileName: file.name
        }
      });
      
      // Mostrar mensaje informativo
      setProcessError('ℹ️ PDF detectado. Por favor describe brevemente qué tipo de documento es (ej: "análisis de sangre", "receta médica", etc.)');
    } else if (file.type.startsWith('audio/')) {
      // Para audio
      setCaptureData({
        input: `[Audio adjunto: ${file.name}]`,
        inputType: 'audio',
        file,
        metadata: {
          timestamp: new Date(),
          context: `Audio: ${file.name}`,
          fileType: 'audio',
          fileName: file.name
        }
      });
    } else {
      // Para archivos de texto, leer el contenido
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCaptureData({
          input: content,
          inputType: 'text',
          file,
          metadata: {
            timestamp: new Date(),
            context: `Archivo: ${file.name}`,
            fileType: 'text',
            fileName: file.name
          }
        });
      };
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

  // Process with multi-agent AI
  const processWithAI = useCallback(async () => {
    if (!captureData.input.trim()) {
      setProcessError('Por favor ingresa algún texto o adjunta un archivo');
      return;
    }
    
    setIsProcessing(true);
    setProcessError(null);
    setShowPreview(false);
    
    try {
      console.log('🚀 Iniciando procesamiento multi-agente');
      
      // Usar el coordinador de IA multi-agente con metadata
      const result = await aiCoordinator.processInput(
        captureData.input,
        captureData.metadata
      );
      
      console.log('📊 Resultado del procesamiento:', result);
      
      setAiProcessingResult(result);
      
      // Si necesita clarificación, mostrar diálogo
      if (result.clarificationNeeded) {
        setShowClarificationDialog(true);
        
        // Inicializar respuestas vacías para las preguntas
        const initialResponses: {[key: string]: string} = {};
        result.questions.forEach(q => {
          initialResponses[q] = '';
        });
        setUserResponses(initialResponses);
      } else {
        // Procesar directamente si la confianza es alta
        await processAiResult(result);
      }
      
    } catch (error: any) {
      console.error('Error procesando con IA:', error);
      setProcessError(error.message || 'Error al procesar');
    } finally {
      setIsProcessing(false);
    }
  }, [captureData]);

  // Procesar resultado de IA
  const processAiResult = async (result: ProcessingResult) => {
    const { finalData } = result;
    
    // Convertir a formato ExtractedData
    const extractedData: ExtractedData = {
      type: finalData.primaryType || 'note',
      confidence: result.confidence,
      timestamp: finalData.date || new Date().toISOString(),
      data: {
        ...finalData.weight && { value: finalData.weight.value, unit: finalData.weight.unit },
        ...finalData.temperature && { value: finalData.temperature.value, unit: finalData.temperature.unit },
        ...finalData.height && { value: finalData.height.value, unit: finalData.height.unit },
        ...finalData.symptoms && { symptoms: finalData.symptoms },
        ...finalData.medications && { medications: finalData.medications },
        date: finalData.date || new Date().toISOString()
      },
      notes: generateNotes(result),
      requiresAttention: finalData.urgencyLevel > 2
    };
    
    setExtractedData(extractedData);
    setShowPreview(true);
    setShowClarificationDialog(false);
    
    // Establecer fecha personalizada
    const extractedDate = new Date(finalData.date || new Date());
    setCustomDate(extractedDate.toISOString().split('T')[0]);
    
    // Validar
    const validationResult = validateExtractedData(extractedData);
    setValidation(validationResult);
  };

  // Generar notas inteligentes basadas en el análisis
  const generateNotes = (result: ProcessingResult): string => {
    const notes: string[] = [];
    const { finalData } = result;
    
    // Agregar resumen de hallazgos
    if (finalData.weight) {
      notes.push(`Peso: ${finalData.weight.value} ${finalData.weight.unit}`);
    }
    if (finalData.temperature) {
      notes.push(`Temperatura: ${finalData.temperature.value}°C (${finalData.temperature.severity || 'normal'})`);
    }
    if (finalData.symptoms?.length > 0) {
      notes.push(`Síntomas: ${finalData.symptoms.map((s: any) => s.name).join(', ')}`);
    }
    
    // Agregar sugerencias si las hay
    if (result.suggestions.length > 0) {
      notes.push('\nSugerencias:');
      result.suggestions.forEach(s => notes.push(`• ${s}`));
    }
    
    // Agregar etiquetas automáticas
    if (finalData.autoTags?.length > 0) {
      notes.push(`\nEtiquetas: ${finalData.autoTags.join(', ')}`);
    }
    
    return notes.join('\n');
  };

  // Manejar respuestas del usuario a las preguntas de clarificación
  const handleClarificationSubmit = async () => {
    if (!aiProcessingResult) return;
    
    setIsProcessing(true);
    try {
      // Re-procesar con las respuestas del usuario
      const enhancedResult = await aiCoordinator.processUserResponse(
        captureData.input,
        userResponses,
        aiProcessingResult
      );
      
      await processAiResult(enhancedResult);
    } catch (error: any) {
      console.error('Error procesando clarificaciones:', error);
      setProcessError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

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
    if (data.type === 'weight' && data.data?.value) {
      if (data.data.value < 1 || data.data.value > 30) {
        warnings.push('Peso fuera del rango normal para bebés/niños.');
      }
    }
    
    if (data.type === 'temperature' && data.data?.value) {
      if (data.data.value > 38) {
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
      // Usar la fecha personalizada si fue modificada
      const finalTimestamp = customDate ? 
        new Date(customDate + 'T' + new Date().toTimeString().split(' ')[0]) : 
        new Date(extractedData.timestamp);
      
      // Create health record using context
      const healthRecord = {
        userId: user.id,
        type: extractedData.type as any,
        data: {
          ...extractedData.data,
          date: finalTimestamp.toISOString()
        },
        timestamp: finalTimestamp,
        confidence: extractedData.confidence,
        requiresAttention: extractedData.requiresAttention,
        notes: extractedData.notes,
        tags: [],
        metadata: {
          source: 'ai_extraction' as const,
          inputType: captureData.inputType,
          originalInput: captureData.input,
          location: captureData.metadata?.location,
          context: captureData.metadata?.context
        },
        encrypted: false
      };

      // Save using DataContext (automatically updates state)
      const savedRecord = await createHealthRecord(healthRecord);
      console.log('Health record saved:', savedRecord);

      // Create insight if requires attention
      if (extractedData.requiresAttention) {
        await createInsight({
          userId: user.id,
          type: 'alert',
          title: `Atención requerida: ${extractedData.type}`,
          description: `Este registro de ${extractedData.type} requiere atención médica según la IA.`,
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

  // Clear form
  const clearForm = useCallback(() => {
    setCaptureData({
      input: '',
      inputType: 'text'
    });
    setExtractedData(null);
    setShowPreview(false);
    setValidation({ isValid: true, errors: [], warnings: [] });
    setProcessError(null);
    setImagePreview(null);
    setCustomDate('');
  }, []);

  return (
    <div className="capture-page">
      <header className="capture-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Volver
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

      <div className="capture-container">
        <section className="capture-content">
          <div className="input-section">
            <h2>¿Qué quieres registrar?</h2>
            <p className="helper-text">
              Describe los datos de salud de forma natural. Nuestra IA analizará y extraerá la información relevante.
            </p>

            {/* Input buttons remain the same */}
            <div className="input-types">
              <button 
                className="type-button active"
                onClick={() => setCaptureData(prev => ({ ...prev, inputType: 'text' }))}
              >
                ✏️ Texto
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
            placeholder="Ejemplo: 'Mi bebé pesó 8.5kg hoy después del baño' o 'Tiene fiebre de 38.2°C desde ayer y está un poco irritable'"
            rows={6}
          />

          {/* Smart Suggestions based on AI analysis */}
          {aiProcessingResult?.suggestions && aiProcessingResult.suggestions.length > 0 && (
            <div className="suggestions">
              <h4>💡 Sugerencias de la IA:</h4>
              <ul>
                {aiProcessingResult.suggestions.map((suggestion, index) => (
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

          {/* Image Preview */}
          {imagePreview && (
            <div className="image-preview-container">
              <h4>Vista previa de la imagen:</h4>
              <img src={imagePreview} alt="Vista previa" className="image-preview" />
            </div>
          )}

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
                  Analizando con IA multi-agente...
                </span>
              ) : (
                '🧠 Procesar con IA'
              )}
            </button>
            
            {(captureData.input || imagePreview) && (
              <button
                className="clear-button"
                onClick={clearForm}
                type="button"
              >
                🗑️ Limpiar
              </button>
            )}
          </div>

          {/* Error Message */}
          {processError && !showPreview && (
            <div className={`error-message ${processError.startsWith('ℹ️') ? 'info' : ''}`} style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              backgroundColor: processError.startsWith('ℹ️') ? '#e0f2fe' : '#fee', 
              borderRadius: '8px', 
              color: processError.startsWith('ℹ️') ? '#0369a1' : '#c00' 
            }}>
              {processError}
            </div>
          )}
        </section>

        {/* Clarification Dialog */}
        {showClarificationDialog && aiProcessingResult && (
          <div className="clarification-dialog">
            <h3>🤔 Necesito aclarar algunos puntos</h3>
            <p className="confidence-info">
              Confianza actual: {Math.round(aiProcessingResult.confidence * 100)}%
            </p>
            
            {aiProcessingResult.questions.map((question, index) => (
              <div key={index} className="clarification-question">
                <label>{question}</label>
                <input
                  type="text"
                  value={userResponses[question] || ''}
                  onChange={(e) => setUserResponses(prev => ({
                    ...prev,
                    [question]: e.target.value
                  }))}
                  placeholder="Tu respuesta..."
                />
              </div>
            ))}
            
            <div className="clarification-actions">
              <button onClick={() => setShowClarificationDialog(false)}>
                Cancelar
              </button>
              <button onClick={handleClarificationSubmit} className="primary">
                Continuar con estas respuestas
              </button>
            </div>
          </div>
        )}

        {/* Preview Section - remains mostly the same */}
        {showPreview && extractedData && (
          <section className="preview-section">
            <div className="preview-header">
              <h3>Vista previa de datos extraídos</h3>
              <div className={`confidence-indicator ${extractedData.confidence > 0.7 ? 'high' : extractedData.confidence > 0.4 ? 'medium' : 'low'}`}>
                Confianza: {Math.round(extractedData.confidence * 100)}%
              </div>
            </div>

            {/* AI Agents Analysis Summary */}
            {aiProcessingResult && (
              <div className="ai-analysis-summary">
                <h4>🤖 Análisis Multi-Agente</h4>
                <div className="agents-grid">
                  {aiProcessingResult.agentResponses.map((agent, index) => (
                    <div key={index} className="agent-card">
                      <div className="agent-header">
                        <span className="agent-name">{agent.agentName}</span>
                        <span className={`agent-confidence ${agent.confidence > 0.7 ? 'high' : agent.confidence > 0.4 ? 'medium' : 'low'}`}>
                          {Math.round(agent.confidence * 100)}%
                        </span>
                      </div>
                      <div className="agent-findings">
                        {Object.keys(agent.findings).length > 0 ? (
                          <ul>
                            {Object.entries(agent.findings).slice(0, 3).map(([key, value], i) => (
                              <li key={i}>
                                <strong>{key}:</strong> {
                                  typeof value === 'object' 
                                    ? JSON.stringify(value).substring(0, 50) + '...' 
                                    : String(value)
                                }
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>Sin hallazgos específicos</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {aiProcessingResult.consensus ? (
                  <p className="consensus-status success">✅ Los agentes llegaron a un consenso</p>
                ) : (
                  <p className="consensus-status warning">⚠️ Los agentes tienen opiniones diferentes</p>
                )}
              </div>
            )}

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
                <span className="data-type">{extractedData.type}</span>
                <span className="data-timestamp">
                  {new Date(extractedData.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="data-content">
                {extractedData.type === 'weight' && extractedData.data?.value && (
                  <div className="data-field">
                    <strong>Peso:</strong> {extractedData.data.value} {extractedData.data.unit || 'kg'}
                  </div>
                )}
                {extractedData.type === 'temperature' && extractedData.data?.value && (
                  <div className="data-field">
                    <strong>Temperatura:</strong> {extractedData.data.value} {extractedData.data.unit || '°C'}
                  </div>
                )}
                {extractedData.type === 'height' && extractedData.data?.value && (
                  <div className="data-field">
                    <strong>Talla:</strong> {extractedData.data.value} {extractedData.data.unit || 'cm'}
                  </div>
                )}
                {extractedData.type === 'note' && extractedData.data?.content && (
                  <div className="data-field">
                    <strong>Nota:</strong> {extractedData.data.content}
                  </div>
                )}
                {/* Mostrar datos sin formato específico */}
                {!['weight', 'temperature', 'height', 'note'].includes(extractedData.type) && (
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(extractedData.data, null, 2)}
                  </pre>
                )}
              </div>

              {/* Campo de fecha editable */}
              <div className="date-field">
                <label htmlFor="custom-date">
                  <strong>Fecha del registro:</strong>
                </label>
                <input
                  type="date"
                  id="custom-date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="date-input"
                />
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