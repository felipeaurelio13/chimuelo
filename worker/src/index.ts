// Simple worker with OpenAI functionality - no itty-router

interface Env {
  OPENAI_API_KEY?: string;
  JWT_SECRET?: string;
  RATE_LIMIT_KV?: KVNamespace;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
      
      // Health endpoint
      if (url.pathname === '/health') {
        const hasOpenAI = !!env?.OPENAI_API_KEY;
        return new Response(JSON.stringify({
          success: true,
          message: 'Chimuelo Worker is healthy',
          version: '1.0.0',
          features: hasOpenAI ? ['health', 'openai'] : ['health'],
          openai_configured: hasOpenAI,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // OpenAI Chat endpoint
      if (url.pathname === '/api/openai/chat' && request.method === 'POST') {
        if (!env?.OPENAI_API_KEY) {
          return new Response(JSON.stringify({
            success: false,
            error: 'OpenAI API key not configured'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const body = await request.json() as any;
        
        if (!body?.messages || !Array.isArray(body.messages)) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Messages are required'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Call OpenAI API
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
          return new Response(JSON.stringify({
            success: false,
            error: `OpenAI API error: ${errorData}`
          }), {
            status: openaiResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const openaiData = await openaiResponse.json() as any;
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            response: openaiData.choices?.[0]?.message?.content || 'No response',
            usage: openaiData.usage,
            model: body.options?.model || 'gpt-4o'
          },
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Default 404 response
      return new Response(JSON.stringify({
        success: false,
        error: 'Endpoint not found',
        path: url.pathname,
        available_endpoints: ['/health', '/api/openai/chat']
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error: ' + String(error)
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
