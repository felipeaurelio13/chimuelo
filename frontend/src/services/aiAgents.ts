// Sistema de Agentes de IA Especializados para Procesamiento Inteligente

export interface AgentResponse {
  agentName: string;
  confidence: number;
  findings: any;
  questions?: string[];
  suggestions?: string[];
  requiresConfirmation?: boolean;
}

export interface ProcessingResult {
  finalData: any;
  confidence: number;
  consensus: boolean;
  clarificationNeeded: boolean;
  questions: string[];
  suggestions: string[];
  agentResponses: AgentResponse[];
}

// Agente 1: Extractor de Datos Médicos
class MedicalDataExtractor {
  name = 'Extractor Médico';
  
  async analyze(input: string): Promise<AgentResponse> {
    const findings: any = {};
    const questions: string[] = [];
    let confidence = 0;
    
    // Análisis profundo de peso
    const pesoPatterns = [
      /(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?|kilogramos?)/i,
      /pes[aó]\s+(\d+(?:[.,]\d+)?)/i,
      /(\d+(?:[.,]\d+)?)\s*(?:gramos?|gr?)\s*(?:de\s*peso)?/i
    ];
    
    for (const pattern of pesoPatterns) {
      const match = input.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        
        // Convertir gramos a kg si es necesario
        if (pattern.toString().includes('gramos')) {
          findings.weight = { value: value / 1000, unit: 'kg', originalUnit: 'g' };
        } else {
          findings.weight = { value, unit: 'kg' };
        }
        
        // Validar rango razonable para bebés/niños
        if (value < 0.5 || value > 50) {
          questions.push(`¿El peso ${value} kg es correcto? Parece fuera del rango normal.`);
          confidence -= 0.2;
        } else {
          confidence += 0.3;
        }
        break;
      }
    }
    
    // Análisis profundo de temperatura
    const tempPatterns = [
      /(\d+(?:[.,]\d+)?)\s*(?:°c|grados?|celsius)/i,
      /fiebre\s*(?:de\s*)?(\d+(?:[.,]\d+)?)/i,
      /temperatura\s*(?:de\s*)?(\d+(?:[.,]\d+)?)/i,
      /(\d+(?:[.,]\d+)?)\s*de\s*(?:fiebre|temperatura)/i
    ];
    
    for (const pattern of tempPatterns) {
      const match = input.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        findings.temperature = { value, unit: '°C' };
        
        // Analizar severidad
        if (value >= 39) {
          findings.temperature.severity = 'alta';
          findings.temperature.requiresAttention = true;
        } else if (value >= 38) {
          findings.temperature.severity = 'moderada';
          findings.temperature.requiresAttention = true;
        } else if (value >= 37.5) {
          findings.temperature.severity = 'leve';
        }
        
        confidence += 0.3;
        break;
      }
    }
    
    // Detectar menciones de fiebre sin temperatura específica
    if (!findings.temperature && /fiebre|calentura|caliente/i.test(input)) {
      questions.push('Mencionas fiebre pero no especificas la temperatura. ¿Cuántos grados tiene?');
      findings.possibleFever = true;
    }
    
    // Análisis de altura/talla
    const alturaPatterns = [
      /(\d+(?:[.,]\d+)?)\s*(?:cm|centímetros?)/i,
      /(?:mide|altura|talla)\s*(?:de\s*)?(\d+(?:[.,]\d+)?)/i
    ];
    
    for (const pattern of alturaPatterns) {
      const match = input.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        findings.height = { value, unit: 'cm' };
        confidence += 0.2;
        break;
      }
    }
    
    // Análisis de síntomas
    const symptoms = {
      respiratorios: ['tos', 'mocos', 'congestión', 'estornudos', 'flemas'],
      digestivos: ['vómito', 'diarrea', 'estreñimiento', 'dolor de panza', 'náuseas'],
      piel: ['sarpullido', 'eruption', 'ronchas', 'manchas', 'granitos'],
      generales: ['dolor', 'llanto', 'irritable', 'decaído', 'cansado', 'somnoliento']
    };
    
    findings.symptoms = [];
    for (const [category, symptomList] of Object.entries(symptoms)) {
      for (const symptom of symptomList) {
        if (input.toLowerCase().includes(symptom)) {
          findings.symptoms.push({ name: symptom, category });
          confidence += 0.1;
        }
      }
    }
    
    // Calcular confianza final
    confidence = Math.min(confidence, 1);
    
    return {
      agentName: this.name,
      confidence,
      findings,
      questions,
      requiresConfirmation: questions.length > 0
    };
  }
}

// Agente 2: Analizador Temporal
class TemporalAnalyzer {
  name = 'Analizador Temporal';
  
  async analyze(input: string): Promise<AgentResponse> {
    const findings: any = {};
    const questions: string[] = [];
    let confidence = 0;
    
    const now = new Date();
    let detectedDate = new Date();
    let dateSpecified = false;
    
    // Patrones temporales relativos
    const relativePatterns = [
      { pattern: /hoy/i, days: 0 },
      { pattern: /ayer/i, days: -1 },
      { pattern: /anteayer|antes de ayer/i, days: -2 },
      { pattern: /hace (\d+) días?/i, dynamic: true },
      { pattern: /hace una semana/i, days: -7 },
      { pattern: /la semana pasada/i, days: -7 },
      { pattern: /hace (\d+) semanas?/i, dynamic: true, multiplier: 7 },
      { pattern: /hace un mes/i, months: -1 },
      { pattern: /el mes pasado/i, months: -1 },
      { pattern: /esta mañana/i, hours: -6 },
      { pattern: /esta tarde/i, hours: -2 },
      { pattern: /anoche/i, days: -1 }
    ];
    
    for (const temporal of relativePatterns) {
      const match = input.match(temporal.pattern);
      if (match) {
        dateSpecified = true;
        if (temporal.dynamic && match[1]) {
          const num = parseInt(match[1]);
          const multiplier = temporal.multiplier || 1;
          detectedDate.setDate(detectedDate.getDate() - (num * multiplier));
        } else if (temporal.days !== undefined) {
          detectedDate.setDate(detectedDate.getDate() + temporal.days);
        } else if (temporal.months !== undefined) {
          detectedDate.setMonth(detectedDate.getMonth() + temporal.months);
        } else if (temporal.hours !== undefined) {
          detectedDate.setHours(detectedDate.getHours() + temporal.hours);
        }
        confidence += 0.4;
        break;
      }
    }
    
    // Buscar fechas explícitas
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
      /(\d{1,2})\s+de\s+(\w+)\s+(?:de\s+)?(\d{2,4})?/i
    ];
    
    for (const pattern of datePatterns) {
      const match = input.match(pattern);
      if (match) {
        dateSpecified = true;
        if (pattern === datePatterns[0]) {
          // Formato dd/mm/yyyy
          const day = parseInt(match[1]);
          const month = parseInt(match[2]) - 1;
          const year = parseInt(match[3]);
          const fullYear = year < 100 ? 2000 + year : year;
          detectedDate = new Date(fullYear, month, day);
        } else {
          // Formato "15 de marzo de 2024"
          const day = parseInt(match[1]);
          const monthName = match[2].toLowerCase();
          const year = match[3] ? parseInt(match[3]) : now.getFullYear();
          
          const months: {[key: string]: number} = {
            'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
            'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
            'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
          };
          
          if (months[monthName] !== undefined) {
            detectedDate = new Date(year, months[monthName], day);
          }
        }
        confidence += 0.5;
        break;
      }
    }
    
    // Análisis de momento del día
    const timeOfDay = {
      morning: /mañana|madrugada|amanecer|desayuno/i,
      afternoon: /tarde|almuerzo|siesta/i,
      evening: /noche|cena|anochecer/i,
      night: /madrugada|medianoche/i
    };
    
    for (const [period, pattern] of Object.entries(timeOfDay)) {
      if (pattern.test(input)) {
        findings.timeOfDay = period;
        confidence += 0.1;
      }
    }
    
    // Validación de fecha futura
    if (detectedDate > now) {
      questions.push('La fecha detectada parece ser futura. ¿Es correcta?');
      confidence -= 0.3;
    }
    
    findings.date = detectedDate.toISOString();
    findings.dateSpecified = dateSpecified;
    
    if (!dateSpecified) {
      questions.push('No se especificó una fecha. ¿Los datos son de hoy?');
    }
    
    return {
      agentName: this.name,
      confidence,
      findings,
      questions
    };
  }
}

// Agente 3: Validador de Contexto
class ContextValidator {
  name = 'Validador de Contexto';
  
  async analyze(input: string, previousFindings: any[]): Promise<AgentResponse> {
    const findings: any = {};
    const questions: string[] = [];
    const suggestions: string[] = [];
    let confidence = 0;
    
    // Combinar hallazgos previos
    const combinedFindings = previousFindings.reduce((acc, curr) => ({...acc, ...curr}), {});
    
    // Validar coherencia de datos
    if (combinedFindings.weight) {
      const weight = combinedFindings.weight.value;
      
      // Sugerir contexto adicional para peso
      if (!input.includes('ropa') && !input.includes('pañal')) {
        suggestions.push('¿El peso fue tomado con ropa o sin ropa?');
      }
      
      // Validar cambios bruscos (necesitaría historial)
      // TODO: Comparar con registros anteriores
    }
    
    if (combinedFindings.temperature) {
      const temp = combinedFindings.temperature.value;
      
      // Contexto importante para fiebre
      if (temp >= 38) {
        if (!input.match(/axilar|oral|rectal|oído/i)) {
          questions.push('¿Cómo se tomó la temperatura? (axilar, oral, rectal)');
        }
        
        // Buscar síntomas asociados
        if (!combinedFindings.symptoms || combinedFindings.symptoms.length === 0) {
          questions.push('¿Presenta otros síntomas además de la fiebre?');
        }
        
        // Sugerir acciones
        suggestions.push('Importante: Mantener hidratado y consultar al pediatra si persiste');
      }
    }
    
    // Análisis de medicación mencionada
    const medications = [
      'paracetamol', 'ibuprofeno', 'amoxicilina', 'antibiótico',
      'jarabe', 'gotas', 'supositorio'
    ];
    
    findings.medications = [];
    for (const med of medications) {
      if (input.toLowerCase().includes(med)) {
        findings.medications.push(med);
        questions.push(`¿Cuál es la dosis de ${med}? ¿Cada cuántas horas?`);
      }
    }
    
    // Detectar alimentación
    const feedingPatterns = [
      'lactancia', 'pecho', 'fórmula', 'biberón', 'papilla',
      'comió', 'almorzó', 'desayunó', 'cenó'
    ];
    
    for (const pattern of feedingPatterns) {
      if (input.toLowerCase().includes(pattern)) {
        findings.feedingMentioned = true;
        if (!input.match(/\d+\s*(ml|oz|onzas)/i)) {
          suggestions.push('Considera registrar la cantidad si es biberón/fórmula');
        }
      }
    }
    
    // Calcular confianza basada en completitud
    confidence = 0.5; // Base
    if (questions.length === 0) confidence += 0.3;
    if (suggestions.length < 2) confidence += 0.2;
    
    return {
      agentName: this.name,
      confidence,
      findings,
      questions,
      suggestions
    };
  }
}

// Agente 4: Clasificador Inteligente
class IntelligentClassifier {
  name = 'Clasificador Inteligente';
  
  async analyze(input: string, allFindings: any[]): Promise<AgentResponse> {
    const findings: any = {};
    let confidence = 0;
    
    // Combinar todos los hallazgos
    const combined = allFindings.reduce((acc, curr) => ({...acc, ...curr}), {});
    
    // Determinar el tipo principal de registro
    const types = [];
    
    if (combined.weight) types.push({ type: 'weight', priority: 1 });
    if (combined.temperature) types.push({ type: 'temperature', priority: combined.temperature.requiresAttention ? 0 : 2 });
    if (combined.height) types.push({ type: 'height', priority: 3 });
    if (combined.symptoms && combined.symptoms.length > 0) types.push({ type: 'symptom', priority: 1 });
    if (combined.medications && combined.medications.length > 0) types.push({ type: 'medication', priority: 2 });
    if (combined.feedingMentioned) types.push({ type: 'feeding', priority: 4 });
    
    // Ordenar por prioridad
    types.sort((a, b) => a.priority - b.priority);
    
    if (types.length > 0) {
      findings.primaryType = types[0].type;
      findings.secondaryTypes = types.slice(1).map(t => t.type);
      confidence = 0.8;
    } else {
      findings.primaryType = 'note';
      confidence = 0.5;
    }
    
    // Determinar urgencia
    findings.urgencyLevel = 0; // 0-5
    
    if (combined.temperature?.requiresAttention) {
      findings.urgencyLevel = Math.max(findings.urgencyLevel, 3);
    }
    
    if (combined.symptoms?.some((s: any) => ['vómito', 'diarrea', 'dificultad respiratoria'].includes(s.name))) {
      findings.urgencyLevel = Math.max(findings.urgencyLevel, 4);
    }
    
    // Generar etiquetas automáticas
    findings.autoTags = [];
    
    if (combined.temperature?.value >= 38) findings.autoTags.push('fiebre');
    if (combined.weight) findings.autoTags.push('control-peso');
    if (combined.height) findings.autoTags.push('control-talla');
    if (combined.symptoms?.length > 0) findings.autoTags.push('síntomas');
    if (combined.medications?.length > 0) findings.autoTags.push('medicación');
    
    return {
      agentName: this.name,
      confidence,
      findings
    };
  }
}

// Coordinador Principal
export class AIProcessingCoordinator {
  private agents: any[];
  
  constructor() {
    this.agents = [
      new MedicalDataExtractor(),
      new TemporalAnalyzer(),
      new ContextValidator(),
      new IntelligentClassifier()
    ];
  }
  
  async processInput(input: string): Promise<ProcessingResult> {
    console.log('🧠 Iniciando procesamiento multi-agente para:', input);
    
    const agentResponses: AgentResponse[] = [];
    const allFindings: any[] = [];
    
    // Fase 1: Análisis individual
    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      let response;
      
      if (agent.name === 'Validador de Contexto' || agent.name === 'Clasificador Inteligente') {
        // Estos agentes necesitan los hallazgos previos
        response = await agent.analyze(input, allFindings);
      } else {
        response = await agent.analyze(input);
      }
      
      agentResponses.push(response);
      allFindings.push(response.findings);
      
      console.log(`✅ ${agent.name} completado con confianza: ${response.confidence}`);
    }
    
    // Fase 2: Consolidación de resultados
    const consolidatedData = this.consolidateFindings(allFindings);
    
    // Fase 3: Cálculo de consenso
    const avgConfidence = agentResponses.reduce((sum, r) => sum + r.confidence, 0) / agentResponses.length;
    const consensus = agentResponses.every(r => r.confidence > 0.5);
    
    // Fase 4: Recopilar todas las preguntas y sugerencias
    const allQuestions = agentResponses.flatMap(r => r.questions || []);
    const allSuggestions = agentResponses.flatMap(r => r.suggestions || []);
    
    // Eliminar duplicados
    const uniqueQuestions = [...new Set(allQuestions)];
    const uniqueSuggestions = [...new Set(allSuggestions)];
    
    // Fase 5: Determinar si necesita clarificación
    const clarificationNeeded = uniqueQuestions.length > 0 || avgConfidence < 0.7;
    
    return {
      finalData: consolidatedData,
      confidence: avgConfidence,
      consensus,
      clarificationNeeded,
      questions: uniqueQuestions,
      suggestions: uniqueSuggestions,
      agentResponses
    };
  }
  
  private consolidateFindings(allFindings: any[]): any {
    const consolidated: any = {
      extractedAt: new Date().toISOString()
    };
    
    // Combinar todos los hallazgos
    for (const findings of allFindings) {
      for (const [key, value] of Object.entries(findings)) {
        if (value !== null && value !== undefined) {
          // Si es un array, concatenar
          if (Array.isArray(value)) {
            consolidated[key] = consolidated[key] || [];
            consolidated[key] = [...consolidated[key], ...value];
          } 
          // Si es un objeto y ya existe, merge
          else if (typeof value === 'object' && consolidated[key]) {
            consolidated[key] = { ...consolidated[key], ...value };
          } 
          // Si no, asignar directamente
          else {
            consolidated[key] = value;
          }
        }
      }
    }
    
    return consolidated;
  }
  
  // Método para procesar la respuesta del usuario a las preguntas
  async processUserResponse(
    originalInput: string, 
    userResponses: {[question: string]: string},
    previousResult: ProcessingResult
  ): Promise<ProcessingResult> {
    // Combinar input original con respuestas del usuario
    let enhancedInput = originalInput + '\n';
    
    for (const [question, answer] of Object.entries(userResponses)) {
      enhancedInput += `\n${question} ${answer}`;
    }
    
    // Re-procesar con la información adicional
    const newResult = await this.processInput(enhancedInput);
    
    // Mantener datos previos que no hayan cambiado
    newResult.finalData = {
      ...previousResult.finalData,
      ...newResult.finalData,
      userConfirmed: true
    };
    
    return newResult;
  }
}

export const aiCoordinator = new AIProcessingCoordinator();