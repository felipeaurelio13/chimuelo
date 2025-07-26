import { IRequest, Router } from 'itty-router';

// Types
interface Env {
  OPENAI_API_KEY: string;
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
