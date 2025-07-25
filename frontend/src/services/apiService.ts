// Types
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  usage?: any;
  model?: string;
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
  private baseURL: string;
  private timeout: number = 30000;

  constructor() {
    // For development, use localhost. In production, use your deployed Worker URL
    this.baseURL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';
  }

  private isDevelopment(): boolean {
    return import.meta.env.DEV;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken();

    const defaultOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Client-Version': '1.0.0',
      },
      signal: AbortSignal.timeout(this.timeout),
    };

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, finalOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Keep the default error message if can't parse JSON
        }
        
        throw new Error(errorMessage);
      }

      const data: APIResponse<T> = await response.json();
      return data;
    } catch (error: any) {
      console.error(`API Error (${endpoint}):`, error);
      
      if (error.name === 'TimeoutError') {
        throw new Error('Request timeout - please try again');
      }
      
      throw error;
    }
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('maxi_auth_token');
  }

  // Health check
  async healthCheck(): Promise<APIResponse> {
    // In development mode, return mock data instead of trying to connect to Worker
    if (this.isDevelopment() && !import.meta.env.VITE_WORKER_URL) {
      return {
        success: true,
        data: {
          status: 'ok (mock)',
          timestamp: new Date().toISOString()
        }
      };
    }
    return this.makeRequest('/health');
  }

  // OpenAI Extract data
  async extractData(request: ExtractionRequest): Promise<APIResponse> {
    // In development mode, return mock extracted data
    if (this.isDevelopment() && !import.meta.env.VITE_WORKER_URL) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      return {
        success: true,
        data: {
          type: 'weight',
          data: {
            value: 4.2,
            unit: 'kg',
            date: new Date().toISOString()
          },
          confidence: 0.95,
          requiresAttention: false,
          notes: `Datos extraídos de: "${request.input}"`
        }
      };
    }
    return this.makeRequest('/api/openai/extract', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // OpenAI Chat
  async chatCompletion(request: ChatRequest): Promise<APIResponse> {
    // In development mode, return mock chat response
    if (this.isDevelopment() && !import.meta.env.VITE_WORKER_URL) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      return {
        success: true,
        data: {
          response: `Esta es una respuesta simulada para tu consulta. En producción, esto sería procesado por OpenAI GPT-4 con todo el contexto médico del bebé. Para activar la IA real, configura el Cloudflare Worker según las instrucciones del README.`,
          usage: {
            tokens: 150
          }
        }
      };
    }
    return this.makeRequest('/api/openai/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Web Search
  async webSearch(
    query: string,
    options: { limit?: number; context?: string; language?: string } = {}
  ): Promise<APIResponse> {
    // In development mode, return mock search results
    if (this.isDevelopment() && !import.meta.env.VITE_WORKER_URL) {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
      return {
        success: true,
        data: {
          results: [
            {
              title: `Información sobre: ${query}`,
              snippet: `Esta es información simulada sobre "${query}". En producción se utilizaría DuckDuckGo API para obtener resultados reales.`,
              url: 'https://example.com/mock-result'
            }
          ],
          total: 1
        }
      };
    }

    const params = new URLSearchParams({
      q: query,
      limit: (options.limit || 5).toString(),
      ...(options.context && { context: options.context }),
      ...(options.language && { language: options.language }),
    });

    return this.makeRequest(`/api/search?${params}`);
  }

  // Retry mechanism for failed requests
  async withRetry<T>(
    operation: () => Promise<APIResponse<T>>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<APIResponse<T>> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on authentication errors or client errors (4xx)
        if (error.message.includes('401') || error.message.includes('400')) {
          throw error;
        }
        
        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
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