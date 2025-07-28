// Coordinador de IA con contexto real del usuario
import openaiService from './openaiService';
import { AIProcessingCoordinatorV2 } from './aiAgents';
import { type HealthRecord } from './databaseService';

interface UserProfile {
  babyName?: string;
  birthDate?: string;
  birthWeight?: number;
  birthHeight?: number;
}

interface HealthStats {
  totalRecords: number;
  recordsByType: Record<string, number>;
  alertsCount: number;
  lastRecord?: HealthRecord;
  trendData: { date: string; count: number }[];
}

interface ProcessingStep {
  agent: string;
  description: string;
  timestamp: Date;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

interface ContextualInput {
  profile?: UserProfile;
  recentRecords?: HealthRecord[];
  currentStats?: HealthStats;
  lastInteraction?: Date;
}

interface ConversationState {
  answeredQuestions: Set<string>;
  knownData: Map<string, any>;
  conversationHistory: Array<{
    timestamp: Date;
    topic: string;
    data: any;
  }>;
}

export class ContextAwareAICoordinator {
  private coordinator: AIProcessingCoordinatorV2;
  private profile: UserProfile | null = null;
  private recentRecords: HealthRecord[] = [];
  private currentStats: HealthStats | null = null;
  private conversationState: ConversationState;
  private processingSteps: ProcessingStep[] = [];
  private onStepUpdate?: (step: ProcessingStep) => void;

  constructor() {
    this.coordinator = new AIProcessingCoordinatorV2();
    this.conversationState = {
      answeredQuestions: new Set(),
      knownData: new Map(),
      conversationHistory: []
    };
  }

  // Configurar callback para updates de procesamiento
  setStepUpdateCallback(callback: (step: ProcessingStep) => void) {
    this.onStepUpdate = callback;
  }

  // Resetear pasos de procesamiento
  private resetProcessingSteps() {
    this.processingSteps = [];
  }

  // Simular paso de procesamiento con timing realista
  private async simulateProcessingStep(
    agentName: string, 
    description: string, 
    baseDelay: number
  ): Promise<void> {
    const step: ProcessingStep = {
      agent: agentName,
      description,
      timestamp: new Date(),
      duration: baseDelay,
      status: 'processing'
    };

    this.processingSteps.push(step);
    
    if (this.onStepUpdate) {
      this.onStepUpdate({ ...step, status: 'processing' });
    }

    // Añadir variabilidad realista al tiempo
    const actualDelay = baseDelay + (Math.random() * 200 - 100);
    await new Promise(resolve => setTimeout(resolve, Math.max(100, actualDelay)));

    step.status = 'completed';
    if (this.onStepUpdate) {
      this.onStepUpdate({ ...step, status: 'completed' });
    }
  }

  // Enriquecer input con contexto del perfil
  enrichInputWithProfile(input: string, userContext: ContextualInput): string {
    this.profile = userContext.profile || null;
    this.recentRecords = userContext.recentRecords || [];
    this.currentStats = userContext.currentStats || null;

    let contextualInput = input;
    
    // Agregar contexto del bebé
    if (this.profile?.babyName) {
      contextualInput += `\n[CONTEXTO DEL BEBÉ: ${this.profile.babyName}`;
      
      if (this.profile.birthDate) {
        const age = this.calculateAge(this.profile.birthDate);
        contextualInput += `, ${age.months} meses de edad`;
        
        // Guardar datos conocidos
        this.conversationState.knownData.set('age_months', age.months);
        this.conversationState.knownData.set('birth_date', this.profile.birthDate);
      }
      
      if (this.profile.birthWeight) {
        contextualInput += `, peso al nacer: ${this.profile.birthWeight}kg`;
        this.conversationState.knownData.set('birth_weight', this.profile.birthWeight);
      }
      
      if (this.profile.birthHeight) {
        contextualInput += `, altura al nacer: ${this.profile.birthHeight}cm`;
        this.conversationState.knownData.set('birth_height', this.profile.birthHeight);
      }
      
      contextualInput += `]`;
    }

    // Agregar historial médico reciente
    if (this.recentRecords.length > 0) {
      contextualInput += `\n[HISTORIAL RECIENTE:`;
      
      // Últimos pesos
      const recentWeights = this.recentRecords
        .filter(r => r.type === 'weight')
        .slice(-3)
        .map(r => `${r.data.weight}kg (${new Date(r.timestamp).toLocaleDateString()})`);
      
      if (recentWeights.length > 0) {
        contextualInput += `\nPesos: ${recentWeights.join(', ')}`;
        this.conversationState.knownData.set('recent_weights', recentWeights);
      }

      // Últimas alturas
      const recentHeights = this.recentRecords
        .filter(r => r.type === 'height')
        .slice(-3)
        .map(r => `${r.data.height}cm (${new Date(r.timestamp).toLocaleDateString()})`);
      
      if (recentHeights.length > 0) {
        contextualInput += `\nAlturas: ${recentHeights.join(', ')}`;
        this.conversationState.knownData.set('recent_heights', recentHeights);
      }

      // Síntomas recientes
      const recentSymptoms = this.recentRecords
        .filter(r => r.type === 'symptom')
        .slice(-5);
      
      if (recentSymptoms.length > 0) {
        const symptomList = recentSymptoms.map(r => 
          `${r.data.symptoms?.map((s: any) => s.name).join(', ')} (${new Date(r.timestamp).toLocaleDateString()})`
        );
        contextualInput += `\nSíntomas: ${symptomList.join('; ')}`;
        this.conversationState.knownData.set('recent_symptoms', symptomList);
      }

      contextualInput += `]`;
    }

    // Agregar estadísticas generales
    if (this.currentStats) {
      contextualInput += `\n[ESTADÍSTICAS: ${this.currentStats.totalRecords} registros totales`;
      
      if (this.currentStats.lastRecord) {
        const daysSinceLastRecord = Math.floor(
          (Date.now() - new Date(this.currentStats.lastRecord.timestamp).getTime()) / (1000 * 60 * 60 * 24)
        );
        contextualInput += `, último registro hace ${daysSinceLastRecord} día${daysSinceLastRecord !== 1 ? 's' : ''}`;
      }
      
      contextualInput += `]`;
    }

    return contextualInput;
  }

  // Calcular edad del bebé
  private calculateAge(birthDate: string): { months: number; days: number } {
    const birth = new Date(birthDate);
    const now = new Date();
    
    const diffTime = Math.abs(now.getTime() - birth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    
    return { months, days };
  }

  // Filtrar preguntas innecesarias basadas en el contexto conocido
  filterUnnecessaryQuestions(questions: string[]): string[] {
    return questions.filter(question => {
      const questionLower = question.toLowerCase();
      
      // Si sabemos la fecha de nacimiento, no preguntar por edad
      if (this.conversationState.knownData.has('birth_date') && 
          (questionLower.includes('edad') || 
           questionLower.includes('meses') || 
           questionLower.includes('año') ||
           questionLower.includes('cuándo nació'))) {
        this.conversationState.answeredQuestions.add('age');
        return false;
      }
      
      // Si sabemos el nombre, no preguntar por nombre
      if (this.profile?.babyName && 
          (questionLower.includes('nombre') ||
           questionLower.includes('se llama'))) {
        this.conversationState.answeredQuestions.add('name');
        return false;
      }

      // Si tenemos pesos recientes, no preguntar por peso actual
      if (this.conversationState.knownData.has('recent_weights') &&
          questionLower.includes('peso') &&
          questionLower.includes('actual')) {
        return false;
      }

      // Si tenemos alturas recientes, no preguntar por altura actual
      if (this.conversationState.knownData.has('recent_heights') &&
          questionLower.includes('altura') &&
          questionLower.includes('actual')) {
        return false;
      }

      return true;
    });
  }

  // Determinar si el input requiere procesamiento de OpenAI o local
  private shouldUseOpenAI(input: string): boolean {
    const complexIndicators = [
      'síntoma', 'síntomas', 'dolor', 'fiebre', 'temperatura',
      'medicamento', 'medicina', 'vacuna', 'consulta', 'médico',
      'desarrollo', 'hito', 'milestone', '¿', '?'
    ];

    return complexIndicators.some(indicator => 
      input.toLowerCase().includes(indicator)
    );
  }

  // Procesar input con contexto awareness completo
  async processWithContext(input: string, userContext: ContextualInput = {}): Promise<any> {
    this.resetProcessingSteps();
    
    // Paso 1: Análisis inicial
    await this.simulateProcessingStep('Analizador Principal', 'Iniciando análisis contextual...', 300);
    
    // Enriquecer el input con contexto del perfil
    const enrichedInput = this.enrichInputWithProfile(input, userContext);
    
    // Paso 2: Análisis de contexto
    await this.simulateProcessingStep('Analizador de Contexto', 'Procesando información del bebé...', 400);

    // Verificar si OpenAI está disponible y si es necesario
    const useOpenAI = this.shouldUseOpenAI(input) && await openaiService.isAvailable();
    
    if (useOpenAI) {
      await this.simulateProcessingStep('OpenAI', 'Conectando con IA avanzada...', 500);
      
      try {
        const openAIResult = await this.processWithOpenAI(enrichedInput, userContext);
        if (openAIResult.success) {
          await this.simulateProcessingStep('OpenAI', 'Análisis completado con IA avanzada', 200);
          return this.mergeWithLocalProcessing(openAIResult.data, enrichedInput, userContext);
        }
      } catch (error) {
        console.warn('OpenAI processing failed, falling back to local processing:', error);
        await this.simulateProcessingStep('OpenAI', 'Error en IA externa, usando procesamiento local', 200);
      }
    }
    
    // Procesar con agentes locales
    await this.simulateProcessingStep('Agentes Locales', 'Procesando con IA local...', 600);
    const result = await this.coordinator.processInput(enrichedInput, userContext);
    
    // Paso 3: Filtrar preguntas innecesarias
    if (result.clarificationNeeded && result.questions) {
      await this.simulateProcessingStep('Filtro de Contexto', 'Eliminando preguntas redundantes...', 300);
      result.questions = this.filterUnnecessaryQuestions(result.questions);
      result.clarificationNeeded = result.questions.length > 0;
    }

    // Paso 4: Validación final
    await this.simulateProcessingStep('Validador', 'Validando resultados con contexto...', 250);
    
    // Guardar en historial de conversación
    this.conversationState.conversationHistory.push({
      timestamp: new Date(),
      topic: result.finalData?.type || 'general',
      data: result
    });

    return result;
  }

  // Procesar con OpenAI usando contexto
  private async processWithOpenAI(enrichedInput: string, userContext: ContextualInput): Promise<any> {
    try {
      const systemPrompt = `Eres un asistente médico pediátrico especializado. 
      Analiza la información proporcionada considerando el contexto completo del bebé.
      
      IMPORTANTE:
      - NO preguntes por información que ya está en el contexto
      - Sé específico y útil en tus respuestas
      - Si detectas algo preocupante, recomienda consultar al pediatra
      - Usa el contexto para dar respuestas más precisas`;

      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt
        },
        {
          role: 'user' as const,
          content: enrichedInput
        }
      ];

      const response = await openaiService.chatCompletion(messages, userContext);

      try {
        return {
          success: true,
          data: JSON.parse(response || '{}')
        };
      } catch {
        // Si no es JSON válido, tratar como respuesta de texto
        return {
          success: true,
          data: {
            extractedData: {
              type: 'consultation',
              data: { response: response },
              confidence: 0.9,
              timestamp: new Date().toISOString()
            },
            clarificationNeeded: false,
            questions: [],
            requiresAttention: false
          }
        };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Combinar resultados de OpenAI con procesamiento local
  private mergeWithLocalProcessing(openAIData: any, enrichedInput: string, userContext: ContextualInput): any {
    // Si OpenAI devolvió una respuesta estructurada, úsala
    if (openAIData.extractedData) {
      return {
        ...openAIData,
        source: 'openai',
        context: {
          profile: this.profile,
          knownData: Object.fromEntries(this.conversationState.knownData),
          processingSteps: this.processingSteps
        }
      };
    }

    // Si no, combinar con procesamiento local
    return {
      extractedData: {
        type: 'consultation',
        data: openAIData,
        confidence: 0.85,
        timestamp: new Date().toISOString()
      },
      clarificationNeeded: false,
      questions: [],
      requiresAttention: false,
      source: 'hybrid',
      context: {
        profile: this.profile,
        knownData: Object.fromEntries(this.conversationState.knownData),
        processingSteps: this.processingSteps
      }
    };
  }

  // Obtener contexto actual para debugging
  getDebugContext(): any {
    return {
      profile: this.profile,
      recentRecordsCount: this.recentRecords.length,
      conversationState: {
        answeredQuestions: Array.from(this.conversationState.answeredQuestions),
        knownData: Object.fromEntries(this.conversationState.knownData),
        conversationHistory: this.conversationState.conversationHistory.slice(-5) // Últimas 5
      },
      processingSteps: this.processingSteps
    };
  }

  // Limpiar estado de conversación
  clearConversationState(): void {
    this.conversationState = {
      answeredQuestions: new Set(),
      knownData: new Map(),
      conversationHistory: []
    };
    this.processingSteps = [];
  }
}

// Instancia singleton para usar en toda la app
export const contextAwareAICoordinator = new ContextAwareAICoordinator();

export default ContextAwareAICoordinator;