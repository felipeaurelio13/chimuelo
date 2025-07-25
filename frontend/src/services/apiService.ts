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

      // Detectar peso
      const pesoMatch = input.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?|kilogramos?)/i);
      if (pesoMatch) {
        const value = parseFloat(pesoMatch[1].replace(',', '.'));
        extractedData.type = 'weight';
        extractedData.data = {
          value,
          unit: 'kg',
          date: new Date().toISOString()
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
          date: new Date().toISOString()
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
          date: new Date().toISOString()
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
          date: new Date().toISOString()
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
          date: new Date().toISOString()
        };
        extractedData.confidence = 0.7;
        extractedData.notes = 'Nota general registrada';
      }

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

  // Chat con respuestas predefinidas basadas en contexto
  async chatCompletion(request: ChatRequest): Promise<APIResponse> {
    try {
      console.log('APIService: Processing chat request');
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const lastMessage = request.messages[request.messages.length - 1]?.content.toLowerCase() || '';
      let response = '';

      // Respuestas contextuales basadas en palabras clave
      if (lastMessage.includes('fiebre')) {
        response = 'Para la fiebre en bebés:\n\n' +
          '• Si tiene menos de 3 meses y fiebre mayor a 38°C, consulta inmediatamente al pediatra\n' +
          '• Entre 3-6 meses: consulta si supera los 38.5°C\n' +
          '• Mantén al bebé hidratado\n' +
          '• Viste con ropa ligera\n' +
          '• Puedes usar paracetamol según indicación médica\n\n' +
          'Siempre consulta con tu pediatra ante cualquier duda.';
      } else if (lastMessage.includes('peso') || lastMessage.includes('alimenta')) {
        response = 'Sobre el peso y alimentación:\n\n' +
          '• Los bebés suelen duplicar su peso de nacimiento a los 5 meses\n' +
          '• La lactancia exclusiva se recomienda hasta los 6 meses\n' +
          '• El peso debe evaluarse junto con la talla y el perímetro cefálico\n' +
          '• Cada bebé tiene su ritmo de crecimiento\n\n' +
          'Consulta las curvas de crecimiento con tu pediatra.';
      } else if (lastMessage.includes('vacuna')) {
        response = 'Calendario de vacunación:\n\n' +
          '• Al nacer: BCG y Hepatitis B\n' +
          '• 2 meses: Pentavalente, Polio, Rotavirus, Neumococo\n' +
          '• 4 meses: Segunda dosis de las anteriores\n' +
          '• 6 meses: Tercera dosis e Influenza\n' +
          '• 12 meses: SRP, Varicela, Hepatitis A\n\n' +
          'Mantén al día el carnet de vacunación.';
      } else {
        response = 'Entiendo tu consulta. Como asistente de salud infantil, te recomiendo:\n\n' +
          '• Llevar un registro detallado de síntomas\n' +
          '• Observar cambios en el comportamiento\n' +
          '• Mantener comunicación con tu pediatra\n' +
          '• No automedicar\n\n' +
          'Para información más específica, por favor proporciona más detalles o consulta directamente con un profesional de la salud.';
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