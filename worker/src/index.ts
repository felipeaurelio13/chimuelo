import { IRequest, Router } from 'itty-router';

// Types
interface Env {
  OPENAI_API_KEY: string;
  RATE_LIMIT_KV: KVNamespace;
  JWT_SECRET: string;
}

interface AuthenticatedRequest extends IRequest {
  user?: {
    userId: string;
    email: string;
  };
}

// Router setup
const router = Router();

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Version',
  'Access-Control-Max-Age': '86400',
};

// Middleware: CORS handler
function handleCORS(request: IRequest) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
}

// Middleware: Rate limiting
async function rateLimiter(request: AuthenticatedRequest, env: Env) {
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const userId = request.user?.userId || clientIP;
  
  // Different limits per endpoint
  const limits: Record<string, { requests: number; window: number }> = {
    '/api/openai/extract': { requests: 50, window: 3600 }, // 50 per hour
    '/api/openai/chat': { requests: 100, window: 3600 }, // 100 per hour
    '/api/search': { requests: 200, window: 3600 } // 200 per hour
  };

  const endpoint = getEndpointFromPath(request.url);
  const limit = limits[endpoint] || { requests: 10, window: 3600 };

  const key = `rate_limit:${userId}:${endpoint}`;
  const current = await env.RATE_LIMIT_KV.get(key);
  
  if (current && parseInt(current) >= limit.requests) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: limit.window
    }), { 
      status: 429,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': limit.window.toString()
      }
    });
  }

  // Increment counter
  const newCount = current ? parseInt(current) + 1 : 1;
  await env.RATE_LIMIT_KV.put(key, newCount.toString(), { 
    expirationTtl: limit.window 
  });
}

// Middleware: Auth (simplified for MVP)
async function authMiddleware(request: AuthenticatedRequest) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Unauthorized'
    }), { 
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // For MVP, we'll do basic validation
  // In production, verify JWT properly
  const token = authHeader.substring(7);
  if (token.length < 10) { // Basic validation
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid token'
    }), { 
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Mock user for MVP
  request.user = {
    userId: 'user-' + token.substring(0, 8),
    email: 'user@example.com'
  };
}

// Routes
router.all('*', handleCORS);

// Health check
router.get('/health', () => {
  return new Response(JSON.stringify({
    success: true,
    message: 'Maxi Worker is healthy',
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// OpenAI Extract endpoint
router.post('/api/openai/extract', rateLimiter, authMiddleware, async (request: AuthenticatedRequest, env: Env) => {
  try {
    const body = await request.json() as {
      input: string;
      inputType: string;
      schema: any;
      options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
      };
    };

    if (!body.input || !body.inputType || !body.schema) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: input, inputType, schema'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const model = body.options?.model || 'gpt-4-turbo-preview';
    const temperature = body.options?.temperature || 0.2;
    const maxTokens = body.options?.maxTokens || 1024;

    const prompt = buildExtractionPrompt(body.input, body.inputType, body.schema);

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
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
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    
    return new Response(JSON.stringify({
      success: true,
      data: JSON.parse(data.choices[0].message.content),
      usage: data.usage,
      model: data.model
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('OpenAI extract error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// OpenAI Chat endpoint
router.post('/api/openai/chat', rateLimiter, authMiddleware, async (request: AuthenticatedRequest, env: Env) => {
  try {
    const body = await request.json() as {
      messages: Array<{role: string, content: string}>;
      context?: any;
      searchResults?: Array<any>;
      options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
      };
    };

    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid messages format'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const model = body.options?.model || 'gpt-4o';
    const temperature = body.options?.temperature || 0.7;
    const maxTokens = body.options?.maxTokens || 2048;

    const systemPrompt = buildChatSystemPrompt(body.context, body.searchResults);

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...body.messages
        ],
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    
    return new Response(JSON.stringify({
      success: true,
      message: data.choices[0].message.content,
      usage: data.usage,
      model: data.model
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('OpenAI chat error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Search endpoint (DuckDuckGo proxy)
router.get('/api/search', rateLimiter, authMiddleware, async (request: AuthenticatedRequest) => {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const maxResults = parseInt(url.searchParams.get('limit') || '5');
    
    if (!query) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Query parameter "q" is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Search DuckDuckGo
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
    const results = processSearchResults(data, maxResults);
    
    return new Response(JSON.stringify({
      success: true,
      query,
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Search service error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper functions
function getEndpointFromPath(url: string): string {
  try {
    const path = new URL(url).pathname;
    if (path.startsWith('/api/openai/extract')) return '/api/openai/extract';
    if (path.startsWith('/api/openai/chat')) return '/api/openai/chat';
    if (path.startsWith('/api/search')) return '/api/search';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function buildExtractionPrompt(input: string, inputType: string, schema: any): string {
  return `Analiza el siguiente ${inputType} y extrae todos los datos de salud relevantes según el schema JSON proporcionado.

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
}

function buildChatSystemPrompt(context: any, searchResults: any[]): string {
  let prompt = `Eres un asistente especializado en salud infantil. Tu objetivo es ayudar a padres con preguntas sobre la salud y desarrollo de sus hijos.`;

  if (context) {
    prompt += `\n\nContexto del niño:
${JSON.stringify(context, null, 2)}`;
  }

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

function processSearchResults(data: any, maxResults: number): any[] {
  const results: any[] = [];
  
  // Process instant answer if exists
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

  // Process abstract if exists
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

  // Process related topics
  if (data.RelatedTopics) {
    data.RelatedTopics.slice(0, maxResults - results.length).forEach((topic: any) => {
      if (topic.Text && topic.FirstURL) {
        results.push({
          type: 'related_topic',
          source: extractDomain(topic.FirstURL),
          title: topic.Text.split(' - ')[0] || 'Tema Relacionado',
          snippet: topic.Text,
          url: topic.FirstURL,
          relevance: 0.7
        });
      }
    });
  }

  // Filter by reliable sources and sort by relevance
  return results
    .filter(result => isReliableSource(result.source))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults);
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'Unknown';
  }
}

function isReliableSource(source: string): boolean {
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

// 404 handler
router.all('*', () => {
  return new Response(JSON.stringify({
    success: false,
    error: 'Not Found'
  }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// Export worker
export default {
  async fetch(request: IRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await router.handle(request, env, ctx);
    } catch (error: any) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
