// Servicio de integración con OpenAI
// NOTA: La API key debe estar en las variables de entorno, nunca en el código

interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

interface OpenAIRequest {
  prompt: string;
  context?: string;
  imageUrl?: string;
  systemPrompt?: string;
}

interface OpenAIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class OpenAIService {
  private config: OpenAIConfig;
  private baseUrl = 'https://api.openai.com/v1';
  
  constructor() {
    // Obtener API key de variables de entorno
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      console.warn('OpenAI API key no configurada. Usando modo offline.');
    }
    
    this.config = {
      apiKey: apiKey || '',
      model: 'gpt-4-turbo-preview',
      maxTokens: 1000,
      temperature: 0.7
    };
  }
  
  // Verificar si OpenAI está disponible
  isAvailable(): boolean {
    return !!this.config.apiKey && this.config.apiKey !== 'your-openai-api-key-here';
  }
  
  // Analizar texto con GPT-4
  async analyzeText(request: OpenAIRequest): Promise<OpenAIResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'OpenAI no está configurado. Usando procesamiento local.'
      };
    }
    
    try {
      const messages = [
        {
          role: 'system',
          content: request.systemPrompt || 'Eres un asistente médico especializado en pediatría. Analiza la información proporcionada y extrae datos relevantes de salud infantil.'
        },
        {
          role: 'user',
          content: request.prompt
        }
      ];
      
      if (request.context) {
        messages.push({
          role: 'assistant',
          content: `Contexto adicional: ${request.context}`
        });
      }
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Error al llamar a OpenAI');
      }
      
      const data = await response.json();
      return {
        success: true,
        data: data.choices[0].message.content
      };
      
    } catch (error) {
      console.error('Error en OpenAI:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  // Analizar imagen con GPT-4 Vision
  async analyzeImage(imageUrl: string, prompt: string): Promise<OpenAIResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'OpenAI no está configurado. Usando procesamiento local.'
      };
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: this.config.maxTokens
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Error al analizar imagen');
      }
      
      const data = await response.json();
      return {
        success: true,
        data: data.choices[0].message.content
      };
      
    } catch (error) {
      console.error('Error en OpenAI Vision:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  // Configurar el servicio
  configure(config: Partial<OpenAIConfig>) {
    this.config = { ...this.config, ...config };
  }
}

// Exportar instancia única
export const openAIService = new OpenAIService();

// Exportar tipos
export type { OpenAIRequest, OpenAIResponse };