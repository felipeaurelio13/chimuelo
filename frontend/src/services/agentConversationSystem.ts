// Sistema de Conversaciones Multi-Agente para Chimuelo
// Permite que los agentes interactúen entre sí de forma inteligente

import openaiService from './openaiService';
import { AgentPromptManager } from './agentPrompts';
import MedicalValidator from './medicalValidation';
import ErrorHandler from './errorHandler';

export interface ConversationMessage {
  id: string;
  from: string;
  to?: string; // Si no se especifica, es un mensaje broadcast
  type: 'analysis' | 'question' | 'response' | 'recommendation' | 'alert' | 'conclusion';
  content: string;
  data?: any;
  timestamp: Date;
  confidence?: number;
}

export interface AgentParticipant {
  id: string;
  name: string;
  role: string;
  specialization: string[];
  capabilities: string[];
  constraints: string[];
}

export interface ConversationSession {
  id: string;
  topic: string;
  input: string;
  participants: AgentParticipant[];
  messages: ConversationMessage[];
  status: 'starting' | 'active' | 'deliberating' | 'concluding' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  finalResult?: any;
}

export class AgentConversationSystem {
  private static instance: AgentConversationSystem;
  private promptManager: AgentPromptManager;
  private medicalValidator: MedicalValidator;
  private currentSessions: Map<string, ConversationSession> = new Map();
  
  // Definición de agentes participantes
  private agents: AgentParticipant[] = [
    {
      id: 'classifier',
      name: 'Agente Clasificador',
      role: 'coordinator',
      specialization: ['classification', 'routing'],
      capabilities: ['analyze_input_type', 'determine_urgency', 'route_to_specialists'],
      constraints: ['no_medical_diagnosis', 'no_prescriptions']
    },
    {
      id: 'medical_analyzer',
      name: 'Agente Médico',
      role: 'specialist',
      specialization: ['medical_analysis', 'symptom_recognition', 'health_assessment'],
      capabilities: ['extract_symptoms', 'identify_medical_entities', 'assess_urgency', 'recommend_actions'],
      constraints: ['no_diagnosis', 'no_prescriptions', 'always_recommend_professional_consultation']
    },
    {
      id: 'data_extractor',
      name: 'Agente Extractor',
      role: 'specialist',
      specialization: ['data_extraction', 'measurement_processing'],
      capabilities: ['extract_measurements', 'parse_dates', 'identify_patterns'],
      constraints: ['validate_ranges', 'flag_anomalies']
    },
    {
      id: 'safety_validator',
      name: 'Agente Validador',
      role: 'safety',
      specialization: ['safety_validation', 'risk_assessment'],
      capabilities: ['validate_measurements', 'assess_safety', 'flag_critical_values'],
      constraints: ['strict_validation', 'conservative_assessment']
    },
    {
      id: 'recommendation_synthesizer',
      name: 'Agente Sintetizador',
      role: 'coordinator',
      specialization: ['synthesis', 'recommendation_generation'],
      capabilities: ['synthesize_findings', 'generate_recommendations', 'prioritize_actions'],
      constraints: ['evidence_based', 'safe_recommendations']
    }
  ];

  private constructor() {
    this.promptManager = AgentPromptManager.getInstance();
    this.medicalValidator = MedicalValidator.getInstance();
    console.log('🤖 Sistema de Conversaciones Multi-Agente inicializado');
  }

  public static getInstance(): AgentConversationSystem {
    if (!AgentConversationSystem.instance) {
      AgentConversationSystem.instance = new AgentConversationSystem();
    }
    return AgentConversationSystem.instance;
  }

  // Iniciar una nueva conversación multi-agente
  async startConversation(input: string, topic: string = 'health_analysis'): Promise<ConversationSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🚀 Iniciando conversación multi-agente: ${sessionId}`);
    console.log(`📝 Input: "${input.substring(0, 100)}..."`);
    
    const session: ConversationSession = {
      id: sessionId,
      topic,
      input,
      participants: [...this.agents],
      messages: [],
      status: 'starting',
      startTime: new Date()
    };

    this.currentSessions.set(sessionId, session);

    try {
      // Fase 1: Clasificación inicial
      await this.runClassificationPhase(session);
      
      // Fase 2: Análisis especializado paralelo
      await this.runAnalysisPhase(session);
      
      // Fase 3: Validación cruzada
      await this.runValidationPhase(session);
      
      // Fase 4: Síntesis y recomendaciones
      await this.runSynthesisPhase(session);
      
      session.status = 'completed';
      session.endTime = new Date();
      
      console.log(`✅ Conversación completada: ${sessionId}`);
      return session;
      
    } catch (error) {
      console.error(`❌ Error en conversación ${sessionId}:`, error);
      session.status = 'error';
      session.endTime = new Date();
      
      // Añadir mensaje de error
      this.addMessage(session, {
        from: 'system',
        type: 'alert',
        content: `Error en el procesamiento: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        data: { error: error }
      });
      
      return session;
    }
  }

  // Fase 1: Clasificación y routing inicial
  private async runClassificationPhase(session: ConversationSession): Promise<void> {
    console.log(`🔍 Fase 1: Clasificación - ${session.id}`);
    session.status = 'active';

    const classifierAgent = this.agents.find(a => a.id === 'classifier')!;
    
    try {
      const classificationPrompt = this.buildClassificationPrompt(session.input);
      const response = await openaiService.chatCompletion([
        { role: 'system', content: classificationPrompt.system },
        { role: 'user', content: classificationPrompt.user }
      ]);

      const classificationResult = this.parseAgentResponse(response);
      
      this.addMessage(session, {
        from: 'classifier',
        type: 'analysis',
        content: `He analizado el input y lo clasifico como: ${classificationResult.classification}`,
        data: classificationResult,
        confidence: classificationResult.confidence
      });

      // Determinar qué agentes necesitan participar
      const requiredAgents = this.determineRequiredAgents(classificationResult);
      
      this.addMessage(session, {
        from: 'classifier',
        to: 'broadcast',
        type: 'recommendation',
        content: `Recomiendo involucrar a los siguientes especialistas: ${requiredAgents.join(', ')}`,
        data: { requiredAgents }
      });

    } catch (error) {
      console.error('Error en fase de clasificación:', error);
      throw error;
    }
  }

  // Fase 2: Análisis especializado
  private async runAnalysisPhase(session: ConversationSession): Promise<void> {
    console.log(`🔬 Fase 2: Análisis Especializado - ${session.id}`);

    // Ejecutar análisis médico y extracción de datos en paralelo
    const analysisPromises = [
      this.runMedicalAnalysis(session),
      this.runDataExtraction(session)
    ];

    await Promise.all(analysisPromises);
  }

  // Análisis médico
  private async runMedicalAnalysis(session: ConversationSession): Promise<void> {
    try {
      const medicalPrompt = this.buildMedicalAnalysisPrompt(session.input, session.messages);
      const response = await openaiService.chatCompletion([
        { role: 'system', content: medicalPrompt.system },
        { role: 'user', content: medicalPrompt.user }
      ]);

      const medicalResult = this.parseAgentResponse(response);
      
      this.addMessage(session, {
        from: 'medical_analyzer',
        type: 'analysis',
        content: `Análisis médico completado. He identificado ${medicalResult.symptoms?.length || 0} síntomas potenciales.`,
        data: medicalResult,
        confidence: medicalResult.confidence
      });

      // Si hay alertas médicas, enviar mensaje urgente
      if (medicalResult.alerts && medicalResult.alerts.length > 0) {
        this.addMessage(session, {
          from: 'medical_analyzer',
          to: 'safety_validator',
          type: 'alert',
          content: `¡ATENCIÓN! He detectado las siguientes alertas: ${medicalResult.alerts.join(', ')}`,
          data: { alerts: medicalResult.alerts }
        });
      }

    } catch (error) {
      console.error('Error en análisis médico:', error);
      this.addMessage(session, {
        from: 'medical_analyzer',
        type: 'alert',
        content: 'Error en el análisis médico. Recomiendo revisión manual.',
        data: { error: error }
      });
    }
  }

  // Extracción de datos
  private async runDataExtraction(session: ConversationSession): Promise<void> {
    try {
      const extractionPrompt = this.buildDataExtractionPrompt(session.input);
      const response = await openaiService.chatCompletion([
        { role: 'system', content: extractionPrompt.system },
        { role: 'user', content: extractionPrompt.user }
      ]);

      const extractionResult = this.parseAgentResponse(response);
      
      this.addMessage(session, {
        from: 'data_extractor',
        type: 'analysis',
        content: `Extracción de datos completada. He encontrado ${Object.keys(extractionResult.measurements || {}).length} mediciones.`,
        data: extractionResult,
        confidence: extractionResult.confidence
      });

      // Enviar datos específicos al validador si hay mediciones críticas
      if (extractionResult.measurements) {
        const criticalMeasurements = this.identifyCriticalMeasurements(extractionResult.measurements);
        if (criticalMeasurements.length > 0) {
          this.addMessage(session, {
            from: 'data_extractor',
            to: 'safety_validator',
            type: 'question',
            content: `Por favor, valida estas mediciones críticas: ${criticalMeasurements.map(m => `${m.type}: ${m.value}${m.unit}`).join(', ')}`,
            data: { criticalMeasurements }
          });
        }
      }

    } catch (error) {
      console.error('Error en extracción de datos:', error);
      this.addMessage(session, {
        from: 'data_extractor',
        type: 'alert',
        content: 'Error en la extracción de datos. Algunos datos podrían no haberse capturado.',
        data: { error: error }
      });
    }
  }

  // Fase 3: Validación cruzada
  private async runValidationPhase(session: ConversationSession): Promise<void> {
    console.log(`🛡️ Fase 3: Validación - ${session.id}`);
    
    try {
      // Recopilar todos los datos de análisis previos
      const analysisData = this.extractAnalysisData(session);
      
      const validationPrompt = this.buildValidationPrompt(analysisData, session.input);
      const response = await openaiService.chatCompletion([
        { role: 'system', content: validationPrompt.system },
        { role: 'user', content: validationPrompt.user }
      ]);

      const validationResult = this.parseAgentResponse(response);
      
      this.addMessage(session, {
        from: 'safety_validator',
        type: 'analysis',
        content: `Validación completada. Estado de seguridad: ${validationResult.safetyStatus}`,
        data: validationResult,
        confidence: validationResult.confidence
      });

      // Responder a preguntas específicas de otros agentes
      const questionsForValidator = session.messages.filter(m => 
        m.to === 'safety_validator' && m.type === 'question'
      );

      for (const question of questionsForValidator) {
        const responseContent = await this.generateValidatorResponse(question, validationResult);
        this.addMessage(session, {
          from: 'safety_validator',
          to: question.from,
          type: 'response',
          content: responseContent,
          data: { originalQuestion: question.id }
        });
      }

    } catch (error) {
      console.error('Error en fase de validación:', error);
      this.addMessage(session, {
        from: 'safety_validator',
        type: 'alert',
        content: 'Error en la validación. Recomiendo precaución adicional.',
        data: { error: error }
      });
    }
  }

  // Fase 4: Síntesis final
  private async runSynthesisPhase(session: ConversationSession): Promise<void> {
    console.log(`🎯 Fase 4: Síntesis - ${session.id}`);
    session.status = 'concluding';

    try {
      // Recopilar todas las conclusiones de los agentes
      const allFindings = this.synthesizeAllFindings(session);
      
      const synthesisPrompt = this.buildSynthesisPrompt(allFindings, session.input);
      const response = await openaiService.chatCompletion([
        { role: 'system', content: synthesisPrompt.system },
        { role: 'user', content: synthesisPrompt.user }
      ]);

      const finalSynthesis = this.parseAgentResponse(response);
      
      this.addMessage(session, {
        from: 'recommendation_synthesizer',
        type: 'conclusion',
        content: 'He sintetizado todos los hallazgos del equipo médico en un análisis integral.',
        data: finalSynthesis,
        confidence: finalSynthesis.confidence
      });

      // Establecer el resultado final de la sesión
      session.finalResult = {
        synthesis: finalSynthesis,
        recommendations: finalSynthesis.recommendations || [],
        confidence: finalSynthesis.confidence || 0.8,
        safetyLevel: finalSynthesis.safetyLevel || 'unknown',
        extractedData: this.consolidateExtractedData(session),
        conversationSummary: this.generateConversationSummary(session)
      };

    } catch (error) {
      console.error('Error en fase de síntesis:', error);
      this.addMessage(session, {
        from: 'recommendation_synthesizer',
        type: 'alert',
        content: 'Error en la síntesis final. Revisa los análisis individuales.',
        data: { error: error }
      });
    }
  }

  // Métodos auxiliares para construcción de prompts
  private buildClassificationPrompt(input: string) {
    return {
      system: `Eres el Agente Clasificador del sistema médico pediátrico Chimuelo. Tu rol es analizar inputs de padres y clasificarlos para routing eficiente.

CAPACIDADES:
- Clasificar tipo de contenido médico
- Determinar urgencia y prioridad
- Recomendar especialistas apropiados

CLASIFICACIONES POSIBLES:
- measurement_data: Peso, altura, temperatura, etc.
- symptom_report: Síntomas, malestares, comportamientos
- milestone_update: Hitos de desarrollo, primeras veces
- medical_document: Informes médicos, exámenes
- medication_query: Medicamentos, dosis, vacunas
- administrative: Costos, citas, documentos administrativos
- general_question: Preguntas generales sobre salud

URGENCIA:
- low: Información rutinaria, hitos normales
- medium: Síntomas leves, preguntas específicas
- high: Síntomas preocupantes, mediciones anómalas
- critical: Emergencias, síntomas graves

Responde SOLO en JSON válido con: classification, urgency, confidence (0-1), reasoning, requiredSpecialists[]`,
      user: `Analiza este input de un padre/madre: "${input}"`
    };
  }

  private buildMedicalAnalysisPrompt(input: string, conversationHistory: ConversationMessage[]) {
    const context = conversationHistory.map(m => `${m.from}: ${m.content}`).join('\n');
    
    return {
      system: `Eres el Agente Médico Especializado del equipo Chimuelo. Analizas contenido médico pediátrico con expertise clínico.

ESPECIALIZACIÓN:
- Pediatría general
- Reconocimiento de síntomas
- Evaluación de urgencia médica
- Identificación de patrones

RESTRICCIONES CRÍTICAS:
- NUNCA diagnosticar enfermedades
- NUNCA prescribir medicamentos
- SIEMPRE recomendar consulta médica para síntomas preocupantes
- Ser conservador en evaluaciones

CONTEXTO DE LA CONVERSACIÓN:
${context}

Analiza síntomas, signos vitales, comportamientos y proporciona:
- symptoms: Array de síntomas identificados
- vitalSigns: Signos vitales si están presentes
- behavioralChanges: Cambios de comportamiento notados
- alerts: Alertas médicas si detectas algo preocupante
- recommendations: Recomendaciones seguras
- confidence: Tu nivel de confianza (0-1)

Responde SOLO en JSON válido.`,
      user: `Analiza médicamente: "${input}"`
    };
  }

  private buildDataExtractionPrompt(input: string) {
    return {
      system: `Eres el Agente Extractor de Datos del sistema Chimuelo. Tu especialidad es extraer y estructurar información cuantificable.

CAPACIDADES:
- Extraer mediciones (peso, altura, temperatura)
- Identificar fechas y horarios
- Estructurar datos numéricos
- Detectar patrones temporales

MEDICIONES TÍPICAS:
- weight: peso en kg o gramos
- height: altura en cm
- temperature: temperatura en °C o °F
- heartRate: frecuencia cardíaca (bpm)
- feedingVolume: volumen de alimentación (ml)
- sleepDuration: duración del sueño (horas)

Extrae y estructura todos los datos cuantificables en formato JSON:
{
  "measurements": {
    "type": { "value": number, "unit": string, "timestamp": string }
  },
  "dates": string[],
  "quantities": object,
  "confidence": number
}`,
      user: `Extrae todos los datos cuantificables de: "${input}"`
    };
  }

  private buildValidationPrompt(analysisData: any, originalInput: string) {
    return {
      system: `Eres el Agente Validador de Seguridad de Chimuelo. Tu función crítica es validar todos los hallazgos médicos para garantizar la seguridad del paciente.

RESPONSABILIDADES:
- Validar rangos normales para edad pediátrica
- Identificar valores críticos o anómalos
- Evaluar coherencia entre hallazgos
- Determinar nivel de riesgo

RANGOS PEDIÁTRICOS NORMALES (0-2 años):
- Temperatura: 36.1-37.2°C normal, >38°C fiebre, >39°C alta
- Peso recién nacido: 2.5-4.5kg
- Frecuencia cardíaca: 100-160 bpm
- Frecuencia respiratoria: 30-60 rpm

DATOS A VALIDAR:
${JSON.stringify(analysisData, null, 2)}

Proporciona validación completa:
- safetyStatus: "safe" | "caution" | "warning" | "critical"
- validatedMeasurements: object con validaciones individuales
- riskFactors: array de factores de riesgo identificados
- recommendations: recomendaciones de seguridad
- confidence: nivel de confianza en la validación

Responde SOLO en JSON válido.`,
      user: `Valida la seguridad de estos hallazgos para el input original: "${originalInput}"`
    };
  }

  private buildSynthesisPrompt(allFindings: any, originalInput: string) {
    return {
      system: `Eres el Agente Sintetizador del equipo médico Chimuelo. Tu rol es integrar todos los hallazgos del equipo en una evaluación coherente y útil.

EQUIPO MÉDICO:
- Clasificador: Determinó tipo y urgencia
- Médico: Analizó aspectos clínicos
- Extractor: Identificó datos cuantificables
- Validador: Evaluó seguridad

HALLAZGOS DEL EQUIPO:
${JSON.stringify(allFindings, null, 2)}

SÍNTESIS REQUERIDA:
- Integrar hallazgos de todos los especialistas
- Identificar patrones y conexiones
- Generar recomendaciones priorizadas
- Evaluar nivel de confianza global
- Determinar próximos pasos

Proporciona síntesis integral:
- summary: resumen ejecutivo de hallazgos
- keyFindings: hallazgos más importantes
- recommendations: recomendaciones priorizadas
- nextSteps: próximos pasos sugeridos
- safetyLevel: nivel de seguridad global
- confidence: confianza en la síntesis completa

Responde SOLO en JSON válido.`,
      user: `Sintetiza todos los hallazgos para: "${originalInput}"`
    };
  }

  // Métodos auxiliares
  private addMessage(session: ConversationSession, messageData: Partial<ConversationMessage>): void {
    const message: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      ...messageData
    } as ConversationMessage;

    session.messages.push(message);
    console.log(`💬 [${session.id}] ${message.from}: ${message.content.substring(0, 100)}...`);
  }

  private parseAgentResponse(response: string): any {
    try {
      // Intentar parsear como JSON
      return JSON.parse(response);
    } catch (error) {
      // Si no es JSON válido, crear estructura básica
      console.warn('Respuesta del agente no es JSON válido:', response);
      return {
        content: response,
        confidence: 0.5,
        parseError: true
      };
    }
  }

  private determineRequiredAgents(classificationResult: any): string[] {
    const agents = ['medical_analyzer', 'data_extractor', 'safety_validator'];
    
    // Añadir agentes específicos según clasificación
    if (classificationResult.urgency === 'critical' || classificationResult.urgency === 'high') {
      agents.push('emergency_advisor');
    }
    
    return agents;
  }

  private identifyCriticalMeasurements(measurements: any): any[] {
    const critical = [];
    
    if (measurements.temperature && measurements.temperature.value > 38) {
      critical.push(measurements.temperature);
    }
    
    if (measurements.weight && (measurements.weight.value < 2.5 || measurements.weight.value > 6)) {
      critical.push(measurements.weight);
    }
    
    return critical;
  }

  private extractAnalysisData(session: ConversationSession): any {
    const data: any = {};
    
    session.messages.forEach(message => {
      if (message.data && message.type === 'analysis') {
        data[message.from] = message.data;
      }
    });
    
    return data;
  }

  private async generateValidatorResponse(question: ConversationMessage, validationResult: any): Promise<string> {
    if (question.data?.criticalMeasurements) {
      const measurements = question.data.criticalMeasurements;
      return `He validado las mediciones críticas. ${measurements.map((m: any) => 
        `${m.type}: ${m.value}${m.unit} - ${this.validateMeasurement(m)}`
      ).join('. ')}`;
    }
    
    return 'He revisado los datos y están dentro de parámetros seguros.';
  }

  private validateMeasurement(measurement: any): string {
    if (measurement.type === 'temperature') {
      if (measurement.value > 39) return 'CRÍTICO - Fiebre alta';
      if (measurement.value > 38) return 'ADVERTENCIA - Fiebre';
      return 'Normal';
    }
    
    if (measurement.type === 'weight') {
      if (measurement.value < 2.5) return 'ADVERTENCIA - Bajo peso';
      if (measurement.value > 6) return 'ADVERTENCIA - Peso elevado';
      return 'Normal';
    }
    
    return 'Requiere revisión';
  }

  private synthesizeAllFindings(session: ConversationSession): any {
    const findings: any = {
      classification: null,
      medicalAnalysis: null,
      dataExtraction: null,
      validation: null,
      alerts: [],
      confidence: []
    };

    session.messages.forEach(message => {
      if (message.type === 'analysis' && message.data) {
        findings[message.from] = message.data;
        if (message.confidence) {
          findings.confidence.push(message.confidence);
        }
      }
      
      if (message.type === 'alert') {
        findings.alerts.push({
          from: message.from,
          content: message.content,
          data: message.data
        });
      }
    });

    return findings;
  }

  private consolidateExtractedData(session: ConversationSession): any {
    const consolidated: any = {};
    
    session.messages.forEach(message => {
      if (message.data && message.from === 'data_extractor') {
        Object.assign(consolidated, message.data);
      }
    });
    
    return consolidated;
  }

  private generateConversationSummary(session: ConversationSession): string {
    const summary = [];
    summary.push(`Conversación multi-agente para: "${session.input.substring(0, 50)}..."`);
    summary.push(`Participantes: ${session.participants.map(p => p.name).join(', ')}`);
    summary.push(`Mensajes intercambiados: ${session.messages.length}`);
    summary.push(`Duración: ${session.endTime ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000) : 'N/A'} segundos`);
    
    return summary.join('\n');
  }

  // Métodos públicos para acceso a sesiones
  getSession(sessionId: string): ConversationSession | undefined {
    return this.currentSessions.get(sessionId);
  }

  getAllSessions(): ConversationSession[] {
    return Array.from(this.currentSessions.values());
  }

  clearCompletedSessions(): void {
    for (const [id, session] of this.currentSessions.entries()) {
      if (session.status === 'completed' || session.status === 'error') {
        this.currentSessions.delete(id);
      }
    }
  }
}

export default AgentConversationSystem;