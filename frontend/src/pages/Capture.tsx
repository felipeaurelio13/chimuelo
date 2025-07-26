import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import apiService from '../services/apiService';
import SchemaService from '../services/schemas';
import { contextAwareAICoordinator as contextAwareAI } from '../services/aiCoordinator';
import { smartAIService, type SmartAnalysisResult, type InputContext } from '../services/smartAIService';
import { type HealthRecord } from '../services/databaseService';
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

// Hook personalizado para debouncing
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const Capture: React.FC = () => {
  if (import.meta.env.VITE_DEV === 'TRUE') {
    console.log('Capture component rendered.');
  }
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
  const [aiProcessingResult, setAiProcessingResult] = useState<any | null>(null);
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
  const galleryInputRef = useRef<HTMLInputElement>(null);
  
  // Smart suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [detectedType, setDetectedType] = useState<string>('note');
  
  // Debounce input para reducir re-renders y API calls
  const debouncedInput = useDebounce(captureData.input, 500); // 500ms delay

  // Generar notas inteligentes basadas en el análisis
  const generateNotes = (result: any): string => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Generating notes from AI result.');
    }
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
      result.suggestions.forEach((s: string) => notes.push(`• ${s}`));
    }
    
    // Agregar etiquetas automáticas
    if (finalData.autoTags?.length > 0) {
      notes.push(`\nEtiquetas: ${finalData.autoTags.join(', ')}`);
    }
    
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Generated notes:', notes.join('\n').substring(0, 100), '...');
    }
    return notes.join('\n');
  };

  // Validate extracted data
  const validateExtractedData = (data: ExtractedData): ValidationResult => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Validating extracted data.', data);
    }
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic validation
    if (data.confidence < 0.3) {
      warnings.push('Confianza baja en la extracción. Revisa los datos.');
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.warn('Capture: Low confidence warning.');
      }
    }
    
    if (data.confidence < 0.1) {
      errors.push('Confianza muy baja. La IA no pudo procesar correctamente el input.');
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.error('Capture: Very low confidence error.');
      }
    }
    
    // Type-specific validation
    if (data.type === 'weight' && data.data?.value) {
      if (data.data.value < 1 || data.data.value > 30) {
        warnings.push('Peso fuera del rango normal para bebés/niños.');
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.warn('Capture: Weight out of normal range.');
        }
      }
    }
    
    if (data.type === 'temperature' && data.data?.value) {
      if (data.data.value > 38) {
        warnings.push('Temperatura alta detectada. Considera consultar al pediatra.');
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.warn('Capture: High temperature warning.');
        }
      }
    }
    
    // Check for attention required
    if (data.requiresAttention) {
      warnings.push('Este registro requiere atención médica según la IA.');
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.warn('Capture: Requires attention warning.');
      }
    }
    
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Validation result:', { isValid: errors.length === 0, errors, warnings });
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  // Procesar resultado de IA
  const processAiResult = useCallback(async (result: any) => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Processing AI final result.', result);
    }
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
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Extracted data set and validated.', extractedData, validationResult);
    }
  }, [generateNotes, validateExtractedData]);

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: File selected for upload:', file.name, file.type);
    }
    
    if (file.type.startsWith('image/')) {
      // Para imágenes, crear preview y placeholder
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Capture: Image preview generated.');
        }
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
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Capture: PDF file selected.', file.name);
      }
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
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Capture: Audio file selected.', file.name);
      }
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
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Capture: Text file content loaded.', content.substring(0, 50), '...');
        }
      };
      reader.readAsText(file);
    }
  }, []);

  // Voice recording functions
  const startRecording = useCallback(async () => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Starting recording...');
    }
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
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Capture: Recording stopped, file generated.', file.name);
        }
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error: unknown) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        if (error instanceof Error) {
          console.error('Capture: Error starting recording:', error.message);
        } else {
          console.error('Capture: Error starting recording:', error);
        }
      }
      alert('No se pudo acceder al micrófono');
    }
  }, [handleFileUpload]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Capture: Stopping recording...');
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  // Verificar si el input es suficiente para procesamiento IA
  const isInputReadyForAI = useCallback((input: string): boolean => {
    const cleanInput = input.trim();
    return cleanInput.length >= 10 && 
           (cleanInput.includes('cm') || cleanInput.includes('kg') || cleanInput.includes('temperatura') || 
            cleanInput.includes('fiebre') || cleanInput.includes('peso') || cleanInput.includes('altura') ||
            cleanInput.length >= 20);
  }, []);

  // 🧠 NEW: Smart AI Processing with 10 Optimized Scenarios
  const processWithSmartAI = useCallback(async () => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Smart AI processing initiated.');
    }
    
    if (!captureData.input.trim() && !captureData.file) {
      setProcessError('Por favor ingresa texto o adjunta un archivo');
      return;
    }

    setIsProcessing(true);
    setProcessError(null);
    setShowPreview(false);

    try {
      const context: InputContext = {
        childAge: 24, // Default 2 years - should come from user profile
        childName: 'Maxi',
        previousData: [], // Should come from database
        currentDate: new Date().toISOString(),
        location: 'Home'
      };

      let result: SmartAnalysisResult;

      // Determine scenario and process accordingly
      if (captureData.file) {
        if (captureData.file.type.startsWith('image/')) {
          if (captureData.input.includes('receta') || captureData.input.includes('prescription')) {
            result = await smartAIService.analyzePrescription(captureData.file, context);
          } else if (captureData.input.includes('orden') || captureData.input.includes('medical order')) {
            result = await smartAIService.analyzeMedicalOrder(captureData.file, context);
          } else {
            result = await smartAIService.analyzeSymptomPhoto(captureData.file, context);
          }
        } else if (captureData.file.type === 'application/pdf') {
          if (captureData.input.includes('resultado') || captureData.input.includes('examen')) {
            result = await smartAIService.analyzeLabResults(captureData.file, context);
          } else {
            result = await smartAIService.analyzeMedicalOrder(captureData.file, context);
          }
        } else if (captureData.file.type.startsWith('audio/')) {
          if (captureData.input.includes('consulta') || captureData.input.includes('doctor')) {
            result = await smartAIService.analyzeConsultationAudio(captureData.file, context);
          } else {
            result = await smartAIService.analyzeAudioSymptoms(captureData.file, context);
          }
        } else {
          throw new Error('Tipo de archivo no soportado');
        }
      } else {
        // Text-based analysis
        const input = captureData.input.toLowerCase();
        
        if (input.includes('cm') || input.includes('altura') || input.includes('mide')) {
          result = await smartAIService.analyzeHeightMeasurement(captureData.input, context);
        } else if (input.includes('paracetamol') || input.includes('medicamento') || input.includes('dosis')) {
          result = await smartAIService.analyzeMedicationRecord(captureData.input, context);
        } else if (input.includes('fiebre') || input.includes('temperatura') || input.includes('caliente')) {
          result = await smartAIService.analyzeFeverDetection(captureData.input, context);
        } else if (input.includes('comió') || input.includes('ml') || input.includes('alimentación')) {
          result = await smartAIService.analyzeFeedingRecord(captureData.input, context);
        } else {
          // Default to general symptoms analysis
          const audioBlob = new Blob([captureData.input], { type: 'text/plain' });
          const audioFile = new File([audioBlob], 'text-input.txt', { type: 'text/plain' });
          result = await smartAIService.analyzeAudioSymptoms(audioFile, context);
        }
      }

      // Convert SmartAnalysisResult to ExtractedData format
      const extractedData: ExtractedData = {
        type: result.extractedData.type || result.scenario,
        confidence: result.confidence,
        timestamp: result.extractedData.timestamp || new Date().toISOString(),
        data: result.extractedData,
        notes: `🧠 Análisis Inteligente:\n\n` +
               `Escenario: ${result.scenario}\n` +
               `Confianza: ${Math.round(result.confidence * 100)}%\n` +
               `Prioridad: ${result.priority}\n\n` +
               `💡 Sugerencias:\n${result.smartSuggestions.map(s => `• ${s}`).join('\n')}\n\n` +
               `📋 Próximos pasos:\n${result.nextSteps.map(s => `• ${s}`).join('\n')}\n\n` +
               `🔍 Insights:\n${result.contextualInsights.map(s => `• ${s}`).join('\n')}`,
        requiresAttention: result.actionRequired
      };

      setExtractedData(extractedData);
      setShowPreview(true);

      // Set custom date if available
      if (result.extractedData.date) {
        const extractedDate = new Date(result.extractedData.date);
        setCustomDate(extractedDate.toISOString().split('T')[0]);
      }

      // Validate the result
      const validationResult = validateExtractedData(extractedData);
      setValidation(validationResult);

      // Show alerts for high priority items
      if (result.priority === 'urgent') {
        alert(`🚨 URGENTE: ${result.contextualInsights[0]}\n\n${result.requiresDoctor ? 'Se recomienda consultar con un médico inmediatamente.' : ''}`);
      } else if (result.priority === 'high') {
        alert(`⚠️ ALTA PRIORIDAD: ${result.contextualInsights[0]}\n\n${result.requiresDoctor ? 'Se recomienda consultar con un pediatra.' : ''}`);
      }

      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Capture: Smart AI processing completed:', result);
      }

    } catch (error: unknown) {
      console.error('Smart AI processing error:', error);
      setProcessError(error instanceof Error ? error.message : 'Error en el análisis inteligente');
    } finally {
      setIsProcessing(false);
    }
  }, [captureData, validateExtractedData]);

  // Process with multi-agent AI
  const processWithAI = useCallback(async () => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Process with AI button clicked.');
    }
    if (!captureData.input.trim()) {
      setProcessError('Por favor ingresa algún texto o adjunta un archivo');
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.warn('Capture: Process with AI aborted due to empty input.');
      }
      return;
    }

    // Verificar si el input es suficiente para IA
    if (!isInputReadyForAI(captureData.input)) {
      setProcessError('Proporciona más información específica (medidas, síntomas, etc.) para un mejor análisis con IA.');
      return;
    }
    
    setIsProcessing(true);
    setProcessError(null);
    setShowPreview(false);
    
          try {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Capture: Initiating multi-agent processing.');
        }
        
        // Configurar callback para mostrar pasos de procesamiento
        contextAwareAI.setStepUpdateCallback((step: any) => {
          if (import.meta.env.VITE_DEV === 'TRUE') {
            console.log(`🤖 ${step.agent || 'AI'}: ${step.description || step.action || 'Processing'}`);
          }
        });
        
        // Usar el coordinador de IA multi-agente con metadata
        const result = await contextAwareAI.processWithContext(
          captureData.input,
          captureData.metadata as any
        );
      
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Capture: Multi-agent processing result:', result);
      }
      
      setAiProcessingResult(result);
      
      // Si necesita clarificación, mostrar diálogo
      if (result.clarificationNeeded) {
        setShowClarificationDialog(true);
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Capture: Clarification needed, showing dialog.');
        }
        
        // Inicializar respuestas vacías para las preguntas
        const initialResponses: {[key: string]: string} = {};
        result.questions.forEach((q: string) => {
          initialResponses[q] = '';
        });
        setUserResponses(initialResponses);
      } else {
        // Procesar directamente si la confianza es alta
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Capture: No clarification needed, processing AI result.');
        }
        await processAiResult(result);
      }
      
    } catch (error: unknown) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        if (error instanceof Error) {
          console.error('Capture: Error processing with AI:', error.message);
        } else {
          console.error('Capture: Error processing with AI:', error);
        }
      }
      setProcessError(error instanceof Error ? error.message : 'Error al procesar');
    } finally {
      setIsProcessing(false);
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Capture: AI processing finished.');
      }
    }
  }, [captureData, processAiResult, isInputReadyForAI]);

  // Update suggestions based on debounced input
  useEffect(() => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Debounced input changed, updating suggestions/detected type.', debouncedInput.length);
    }
    if (debouncedInput.length > 10) {
      const inputLower = debouncedInput.toLowerCase();
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
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Capture: Detected type:', detectedExtractionType, 'Suggestions:', newSuggestions.length);
      }
    } else {
      setSuggestions([]);
      setDetectedType('note');
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Capture: Input too short for suggestions, resetting.');
      }
    }
  }, [debouncedInput]);

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
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Text input changed:', value.substring(0, 50), '...');
    }
  }, []);

  // Manejar respuestas del usuario a las preguntas de clarificación
  const handleClarificationSubmit = async () => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Clarification dialog submitted.', userResponses);
    }
    if (!aiProcessingResult) return;
    
    setIsProcessing(true);
    try {
              // Re-procesar con las respuestas del usuario
        const enhancedInput = captureData.input + '\n\nRespuestas adicionales:\n' + 
          Object.entries(userResponses).map(([q, a]) => `${q}: ${a}`).join('\n');
        
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Capture: Reprocessing with enhanced input.');
        }
        const enhancedResult = await contextAwareAI.processWithContext(
          enhancedInput,
          { ...captureData.metadata, userResponses } as any
        );
      
      await processAiResult(enhancedResult);
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Capture: Clarification reprocessing successful.');
      }
    } catch (error: unknown) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        if (error instanceof Error) {
          console.error('Capture: Error processing clarifications:', error.message);
        } else {
          console.error('Capture: Error processing clarifications:', error);
        }
      }
      setProcessError(error instanceof Error ? error.message : 'Error al procesar clarificaciones');
    } finally {
      setIsProcessing(false);
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Capture: Clarification processing finished.');
      }
    }
  };

  // Save extracted data
  const saveData = useCallback(async () => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Save data button clicked.');
    }
    if (!extractedData || !user) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.warn('Capture: Save data aborted due to missing extracted data or user.');
      }
      return;
    }
    
    try {
      // Usar la fecha personalizada si fue modificada
      const finalTimestamp = customDate ? 
        new Date(customDate + 'T' + new Date().toTimeString().split(' ')[0]) : 
        new Date(extractedData.timestamp);
      
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Capture: Final timestamp for saving:', finalTimestamp.toISOString());
      }
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
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Capture: Health record saved successfully:', savedRecord);
      }

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
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Capture: Insight created for attention-required record.');
        }
      }

      // Show success message (you could add a toast notification here)
      alert('¡Datos guardados exitosamente!');
      
      // Navigate to timeline to see the new record
      navigate('/timeline');
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Capture: Navigating to timeline after save.');
      }
      
    } catch (error: unknown) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        if (error instanceof Error) {
          console.error('Capture: Error saving data:', error.message);
        } else {
          console.error('Capture: Error saving data:', error);
        }
      }
      alert('Error al guardar los datos. Por favor intenta de nuevo.');
    }
  }, [extractedData, user, captureData, navigate, createHealthRecord, createInsight, customDate]);

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
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Applying quick template:', template);
    }
    setCaptureData(prev => ({
      ...prev,
      input: template
    }));
  };

  // Clear form
  const clearForm = useCallback(() => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Clearing form.');
    }
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
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture: Form cleared.');
    }
  }, []);

  // State for showing agent conversation
  const [showAgentConversation, setShowAgentConversation] = useState(false);

  // Component mount/unmount lifecycle
  useEffect(() => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Capture component mounted.');
    }
    return () => {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Capture component unmounted.');
      }
      // Clean up recording if unmounted during recording
      if (isRecording && mediaRecorderRef.current) {
        stopRecording();
      }
    };
  }, [isRecording, stopRecording]);

  return (
    <div className="capture-page">
      <header className="capture-header">
        <button className="back-button" onClick={() => {
          if (import.meta.env.VITE_DEV === 'TRUE') {
            console.log('Capture: Back button clicked.');
          }
          navigate('/');
        }}>
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

            {/* Input buttons con diseño mejorado */}
            <div className="input-types">
              <button 
                className={`type-button ${captureData.inputType === 'text' ? 'active' : ''}`}
                onClick={() => {
                  setCaptureData(prev => ({ ...prev, inputType: 'text' }));
                  if (import.meta.env.VITE_DEV === 'TRUE') {
                    console.log('Capture: Input type switched to Text.');
                  }
                }}
              >
                <span className="button-icon">✏️</span>
                <span className="button-label">Texto</span>
              </button>
              
              <button 
                className="type-button"
                onClick={() => {
                  imageInputRef.current?.click();
                  if (import.meta.env.VITE_DEV === 'TRUE') {
                    console.log('Capture: Camera button clicked.');
                  }
                }}
              >
                <span className="button-icon">📷</span>
                <span className="button-label">Cámara</span>
              </button>
              
              <button 
                className="type-button"
                onClick={() => {
                  galleryInputRef.current?.click();
                  if (import.meta.env.VITE_DEV === 'TRUE') {
                    console.log('Capture: Gallery button clicked.');
                  }
                }}
              >
                <span className="button-icon">🖼️</span>
                <span className="button-label">Galería</span>
              </button>
              
              <button 
                className={`type-button ${isRecording ? 'recording' : ''}`}
                onClick={() => {
                  if (isRecording) {
                    stopRecording();
                  } else {
                    startRecording();
                  }
                  if (import.meta.env.VITE_DEV === 'TRUE') {
                    console.log('Capture: Audio recording button clicked.', { isRecording });
                  }
                }}
              >
                <span className="button-icon">{isRecording ? '🔴' : '🎤'}</span>
                <span className="button-label">{isRecording ? `${recordingTime}s` : 'Audio'}</span>
              </button>
              
              <button 
                className="type-button"
                onClick={() => {
                  fileInputRef.current?.click();
                  if (import.meta.env.VITE_DEV === 'TRUE') {
                    console.log('Capture: File button clicked.');
                  }
                }}
              >
                <span className="button-icon">📎</span>
                <span className="button-label">Archivo</span>
              </button>
            </div>
          </div>

          {/* Main input area con diseño mejorado */}
          <div className="input-area">
            <textarea
              className="main-input"
              value={captureData.input}
              onChange={handleInputChange}
              placeholder="Ejemplo: 'Mi bebé pesó 8.5kg hoy después del baño' o 'Tiene fiebre de 38.2°C desde ayer y está un poco irritable'"
              rows={6}
            />
            
            {/* Character counter */}
            <div className="input-footer">
              <span className="character-count">{captureData.input.length} caracteres</span>
            </div>
          </div>

          {/* Quick Input Templates */}
          <div className="quick-templates">
            <h4>Plantillas rápidas:</h4>
            <div className="template-buttons">
              {quickTemplates.map((item, index) => (
                <button key={index} className="template-button" onClick={() => applyTemplate(item.template)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Smart Suggestions based on AI analysis */}
          {suggestions.length > 0 && (
            <div className="suggestions elegant">
              <h4>💡 Sugerencias inteligentes</h4>
              <ul>
                {suggestions.map((suggestion: string, index: number) => (
                  <li key={index}>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* File Inputs (hidden) */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx,.wav,.mp3,.mp4"
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
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            style={{ display: 'none' }}
          />

          {/* Image Preview con diseño mejorado */}
          {imagePreview && (
            <div className="image-preview-container elegant">
              <button 
                className="remove-image"
                onClick={() => {
                  setImagePreview(null);
                  setCaptureData(prev => ({ ...prev, input: '', file: undefined }));
                  if (import.meta.env.VITE_DEV === 'TRUE') {
                    console.log('Capture: Image preview removed.');
                  }
                }}
              >
                ✕
              </button>
              <img src={imagePreview} alt="Vista previa" className="image-preview" />
            </div>
          )}

          {/* Smart AI Button - NEW: 10 Optimized Scenarios */}
          <div className="smart-scenarios-section">
            <h4>🧠 Análisis Inteligente</h4>
            <p>El sistema detecta automáticamente el tipo de información y aplica el análisis más adecuado:</p>
            
            <div className="scenario-examples">
              <div className="scenario-grid">
                <div className="scenario-item">📊 Orden médica</div>
                <div className="scenario-item">💊 Recetas</div>
                <div className="scenario-item">🎙️ Audio síntomas</div>
                <div className="scenario-item">🩺 Consulta médica</div>
                <div className="scenario-item">📄 Resultados lab</div>
                <div className="scenario-item">📏 Medición altura</div>
                <div className="scenario-item">📸 Fotos síntomas</div>
                <div className="scenario-item">💊 Medicamentos</div>
                <div className="scenario-item">🌡️ Fiebre</div>
                <div className="scenario-item">🍼 Alimentación</div>
              </div>
            </div>
          </div>

          {/* Process Button con diseño mejorado */}
          <div className="action-buttons elegant">
            <button
              className={`smart-process-button ${captureData.input.trim() || captureData.file ? 'ready' : ''} ${isProcessing ? 'processing' : ''}`}
              onClick={processWithSmartAI}
              disabled={(!captureData.input.trim() && !captureData.file) || isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="spinner"></span>
                  <span>Analizando inteligentemente...</span>
                </>
              ) : (
                <>
                  <span className="button-icon">🚀</span>
                  <span>Análisis Inteligente</span>
                </>
              )}
            </button>

            <button
              className={`process-button ${captureData.input.trim() ? 'ready' : ''} ${isProcessing ? 'processing' : ''}`}
              onClick={processWithAI}
              disabled={!captureData.input.trim() || isProcessing}
              style={{ opacity: 0.7, fontSize: '0.9em' }}
            >
              {isProcessing ? (
                <>
                  <span className="spinner"></span>
                  <span>Analizando con múltiples agentes...</span>
                </>
              ) : (
                <>
                  <span className="button-icon">🧠</span>
                  <span>IA Multi-Agente (Avanzado)</span>
                </>
              )}
            </button>
            
            {(captureData.input || imagePreview) && (
              <button
                className="secondary-button"
                onClick={clearForm}
                type="button"
              >
                <span className="button-icon">🗑️</span>
                <span>Limpiar</span>
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

        {/* Clarification Dialog mejorado */}
        {showClarificationDialog && aiProcessingResult && (
          <div className="modal-overlay" onClick={() => {
            setShowClarificationDialog(false);
            if (import.meta.env.VITE_DEV === 'TRUE') {
              console.log('Capture: Clarification dialog overlay clicked, closing.');
            }
          }}>
            <div className="clarification-dialog elegant" onClick={e => e.stopPropagation()}>
              <div className="dialog-header">
                <h3>🤔 Necesito aclarar algunos puntos</h3>
                <button className="close-button" onClick={() => {
                  setShowClarificationDialog(false);
                  if (import.meta.env.VITE_DEV === 'TRUE') {
                    console.log('Capture: Clarification dialog close button clicked.');
                  }
                }}>✕</button>
              </div>
              
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${Math.round(aiProcessingResult.confidence * 100)}%` }}>
                  <span className="confidence-text">{Math.round(aiProcessingResult.confidence * 100)}% confianza</span>
                </div>
              </div>
              
              <div className="questions-section">
                {aiProcessingResult.questions.map((question: string, index: number) => (
                  <div key={index} className="clarification-question">
                    <label>{question}</label>
                    <input
                      type="text"
                      value={userResponses[question] || ''}
                      onChange={(e) => {
                        setUserResponses(prev => ({ ...prev, [question]: e.target.value }));
                        if (import.meta.env.VITE_DEV === 'TRUE') {
                          console.log('Capture: Clarification question response changed:', question, e.target.value);
                        }
                      }}
                      placeholder="Tu respuesta..."
                    />
                  </div>
                ))}
              </div>
              
              <div className="clarification-actions">
                <button className="secondary" onClick={() => {
                  setShowClarificationDialog(false);
                  if (import.meta.env.VITE_DEV === 'TRUE') {
                    console.log('Capture: Clarification dialog cancelled.');
                  }
                }}>
                  Cancelar
                </button>
                <button className="primary" onClick={handleClarificationSubmit}>
                  Continuar con estas respuestas
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Section mejorado */}
        {showPreview && extractedData && (
          <section className="preview-section elegant">
            <div className="preview-header">
              <h3>Vista previa de datos extraídos</h3>
              <div className={`confidence-indicator ${extractedData.confidence > 0.7 ? 'high' : extractedData.confidence > 0.4 ? 'medium' : 'low'}`}>
                <div className="confidence-circle">
                  <span>{Math.round(extractedData.confidence * 100)}%</span>
                </div>
                <span className="confidence-label">Confianza</span>
              </div>
            </div>

            {/* Botón para ver conversación entre agentes */}
            {aiProcessingResult?.conversationLog && aiProcessingResult.conversationLog.length > 0 && (
              <button 
                className="show-conversation-button"
                onClick={() => {
                  setShowAgentConversation(!showAgentConversation);
                  if (import.meta.env.VITE_DEV === 'TRUE') {
                    console.log('Capture: Toggling agent conversation view.', !showAgentConversation);
                  }
                }}
              >
                <span className="button-icon">💬</span>
                Ver análisis detallado de agentes
              </button>
            )}

            {/* Conversación entre agentes */}
            {showAgentConversation && aiProcessingResult?.conversationLog && (
              <div className="agent-conversation">
                <h4>🤖 Conversación entre agentes</h4>
                <div className="conversation-log">
                  {aiProcessingResult.conversationLog.map((msg: any, index: number) => (
                    <div key={index} className="conversation-message">
                      <div className="message-header">
                        <span className="agent-name">{msg.from}</span>
                        <span className="arrow">→</span>
                        <span className="agent-name">{msg.to}</span>
                      </div>
                      <div className="message-content">{msg.message}</div>
                      <div className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Agents Analysis Summary */}
            {aiProcessingResult && (
              <div className="ai-analysis-summary">
                <h4>🤖 Análisis Multi-Agente</h4>
                <div className="agents-grid">
                  {aiProcessingResult.agentResponses.map((agent: any, index: number) => (
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
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    if (import.meta.env.VITE_DEV === 'TRUE') {
                      console.log('Capture: Custom date changed:', e.target.value);
                    }
                  }}
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
              <button className="edit-button" onClick={() => {
                setShowPreview(false);
                if (import.meta.env.VITE_DEV === 'TRUE') {
                  console.log('Capture: Edit button clicked, closing preview.');
                }
              }}>
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