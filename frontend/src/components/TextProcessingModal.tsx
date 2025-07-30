import React, { useState, useRef, useEffect } from 'react';
import apiService from '../services/apiService';
import { useData } from '../contexts/DataContext';
import '../styles/TextProcessingModal.css';

interface TextProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessed?: (result: any) => void;
}

interface ProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

const TextProcessingModal: React.FC<TextProcessingModalProps> = ({
  isOpen,
  onClose,
  onProcessed
}) => {
  const { getSmartContext } = useData();
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [processingType, setProcessingType] = useState<'extract' | 'chat'>('extract');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleProcess = async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setResult(null);

    try {
      let response: ProcessingResult;

      if (processingType === 'extract') {
        // Procesar extracción de datos
        response = await apiService.extractData({
          input: inputText,
          inputType: 'text',
          schema: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              data: { type: 'object' },
              confidence: { type: 'number' },
              requiresAttention: { type: 'boolean' },
              notes: { type: 'string' }
            }
          }
        });
      } else {
        // Procesar chat
        const context = await getSmartContext();
        response = await apiService.chatCompletion({
          messages: [
            {
              role: 'user',
              content: inputText
            }
          ],
          context,
          options: {
            model: 'gpt-4o',
            temperature: 0.7,
            maxTokens: 1000
          }
        });
      }

      setResult(response);
      
      if (response.success && onProcessed) {
        onProcessed(response.data);
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Error al procesar el texto'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setInputText('');
    setResult(null);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleProcess();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="text-processing-modal-overlay">
      <div className="text-processing-modal">
        <div className="modal-header">
          <h2 className="modal-title">Procesar Texto con IA</h2>
          <button className="modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="processing-type-selector">
            <label className="radio-label">
              <input
                type="radio"
                name="processingType"
                value="extract"
                checked={processingType === 'extract'}
                onChange={(e) => setProcessingType(e.target.value as 'extract' | 'chat')}
              />
              <span className="radio-text">Extraer Datos</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="processingType"
                value="chat"
                checked={processingType === 'chat'}
                onChange={(e) => setProcessingType(e.target.value as 'extract' | 'chat')}
              />
              <span className="radio-text">Consultar IA</span>
            </label>
          </div>

          <div className="input-section">
            <label className="input-label">
              {processingType === 'extract' 
                ? 'Describe la actividad o síntoma para extraer datos:'
                : 'Escribe tu pregunta o consulta:'
              }
            </label>
            <textarea
              ref={textareaRef}
              className="text-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                processingType === 'extract'
                  ? 'Ej: "Maxi pesa 8.5 kg hoy" o "Tiene fiebre de 38.5°C"'
                  : 'Ej: "¿Es normal que Maxi duerma tanto?"'
              }
              rows={4}
              disabled={isProcessing}
            />
          </div>

          <div className="action-buttons">
            <button
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isProcessing}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleProcess}
              disabled={!inputText.trim() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="loading-spinner"></span>
                  Procesando...
                </>
              ) : (
                processingType === 'extract' ? 'Extraer Datos' : 'Consultar IA'
              )}
            </button>
          </div>

          {result && (
            <div className={`result-section ${result.success ? 'success' : 'error'}`}>
              <h3 className="result-title">
                {result.success ? '✅ Resultado' : '❌ Error'}
              </h3>
              <div className="result-content">
                {result.success ? (
                  <pre className="result-data">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                ) : (
                  <p className="result-error">{result.error}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextProcessingModal;