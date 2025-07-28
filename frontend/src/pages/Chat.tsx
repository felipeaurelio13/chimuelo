import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { type ChatMessage } from '../services/databaseService';
import { chatContextService } from '../services/chatContextService';
import { visionAnalysisService, VisionAnalysisResult } from '../services/visionAnalysisService';
import DocumentAnalysisModal from '../components/DocumentAnalysisModal';
import AppFooter from '../components/AppFooter';
import '../styles/Chat.css';

interface ChatInputData {
  message: string;
  includeContext: boolean;
  searchWeb: boolean;
}

interface SmartSuggestion {
  text: string;
  category: 'health' | 'development' | 'nutrition' | 'sleep' | 'general';
  icon: string;
}

const Chat: React.FC = () => {
  if (import.meta.env.VITE_DEV === 'TRUE') {
    console.log('Chat component rendered.');
  }
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    state,
    createChatSession,
    updateChatSession,
    setActiveChatSession,
    getSmartContext,
    refreshChatSessions
  } = useData();
  
  const { chatSessions, activeChatSession } = state;

  // Local state
  const [inputData, setInputData] = useState<ChatInputData>({
    message: '',
    includeContext: true,
    searchWeb: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMounted = useRef(true);

  // Update chat context with health records when they change
  useEffect(() => {
    chatContextService.setHealthRecords(state.healthRecords);
  }, [state.healthRecords]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Chat: Scrolled to end of messages.');
    }
  }, []);

  useEffect(() => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Chat component mounted.');
    }
    scrollToBottom();
  }, [activeChatSession?.messages, scrollToBottom]);

  // Load chat sessions on mount
  useEffect(() => {
    if (user && chatSessions.length === 0) {
      refreshChatSessions();
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Chat: Loading chat sessions for user:', user?.id);
      }
    }
  }, [user, chatSessions.length, refreshChatSessions]);

  // Smart suggestions based on recent data
  const smartSuggestions: SmartSuggestion[] = [
    { text: "¿Cómo está el crecimiento de Maxi según sus últimas mediciones?", category: "development", icon: "📈" },
    { text: "¿Hay algo preocupante en los síntomas recientes?", category: "health", icon: "🤒" },
    { text: "¿Qué hitos de desarrollo debería esperar próximamente?", category: "development", icon: "🎯" },
    { text: "¿La alimentación actual es adecuada para su edad?", category: "nutrition", icon: "🍼" },
    { text: "¿Los patrones de sueño son normales?", category: "sleep", icon: "😴" },
    { text: "¿Cuándo debería ser la próxima consulta médica?", category: "health", icon: "👩‍⚕️" },
    { text: "¿Qué actividades puedo hacer para estimular su desarrollo?", category: "development", icon: "🧸" },
    { text: "¿Los medicamentos actuales están funcionando bien?", category: "health", icon: "💊" }
  ];

  // Handle message input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputData(prev => ({ ...prev, message: e.target.value }));
    setShowSuggestions(e.target.value.length === 0);
    
    // Auto-resize textarea
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Chat: Input message changed.', e.target.value);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SmartSuggestion) => {
    setInputData(prev => ({ ...prev, message: suggestion.text }));
    setShowSuggestions(false);
    inputRef.current?.focus();
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Chat: Suggestion clicked:', suggestion.text);
    }
  };

  // Handle document analysis completion
  const handleDocumentAnalysis = async (result: VisionAnalysisResult) => {
    if (!result.success || !result.data) {
      setError('Error al analizar el documento');
      return;
    }

    // Create a formatted message with the extracted data
    const extractedData = result.data;
    
    let analysisMessage = `📄 **Documento Analizado: ${extractedData.documentType}**\n\n`;
    
    if (extractedData.patientInfo.name) {
      analysisMessage += `👤 **Paciente:** ${extractedData.patientInfo.name}\n`;
    }
    if (extractedData.extractedData.date) {
      analysisMessage += `📅 **Fecha:** ${extractedData.extractedData.date}\n`;
    }
    if (extractedData.extractedData.provider) {
      analysisMessage += `🏥 **Proveedor:** ${extractedData.extractedData.provider}\n`;
    }
    
    if (extractedData.extractedData.mainFindings.length > 0) {
      analysisMessage += `\n🔍 **Hallazgos principales:**\n`;
      extractedData.extractedData.mainFindings.forEach(finding => {
        analysisMessage += `• ${finding}\n`;
      });
    }
    
    if (extractedData.extractedData.medications.length > 0) {
      analysisMessage += `\n💊 **Medicamentos:**\n`;
      extractedData.extractedData.medications.forEach(med => {
        analysisMessage += `• ${med.name}`;
        if (med.dose) analysisMessage += ` - ${med.dose}`;
        if (med.frequency) analysisMessage += ` - ${med.frequency}`;
        analysisMessage += `\n`;
      });
    }

    if (extractedData.extractedData.urgentFlags.length > 0) {
      analysisMessage += `\n⚠️ **Requiere atención:**\n`;
      extractedData.extractedData.urgentFlags.forEach(flag => {
        analysisMessage += `• ${flag}\n`;
      });
    }

    if (extractedData.analysisNotes.allergyWarnings.length > 0) {
      analysisMessage += `\n🚨 **Advertencias de alergias:**\n`;
      extractedData.analysisNotes.allergyWarnings.forEach(warning => {
        analysisMessage += `• ${warning}\n`;
      });
    }

    analysisMessage += `\n**¿Tienes alguna pregunta específica sobre este documento?**`;
    
    // Send the analysis as a message for AI to process
    setInputData(prev => ({ ...prev, message: analysisMessage }));
    setShowSuggestions(false);
  };

  // Create new chat session
  const handleNewChat = useCallback(async () => {
    if (!user) return;
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Chat: New chat initiated.');
    }
    setIsLoading(true);
    setError(null);
    setIsTyping(true);

    try {
      const title = `Chat ${new Date().toLocaleDateString()}`;
      const newSession = await createChatSession(title);
      setActiveChatSession(newSession);
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Chat: New chat session created:', newSession.title);
      }
    } catch (error) {
      console.error('Error creating chat session:', error);
      setError('Error al crear nueva conversación');
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.error('Chat: Error creating new session:', error);
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Chat: New chat process finished.');
      }
    }
  }, [user, createChatSession, setActiveChatSession]);

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!inputData.message.trim() || !user || isLoading) return;

    const message = inputData.message.trim();
    setIsLoading(true);
    setError(null);
    setIsTyping(true);

    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Chat: Sending message to AI:', message);
    }

    try {
      // Create session if none exists
      let currentSession = activeChatSession;
      if (!currentSession) {
        currentSession = await createChatSession(`Chat ${new Date().toLocaleDateString()}`);
        setActiveChatSession(currentSession);
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Chat: Created new session for message:', currentSession.title);
        }
      }

      // Create user message
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        userId: user.id,
        role: 'user',
        content: message,
        timestamp: new Date()
      };

      // Add user message to session
      const updatedMessages = [...(currentSession.messages || []), userMessage];
      await updateChatSession(currentSession.id, { 
        messages: updatedMessages,
        title: currentSession.title === `Chat ${new Date().toLocaleDateString()}` 
          ? message.substring(0, 50) + (message.length > 50 ? '...' : '')
          : currentSession.title
      });

      // Get smart context if requested
      let context = undefined;
      if (inputData.includeContext) {
        try {
          context = await getSmartContext();
          if (import.meta.env.VITE_DEV === 'TRUE') {
            console.log('Chat: Smart context fetched.');
          }
        } catch (error) {
          console.warn('Could not get smart context:', error);
          if (import.meta.env.VITE_DEV === 'TRUE') {
            console.warn('Chat: Could not get smart context:', error);
          }
        }
      }

      // Prepare chat request
      const chatRequest = {
        messages: [
          ...updatedMessages.slice(-10), // Last 10 messages for context
          userMessage
        ].map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        context: inputData.includeContext ? context : undefined,
        searchWeb: inputData.searchWeb,
        options: {
          model: 'gpt-4-turbo-preview',
          temperature: 0.7,
          maxTokens: 1000
        }
      };

      // Send to AI
      const response = await apiService.chatCompletion(chatRequest);
      
      if (response.success && response.data) {
        // Create assistant message
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          userId: user.id,
          role: 'assistant',
          content: response.data.response || response.data.content || 'Lo siento, no pude generar una respuesta.',
          timestamp: new Date()
        };

        // Add assistant message to session
        const finalMessages = [...updatedMessages, assistantMessage];
        await updateChatSession(currentSession.id, { 
          messages: finalMessages
        });

        // Clear input and reset
        setInputData(prev => ({ ...prev, message: '' }));
        setShowSuggestions(false);
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Chat: AI response received and session updated.', assistantMessage.content);
        }
      } else {
        throw new Error(response.error || 'No se pudo obtener respuesta del asistente');
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setError(error.message || 'Error al enviar el mensaje. Por favor intenta de nuevo.');
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.error('Chat: Error sending message:', error);
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Chat: Message sending process finished.');
      }
    }
  }, [inputData, user, isLoading, activeChatSession, createChatSession, setActiveChatSession, updateChatSession, getSmartContext]);

  // Handle enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Chat: Key pressed in input.', e.key);
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format message content
  const formatMessageContent = (content: string): string => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div className="header-top">
          <button className="back-button" onClick={() => navigate(-1)}>
            ←
          </button>
          <div className="chat-title">
            <h1>Chat con IA</h1>
            {activeChatSession && (
              <span className="session-title">{activeChatSession.title}</span>
            )}
          </div>
          <div className="header-actions">
            <button className="new-chat-button" onClick={handleNewChat}>
              ✨ Nuevo
            </button>
          </div>
        </div>

        {/* Chat Options */}
        <div className="chat-options">
          <label className="option-toggle">
            <input
              type="checkbox"
              checked={inputData.includeContext}
              onChange={(e) => setInputData(prev => ({ ...prev, includeContext: e.target.checked }))}
            />
            <span>📊 Incluir contexto médico</span>
          </label>
          <label className="option-toggle">
            <input
              type="checkbox"
              checked={inputData.searchWeb}
              onChange={(e) => setInputData(prev => ({ ...prev, searchWeb: e.target.checked }))}
            />
            <span>🌐 Buscar en web</span>
          </label>
        </div>
      </header>

      <main className="chat-content">
        {/* Messages */}
        <div className="messages-container">
          {!activeChatSession || activeChatSession.messages.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-icon">💬</div>
              <h3>¡Hola! Soy tu asistente de salud</h3>
              <p>Puedo ayudarte con preguntas sobre el desarrollo, salud y bienestar de Maxi. Tengo acceso a todo su historial médico.</p>
              
              {showSuggestions && (
                <div className="suggestions-grid">
                  <h4>💡 Preguntas sugeridas:</h4>
                  <div className="suggestions">
                    {smartSuggestions.slice(0, 6).map((suggestion, index) => (
                      <button
                        key={index}
                        className={`suggestion-button ${suggestion.category}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <span className="suggestion-icon">{suggestion.icon}</span>
                        <span className="suggestion-text">{suggestion.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="messages-list">
              {activeChatSession.messages.map((message) => (
                <div key={message.id} className={`message ${message.role}`}>
                  <div className="message-content">
                    <div className="message-bubble">
                      <div 
                        className="message-text"
                        dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                      />
                      
                      {message.context && message.role === 'assistant' && (
                        <div className="message-context">
                          {message.context.confidence && (
                            <span className="confidence">
                              Confianza: {Math.round(message.context.confidence * 100)}%
                            </span>
                          )}
                          {message.context.relatedRecords && message.context.relatedRecords.length > 0 && (
                            <span className="related-records">
                              📋 {message.context.relatedRecords.length} registros consultados
                            </span>
                          )}
                          {message.context.searchResults && message.context.searchResults.length > 0 && (
                            <span className="search-results">
                              🌐 {message.context.searchResults.length} fuentes web consultadas
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="message-metadata">
                      <span className="message-time">
                        {message.timestamp.toLocaleTimeString('es-ES', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      {message.tokens && (
                        <span className="message-tokens">{message.tokens} tokens</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="message assistant">
                  <div className="message-content">
                    <div className="message-bubble typing">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="chat-input-area">
        {error && (
          <div className="error-message">
            ❌ {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {showSuggestions && inputData.message.length === 0 && activeChatSession && activeChatSession.messages.length > 0 && (
          <div className="quick-suggestions">
            {smartSuggestions.slice(6, 8).map((suggestion, index) => (
              <button
                key={index}
                className="quick-suggestion"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion.icon} {suggestion.text}
              </button>
            ))}
          </div>
        )}

        <div className="input-container">
          <button
            className="document-analysis-btn"
            onClick={() => setShowDocumentModal(true)}
            title="Analizar documento médico"
            disabled={isLoading}
          >
            📄
          </button>
          
          <textarea
            ref={inputRef}
            value={inputData.message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Pregúntame sobre la salud y desarrollo de Maxi..."
            className="message-input"
            rows={1}
            disabled={isLoading}
          />
          
          <button
            className={`send-button ${inputData.message.trim() ? 'active' : 'disabled'}`}
            onClick={handleSendMessage}
            disabled={!inputData.message.trim() || isLoading}
          >
            {isLoading ? (
              <div className="loading-spinner small"></div>
            ) : (
              '🚀'
            )}
          </button>
        </div>
        
        {/* Document Analysis Modal */}
        <DocumentAnalysisModal
          isOpen={showDocumentModal}
          onClose={() => setShowDocumentModal(false)}
          onAnalysisComplete={handleDocumentAnalysis}
        />
      </footer>
      
      {/* App Footer */}
      <AppFooter />
    </div>
  );
};

export default Chat;
export { Chat };