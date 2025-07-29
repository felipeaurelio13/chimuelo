// Coordinador Mejorado para Multi-Agentes
// Basado en mejores prácticas de OpenAI para sistemas multi-agente

import { AgentPromptManager } from './agentPrompts';
import MedicalValidator, { ValidationResult } from './medicalValidation';
import ErrorHandler, { type ErrorInfo } from './errorHandler';
import openaiService from './openaiService';

export interface AgentTask {
  id: string;
  type: 'classification' | 'analysis' | 'validation' | 'recommendation';
  input: any;
  context?: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
  timeout?: number;
}

export interface AgentResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: ErrorInfo;
  confidence: number;
  processingTime: number;
  agentUsed: string;
}

export interface AgentPipeline {
  id: string;
  name: string;
  description: string;
  steps: AgentTask[];
  fallbackStrategy: 'retry' | 'simplify' | 'human' | 'skip';
  maxRetries: number;
  timeout: number;
}

export class EnhancedMultiAgentCoordinator {
  private static instance: EnhancedMultiAgentCoordinator;
  private promptManager: AgentPromptManager;
  private medicalValidator: MedicalValidator;
  private errorHandler: ErrorHandler;
  private processingQueue: AgentTask[] = [];
  private activeTasks: Map<string, Promise<AgentResult>> = new Map();
  private results: Map<string, AgentResult> = new Map();
  private pipelines: Map<string, AgentPipeline> = new Map();

  private constructor() {
    this.promptManager = AgentPromptManager.getInstance();
    this.medicalValidator = MedicalValidator.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.initializePipelines();
  }

  public static getInstance(): EnhancedMultiAgentCoordinator {
    if (!EnhancedMultiAgentCoordinator.instance) {
      EnhancedMultiAgentCoordinator.instance = new EnhancedMultiAgentCoordinator();
    }
    return EnhancedMultiAgentCoordinator.instance;
  }

  // Inicializar pipelines predefinidos
  private initializePipelines(): void {
    // Pipeline para análisis de datos médicos
    const medicalAnalysisPipeline: AgentPipeline = {
      id: 'medical_analysis',
      name: 'Medical Data Analysis Pipeline',
      description: 'Análisis completo de datos médicos pediátricos',
      steps: [
        {
          id: 'classify_input',
          type: 'classification',
          input: null,
          priority: 'high',
          timeout: 5000
        },
        {
          id: 'extract_medical_data',
          type: 'analysis',
          input: null,
          priority: 'high',
          dependencies: ['classify_input'],
          timeout: 10000
        },
        {
          id: 'validate_data',
          type: 'validation',
          input: null,
          priority: 'critical',
          dependencies: ['extract_medical_data'],
          timeout: 3000
        },
        {
          id: 'generate_recommendations',
          type: 'recommendation',
          input: null,
          priority: 'medium',
          dependencies: ['validate_data'],
          timeout: 5000
        }
      ],
      fallbackStrategy: 'simplify',
      maxRetries: 3,
      timeout: 30000
    };

    this.pipelines.set('medical_analysis', medicalAnalysisPipeline);
  }

  // Procesar input con pipeline específico
  async processWithPipeline(pipelineId: string, input: any, context?: any): Promise<any> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} no encontrado`);
    }

    console.log(`🔧 [DEBUG] Iniciando pipeline: ${pipeline.name}`);
    
    try {
      // Ejecutar pipeline paso a paso
      const results = await this.executePipeline(pipeline, input, context);
      
      // Consolidar resultados
      const consolidatedResult = this.consolidateResults(results);
      
      console.log(`🔧 [DEBUG] Pipeline completado: ${pipeline.name}`);
      return consolidatedResult;
      
    } catch (error) {
      console.error(`🔧 [DEBUG] Error en pipeline ${pipelineId}:`, error);
      
      // Aplicar estrategia de fallback
      return await this.applyFallbackStrategy(pipeline, input, context, error);
    }
  }

  // Ejecutar pipeline paso a paso
  private async executePipeline(pipeline: AgentPipeline, input: any, context?: any): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    
    for (const step of pipeline.steps) {
      try {
        // Verificar dependencias
        if (step.dependencies) {
          const dependenciesMet = step.dependencies.every(depId => 
            results.some(r => r.taskId === depId && r.success)
          );
          
          if (!dependenciesMet) {
            throw new Error(`Dependencias no cumplidas para ${step.id}`);
          }
        }

        // Preparar input para el paso
        const stepInput = this.prepareStepInput(step, input, results);
        
        // Ejecutar paso
        const result = await this.executeTask(step, stepInput, context);
        results.push(result);
        
        // Si el paso falló, aplicar retry si es posible
        if (!result.success && pipeline.maxRetries > 0) {
          const retryResult = await this.retryTask(step, stepInput, context, pipeline.maxRetries);
          results[results.length - 1] = retryResult;
        }
        
      } catch (error) {
        console.error(`🔧 [DEBUG] Error en paso ${step.id}:`, error);
        
        const errorResult: AgentResult = {
          taskId: step.id,
          success: false,
          error: ErrorHandler.createAIError(error, { step, input }),
          confidence: 0,
          processingTime: 0,
          agentUsed: 'error'
        };
        
        results.push(errorResult);
      }
    }
    
    return results;
  }

  // Preparar input para un paso específico
  private prepareStepInput(step: AgentTask, originalInput: any, previousResults: AgentResult[]): any {
    switch (step.type) {
      case 'classification':
        return originalInput;
        
      case 'analysis':
        const classificationResult = previousResults.find(r => r.taskId === 'classify_input');
        return {
          input: originalInput,
          classification: classificationResult?.data
        };
        
      case 'validation':
        const analysisResult = previousResults.find(r => r.taskId === 'extract_medical_data');
        return {
          data: analysisResult?.data,
          originalInput
        };
        
      case 'recommendation':
        const validationResult = previousResults.find(r => r.taskId === 'validate_data');
        return {
          validation: validationResult?.data,
          originalInput
        };
        
      default:
        return originalInput;
    }
  }

  // Ejecutar tarea específica
  private async executeTask(task: AgentTask, input: any, context?: any): Promise<AgentResult> {
    const startTime = Date.now();
    
    try {
      let result: any;
      let agentUsed = 'unknown';
      
      switch (task.type) {
        case 'classification':
          result = await this.executeClassification(input, context);
          agentUsed = 'classifier';
          break;
          
        case 'analysis':
          result = await this.executeAnalysis(input, context);
          agentUsed = 'medical_analyzer';
          break;
          
        case 'validation':
          result = await this.executeValidation(input, context);
          agentUsed = 'medical_validator';
          break;
          
        case 'recommendation':
          result = await this.executeRecommendation(input, context);
          agentUsed = 'recommendation_engine';
          break;
          
        default:
          throw new Error(`Tipo de tarea no soportado: ${task.type}`);
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        taskId: task.id,
        success: true,
        data: result,
        confidence: result.confidence || 0.8,
        processingTime,
        agentUsed
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorInfo = ErrorHandler.createAIError(error, { task, input });
      
      return {
        taskId: task.id,
        success: false,
        error: errorInfo,
        confidence: 0,
        processingTime,
        agentUsed: 'error'
      };
    }
  }

  // Ejecutar clasificación
  private async executeClassification(input: any, context?: any): Promise<any> {
    const prompt = this.promptManager.generateClassifierPrompt(input, context);
    
    const response = await openaiService.chatCompletion([
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ], context);
    
    try {
      return JSON.parse(response);
    } catch (error) {
      throw new Error('Respuesta de clasificación no es JSON válido');
    }
  }

  // Ejecutar análisis médico
  private async executeAnalysis(input: any, context?: any): Promise<any> {
    const prompt = this.promptManager.generateMedicalPrompt(
      input.input, 
      input.classification, 
      context
    );
    
    const response = await openaiService.chatCompletion([
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ], context);
    
    try {
      return JSON.parse(response);
    } catch (error) {
      throw new Error('Respuesta de análisis no es JSON válido');
    }
  }

  // Ejecutar validación
  private async executeValidation(input: any, context?: any): Promise<any> {
    // Usar validación médica local
    const validationResult = this.medicalValidator.validateMedicalData(
      input.data, 
      context?.patientAge
    );
    
    return {
      ...validationResult,
      originalData: input.data
    };
  }

  // Ejecutar recomendaciones
  private async executeRecommendation(input: any, context?: any): Promise<any> {
    const prompt = this.promptManager.generateSymptomAnalysisPrompt(
      input.validation?.warnings || [], 
      context
    );
    
    const response = await openaiService.chatCompletion([
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ], context);
    
    try {
      return JSON.parse(response);
    } catch (error) {
      throw new Error('Respuesta de recomendaciones no es JSON válido');
    }
  }

  // Reintentar tarea
  private async retryTask(task: AgentTask, input: any, context?: any, maxRetries: number = 3): Promise<AgentResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔧 [DEBUG] Reintento ${attempt}/${maxRetries} para ${task.id}`);
        
        // Esperar antes del reintento
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        
        const result = await this.executeTask(task, input, context);
        
        if (result.success) {
          console.log(`🔧 [DEBUG] Reintento exitoso para ${task.id}`);
          return result;
        }
        
      } catch (error) {
        console.error(`🔧 [DEBUG] Reintento ${attempt} falló para ${task.id}:`, error);
      }
    }
    
    // Si todos los reintentos fallaron, devolver error
    return {
      taskId: task.id,
      success: false,
      error: ErrorHandler.createAIError(
        new Error(`Máximo de reintentos alcanzado para ${task.id}`),
        { task, input }
      ),
      confidence: 0,
      processingTime: 0,
      agentUsed: 'retry_failed'
    };
  }

  // Consolidar resultados del pipeline
  private consolidateResults(results: AgentResult[]): any {
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    
    // Calcular confianza general
    const overallConfidence = successfulResults.length > 0 
      ? successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length
      : 0;
    
    // Consolidar datos
    const consolidatedData = {
      classification: this.findResultData(results, 'classify_input'),
      analysis: this.findResultData(results, 'extract_medical_data'),
      validation: this.findResultData(results, 'validate_data'),
      recommendations: this.findResultData(results, 'generate_recommendations')
    };
    
    return {
      success: failedResults.length === 0,
      confidence: overallConfidence,
      data: consolidatedData,
      errors: failedResults.map(r => r.error),
      processingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
      stepsCompleted: successfulResults.length,
      totalSteps: results.length
    };
  }

  // Encontrar datos de resultado por taskId
  private findResultData(results: AgentResult[], taskId: string): any {
    const result = results.find(r => r.taskId === taskId);
    return result?.data || null;
  }

  // Aplicar estrategia de fallback
  private async applyFallbackStrategy(
    pipeline: AgentPipeline, 
    input: any, 
    context?: any, 
    error?: any
  ): Promise<any> {
    console.log(`🔧 [DEBUG] Aplicando estrategia de fallback: ${pipeline.fallbackStrategy}`);
    
    switch (pipeline.fallbackStrategy) {
      case 'simplify':
        return await this.simplifiedAnalysis(input, context);
        
      case 'retry':
        return await this.processWithPipeline(pipeline.id, input, context);
        
      case 'human':
        return this.humanFallback(input, error);
        
      case 'skip':
        return this.skipFallback(input);
        
      default:
        return this.defaultFallback(input, error);
    }
  }

  // Análisis simplificado
  private async simplifiedAnalysis(input: any, context?: any): Promise<any> {
    console.log('🔧 [DEBUG] Ejecutando análisis simplificado');
    
    try {
      // Clasificación básica
      const classification = await this.executeClassification(input, context);
      
      // Validación básica
      const validation = this.medicalValidator.validateMedicalData(input, context?.patientAge);
      
      return {
        success: true,
        confidence: 0.5,
        data: {
          classification,
          validation,
          simplified: true
        },
        processingTime: 0,
        stepsCompleted: 2,
        totalSteps: 2
      };
      
    } catch (error) {
      return this.defaultFallback(input, error);
    }
  }

  // Fallback para intervención humana
  private humanFallback(input: any, error?: any): any {
    return {
      success: false,
      confidence: 0,
      data: {
        message: 'Se requiere intervención humana para procesar este input',
        originalInput: input,
        error: error?.message || 'Error desconocido'
      },
      requiresHumanReview: true
    };
  }

  // Fallback de omisión
  private skipFallback(input: any): any {
    return {
      success: false,
      confidence: 0,
      data: {
        message: 'Procesamiento omitido por configuración',
        originalInput: input
      },
      skipped: true
    };
  }

  // Fallback por defecto
  private defaultFallback(input: any, error?: any): any {
    return {
      success: false,
      confidence: 0,
      data: {
        message: 'Error en procesamiento',
        originalInput: input,
        error: error?.message || 'Error desconocido'
      }
    };
  }

  // Método principal para procesar input
  async processInput(input: any, context?: any): Promise<any> {
    return await this.processWithPipeline('medical_analysis', input, context);
  }
}

export default EnhancedMultiAgentCoordinator;