// Test script para verificar el sistema de conversaciones multi-agente
import AgentConversationSystem from './services/agentConversationSystem';

async function testMultiAgentConversation() {
  console.log('🧪 Iniciando test del sistema de conversaciones multi-agente');
  
  const conversationSystem = AgentConversationSystem.getInstance();
  
  const testCases = [
    {
      name: 'Medición de peso y temperatura',
      input: 'Maxi pesó 4.2 kg hoy y tiene una temperatura de 37.8°C. Parece un poco irritable.',
      expected: {
        classification: 'measurement_data',
        urgency: 'medium',
        agents: ['medical_analyzer', 'data_extractor', 'safety_validator']
      }
    },
    {
      name: 'Síntomas de fiebre alta',
      input: 'Mi bebé tiene 39.5°C de fiebre desde ayer, está muy caliente y no quiere comer.',
      expected: {
        classification: 'symptom_report',
        urgency: 'high',
        agents: ['medical_analyzer', 'safety_validator']
      }
    },
    {
      name: 'Hito de desarrollo',
      input: 'Hoy Maxi sonrió por primera vez! Fue muy emocionante verlo responder cuando le hablo.',
      expected: {
        classification: 'milestone_update',
        urgency: 'low',
        agents: ['timeline_agent']
      }
    },
    {
      name: 'Consulta sobre medicamento',
      input: 'El pediatra recetó paracetamol 80mg cada 6 horas. ¿Cómo debo dárselo?',
      expected: {
        classification: 'medication_query',
        urgency: 'medium',
        agents: ['pharmacological_agent', 'safety_validator']
      }
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log(`\n📋 Ejecutando test: ${testCase.name}`);
    console.log(`📝 Input: "${testCase.input}"`);
    
    try {
      const startTime = Date.now();
      const session = await conversationSystem.startConversation(
        testCase.input,
        'test_analysis'
      );
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✅ Conversación completada en ${duration}ms`);
      console.log(`📊 Mensajes intercambiados: ${session.messages.length}`);
      console.log(`🎯 Estado final: ${session.status}`);
      
      if (session.finalResult) {
        console.log(`🔍 Confianza: ${(session.finalResult.confidence * 100).toFixed(1)}%`);
        console.log(`🛡️ Nivel de seguridad: ${session.finalResult.safetyLevel}`);
        console.log(`💡 Recomendaciones: ${session.finalResult.recommendations?.length || 0}`);
      }

      // Analizar la conversación
      const analysisMessages = session.messages.filter(m => m.type === 'analysis');
      const alertMessages = session.messages.filter(m => m.type === 'alert');
      const questionMessages = session.messages.filter(m => m.type === 'question');
      const responseMessages = session.messages.filter(m => m.type === 'response');

      console.log(`🔬 Análisis: ${analysisMessages.length} mensajes`);
      console.log(`🚨 Alertas: ${alertMessages.length} mensajes`);
      console.log(`❓ Preguntas: ${questionMessages.length} mensajes`);
      console.log(`💬 Respuestas: ${responseMessages.length} mensajes`);

      // Verificar que los agentes esperados participaron
      const participantIds = session.messages.map(m => m.from);
      const uniqueParticipants = [...new Set(participantIds)];
      console.log(`👥 Agentes participantes: ${uniqueParticipants.join(', ')}`);

      results.push({
        testCase: testCase.name,
        success: session.status === 'completed',
        duration,
        messageCount: session.messages.length,
        participants: uniqueParticipants,
        confidence: session.finalResult?.confidence || 0,
        safetyLevel: session.finalResult?.safetyLevel || 'unknown',
        session
      });

    } catch (error) {
      console.error(`❌ Error en test "${testCase.name}":`, error);
      results.push({
        testCase: testCase.name,
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Resumen de resultados
  console.log('\n📈 RESUMEN DE RESULTADOS:');
  console.log('================================');
  
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  
  console.log(`✅ Tests exitosos: ${successfulTests.length}/${results.length}`);
  console.log(`❌ Tests fallidos: ${failedTests.length}/${results.length}`);
  
  if (successfulTests.length > 0) {
    const avgDuration = successfulTests.reduce((sum, r) => sum + (r.duration || 0), 0) / successfulTests.length;
    const avgMessages = successfulTests.reduce((sum, r) => sum + (r.messageCount || 0), 0) / successfulTests.length;
    const avgConfidence = successfulTests.reduce((sum, r) => sum + (r.confidence || 0), 0) / successfulTests.length;
    
    console.log(`⏱️ Duración promedio: ${Math.round(avgDuration)}ms`);
    console.log(`💬 Mensajes promedio: ${Math.round(avgMessages)}`);
    console.log(`🎯 Confianza promedio: ${(avgConfidence * 100).toFixed(1)}%`);
  }

  if (failedTests.length > 0) {
    console.log('\n❌ TESTS FALLIDOS:');
    failedTests.forEach(test => {
      console.log(`- ${test.testCase}: ${test.error}`);
    });
  }

  // Mostrar ejemplo de conversación exitosa
  const successfulConversation = successfulTests.find(r => r.session);
  if (successfulConversation?.session) {
    console.log('\n💬 EJEMPLO DE CONVERSACIÓN:');
    console.log('===========================');
    const session = successfulConversation.session;
    session.messages.slice(0, 5).forEach(message => {
      console.log(`🤖 ${message.from}: ${message.content.substring(0, 100)}...`);
    });
    
    if (session.messages.length > 5) {
      console.log(`... y ${session.messages.length - 5} mensajes más`);
    }
  }

  return results;
}

// Función para test rápido con mock (sin OpenAI)
async function testMultiAgentConversationMock() {
  console.log('🧪 Test rápido con datos mock (sin OpenAI)');
  
  const conversationSystem = AgentConversationSystem.getInstance();
  
  try {
    const session = await conversationSystem.startConversation(
      'Test input para verificar estructura',
      'mock_test'
    );
    
    console.log(`✅ Test mock completado`);
    console.log(`📊 Estado: ${session.status}`);
    console.log(`💬 Mensajes: ${session.messages.length}`);
    console.log(`👥 Participantes: ${session.participants.length}`);
    
    return { success: true, session };
    
  } catch (error) {
    console.error('❌ Error en test mock:', error);
    return { success: false, error };
  }
}

// Export para uso en consola del navegador
declare global {
  interface Window {
    testMultiAgent: () => Promise<any>;
    testMultiAgentMock: () => Promise<any>;
  }
}

if (typeof window !== 'undefined') {
  window.testMultiAgent = testMultiAgentConversation;
  window.testMultiAgentMock = testMultiAgentConversationMock;
}

export { testMultiAgentConversation, testMultiAgentConversationMock };