import React, { useState } from 'react';

interface MultiAgentSystemViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MultiAgentSystemViewer: React.FC<MultiAgentSystemViewerProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  if (!isOpen) return null;

  const agents = [
    {
      id: 'classifier',
      name: '🔍 Agente Clasificador',
      description: 'Punto de entrada universal. Analiza y clasifica cualquier input.',
      inputs: ['Texto', 'Imagen', 'PDF', 'Audio'],
      outputs: ['Clasificación', 'Confianza', 'Routing'],
      color: 'bg-blue-500'
    },
    {
      id: 'vision',
      name: '👁️ Agente Visión',
      description: 'Procesamiento de imágenes y PDFs usando OpenAI Vision API.',
      inputs: ['Imágenes', 'PDFs'],
      outputs: ['Texto extraído', 'Datos estructurados'],
      color: 'bg-purple-500'
    },
    {
      id: 'text',
      name: '📝 Agente Texto',
      description: 'Análisis inteligente de texto plano.',
      inputs: ['Texto'],
      outputs: ['Entidades', 'Keywords', 'Sentimiento'],
      color: 'bg-green-500'
    },
    {
      id: 'medical',
      name: '⚕️ Agente Médico',
      description: 'Análisis médico especializado. Extrae síntomas, diagnósticos y tratamientos.',
      inputs: ['Documentos médicos'],
      outputs: ['Análisis médico', 'Alertas', 'Recomendaciones'],
      color: 'bg-red-500'
    },
    {
      id: 'administrative',
      name: '💼 Agente Administrativo',
      description: 'Procesamiento de boletas, facturas y documentos administrativos.',
      inputs: ['Boletas', 'Facturas'],
      outputs: ['Costos', 'Fechas', 'Proveedores'],
      color: 'bg-yellow-500'
    },
    {
      id: 'timeline',
      name: '📅 Agente Timeline',
      description: 'Gestión de hitos y eventos importantes.',
      inputs: ['Hitos', 'Eventos'],
      outputs: ['Timeline actualizado', 'Categorización'],
      color: 'bg-indigo-500'
    },
    {
      id: 'metrics',
      name: '📊 Agente Métricas',
      description: 'Procesamiento de mediciones: peso, altura, temperatura.',
      inputs: ['Mediciones'],
      outputs: ['Datos históricos', 'Tendencias'],
      color: 'bg-orange-500'
    },
    {
      id: 'pharma',
      name: '💉 Agente Farmacológico',
      description: 'Gestión de medicamentos y vacunas.',
      inputs: ['Medicamentos', 'Vacunas'],
      outputs: ['Registro farmacológico', 'Alertas'],
      color: 'bg-pink-500'
    },
    {
      id: 'ficha',
      name: '👶 Agente Ficha Maxi',
      description: 'Coordinador central. Actualiza la ficha médica de Maxi.',
      inputs: ['Todos los agentes'],
      outputs: ['Ficha actualizada', 'Base datos'],
      color: 'bg-teal-500'
    }
  ];

  const flows = [
    { from: 'classifier', to: 'vision', label: 'Imagen/PDF' },
    { from: 'classifier', to: 'text', label: 'Texto' },
    { from: 'vision', to: 'medical', label: 'Doc. Médico' },
    { from: 'vision', to: 'administrative', label: 'Boleta' },
    { from: 'text', to: 'timeline', label: 'Hito' },
    { from: 'text', to: 'metrics', label: 'Medición' },
    { from: 'text', to: 'pharma', label: 'Medicamento' },
    { from: 'medical', to: 'ficha', label: 'Actualización' },
    { from: 'administrative', to: 'ficha', label: 'Registro' },
    { from: 'timeline', to: 'ficha', label: 'Hito' },
    { from: 'metrics', to: 'ficha', label: 'Medición' },
    { from: 'pharma', to: 'ficha', label: 'Medicamento' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              🤖 Sistema Multiagente Chimuelo
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Descripción del sistema */}
          <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Arquitectura del Sistema
            </h3>
            <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
              Sistema inteligente que clasifica automáticamente cualquier input (texto, imagen, PDF) 
              y lo rutea al agente especializado correspondiente. Cada agente procesa la información 
              según su especialidad y actualiza la ficha médica de Maxi con datos históricos que 
              nunca se sobreescriben.
            </p>
          </div>

          {/* Flujo del sistema */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📊 Flujo de Procesamiento
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                <div className="px-3 py-1 bg-blue-500 text-white rounded-full">📥 Input</div>
                <span className="text-gray-600 dark:text-gray-300">→</span>
                <div className="px-3 py-1 bg-purple-500 text-white rounded-full">🔍 Clasificador</div>
                <span className="text-gray-600 dark:text-gray-300">→</span>
                <div className="px-3 py-1 bg-green-500 text-white rounded-full">🎯 Router</div>
                <span className="text-gray-600 dark:text-gray-300">→</span>
                <div className="px-3 py-1 bg-orange-500 text-white rounded-full">🤖 Agente Especializado</div>
                <span className="text-gray-600 dark:text-gray-300">→</span>
                <div className="px-3 py-1 bg-teal-500 text-white rounded-full">👶 Ficha Maxi</div>
                <span className="text-gray-600 dark:text-gray-300">→</span>
                <div className="px-3 py-1 bg-gray-600 text-white rounded-full">💾 Base Datos</div>
              </div>
            </div>
          </div>

          {/* Grid de agentes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedAgent === agent.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                } bg-white dark:bg-gray-800`}
                onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
              >
                <div className="flex items-center mb-2">
                  <div className={`w-3 h-3 rounded-full ${agent.color} mr-2`}></div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {agent.name}
                  </h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
                  {agent.description}
                </p>
                
                {selectedAgent === agent.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="mb-2">
                      <h5 className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                        📥 Inputs:
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {agent.inputs.map((input, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                            {input}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                        📤 Outputs:
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {agent.outputs.map((output, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                            {output}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Ejemplos de uso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
                📋 Ejemplo: Boleta Médica
              </h3>
              <div className="text-sm text-green-800 dark:text-green-200 space-y-2">
                <div className="flex items-center">
                  <span className="w-4 text-center">1.</span>
                  <span>Usuario sube foto de boleta médica</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 text-center">2.</span>
                  <span>🔍 Clasificador → identifica como documento administrativo</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 text-center">3.</span>
                  <span>👁️ Visión → extrae texto con OpenAI Vision</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 text-center">4.</span>
                  <span>💼 Administrativo → extrae fecha, costo, proveedor</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 text-center">5.</span>
                  <span>👶 Ficha Maxi → registra en historial</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 text-center">6.</span>
                  <span>💾 Base Datos → guarda con timestamp</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-3">
                📊 Ejemplo: Medición de Peso
              </h3>
              <div className="text-sm text-purple-800 dark:text-purple-200 space-y-2">
                <div className="flex items-center">
                  <span className="w-4 text-center">1.</span>
                  <span>Usuario escribe "Maxi pesa 8.5kg"</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 text-center">2.</span>
                  <span>🔍 Clasificador → identifica como medición</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 text-center">3.</span>
                  <span>📝 Texto → extrae entidades numéricas</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 text-center">4.</span>
                  <span>📊 Métricas → procesa peso y fecha</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 text-center">5.</span>
                  <span>👶 Ficha Maxi → actualiza datos actuales</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 text-center">6.</span>
                  <span>💾 Base Datos → mantiene historial completo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Características del sistema de datos */}
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-3">
              💾 Sistema de Datos Históricos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800 dark:text-yellow-200">
              <div>
                <h4 className="font-semibold mb-2">🔒 Características:</h4>
                <ul className="space-y-1">
                  <li>• ❌ Nunca sobreescribe datos</li>
                  <li>• 📅 Siempre guarda con timestamp</li>
                  <li>• 📊 Mantiene historial completo</li>
                  <li>• 🔍 Consultas temporales precisas</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🧠 Consultas Inteligentes:</h4>
                <ul className="space-y-1">
                  <li>• "¿Cuánto pesaba hace 2 meses?"</li>
                  <li>• "Mostrar tendencia de crecimiento"</li>
                  <li>• "Historial de vacunas"</li>
                  <li>• "Gastos médicos por mes"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiAgentSystemViewer;