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

  desarrollo: `Desarrollo infantil actualizado (según AAP 2024):

👶 **0-2 MESES (Recién nacido):**
• Control cefálico gradual • Seguimiento visual • Sonrisa social • Respuesta a sonidos fuertes
• **Señales de alerta:** No responde a sonidos, no sigue objetos, llanto inconsolable

👶 **2-4 MESES:**
• Levanta cabeza 45° boca abajo • Sonríe respondiendo • Balbucea • Agarra objetos voluntariamente
• **Estimulación:** Tiempo boca abajo supervisado, juguetes contrastantes

👶 **4-6 MESES:**
• Se voltea • Control cefálico completo • Ríe • Transfiere objetos • Reconoce cuidadores
• **Hito clave:** Introducción alimentación complementaria (6 meses)

👶 **6-9 MESES:**
• Se sienta sin apoyo • Pinza inferior • Sílabas repetidas • Ansiedad separación
• **Estimulación:** Juegos causa-efecto, exploración texturas seguras

👶 **9-12 MESES:**
• Gatea/se desplaza • Pinza superior • Primeras palabras • Comprende "no"
• **Hitos:** Bipedestación con apoyo, imitación gestos

🧠 **ESTIMULACIÓN TEMPRANA 2024:**
• Lectura desde nacimiento • Música clásica • Juego libre • Límites pantallas

⚠️ **Consulta si tu bebé no alcanza hitos en el tiempo esperado. Cada niño es único.**`,

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

  vacunas: `Calendario de vacunación actualizado (España 2024-2025):

💉 **CALENDARIO OFICIAL AEP 2024:**
• **Nacimiento:** Hepatitis B (primera dosis)
• **2 meses:** DTPa-VPI-Hib, Neumococo conjugada 13v, Rotavirus, Meningococo B
• **4 meses:** DTPa-VPI-Hib, Neumococo conjugada 13v, Rotavirus, Meningococo B  
• **6 meses:** DTPa-VPI-Hib, Hepatitis B, Neumococo conjugada 13v

💉 **SEGUNDO SEMESTRE:**
• **12 meses:** SRP (Triple vírica), Neumococo conjugada 13v, Meningococo C
• **15-18 meses:** DTPa-VPI-Hib (4ª dosis), Varicela, Meningococo B (4ª dosis)

📋 **NOVEDADES 2024:**
• Incluida vacuna Meningococo B en calendario sistemático
• Nueva pauta neumococo: 2+1 (2, 4, 12 meses)
• VRS (virus respiratorio sincitial) para grupos de riesgo

🌍 **POR COMUNIDADES AUTÓNOMAS:**
• Algunas CCAA incluyen vacunas adicionales
• Consulta el calendario específico de tu región
• Disponible en: vacunasaep.org

⚠️ **IMPORTANTE:** Información actualizada a enero 2024. Confirma con tu pediatra.`,

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

// Función para extraer datos de salud usando OpenAI
async function extractHealthData(input: string, inputType: string, schema?: any, options?: any): Promise<any> {
  const systemPrompt = `Eres un especialista médico en análisis de datos de salud infantil. Tu tarea es extraer información médica precisa de textos, imágenes o documentos.

INSTRUCCIONES:
1. Analiza el contenido proporcionado
2. Extrae datos médicos relevantes (peso, altura, temperatura, síntomas, medicamentos, etc.)
3. Identifica el tipo de registro (peso, altura, síntoma, medicación, vacuna, hito, etc.)
4. Valida que los datos sean coherentes y realistas
5. Proporciona confianza en la extracción (0-1)
6. Responde ÚNICAMENTE en formato JSON válido

FORMATO DE RESPUESTA:
{
  "type": "weight|height|temperature|symptom|medication|vaccine|milestone|note",
  "data": {
    "value": "valor extraído",
    "unit": "unidad de medida",
    "date": "fecha si está disponible",
    "context": "contexto adicional"
  },
  "confidence": 0.95,
  "requiresAttention": false,
  "notes": "notas adicionales",
  "validation": {
    "isValid": true,
    "warnings": [],
    "errors": []
  }
}

IMPORTANTE: 
- Sé preciso con las extracciones
- Valida rangos normales para la edad
- Marca datos que requieran atención médica
- Considera el contexto pediátrico`;

  const userPrompt = `Analiza el siguiente ${inputType} y extrae los datos de salud relevantes:

${input}

${schema ? `Esquema esperado: ${JSON.stringify(schema)}` : ''}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options?.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: options?.temperature || 0.1,
        max_tokens: options?.maxTokens || 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Intentar parsear la respuesta JSON
    try {
      const parsed = JSON.parse(content);
      return {
        success: true,
        data: parsed,
        source: 'openai'
      };
    } catch (parseError) {
      // Si no es JSON válido, intentar extraer información básica
      return {
        success: true,
        data: {
          type: 'note',
          data: {
            value: content,
            unit: 'text',
            date: new Date().toISOString(),
            context: 'Análisis de texto'
          },
          confidence: 0.7,
          requiresAttention: false,
          notes: 'Respuesta no estructurada de OpenAI',
          validation: {
            isValid: true,
            warnings: ['Respuesta no en formato JSON esperado'],
            errors: []
          }
        },
        source: 'openai-fallback'
      };
    }
  } catch (error) {
    console.error('Error en extractHealthData:', error);
    throw error;
  }
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
          features: hasOpenAI ? ['health', 'openai', 'fallback', 'extract'] : ['health', 'fallback'],
          openai_configured: hasOpenAI,
          fallback_enabled: true,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Extract health data endpoint
      if (url.pathname === '/api/openai/extract' && request.method === 'POST') {
        try {
          const body = await request.json() as any;
          
          if (!body?.input) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Input is required'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Try OpenAI first if API key is available
          if (env?.OPENAI_API_KEY) {
            try {
              const result = await extractHealthData(
                body.input, 
                body.inputType || 'text',
                body.schema,
                body.options
              );
              
              return new Response(JSON.stringify({
                success: true,
                data: result.data,
                source: result.source,
                timestamp: new Date().toISOString()
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            } catch (openaiError) {
              console.log('OpenAI failed, using fallback:', openaiError);
            }
          }

          // Fallback: análisis básico sin OpenAI
          const fallbackAnalysis = {
            type: 'note',
            data: {
              value: body.input,
              unit: 'text',
              date: new Date().toISOString(),
              context: 'Análisis básico'
            },
            confidence: 0.5,
            requiresAttention: false,
            notes: 'Análisis realizado sin IA avanzada',
            validation: {
              isValid: true,
              warnings: ['Análisis limitado sin OpenAI'],
              errors: []
            }
          };
          
          return new Response(JSON.stringify({
            success: true,
            data: fallbackAnalysis,
            source: 'fallback',
            note: env?.OPENAI_API_KEY ? 
              '⚠️ OpenAI no disponible temporalmente. Usando análisis básico.' :
              'ℹ️ Usando análisis básico sin OpenAI.'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('Error in extract endpoint:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Error processing extraction request'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
      
      // OpenAI Chat endpoint with fallback
      if ((url.pathname === '/api/openai/chat' || url.pathname === '/api/openai-proxy') && request.method === 'POST') {
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
            // Check if this is a vision request
            const hasImages = body.messages.some((msg: any) => 
              Array.isArray(msg.content) && 
              msg.content.some((content: any) => content.type === 'image_url')
            );

            // Use appropriate model for vision requests
            const model = hasImages ? 'gpt-4o' : (body.options?.model || 'gpt-4o-mini');
            
            const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: model,
                messages: body.messages,
                temperature: body.options?.temperature || (hasImages ? 0.1 : 0.7),
                max_tokens: body.options?.maxTokens || (hasImages ? 2000 : 500),
              }),
            });

            if (openaiResponse.ok) {
              const openaiData = await openaiResponse.json() as any;
              
              return new Response(JSON.stringify({
                success: true,
                data: {
                  response: openaiData.choices?.[0]?.message?.content || 'No response',
                  usage: openaiData.usage,
                  model: model,
                  source: 'openai',
                  isVisionRequest: hasImages
                },
                timestamp: new Date().toISOString()
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            } else {
              const errorData = await openaiResponse.text();
              console.log('OpenAI API error:', errorData);
              
              // Return specific error for vision requests
              if (hasImages) {
                return new Response(JSON.stringify({
                  success: false,
                  error: 'Error en el análisis de imagen. Por favor, intenta con una imagen más clara.',
                  details: 'Vision API temporarily unavailable',
                  source: 'openai-error'
                }), {
                  status: openaiResponse.status,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
            }
          } catch (openaiError) {
            console.log('OpenAI failed, using fallback:', openaiError);
            
            // For vision requests, return specific error
            const hasImages = body.messages.some((msg: any) => 
              Array.isArray(msg.content) && 
              msg.content.some((content: any) => content.type === 'image_url')
            );
            
            if (hasImages) {
              return new Response(JSON.stringify({
                success: false,
                error: 'Análisis de imagen no disponible temporalmente. Por favor, intenta más tarde.',
                source: 'vision-unavailable'
              }), {
                status: 503,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
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
        available_endpoints: ['/health', '/api/openai/chat', '/api/openai-proxy', '/api/openai/extract']
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
