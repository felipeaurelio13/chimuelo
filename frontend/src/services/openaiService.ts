// Servicio de integración con OpenAI
// NOTA: La API key debe estar en las variables de entorno, nunca en el código
import ErrorHandler, { handleErrorWithFallback, type ErrorInfo } from './errorHandler';

interface OpenAIConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

interface ExtractionRequest {
  input: string;
  inputType: 'text' | 'image' | 'audio' | 'video' | 'pdf';
  schema?: any;
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  context?: any;
  searchResults?: any[];
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

class OpenAIService {
  private config: OpenAIConfig;
  private workerUrl: string;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 2000; // 2 segundos entre requests
  private isQuotaExceeded: boolean = false;
  
  constructor() {
    // Usar Worker URL en lugar de API directa
    this.workerUrl = import.meta.env.VITE_WORKER_URL || 'https://maxi-worker.felipeaurelio13.workers.dev';
    
    this.config = {
      model: 'gpt-4o',
      maxTokens: 1000,
      temperature: 0.7
    };
    
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('OpenAI Service configurado para usar Worker:', this.workerUrl);
    }
  }
  
  // Verificar si el Worker está disponible
  async isAvailable(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(`${this.workerUrl}/health`, {
        signal: controller.signal
      });
      return response.ok;
    } catch (error) {
      console.warn('Worker no disponible:', error);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Rate limiting
  private async rateLimitCheck(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  // Extraer datos de salud usando el Worker
  async extractHealthData(input: string, inputType: 'text' | 'image' | 'audio' | 'video' | 'pdf' = 'text'): Promise<any> {
    if (this.isQuotaExceeded) {
      const quotaError = ErrorHandler.createAIError(
        new Error('Cuota de OpenAI excedida. Intenta de nuevo más tarde.'),
        { input, inputType, quotaExceeded: true }
      );
      ErrorHandler.getInstance().logError(quotaError);
      throw new Error(quotaError.userMessage);
    }

    await this.rateLimitCheck();

    try {
      const extractRequest: ExtractionRequest = {
        input,
        inputType,
        options: {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens
        }
      };

      const response = await fetch(`${this.workerUrl}/api/openai/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(import.meta.env.VITE_OPENAI_API_KEY && {
            'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
          })
        },
        body: JSON.stringify(extractRequest)
      });

      if (!response.ok) {
        let errorMessage = `Error en la API: ${response.status}`;
        
        if (response.status === 429) {
          this.isQuotaExceeded = true;
          errorMessage = 'Límite de rate excedido';
        } else if (response.status === 503) {
          errorMessage = 'Servicio temporalmente no disponible';
        } else if (response.status === 500) {
          errorMessage = 'Error interno del servidor';
        }
        
        const networkError = ErrorHandler.createNetworkError(
          new Error(errorMessage),
          { responseStatus: response.status, input, inputType }
        );
        ErrorHandler.getInstance().logError(networkError);
        throw new Error(networkError.userMessage);
      }

      const result = await response.json();
      
      if (!result.success) {
        const apiError = ErrorHandler.createAIError(
          new Error(result.error || 'Error desconocido'),
          { result, input, inputType }
        );
        ErrorHandler.getInstance().logError(apiError);
        throw new Error(apiError.userMessage);
      }

      return result.data;
    } catch (error: any) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.error('Error en extractHealthData:', error);
      }
      
      // Si el error ya fue procesado por nuestro sistema, solo relanzarlo
      if (error.message.includes('Error de conexión') || 
          error.message.includes('Límite de rate') ||
          error.message.includes('Cuota de OpenAI')) {
        throw error;
      }
      
      // Procesar error no manejado
      const errorInfo = ErrorHandler.createAIError(error, { input, inputType });
      ErrorHandler.getInstance().logError(errorInfo);
      throw new Error(errorInfo.userMessage);
    }
  }

  // Chat con IA usando el Worker
  async chatCompletion(messages: Array<{role: 'user' | 'assistant' | 'system', content: string}>, context?: any): Promise<string> {
    if (this.isQuotaExceeded) {
      throw new Error('Cuota de OpenAI excedida. Intenta de nuevo más tarde.');
    }

    await this.rateLimitCheck();

    try {
      const chatRequest: ChatRequest = {
        messages,
        context,
        options: {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens
        }
      };

      const response = await fetch(`${this.workerUrl}/api/openai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(import.meta.env.VITE_OPENAI_API_KEY && {
            'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
          })
        },
        body: JSON.stringify(chatRequest)
      });

      if (!response.ok) {
        if (response.status === 429) {
          this.isQuotaExceeded = true;
          throw new Error('Límite de rate excedido');
        }
        throw new Error(`Error en la API: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido');
      }

      return result.data.response;
    } catch (error: any) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.error('Error en chatCompletion:', error);
      }
      
      if (error.message.includes('quota')) {
        this.isQuotaExceeded = true;
      }
      
      throw error;
    }
  }

  // Análisis de síntomas
  async analyzeSymptoms(symptoms: string, context?: any): Promise<any> {
    const prompt = `Analiza los siguientes síntomas de un bebé: "${symptoms}". 
    Proporciona información útil pero siempre recomienda consultar con un pediatra.
    ${context ? `\nContexto adicional: ${JSON.stringify(context)}` : ''}`;

    const messages = [
      {
        role: 'system' as const,
        content: 'Eres un asistente médico especializado en pediatría. Proporciona información útil pero siempre recomienda consultar con un profesional médico.'
      },
      {
        role: 'user' as const,
        content: prompt
      }
    ];

    return await this.chatCompletion(messages, context);
  }

  // Generar recomendaciones
  async generateRecommendations(healthData: any): Promise<string[]> {
    const prompt = `Basándote en estos datos de salud infantil: ${JSON.stringify(healthData)}, 
    genera 3-5 recomendaciones prácticas para el cuidado del bebé.`;

    const messages = [
      {
        role: 'system' as const,
        content: 'Eres un experto en cuidado infantil. Genera recomendaciones prácticas y seguras.'
      },
      {
        role: 'user' as const,
        content: prompt
      }
    ];

    const response = await this.chatCompletion(messages);
    
    // Intentar parsear como lista
    try {
      const lines = response.split('\n').filter(line => line.trim());
      return lines.map(line => line.replace(/^[-•*]\s*/, '').trim()).filter(rec => rec.length > 0);
    } catch {
      return [response];
    }
  }

  // Resetear estado de cuota
  resetQuotaStatus(): void {
    this.isQuotaExceeded = false;
  }

  // Configurar modelo
  setModel(model: string): void {
    this.config.model = model;
  }

  // Configurar temperatura
  setTemperature(temperature: number): void {
    this.config.temperature = Math.max(0, Math.min(2, temperature));
  }

  // Configurar tokens máximos
  setMaxTokens(maxTokens: number): void {
    this.config.maxTokens = Math.max(100, Math.min(4000, maxTokens));
  }

  // Obtener configuración actual
  getConfig(): OpenAIConfig {
    return { ...this.config };
  }
}

// Singleton instance
const openaiService = new OpenAIService();
export default openaiService;