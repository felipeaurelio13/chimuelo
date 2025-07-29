// Coordinador de IA con contexto real del usuario
import openaiService from './openaiService';
import { AIProcessingCoordinatorV2 } from './aiAgents';
import { MultiAgentCoordinator } from './multiAgentSystem';
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
  private multiAgentCoordinator: MultiAgentCoordinator;
  private profile: UserProfile | null = null;
  private recentRecords: HealthRecord[] = [];
  private currentStats: HealthStats | null = null;
  private conversationState: ConversationState;
  private processingSteps: ProcessingStep[] = [];
  private onStepUpdate?: (step: ProcessingStep) => void;

  constructor() {
    this.coordinator = new AIProcessingCoordinatorV2();
    this.multiAgentCoordinator = MultiAgentCoordinator.getInstance();
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

  // Enriquecer input con contexto del perfil del usuario
  enrichInputWithProfile(input: string, userContext: ContextualInput): string {
    this.profile = userContext.profile || null;
    this.recentRecords = userContext.recentRecords || [];
    this.currentStats = userContext.currentStats || null;
    
    let contextualInput = input;
    
    // Agregar información del bebé si está disponible
    if (this.profile?.babyName) {
      contextualInput += `\n[CONTEXTO DEL BEBÉ: ${this.profile.babyName}`;
      
      if (this.profile.birthDate) {
        const age = this.calculateAge(this.profile.birthDate);
        contextualInput += `, edad: ${age.months} meses (${age.days} días)`;
      }
      
      if (this.profile.birthWeight) {
        contextualInput += `, peso al nacer: ${this.profile.birthWeight}kg`;
      }
      
      if (this.profile.birthHeight) {
        contextualInput += `, altura al nacer: ${this.profile.birthHeight}cm`;
      }
      
      contextualInput += `]`;
    }
    
    // Agregar historial reciente relevante
    if (this.recentRecords.length > 0) {
      const recentWeightRecords = this.recentRecords
        .filter(r => r.type === 'weight')
        .slice(-3)
        .map(r => `${r.data.value}kg (${new Date(r.timestamp).toLocaleDateString()})`);
      
      if (recentWeightRecords.length > 0) {
        contextualInput += `\n[PESOS RECIENTES: ${recentWeightRecords.join(', ')}]`;
      }
      
      const recentHeightRecords = this.recentRecords
        .filter(r => r.type === 'height')
        .slice(-3)
        .map(r => `${r.data.value}cm (${new Date(r.timestamp).toLocaleDateString()})`);
      
      if (recentHeightRecords.length > 0) {
        contextualInput += `\n[ALTURAS RECIENTES: ${recentHeightRecords.join(', ')}]`;
      }
      
      const recentSymptoms = this.recentRecords
        .filter(r => r.type === 'symptom')
        .slice(-2)
        .map(r => r.data.description);
      
      if (recentSymptoms.length > 0) {
        contextualInput += `\n[SÍNTOMAS RECIENTES: ${recentSymptoms.join(', ')}]`;
      }
    }
    
    // Agregar estadísticas actuales
    if (this.currentStats) {
      contextualInput += `\n[ESTADÍSTICAS: ${this.currentStats.totalRecords} registros totales, ${this.currentStats.alertsCount} alertas activas]`;
    }
    
    return contextualInput;
  }

  // Calcular edad del bebé
  private calculateAge(birthDate: string): { months: number; days: number } {
    const birth = new Date(birthDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30.44);
    
    return { months, days: diffDays };
  }

  // Filtrar preguntas innecesarias basadas en datos conocidos
  filterUnnecessaryQuestions(questions: string[]): string[] {
    return questions.filter(question => {
      const lowerQuestion = question.toLowerCase();
      
      // Si tenemos fecha de nacimiento, no preguntar por edad
      if (this.profile?.birthDate && 
          (lowerQuestion.includes('edad') || lowerQuestion.includes('meses') || lowerQuestion.includes('año'))) {
        return false;
      }
      
      // Si tenemos nombre, no preguntar por nombre
      if (this.profile?.babyName && lowerQuestion.includes('nombre')) {
        return false;
      }
      
      // Si tenemos peso reciente, no preguntar por peso
      const hasRecentWeight = this.recentRecords.some(r => 
        r.type === 'weight' && 
        (new Date().getTime() - new Date(r.timestamp).getTime()) < 7 * 24 * 60 * 60 * 1000
      );
      if (hasRecentWeight && lowerQuestion.includes('peso')) {
        return false;
      }
      
      // Si tenemos altura reciente, no preguntar por altura
      const hasRecentHeight = this.recentRecords.some(r => 
        r.type === 'height' && 
        (new Date().getTime() - new Date(r.timestamp).getTime()) < 30 * 24 * 60 * 60 * 1000
      );
      if (hasRecentHeight && lowerQuestion.includes('altura')) {
        return false;
      }
      
      return true;
    });
  }

  // Determinar si usar OpenAI basado en el input
  private shouldUseOpenAI(input: string): boolean {
    // Siempre usar OpenAI para extracción de datos de salud
    return true;
  }

  // Procesar input con contexto real
  async processWithContext(input: string, userContext: ContextualInput = {}): Promise<any> {
    this.resetProcessingSteps();
    
    try {
      // Paso 1: Análisis inicial
      await this.simulateProcessingStep('Analizador Principal', 'Iniciando análisis del texto...', 300);
      
      // Enriquecer input con contexto
      const enrichedInput = this.enrichInputWithProfile(input, userContext);
      
      // Paso 2: Clasificación de contenido
      await this.simulateProcessingStep('Clasificador', 'Identificando tipo de datos...', 200);
      
      // Determinar si usar OpenAI o procesamiento local
      const shouldUseOpenAI = this.shouldUseOpenAI(input);
      
      if (shouldUseOpenAI) {
        // Paso 3: Procesamiento con OpenAI
        await this.simulateProcessingStep('IA Avanzada', 'Procesando con inteligencia artificial...', 800);
        return await this.processWithOpenAI(enrichedInput, userContext);
      } else {
        // Paso 4: Procesamiento local con multi-agentes
        await this.simulateProcessingStep('Sistema Multi-Agente', 'Procesando con agentes especializados...', 600);
        return await this.processWithMultiAgents(enrichedInput, userContext);
      }
    } catch (error) {
      console.error('Error en processWithContext:', error);
      
      // Paso 5: Fallback en caso de error
      await this.simulateProcessingStep('Sistema de Respaldo', 'Aplicando análisis básico...', 200);
      
      return {
        type: 'note',
        data: {
          value: input,
          unit: 'text',
          date: new Date().toISOString(),
          context: 'Análisis básico por error'
        },
        confidence: 0.3,
        requiresAttention: false,
        notes: 'Error en procesamiento. Se aplicó análisis básico.',
        validation: {
          isValid: true,
          warnings: ['Procesamiento limitado debido a error'],
          errors: [error instanceof Error ? error.message : 'Error desconocido']
        }
      };
    }
  }

  // Procesar con OpenAI
  private async processWithOpenAI(enrichedInput: string, userContext: ContextualInput): Promise<any> {
    try {
      const result = await openaiService.extractHealthData(enrichedInput, 'text');
      
      // Mezclar con procesamiento local para validación
      return this.mergeWithLocalProcessing(result, enrichedInput, userContext);
    } catch (error) {
      console.error('Error en OpenAI processing:', error);
      throw error;
    }
  }

  // Procesar con sistema multi-agente
  private async processWithMultiAgents(enrichedInput: string, userContext: ContextualInput): Promise<any> {
    try {
      const agentInput = {
        id: `input_${Date.now()}`,
        type: 'text' as const,
        content: enrichedInput,
        timestamp: new Date(),
        userId: 'current_user',
        context: userContext
      };

      const result = await this.multiAgentCoordinator.processInput(agentInput);
      
      return {
        type: result.classification,
        data: {
          value: result.extractedData,
          unit: this.determineUnit(result.classification),
          date: new Date().toISOString(),
          context: enrichedInput
        },
        confidence: result.confidence,
        requiresAttention: result.extractedData.requiresAttention || false,
        notes: result.recommendations.join('; '),
        validation: {
          isValid: result.confidence > 0.5,
          warnings: result.confidence < 0.8 ? ['Confianza baja en extracción'] : [],
          errors: []
        }
      };
    } catch (error) {
      console.error('Error en multi-agent processing:', error);
      throw error;
    }
  }

  // Determinar unidad de medida basada en tipo
  private determineUnit(type: string): string {
    const unitMap: Record<string, string> = {
      weight: 'kg',
      height: 'cm',
      temperature: '°C',
      medication: 'dosis',
      vaccine: 'dosis',
      milestone: 'texto',
      symptom: 'texto',
      note: 'texto'
    };
    
    return unitMap[type] || 'texto';
  }

  // Mezclar procesamiento de OpenAI con validación local
  private mergeWithLocalProcessing(openAIData: any, enrichedInput: string, userContext: ContextualInput): any {
    // Validar datos extraídos por OpenAI
    const validation = this.validateExtractedData(openAIData);
    
    return {
      ...openAIData,
      validation,
      context: enrichedInput,
      source: 'openai_with_local_validation'
    };
  }

  // Validar datos extraídos
  private validateExtractedData(data: any): { isValid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Validar tipo
    if (!data.type || !['weight', 'height', 'temperature', 'symptom', 'medication', 'vaccine', 'milestone', 'note'].includes(data.type)) {
      errors.push('Tipo de dato inválido');
    }
    
    // Validar valor
    if (!data.data?.value) {
      errors.push('Valor no encontrado');
    }
    
    // Validar rangos según tipo
    if (data.type === 'weight' && data.data?.value) {
      const weight = parseFloat(data.data.value);
      if (weight < 0.5 || weight > 50) {
        warnings.push('Peso fuera del rango normal para bebés');
      }
    }
    
    if (data.type === 'height' && data.data?.value) {
      const height = parseFloat(data.data.value);
      if (height < 30 || height > 150) {
        warnings.push('Altura fuera del rango normal para bebés');
      }
    }
    
    if (data.type === 'temperature' && data.data?.value) {
      const temp = parseFloat(data.data.value);
      if (temp < 35 || temp > 42) {
        warnings.push('Temperatura fuera del rango normal');
      }
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  // Obtener contexto de debug
  getDebugContext(): any {
    return {
      profile: this.profile,
      recentRecords: this.recentRecords.length,
      currentStats: this.currentStats,
      processingSteps: this.processingSteps,
      conversationState: {
        answeredQuestions: Array.from(this.conversationState.answeredQuestions),
        knownData: Object.fromEntries(this.conversationState.knownData),
        conversationHistory: this.conversationState.conversationHistory.length
      }
    };
  }

  // Limpiar estado de conversación
  clearConversationState(): void {
    this.conversationState = {
      answeredQuestions: new Set(),
      knownData: new Map(),
      conversationHistory: []
    };
  }
}

// Singleton instance
export const contextAwareAICoordinator = new ContextAwareAICoordinator();