import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import apiService from '../services/apiService';
import SchemaService from '../services/schemas';
import { contextAwareAICoordinator as contextAwareAI } from '../services/aiCoordinator';
import { type HealthRecord, type HealthStats } from '../services/databaseService';
import { type ProcessingResult } from '../services/aiAgents';
import AgentConversationViewer from '../components/AgentConversationViewer';
import LegacyAgentConversationViewer from '../components/LegacyAgentConversationViewer';
import MedicalIntegrationDialog from '../components/MedicalIntegrationDialog';
import AgentConversationSystem, { ConversationSession } from '../services/agentConversationSystem';
import MedicalRecordIntegrator, { IntegrationProposal } from '../services/medicalRecordIntegrator';
import AppFooter from '../components/AppFooter';
import ErrorHandler, { type ErrorInfo } from '../services/errorHandler';
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
  const { createHealthRecord, createInsight, getHealthRecords, getHealthStats } = useData();
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
  const [customDate, setCustomDate] = useState<string>('');
  
  // Multi-agent AI state
  const [aiProcessingResult, setAiProcessingResult] = useState<ProcessingResult | null>(null);
  const [showClarificationDialog, setShowClarificationDialog] = useState(false);
  const [userResponses, setUserResponses] = useState<{[question: string]: string}>({});
  const [showAgentViewer, setShowAgentViewer] = useState(false);
  
  // New multi-agent conversation system
  const [conversationSession, setConversationSession] = useState<ConversationSession | null>(null);
  const [showConversationViewer, setShowConversationViewer] = useState(false);
  const [isUsingNewSystem, setIsUsingNewSystem] = useState(true);
  
  // Medical record integration
  const [integrationProposal, setIntegrationProposal] = useState<IntegrationProposal | null>(null);
  const [showIntegrationDialog, setShowIntegrationDialog] = useState(false);
  const [isIntegrating, setIsIntegrating] = useState(false);
  
  // File handling (deshabilitado por ahora)
  
  // Smart suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [detectedType, setDetectedType] = useState<string>('note');
  
  // Debounce input para reducir re-renders y API calls
  const debouncedInput = useDebounce(captureData.input, 500); // 500ms delay

  // Generar notas inteligentes basadas en el análisis
  const generateNotes = (result: any): string => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('🔧 [DEBUG] Capture: Generating notes from AI result.');
    }
    const notes: string[] = [];
    
    // Defensive programming: handle both old and new AI system formats
    const finalData = result?.finalData || result?.extractedData || {};
    
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('🔧 [DEBUG] Capture: finalData for notes:', finalData);
    }
    
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
    if (result.suggestions && result.suggestions.length > 0) {
      notes.push('\nSugerencias:');
      result.suggestions.forEach((s: string) => notes.push(`• ${s}`));
    }
    
    // Agregar recomendaciones del sistema multiagente (filtrar preguntas)
    if (result.recommendations && result.recommendations.length > 0) {
      const actualRecommendations = result.recommendations.filter((r: string) => 
        !r.includes('?') && // Filtrar preguntas
        !r.toLowerCase().includes('¿') && // Filtrar preguntas en español
        !r.toLowerCase().includes('pregunta') &&
        !r.toLowerCase().includes('consulta') &&
        r.length > 10 // Filtrar recomendaciones muy cortas
      );
      
      if (actualRecommendations.length > 0) {
        notes.push('\nRecomendaciones:');
        actualRecommendations.forEach((r: string) => notes.push(`• ${r}`));
      }
    }
    
    // Agregar etiquetas automáticas
    if (finalData.autoTags?.length > 0) {
      notes.push(`\nEtiquetas: ${finalData.autoTags.join(', ')}`);
    }
    
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('🔧 [DEBUG] Capture: Generated notes:', notes.join('\n').substring(0, 100), '...');
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
    console.log('🔧 [DEBUG] Capture: Processing AI final result.', result);
    console.log('🔧 [DEBUG] Result type:', typeof result);
    console.log('🔧 [DEBUG] Result keys:', result ? Object.keys(result) : 'null/undefined');
    
    // Procesar el resultado del nuevo sistema de IA
    let extractedData: ExtractedData;
    
    try {
      // El resultado viene directamente del worker, ya procesado por openaiService
      if (result && typeof result === 'object') {
        console.log('🔧 [DEBUG] Procesando resultado válido');
        
        // Verificar estructura del resultado
        if (!result.data) {
          console.warn('🔧 [DEBUG] Result no tiene data, usando fallback');
          throw new Error('Estructura de resultado inválida: falta data');
        }
        
        extractedData = {
          type: result.type || 'note',
          confidence: result.confidence || 0.5,
          timestamp: result.data?.date || new Date().toISOString(),
          data: {
            value: result.data?.value || captureData.input,
            unit: result.data?.unit || 'text',
            date: result.data?.date || new Date().toISOString(),
            context: result.data?.context || captureData.input
          },
          notes: result.notes || generateNotes(result),
          requiresAttention: result.requiresAttention || false
        };
        
        console.log('🔧 [DEBUG] ExtractedData creado:', extractedData);
      } else {
        console.warn('🔧 [DEBUG] Result inválido, usando fallback');
        throw new Error('Resultado de IA inválido');
      }
      
      // Validar que los datos extraídos sean válidos
      if (!extractedData.data?.value) {
        console.warn('🔧 [DEBUG] No se pudo extraer valor, usando fallback');
        throw new Error('No se pudo extraer valor de los datos');
      }
      
      console.log('🔧 [DEBUG] Validación exitosa, datos extraídos:', extractedData.data.value);
      
    } catch (error) {
      console.error('❌ Error procesando resultado de IA:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Crear error info para logging
      const errorInfo = ErrorHandler.createUIError(error, { 
        result, 
        captureData 
      });
      ErrorHandler.getInstance().logError(errorInfo);
      
      // Crear fallback robusto
      extractedData = {
        type: 'note',
        confidence: 0.1,
        timestamp: new Date().toISOString(),
        data: {
          value: captureData.input || 'Texto no disponible',
          unit: 'text',
          date: new Date().toISOString(),
          context: 'Análisis básico por error'
        },
        notes: errorInfo.userMessage,
        requiresAttention: false
      };
      
      console.log('🔧 [DEBUG] Usando fallback debido a error:', extractedData);
    }
    
    console.log('🔧 [DEBUG] Estableciendo extractedData:', extractedData);
    setExtractedData(extractedData);
    setShowPreview(true);
    setShowClarificationDialog(false);
    
    // Establecer fecha personalizada si está disponible
    if (extractedData.data.date) {
      const extractedDate = new Date(extractedData.data.date);
      setCustomDate(extractedDate.toISOString().split('T')[0]);
    }
    
    // Validar el resultado
    const validationResult = validateExtractedData(extractedData);
    setValidation(validationResult);
    
    console.log('🔧 [DEBUG] Capture: Extracted data set and validated.', extractedData, validationResult);
  }, [generateNotes, validateExtractedData, captureData.input]);



  // Verificar si el input es suficiente para procesamiento IA
  const isInputReadyForAI = useCallback((input: string): boolean => {
    const cleanInput = input.trim();
    return cleanInput.length >= 10 && 
           (cleanInput.includes('cm') || cleanInput.includes('kg') || cleanInput.includes('temperatura') || 
            cleanInput.includes('fiebre') || cleanInput.includes('peso') || cleanInput.includes('altura') ||
            cleanInput.length >= 20);
  }, []);

  // Process with NEW multi-agent conversation system
  const processWithConversationSystem = useCallback(async () => {
    console.log('🤖 Iniciando procesamiento con sistema de conversaciones multi-agente');
    
    if (!captureData.input.trim()) {
      setProcessError('Por favor ingresa algún texto para el análisis');
      return;
    }

    setIsProcessing(true);
    setProcessError(null);
    setConversationSession(null);
    
    try {
      const conversationSystem = AgentConversationSystem.getInstance();
      console.log('🚀 Iniciando conversación multi-agente...');
      
      const session = await conversationSystem.startConversation(
        captureData.input,
        'health_analysis',
        user?.id // Incluir userId para contexto médico
      );
      
      console.log('✅ Conversación completada:', session.id);
      setConversationSession(session);
      setShowConversationViewer(true);
      
      // Procesar resultado final si existe
      if (session.finalResult) {
        console.log('📊 Procesando resultado final de la conversación');
        await processConversationResult(session);
        
        // Analizar para integración médica
        await analyzeForMedicalIntegration(session);
      }
      
    } catch (error) {
      console.error('❌ Error en conversación multi-agente:', error);
      setProcessError(`Error en el análisis: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [captureData.input]);

  // Process conversation result into health record
  const processConversationResult = useCallback(async (session: ConversationSession) => {
    if (!session.finalResult) return;
    
    try {
      const finalResult = session.finalResult;
      
      // Extraer datos estructurados del resultado
      const extractedData = finalResult.extractedData || {};
      const recommendations = finalResult.recommendations || [];
      
      // Generar notas basadas en la conversación
      const notes: string[] = [];
      notes.push(`Análisis multi-agente completado (${session.messages.length} intercambios)`);
      notes.push(`Confianza: ${(finalResult.confidence * 100).toFixed(0)}%`);
      notes.push(`Seguridad: ${finalResult.safetyLevel}`);
      
      if (recommendations.length > 0) {
        notes.push('\nRecomendaciones del equipo:');
        recommendations.forEach((rec: string) => notes.push(`• ${rec}`));
      }
      
      // Actualizar datos de captura
      setCaptureData(prev => ({
        ...prev,
        extractedData: extractedData,
        notes: notes.join('\n'),
        confidence: finalResult.confidence,
        autoTags: extractedData.autoTags || []
      }));
      
      console.log('✅ Resultado de conversación procesado y aplicado');
      
    } catch (error) {
      console.error('❌ Error procesando resultado de conversación:', error);
    }
  }, []);

  // Analizar conversación para integración médica
  const analyzeForMedicalIntegration = useCallback(async (session: ConversationSession) => {
    if (!user?.id) {
      console.warn('⚠️ No hay userId disponible para integración médica');
      return;
    }

    try {
      console.log('🔍 Analizando conversación para integración médica');
      
      const integrator = MedicalRecordIntegrator.getInstance();
      
      // Extraer datos médicos de la conversación
      const extractedData = await integrator.analyzeConversationForMedicalData(session, user.id);
      
      // Verificar si hay datos relevantes para integrar
      const hasRelevantData = 
        Object.keys(extractedData.measurements).length > 0 ||
        extractedData.symptoms.length > 0 ||
        extractedData.milestones.length > 0 ||
        extractedData.medications.length > 0;

      if (!hasRelevantData) {
        console.log('ℹ️ No se encontraron datos relevantes para integrar a la ficha médica');
        return;
      }

      // Obtener contexto médico
      const medicalContext = await integrator.getMedicalHistoryContext(user.id);
      
      // Crear propuesta de integración
      const proposal = await integrator.createIntegrationProposal(
        extractedData,
        medicalContext,
        user.id
      );

      console.log('✅ Propuesta de integración creada:', proposal.id);
      setIntegrationProposal(proposal);
      
      // Mostrar el diálogo de integración automáticamente
      setTimeout(() => {
        setShowIntegrationDialog(true);
      }, 1000); // Pequeño delay para mejor UX

    } catch (error) {
      console.error('❌ Error analizando para integración médica:', error);
    }
  }, [user?.id]);

  // Confirmar integración a ficha médica
  const handleIntegrationConfirm = useCallback(async (proposal: IntegrationProposal) => {
    if (!user?.id) return;

    setIsIntegrating(true);
    
    try {
      console.log('💾 Aplicando integración a ficha médica');
      
      const integrator = MedicalRecordIntegrator.getInstance();
      const success = await integrator.applyIntegration(proposal, user.id);
      
      if (success) {
        console.log('🎉 Integración aplicada exitosamente');
        
        // Mostrar notificación de éxito
        setProcessError('✅ Datos incorporados exitosamente a la ficha médica de Maxi');
        
        // Cerrar diálogo
        setShowIntegrationDialog(false);
        setIntegrationProposal(null);
        
        // Limpiar notificación después de 5 segundos
        setTimeout(() => {
          setProcessError(null);
        }, 5000);
        
      } else {
        setProcessError('❌ Error aplicando la integración. Inténtalo nuevamente.');
      }
      
    } catch (error) {
      console.error('❌ Error en integración:', error);
      setProcessError('❌ Error incorporando datos a la ficha médica');
    } finally {
      setIsIntegrating(false);
    }
  }, [user?.id]);

  // Cancelar integración
  const handleIntegrationCancel = useCallback(() => {
    setShowIntegrationDialog(false);
    setIntegrationProposal(null);
    console.log('🚫 Integración cancelada por el usuario');
  }, []);

  // Process with multi-agent AI (legacy system)
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
    
    console.log('🔧 [DEBUG] Capture: Iniciando procesamiento con AI');
    console.log('🔧 [DEBUG] Input:', captureData.input);
    console.log('🔧 [DEBUG] User:', user?.id);
    
    try {
      console.log('🔧 [DEBUG] Configurando callback para pasos de procesamiento');
      
      // Configurar callback para mostrar pasos de procesamiento
      contextAwareAI.setStepUpdateCallback((step: any) => {
        console.log(`🤖 ${step.agent || 'AI'}: ${step.description || step.action || 'Processing'}`);
      });
      
      // Obtener contexto del usuario para enriquecer el análisis
      console.log('🔧 [DEBUG] Obteniendo contexto del usuario');
      const userContext = {
        profile: {
          babyName: user?.babyName,
          birthDate: user?.birthDate,
          birthWeight: user?.birthWeight,
          birthHeight: user?.birthHeight
        },
        recentRecords: await getRecentHealthRecords(7), // Últimos 7 días
        currentStats: await getCurrentHealthStats() || undefined
      };
      
      console.log('🔧 [DEBUG] UserContext creado:', {
        profileKeys: Object.keys(userContext.profile || {}),
        recentRecordsCount: userContext.recentRecords?.length || 0,
        hasCurrentStats: !!userContext.currentStats
      });
      
      // Usar el coordinador de IA con contexto real
      console.log('🔧 [DEBUG] Llamando a contextAwareAI.processWithContext...');
      const result = await contextAwareAI.processWithContext(
        captureData.input,
        userContext
      );
      
      console.log('🔧 [DEBUG] Resultado de contextAwareAI:', result);
      console.log('🔧 [DEBUG] Result type:', typeof result);
      console.log('🔧 [DEBUG] Result keys:', result ? Object.keys(result) : 'null/undefined');
      
      setAiProcessingResult(result);
      
      // Procesar el resultado directamente (sin mock data)
      console.log('🔧 [DEBUG] Llamando a processAiResult...');
      await processAiResult(result);
      
      console.log('🔧 [DEBUG] Procesamiento completado exitosamente');
      
    } catch (error: unknown) {
      console.error('❌ Error crítico en procesamiento con AI:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Crear error info para logging
      const errorInfo = ErrorHandler.handleError(error, { 
        input: captureData.input, 
        userContext: { userId: user?.id } 
      });
      ErrorHandler.getInstance().logError(errorInfo);
      
      console.log('🔧 [DEBUG] ErrorInfo creado:', errorInfo);
      
      // Mostrar error amigable al usuario
      setProcessError(errorInfo.userMessage);
      
      // Si hay un error crítico, mostrar información adicional
      if (errorInfo.severity === 'critical') {
        console.error('❌ Error crítico detectado:', errorInfo);
        // Aquí podrías mostrar un modal o notificación especial
      }
      
      // Crear fallback para prevenir pantalla en blanco
      const fallbackData: ExtractedData = {
        type: 'note',
        confidence: 0.1,
        timestamp: new Date().toISOString(),
        data: {
          value: captureData.input || 'Texto no disponible',
          unit: 'text',
          date: new Date().toISOString(),
          context: 'Análisis básico por error crítico'
        },
        notes: errorInfo.userMessage,
        requiresAttention: false
      };
      
      console.log('🔧 [DEBUG] Estableciendo fallback data:', fallbackData);
      setExtractedData(fallbackData);
      setShowPreview(true);
      
    } finally {
      console.log('🔧 [DEBUG] Finalizando procesamiento, estableciendo isProcessing = false');
      setIsProcessing(false);
    }
  }, [captureData.input, isInputReadyForAI, contextAwareAI, processAiResult, user]);

  // Helper functions for getting user context
  const getRecentHealthRecords = async (days: number): Promise<HealthRecord[]> => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      return await getHealthRecords(user?.id || '', {
        startDate,
        endDate,
        limit: 20
      });
    } catch (error) {
      console.warn('Error getting recent health records:', error);
      return [];
    }
  };

  const getCurrentHealthStats = async (): Promise<HealthStats | null> => {
    try {
      const stats = await getHealthStats(user?.id || '');
      return {
        totalRecords: stats.totalRecords,
        recordsByType: stats.recordsByType,
        alertsCount: stats.alertsCount,
        lastRecord: stats.lastRecord,
        trendData: stats.trendData
      };
    } catch (error) {
      console.warn('Error getting health stats:', error);
      return null;
    }
  };

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
      
      // Crear error info para logging
      const errorInfo = ErrorHandler.createDatabaseError(error, { 
        extractedData, 
        userId: user?.id 
      });
      ErrorHandler.getInstance().logError(errorInfo);
      
      // Mostrar error amigable al usuario
      alert(errorInfo.userMessage);
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
    };
  }, []);

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
        <h1>📸 Capturar Datos de Salud</h1>
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


          {/* Process Button con diseño mejorado */}
          <div className="action-buttons elegant">
            {/* Sistema Conversacional Multi-Agente (Nuevo) */}
            <button
              className={`process-button ${captureData.input.trim() ? 'ready' : ''} ${isProcessing ? 'processing' : ''}`}
              onClick={processWithConversationSystem}
              disabled={!captureData.input.trim() || isProcessing}
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {isProcessing ? (
                <>
                  <span className="spinner"></span>
                  <span>🤖 Agentes conversando...</span>
                </>
              ) : (
                <>
                  <span className="button-icon">🤖</span>
                  <span>Análisis Multi-Agente</span>
                </>
              )}
            </button>
            
            {/* Sistema Clásico (Fallback) */}
            <button
              className={`process-button secondary ${captureData.input.trim() ? 'ready' : ''} ${isProcessing ? 'processing' : ''}`}
              onClick={processWithAI}
              disabled={!captureData.input.trim() || isProcessing}
              style={{ background: 'linear-gradient(135deg, #64748b, #6b7280)', marginTop: '0.5rem' }}
            >
              {isProcessing ? (
                <>
                  <span className="spinner"></span>
                  <span>Analizando con IA...</span>
                </>
              ) : (
                <>
                  <span className="button-icon">🧠</span>
                  <span>Sistema Clásico</span>
                </>
              )}
            </button>
            
            {captureData.input && (
              <button
                className="secondary-button"
                onClick={clearForm}
                type="button"
              >
                <span className="button-icon">🗑️</span>
                <span>Limpiar</span>
              </button>
            )}
            
            {/* Botón para integrar manualmente si hay conversación completada */}
            {conversationSession && conversationSession.finalResult && (
              <button
                className="secondary-button"
                onClick={() => {
                  if (integrationProposal) {
                    setShowIntegrationDialog(true);
                  } else {
                    analyzeForMedicalIntegration(conversationSession);
                  }
                }}
                type="button"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}
                disabled={isProcessing || isIntegrating}
              >
                <span className="button-icon">📋</span>
                <span>Integrar a Ficha</span>
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
                <div className="dialog-actions">
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => {
                      setShowAgentViewer(true);
                      if (import.meta.env.VITE_DEV === 'TRUE') {
                        console.log('Capture: Agent viewer button clicked.');
                      }
                    }}
                    title="Ver detalles del procesamiento"
                  >
                    🤖 Ver proceso
                  </button>
                  <button className="close-button" onClick={() => {
                    setShowClarificationDialog(false);
                    if (import.meta.env.VITE_DEV === 'TRUE') {
                      console.log('Capture: Clarification dialog close button clicked.');
                    }
                  }}>✕</button>
                </div>
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
            {aiProcessingResult && aiProcessingResult.agentResponses?.length > 0 && (
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
            {aiProcessingResult && !aiProcessingResult.agentResponses?.length && (
              <div className="ai-analysis-summary">
                <h4>🤖 Análisis Multi-Agente</h4>
                <p>No se recibieron respuestas de los agentes.</p>
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
                {extractedData.type === 'note' && extractedData.data?.value && (
                  <div className="data-field">
                    <strong>Nota:</strong> {extractedData.data.value}
                  </div>
                )}
                {/* Mostrar datos sin formato específico */}
                {!['weight', 'temperature', 'height', 'note'].includes(extractedData.type) && (
                  <div className="data-field">
                    <strong>{extractedData.type.charAt(0).toUpperCase() + extractedData.type.slice(1)}:</strong> {extractedData.data?.value || 'Sin datos específicos'}
                    {extractedData.data?.unit && <span> {extractedData.data.unit}</span>}
                  </div>
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

      {/* New Multi-Agent Conversation Viewer */}
      <AgentConversationViewer
        session={conversationSession}
        isVisible={showConversationViewer}
        onClose={() => setShowConversationViewer(false)}
      />

      {/* Legacy Agent Conversation Viewer */}
      <LegacyAgentConversationViewer
        conversations={aiProcessingResult?.conversationLog}
        processingSteps={aiProcessingResult?.processingSteps}
        qualityMetrics={aiProcessingResult?.qualityMetrics}
        isVisible={showAgentViewer}
        onClose={() => setShowAgentViewer(false)}
      />

      {/* Medical Integration Dialog */}
      <MedicalIntegrationDialog
        proposal={integrationProposal}
        isVisible={showIntegrationDialog}
        onConfirm={handleIntegrationConfirm}
        onCancel={handleIntegrationCancel}
        isProcessing={isIntegrating}
      />

      <AppFooter />
    </div>
  );
};

export default Capture;