import { IRequest, Router } from 'itty-router';

// Types
interface Env {
  OPENAI_API_KEY: string;
  JWT_SECRET?: string;
  RATE_LIMIT_KV?: KVNamespace;
}

interface AuthenticatedRequest extends IRequest {
  user?: {
    userId: string;
    email: string;
  };
}

interface OpenAIExtractRequest {
  input: string;
  inputType: 'text' | 'image' | 'audio' | 'video' | 'pdf';
  schema?: any;
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

interface OpenAIChatRequest {
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

// Router setup
const router = Router();

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Version',
  'Access-Control-Max-Age': '86400',
};

// Utility functions
function generateErrorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function generateSuccessResponse(data: any) {
  return new Response(JSON.stringify({
    success: true,
    data,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Authentication middleware
async function authMiddleware(request: IRequest): Promise<{ userId: string } | Response> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return generateErrorResponse('Missing or invalid authorization header', 401);
  }
  
  const token = authHeader.substring(7);
  
  // For MVP, we'll do basic token validation
  // In production, implement proper JWT verification
  if (!token || token.length < 10) {
    return generateErrorResponse('Invalid token', 401);
  }
  
  // Extract user info from token (simplified for MVP)
  return { userId: 'user-' + token.substring(0, 8) };
}

// Rate limiting
async function checkRateLimit(env: Env, endpoint: string, userId: string): Promise<boolean> {
  if (!env.RATE_LIMIT_KV) return true; // Skip if KV not configured
  
  const key = `rate-limit:${endpoint}:${userId}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  
  const current = await env.RATE_LIMIT_KV.get(key);
  if (!current) {
    await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: 1, resetTime: now + windowMs }), { expirationTtl: 3600 });
    return true;
  }
  
  const data = JSON.parse(current);
  if (now > data.resetTime) {
    await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: 1, resetTime: now + windowMs }), { expirationTtl: 3600 });
    return true;
  }
  
  // Rate limits per endpoint
  const limits: Record<string, number> = {
    'extract': 50,    // 50 requests/hour
    'chat': 100,      // 100 requests/hour
    'search': 200     // 200 requests/hour
  };
  
  const limit = limits[endpoint] || 100;
  if (data.count >= limit) {
    return false;
  }
  
  data.count++;
  await env.RATE_LIMIT_KV.put(key, JSON.stringify(data), { expirationTtl: 3600 });
  return true;
}

// Middleware: CORS handler
function handleCORS(request: IRequest) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
}

// Apply CORS to all routes
router.all('*', handleCORS);

// Health check
router.get('/health', () => {
  return generateSuccessResponse({
    message: 'Chimuelo Worker is healthy',
    version: '1.0.0',
    features: ['openai', 'search', 'rate-limiting']
  });
});

// OpenAI Data Extraction
router.post('/api/openai/extract', async (request: IRequest, env: Env) => {
  try {
    // Authentication
    const auth = await authMiddleware(request);
    if (auth instanceof Response) return auth;
    
    // Rate limiting
    const canProceed = await checkRateLimit(env, 'extract', auth.userId);
    if (!canProceed) {
      return generateErrorResponse('Rate limit exceeded. Try again later.', 429);
    }
    
    // Validate OpenAI API Key
    if (!env.OPENAI_API_KEY) {
      return generateErrorResponse('OpenAI API key not configured', 500);
    }
    
    // Parse request body
    const body: OpenAIExtractRequest = await request.json();
    if (!body.input) {
      return generateErrorResponse('Input is required', 400);
    }
    
    // Prepare OpenAI request
    const systemPrompt = `Eres un asistente médico especializado en extraer datos de salud infantil.
Tu tarea es analizar el input del usuario y extraer información relevante de salud del bebé.

Extrae y estructura la siguiente información cuando esté disponible:
- Peso (en kg)
- Altura (en cm)
- Temperatura (en °C)
- Síntomas
- Medicamentos
- Vacunas
- Hitos del desarrollo
- Fechas relevantes
- Notas adicionales

Responde en formato JSON con la estructura:
{
  "extractedData": {
    "type": "weight|height|temperature|symptom|medication|vaccine|milestone|note",
    "data": { datos específicos },
    "confidence": 0.0-1.0,
    "timestamp": "ISO date string"
  },
  "clarificationNeeded": boolean,
  "questions": ["preguntas para aclarar"],
  "requiresAttention": boolean
}`;
    
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      {
        role: 'user' as const,
        content: body.input
      }
    ];
    
    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: body.options?.model || 'gpt-4-turbo-preview',
        messages,
        temperature: body.options?.temperature || 0.2,
        max_tokens: body.options?.maxTokens || 1024,
        response_format: { type: 'json_object' }
      })
    });
    
    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      console.error('OpenAI API Error:', error);
      return generateErrorResponse(`OpenAI API error: ${error.error?.message || 'Unknown error'}`, openaiResponse.status);
    }
    
    const openaiData = await openaiResponse.json();
    let extractedData;
    
    try {
      extractedData = JSON.parse(openaiData.choices[0].message.content);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      return generateErrorResponse('Failed to parse AI response', 500);
    }
    
    return generateSuccessResponse({
      ...extractedData,
      usage: openaiData.usage,
      model: body.options?.model || 'gpt-4-turbo-preview'
    });
    
  } catch (error: any) {
    console.error('Extract endpoint error:', error);
    return generateErrorResponse(error.message || 'Internal server error');
  }
});

// OpenAI Chat Completion
router.post('/api/openai/chat', async (request: IRequest, env: Env) => {
  try {
    // Authentication
    const auth = await authMiddleware(request);
    if (auth instanceof Response) return auth;
    
    // Rate limiting
    const canProceed = await checkRateLimit(env, 'chat', auth.userId);
    if (!canProceed) {
      return generateErrorResponse('Rate limit exceeded. Try again later.', 429);
    }
    
    // Validate OpenAI API Key
    if (!env.OPENAI_API_KEY) {
      return generateErrorResponse('OpenAI API key not configured', 500);
    }
    
    // Parse request body
    const body: OpenAIChatRequest = await request.json();
    if (!body.messages || body.messages.length === 0) {
      return generateErrorResponse('Messages are required', 400);
    }
    
    // Prepare system message with context
    let systemMessage = `Eres un asistente médico especializado en pediatría y salud infantil.
Proporciona información precisa, útil y empática sobre el cuidado de bebés y niños pequeños.

IMPORTANTE:
- Siempre recomienda consultar con un pediatra para temas médicos serios
- Sé empático con los padres primerizos
- Usa un lenguaje claro y comprensible
- Si no estás seguro, dilo claramente

Contexto actual del bebé:`;
    
    if (body.context) {
      systemMessage += `\n${JSON.stringify(body.context, null, 2)}`;
    }
    
    if (body.searchResults && body.searchResults.length > 0) {
      systemMessage += `\n\nInformación adicional de búsquedas recientes:\n${body.searchResults.map(result => 
        `- ${result.title}: ${result.snippet}`
      ).join('\n')}`;
    }
    
    const messages = [
      {
        role: 'system' as const,
        content: systemMessage
      },
      ...body.messages
    ];
    
    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: body.options?.model || 'gpt-4o',
        messages,
        temperature: body.options?.temperature || 0.7,
        max_tokens: body.options?.maxTokens || 2048
      })
    });
    
    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      console.error('OpenAI API Error:', error);
      return generateErrorResponse(`OpenAI API error: ${error.error?.message || 'Unknown error'}`, openaiResponse.status);
    }
    
    const openaiData = await openaiResponse.json();
    
    return generateSuccessResponse({
      response: openaiData.choices[0].message.content,
      usage: openaiData.usage,
      model: body.options?.model || 'gpt-4o'
    });
    
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return generateErrorResponse(error.message || 'Internal server error');
  }
});

// Web Search (DuckDuckGo proxy)
router.get('/api/search', async (request: IRequest, env: Env) => {
  try {
    // Authentication
    const auth = await authMiddleware(request);
    if (auth instanceof Response) return auth;
    
    // Rate limiting
    const canProceed = await checkRateLimit(env, 'search', auth.userId);
    if (!canProceed) {
      return generateErrorResponse('Rate limit exceeded. Try again later.', 429);
    }
    
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const limit = parseInt(url.searchParams.get('limit') || '5', 10);
    
    if (!query) {
      return generateErrorResponse('Query parameter "q" is required', 400);
    }
    
    // Use DuckDuckGo Instant Answer API
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Chimuelo-Health-Tracker/1.0'
      }
    });
    
    if (!searchResponse.ok) {
      return generateErrorResponse('Search service unavailable', 503);
    }
    
    const searchData = await searchResponse.json();
    
    // Parse DuckDuckGo results
    const results = [];
    
    // Add abstract if available
    if (searchData.Abstract) {
      results.push({
        title: searchData.Heading || 'Información general',
        snippet: searchData.Abstract,
        url: searchData.AbstractURL || '',
        source: searchData.AbstractSource || 'DuckDuckGo'
      });
    }
    
    // Add related topics
    if (searchData.RelatedTopics) {
      for (const topic of searchData.RelatedTopics.slice(0, limit - results.length)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 60),
            snippet: topic.Text,
            url: topic.FirstURL,
            source: 'DuckDuckGo'
          });
        }
      }
    }
    
    // If no results, try a different approach with web search
    if (results.length === 0) {
      // Fallback: return a helpful message
      results.push({
        title: 'Búsqueda médica',
        snippet: `Para obtener información médica sobre "${query}", te recomendamos consultar fuentes confiables como la Academia Americana de Pediatría o consultar directamente con tu pediatra.`,
        url: 'https://www.healthychildren.org',
        source: 'Recomendación'
      });
    }
    
    return generateSuccessResponse({
      query,
      results: results.slice(0, limit),
      total: results.length
    });
    
  } catch (error: any) {
    console.error('Search endpoint error:', error);
    return generateErrorResponse(error.message || 'Internal server error');
  }
});

// 404 handler
router.all('*', () => {
  return generateErrorResponse('Endpoint not found', 404);
});

// Export worker
export default {
  async fetch(request: IRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await router.handle(request, env, ctx);
    } catch (error: any) {
      console.error('Worker error:', error);
      return generateErrorResponse('Internal server error');
    }
  }
};
