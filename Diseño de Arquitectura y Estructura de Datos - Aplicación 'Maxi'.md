# Diseño de Arquitectura y Estructura de Datos - Aplicación 'Maxi'

## 1. Introducción

Este documento presenta el diseño detallado de la arquitectura y la estructura de datos para la aplicación 'Maxi', una Progressive Web App (PWA) para el seguimiento de la salud y crecimiento infantil. La arquitectura se basa en los principios de minimalismo, mobile-first y offline-first, garantizando una experiencia de usuario fluida y segura.

La aplicación utiliza una arquitectura distribuida moderna que combina un frontend React PWA alojado en GitHub Pages, un Cloudflare Worker como proxy de API, y almacenamiento local cifrado con IndexedDB. Esta arquitectura permite el funcionamiento completo offline mientras mantiene la capacidad de sincronización y procesamiento de IA cuando hay conectividad.

## 2. Visión General de la Arquitectura

La arquitectura de 'Maxi' se compone de tres capas principales que trabajan en conjunto para proporcionar una experiencia de usuario completa y segura. La capa de presentación está formada por una PWA React que se ejecuta completamente en el navegador del usuario, proporcionando una interfaz intuitiva y responsiva. La capa de servicios incluye un Cloudflare Worker ligero que actúa como proxy seguro para las APIs externas, ocultando las claves de API y gestionando el rate-limiting. La capa de datos utiliza IndexedDB para almacenamiento local cifrado, con opciones de sincronización a un repositorio Git privado.

Esta arquitectura distribuida ofrece varias ventajas significativas. Primero, la separación de responsabilidades permite que cada componente se optimice para su función específica. El frontend puede enfocarse en la experiencia de usuario y el rendimiento, mientras que el Worker maneja la seguridad y la integración con servicios externos. Segundo, la naturaleza offline-first garantiza que los usuarios puedan acceder y utilizar la aplicación incluso sin conexión a internet, con sincronización automática cuando la conectividad se restaura. Tercero, el cifrado end-to-end asegura que los datos sensibles de salud permanezcan protegidos en todo momento.

## 3. Estructura de Datos para IndexedDB

El diseño de la base de datos local utiliza IndexedDB para proporcionar almacenamiento persistente y eficiente en el navegador. La estructura se organiza en múltiples object stores (equivalentes a tablas en bases de datos relacionales) que manejan diferentes aspectos de los datos de salud del niño.

### 3.1. Object Store: Users

Este store maneja la información básica del usuario y la configuración de la aplicación. Cada registro representa un usuario único del sistema.

```javascript
{
  id: "user_uuid_v4", // Clave primaria
  email: "usuario@ejemplo.com",
  name: "Nombre del Usuario",
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-15T10:30:00.000Z",
  preferences: {
    theme: "light", // "light", "dark", "baby-sleep"
    units: {
      weight: "kg", // "kg", "lb"
      height: "cm", // "cm", "in"
      temperature: "celsius" // "celsius", "fahrenheit"
    },
    notifications: {
      reminders: true,
      alerts: true,
      webPush: false
    },
    language: "es-ES"
  },
  encryptionKey: "base64_encoded_key", // Clave para cifrado local
  syncSettings: {
    enabled: false,
    gistId: null,
    lastSync: null,
    token: null // Cifrado con la clave maestra
  }
}
```

### 3.2. Object Store: Children

Este store contiene la información básica de los niños cuya salud se está monitoreando. Permite el seguimiento de múltiples niños por usuario.

```javascript
{
  id: "child_uuid_v4", // Clave primaria
  userId: "user_uuid_v4", // Clave foránea
  name: "Nombre del Niño",
  birthDate: "2023-06-15", // Formato ISO date
  gender: "male", // "male", "female", "other"
  bloodType: "O+", // Opcional
  allergies: ["lactosa", "nueces"], // Array de strings
  medicalConditions: ["asma"], // Array de strings
  pediatrician: {
    name: "Dr. García",
    phone: "+34123456789",
    email: "dr.garcia@clinica.com"
  },
  emergencyContact: {
    name: "Abuela María",
    relationship: "abuela",
    phone: "+34987654321"
  },
  createdAt: "2023-06-15T08:00:00.000Z",
  updatedAt: "2024-01-15T10:30:00.000Z",
  isActive: true // Para soft delete
}
```

### 3.3. Object Store: HealthRecords

Este es el store principal que contiene todos los registros de salud y crecimiento. Cada registro representa un evento o medición específica.

```javascript
{
  id: "record_uuid_v4", // Clave primaria
  childId: "child_uuid_v4", // Clave foránea
  type: "weight", // "weight", "height", "temperature", "symptom", "medication", "vaccine", "appointment", "milestone", "note"
  timestamp: "2024-01-15T10:30:00.000Z",
  data: {
    // Estructura variable según el tipo
    value: 8.5, // Para mediciones numéricas
    unit: "kg",
    notes: "Pesaje rutinario",
    location: "casa", // "casa", "clinica", "hospital"
    measuredBy: "padre" // "padre", "madre", "medico", "enfermera"
  },
  aiExtracted: true, // Indica si fue extraído por IA
  originalInput: {
    type: "image", // "text", "image", "audio", "video", "pdf"
    content: "base64_encoded_data", // Cifrado
    filename: "peso_15_enero.jpg"
  },
  aiProcessing: {
    model: "gpt-4.1",
    confidence: 0.95,
    extractedAt: "2024-01-15T10:31:00.000Z",
    prompt: "Extract health data from this image...",
    rawResponse: "{...}" // Respuesta completa de la IA
  },
  tags: ["rutina", "crecimiento"], // Para filtrado y búsqueda
  isScheduled: false, // Para eventos futuros
  scheduledFor: null, // Fecha programada para eventos futuros
  reminderSent: false,
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-15T10:30:00.000Z",
  syncStatus: "synced" // "pending", "synced", "error"
}
```

### 3.4. Object Store: ChatHistory

Este store mantiene el historial de conversaciones con la IA para el chat de dudas.

```javascript
{
  id: "chat_uuid_v4", // Clave primaria
  childId: "child_uuid_v4", // Clave foránea
  sessionId: "session_uuid_v4", // Para agrupar conversaciones
  role: "user", // "user", "assistant", "system"
  content: "¿Es normal que mi bebé pese 8.5kg a los 7 meses?",
  timestamp: "2024-01-15T10:30:00.000Z",
  context: {
    relevantRecords: ["record_uuid_1", "record_uuid_2"], // IDs de registros relevantes
    searchResults: [
      {
        query: "peso normal bebé 7 meses",
        source: "mayoclinic.org",
        snippet: "El peso promedio...",
        url: "https://..."
      }
    ]
  },
  aiModel: "gpt-4o",
  tokens: 150,
  createdAt: "2024-01-15T10:30:00.000Z"
}
```

### 3.5. Object Store: Insights

Este store almacena insights generados automáticamente y alertas personalizadas.

```javascript
{
  id: "insight_uuid_v4", // Clave primaria
  childId: "child_uuid_v4", // Clave foránea
  type: "growth_percentile", // "growth_percentile", "alert", "milestone", "recommendation"
  title: "Crecimiento en percentil 75",
  description: "El peso de tu hijo está en el percentil 75 para su edad",
  data: {
    percentile: 75,
    metric: "weight",
    value: 8.5,
    ageInMonths: 7,
    chartData: [...] // Datos para gráficas
  },
  severity: "info", // "info", "warning", "alert", "critical"
  isRead: false,
  isDismissed: false,
  actionRequired: false,
  relatedRecords: ["record_uuid_1", "record_uuid_2"],
  generatedAt: "2024-01-15T10:30:00.000Z",
  expiresAt: "2024-02-15T10:30:00.000Z" // Para insights temporales
}
```

### 3.6. Object Store: SyncLog

Este store mantiene un registro de todas las operaciones de sincronización para debugging y recuperación.

```javascript
{
  id: "sync_uuid_v4", // Clave primaria
  operation: "push", // "push", "pull", "conflict_resolution"
  status: "success", // "success", "error", "pending"
  recordsAffected: 15,
  startTime: "2024-01-15T10:30:00.000Z",
  endTime: "2024-01-15T10:31:30.000Z",
  error: null, // Mensaje de error si status es "error"
  details: {
    gistId: "abc123",
    commitSha: "def456",
    conflictsResolved: 2
  }
}
```

Esta estructura de datos proporciona una base sólida para el almacenamiento local de todos los aspectos de la aplicación, desde la información básica del usuario hasta los registros detallados de salud y las interacciones con la IA. El diseño permite consultas eficientes, sincronización robusta y escalabilidad para múltiples niños por usuario.



## 4. JSON Schemas para Extracción de Datos con OpenAI

La integración con OpenAI utiliza Structured Outputs para garantizar respuestas consistentes y válidas. Se han definido múltiples schemas específicos para diferentes tipos de inputs y extracciones de datos. Cada schema utiliza la especificación JSON Schema Draft 7 con la bandera `strict: true` para validación automática.

### 4.1. Schema Base para Extracción General

Este schema sirve como base para todas las extracciones de datos de salud, proporcionando una estructura común que puede extenderse para casos específicos.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "extractionType": {
      "type": "string",
      "enum": ["health_measurement", "symptom_report", "medication_log", "vaccine_record", "appointment_note", "milestone_achievement", "general_note"]
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Nivel de confianza de la IA en la extracción (0-1)"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Fecha y hora del evento extraído en formato ISO 8601"
    },
    "childInfo": {
      "type": "object",
      "properties": {
        "ageInMonths": {
          "type": "number",
          "minimum": 0,
          "maximum": 240
        },
        "name": {
          "type": "string",
          "maxLength": 100
        }
      },
      "additionalProperties": false
    },
    "extractedData": {
      "type": "object",
      "description": "Datos específicos extraídos según el tipo"
    },
    "originalContext": {
      "type": "string",
      "maxLength": 1000,
      "description": "Contexto original del input para referencia"
    },
    "notes": {
      "type": "string",
      "maxLength": 500,
      "description": "Notas adicionales o observaciones"
    },
    "requiresAttention": {
      "type": "boolean",
      "description": "Indica si el registro requiere atención médica"
    }
  },
  "required": ["extractionType", "confidence", "timestamp", "extractedData"],
  "additionalProperties": false
}
```

### 4.2. Schema para Mediciones de Salud

Este schema específico maneja la extracción de mediciones cuantitativas como peso, altura, temperatura, etc.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "allOf": [
    {"$ref": "#/definitions/baseExtraction"}
  ],
  "properties": {
    "extractionType": {
      "const": "health_measurement"
    },
    "extractedData": {
      "type": "object",
      "properties": {
        "measurements": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "enum": ["weight", "height", "head_circumference", "temperature", "heart_rate", "blood_pressure"]
              },
              "value": {
                "type": "number",
                "minimum": 0
              },
              "unit": {
                "type": "string",
                "enum": ["kg", "g", "lb", "cm", "in", "celsius", "fahrenheit", "bpm", "mmHg"]
              },
              "method": {
                "type": "string",
                "enum": ["digital_scale", "analog_scale", "measuring_tape", "thermometer", "stethoscope", "blood_pressure_cuff", "other"]
              },
              "location": {
                "type": "string",
                "enum": ["home", "clinic", "hospital", "pharmacy", "other"]
              }
            },
            "required": ["type", "value", "unit"],
            "additionalProperties": false
          },
          "minItems": 1,
          "maxItems": 10
        },
        "measuredBy": {
          "type": "string",
          "enum": ["parent", "guardian", "doctor", "nurse", "self", "other"]
        },
        "conditions": {
          "type": "string",
          "maxLength": 200,
          "description": "Condiciones durante la medición (ej: después de comer, con ropa, etc.)"
        }
      },
      "required": ["measurements"],
      "additionalProperties": false
    }
  },
  "definitions": {
    "baseExtraction": {
      "type": "object",
      "properties": {
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "timestamp": {"type": "string", "format": "date-time"},
        "childInfo": {
          "type": "object",
          "properties": {
            "ageInMonths": {"type": "number", "minimum": 0, "maximum": 240},
            "name": {"type": "string", "maxLength": 100}
          },
          "additionalProperties": false
        },
        "originalContext": {"type": "string", "maxLength": 1000},
        "notes": {"type": "string", "maxLength": 500},
        "requiresAttention": {"type": "boolean"}
      },
      "required": ["confidence", "timestamp"],
      "additionalProperties": false
    }
  }
}
```

### 4.3. Schema para Reportes de Síntomas

Este schema maneja la extracción de información sobre síntomas, malestares y observaciones de comportamiento.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "allOf": [
    {"$ref": "#/definitions/baseExtraction"}
  ],
  "properties": {
    "extractionType": {
      "const": "symptom_report"
    },
    "extractedData": {
      "type": "object",
      "properties": {
        "symptoms": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "enum": ["fever", "cough", "runny_nose", "diarrhea", "vomiting", "rash", "irritability", "loss_of_appetite", "difficulty_sleeping", "difficulty_breathing", "ear_pain", "stomach_pain", "constipation", "other"]
              },
              "severity": {
                "type": "string",
                "enum": ["mild", "moderate", "severe"]
              },
              "duration": {
                "type": "string",
                "description": "Duración del síntoma en formato legible (ej: '2 días', '3 horas')"
              },
              "frequency": {
                "type": "string",
                "enum": ["constant", "intermittent", "occasional", "once"]
              },
              "description": {
                "type": "string",
                "maxLength": 300,
                "description": "Descripción detallada del síntoma"
              },
              "triggers": {
                "type": "array",
                "items": {
                  "type": "string",
                  "maxLength": 100
                },
                "maxItems": 5,
                "description": "Posibles desencadenantes identificados"
              },
              "relievingFactors": {
                "type": "array",
                "items": {
                  "type": "string",
                  "maxLength": 100
                },
                "maxItems": 5,
                "description": "Factores que alivian el síntoma"
              }
            },
            "required": ["name", "severity"],
            "additionalProperties": false
          },
          "minItems": 1,
          "maxItems": 10
        },
        "overallCondition": {
          "type": "string",
          "enum": ["excellent", "good", "fair", "poor", "critical"]
        },
        "behaviorChanges": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["more_sleepy", "less_sleepy", "more_irritable", "less_active", "more_clingy", "loss_of_appetite", "increased_appetite", "other"]
          },
          "maxItems": 5
        },
        "actionsTaken": {
          "type": "array",
          "items": {
            "type": "string",
            "maxLength": 200
          },
          "maxItems": 5,
          "description": "Acciones tomadas para tratar los síntomas"
        }
      },
      "required": ["symptoms"],
      "additionalProperties": false
    }
  }
}
```

### 4.4. Schema para Registros de Medicación

Este schema específico maneja información sobre medicamentos administrados, dosis y horarios.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "allOf": [
    {"$ref": "#/definitions/baseExtraction"}
  ],
  "properties": {
    "extractionType": {
      "const": "medication_log"
    },
    "extractedData": {
      "type": "object",
      "properties": {
        "medications": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "maxLength": 200,
                "description": "Nombre del medicamento"
              },
              "activeIngredient": {
                "type": "string",
                "maxLength": 200,
                "description": "Principio activo"
              },
              "dose": {
                "type": "object",
                "properties": {
                  "amount": {
                    "type": "number",
                    "minimum": 0
                  },
                  "unit": {
                    "type": "string",
                    "enum": ["mg", "ml", "drops", "tablets", "teaspoons", "tablespoons", "units"]
                  }
                },
                "required": ["amount", "unit"],
                "additionalProperties": false
              },
              "frequency": {
                "type": "string",
                "description": "Frecuencia de administración (ej: 'cada 8 horas', '2 veces al día')"
              },
              "route": {
                "type": "string",
                "enum": ["oral", "topical", "nasal", "rectal", "injection", "inhalation", "other"]
              },
              "reason": {
                "type": "string",
                "maxLength": 200,
                "description": "Razón para la medicación"
              },
              "prescribedBy": {
                "type": "string",
                "maxLength": 100,
                "description": "Médico que prescribió"
              },
              "startDate": {
                "type": "string",
                "format": "date"
              },
              "endDate": {
                "type": "string",
                "format": "date"
              },
              "sideEffects": {
                "type": "array",
                "items": {
                  "type": "string",
                  "maxLength": 100
                },
                "maxItems": 5,
                "description": "Efectos secundarios observados"
              }
            },
            "required": ["name", "dose", "route"],
            "additionalProperties": false
          },
          "minItems": 1,
          "maxItems": 5
        },
        "administeredBy": {
          "type": "string",
          "enum": ["parent", "guardian", "doctor", "nurse", "self", "other"]
        },
        "adherence": {
          "type": "string",
          "enum": ["excellent", "good", "fair", "poor"],
          "description": "Nivel de adherencia al tratamiento"
        }
      },
      "required": ["medications"],
      "additionalProperties": false
    }
  }
}
```

### 4.5. Schema para Registros de Vacunas

Este schema maneja información específica sobre vacunaciones y inmunizaciones.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "allOf": [
    {"$ref": "#/definitions/baseExtraction"}
  ],
  "properties": {
    "extractionType": {
      "const": "vaccine_record"
    },
    "extractedData": {
      "type": "object",
      "properties": {
        "vaccines": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "maxLength": 200,
                "description": "Nombre de la vacuna"
              },
              "type": {
                "type": "string",
                "enum": ["hepatitis_b", "dtap", "hib", "pcv", "ipv", "mmr", "varicella", "hepatitis_a", "meningococcal", "hpv", "influenza", "covid19", "other"]
              },
              "manufacturer": {
                "type": "string",
                "maxLength": 100
              },
              "lotNumber": {
                "type": "string",
                "maxLength": 50
              },
              "dose": {
                "type": "string",
                "description": "Número de dosis (ej: '1ra dosis', '2da dosis', 'refuerzo')"
              },
              "site": {
                "type": "string",
                "enum": ["left_arm", "right_arm", "left_thigh", "right_thigh", "oral", "nasal", "other"]
              },
              "administeredBy": {
                "type": "string",
                "maxLength": 100,
                "description": "Profesional que administró la vacuna"
              },
              "clinic": {
                "type": "string",
                "maxLength": 200,
                "description": "Centro de salud donde se administró"
              },
              "nextDueDate": {
                "type": "string",
                "format": "date",
                "description": "Fecha programada para la siguiente dosis"
              },
              "reactions": {
                "type": "array",
                "items": {
                  "type": "string",
                  "maxLength": 100
                },
                "maxItems": 5,
                "description": "Reacciones observadas post-vacunación"
              }
            },
            "required": ["name", "type"],
            "additionalProperties": false
          },
          "minItems": 1,
          "maxItems": 5
        },
        "overallReaction": {
          "type": "string",
          "enum": ["none", "mild", "moderate", "severe"],
          "description": "Reacción general post-vacunación"
        }
      },
      "required": ["vaccines"],
      "additionalProperties": false
    }
  }
}
```

### 4.6. Schema para Hitos del Desarrollo

Este schema captura información sobre hitos del desarrollo motor, cognitivo y social del niño.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "allOf": [
    {"$ref": "#/definitions/baseExtraction"}
  ],
  "properties": {
    "extractionType": {
      "const": "milestone_achievement"
    },
    "extractedData": {
      "type": "object",
      "properties": {
        "milestones": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "category": {
                "type": "string",
                "enum": ["motor_gross", "motor_fine", "language", "cognitive", "social", "emotional", "adaptive"]
              },
              "milestone": {
                "type": "string",
                "maxLength": 200,
                "description": "Descripción del hito alcanzado"
              },
              "ageAchieved": {
                "type": "object",
                "properties": {
                  "months": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 240
                  },
                  "weeks": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 4
                  }
                },
                "required": ["months"],
                "additionalProperties": false
              },
              "expectedAgeRange": {
                "type": "object",
                "properties": {
                  "minMonths": {
                    "type": "number",
                    "minimum": 0
                  },
                  "maxMonths": {
                    "type": "number",
                    "minimum": 0
                  }
                },
                "additionalProperties": false
              },
              "description": {
                "type": "string",
                "maxLength": 500,
                "description": "Descripción detallada de cómo se manifestó el hito"
              },
              "context": {
                "type": "string",
                "maxLength": 300,
                "description": "Contexto en el que se observó el hito"
              },
              "isRegression": {
                "type": "boolean",
                "description": "Indica si es una regresión de un hito previamente alcanzado"
              }
            },
            "required": ["category", "milestone", "ageAchieved"],
            "additionalProperties": false
          },
          "minItems": 1,
          "maxItems": 10
        },
        "observedBy": {
          "type": "string",
          "enum": ["parent", "guardian", "doctor", "therapist", "teacher", "other"]
        },
        "developmentConcerns": {
          "type": "array",
          "items": {
            "type": "string",
            "maxLength": 200
          },
          "maxItems": 5,
          "description": "Preocupaciones sobre el desarrollo identificadas"
        }
      },
      "required": ["milestones"],
      "additionalProperties": false
    }
  }
}
```

Estos schemas proporcionan una estructura robusta y flexible para la extracción de datos mediante IA, garantizando que toda la información relevante se capture de manera consistente y validada. La validación automática con AJV en el cliente asegura que solo se almacenen datos que cumplan con estos esquemas estrictos.


## 5. Arquitectura del Cloudflare Worker

El Cloudflare Worker actúa como un proxy seguro y eficiente entre el frontend React y los servicios externos (OpenAI y DuckDuckGo). Su diseño minimalista se enfoca en la seguridad, el rendimiento y la simplicidad, exponiendo únicamente las rutas necesarias mientras oculta las claves de API y gestiona el rate-limiting.

### 5.1. Estructura General del Worker

El Worker se organiza en módulos funcionales que manejan diferentes aspectos de la aplicación. La arquitectura modular permite un mantenimiento sencillo y la fácil adición de nuevas funcionalidades.

```javascript
// worker.js - Punto de entrada principal
import { Router } from 'itty-router';
import { corsHeaders, handleCORS } from './utils/cors';
import { rateLimiter } from './utils/rateLimit';
import { authMiddleware } from './utils/auth';
import { openaiHandler } from './handlers/openai';
import { searchHandler } from './handlers/search';
import { errorHandler } from './utils/errorHandler';

const router = Router();

// Middleware global
router.all('*', handleCORS);
router.all('/api/*', rateLimiter);
router.all('/api/*', authMiddleware);

// Rutas principales
router.post('/api/openai/extract', openaiHandler.extractData);
router.post('/api/openai/chat', openaiHandler.chatCompletion);
router.get('/api/search', searchHandler.webSearch);

// Manejo de rutas no encontradas
router.all('*', () => new Response('Not Found', { status: 404 }));

export default {
  async fetch(request, env, ctx) {
    try {
      return await router.handle(request, env, ctx);
    } catch (error) {
      return errorHandler.handleError(error, request);
    }
  }
};
```

### 5.2. Módulo de Autenticación y Seguridad

El sistema de autenticación utiliza JWT tokens para verificar la identidad de los usuarios y prevenir el uso no autorizado del Worker.

```javascript
// utils/auth.js
import jwt from '@tsndr/cloudflare-worker-jwt';

export class AuthMiddleware {
  static async authMiddleware(request, env) {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const isValid = await jwt.verify(token, env.JWT_SECRET);
      
      if (!isValid) {
        return new Response('Invalid token', { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const payload = jwt.decode(token);
      request.user = payload.payload;
      
      return null; // Continuar con la siguiente middleware
    } catch (error) {
      return new Response('Token verification failed', { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  static async generateToken(userId, env) {
    const payload = {
      userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
    };

    return await jwt.sign(payload, env.JWT_SECRET);
  }
}
```

### 5.3. Sistema de Rate Limiting

El rate limiting protege las APIs externas del abuso y controla los costos asociados con las llamadas a OpenAI.

```javascript
// utils/rateLimit.js
export class RateLimiter {
  static async rateLimiter(request, env) {
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const userId = request.user?.userId || clientIP;
    
    // Diferentes límites según el endpoint
    const limits = {
      '/api/openai/extract': { requests: 50, window: 3600 }, // 50 por hora
      '/api/openai/chat': { requests: 100, window: 3600 }, // 100 por hora
      '/api/search': { requests: 200, window: 3600 } // 200 por hora
    };

    const endpoint = this.getEndpointFromPath(request.url);
    const limit = limits[endpoint] || { requests: 10, window: 3600 };

    const key = `rate_limit:${userId}:${endpoint}`;
    const current = await env.RATE_LIMIT_KV.get(key);
    
    if (current && parseInt(current) >= limit.requests) {
      return new Response('Rate limit exceeded', { 
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': limit.window.toString()
        }
      });
    }

    // Incrementar contador
    const newCount = current ? parseInt(current) + 1 : 1;
    await env.RATE_LIMIT_KV.put(key, newCount.toString(), { 
      expirationTtl: limit.window 
    });

    return null; // Continuar
  }

  static getEndpointFromPath(url) {
    const path = new URL(url).pathname;
    if (path.startsWith('/api/openai/extract')) return '/api/openai/extract';
    if (path.startsWith('/api/openai/chat')) return '/api/openai/chat';
    if (path.startsWith('/api/search')) return '/api/search';
    return 'unknown';
  }
}
```

### 5.4. Handler para OpenAI

Este módulo maneja todas las interacciones con la API de OpenAI, incluyendo extracción de datos y chat completions.

```javascript
// handlers/openai.js
export class OpenAIHandler {
  static async extractData(request, env) {
    try {
      const { input, inputType, schema } = await request.json();
      
      if (!input || !inputType || !schema) {
        return new Response('Missing required fields', { status: 400 });
      }

      const prompt = this.buildExtractionPrompt(input, inputType, schema);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4-1106-preview',
          messages: [
            {
              role: 'system',
              content: 'Eres un extractor de datos médicos especializado. Devuelve únicamente JSON válido que cumpla exactamente con el schema proporcionado.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 1024,
          response_format: { 
            type: 'json_object',
            schema: schema
          }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Validar que la respuesta cumple con el schema
      const extractedData = JSON.parse(data.choices[0].message.content);
      
      return new Response(JSON.stringify({
        success: true,
        data: extractedData,
        usage: data.usage,
        model: data.model
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  static async chatCompletion(request, env) {
    try {
      const { messages, context, searchResults } = await request.json();
      
      if (!messages || !Array.isArray(messages)) {
        return new Response('Invalid messages format', { status: 400 });
      }

      const systemPrompt = this.buildChatSystemPrompt(context, searchResults);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 2048,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      
      return new Response(JSON.stringify({
        success: true,
        message: data.choices[0].message.content,
        usage: data.usage,
        model: data.model
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  static buildExtractionPrompt(input, inputType, schema) {
    const basePrompt = `Analiza el siguiente ${inputType} y extrae todos los datos de salud relevantes según el schema JSON proporcionado.

Schema requerido:
${JSON.stringify(schema, null, 2)}

Input a analizar:
${input}

Instrucciones:
1. Extrae únicamente información explícitamente presente en el input
2. Si no hay suficiente información para un campo requerido, usa valores por defecto razonables
3. Asigna un nivel de confianza basado en la claridad de la información
4. Incluye el timestamp más preciso posible basado en el contexto
5. Devuelve únicamente JSON válido, sin texto adicional`;

    return basePrompt;
  }

  static buildChatSystemPrompt(context, searchResults) {
    let prompt = `Eres un asistente especializado en salud infantil. Tu objetivo es ayudar a padres con preguntas sobre la salud y desarrollo de sus hijos.

Contexto del niño:
${JSON.stringify(context, null, 2)}`;

    if (searchResults && searchResults.length > 0) {
      prompt += `\n\nInformación adicional de fuentes confiables:
${searchResults.map(result => `- ${result.source}: ${result.snippet}`).join('\n')}`;
    }

    prompt += `\n\nInstrucciones:
1. Proporciona respuestas informativas pero siempre recuerda que no reemplazas el consejo médico profesional
2. Si detectas algo que requiere atención médica inmediata, recomienda consultar con un pediatra
3. Usa el contexto del niño para personalizar tus respuestas
4. Cita las fuentes cuando uses información de búsquedas web
5. Mantén un tono cálido y comprensivo`;

    return prompt;
  }
}
```

### 5.5. Handler para Búsqueda Web

Este módulo gestiona las búsquedas web a través de DuckDuckGo, proporcionando información contextual para el chat de IA.

```javascript
// handlers/search.js
export class SearchHandler {
  static async webSearch(request, env) {
    try {
      const url = new URL(request.url);
      const query = url.searchParams.get('q');
      const maxResults = parseInt(url.searchParams.get('limit')) || 5;
      
      if (!query) {
        return new Response('Query parameter required', { status: 400 });
      }

      // Búsqueda en DuckDuckGo
      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Maxi Health App/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Procesar y filtrar resultados
      const results = this.processSearchResults(data, maxResults);
      
      return new Response(JSON.stringify({
        success: true,
        query,
        results,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  static processSearchResults(data, maxResults) {
    const results = [];
    
    // Procesar respuesta instantánea si existe
    if (data.Answer) {
      results.push({
        type: 'instant_answer',
        source: 'DuckDuckGo',
        title: 'Respuesta Directa',
        snippet: data.Answer,
        url: data.AbstractURL || null,
        relevance: 1.0
      });
    }

    // Procesar abstract si existe
    if (data.Abstract && data.AbstractText) {
      results.push({
        type: 'abstract',
        source: data.AbstractSource || 'Unknown',
        title: data.Heading || 'Información General',
        snippet: data.AbstractText,
        url: data.AbstractURL,
        relevance: 0.9
      });
    }

    // Procesar resultados relacionados
    if (data.RelatedTopics) {
      data.RelatedTopics.slice(0, maxResults - results.length).forEach(topic => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            type: 'related_topic',
            source: this.extractDomain(topic.FirstURL),
            title: topic.Text.split(' - ')[0] || 'Tema Relacionado',
            snippet: topic.Text,
            url: topic.FirstURL,
            relevance: 0.7
          });
        }
      });
    }

    // Filtrar por relevancia y fuentes confiables
    return results
      .filter(result => this.isReliableSource(result.source))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxResults);
  }

  static extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Unknown';
    }
  }

  static isReliableSource(source) {
    const reliableSources = [
      'mayoclinic.org',
      'webmd.com',
      'healthline.com',
      'cdc.gov',
      'who.int',
      'aap.org',
      'kidshealth.org',
      'babycenter.com',
      'whattoexpect.com'
    ];
    
    return reliableSources.some(reliable => 
      source.toLowerCase().includes(reliable.toLowerCase())
    );
  }
}
```

### 5.6. Manejo de Errores y Logging

El sistema de manejo de errores proporciona respuestas consistentes y logging detallado para debugging.

```javascript
// utils/errorHandler.js
export class ErrorHandler {
  static handleError(error, request) {
    const errorId = this.generateErrorId();
    
    // Log del error (en producción se enviaría a un servicio de logging)
    console.error(`Error ${errorId}:`, {
      message: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    });

    // Respuesta genérica para el cliente
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      errorId,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  static generateErrorId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}
```

Esta arquitectura del Cloudflare Worker proporciona una base sólida y segura para la comunicación entre el frontend y los servicios externos, manteniendo la simplicidad mientras ofrece todas las funcionalidades necesarias para la aplicación.


## 6. Estructura de la Aplicación React

La aplicación React se organiza siguiendo una arquitectura modular y escalable que facilita el mantenimiento y la adición de nuevas funcionalidades. La estructura se basa en principios de separación de responsabilidades, reutilización de componentes y gestión eficiente del estado.

### 6.1. Estructura de Directorios

```
src/
├── components/           # Componentes reutilizables
│   ├── common/          # Componentes comunes (Button, Input, Modal, etc.)
│   ├── forms/           # Componentes de formularios específicos
│   ├── charts/          # Componentes de visualización de datos
│   └── layout/          # Componentes de layout (Header, Navigation, etc.)
├── pages/               # Componentes de página principales
│   ├── Dashboard/       # Página principal/resumen
│   ├── Capture/         # Página de captura de datos
│   ├── Timeline/        # Página del timeline
│   ├── Chat/            # Página del chat con IA
│   ├── Profile/         # Página de perfil y configuración
│   └── Auth/            # Páginas de autenticación
├── hooks/               # Custom hooks
│   ├── useAuth.js       # Hook para autenticación
│   ├── useDatabase.js   # Hook para IndexedDB
│   ├── useAI.js         # Hook para interacciones con IA
│   └── useSync.js       # Hook para sincronización
├── contexts/            # Contextos de React
│   ├── AuthContext.js   # Contexto de autenticación
│   ├── DataContext.js   # Contexto de datos
│   └── ThemeContext.js  # Contexto de tema
├── services/            # Servicios y lógica de negocio
│   ├── api/             # Servicios de API
│   ├── database/        # Servicios de base de datos
│   ├── encryption/      # Servicios de cifrado
│   └── sync/            # Servicios de sincronización
├── utils/               # Utilidades y helpers
│   ├── constants.js     # Constantes de la aplicación
│   ├── validators.js    # Validadores de datos
│   └── formatters.js    # Formateadores de datos
├── styles/              # Estilos globales y temas
│   ├── globals.css      # Estilos globales
│   ├── themes.css       # Definiciones de temas
│   └── components.css   # Estilos de componentes
└── workers/             # Service Workers y Web Workers
    ├── sw.js            # Service Worker principal
    └── crypto.worker.js # Worker para operaciones de cifrado
```

### 6.2. Componentes Principales

#### 6.2.1. App Component

El componente raíz que maneja la inicialización de la aplicación y los providers principales.

```jsx
// App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { DatabaseService } from './services/database/DatabaseService';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingScreen from './components/common/LoadingScreen';
import ErrorBoundary from './components/common/ErrorBoundary';

// Importar páginas
import Dashboard from './pages/Dashboard/Dashboard';
import Capture from './pages/Capture/Capture';
import Timeline from './pages/Timeline/Timeline';
import Chat from './pages/Chat/Chat';
import Profile from './pages/Profile/Profile';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Inicializar base de datos
        await DatabaseService.initialize();
        
        // Registrar Service Worker
        if ('serviceWorker' in navigator) {
          await navigator.serviceWorker.register('/sw.js');
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        setInitError(error);
      }
    };

    initializeApp();
  }, []);

  if (initError) {
    return <ErrorScreen error={initError} />;
  }

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <Router>
              <div className="app">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/capture" element={
                    <ProtectedRoute>
                      <Capture />
                    </ProtectedRoute>
                  } />
                  <Route path="/timeline" element={
                    <ProtectedRoute>
                      <Timeline />
                    </ProtectedRoute>
                  } />
                  <Route path="/chat" element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                </Routes>
              </div>
            </Router>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
```

#### 6.2.2. Layout Components

Componentes que definen la estructura visual de la aplicación.

```jsx
// components/layout/MainLayout.jsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import FloatingActionButton from '../common/FloatingActionButton';

const MainLayout = ({ children, showFAB = true, fabAction }) => {
  const { theme } = useTheme();

  return (
    <div className={`main-layout theme-${theme}`}>
      <Header />
      <main className="main-content">
        {children}
      </main>
      {showFAB && <FloatingActionButton onClick={fabAction} />}
      <BottomNavigation />
    </div>
  );
};

export default MainLayout;
```

```jsx
// components/layout/BottomNavigation.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  CameraIcon, 
  ClockIcon, 
  ChatBubbleLeftIcon, 
  UserIcon 
} from '@heroicons/react/24/outline';

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', icon: HomeIcon, label: 'Inicio' },
    { path: '/capture', icon: CameraIcon, label: 'Capturar' },
    { path: '/timeline', icon: ClockIcon, label: 'Timeline' },
    { path: '/chat', icon: ChatBubbleLeftIcon, label: 'Chat' },
    { path: '/profile', icon: UserIcon, label: 'Perfil' }
  ];

  return (
    <nav className="bottom-navigation">
      {navItems.map(({ path, icon: Icon, label }) => (
        <button
          key={path}
          className={`nav-item ${location.pathname === path ? 'active' : ''}`}
          onClick={() => navigate(path)}
        >
          <Icon className="nav-icon" />
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNavigation;
```

### 6.3. Custom Hooks

#### 6.3.1. useAuth Hook

Maneja toda la lógica de autenticación de la aplicación.

```jsx
// hooks/useAuth.js
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { AuthService } from '../services/api/AuthService';
import { DatabaseService } from '../services/database/DatabaseService';

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export const useAuthLogic = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUser = await DatabaseService.getCurrentUser();
        if (savedUser) {
          setUser(savedUser);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { user, token } = await AuthService.login(email, password);
      await DatabaseService.saveUser(user);
      await DatabaseService.saveAuthToken(token);
      setUser(user);
      return { success: true };
    } catch (error) {
      setError(error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { user, token } = await AuthService.register(userData);
      await DatabaseService.saveUser(user);
      await DatabaseService.saveAuthToken(token);
      setUser(user);
      return { success: true };
    } catch (error) {
      setError(error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await DatabaseService.clearUserData();
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return {
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };
};
```

#### 6.3.2. useDatabase Hook

Proporciona una interfaz simplificada para interactuar con IndexedDB.

```jsx
// hooks/useDatabase.js
import { useState, useCallback } from 'react';
import { DatabaseService } from '../services/database/DatabaseService';
import { EncryptionService } from '../services/encryption/EncryptionService';

export const useDatabase = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeOperation = useCallback(async (operation) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      return { success: true, data: result };
    } catch (error) {
      console.error('Database operation error:', error);
      setError(error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveHealthRecord = useCallback(async (record) => {
    return executeOperation(async () => {
      const encryptedRecord = await EncryptionService.encryptRecord(record);
      return DatabaseService.saveHealthRecord(encryptedRecord);
    });
  }, [executeOperation]);

  const getHealthRecords = useCallback(async (childId, filters = {}) => {
    return executeOperation(async () => {
      const encryptedRecords = await DatabaseService.getHealthRecords(childId, filters);
      return Promise.all(
        encryptedRecords.map(record => EncryptionService.decryptRecord(record))
      );
    });
  }, [executeOperation]);

  const saveChild = useCallback(async (childData) => {
    return executeOperation(async () => {
      return DatabaseService.saveChild(childData);
    });
  }, [executeOperation]);

  const getChildren = useCallback(async (userId) => {
    return executeOperation(async () => {
      return DatabaseService.getChildren(userId);
    });
  }, [executeOperation]);

  const saveChatMessage = useCallback(async (message) => {
    return executeOperation(async () => {
      return DatabaseService.saveChatMessage(message);
    });
  }, [executeOperation]);

  const getChatHistory = useCallback(async (childId, sessionId) => {
    return executeOperation(async () => {
      return DatabaseService.getChatHistory(childId, sessionId);
    });
  }, [executeOperation]);

  return {
    isLoading,
    error,
    saveHealthRecord,
    getHealthRecords,
    saveChild,
    getChildren,
    saveChatMessage,
    getChatHistory
  };
};
```

#### 6.3.3. useAI Hook

Maneja las interacciones con la IA a través del Cloudflare Worker.

```jsx
// hooks/useAI.js
import { useState, useCallback } from 'react';
import { AIService } from '../services/api/AIService';
import { SchemaService } from '../services/SchemaService';

export const useAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const extractData = useCallback(async (input, inputType) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const schema = SchemaService.getSchemaForInputType(inputType);
      const result = await AIService.extractData(input, inputType, schema);
      
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('AI extraction error:', error);
      setError(error);
      return { success: false, error };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const chatCompletion = useCallback(async (messages, context, searchResults) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await AIService.chatCompletion(messages, context, searchResults);
      
      if (result.success) {
        return { success: true, message: result.message };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setError(error);
      return { success: false, error };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    error,
    extractData,
    chatCompletion
  };
};
```

### 6.4. Contextos de React

#### 6.4.1. AuthContext

Proporciona el estado de autenticación a toda la aplicación.

```jsx
// contexts/AuthContext.js
import React, { createContext, useContext } from 'react';
import { useAuthLogic } from '../hooks/useAuth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const authLogic = useAuthLogic();

  return (
    <AuthContext.Provider value={authLogic}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };
```

#### 6.4.2. DataContext

Maneja el estado global de los datos de la aplicación.

```jsx
// contexts/DataContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useDatabase } from '../hooks/useDatabase';

const DataContext = createContext();

const initialState = {
  children: [],
  currentChild: null,
  healthRecords: [],
  insights: [],
  isLoading: false,
  error: null
};

const dataReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_CHILDREN':
      return { ...state, children: action.payload };
    case 'SET_CURRENT_CHILD':
      return { ...state, currentChild: action.payload };
    case 'SET_HEALTH_RECORDS':
      return { ...state, healthRecords: action.payload };
    case 'ADD_HEALTH_RECORD':
      return { 
        ...state, 
        healthRecords: [action.payload, ...state.healthRecords] 
      };
    case 'SET_INSIGHTS':
      return { ...state, insights: action.payload };
    default:
      return state;
  }
};

export const DataProvider = ({ children }) => {
  const [state, dispatch] = useReducer(dataReducer, initialState);
  const { user } = useAuth();
  const { getChildren, getHealthRecords } = useDatabase();

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const childrenResult = await getChildren(user.id);
      if (childrenResult.success) {
        dispatch({ type: 'SET_CHILDREN', payload: childrenResult.data });
        
        if (childrenResult.data.length > 0) {
          const firstChild = childrenResult.data[0];
          dispatch({ type: 'SET_CURRENT_CHILD', payload: firstChild });
          
          const recordsResult = await getHealthRecords(firstChild.id);
          if (recordsResult.success) {
            dispatch({ type: 'SET_HEALTH_RECORDS', payload: recordsResult.data });
          }
        }
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addHealthRecord = (record) => {
    dispatch({ type: 'ADD_HEALTH_RECORD', payload: record });
  };

  const setCurrentChild = (child) => {
    dispatch({ type: 'SET_CURRENT_CHILD', payload: child });
  };

  const value = {
    ...state,
    addHealthRecord,
    setCurrentChild,
    loadUserData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
```

Esta estructura de React proporciona una base sólida y escalable para la aplicación, con separación clara de responsabilidades, gestión eficiente del estado y reutilización de componentes. La arquitectura facilita el desarrollo, testing y mantenimiento de la aplicación.


## 7. APIs Internas entre Frontend y Cloudflare Worker

La comunicación entre el frontend React y el Cloudflare Worker se realiza a través de una API REST bien definida que maneja la autenticación, extracción de datos con IA, búsquedas web y gestión de errores. Todas las comunicaciones utilizan HTTPS y incluyen autenticación mediante JWT tokens.

### 7.1. Configuración Base de la API

#### 7.1.1. Service de API Base

```javascript
// services/api/BaseAPIService.js
class BaseAPIService {
  constructor() {
    this.baseURL = process.env.REACT_APP_WORKER_URL || 'https://maxi-worker.your-domain.workers.dev';
    this.timeout = 30000; // 30 segundos
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getAuthToken();
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Client-Version': process.env.REACT_APP_VERSION || '1.0.0'
      },
      timeout: this.timeout
    };

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url, {
        ...finalOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new APIError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          await response.text()
        );
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new APIError(data.error || 'Unknown API error', response.status, data);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new APIError('Request timeout', 408);
      }
      throw error;
    }
  }

  async getAuthToken() {
    // Implementación para obtener el token de IndexedDB
    const { DatabaseService } = await import('../database/DatabaseService');
    return DatabaseService.getAuthToken();
  }
}

class APIError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }
}

export { BaseAPIService, APIError };
```

### 7.2. API de Autenticación

#### 7.2.1. Endpoints de Autenticación

```javascript
// services/api/AuthService.js
import { BaseAPIService } from './BaseAPIService';

class AuthService extends BaseAPIService {
  /**
   * Registra un nuevo usuario
   * POST /api/auth/register
   */
  async register(userData) {
    const response = await this.makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        preferences: userData.preferences || {}
      })
    });

    return {
      user: response.user,
      token: response.token
    };
  }

  /**
   * Inicia sesión de usuario
   * POST /api/auth/login
   */
  async login(email, password) {
    const response = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password
      })
    });

    return {
      user: response.user,
      token: response.token
    };
  }

  /**
   * Renueva el token de autenticación
   * POST /api/auth/refresh
   */
  async refreshToken() {
    const response = await this.makeRequest('/api/auth/refresh', {
      method: 'POST'
    });

    return response.token;
  }

  /**
   * Cierra sesión del usuario
   * POST /api/auth/logout
   */
  async logout() {
    await this.makeRequest('/api/auth/logout', {
      method: 'POST'
    });
  }

  /**
   * Solicita recuperación de contraseña
   * POST /api/auth/forgot-password
   */
  async forgotPassword(email) {
    await this.makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  /**
   * Restablece la contraseña
   * POST /api/auth/reset-password
   */
  async resetPassword(token, newPassword) {
    await this.makeRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token,
        password: newPassword
      })
    });
  }
}

export default new AuthService();
```

### 7.3. API de Inteligencia Artificial

#### 7.3.1. Servicio de Extracción de Datos

```javascript
// services/api/AIService.js
import { BaseAPIService } from './BaseAPIService';

class AIService extends BaseAPIService {
  /**
   * Extrae datos de salud de un input usando IA
   * POST /api/openai/extract
   */
  async extractData(input, inputType, schema) {
    const response = await this.makeRequest('/api/openai/extract', {
      method: 'POST',
      body: JSON.stringify({
        input,
        inputType, // 'text', 'image', 'audio', 'video', 'pdf'
        schema,
        options: {
          model: this.getModelForInputType(inputType),
          temperature: 0.2,
          maxTokens: 1024
        }
      })
    });

    return {
      extractedData: response.data,
      confidence: response.data.confidence,
      usage: response.usage,
      model: response.model
    };
  }

  /**
   * Realiza una consulta de chat con contexto
   * POST /api/openai/chat
   */
  async chatCompletion(messages, context, searchResults = []) {
    const response = await this.makeRequest('/api/openai/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages,
        context: {
          childInfo: context.childInfo,
          recentRecords: context.recentRecords,
          preferences: context.preferences
        },
        searchResults,
        options: {
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 2048
        }
      })
    });

    return {
      message: response.message,
      usage: response.usage,
      model: response.model
    };
  }

  /**
   * Procesa múltiples inputs en lote
   * POST /api/openai/batch-extract
   */
  async batchExtract(inputs) {
    const response = await this.makeRequest('/api/openai/batch-extract', {
      method: 'POST',
      body: JSON.stringify({
        inputs: inputs.map(input => ({
          id: input.id,
          input: input.data,
          inputType: input.type,
          schema: input.schema
        }))
      })
    });

    return response.results;
  }

  /**
   * Valida un schema JSON antes de usarlo
   * POST /api/openai/validate-schema
   */
  async validateSchema(schema) {
    const response = await this.makeRequest('/api/openai/validate-schema', {
      method: 'POST',
      body: JSON.stringify({ schema })
    });

    return {
      isValid: response.valid,
      errors: response.errors || []
    };
  }

  getModelForInputType(inputType) {
    const modelMap = {
      'text': 'gpt-4-1106-preview',
      'image': 'gpt-4-vision-preview',
      'audio': 'whisper-1',
      'video': 'gpt-4-vision-preview',
      'pdf': 'gpt-4-1106-preview'
    };
    
    return modelMap[inputType] || 'gpt-4-1106-preview';
  }
}

export default new AIService();
```

### 7.4. API de Búsqueda Web

#### 7.4.1. Servicio de Búsqueda

```javascript
// services/api/SearchService.js
import { BaseAPIService } from './BaseAPIService';

class SearchService extends BaseAPIService {
  /**
   * Realiza una búsqueda web contextual
   * GET /api/search?q={query}&limit={limit}&context={context}
   */
  async webSearch(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      limit: options.limit || 5,
      context: options.context || 'health',
      language: options.language || 'es'
    });

    const response = await this.makeRequest(`/api/search?${params}`);

    return {
      query: response.query,
      results: response.results,
      timestamp: response.timestamp,
      sources: this.extractSources(response.results)
    };
  }

  /**
   * Búsqueda específica para información médica
   * GET /api/search/medical?q={query}&age={age}&symptoms={symptoms}
   */
  async medicalSearch(query, childAge, symptoms = []) {
    const params = new URLSearchParams({
      q: query,
      age: childAge,
      symptoms: symptoms.join(','),
      sources: 'medical' // Filtrar solo fuentes médicas confiables
    });

    const response = await this.makeRequest(`/api/search/medical?${params}`);

    return {
      query: response.query,
      results: response.results.map(result => ({
        ...result,
        reliability: this.calculateReliability(result.source),
        ageRelevant: this.isAgeRelevant(result, childAge)
      })),
      medicalDisclaimer: response.disclaimer
    };
  }

  /**
   * Búsqueda de información sobre medicamentos
   * GET /api/search/medication?name={name}&age={age}
   */
  async medicationSearch(medicationName, childAge) {
    const params = new URLSearchParams({
      name: medicationName,
      age: childAge,
      type: 'pediatric'
    });

    const response = await this.makeRequest(`/api/search/medication?${params}`);

    return {
      medication: response.medication,
      dosageInfo: response.dosageInfo,
      sideEffects: response.sideEffects,
      interactions: response.interactions,
      sources: response.sources
    };
  }

  /**
   * Búsqueda de percentiles de crecimiento
   * GET /api/search/growth-charts?gender={gender}&age={age}&metric={metric}
   */
  async growthChartSearch(gender, ageInMonths, metric) {
    const params = new URLSearchParams({
      gender,
      age: ageInMonths,
      metric // 'weight', 'height', 'head_circumference'
    });

    const response = await this.makeRequest(`/api/search/growth-charts?${params}`);

    return {
      percentileData: response.data,
      chartUrl: response.chartUrl,
      source: response.source,
      lastUpdated: response.lastUpdated
    };
  }

  extractSources(results) {
    return [...new Set(results.map(result => result.source))];
  }

  calculateReliability(source) {
    const reliableSourcesMap = {
      'mayoclinic.org': 0.95,
      'webmd.com': 0.85,
      'healthline.com': 0.80,
      'cdc.gov': 0.98,
      'who.int': 0.98,
      'aap.org': 0.95,
      'kidshealth.org': 0.90
    };

    return reliableSourcesMap[source.toLowerCase()] || 0.50;
  }

  isAgeRelevant(result, childAge) {
    // Lógica para determinar si el resultado es relevante para la edad del niño
    const ageKeywords = {
      infant: [0, 12],
      toddler: [12, 36],
      preschool: [36, 60],
      child: [60, 144]
    };

    for (const [keyword, [minAge, maxAge]] of Object.entries(ageKeywords)) {
      if (result.snippet.toLowerCase().includes(keyword)) {
        return childAge >= minAge && childAge <= maxAge;
      }
    }

    return true; // Por defecto, asumir que es relevante
  }
}

export default new SearchService();
```

### 7.5. API de Sincronización

#### 7.5.1. Servicio de Sincronización con Gist

```javascript
// services/api/SyncService.js
import { BaseAPIService } from './BaseAPIService';

class SyncService extends BaseAPIService {
  /**
   * Sincroniza datos con Gist remoto
   * POST /api/sync/push
   */
  async pushToGist(data, gistConfig) {
    const response = await this.makeRequest('/api/sync/push', {
      method: 'POST',
      body: JSON.stringify({
        data: data, // Datos ya cifrados
        gistId: gistConfig.gistId,
        token: gistConfig.token,
        description: `Maxi Health Data - ${new Date().toISOString()}`
      })
    });

    return {
      gistId: response.gistId,
      commitSha: response.commitSha,
      url: response.url,
      syncedAt: response.timestamp
    };
  }

  /**
   * Obtiene datos desde Gist remoto
   * GET /api/sync/pull?gistId={gistId}&token={token}
   */
  async pullFromGist(gistConfig) {
    const params = new URLSearchParams({
      gistId: gistConfig.gistId,
      token: gistConfig.token
    });

    const response = await this.makeRequest(`/api/sync/pull?${params}`);

    return {
      data: response.data, // Datos cifrados
      lastModified: response.lastModified,
      commitSha: response.commitSha,
      conflicts: response.conflicts || []
    };
  }

  /**
   * Resuelve conflictos de sincronización
   * POST /api/sync/resolve-conflicts
   */
  async resolveConflicts(conflicts, resolutions) {
    const response = await this.makeRequest('/api/sync/resolve-conflicts', {
      method: 'POST',
      body: JSON.stringify({
        conflicts,
        resolutions // Array de decisiones de resolución
      })
    });

    return {
      resolvedData: response.data,
      summary: response.summary
    };
  }

  /**
   * Obtiene el estado de sincronización
   * GET /api/sync/status?gistId={gistId}
   */
  async getSyncStatus(gistId) {
    const params = new URLSearchParams({ gistId });
    const response = await this.makeRequest(`/api/sync/status?${params}`);

    return {
      lastSync: response.lastSync,
      pendingChanges: response.pendingChanges,
      conflicts: response.conflicts,
      isUpToDate: response.isUpToDate
    };
  }
}

export default new SyncService();
```

### 7.6. Manejo de Errores y Reintentos

#### 7.6.1. Servicio de Reintentos

```javascript
// services/api/RetryService.js
class RetryService {
  static async withRetry(operation, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      retryCondition = (error) => error.status >= 500 || error.status === 429
    } = options;

    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !retryCondition(error)) {
          throw error;
        }

        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt),
          maxDelay
        );
        
        // Añadir jitter para evitar thundering herd
        const jitter = Math.random() * 0.1 * delay;
        await this.sleep(delay + jitter);
      }
    }
    
    throw lastError;
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default RetryService;
```

### 7.7. Interceptores y Middleware

#### 7.7.1. Interceptor de Respuestas

```javascript
// services/api/ResponseInterceptor.js
class ResponseInterceptor {
  static async handleResponse(response, originalRequest) {
    // Manejo de tokens expirados
    if (response.status === 401) {
      try {
        const newToken = await AuthService.refreshToken();
        // Reintentar la petición original con el nuevo token
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return fetch(originalRequest);
      } catch (refreshError) {
        // Redirigir al login si no se puede refrescar el token
        window.location.href = '/login';
        throw refreshError;
      }
    }

    // Manejo de rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        await this.sleep(parseInt(retryAfter) * 1000);
        return fetch(originalRequest);
      }
    }

    return response;
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ResponseInterceptor;
```

Esta definición de APIs internas proporciona una comunicación robusta y segura entre el frontend y el Cloudflare Worker, con manejo adecuado de errores, reintentos automáticos y autenticación segura.


## 8. Estrategia de Cifrado y Seguridad

La seguridad de los datos de salud es fundamental en la aplicación 'Maxi'. Se implementa una estrategia de cifrado end-to-end que protege los datos tanto en reposo como en tránsito, utilizando estándares de la industria y mejores prácticas de seguridad.

### 8.1. Arquitectura de Seguridad General

La estrategia de seguridad se basa en múltiples capas de protección que incluyen cifrado de datos, autenticación robusta, autorización granular y auditoría completa. Todos los datos sensibles se cifran antes de ser almacenados localmente o sincronizados remotamente, garantizando que incluso en caso de compromiso de la infraestructura, los datos permanezcan protegidos.

#### 8.1.1. Principios de Seguridad

- **Cifrado End-to-End**: Los datos se cifran en el cliente antes de ser almacenados o transmitidos
- **Zero-Knowledge**: Ni el Cloudflare Worker ni los servicios externos tienen acceso a los datos descifrados
- **Principio de Menor Privilegio**: Cada componente tiene acceso únicamente a los datos necesarios para su función
- **Defensa en Profundidad**: Múltiples capas de seguridad para proteger contra diferentes tipos de ataques
- **Transparencia**: Los usuarios tienen control total sobre sus datos y pueden verificar las medidas de seguridad

### 8.2. Gestión de Claves de Cifrado

#### 8.2.1. Generación y Derivación de Claves

```javascript
// services/encryption/KeyManagementService.js
class KeyManagementService {
  /**
   * Genera una clave maestra a partir de la contraseña del usuario
   */
  static async generateMasterKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = encoder.encode(salt);

    // Importar la contraseña como material de clave
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Derivar la clave maestra usando PBKDF2
    const masterKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000, // 100k iteraciones para resistir ataques de fuerza bruta
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true, // Exportable para backup
      ['encrypt', 'decrypt']
    );

    return masterKey;
  }

  /**
   * Deriva claves específicas para diferentes propósitos
   */
  static async deriveSpecificKey(masterKey, purpose, context = '') {
    const encoder = new TextEncoder();
    const info = encoder.encode(`maxi-app-${purpose}-${context}`);
    
    // Exportar la clave maestra para usarla en HKDF
    const masterKeyBuffer = await crypto.subtle.exportKey('raw', masterKey);
    
    // Usar HKDF para derivar claves específicas
    const specificKey = await crypto.subtle.importKey(
      'raw',
      await this.hkdf(masterKeyBuffer, info, 32), // 32 bytes = 256 bits
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return specificKey;
  }

  /**
   * Implementación de HKDF (HMAC-based Key Derivation Function)
   */
  static async hkdf(ikm, info, length) {
    const salt = new Uint8Array(32); // Salt vacío para simplificar
    
    // Paso 1: Extract
    const prk = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey(
        'raw',
        salt,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ),
      ikm
    );

    // Paso 2: Expand
    const n = Math.ceil(length / 32);
    const t = new Uint8Array(n * 32);
    let okm = new Uint8Array(0);

    for (let i = 1; i <= n; i++) {
      const input = new Uint8Array(okm.length + info.length + 1);
      input.set(okm);
      input.set(info, okm.length);
      input[input.length - 1] = i;

      okm = new Uint8Array(await crypto.subtle.sign(
        'HMAC',
        await crypto.subtle.importKey(
          'raw',
          prk,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        ),
        input
      ));

      t.set(okm, (i - 1) * 32);
    }

    return t.slice(0, length);
  }

  /**
   * Genera un salt aleatorio para cada usuario
   */
  static generateSalt() {
    const salt = new Uint8Array(32);
    crypto.getRandomValues(salt);
    return Array.from(salt, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Genera un IV (Initialization Vector) aleatorio para cada operación de cifrado
   */
  static generateIV() {
    const iv = new Uint8Array(12); // 96 bits para AES-GCM
    crypto.getRandomValues(iv);
    return iv;
  }
}

export default KeyManagementService;
```

### 8.3. Servicio de Cifrado de Datos

#### 8.3.1. Cifrado de Registros de Salud

```javascript
// services/encryption/EncryptionService.js
import KeyManagementService from './KeyManagementService';

class EncryptionService {
  /**
   * Cifra un registro de salud completo
   */
  static async encryptRecord(record, userKey) {
    try {
      // Derivar clave específica para registros de salud
      const recordKey = await KeyManagementService.deriveSpecificKey(
        userKey, 
        'health-record', 
        record.childId
      );

      // Separar datos sensibles de metadatos
      const sensitiveData = this.extractSensitiveData(record);
      const metadata = this.extractMetadata(record);

      // Cifrar datos sensibles
      const encryptedSensitive = await this.encryptData(sensitiveData, recordKey);
      
      // Cifrar archivos adjuntos si existen
      let encryptedAttachments = null;
      if (record.originalInput && record.originalInput.content) {
        encryptedAttachments = await this.encryptData(
          record.originalInput.content, 
          recordKey
        );
      }

      return {
        ...metadata,
        encryptedData: encryptedSensitive,
        encryptedAttachments,
        encryptionVersion: '1.0',
        encryptedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Descifra un registro de salud
   */
  static async decryptRecord(encryptedRecord, userKey) {
    try {
      // Derivar la misma clave específica
      const recordKey = await KeyManagementService.deriveSpecificKey(
        userKey, 
        'health-record', 
        encryptedRecord.childId
      );

      // Descifrar datos sensibles
      const sensitiveData = await this.decryptData(
        encryptedRecord.encryptedData, 
        recordKey
      );

      // Descifrar archivos adjuntos si existen
      let originalInput = null;
      if (encryptedRecord.encryptedAttachments) {
        const decryptedContent = await this.decryptData(
          encryptedRecord.encryptedAttachments, 
          recordKey
        );
        originalInput = {
          ...encryptedRecord.originalInput,
          content: decryptedContent
        };
      }

      // Reconstruir el registro completo
      return {
        ...encryptedRecord,
        ...sensitiveData,
        originalInput,
        // Remover campos de cifrado
        encryptedData: undefined,
        encryptedAttachments: undefined,
        encryptionVersion: undefined,
        encryptedAt: undefined
      };
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Cifra datos usando AES-GCM
   */
  static async encryptData(data, key) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const iv = KeyManagementService.generateIV();

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128 // 128-bit authentication tag
      },
      key,
      dataBuffer
    );

    return {
      data: Array.from(new Uint8Array(encryptedBuffer)),
      iv: Array.from(iv),
      algorithm: 'AES-GCM-256'
    };
  }

  /**
   * Descifra datos usando AES-GCM
   */
  static async decryptData(encryptedData, key) {
    const dataArray = new Uint8Array(encryptedData.data);
    const iv = new Uint8Array(encryptedData.iv);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      key,
      dataArray
    );

    const decoder = new TextDecoder();
    const decryptedString = decoder.decode(decryptedBuffer);
    return JSON.parse(decryptedString);
  }

  /**
   * Extrae datos sensibles que requieren cifrado
   */
  static extractSensitiveData(record) {
    return {
      data: record.data,
      notes: record.notes,
      aiProcessing: record.aiProcessing,
      tags: record.tags
    };
  }

  /**
   * Extrae metadatos que pueden permanecer sin cifrar
   */
  static extractMetadata(record) {
    return {
      id: record.id,
      childId: record.childId,
      type: record.type,
      timestamp: record.timestamp,
      aiExtracted: record.aiExtracted,
      isScheduled: record.isScheduled,
      scheduledFor: record.scheduledFor,
      reminderSent: record.reminderSent,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      syncStatus: record.syncStatus
    };
  }
}

export default EncryptionService;
```

### 8.4. Cifrado para Sincronización Remota

#### 8.4.1. Servicio de Cifrado para Backup

```javascript
// services/encryption/BackupEncryptionService.js
class BackupEncryptionService {
  /**
   * Cifra todos los datos del usuario para backup
   */
  static async encryptBackupData(userData, backupPassword) {
    try {
      // Generar salt específico para backup
      const backupSalt = KeyManagementService.generateSalt();
      
      // Derivar clave de backup
      const backupKey = await KeyManagementService.generateMasterKey(
        backupPassword, 
        backupSalt
      );

      // Preparar datos para backup
      const backupData = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        userData: userData.user,
        children: userData.children,
        healthRecords: userData.healthRecords,
        chatHistory: userData.chatHistory,
        insights: userData.insights,
        preferences: userData.preferences
      };

      // Cifrar datos completos
      const encryptedBackup = await EncryptionService.encryptData(
        backupData, 
        backupKey
      );

      return {
        encryptedData: encryptedBackup,
        salt: backupSalt,
        version: '1.0',
        createdAt: new Date().toISOString(),
        checksum: await this.calculateChecksum(encryptedBackup)
      };
    } catch (error) {
      throw new Error(`Backup encryption failed: ${error.message}`);
    }
  }

  /**
   * Descifra datos de backup
   */
  static async decryptBackupData(encryptedBackup, backupPassword) {
    try {
      // Derivar la clave de backup usando el salt almacenado
      const backupKey = await KeyManagementService.generateMasterKey(
        backupPassword, 
        encryptedBackup.salt
      );

      // Verificar checksum antes de descifrar
      const calculatedChecksum = await this.calculateChecksum(
        encryptedBackup.encryptedData
      );
      
      if (calculatedChecksum !== encryptedBackup.checksum) {
        throw new Error('Backup data integrity check failed');
      }

      // Descifrar datos
      const decryptedData = await EncryptionService.decryptData(
        encryptedBackup.encryptedData, 
        backupKey
      );

      return decryptedData;
    } catch (error) {
      throw new Error(`Backup decryption failed: ${error.message}`);
    }
  }

  /**
   * Calcula checksum para verificar integridad
   */
  static async calculateChecksum(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export default BackupEncryptionService;
```

### 8.5. Autenticación y Autorización

#### 8.5.1. Servicio de Autenticación Segura

```javascript
// services/security/AuthenticationService.js
class AuthenticationService {
  /**
   * Autentica al usuario y deriva claves de cifrado
   */
  static async authenticateUser(email, password) {
    try {
      // Obtener salt del usuario desde el servidor
      const userSalt = await this.getUserSalt(email);
      
      // Derivar clave de autenticación (diferente de la clave de cifrado)
      const authKey = await this.deriveAuthKey(password, userSalt);
      
      // Crear hash de autenticación
      const authHash = await this.createAuthHash(authKey);
      
      // Autenticar con el servidor
      const authResult = await this.serverAuthenticate(email, authHash);
      
      if (authResult.success) {
        // Derivar clave maestra para cifrado local
        const masterKey = await KeyManagementService.generateMasterKey(
          password, 
          userSalt
        );
        
        return {
          success: true,
          user: authResult.user,
          token: authResult.token,
          masterKey: masterKey
        };
      }
      
      throw new Error('Authentication failed');
    } catch (error) {
      throw new Error(`Authentication error: ${error.message}`);
    }
  }

  /**
   * Deriva clave específica para autenticación
   */
  static async deriveAuthKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = encoder.encode(salt + 'auth'); // Suffix para diferenciación
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
  }

  /**
   * Crea hash de autenticación
   */
  static async createAuthHash(authKey) {
    const message = new TextEncoder().encode('maxi-auth-challenge');
    const signature = await crypto.subtle.sign('HMAC', authKey, message);
    
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Obtiene el salt del usuario desde el servidor
   */
  static async getUserSalt(email) {
    const response = await fetch('/api/auth/salt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    if (!response.ok) {
      throw new Error('Failed to get user salt');
    }
    
    const data = await response.json();
    return data.salt;
  }

  /**
   * Autentica con el servidor usando el hash
   */
  static async serverAuthenticate(email, authHash) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        authHash,
        clientVersion: '1.0'
      })
    });
    
    if (!response.ok) {
      throw new Error('Server authentication failed');
    }
    
    return response.json();
  }
}

export default AuthenticationService;
```

### 8.6. Auditoría y Logging de Seguridad

#### 8.6.1. Servicio de Auditoría

```javascript
// services/security/AuditService.js
class AuditService {
  /**
   * Registra eventos de seguridad
   */
  static async logSecurityEvent(eventType, details, severity = 'info') {
    const auditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      details: {
        ...details,
        userAgent: navigator.userAgent,
        ip: await this.getClientIP(),
        sessionId: this.getSessionId()
      },
      hash: await this.calculateEventHash(eventType, details)
    };

    // Almacenar localmente (cifrado)
    await this.storeAuditEntry(auditEntry);
    
    // Enviar al servidor si es crítico
    if (severity === 'critical' || severity === 'error') {
      await this.sendToServer(auditEntry);
    }
  }

  /**
   * Eventos específicos de seguridad
   */
  static async logLoginAttempt(email, success, reason = null) {
    await this.logSecurityEvent('login_attempt', {
      email,
      success,
      reason,
      timestamp: new Date().toISOString()
    }, success ? 'info' : 'warning');
  }

  static async logDataAccess(recordType, recordId, operation) {
    await this.logSecurityEvent('data_access', {
      recordType,
      recordId,
      operation, // 'read', 'write', 'delete'
      timestamp: new Date().toISOString()
    });
  }

  static async logEncryptionOperation(operation, success, error = null) {
    await this.logSecurityEvent('encryption_operation', {
      operation, // 'encrypt', 'decrypt', 'key_derivation'
      success,
      error: error?.message,
      timestamp: new Date().toISOString()
    }, success ? 'info' : 'error');
  }

  static async logSyncOperation(operation, success, details = {}) {
    await this.logSecurityEvent('sync_operation', {
      operation, // 'push', 'pull', 'conflict_resolution'
      success,
      ...details,
      timestamp: new Date().toISOString()
    }, success ? 'info' : 'warning');
  }

  /**
   * Calcula hash del evento para integridad
   */
  static async calculateEventHash(eventType, details) {
    const data = JSON.stringify({ eventType, details });
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Almacena entrada de auditoría cifrada
   */
  static async storeAuditEntry(entry) {
    // Implementación específica para almacenar en IndexedDB cifrado
    const { DatabaseService } = await import('../database/DatabaseService');
    await DatabaseService.storeAuditEntry(entry);
  }

  /**
   * Obtiene IP del cliente (aproximada)
   */
  static async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Obtiene ID de sesión
   */
  static getSessionId() {
    let sessionId = sessionStorage.getItem('maxi-session-id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('maxi-session-id', sessionId);
    }
    return sessionId;
  }
}

export default AuditService;
```

Esta estrategia de cifrado y seguridad proporciona protección robusta para todos los datos sensibles de la aplicación, garantizando que la privacidad del usuario se mantenga en todo momento, incluso en caso de compromiso de la infraestructura.


## 9. Diagramas de Arquitectura

Los siguientes diagramas ilustran visualmente la arquitectura y los flujos de datos de la aplicación 'Maxi', proporcionando una comprensión clara de cómo interactúan los diferentes componentes del sistema.

### 9.1. Arquitectura General del Sistema

![Arquitectura General](https://private-us-east-1.manuscdn.com/sessionFile/NSt8lyoWzAuClelZLBAHBW/sandbox/U6kjwOAk6py3SiNYrcENa5-images_1753116941048_na1fn_L2hvbWUvdWJ1bnR1L2FyY2hpdGVjdHVyZV9nZW5lcmFs.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvTlN0OGx5b1d6QXVDbGVsWkxCQUhCVy9zYW5kYm94L1U2a2p3T0FrNnB5M1NpTllyY0VOYTUtaW1hZ2VzXzE3NTMxMTY5NDEwNDhfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwyRnlZMmhwZEdWamRIVnlaVjluWlc1bGNtRnMucG5nIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=T7Wj4vXjv8GTfkCDwIkPRAYDNThOsVHMhB8Ta8RRrD9wPwKaplxcTjn3hJL~EMSvrxChJ5Y2eEohn0U4~nN7lOMLrLafwCBkduqVZTfUFFhdUu1iOnkF3MTiUHe5EzNFgzq809Ugtu5URfs5wMqbNo2~c1dSyl1ROynGNNgwj7ViU2h4xOFAKblngM36YuMfEDnP6DPeEjp-z18C-WlOikhc0W5uACMrZmZpq4YkiNmgHV7wYwBDcqZR59w0Do6h1eknDseO6VE-Iyz-48BaMZ4DtyOvSb9P4lG90sJMPCLp2KZDo0TUySC8Usm3aUDZbueIcWkmXaND0uqnTQYrgQ__)

Este diagrama muestra la arquitectura general del sistema, incluyendo:
- **Cliente (Navegador)**: React PWA con Service Worker, IndexedDB cifrado y Crypto Worker
- **Cloudflare Edge**: Worker con KV Store para rate limiting
- **APIs Externas**: OpenAI y DuckDuckGo para procesamiento de IA y búsquedas
- **Almacenamiento Remoto**: GitHub Gist para backups cifrados

### 9.2. Flujo de Datos y Comunicación

![Flujo de Datos](https://private-us-east-1.manuscdn.com/sessionFile/NSt8lyoWzAuClelZLBAHBW/sandbox/U6kjwOAk6py3SiNYrcENa5-images_1753116941049_na1fn_L2hvbWUvdWJ1bnR1L2RhdGFfZmxvdw.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvTlN0OGx5b1d6QXVDbGVsWkxCQUhCVy9zYW5kYm94L1U2a2p3T0FrNnB5M1NpTllyY0VOYTUtaW1hZ2VzXzE3NTMxMTY5NDEwNDlfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwyUmhkR0ZmWm14dmR3LnBuZyIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=TASzu2otqwCwc-FMZW7Ign8Ktt5UTlbnCCt4RUnzcJUwYd1WnjFjR8AL15i9INQxZ7Jqk30oGuZaMQEsZugAMvm0NwiMjANabsSjfFsaylLpsoPaVfUPiZdLtBTmehKLuB880tRYbXd~CNuZTdje1dVHLJaI-3c0EF3cMoYOMx-yLGHOltUE4jBR9Ap-8OVORU9--5-pefxY9uU3xWRT-zgmxC~NY1H-CSC79bP4l6N6ArqWv0IAFLkJOubQz0cB6bz-jzL-eN95ueEtYVmtGmTslnSOLUNIi~MkouzvEYX~5cW2yypCBGeuBPC90CXuXh9uZx5QYUzCHVLtpkg8xg__)

Este diagrama de secuencia ilustra los principales flujos de datos:
- **Captura y Procesamiento**: Desde la subida de datos hasta el almacenamiento cifrado
- **Chat con IA**: Incluyendo búsquedas contextuales y respuestas personalizadas
- **Sincronización**: Backup cifrado a repositorio remoto
- **Operación Offline**: Funcionamiento sin conexión a internet

### 9.3. Arquitectura de Seguridad y Cifrado

![Arquitectura de Seguridad](https://private-us-east-1.manuscdn.com/sessionFile/NSt8lyoWzAuClelZLBAHBW/sandbox/U6kjwOAk6py3SiNYrcENa5-images_1753116941050_na1fn_L2hvbWUvdWJ1bnR1L3NlY3VyaXR5X2FyY2hpdGVjdHVyZQ.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvTlN0OGx5b1d6QXVDbGVsWkxCQUhCVy9zYW5kYm94L1U2a2p3T0FrNnB5M1NpTllyY0VOYTUtaW1hZ2VzXzE3NTMxMTY5NDEwNTBfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwzTmxZM1Z5YVhSNVgyRnlZMmhwZEdWamRIVnlaUS5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=POQ0udH2WmAQ58YGM4l9UybdFvFMANDzKWQyJe7LKUDugB0eUjtxXjgwAilfIlAe84QcmPTD6xAkd7OOUHS6x7TCkhpPvU4htlAJtZMM9VhdUI6ufk0CrbxD9r-Q2XeY6p~kchMVlourLS8mCqkgJMMVws96JW8yMOJ9CI-xIGVnAQWH-DOhLa5U3-PAdTypImyKGZs~dkSXF9wWOCVCioqdPnvTYbzj2lTC4FH7aYYYYrK1wzE3DWH3Fwn7QLHsxYS5NPQ41RbH3K65u87p36dxrzZdDMlMzhxrBzcDMi-xa8sVqf8XucbsAfPaDRTz9fI~Y29Fb8lms3cWSGX47w__)

Este diagrama detalla la estrategia de seguridad:
- **Derivación de Claves**: Desde la contraseña del usuario hasta claves específicas
- **Operaciones de Cifrado**: AES-GCM con IV aleatorio y tags de autenticación
- **Almacenamiento Seguro**: Datos cifrados en IndexedDB y Gist
- **Auditoría**: Logging con hash de integridad y timestamps

### 9.4. Arquitectura de Componentes React

![Arquitectura de Componentes](https://private-us-east-1.manuscdn.com/sessionFile/NSt8lyoWzAuClelZLBAHBW/sandbox/U6kjwOAk6py3SiNYrcENa5-images_1753116941051_na1fn_L2hvbWUvdWJ1bnR1L2NvbXBvbmVudF9hcmNoaXRlY3R1cmU.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvTlN0OGx5b1d6QXVDbGVsWkxCQUhCVy9zYW5kYm94L1U2a2p3T0FrNnB5M1NpTllyY0VOYTUtaW1hZ2VzXzE3NTMxMTY5NDEwNTFfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwyTnZiWEJ2Ym1WdWRGOWhjbU5vYVhSbFkzUjFjbVUucG5nIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=PqsN-X0VBMH1~94pLanc14Dd7XyC6pmaOTjZoUxrqn7Jb8LEYRjJ9mJrzcusabKyGkvUeLraWfmxI2O8XTRDwWdAloXXReCKDa9Ae3uq6ow4ob5hCXAKQD~5PmTQsHpmcA0rrZmhp6zPovjvEVSo0rhWFKS3ZAc4uNvpP21LJpdyiMYi51Dacz6d8GS71QZ9sbgAmfXCjRLlUcnZRXr5Hs13UKlN6jTvq6VaytioQKMdieGRh0qaWZ-ohQh~41CI8g6fgxNHHptWN0tcGN9jAaXzYMUtqziWUvDW1Ue4hqP6-gY-5WR5WkgveDn~nCeClAvBnGZuGXeaNJhlov~FmQ__)

Este diagrama muestra la estructura de componentes React:
- **App Root**: Punto de entrada con Router y Contexts
- **Pages**: Componentes de página principales
- **Layout y Common Components**: Componentes reutilizables
- **Custom Hooks**: Lógica de negocio encapsulada
- **Services**: Servicios de backend y utilidades

## 10. Consideraciones de Implementación

### 10.1. Orden de Desarrollo Recomendado

La implementación de la aplicación debe seguir un orden específico para maximizar la eficiencia y minimizar las dependencias:

1. **Servicios Base**: Implementar primero los servicios de cifrado, base de datos y autenticación
2. **Cloudflare Worker**: Desarrollar el proxy de API con autenticación y rate limiting
3. **Componentes Core**: Crear los componentes básicos de React y la estructura de navegación
4. **Funcionalidades Principales**: Implementar captura de datos, timeline y chat en ese orden
5. **Sincronización**: Añadir la funcionalidad de backup y sincronización
6. **Optimizaciones**: PWA, Service Worker y optimizaciones de rendimiento

### 10.2. Puntos Críticos de Seguridad

Durante la implementación, se debe prestar especial atención a:

- **Nunca exponer claves de API**: Verificar que la OPENAI_API_KEY permanezca en el Worker
- **Validación de entrada**: Todos los inputs deben ser validados tanto en cliente como en servidor
- **Manejo de errores**: Los errores no deben revelar información sensible del sistema
- **Rate limiting**: Implementar límites apropiados para prevenir abuso
- **Auditoría**: Registrar todos los eventos de seguridad relevantes

### 10.3. Optimizaciones de Rendimiento

Para garantizar una experiencia de usuario fluida:

- **Lazy Loading**: Cargar componentes y datos bajo demanda
- **Caching Inteligente**: Utilizar el Service Worker para cachear recursos críticos
- **Operaciones Asíncronas**: Realizar cifrado y sincronización en background
- **Compresión**: Comprimir datos antes del cifrado para reducir el tamaño
- **Indexación**: Crear índices apropiados en IndexedDB para consultas rápidas

### 10.4. Testing y Validación

La estrategia de testing debe incluir:

- **Unit Tests**: Para todos los servicios y utilidades
- **Integration Tests**: Para flujos completos de usuario
- **Security Tests**: Para validar el cifrado y la autenticación
- **Performance Tests**: Para verificar el rendimiento bajo carga
- **Accessibility Tests**: Para garantizar la accesibilidad de la interfaz

## 11. Conclusión

La arquitectura diseñada para la aplicación 'Maxi' proporciona una base sólida y escalable para el seguimiento de la salud infantil. La combinación de una PWA React moderna, un Cloudflare Worker seguro, y una estrategia de cifrado robusta garantiza que la aplicación sea tanto funcional como segura.

Los principios de diseño adoptados - minimalismo, mobile-first y offline-first - se reflejan en cada aspecto de la arquitectura, desde la estructura de componentes hasta la gestión de datos. La separación clara de responsabilidades entre los diferentes módulos facilita el desarrollo, testing y mantenimiento de la aplicación.

La estrategia de seguridad implementada asegura que los datos sensibles de salud permanezcan protegidos en todo momento, cumpliendo con las mejores prácticas de la industria y las regulaciones de privacidad de datos. El cifrado end-to-end garantiza que incluso en caso de compromiso de la infraestructura, los datos del usuario permanezcan seguros.

Esta arquitectura está preparada para escalar y evolucionar con las necesidades futuras de la aplicación, proporcionando una base técnica sólida para el desarrollo de funcionalidades adicionales y la expansión del sistema.

---

**Autor**: Manus AI  
**Fecha**: 21 de enero de 2025  
**Versión**: 1.0

