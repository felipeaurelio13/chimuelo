import { dataIntegrityService } from './dataIntegrityService';

// Types
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface HealthRecord {
  id: string;
  childId: string;
  type: string;
  timestamp: string;
  data: any;
  aiExtracted: boolean;
  confidence?: number;
}

interface ExtractionRequest {
  input: string;
  inputType: 'text' | 'image' | 'audio' | 'video' | 'pdf';
  schema: any;
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  context?: any;
  searchResults?: Array<any>;
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

class APIService {
  private readonly EXTRACTION_HISTORY_KEY = 'chimuelo_extraction_history';
  private readonly CHAT_HISTORY_KEY = 'chimuelo_chat_history';

  // Procesar datos localmente sin servidor externo
  async extractData(request: ExtractionRequest): Promise<APIResponse> {
    try {
      console.log('APIService: Processing extraction request:', request.inputType);
      
      // Simular delay de procesamiento
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Analizar el input para extraer datos
      const input = request.input.toLowerCase();
      let extractedData: any = {
        type: 'general',
        data: {},
        confidence: 0.85,
        requiresAttention: false,
        notes: '',
        timestamp: new Date().toISOString()
      };

      // Detectar fecha en el texto
      let detectedDate = new Date();
      
      // Patrones de fecha comunes
      if (input.includes('ayer')) {
        detectedDate.setDate(detectedDate.getDate() - 1);
      } else if (input.includes('anteayer') || input.includes('antes de ayer')) {
        detectedDate.setDate(detectedDate.getDate() - 2);
      } else if (input.includes('hace una semana')) {
        detectedDate.setDate(detectedDate.getDate() - 7);
      } else if (input.includes('la semana pasada')) {
        detectedDate.setDate(detectedDate.getDate() - 7);
      } else if (input.includes('hace un mes')) {
        detectedDate.setMonth(detectedDate.getMonth() - 1);
      }
      
      // Buscar fechas explícitas (dd/mm/yyyy o dd-mm-yyyy)
      const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
      const dateMatch = input.match(datePattern);
      if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1; // Los meses en JS son 0-11
        const year = parseInt(dateMatch[3]);
        const fullYear = year < 100 ? 2000 + year : year;
        detectedDate = new Date(fullYear, month, day);
      }

      // Detectar peso
      const pesoMatch = input.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?|kilogramos?)/i);
      if (pesoMatch) {
        const value = parseFloat(pesoMatch[1].replace(',', '.'));
        extractedData.type = 'weight';
        extractedData.data = {
          value,
          unit: 'kg',
          date: detectedDate.toISOString()
        };
        extractedData.confidence = 0.95;
        extractedData.notes = `Peso registrado: ${value} kg`;
      }

      // Detectar temperatura/fiebre
      const tempMatch = input.match(/(\d+(?:[.,]\d+)?)\s*(?:°c|grados?|temperatura)/i) || 
                       input.match(/fiebre\s*(?:de\s*)?(\d+(?:[.,]\d+)?)/i);
      if (tempMatch) {
        const temp = parseFloat(tempMatch[1].replace(',', '.'));
        extractedData.type = 'temperature';
        extractedData.data = {
          value: temp,
          unit: '°C',
          date: detectedDate.toISOString()
        };
        extractedData.confidence = 0.9;
        extractedData.requiresAttention = temp >= 38;
        extractedData.notes = temp >= 38 ? 
          'Temperatura elevada detectada. Considera consultar al pediatra.' : 
          `Temperatura registrada: ${temp}°C`;
      }

      // Detectar talla/altura
      const tallaMatch = input.match(/(\d+(?:[.,]\d+)?)\s*(?:cm|centímetros?|talla|altura)/i);
      if (tallaMatch) {
        const value = parseFloat(tallaMatch[1].replace(',', '.'));
        extractedData.type = 'height';
        extractedData.data = {
          value,
          unit: 'cm',
          date: detectedDate.toISOString()
        };
        extractedData.confidence = 0.92;
        extractedData.notes = `Talla registrada: ${value} cm`;
      }

      // Detectar síntomas
      const sintomasKeywords = ['dolor', 'tos', 'mocos', 'vómito', 'diarrea', 'eruption', 'sarpullido'];
      const hasSymptom = sintomasKeywords.some(keyword => input.includes(keyword));
      if (hasSymptom && extractedData.type === 'general') {
        extractedData.type = 'symptom';
        extractedData.data = {
          description: request.input,
          date: detectedDate.toISOString()
        };
        extractedData.confidence = 0.8;
        extractedData.requiresAttention = true;
        extractedData.notes = 'Síntomas detectados. Monitorear evolución.';
      }

      // Si no se detectó nada específico, guardar como nota
      if (extractedData.type === 'general') {
        extractedData.type = 'note';
        extractedData.data = {
          content: request.input,
          date: detectedDate.toISOString()
        };
        extractedData.confidence = 0.7;
        extractedData.notes = 'Nota general registrada';
      }

      // Actualizar timestamp con la fecha detectada
      extractedData.timestamp = detectedDate.toISOString();

      // Guardar en historial
      this.saveToHistory(this.EXTRACTION_HISTORY_KEY, {
        timestamp: new Date().toISOString(),
        request,
        result: extractedData
      });

      return {
        success: true,
        data: extractedData
      };
    } catch (error: any) {
      console.error('APIService: Extraction error:', error);
      return {
        success: false,
        error: error.message || 'Error al procesar los datos'
      };
    }
  }

  // Chat completions usando OpenAI real via Worker
  async chatCompletion(request: ChatRequest): Promise<APIResponse> {
    try {
      console.log('APIService: Processing chat request with real AI');
      
      // Import dinámico para evitar dependencias circulares
      const { default: openaiService } = await import('./openaiService');
      
      // Verificar disponibilidad del Worker
      const isAvailable = await openaiService.isAvailable();
      if (!isAvailable) {
        throw new Error('El servicio de IA no está disponible. Verifica tu conexión.');
      }

                  // Obtener contexto médico del perfil de Maxi usando el servicio centralizado
            const medicalContext = dataIntegrityService.getMedicalContext();

            // Preparar mensajes con contexto médico personalizado
            const systemPrompt = `Eres un asistente médico especializado en pediatría y salud infantil. 

${medicalContext}

IMPORTANTE:
- Proporciona información precisa y útil sobre el cuidado de bebés
- Siempre recomienda consultar con un pediatra para temas médicos serios
- Sé empático y comprensivo con los padres primerizos
- Usa un lenguaje claro y comprensible
- Si no estás seguro de algo, dilo claramente
- Nunca diagnostiques ni recetes medicamentos
- Enfócate en orientación y primeros auxilios básicos
- Considera la edad específica del bebé en tus respuestas
- Si hay alergias conocidas, mencionálas cuando sea relevante

Responde como si fueras un pediatra experimentado pero cálido y comprensivo.`;

      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt
        },
        ...request.messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        }))
      ];

      // Llamar al servicio OpenAI real
      const response = await openaiService.chatCompletion(messages, request.context);
      
      if (!response) {
        throw new Error('No se recibió respuesta del servicio de IA');
      }

      // Guardar en historial
      this.saveToHistory(this.CHAT_HISTORY_KEY, {
        timestamp: new Date().toISOString(),
        request,
        response
      });

      return {
        success: true,
        data: {
          response,
          usage: { tokens: response.length }
        }
      };
    } catch (error: any) {
      console.error('APIService: Chat error:', error);
      return {
        success: false,
        error: error.message || 'Error al procesar el chat'
      };
    }
  }

  // Búsqueda web simulada
  async webSearch(
    query: string,
    options: { limit?: number; context?: string; language?: string } = {}
  ): Promise<APIResponse> {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        data: {
          results: [
            {
              title: `Información sobre: ${query}`,
              snippet: `Resultados relevantes sobre "${query}" en el contexto de salud infantil.`,
              url: '#'
            }
          ],
          total: 1
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Error en la búsqueda'
      };
    }
  }

  // Health check
  async healthCheck(): Promise<APIResponse> {
    return {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  // Utilidades privadas
  private saveToHistory(key: string, data: any) {
    try {
      const history = this.getHistory(key);
      history.push(data);
      // Mantener solo los últimos 100 registros
      if (history.length > 100) {
        history.shift();
      }
      localStorage.setItem(key, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  }

  private getHistory(key: string): any[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  // Private helper methods
  private getCurrentUserId(): string {
    // Get current user ID from auth context or localStorage
    try {
      const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
      return user.id || 'default_user';
    } catch {
      return 'default_user';
    }
  }

  private calculateAge(birthDate: Date, currentDate: Date): string {
    const birth = new Date(birthDate);
    const current = new Date(currentDate);
    
    let years = current.getFullYear() - birth.getFullYear();
    let months = current.getMonth() - birth.getMonth();
    let days = current.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      const lastDayOfPreviousMonth = new Date(current.getFullYear(), current.getMonth(), 0).getDate();
      days += lastDayOfPreviousMonth;
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    if (years === 0 && months === 0) {
      if (days < 7) {
        return `${days} día${days > 1 ? 's' : ''}`;
      } else {
        const weeks = Math.floor(days / 7);
        return `${weeks} semana${weeks > 1 ? 's' : ''}`;
      }
    } else if (years === 0) {
      return `${months} mes${months > 1 ? 'es' : ''}`;
    } else {
      return `${years} año${years > 1 ? 's' : ''} ${months} mes${months > 1 ? 'es' : ''}`;
    }
  }
}

// Export singleton instance
export const apiService = new APIService();

// Export types
export type {
  APIResponse,
  HealthRecord,
  ExtractionRequest,
  ChatRequest,
};

export default apiService;