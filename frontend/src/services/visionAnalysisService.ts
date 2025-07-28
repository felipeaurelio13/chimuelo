import { chatContextService } from './chatContextService';

export interface VisionAnalysisRequest {
  imageFile: File;
  documentType: 'medical_report' | 'prescription' | 'lab_result' | 'vaccine_record' | 'growth_chart' | 'general';
  additionalContext?: string;
}

export interface ExtractedMedicalData {
  documentType: string;
  patientInfo: {
    name?: string;
    dateOfBirth?: string;
    age?: string;
  };
  extractedData: {
    date?: string;
    provider?: string;
    mainFindings: string[];
    medications: Array<{
      name: string;
      dose?: string;
      frequency?: string;
      duration?: string;
    }>;
    measurements: {
      weight?: string;
      height?: string;
      temperature?: string;
      other: Record<string, any>;
    };
    recommendations: string[];
    nextAppointment?: string;
    urgentFlags: string[];
  };
  analysisNotes: {
    confidence: 'alto' | 'medio' | 'bajo';
    allergyWarnings: string[];
    ageAppropriate: string;
    requiresPhysicianReview: boolean;
  };
}

export interface VisionAnalysisResult {
  success: boolean;
  data?: ExtractedMedicalData;
  error?: string;
  rawResponse?: string;
}

export class VisionAnalysisService {
  private static instance: VisionAnalysisService;
  private apiEndpoint = '/api/vision-analysis'; // We'll need to create this endpoint

  public static getInstance(): VisionAnalysisService {
    if (!VisionAnalysisService.instance) {
      VisionAnalysisService.instance = new VisionAnalysisService();
    }
    return VisionAnalysisService.instance;
  }

  /**
   * Analyzes medical document using OpenAI Vision API
   * Returns structured JSON data for multi-agent processing
   */
  public async analyzeDocument(request: VisionAnalysisRequest): Promise<VisionAnalysisResult> {
    try {
      // Check if it's a PDF and handle differently
      if (request.imageFile.type === 'application/pdf') {
        return this.analyzePDFDocument(request);
      }

      // Convert image to base64
      const base64Image = await this.fileToBase64(request.imageFile);
      
      // Get medical context for the analysis
      const medicalContext = chatContextService.formatContextForVisionAnalysis(request.documentType);
      
      // Prepare the vision analysis request
      const visionRequest = {
        model: "gpt-4o", // Use GPT-4 with vision capabilities
        messages: [
          {
            role: "system",
            content: `Eres un especialista médico en análisis de documentos pediátricos con capacidades de visión por computadora. Tu tarea es extraer información médica de documentos e imágenes de forma precisa y estructurada.

IMPORTANTE: 
- Responde ÚNICAMENTE con JSON válido
- NO agregues texto adicional fuera del JSON
- Sé preciso con las extracciones
- Marca elementos que requieran revisión médica
- Considera la edad del paciente en tu análisis`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: medicalContext + (request.additionalContext ? `\n\nCONTEXTO ADICIONAL: ${request.additionalContext}` : '')
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${request.imageFile.type};base64,${base64Image}`,
                  detail: "high" // Use high detail for medical documents
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1 // Low temperature for precision
      };

      // Make the API call
      const response = await this.callVisionAPI(visionRequest);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error,
          rawResponse: response.rawResponse
        };
      }

      // Parse and validate the JSON response
      const parsedData = this.parseAndValidateResponse(response.data);
      
      if (!parsedData.success) {
        return {
          success: false,
          error: parsedData.error,
          rawResponse: response.rawResponse
        };
      }

      return {
        success: true,
        data: parsedData.data,
        rawResponse: response.rawResponse
      };

    } catch (error) {
      console.error('Vision analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido en el análisis de visión'
      };
    }
  }

  /**
   * Analyzes multiple images (e.g., multi-page documents)
   */
  public async analyzeMultipleDocuments(requests: VisionAnalysisRequest[]): Promise<VisionAnalysisResult[]> {
    const results = await Promise.all(
      requests.map(request => this.analyzeDocument(request))
    );

    return results;
  }

  /**
   * Specifically handles prescription analysis with drug interaction checking
   */
  public async analyzePrescription(imageFile: File): Promise<VisionAnalysisResult> {
    const request: VisionAnalysisRequest = {
      imageFile,
      documentType: 'prescription',
      additionalContext: 'Presta especial atención a: dosis por peso/edad, interacciones medicamentosas, alergias conocidas, y duración del tratamiento.'
    };

    return this.analyzeDocument(request);
  }

  /**
   * Analyzes lab results with age-appropriate reference ranges
   */
  public async analyzeLabResults(imageFile: File): Promise<VisionAnalysisResult> {
    const request: VisionAnalysisRequest = {
      imageFile,
      documentType: 'lab_result',
      additionalContext: 'Enfócate en: valores fuera de rango normal para la edad, tendencias preocupantes, y necesidad de seguimiento.'
    };

    return this.analyzeDocument(request);
  }

  /**
   * Analyzes growth charts with developmental tracking
   */
  public async analyzeGrowthChart(imageFile: File): Promise<VisionAnalysisResult> {
    const request: VisionAnalysisRequest = {
      imageFile,
      documentType: 'growth_chart',
      additionalContext: 'Analiza: percentiles de crecimiento, tendencias de peso/altura, alertas de crecimiento anormal.'
    };

    return this.analyzeDocument(request);
  }

  /**
   * Handles PDF document analysis (currently uses fallback method)
   */
  private async analyzePDFDocument(request: VisionAnalysisRequest): Promise<VisionAnalysisResult> {
    try {
      // For now, provide a structured fallback response for PDFs
      // In the future, this could be enhanced with PDF-to-image conversion
      const fallbackData: ExtractedMedicalData = {
        documentType: request.documentType,
        patientInfo: {
          name: "Información no extraída de PDF",
          dateOfBirth: undefined,
          age: undefined
        },
        extractedData: {
          date: new Date().toISOString().split('T')[0],
          provider: "Documento PDF procesado",
          mainFindings: [
            "PDF detectado - Se requiere conversión a imagen para análisis completo",
            "Recomendación: Convierte el PDF a imagen (PNG/JPG) para mejor análisis"
          ],
          medications: [],
          measurements: {
            other: {}
          },
          recommendations: [
            "Revisar documento PDF manualmente",
            "Convertir a formato de imagen para análisis automático"
          ],
          urgentFlags: []
        },
        analysisNotes: {
          confidence: 'bajo',
          allergyWarnings: [],
          ageAppropriate: "Requiere revisión manual",
          requiresPhysicianReview: true
        }
      };

      return {
        success: true,
        data: fallbackData,
        rawResponse: "PDF procesado con método de fallback"
      };

    } catch (error) {
      return {
        success: false,
        error: `Error procesando PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        rawResponse: undefined
      };
    }
  }

  // Private helper methods

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async callVisionAPI(request: any): Promise<{ success: boolean; data?: any; error?: string; rawResponse?: string }> {
    try {
      // Use the worker endpoint that now supports vision
      const response = await fetch('/api/openai-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `API Error: ${response.status} - ${errorText}`,
          rawResponse: errorText
        };
      }

      const data = await response.json();
      
      if (data.error) {
        return {
          success: false,
          error: data.error.message || 'Error en la API de OpenAI',
          rawResponse: JSON.stringify(data)
        };
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          error: 'No se recibió respuesta válida de la API',
          rawResponse: JSON.stringify(data)
        };
      }

      return {
        success: true,
        data: content,
        rawResponse: JSON.stringify(data)
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
        rawResponse: undefined
      };
    }
  }

  private parseAndValidateResponse(response: string): { success: boolean; data?: ExtractedMedicalData; error?: string } {
    try {
      // Clean up the response (remove markdown formatting if present)
      let cleanResponse = response.trim();
      
      // Remove markdown code blocks if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.slice(7);
      }
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.slice(3);
      }
      if (cleanResponse.endsWith('```')) {
        cleanResponse = cleanResponse.slice(0, -3);
      }
      
      cleanResponse = cleanResponse.trim();

      const parsedData = JSON.parse(cleanResponse) as ExtractedMedicalData;

      // Validate required fields
      if (!parsedData.documentType || !parsedData.extractedData || !parsedData.analysisNotes) {
        return {
          success: false,
          error: 'Estructura JSON incompleta en la respuesta'
        };
      }

      // Ensure arrays are properly initialized
      if (!Array.isArray(parsedData.extractedData.mainFindings)) {
        parsedData.extractedData.mainFindings = [];
      }
      if (!Array.isArray(parsedData.extractedData.medications)) {
        parsedData.extractedData.medications = [];
      }
      if (!Array.isArray(parsedData.extractedData.recommendations)) {
        parsedData.extractedData.recommendations = [];
      }
      if (!Array.isArray(parsedData.extractedData.urgentFlags)) {
        parsedData.extractedData.urgentFlags = [];
      }
      if (!Array.isArray(parsedData.analysisNotes.allergyWarnings)) {
        parsedData.analysisNotes.allergyWarnings = [];
      }

      return {
        success: true,
        data: parsedData
      };

    } catch (error) {
      return {
        success: false,
        error: `Error parsing JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validates image/document file for medical analysis
   */
  public validateImageFile(file: File): { valid: boolean; error?: string } {
    console.log('🔧 [DEBUG] validateImageFile iniciando...', {
      name: file?.name,
      type: file?.type,
      size: file?.size
    });
    
    // Robust file object validation
    if (!file || typeof file !== 'object') {
      const error = 'Objeto de archivo no válido o undefined';
      console.error('🔧 [DEBUG] Validation error:', error);
      return { valid: false, error };
    }
    
    if (!(file instanceof File)) {
      const error = 'El objeto no es una instancia válida de File';
      console.error('🔧 [DEBUG] Validation error:', error);
      return { valid: false, error };
    }
    
    // Check required properties
    if (typeof file.type !== 'string') {
      const error = 'Tipo de archivo no definido';
      console.error('🔧 [DEBUG] Validation error:', error);
      return { valid: false, error };
    }
    
    if (typeof file.size !== 'number' || file.size < 0) {
      const error = 'Tamaño de archivo no válido';
      console.error('🔧 [DEBUG] Validation error:', error);
      return { valid: false, error };
    }
    
    // Check file type - support images and PDFs
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'application/pdf'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      const error = `Tipo de archivo no soportado: ${file.type}. Use JPEG, PNG, WebP o PDF.`;
      console.error('🔧 [DEBUG] Validation error:', error);
      return { valid: false, error };
    }

    // Check file size (max 20MB for vision API)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      const error = `El archivo es demasiado grande: ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo 20MB.`;
      console.error('🔧 [DEBUG] Validation error:', error);
      return { valid: false, error };
    }

    // Check minimum file size (avoid empty files)
    if (file.size === 0) {
      const error = 'El archivo está vacío';
      console.error('🔧 [DEBUG] Validation error:', error);
      return { valid: false, error };
    }

    // Additional validation for file integrity
    if (!file.name || typeof file.name !== 'string' || file.name.trim() === '') {
      const error = 'Nombre de archivo no válido o vacío';
      console.error('🔧 [DEBUG] Validation error:', error);
      return { valid: false, error };
    }

    console.log('🔧 [DEBUG] File validation successful');
    return { valid: true };
  }

  /**
   * Gets suggested document type based on filename
   */
  public suggestDocumentType(filename: string): VisionAnalysisRequest['documentType'] {
    const lowercaseFilename = filename.toLowerCase();
    
    if (lowercaseFilename.includes('receta') || lowercaseFilename.includes('prescription')) {
      return 'prescription';
    }
    if (lowercaseFilename.includes('laboratorio') || lowercaseFilename.includes('lab') || lowercaseFilename.includes('analisis')) {
      return 'lab_result';
    }
    if (lowercaseFilename.includes('vacuna') || lowercaseFilename.includes('vaccine') || lowercaseFilename.includes('inmunizacion')) {
      return 'vaccine_record';
    }
    if (lowercaseFilename.includes('crecimiento') || lowercaseFilename.includes('growth') || lowercaseFilename.includes('percentil')) {
      return 'growth_chart';
    }
    if (lowercaseFilename.includes('informe') || lowercaseFilename.includes('reporte') || lowercaseFilename.includes('consulta')) {
      return 'medical_report';
    }
    
    return 'general';
  }
}

export const visionAnalysisService = VisionAnalysisService.getInstance();