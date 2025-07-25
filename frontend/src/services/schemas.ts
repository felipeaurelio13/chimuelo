// JSON Schemas for OpenAI Structured Outputs
// These schemas ensure consistent data extraction from various inputs

export interface BaseSchema {
  type: "object";
  properties: any;
  required: string[];
  additionalProperties: boolean;
}

export const BASE_EXTRACTION_SCHEMA: BaseSchema = {
  type: "object",
  properties: {
    extractionType: {
      type: "string",
      enum: ["weight", "height", "temperature", "symptom", "medication", "vaccine", "milestone", "note"]
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Nivel de confianza de la IA en la extracción (0-1)"
    },
    timestamp: {
      type: "string",
      format: "date-time",
      description: "Fecha y hora del evento extraído"
    },
    notes: {
      type: "string",
      maxLength: 500,
      description: "Notas adicionales o contexto"
    },
    requiresAttention: {
      type: "boolean",
      description: "Indica si requiere atención médica"
    }
  },
  required: ["extractionType", "confidence", "timestamp"],
  additionalProperties: false
};

// Weight measurement schema
export const WEIGHT_SCHEMA: BaseSchema = {
  type: "object",
  properties: {
    ...BASE_EXTRACTION_SCHEMA.properties,
    extractionType: { const: "weight" },
    data: {
      type: "object",
      properties: {
        weight: {
          type: "number",
          minimum: 0.5,
          maximum: 50,
          description: "Peso en la unidad especificada"
        },
        unit: {
          type: "string",
          enum: ["kg", "g", "lb"],
          description: "Unidad de medida del peso"
        },
        conditions: {
          type: "string",
          maxLength: 200,
          description: "Condiciones durante la medición (ej: con ropa, después de comer)"
        },
        measuredBy: {
          type: "string",
          enum: ["parent", "doctor", "nurse", "self"],
          description: "Quién realizó la medición"
        },
        location: {
          type: "string",
          enum: ["home", "clinic", "hospital", "pharmacy"],
          description: "Dónde se realizó la medición"
        }
      },
      required: ["weight", "unit"],
      additionalProperties: false
    }
  },
  required: [...BASE_EXTRACTION_SCHEMA.required, "data"],
  additionalProperties: false
};

// Height measurement schema
export const HEIGHT_SCHEMA: BaseSchema = {
  type: "object",
  properties: {
    ...BASE_EXTRACTION_SCHEMA.properties,
    extractionType: { const: "height" },
    data: {
      type: "object",
      properties: {
        height: {
          type: "number",
          minimum: 30,
          maximum: 200,
          description: "Altura en la unidad especificada"
        },
        unit: {
          type: "string",
          enum: ["cm", "in"],
          description: "Unidad de medida de la altura"
        },
        measuredBy: {
          type: "string",
          enum: ["parent", "doctor", "nurse", "self"]
        },
        method: {
          type: "string",
          enum: ["measuring_tape", "stadiometer", "growth_chart", "other"],
          description: "Método utilizado para medir"
        },
        position: {
          type: "string",
          enum: ["lying", "standing"],
          description: "Posición durante la medición"
        }
      },
      required: ["height", "unit"],
      additionalProperties: false
    }
  },
  required: [...BASE_EXTRACTION_SCHEMA.required, "data"],
  additionalProperties: false
};

// Temperature measurement schema
export const TEMPERATURE_SCHEMA: BaseSchema = {
  type: "object",
  properties: {
    ...BASE_EXTRACTION_SCHEMA.properties,
    extractionType: { const: "temperature" },
    data: {
      type: "object",
      properties: {
        temperature: {
          type: "number",
          minimum: 30,
          maximum: 45,
          description: "Temperatura corporal"
        },
        unit: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "Unidad de temperatura"
        },
        method: {
          type: "string",
          enum: ["oral", "rectal", "axillary", "temporal", "ear"],
          description: "Método de medición de temperatura"
        },
        symptoms: {
          type: "array",
          items: {
            type: "string",
            enum: ["fever", "chills", "sweating", "lethargy", "irritability"]
          },
          maxItems: 5,
          description: "Síntomas asociados"
        }
      },
      required: ["temperature", "unit", "method"],
      additionalProperties: false
    }
  },
  required: [...BASE_EXTRACTION_SCHEMA.required, "data"],
  additionalProperties: false
};

// Symptom report schema
export const SYMPTOM_SCHEMA: BaseSchema = {
  type: "object",
  properties: {
    ...BASE_EXTRACTION_SCHEMA.properties,
    extractionType: { const: "symptom" },
    data: {
      type: "object",
      properties: {
        symptoms: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                enum: [
                  "fever", "cough", "runny_nose", "diarrhea", "vomiting", 
                  "rash", "irritability", "loss_of_appetite", "difficulty_sleeping",
                  "ear_pain", "stomach_pain", "constipation", "other"
                ]
              },
              severity: {
                type: "string",
                enum: ["mild", "moderate", "severe"]
              },
              duration: {
                type: "string",
                description: "Duración del síntoma (ej: '2 días', '3 horas')"
              },
              description: {
                type: "string",
                maxLength: 300
              }
            },
            required: ["name", "severity"],
            additionalProperties: false
          },
          minItems: 1,
          maxItems: 5
        },
        overallCondition: {
          type: "string",
          enum: ["excellent", "good", "fair", "poor"],
          description: "Estado general del niño"
        },
        behaviorChanges: {
          type: "array",
          items: {
            type: "string",
            enum: ["more_sleepy", "less_active", "more_clingy", "loss_of_appetite", "irritable"]
          },
          maxItems: 3
        }
      },
      required: ["symptoms"],
      additionalProperties: false
    }
  },
  required: [...BASE_EXTRACTION_SCHEMA.required, "data"],
  additionalProperties: false
};

// Medication schema
export const MEDICATION_SCHEMA: BaseSchema = {
  type: "object",
  properties: {
    ...BASE_EXTRACTION_SCHEMA.properties,
    extractionType: { const: "medication" },
    data: {
      type: "object",
      properties: {
        medication: {
          type: "object",
          properties: {
            name: {
              type: "string",
              maxLength: 100,
              description: "Nombre del medicamento"
            },
            dose: {
              type: "object",
              properties: {
                amount: { type: "number", minimum: 0 },
                unit: {
                  type: "string",
                  enum: ["mg", "ml", "drops", "tablets", "teaspoons"]
                }
              },
              required: ["amount", "unit"],
              additionalProperties: false
            },
            frequency: {
              type: "string",
              description: "Frecuencia (ej: 'cada 8 horas', '2 veces al día')"
            },
            reason: {
              type: "string",
              maxLength: 200,
              description: "Razón para la medicación"
            },
            prescribedBy: {
              type: "string",
              maxLength: 100
            }
          },
          required: ["name", "dose"],
          additionalProperties: false
        }
      },
      required: ["medication"],
      additionalProperties: false
    }
  },
  required: [...BASE_EXTRACTION_SCHEMA.required, "data"],
  additionalProperties: false
};

// Milestone achievement schema
export const MILESTONE_SCHEMA: BaseSchema = {
  type: "object",
  properties: {
    ...BASE_EXTRACTION_SCHEMA.properties,
    extractionType: { const: "milestone" },
    data: {
      type: "object",
      properties: {
        milestone: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["motor_gross", "motor_fine", "language", "cognitive", "social", "emotional"]
            },
            achievement: {
              type: "string",
              maxLength: 200,
              description: "Descripción del hito alcanzado"
            },
            ageAchieved: {
              type: "object",
              properties: {
                months: { type: "number", minimum: 0, maximum: 60 },
                weeks: { type: "number", minimum: 0, maximum: 4 }
              },
              required: ["months"],
              additionalProperties: false
            },
            description: {
              type: "string",
              maxLength: 500,
              description: "Descripción detallada de cómo se manifestó"
            },
            isRegression: {
              type: "boolean",
              description: "Indica si es una regresión de un hito previamente alcanzado"
            }
          },
          required: ["category", "achievement", "ageAchieved"],
          additionalProperties: false
        }
      },
      required: ["milestone"],
      additionalProperties: false
    }
  },
  required: [...BASE_EXTRACTION_SCHEMA.required, "data"],
  additionalProperties: false
};

// Generic note schema for unstructured data
export const NOTE_SCHEMA: BaseSchema = {
  type: "object",
  properties: {
    ...BASE_EXTRACTION_SCHEMA.properties,
    extractionType: { const: "note" },
    data: {
      type: "object",
      properties: {
        title: {
          type: "string",
          maxLength: 100,
          description: "Título o resumen de la nota"
        },
        content: {
          type: "string",
          maxLength: 1000,
          description: "Contenido completo de la nota"
        },
        category: {
          type: "string",
          enum: ["general", "behavior", "development", "feeding", "sleep", "medical", "other"],
          description: "Categoría de la nota"
        },
        tags: {
          type: "array",
          items: { type: "string", maxLength: 50 },
          maxItems: 5,
          description: "Tags para organizar la nota"
        }
      },
      required: ["content", "category"],
      additionalProperties: false
    }
  },
  required: [...BASE_EXTRACTION_SCHEMA.required, "data"],
  additionalProperties: false
};

// Schema selector service
export class SchemaService {
  private static schemas = {
    weight: WEIGHT_SCHEMA,
    height: HEIGHT_SCHEMA,
    temperature: TEMPERATURE_SCHEMA,
    symptom: SYMPTOM_SCHEMA,
    medication: MEDICATION_SCHEMA,
    milestone: MILESTONE_SCHEMA,
    note: NOTE_SCHEMA
  };

  static getSchemaForType(type: string): BaseSchema {
    return this.schemas[type as keyof typeof this.schemas] || NOTE_SCHEMA;
  }

  static getAllSchemaTypes(): string[] {
    return Object.keys(this.schemas);
  }

  static getSchemaForInput(input: string, inputType: string): BaseSchema {
    // Smart schema detection based on input content
    const inputLower = input.toLowerCase();
    
    // Weight indicators
    if (inputLower.includes('peso') || inputLower.includes('kg') || 
        inputLower.includes('kilo') || inputLower.includes('weight') ||
        /\d+(\.\d+)?\s*(kg|g|lb)/.test(inputLower)) {
      return this.schemas.weight;
    }
    
    // Height indicators
    if (inputLower.includes('altura') || inputLower.includes('mide') || 
        inputLower.includes('cm') || inputLower.includes('height') ||
        /\d+(\.\d+)?\s*(cm|in)/.test(inputLower)) {
      return this.schemas.height;
    }
    
    // Temperature indicators
    if (inputLower.includes('temperatura') || inputLower.includes('fiebre') || 
        inputLower.includes('fever') || inputLower.includes('°c') ||
        /\d+(\.\d+)?\s*(°c|°f|celsius|fahrenheit)/.test(inputLower)) {
      return this.schemas.temperature;
    }
    
    // Symptom indicators
    if (inputLower.includes('síntoma') || inputLower.includes('dolor') || 
        inputLower.includes('tos') || inputLower.includes('diarrea') ||
        inputLower.includes('vómito') || inputLower.includes('erupción')) {
      return this.schemas.symptom;
    }
    
    // Medication indicators
    if (inputLower.includes('medicamento') || inputLower.includes('medicina') || 
        inputLower.includes('dosis') || inputLower.includes('pastilla') ||
        inputLower.includes('jarabe') || inputLower.includes('mg') || inputLower.includes('ml')) {
      return this.schemas.medication;
    }
    
    // Milestone indicators
    if (inputLower.includes('hito') || inputLower.includes('desarrollo') || 
        inputLower.includes('gatear') || inputLower.includes('caminar') ||
        inputLower.includes('hablar') || inputLower.includes('milestone')) {
      return this.schemas.milestone;
    }
    
    // Default to note schema
    return this.schemas.note;
  }

  static buildExtractionPrompt(input: string, inputType: string, schema: BaseSchema): string {
    return `Analiza el siguiente ${inputType} y extrae datos de salud relevantes según el schema JSON.

INPUT A ANALIZAR:
${input}

SCHEMA REQUERIDO:
${JSON.stringify(schema, null, 2)}

INSTRUCCIONES ESPECÍFICAS:
1. Extrae ÚNICAMENTE información explícitamente presente en el input
2. Si no hay suficiente información, usa valores por defecto razonables
3. Asigna un nivel de confianza basado en la claridad de la información
4. El timestamp debe reflejar cuándo ocurrió el evento (no cuando se procesó)
5. Marca requiresAttention=true si detectas algo que requiere atención médica
6. En notas, incluye contexto útil para futuras referencias
7. Para síntomas, sé específico en severity y duration
8. Para medicamentos, incluye toda la información de dosificación disponible

CONTEXTO TEMPORAL:
- Fecha actual: ${new Date().toISOString()}
- Si no se especifica fecha, asumir que es de hoy
- Para frases como "ayer", "anteayer", calcular la fecha correcta

RESPONDE ÚNICAMENTE CON JSON VÁLIDO, SIN TEXTO ADICIONAL.`;
  }
}

export default SchemaService;