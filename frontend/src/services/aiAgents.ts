// Sistema de Agentes de IA Especializados - Versión 2.0 Mejorada
// Basado en mejores prácticas de OpenAI y papers de medical AI

import { openAIService } from './openaiService';

export interface AgentResponse {
  agentName: string;
  confidence: number;
  findings: any;
  questions?: string[];
  suggestions?: string[];
  requiresConfirmation?: boolean;
  reasoning?: string[]; // Nuevo: cadena de razonamiento
}

export interface ProcessingResult {
  finalData: any;
  confidence: number;
  consensus: boolean;
  clarificationNeeded: boolean;
  questions: string[];
  suggestions: string[];
  agentResponses: AgentResponse[];
  conversationLog?: AgentConversation[]; // Nuevo: log de conversación entre agentes
}

export interface AgentConversation {
  from: string;
  to: string;
  message: string;
  timestamp: string;
}

// Utilidades compartidas para mejor detección
class TextProcessingUtils {
  // Limpia el texto de marcadores de archivos adjuntos
  static cleanTextFromAttachments(text: string): string {
    return text.replace(/\[(PDF|Imagen|Audio|Video)\s+adjunt[oa]:.*?\]/gi, '');
  }
  
  // Detecta límites de palabras para evitar falsos positivos
  static hasWordBoundary(text: string, word: string): boolean {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(text);
  }
  
  // Extrae contexto alrededor de una coincidencia
  static getContext(text: string, match: string, windowSize: number = 30): string {
    const index = text.toLowerCase().indexOf(match.toLowerCase());
    if (index === -1) return '';
    
    const start = Math.max(0, index - windowSize);
    const end = Math.min(text.length, index + match.length + windowSize);
    return text.substring(start, end);
  }
}

// Agente 1: Extractor de Datos Médicos Mejorado v2
class MedicalDataExtractorV2 {
  name = 'Extractor Médico v2';
  
  async analyze(input: string): Promise<AgentResponse> {
    const findings: any = {};
    const questions: string[] = [];
    const reasoning: string[] = [];
    let confidence = 0;
    
    // Limpiar texto de marcadores de archivos
    const cleanText = TextProcessingUtils.cleanTextFromAttachments(input);
    
    // Análisis mejorado de peso con contexto
    const pesoAnalysis = this.analyzePeso(cleanText);
    if (pesoAnalysis.found) {
      findings.weight = pesoAnalysis.data;
      questions.push(...pesoAnalysis.questions);
      reasoning.push(...pesoAnalysis.reasoning);
      confidence += pesoAnalysis.confidence;
    }
    
    // Análisis de temperatura
    const tempAnalysis = this.analyzeTemperatura(cleanText);
    if (tempAnalysis.found) {
      findings.temperature = tempAnalysis.data;
      questions.push(...tempAnalysis.questions);
      reasoning.push(...tempAnalysis.reasoning);
      confidence += tempAnalysis.confidence;
    }
    
    // Análisis de síntomas con mejor detección
    const symptomsAnalysis = this.analyzeSymptoms(cleanText);
    if (symptomsAnalysis.symptoms.length > 0) {
      findings.symptoms = symptomsAnalysis.symptoms;
      questions.push(...symptomsAnalysis.questions);
      reasoning.push(...symptomsAnalysis.reasoning);
      confidence += symptomsAnalysis.confidence;
      
      if (symptomsAnalysis.urgent) {
        findings.urgentSymptoms = true;
      }
    }
    
    // Si no encontramos nada específico pero hay texto
    if (Object.keys(findings).length === 0 && cleanText.trim().length > 10) {
      reasoning.push('No se detectaron datos médicos específicos en el texto');
      confidence = 0.1;
    }
    
    return {
      agentName: this.name,
      confidence: Math.min(confidence, 1),
      findings,
      questions,
      reasoning,
      requiresConfirmation: questions.length > 0 || confidence < 0.5
    };
  }
  
  private analyzePeso(text: string): any {
    const result = {
      found: false,
      data: {} as any,
      questions: [] as string[],
      reasoning: [] as string[],
      confidence: 0
    };
    
    // Patrones mejorados con contexto negativo
    const pesoPatterns = [
      {
        regex: /(\d{1,2})[.,](\d{3})\s*(?:kg|kilos?|kilogramos?)/i,
        handler: (match: RegExpMatchArray) => {
          const value = parseFloat(match[1] + '.' + match[2]);
          return { value, unit: 'kg', interpretation: 'miles_separator' };
        }
      },
      {
        regex: /(\d+)[,.](\d{1,2})\s*(?:kg|kilos?|kilogramos?)/i,
        handler: (match: RegExpMatchArray) => {
          const value = parseFloat(match[1] + '.' + match[2]);
          return { value, unit: 'kg' };
        }
      },
      {
        regex: /(\d+)\s*(?:kg|kilos?|kilogramos?)/i,
        handler: (match: RegExpMatchArray) => {
          const value = parseFloat(match[1]);
          return { value, unit: 'kg' };
        }
      },
      {
        regex: /(\d+(?:[.,]\d+)?)\s*(?:gramos?|grs?|g)\b/i,
        handler: (match: RegExpMatchArray) => {
          const grams = parseFloat(match[1].replace(',', '.'));
          return { 
            value: grams / 1000, 
            unit: 'kg', 
            originalValue: grams, 
            originalUnit: 'g' 
          };
        }
      }
    ];
    
    for (const pattern of pesoPatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        const context = TextProcessingUtils.getContext(text, match[0]);
        
        // Verificar que no sea parte de otra medida
        if (!/precio|costo|€|\$/.test(context)) {
          result.found = true;
          result.data = pattern.handler(match);
          
          // Validación inteligente
          const value = result.data.value;
          if (value < 0.5) {
            result.questions.push(`Detecté ${value} kg (${value * 1000}g). ¿Es correcto este peso tan bajo?`);
            result.confidence = 0.2;
          } else if (value > 30) {
            result.questions.push(`Detecté ${value} kg. ¿Es correcto? Parece alto para un niño.`);
            result.confidence = 0.3;
          } else {
            result.confidence = 0.4;
            result.reasoning.push(`Peso detectado: ${value} kg - valor dentro de rangos normales`);
          }
          
          if (result.data.interpretation === 'miles_separator') {
            result.reasoning.push('Interpretado formato con punto como separador de miles');
          }
          
          break;
        }
      }
    }
    
    return result;
  }
  
  private analyzeTemperatura(text: string): any {
    const result = {
      found: false,
      data: {} as any,
      questions: [] as string[],
      reasoning: [] as string[],
      confidence: 0
    };
    
    const tempPatterns = [
      /(\d+(?:[.,]\d+)?)\s*°\s*c/i,
      /(\d+(?:[.,]\d+)?)\s*grados?\s*(?:centígrados?|celsius)?/i,
      /temperatura\s*(?:de\s*)?(\d+(?:[.,]\d+)?)/i,
      /fiebre\s*(?:de\s*)?(\d+(?:[.,]\d+)?)/i
    ];
    
    for (const pattern of tempPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        
        if (value >= 35 && value <= 42) {
          result.found = true;
          result.data = {
            value,
            unit: '°C',
            severity: this.classifyTemperature(value),
            requiresAttention: false
          };
          
          if (value >= 38) {
            result.data.requiresAttention = true;
            result.reasoning.push(`Temperatura elevada detectada: ${value}°C`);
          }
          
          result.confidence = 0.4;
          break;
        } else {
          result.questions.push(`Temperatura ${value}°C fuera de rango. ¿Es correcta?`);
          result.confidence = 0.1;
        }
      }
    }
    
    // Detectar mención de fiebre sin temperatura
    if (!result.found && /fiebre|febril|calentura|temperatura alta/i.test(text)) {
      result.questions.push('Se menciona fiebre. ¿Cuál es la temperatura exacta?');
      result.reasoning.push('Fiebre mencionada sin valor específico');
      result.confidence = 0.1;
    }
    
    return result;
  }
  
  private analyzeSymptoms(text: string): any {
    const result = {
      symptoms: [] as any[],
      questions: [] as string[],
      reasoning: [] as string[],
      confidence: 0,
      urgent: false
    };
    
    // Síntomas organizados por categoría con validación de contexto
    const symptomCategories: {[key: string]: any} = {
      respiratorios: {
        terms: ['tos', 'mocos', 'congestión', 'estornudos', 'flemas'],
        validate: (context: string) => !/(foto|documento|archivo)/i.test(context),
        urgent: false
      },
      digestivos: {
        terms: ['vómito', 'vomitó', 'diarrea', 'estreñimiento', 'náuseas'],
        validate: (context: string) => true,
        urgent: false
      },
      urgentes: {
        terms: ['convulsión', 'dificultad respiratoria', 'no responde'],
        validate: (context: string) => true,
        urgent: true
      }
    };
    
    for (const [category, config] of Object.entries(symptomCategories)) {
      for (const symptom of config.terms) {
        if (TextProcessingUtils.hasWordBoundary(text, symptom)) {
          const context = TextProcessingUtils.getContext(text, symptom);
          
          if (config.validate(context)) {
            result.symptoms.push({
              name: symptom,
              category,
              context: context.trim()
            });
            
            result.confidence += 0.1;
            result.reasoning.push(`Síntoma detectado: ${symptom} (${category})`);
            
            if (config.urgent) {
              result.urgent = true;
              result.questions.push(`⚠️ URGENTE: Detecté "${symptom}". ¿Requiere atención inmediata?`);
            }
          }
        }
      }
    }
    
    return result;
  }
  
  private classifyTemperature(temp: number): string {
    if (temp >= 39) return 'alta';
    if (temp >= 38) return 'moderada';
    if (temp >= 37.5) return 'leve';
    return 'normal';
  }
}

// Agente 2: Detector de Documentos Mejorado
class DocumentAnalyzerV2 {
  name = 'Analizador de Documentos v2';
  
  async analyze(input: string): Promise<AgentResponse> {
    const findings: any = {};
    const questions: string[] = [];
    const suggestions: string[] = [];
    const reasoning: string[] = [];
    let confidence = 0;
    
    // Detectar archivos adjuntos
    const attachmentPattern = /\[(PDF|Imagen|Audio|Video)\s+adjunt[oa]:\s*([^\]]+)\]/gi;
    const attachments = Array.from(input.matchAll(attachmentPattern));
    
    if (attachments.length > 0) {
      findings.hasAttachments = true;
      findings.attachments = attachments.map(match => ({
        type: match[1].toLowerCase(),
        filename: match[2].trim()
      }));
      
      reasoning.push(`Detectados ${attachments.length} archivo(s) adjunto(s)`);
      
      // Analizar tipo de documento por el nombre o contexto
      for (const attachment of findings.attachments) {
        if (attachment.type === 'pdf' || attachment.type === 'imagen') {
          const docType = this.inferDocumentType(attachment.filename, input);
          
          if (docType) {
            findings.inferredDocumentType = docType;
            questions.push(...this.getQuestionsForDocType(docType));
            suggestions.push(...this.getSuggestionsForDocType(docType));
            confidence += 0.3;
          } else {
            questions.push(`¿Qué tipo de documento es "${attachment.filename}"?`);
            suggestions.push('Describe el contenido principal del documento');
            confidence = 0.1;
          }
        }
      }
      
      // Reducir confianza general porque no podemos ver el contenido
      confidence = Math.min(confidence, 0.5);
    }
    
    return {
      agentName: this.name,
      confidence,
      findings,
      questions,
      suggestions,
      reasoning
    };
  }
  
  private inferDocumentType(filename: string, context: string): string | null {
    const patterns = {
      'laboratorio': /lab|análisis|examen|resultado|hemograma|orina/i,
      'receta': /receta|prescripción|rx|medicamento/i,
      'informe': /informe|reporte|consulta|diagnóstico/i,
      'vacuna': /vacuna|inmunización|carnet/i,
      'imagen_medica': /rx|radiografía|eco|ecografía|resonancia|tomografía/i
    };
    
    // Buscar en el nombre del archivo y contexto
    const searchText = `${filename} ${context}`.toLowerCase();
    
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(searchText)) {
        return type;
      }
    }
    
    return null;
  }
  
  private getQuestionsForDocType(docType: string): string[] {
    const questions: { [key: string]: string[] } = {
      'laboratorio': [
        '¿Cuáles son los valores principales del análisis?',
        '¿Hay algún valor fuera del rango normal?'
      ],
      'receta': [
        '¿Qué medicamentos están indicados?',
        '¿Cuáles son las dosis y frecuencias?'
      ],
      'vacuna': [
        '¿Qué vacunas se aplicaron?',
        '¿En qué fecha?'
      ],
      'imagen_medica': [
        '¿Cuál es el diagnóstico o hallazgo principal?',
        '¿Hay alguna recomendación específica?'
      ]
    };
    
    return questions[docType] || [];
  }
  
  private getSuggestionsForDocType(docType: string): string[] {
    const suggestions: { [key: string]: string[] } = {
      'laboratorio': [
        'Puedes listar valores como: Hemoglobina: 12.5, Leucocitos: 8000',
        'Indica si algún valor está marcado como anormal'
      ],
      'receta': [
        'Formato sugerido: Medicamento - Dosis - Cada X horas - Por X días'
      ],
      'vacuna': [
        'Incluye el nombre completo de la vacuna y la fecha de aplicación'
      ]
    };
    
    return suggestions[docType] || [];
  }
}

// Agente 3: Coordinador de Conversación (NUEVO)
class ConversationCoordinator {
  private conversationLog: AgentConversation[] = [];
  
  logMessage(from: string, to: string, message: string) {
    this.conversationLog.push({
      from,
      to,
      message,
      timestamp: new Date().toISOString()
    });
  }
  
  async mediateDiscussion(agents: any[], topic: string, data: any): Promise<any> {
    const consensus: any = {};
    
    // Simular discusión entre agentes
    this.logMessage('Coordinador', 'Todos', `Iniciando discusión sobre: ${topic}`);
    
    // Cada agente opina sobre los hallazgos
    for (const agent of agents) {
      if (agent.name.includes('Médico') && topic === 'peso_ambiguo') {
        this.logMessage(
          agent.name, 
          'Coordinador', 
          `El valor ${data.value} podría ser kg o g. Contexto sugiere: ${data.context}`
        );
      }
    }
    
    return consensus;
  }
  
  getConversationLog(): AgentConversation[] {
    return this.conversationLog;
  }
}

// Agente 2: Analizador Temporal (de la versión anterior)
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

// Coordinador Principal Mejorado v2
export class AIProcessingCoordinatorV2 {
  private agents: any[];
  private conversationCoordinator: ConversationCoordinator;
  
  constructor() {
    this.agents = [
      new MedicalDataExtractorV2(),
      new DocumentAnalyzerV2(),
      new TemporalAnalyzer(), // Reutilizar el existente
      new ContextValidator(),  // Reutilizar el existente
      new IntelligentClassifier() // Reutilizar el existente
    ];
    this.conversationCoordinator = new ConversationCoordinator();
  }
  
  async processInput(input: string, metadata?: any): Promise<ProcessingResult> {
    console.log('🧠 Iniciando procesamiento multi-agente v2');
    
    const agentResponses: AgentResponse[] = [];
    const allFindings: any[] = [];
    
    // Fase 1: Análisis individual mejorado
    for (const agent of this.agents) {
      let response;
      
      try {
        if (agent.name === 'Validador de Contexto' || agent.name === 'Clasificador Inteligente') {
          response = await agent.analyze(input, allFindings);
        } else {
          response = await agent.analyze(input);
        }
        
        agentResponses.push(response);
        allFindings.push(response.findings);
        
        // Log de conversación
        if (response.reasoning) {
          this.conversationCoordinator.logMessage(
            agent.name,
            'Sistema',
            response.reasoning.join('; ')
          );
        }
        
        console.log(`✅ ${agent.name}: Confianza ${(response.confidence * 100).toFixed(0)}%`);
      } catch (error) {
        console.error(`❌ Error en ${agent.name}:`, error);
      }
    }
    
    // Fase 2: Discusión entre agentes para casos ambiguos
    const hasAmbiguity = agentResponses.some(r => 
      r.questions?.some(q => q.includes('¿Es correcto?'))
    );
    
    if (hasAmbiguity) {
      this.conversationCoordinator.logMessage(
        'Coordinador',
        'Agentes',
        'Detectada ambigüedad - iniciando discusión'
      );
      
      // Los agentes pueden discutir y refinar sus hallazgos
      await this.conversationCoordinator.mediateDiscussion(
        this.agents,
        'ambiguedad_detectada',
        allFindings
      );
    }
    
    // Fase 3: Consolidación mejorada
    const consolidatedData = this.consolidateFindings(allFindings);
    
    // Fase 4: Cálculo de consenso ponderado
    const weightedConfidence = this.calculateWeightedConfidence(agentResponses);
    const consensus = agentResponses.filter(r => r.confidence > 0.4).length >= 3;
    
    // Fase 5: Preguntas y sugerencias inteligentes
    const { questions, suggestions } = this.intelligentQuestionGeneration(
      agentResponses,
      consolidatedData
    );
    
    const clarificationNeeded = questions.length > 0 || weightedConfidence < 0.5;
    
    return {
      finalData: consolidatedData,
      confidence: weightedConfidence,
      consensus,
      clarificationNeeded,
      questions,
      suggestions,
      agentResponses,
      conversationLog: this.conversationCoordinator.getConversationLog()
    };
  }
  
  private calculateWeightedConfidence(responses: AgentResponse[]): number {
    // Dar más peso a agentes especializados según el tipo de datos encontrados
    const weights: { [key: string]: number } = {
      'Extractor Médico v2': 0.35,
      'Analizador de Documentos v2': 0.25,
      'Analizador Temporal': 0.15,
      'Validador de Contexto': 0.15,
      'Clasificador Inteligente': 0.10
    };
    
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const response of responses) {
      const weight = weights[response.agentName] || 0.1;
      weightedSum += response.confidence * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
  
  private intelligentQuestionGeneration(
    responses: AgentResponse[],
    consolidatedData: any
  ): { questions: string[], suggestions: string[] } {
    const allQuestions = responses.flatMap(r => r.questions || []);
    const allSuggestions = responses.flatMap(r => r.suggestions || []);
    
    // Priorizar y deduplicar inteligentemente
    const prioritizedQuestions = this.prioritizeQuestions(allQuestions);
    const contextualSuggestions = this.generateContextualSuggestions(
      consolidatedData,
      allSuggestions
    );
    
    return {
      questions: prioritizedQuestions.slice(0, 5), // Máximo 5 preguntas
      suggestions: contextualSuggestions.slice(0, 3) // Máximo 3 sugerencias
    };
  }
  
  private prioritizeQuestions(questions: string[]): string[] {
    // Eliminar duplicados y priorizar por importancia
    const unique = [...new Set(questions)];
    
    return unique.sort((a, b) => {
      // Urgentes primero
      if (a.includes('⚠️')) return -1;
      if (b.includes('⚠️')) return 1;
      
      // Luego las de confirmación de valores
      if (a.includes('¿Es correct')) return -1;
      if (b.includes('¿Es correct')) return 1;
      
      return 0;
    });
  }
  
  private generateContextualSuggestions(data: any, suggestions: string[]): string[] {
    const contextual = [...suggestions];
    
    // Agregar sugerencias basadas en lo que falta
    if (!data.weight && !data.temperature && !data.symptoms) {
      contextual.push('Intenta describir síntomas específicos o mediciones');
    }
    
    if (data.hasAttachments && !data.inferredDocumentType) {
      contextual.push('Describe brevemente qué tipo de documento médico es');
    }
    
    return [...new Set(contextual)];
  }
  
  private consolidateFindings(allFindings: any[]): any {
    const consolidated: any = {
      extractedAt: new Date().toISOString()
    };
    
    // Consolidación inteligente con prioridad a datos más confiables
    for (const findings of allFindings) {
      for (const [key, value] of Object.entries(findings)) {
        if (value !== null && value !== undefined && value !== false) {
          if (Array.isArray(value) && Array.isArray(consolidated[key])) {
            // Combinar arrays eliminando duplicados
            consolidated[key] = [...new Set([...consolidated[key], ...value])];
          } else if (typeof value === 'object' && consolidated[key]) {
            // Merge de objetos dando prioridad a valores con mayor confianza
            consolidated[key] = { ...consolidated[key], ...value };
          } else {
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

export const aiCoordinator = new AIProcessingCoordinatorV2();