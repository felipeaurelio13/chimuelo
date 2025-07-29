// Sistema de Prompts Optimizado para Multi-Agentes
// Basado en mejores prácticas de OpenAI para sistemas multi-agente

export interface AgentPrompt {
  system: string;
  user: string;
  context?: any;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentRole {
  name: string;
  description: string;
  capabilities: string[];
  constraints: string[];
  outputFormat: string;
}

export class AgentPromptManager {
  private static instance: AgentPromptManager;
  
  // Definición de roles de agentes
  private agentRoles: Record<string, AgentRole> = {
    classifier: {
      name: 'Classifier Agent',
      description: 'Especialista en clasificación y categorización de contenido médico pediátrico',
      capabilities: [
        'Clasificación de tipos de datos médicos',
        'Detección de contenido crítico',
        'Priorización de información',
        'Identificación de patrones'
      ],
      constraints: [
        'Solo clasificar, no diagnosticar',
        'No hacer recomendaciones médicas',
        'Mantener confidencialidad',
        'Validar fuentes de información'
      ],
      outputFormat: 'JSON con clasificación y confianza'
    },
    
    medical: {
      name: 'Medical Agent',
      description: 'Especialista en análisis médico pediátrico y extracción de datos clínicos',
      capabilities: [
        'Extracción de síntomas',
        'Análisis de mediciones',
        'Identificación de alertas médicas',
        'Validación de datos clínicos'
      ],
      constraints: [
        'No diagnosticar enfermedades',
        'No prescribir medicamentos',
        'Siempre recomendar consulta médica',
        'Validar rangos normales'
      ],
      outputFormat: 'JSON estructurado con datos médicos'
    },
    
    metrics: {
      name: 'Metrics Agent',
      description: 'Especialista en análisis de métricas de crecimiento y desarrollo pediátrico',
      capabilities: [
        'Análisis de percentiles WHO',
        'Validación de rangos normales',
        'Detección de anomalías',
        'Tendencias de crecimiento'
      ],
      constraints: [
        'Usar solo estándares WHO/AAP',
        'No interpretar tendencias como diagnóstico',
        'Validar datos por edad',
        'Marcar valores anómalos'
      ],
      outputFormat: 'JSON con métricas y validaciones'
    },
    
    pharmacological: {
      name: 'Pharmacological Agent',
      description: 'Especialista en análisis de medicamentos y tratamientos pediátricos',
      capabilities: [
        'Validación de dosis pediátricas',
        'Detección de interacciones',
        'Análisis de efectos secundarios',
        'Verificación de indicaciones'
      ],
      constraints: [
        'No prescribir medicamentos',
        'Solo validar información existente',
        'Alertar sobre dosis inusuales',
        'Recomendar consulta médica'
      ],
      outputFormat: 'JSON con análisis farmacológico'
    }
  };

  public static getInstance(): AgentPromptManager {
    if (!AgentPromptManager.instance) {
      AgentPromptManager.instance = new AgentPromptManager();
    }
    return AgentPromptManager.instance;
  }

  // Generar prompt para clasificador
  generateClassifierPrompt(input: string, context?: any): AgentPrompt {
    const role = this.agentRoles.classifier;
    
    return {
      system: `Eres un ${role.name}. ${role.description}

CAPACIDADES:
${role.capabilities.map(cap => `• ${cap}`).join('\n')}

RESTRICCIONES:
${role.constraints.map(constraint => `• ${constraint}`).join('\n')}

TAREA: Clasifica el siguiente contenido médico pediátrico.

FORMATO DE SALIDA:
{
  "classification": "weight|height|temperature|medication|symptom|milestone|administrative",
  "confidence": 0.0-1.0,
  "contentType": "measurement|observation|document|note",
  "priority": "low|medium|high|critical",
  "requiresAttention": boolean,
  "extractedData": {
    "value": number|string,
    "unit": string,
    "date": string,
    "context": string
  },
  "validation": {
    "isValid": boolean,
    "warnings": string[],
    "errors": string[]
  }
}`,
      user: `Analiza el siguiente contenido: "${input}"

Contexto adicional: ${JSON.stringify(context || {})}

Proporciona una clasificación precisa y estructurada.`,
      temperature: 0.1,
      maxTokens: 500
    };
  }

  // Generar prompt para agente médico
  generateMedicalPrompt(input: string, classification: any, context?: any): AgentPrompt {
    const role = this.agentRoles.medical;
    
    return {
      system: `Eres un ${role.name}. ${role.description}

CAPACIDADES:
${role.capabilities.map(cap => `• ${cap}`).join('\n')}

RESTRICCIONES:
${role.constraints.map(constraint => `• ${constraint}`).join('\n')}

CLASIFICACIÓN RECIBIDA:
${JSON.stringify(classification, null, 2)}

TAREA: Analiza el contenido médico y extrae información estructurada.

FORMATO DE SALIDA:
{
  "analysis": {
    "symptoms": string[],
    "measurements": {
      "value": number,
      "unit": string,
      "date": string
    },
    "alerts": string[],
    "recommendations": string[]
  },
  "validation": {
    "isValid": boolean,
    "confidence": 0.0-1.0,
    "warnings": string[],
    "errors": string[]
  },
  "requiresMedicalAttention": boolean,
  "priority": "low|medium|high|critical"
}`,
      user: `Analiza el siguiente contenido médico: "${input}"

Contexto del paciente: ${JSON.stringify(context || {})}

Proporciona un análisis médico estructurado y seguro.`,
      temperature: 0.2,
      maxTokens: 800
    };
  }

  // Generar prompt para agente de métricas
  generateMetricsPrompt(input: string, patientAge?: number, context?: any): AgentPrompt {
    const role = this.agentRoles.metrics;
    
    return {
      system: `Eres un ${role.name}. ${role.description}

CAPACIDADES:
${role.capabilities.map(cap => `• ${cap}`).join('\n')}

RESTRICCIONES:
${role.constraints.map(constraint => `• ${constraint}`).join('\n')}

EDAD DEL PACIENTE: ${patientAge || 'No especificada'} meses

ESTÁNDARES DE REFERENCIA:
• WHO Growth Standards (0-5 años)
• AAP Guidelines para rangos normales
• Percentiles: P3-P97 considerados normales

TAREA: Analiza las métricas de crecimiento y desarrollo.

FORMATO DE SALIDA:
{
  "metrics": {
    "weight": { "value": number, "unit": "kg", "percentile": number },
    "height": { "value": number, "unit": "cm", "percentile": number },
    "headCircumference": { "value": number, "unit": "cm", "percentile": number },
    "temperature": { "value": number, "unit": "°C" }
  },
  "validation": {
    "isValid": boolean,
    "confidence": 0.0-1.0,
    "warnings": string[],
    "errors": string[],
    "criticalAlerts": string[]
  },
  "growthTrend": "normal|accelerated|delayed|concerning",
  "recommendations": string[]
}`,
      user: `Analiza las siguientes métricas: "${input}"

Contexto adicional: ${JSON.stringify(context || {})}

Proporciona un análisis basado en estándares WHO/AAP.`,
      temperature: 0.1,
      maxTokens: 600
    };
  }

  // Generar prompt para agente farmacológico
  generatePharmacologicalPrompt(input: string, context?: any): AgentPrompt {
    const role = this.agentRoles.pharmacological;
    
    return {
      system: `Eres un ${role.name}. ${role.description}

CAPACIDADES:
${role.capabilities.map(cap => `• ${cap}`).join('\n')}

RESTRICCIONES:
${role.constraints.map(constraint => `• ${constraint}`).join('\n')}

TAREA: Analiza información farmacológica pediátrica.

FORMATO DE SALIDA:
{
  "medication": {
    "name": string,
    "dose": string,
    "frequency": string,
    "duration": string,
    "route": string
  },
  "validation": {
    "isValid": boolean,
    "confidence": 0.0-1.0,
    "warnings": string[],
    "errors": string[],
    "criticalAlerts": string[]
  },
  "pediatricConsiderations": string[],
  "recommendations": string[]
}`,
      user: `Analiza la siguiente información farmacológica: "${input}"

Contexto del paciente: ${JSON.stringify(context || {})}

Proporciona un análisis farmacológico seguro para pediatría.`,
      temperature: 0.1,
      maxTokens: 700
    };
  }

  // Generar prompt para análisis de síntomas
  generateSymptomAnalysisPrompt(symptoms: string[], context?: any): AgentPrompt {
    return {
      system: `Eres un especialista en análisis de síntomas pediátricos.

CAPACIDADES:
• Análisis de patrones de síntomas
• Identificación de síntomas de alarma
• Evaluación de severidad
• Recomendaciones de monitoreo

RESTRICCIONES:
• No diagnosticar enfermedades
• No prescribir tratamientos
• Siempre recomendar consulta médica
• Priorizar síntomas de alarma

TAREA: Analiza los síntomas reportados y proporciona orientación.

FORMATO DE SALIDA:
{
  "symptomAnalysis": {
    "primarySymptoms": string[],
    "associatedSymptoms": string[],
    "severity": "mild|moderate|severe|critical",
    "duration": string,
    "pattern": string
  },
  "alerts": {
    "redFlags": string[],
    "yellowFlags": string[],
    "requiresImmediateAttention": boolean
  },
  "monitoring": {
    "whatToWatch": string[],
    "whenToSeekCare": string[],
    "frequency": string
  },
  "recommendations": string[]
}`,
      user: `Analiza los siguientes síntomas: ${symptoms.join(', ')}

Contexto del paciente: ${JSON.stringify(context || {})}

Proporciona un análisis seguro de síntomas pediátricos.`,
      temperature: 0.2,
      maxTokens: 800
    };
  }

  // Generar prompt para validación de datos
  generateValidationPrompt(data: any, validationRules: any): AgentPrompt {
    return {
      system: `Eres un especialista en validación de datos médicos pediátricos.

TAREA: Valida los datos médicos según estándares pediátricos.

REGLAS DE VALIDACIÓN:
${JSON.stringify(validationRules, null, 2)}

FORMATO DE SALIDA:
{
  "validation": {
    "isValid": boolean,
    "confidence": 0.0-1.0,
    "warnings": string[],
    "errors": string[],
    "criticalAlerts": string[]
  },
  "recommendations": string[],
  "requiresReview": boolean
}`,
      user: `Valida los siguientes datos médicos: ${JSON.stringify(data, null, 2)}

Proporciona una validación rigurosa basada en estándares médicos.`,
      temperature: 0.1,
      maxTokens: 500
    };
  }

  // Generar prompt para análisis de tendencias
  generateTrendAnalysisPrompt(historicalData: any[], currentData: any): AgentPrompt {
    return {
      system: `Eres un especialista en análisis de tendencias de crecimiento pediátrico.

CAPACIDADES:
• Análisis de patrones de crecimiento
• Detección de desviaciones
• Evaluación de progreso
• Identificación de tendencias

RESTRICCIONES:
• No diagnosticar condiciones
• Usar solo datos disponibles
• Marcar cambios significativos
• Recomendar seguimiento médico

TAREA: Analiza las tendencias de crecimiento y desarrollo.

FORMATO DE SALIDA:
{
  "trendAnalysis": {
    "growthPattern": "normal|accelerated|delayed|concerning",
    "percentileTrend": "stable|increasing|decreasing|fluctuating",
    "velocity": "normal|slow|fast",
    "consistency": "consistent|variable|concerning"
  },
  "changes": {
    "significantChanges": string[],
    "trends": string[],
    "concerns": string[]
  },
  "recommendations": string[],
  "requiresMedicalReview": boolean
}`,
      user: `Analiza las tendencias con datos históricos: ${JSON.stringify(historicalData, null, 2)}

Datos actuales: ${JSON.stringify(currentData, null, 2)}

Proporciona un análisis de tendencias basado en evidencia.`,
      temperature: 0.2,
      maxTokens: 600
    };
  }
}

export default AgentPromptManager;