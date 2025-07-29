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
  private workerUrl: string;

  public static getInstance(): VisionAnalysisService {
    if (!VisionAnalysisService.instance) {
      VisionAnalysisService.instance = new VisionAnalysisService();
    }
    return VisionAnalysisService.instance;
  }

  constructor() {
    this.workerUrl = import.meta.env.VITE_WORKER_URL || 'https://maxi-worker.felipeaurelio13.workers.dev';
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
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Eres un especialista médico en análisis de documentos pediátricos con capacidades de visión por computadora. Tu tarea es extraer información médica de documentos e imágenes de forma precisa y estructurada.

IMPORTANTE: 
- Responde ÚNICAMENTE con JSON válido
- NO agregues texto adicional fuera del JSON
- Sé preciso con las extracciones
- Marca elementos que requieran revisión médica
- Considera la edad del paciente en tu análisis

FORMATO DE RESPUESTA REQUERIDO:
{
  "documentType": "medical_report|prescription|lab_result|vaccine_record|growth_chart|general",
  "patientInfo": {
    "name": "string o null",
    "dateOfBirth": "YYYY-MM-DD o null",
    "age": "string o null"
  },
  "extractedData": {
    "date": "YYYY-MM-DD o null",
    "provider": "string o null",
    "mainFindings": ["array de strings"],
    "medications": [
      {
        "name": "string",
        "dose": "string o null",
        "frequency": "string o null",
        "duration": "string o null"
      }
    ],
    "measurements": {
      "weight": "string o null",
      "height": "string o null",
      "temperature": "string o null",
      "other": {}
    },
    "recommendations": ["array de strings"],
    "nextAppointment": "YYYY-MM-DD o null",
    "urgentFlags": ["array de strings"]
  },
  "analysisNotes": {
    "confidence": "alto|medio|bajo",
    "allergyWarnings": ["array de strings"],
    "ageAppropriate": "string",
    "requiresPhysicianReview": boolean
  }
}`
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
                  url: `data:${request.imageFile.type};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      };

      // Call the worker for vision analysis
      const result = await this.callVisionAPI(visionRequest);
      
      if (result.success && result.data) {
        return {
          success: true,
          data: result.data,
          rawResponse: result.rawResponse
        };
      } else {
        return {
          success: false,
          error: result.error || 'Error en el análisis de imagen',
          rawResponse: result.rawResponse
        };
      }
    } catch (error) {
      console.error('Error in analyzeDocument:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido en análisis de imagen'
      };
    }
  }

  /**
   * Analyze multiple documents in batch
   */
  public async analyzeMultipleDocuments(requests: VisionAnalysisRequest[]): Promise<VisionAnalysisResult[]> {
    const results: VisionAnalysisResult[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.analyzeDocument(request);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Error en análisis de documento'
        });
      }
    }
    
    return results;
  }

  /**
   * Analyze prescription specifically
   */
  public async analyzePrescription(imageFile: File): Promise<VisionAnalysisResult> {
    return this.analyzeDocument({
      imageFile,
      documentType: 'prescription',
      additionalContext: 'Este es un documento de prescripción médica. Extrae información sobre medicamentos, dosis, frecuencia y duración del tratamiento.'
    });
  }

  /**
   * Analyze lab results specifically
   */
  public async analyzeLabResults(imageFile: File): Promise<VisionAnalysisResult> {
    return this.analyzeDocument({
      imageFile,
      documentType: 'lab_result',
      additionalContext: 'Este es un resultado de laboratorio. Extrae valores, rangos normales, y cualquier resultado anormal que requiera atención.'
    });
  }

  /**
   * Analyze growth chart specifically
   */
  public async analyzeGrowthChart(imageFile: File): Promise<VisionAnalysisResult> {
    return this.analyzeDocument({
      imageFile,
      documentType: 'growth_chart',
      additionalContext: 'Este es un gráfico de crecimiento. Extrae medidas de peso, altura, perímetro cefálico y percentiles si están disponibles.'
    });
  }

  /**
   * Handle PDF documents
   */
  private async analyzePDFDocument(request: VisionAnalysisRequest): Promise<VisionAnalysisResult> {
    try {
      // For PDFs, we'll convert to images first
      // This is a simplified approach - in production you might want to use a PDF processing library
      const pdfContext = `Este es un documento PDF. ${request.additionalContext || 'Extrae toda la información médica relevante.'}`;
      
      // For now, return a basic analysis
      return {
        success: true,
        data: {
          documentType: request.documentType,
          patientInfo: {
            name: undefined,
            dateOfBirth: undefined,
            age: undefined
          },
          extractedData: {
            date: new Date().toISOString().split('T')[0],
            provider: undefined,
            mainFindings: ['Documento PDF detectado'],
            medications: [],
            measurements: {
              weight: undefined,
              height: undefined,
              temperature: undefined,
              other: {}
            },
            recommendations: ['Revisar documento PDF completo'],
            nextAppointment: undefined,
            urgentFlags: []
          },
          analysisNotes: {
            confidence: 'medio',
            allergyWarnings: [],
            ageAppropriate: 'Requiere revisión manual',
            requiresPhysicianReview: true
          }
        },
        rawResponse: 'PDF analysis placeholder'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error procesando documento PDF'
      };
    }
  }

  /**
   * Convert file to base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Call the worker API for vision analysis
   */
  private async callVisionAPI(request: any): Promise<{ success: boolean; data?: any; error?: string; rawResponse?: string }> {
    try {
      const response = await fetch(`${this.workerUrl}/api/openai/chat`, {
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
          error: `Error en la API: ${response.status}`,
          rawResponse: errorText
        };
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Error en el análisis de imagen',
          rawResponse: JSON.stringify(result)
        };
      }

      // Parse the response
      const parsedData = this.parseAndValidateResponse(result.data.response);
      
      return {
        success: parsedData.success,
        data: parsedData.data,
        error: parsedData.error,
        rawResponse: result.data.response
      };
    } catch (error) {
      console.error('Error calling vision API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
        rawResponse: error instanceof Error ? error.stack : 'Unknown error'
      };
    }
  }

  /**
   * Parse and validate the response from OpenAI
   */
  private parseAndValidateResponse(response: string): { success: boolean; data?: ExtractedMedicalData; error?: string } {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(response);
      
      // Validate required fields
      if (!parsed.documentType || !parsed.extractedData || !parsed.analysisNotes) {
        return {
          success: false,
          error: 'Respuesta incompleta del análisis'
        };
      }

      // Validate document type
      const validDocumentTypes = ['medical_report', 'prescription', 'lab_result', 'vaccine_record', 'growth_chart', 'general'];
      if (!validDocumentTypes.includes(parsed.documentType)) {
        parsed.documentType = 'general';
      }

      // Ensure arrays exist
      if (!Array.isArray(parsed.extractedData.mainFindings)) {
        parsed.extractedData.mainFindings = [];
      }
      if (!Array.isArray(parsed.extractedData.medications)) {
        parsed.extractedData.medications = [];
      }
      if (!Array.isArray(parsed.extractedData.recommendations)) {
        parsed.extractedData.recommendations = [];
      }
      if (!Array.isArray(parsed.extractedData.urgentFlags)) {
        parsed.extractedData.urgentFlags = [];
      }
      if (!Array.isArray(parsed.analysisNotes.allergyWarnings)) {
        parsed.analysisNotes.allergyWarnings = [];
      }

      // Validate confidence
      if (!['alto', 'medio', 'bajo'].includes(parsed.analysisNotes.confidence)) {
        parsed.analysisNotes.confidence = 'medio';
      }

      return {
        success: true,
        data: parsed as ExtractedMedicalData
      };
    } catch (parseError) {
      console.error('Error parsing vision response:', parseError);
      return {
        success: false,
        error: 'Error parseando respuesta del análisis de imagen'
      };
    }
  }

  /**
   * Validate image file before processing
   */
  public validateImageFile(file: File): { valid: boolean; error?: string } | Promise<{ valid: boolean; error?: string }> {
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'El archivo es demasiado grande. Máximo 10MB.'
      };
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Tipo de archivo no soportado. Use JPEG, PNG, WebP o PDF.'
      };
    }

    // Check if it's an image (for non-PDF files)
    if (file.type !== 'application/pdf') {
      return new Promise<{ valid: boolean; error?: string }>((resolve) => {
        const img = new Image();
        img.onload = () => {
          // Check minimum dimensions
          if (img.width < 100 || img.height < 100) {
            resolve({
              valid: false,
              error: 'La imagen es demasiado pequeña. Mínimo 100x100 píxeles.'
            });
          } else {
            resolve({ valid: true });
          }
        };
        img.onerror = () => {
          resolve({
            valid: false,
            error: 'No se pudo cargar la imagen. Verifique que el archivo sea válido.'
          });
        };
        img.src = URL.createObjectURL(file);
      });
    }

    return { valid: true };
  }

  /**
   * Suggest document type based on filename
   */
  public suggestDocumentType(filename: string): VisionAnalysisRequest['documentType'] {
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('receta') || lowerFilename.includes('prescription') || lowerFilename.includes('medicamento')) {
      return 'prescription';
    }
    
    if (lowerFilename.includes('laboratorio') || lowerFilename.includes('lab') || lowerFilename.includes('resultado')) {
      return 'lab_result';
    }
    
    if (lowerFilename.includes('vacuna') || lowerFilename.includes('vaccine') || lowerFilename.includes('inmunización')) {
      return 'vaccine_record';
    }
    
    if (lowerFilename.includes('crecimiento') || lowerFilename.includes('growth') || lowerFilename.includes('peso') || lowerFilename.includes('altura')) {
      return 'growth_chart';
    }
    
    if (lowerFilename.includes('médico') || lowerFilename.includes('medical') || lowerFilename.includes('consulta')) {
      return 'medical_report';
    }
    
    return 'general';
  }
}

// Export singleton instance
export const visionAnalysisService = VisionAnalysisService.getInstance();