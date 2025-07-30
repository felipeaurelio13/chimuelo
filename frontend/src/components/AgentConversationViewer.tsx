import React, { useState, useEffect, useRef } from 'react';
import { ConversationSession, ConversationMessage, AgentParticipant } from '../services/agentConversationSystem';

interface AgentConversationViewerProps {
  session: ConversationSession | null;
  isVisible: boolean;
  onClose: () => void;
}

const AgentConversationViewer: React.FC<AgentConversationViewerProps> = ({
  session,
  isVisible,
  onClose
}) => {
  const [selectedMessage, setSelectedMessage] = useState<ConversationMessage | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && session?.messages.length) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session?.messages.length]);

  if (!isVisible || !session) {
    return null;
  }

  const getAgentInfo = (agentId: string): AgentParticipant | null => {
    return session.participants.find(p => p.id === agentId) || null;
  };

  const getAgentIcon = (agentId: string): string => {
    const iconMap: { [key: string]: string } = {
      'classifier': '🔍',
      'medical_analyzer': '⚕️',
      'data_extractor': '📊',
      'safety_validator': '🛡️',
      'recommendation_synthesizer': '🎯',
      'system': '🖥️'
    };
    return iconMap[agentId] || '🤖';
  };

  const getMessageTypeColor = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      'analysis': 'bg-blue-100 border-blue-300 text-blue-800',
      'question': 'bg-yellow-100 border-yellow-300 text-yellow-800',
      'response': 'bg-green-100 border-green-300 text-green-800',
      'recommendation': 'bg-purple-100 border-purple-300 text-purple-800',
      'alert': 'bg-red-100 border-red-300 text-red-800',
      'conclusion': 'bg-teal-100 border-teal-300 text-teal-800'
    };
    return colorMap[type] || 'bg-gray-100 border-gray-300 text-gray-800';
  };

  const getStatusIcon = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'starting': '🚀',
      'active': '⚡',
      'deliberating': '🤔',
      'concluding': '🎯',
      'completed': '✅',
      'error': '❌'
    };
    return statusMap[status] || '⏳';
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const formatDuration = (): string => {
    if (!session.endTime) return 'En progreso...';
    const durationMs = session.endTime.getTime() - session.startTime.getTime();
    const seconds = Math.round(durationMs / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-4">
            <div className="text-2xl">{getStatusIcon(session.status)}</div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                🤖 Conversación Multi-Agente
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {session.id} • {formatDuration()} • {session.messages.length} mensajes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Estado: <span className="capitalize">{session.status}</span>
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Tema: {session.topic}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
              >
                {showDetails ? 'Ocultar' : 'Mostrar'} Detalles
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Conversation Messages */}
          <div className="flex-1 flex flex-col">
            {/* Input Display */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-600">
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                📝 Input Original:
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 p-3 rounded border">
                {session.input}
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {session.messages.map((message, index) => {
                const agent = getAgentInfo(message.from);
                const isDirectMessage = message.to && message.to !== 'broadcast';
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.from === 'system' ? 'justify-center' : ''
                    }`}
                  >
                    {/* Agent Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg">
                        {getAgentIcon(message.from)}
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 max-w-3xl">
                      {/* Message Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {agent?.name || message.from}
                        </span>
                        {isDirectMessage && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            → {message.to}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full border ${getMessageTypeColor(message.type)}`}>
                          {message.type}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimestamp(message.timestamp)}
                        </span>
                        {message.confidence && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Conf: {(message.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className={`p-3 rounded-lg border ${getMessageTypeColor(message.type)}`}>
                        <div className="text-sm">
                          {message.content}
                        </div>
                        
                        {/* Data Preview */}
                        {message.data && (
                          <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                            <button
                              onClick={() => setSelectedMessage(
                                selectedMessage?.id === message.id ? null : message
                              )}
                              className="text-xs opacity-75 hover:opacity-100"
                            >
                              {selectedMessage?.id === message.id ? '▼' : '▶'} Ver datos técnicos
                            </button>
                            
                            {selectedMessage?.id === message.id && (
                              <pre className="mt-2 text-xs bg-black bg-opacity-10 p-2 rounded overflow-x-auto">
                                {JSON.stringify(message.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Sidebar - Agent Details */}
          {showDetails && (
            <div className="w-80 border-l border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-4 overflow-y-auto">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                👥 Participantes ({session.participants.length})
              </h3>
              
              <div className="space-y-3">
                {session.participants.map((agent) => (
                  <div
                    key={agent.id}
                    className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getAgentIcon(agent.id)}</span>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {agent.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                          {agent.role}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="font-medium">Especialización:</span>
                        <div className="text-gray-600 dark:text-gray-400">
                          {agent.specialization.join(', ')}
                        </div>
                      </div>
                      
                      <div>
                        <span className="font-medium">Mensajes enviados:</span>
                        <span className="ml-1 text-gray-600 dark:text-gray-400">
                          {session.messages.filter(m => m.from === agent.id).length}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Final Result */}
              {session.finalResult && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                    🎯 Resultado Final
                  </h3>
                  
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600 space-y-3">
                    <div>
                      <div className="text-xs font-medium">Nivel de Confianza:</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {(session.finalResult.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs font-medium">Nivel de Seguridad:</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {session.finalResult.safetyLevel}
                      </div>
                    </div>
                    
                    {session.finalResult.recommendations && (
                      <div>
                        <div className="text-xs font-medium">Recomendaciones:</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {session.finalResult.recommendations.length} generadas
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600 dark:text-gray-400">
              Iniciado: {session.startTime.toLocaleString('es-ES')}
              {session.endTime && (
                <span> • Finalizado: {session.endTime.toLocaleString('es-ES')}</span>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {session.status === 'active' && (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  Procesando...
                </div>
              )}
              
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentConversationViewer;