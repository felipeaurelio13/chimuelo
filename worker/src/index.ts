import { IRequest, Router } from 'itty-router';

// Types
interface Env {
  OPENAI_API_KEY?: string;
  JWT_SECRET?: string;
  RATE_LIMIT_KV?: KVNamespace;
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

// Handle CORS preflight
router.options('*', () => {
  return new Response(null, { headers: corsHeaders });
});

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

// SIMPLE Health check that should always work
router.get('/health', (request: IRequest, env: Env) => {
  try {
    const hasOpenAI = !!env?.OPENAI_API_KEY;
    const hasJWT = !!env?.JWT_SECRET;
    
    return generateSuccessResponse({
      message: 'Chimuelo Worker is healthy',
      version: '1.0.0',
      features: ['health'],
      config: {
        openai_configured: hasOpenAI,
        jwt_configured: hasJWT,
        environment: 'production'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Health check error:', error);
    return generateErrorResponse('Health check failed: ' + (error?.message || 'Unknown error'), 500);
  }
});

// Simplified OpenAI endpoint for testing
router.post('/api/openai/chat', async (request: IRequest, env: Env) => {
  try {
    if (!env?.OPENAI_API_KEY) {
      return generateErrorResponse('OpenAI API key not configured', 500);
    }

    const body = await request.json() as any;
    
    if (!body?.messages || !Array.isArray(body.messages)) {
      return generateErrorResponse('Messages are required', 400);
    }

    // Simple OpenAI call
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: body.options?.model || 'gpt-4o',
        messages: body.messages,
        temperature: body.options?.temperature || 0.7,
        max_tokens: body.options?.maxTokens || 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      return generateErrorResponse(`OpenAI API error: ${errorData}`, openaiResponse.status);
    }
    
    const openaiData = await openaiResponse.json() as any;
    
    return generateSuccessResponse({
      response: openaiData.choices?.[0]?.message?.content || 'No response',
      usage: openaiData.usage,
      model: body.options?.model || 'gpt-4o'
    });
    
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return generateErrorResponse(error?.message || 'Internal server error');
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
      return generateErrorResponse('Internal server error: ' + (error?.message || 'Unknown error'));
    }
  }
};
