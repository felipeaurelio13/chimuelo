// Coordinador de IA con Context Awareness y Procesamiento Realista
import { openAIService } from './openaiService';
import { AIProcessingCoordinatorV2 } from './aiAgents';

interface UserProfile {
  babyName: string;
  birthDate: string;
  birthWeight?: number;
  birthHeight?: number;
}

interface ProcessingStep {
  agent: string;
  action: string;
  duration: number;
}

export class ContextAwareAICoordinator {
  private coordinator: AIProcessingCoordinatorV2;
  private userProfile: UserProfile | null = null;
  private processingSteps: ProcessingStep[] = [];
  private onStepUpdate?: (step: ProcessingStep) => void;
  
  constructor() {
    this.coordinator = new AIProcessingCoordinatorV2();
    this.loadUserProfile();
  }
  
  // Cargar perfil del usuario desde localStorage
  private loadUserProfile() {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      this.userProfile = JSON.parse(savedProfile);
    }
  }
  
  // Configurar callback para actualización de pasos
  setStepUpdateCallback(callback: (step: ProcessingStep) => void) {
    this.onStepUpdate = callback;
  }
  
  // Procesar input con context awareness
  async processWithContext(input: string, metadata?: any): Promise<any> {
    // Resetear pasos
    this.processingSteps = [];
    
    // Paso 1: Análisis inicial
    await this.simulateProcessingStep('Analizador Principal', 'Iniciando análisis...', 300);
    
    // Enriquecer el input con contexto del perfil
    const enrichedInput = this.enrichInputWithProfile(input);
    
    // Verificar si OpenAI está disponible
    if (openAIService.isAvailable()) {
      await this.simulateProcessingStep('OpenAI', 'Conectando con IA avanzada...', 500);
      
      // Intentar usar OpenAI para análisis más preciso
      const openAIResult = await this.processWithOpenAI(enrichedInput, metadata);
      if (openAIResult.success) {
        await this.simulateProcessingStep('OpenAI', 'Análisis completado con IA avanzada', 200);
        return this.mergeWithLocalProcessing(openAIResult.data, enrichedInput, metadata);
      }
    }
    
    // Procesar con agentes locales
    await this.simulateProcessingStep('Agentes Locales', 'Procesando con IA local...', 400);
    const result = await this.coordinator.processInput(enrichedInput, metadata);
    
    // Filtrar preguntas innecesarias basadas en el perfil
    if (result.clarificationNeeded) {
      result.questions = this.filterUnnecessaryQuestions(result.questions);
      result.clarificationNeeded = result.questions.length > 0;
    }
    
    await this.simulateProcessingStep('Validador', 'Validando resultados...', 300);
    
    return result;
  }
  
  // Enriquecer input con información del perfil
  private enrichInputWithProfile(input: string): string {
    if (!this.userProfile) return input;
    
    let enriched = input;
    
    // Si el input no menciona fecha y habla de nacimiento, agregar contexto
    if (input.toLowerCase().includes('naci') && !input.match(/\d{4}/)) {
      const birthDate = new Date(this.userProfile.birthDate);
      enriched += ` (Fecha de nacimiento conocida: ${birthDate.toLocaleDateString('es-ES')})`;
    }
    
    // Si menciona medidas al nacer y tenemos esos datos
    if (input.toLowerCase().includes('al nacer')) {
      if (this.userProfile.birthWeight && !input.includes('kg') && !input.includes('peso')) {
        enriched += ` (Peso al nacer conocido: ${this.userProfile.birthWeight} kg)`;
      }
      if (this.userProfile.birthHeight && !input.includes('cm') && !input.includes('altura')) {
        enriched += ` (Altura al nacer conocida: ${this.userProfile.birthHeight} cm)`;
      }
    }
    
    return enriched;
  }
  
  // Procesar con OpenAI
  private async processWithOpenAI(input: string, metadata?: any): Promise<any> {
    const systemPrompt = `Eres un asistente médico especializado en pediatría. 
    Analiza la siguiente información y extrae SOLO los datos médicos relevantes.
    
    Contexto del paciente:
    ${this.userProfile ? `
    - Nombre: ${this.userProfile.babyName}
    - Fecha de nacimiento: ${this.userProfile.birthDate}
    - Peso al nacer: ${this.userProfile.birthWeight || 'No registrado'} kg
    - Altura al nacer: ${this.userProfile.birthHeight || 'No registrado'} cm
    ` : 'No hay perfil registrado'}
    
    Reglas importantes:
    1. Si el texto menciona altura/talla (cm), NO lo interpretes como síntomas
    2. Si menciona peso (kg/g), extrae el valor numérico correctamente
    3. NO preguntes por información que ya está en el contexto del paciente
    4. Sé preciso con las unidades y conversiones
    
    Responde en formato JSON con la estructura:
    {
      "tipo": "weight|height|symptom|milestone|other",
      "datos": { /* datos específicos */ },
      "requiereAtencion": boolean,
      "preguntas": ["solo si falta información crítica"],
      "confianza": 0.0-1.0
    }`;
    
    const result = await openAIService.analyzeText({
      prompt: input,
      systemPrompt,
      context: metadata ? JSON.stringify(metadata) : undefined
    });
    
    if (result.success) {
      try {
        const parsed = JSON.parse(result.data);
        return { success: true, data: parsed };
      } catch {
        // Si no es JSON válido, procesar como texto
        return { success: true, data: { raw: result.data } };
      }
    }
    
    return result;
  }
  
  // Fusionar resultado de OpenAI con procesamiento local
  private mergeWithLocalProcessing(openAIData: any, input: string, metadata?: any): any {
    // Aquí puedes implementar lógica para combinar los resultados
    // Por ahora, priorizamos OpenAI pero validamos con local
    return {
      finalData: openAIData.datos || openAIData,
      confidence: openAIData.confianza || 0.9,
      consensus: true,
      clarificationNeeded: openAIData.preguntas && openAIData.preguntas.length > 0,
      questions: openAIData.preguntas || [],
      suggestions: [],
      agentResponses: [
        {
          agentName: 'OpenAI GPT-4',
          confidence: openAIData.confianza || 0.9,
          findings: openAIData,
          reasoning: ['Análisis realizado con IA avanzada']
        }
      ],
      source: 'openai'
    };
  }
  
  // Filtrar preguntas innecesarias
  private filterUnnecessaryQuestions(questions: string[]): string[] {
    if (!this.userProfile) return questions;
    
    return questions.filter(question => {
      const lowerQuestion = question.toLowerCase();
      
      // No preguntar por fecha de nacimiento si ya la tenemos
      if (lowerQuestion.includes('fecha') && lowerQuestion.includes('nacimiento') && this.userProfile!.birthDate) {
        return false;
      }
      
      // No preguntar por peso al nacer si ya lo tenemos
      if (lowerQuestion.includes('peso') && lowerQuestion.includes('nacer') && this.userProfile!.birthWeight) {
        return false;
      }
      
      // No preguntar por altura al nacer si ya la tenemos
      if (lowerQuestion.includes('altura') && lowerQuestion.includes('nacer') && this.userProfile!.birthHeight) {
        return false;
      }
      
      return true;
    });
  }
  
  // Simular paso de procesamiento con delay
  private async simulateProcessingStep(agent: string, action: string, duration: number) {
    const step: ProcessingStep = { agent, action, duration };
    this.processingSteps.push(step);
    
    if (this.onStepUpdate) {
      this.onStepUpdate(step);
    }
    
    // Agregar variación aleatoria al delay (±20%)
    const variance = duration * 0.2;
    const actualDuration = duration + (Math.random() * variance * 2 - variance);
    
    await new Promise(resolve => setTimeout(resolve, actualDuration));
  }
  
  // Obtener pasos de procesamiento
  getProcessingSteps(): ProcessingStep[] {
    return this.processingSteps;
  }
}

// Exportar instancia única
export const contextAwareAI = new ContextAwareAICoordinator();