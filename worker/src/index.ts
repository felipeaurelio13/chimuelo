// Simple worker with OpenAI functionality and fallbacks

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

// Respuestas de fallback médicas inteligentes
const medicalFallbackResponses = {
  fiebre: `Para la fiebre en bebés:

🌡️ **Medidas inmediatas:**
• Si es menor de 3 meses y tiene fiebre > 38°C: **Consulta inmediatamente al pediatra**
• Entre 3-6 meses: consulta si supera los 38.5°C
• Mantén al bebé hidratado con frecuencia
• Vístelo con ropa ligera y fresca

💊 **Medicación:**
• Solo paracetamol según indicación médica
• Nunca aspirina en menores de 16 años
• Respeta dosis según peso y edad

⚠️ **Consulta urgente si hay:**
• Dificultad para respirar • Manchas en la piel • Vómitos persistentes • Letargo extremo

*Esta información es orientativa. Siempre consulta con tu pediatra.*`,

  alimentacion: `Sobre alimentación y peso:

🍼 **Lactancia:**
• Lactancia exclusiva hasta los 6 meses
• A demanda, no por horarios rígidos
• Señales de hambre: búsqueda, succión, movimientos de boca

📈 **Crecimiento:**
• Los bebés duplican su peso de nacimiento a los 5 meses
• Cada bebé tiene su ritmo único
• Lo importante es la curva de crecimiento, no números absolutos

🥄 **Alimentación complementaria (6+ meses):**
• Introducir alimentos gradualmente
• Un alimento nuevo cada 3-5 días
• Texturas apropiadas para la edad

📊 **Consulta las curvas de crecimiento con tu pediatra regularmente.**`,

  desarrollo: `Desarrollo infantil por etapas:

👶 **0-3 meses:**
• Sostiene la cabeza brevemente • Sigue objetos con la mirada • Sonríe socialmente • Reacciona a sonidos

👶 **3-6 meses:**
• Control de cabeza • Se voltea • Agarra objetos • Balbucea • Reconoce voces familiares

👶 **6-9 meses:**
• Se sienta con apoyo • Transfiere objetos entre manos • Dice sílabas • Ansiedad por extraños

👶 **9-12 meses:**
• Gatea o se desplaza • Se pone de pie • Pinza digital • Primeras palabras • Juegos de imitación

⚠️ **Cada bebé se desarrolla a su ritmo. Si tienes dudas, consulta con tu pediatra.**`,

  sueno: `Patrones de sueño saludables:

🌙 **Recién nacidos (0-3 meses):**
• 14-17 horas/día en períodos de 2-4 horas
• Despertares nocturnos normales para alimentación
• Confusión día/noche es normal

😴 **3-6 meses:**
• 12-15 horas/día • Períodos más largos de sueño nocturno
• Siestas más regulares • Rutinas de sueño beneficiosas

🛏️ **6+ meses:**
• 11-14 horas/día • Puede dormir toda la noche
• 2-3 siestas diurnas • Rutinas consistentes importantes

💡 **Consejos:**
• Ambiente tranquilo y oscuro • Temperatura fresca (18-20°C)
• Rutina relajante antes de dormir • Evitar pantallas 1 hora antes

*Consulta con tu pediatra si hay cambios drásticos en el sueño.*`,

  vacunas: `Calendario de vacunación (España):

💉 **Primeros meses:**
• **Nacimiento:** BCG (si indicada), Hepatitis B
• **2 meses:** DTPa-VPI, Hib, Neumococo, Rotavirus
• **4 meses:** DTPa-VPI, Hib, Neumococo, Rotavirus
• **6 meses:** DTPa-VPI, Hib, Neumococo, Rotavirus (si indicada)

💉 **Primer año:**
• **12 meses:** SRP (sarampión, rubéola, parotiditis), Neumococo, Meningococo C
• **15-18 meses:** DTPa-VPI, Hib, Varicela

📅 **Importante:**
• Mantén el carnet de vacunación actualizado
• Las vacunas pueden variar según la comunidad autónoma
• Consulta con tu pediatra el calendario específico

⚠️ **No retrases las vacunas sin consultar con tu médico.**`,

  general: `Como asistente de salud infantil, te ayudo con información sobre el cuidado de tu bebé.

🩺 **Áreas en las que puedo ayudarte:**
• Control de peso y alimentación
• Desarrollo y hitos evolutivos  
• Patrones de sueño y descanso
• Calendario de vacunación
• Manejo de síntomas comunes
• Cuándo consultar al pediatra

📋 **Recomendaciones generales:**
• Lleva un registro detallado de síntomas y cambios
• Observa el comportamiento general del bebé
• Mantén comunicación regular con tu pediatra
• Confía en tu instinto parental

⚠️ **Importante:** Esta información es orientativa. Para diagnósticos y tratamientos específicos, siempre consulta con un profesional de la salud.

¿En qué área específica te gustaría que te ayude?`
};

function generateFallbackResponse(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  if (message.includes('fiebre') || message.includes('temperatura') || message.includes('°c')) {
    return medicalFallbackResponses.fiebre;
  }
  
  if (message.includes('peso') || message.includes('alimenta') || message.includes('come') || message.includes('lactancia')) {
    return medicalFallbackResponses.alimentacion;
  }
  
  if (message.includes('desarrollo') || message.includes('hito') || message.includes('gatear') || message.includes('caminar') || message.includes('hablar')) {
    return medicalFallbackResponses.desarrollo;
  }
  
  if (message.includes('sueño') || message.includes('duerme') || message.includes('siesta') || message.includes('noche')) {
    return medicalFallbackResponses.sueno;
  }
  
  if (message.includes('vacuna') || message.includes('inmuni') || message.includes('calendario')) {
    return medicalFallbackResponses.vacunas;
  }
  
  return medicalFallbackResponses.general;
}

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
          features: hasOpenAI ? ['health', 'openai', 'fallback'] : ['health', 'fallback'],
          openai_configured: hasOpenAI,
          fallback_enabled: true,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // OpenAI Chat endpoint with fallback
      if (url.pathname === '/api/openai/chat' && request.method === 'POST') {
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

        // Try OpenAI first if API key is available
        if (env?.OPENAI_API_KEY) {
          try {
            const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: body.options?.model || 'gpt-4o-mini',
                messages: body.messages,
                temperature: body.options?.temperature || 0.7,
                max_tokens: body.options?.maxTokens || 500,
              }),
            });

            if (openaiResponse.ok) {
              const openaiData = await openaiResponse.json() as any;
              
              return new Response(JSON.stringify({
                success: true,
                data: {
                  response: openaiData.choices?.[0]?.message?.content || 'No response',
                  usage: openaiData.usage,
                  model: body.options?.model || 'gpt-4o-mini',
                  source: 'openai'
                },
                timestamp: new Date().toISOString()
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          } catch (openaiError) {
            console.log('OpenAI failed, using fallback:', openaiError);
          }
        }

        // Fallback response
        const userMessage = body.messages[body.messages.length - 1]?.content || '';
        const fallbackResponse = generateFallbackResponse(userMessage);
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            response: fallbackResponse,
            model: 'fallback-medical-assistant',
            source: 'fallback',
            note: env?.OPENAI_API_KEY ? 
              '⚠️ OpenAI no disponible temporalmente. Usando respuestas médicas predefinidas.' :
              'ℹ️ Usando respuestas médicas predefinidas.'
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
