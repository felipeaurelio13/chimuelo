// Sistema Multiagente Avanzado para Procesamiento Inteligente de Inputs
// Arquitectura: Clasificador → Router → Agentes Especializados → Agente Ficha → Base Datos

export interface AgentInput {
  id: string;
  type: 'text' | 'image' | 'pdf' | 'audio' | 'file';
  content: string | File;
  timestamp: Date;
  userId: string;
  context?: any;
}

export interface AgentOutput {
  agentId: string;
  classification: string;
  extractedData: any;
  confidence: number;
  recommendations: string[];
  nextAgent?: string;
  shouldUpdateFicha: boolean;
  historicalData?: HistoricalRecord[];
  timestamp: Date;
}

export interface HistoricalRecord {
  id: string;
  type: 'weight' | 'height' | 'medical_visit' | 'milestone' | 'medication' | 'vaccination' | 'administrative';
  value: any;
  date: Date;
  source: string;
  confidence: number;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

// 🔍 AGENTE CLASIFICADOR - Punto de entrada universal
export class ClassifierAgent {
  private static instance: ClassifierAgent;
  
  public static getInstance(): ClassifierAgent {
    if (!ClassifierAgent.instance) {
      ClassifierAgent.instance = new ClassifierAgent();
    }
    return ClassifierAgent.instance;
  }

  async classifyInput(input: AgentInput): Promise<{
    inputType: string;
    contentType: string;
    confidence: number;
    routingRecommendation: string;
    extractedContent?: any;
  }> {
    try {
      console.log('🔧 [DEBUG] ClassifierAgent.classifyInput iniciando...');
      console.log('🔧 [DEBUG] Input type:', input.type, 'ID:', input.id);
      
      // Análisis del tipo de input
      let inputAnalysis = await this.analyzeInputType(input);
      console.log('🔧 [DEBUG] Input analysis:', inputAnalysis);
      
      // Extracción de contenido según el tipo
      let extractedContent;
      if (input.type === 'image' || input.type === 'pdf') {
        console.log('🔧 [DEBUG] Procesando contenido visual...');
        extractedContent = await this.processVisualContent(input);
      } else if (input.type === 'text') {
        console.log('🔧 [DEBUG] Procesando contenido de texto...');
        extractedContent = await this.processTextContent(input);
      } else if (input.type === 'audio') {
        console.log('🔧 [DEBUG] Procesando contenido de audio...');
        extractedContent = await this.processAudioContent(input);
      }

      console.log('🔧 [DEBUG] Contenido extraído exitosamente');

      // Clasificación inteligente del contenido
      const classification = await this.classifyContent(extractedContent, inputAnalysis);
      
      console.log('🔧 [DEBUG] Clasificación final:', classification);
      return classification;
    } catch (error) {
      console.error('🔧 [DEBUG] Error in ClassifierAgent:', error);
      throw error;
    }
  }

  private async analyzeInputType(input: AgentInput): Promise<any> {
    if (input.type === 'file' && input.content instanceof File) {
      const file = input.content;
      return {
        mimeType: file.type,
        size: file.size,
        name: file.name,
        suggestedType: this.suggestTypeFromFile(file)
      };
    }
    return { type: input.type };
  }

  private suggestTypeFromFile(file: File): string {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'text';
  }

  private async processVisualContent(input: AgentInput): Promise<any> {
    // Integración con el servicio de visión existente
    const visionAgent = VisionAgent.getInstance();
    return await visionAgent.analyzeContent(input);
  }

  private async processTextContent(input: AgentInput): Promise<any> {
    const textAgent = TextAgent.getInstance();
    return await textAgent.analyzeContent(input);
  }

  private async processAudioContent(input: AgentInput): Promise<any> {
    const audioAgent = AudioAgent.getInstance();
    return await audioAgent.analyzeContent(input);
  }

  private async classifyContent(content: any, inputAnalysis: any): Promise<any> {
    // Implementar lógica de clasificación inteligente
    const prompt = `Analiza el siguiente contenido y clasifícalo para routing de agentes:

CONTENIDO: ${JSON.stringify(content)}
ANÁLISIS INPUT: ${JSON.stringify(inputAnalysis)}

Determina:
1. contentType: medical_document | administrative_document | milestone_report | measurement_data | medication_info | general_text
2. confidence: 0-1
3. routingRecommendation: medical_agent | administrative_agent | timeline_agent | metrics_agent | pharmacological_agent
4. priority: low | medium | high | urgent

Responde en JSON válido.`;

    // Aquí iría la llamada a OpenAI para clasificación
    // Por ahora, implemento lógica básica
    return this.basicClassification(content, inputAnalysis);
  }

  private basicClassification(content: any, inputAnalysis: any): any {
    // Lógica de clasificación básica por palabras clave
    const text = JSON.stringify(content).toLowerCase();
    
    if (text.includes('peso') || text.includes('altura') || text.includes('talla')) {
      return {
        inputType: inputAnalysis.type,
        contentType: 'measurement_data',
        confidence: 0.8,
        routingRecommendation: 'metrics_agent'
      };
    }
    
    if (text.includes('vacuna') || text.includes('medicamento') || text.includes('dosis')) {
      return {
        inputType: inputAnalysis.type,
        contentType: 'medication_info',
        confidence: 0.8,
        routingRecommendation: 'pharmacological_agent'
      };
    }
    
    if (text.includes('hito') || text.includes('cordón') || text.includes('primera vez')) {
      return {
        inputType: inputAnalysis.type,
        contentType: 'milestone_report',
        confidence: 0.8,
        routingRecommendation: 'timeline_agent'
      };
    }
    
    if (text.includes('boleta') || text.includes('factura') || text.includes('costo') || text.includes('$')) {
      return {
        inputType: inputAnalysis.type,
        contentType: 'administrative_document',
        confidence: 0.8,
        routingRecommendation: 'administrative_agent'
      };
    }
    
    return {
      inputType: inputAnalysis.type,
      contentType: 'medical_document',
      confidence: 0.6,
      routingRecommendation: 'medical_agent'
    };
  }
}

// 👁️ AGENTE VISIÓN - Procesamiento de imágenes y PDFs
export class VisionAgent {
  private static instance: VisionAgent;
  
  public static getInstance(): VisionAgent {
    if (!VisionAgent.instance) {
      VisionAgent.instance = new VisionAgent();
    }
    return VisionAgent.instance;
  }

  async analyzeContent(input: AgentInput): Promise<any> {
    console.log('🔧 [DEBUG] VisionAgent.analyzeContent iniciando...');
    
    if (!(input.content instanceof File)) {
      const error = 'VisionAgent requires File input';
      console.error('🔧 [DEBUG] Error:', error);
      throw new Error(error);
    }
    
    try {
      console.log('🔧 [DEBUG] File válido:', {
        name: input.content.name,
        type: input.content.type,
        size: input.content.size
      });
      
      // Usar import estático en lugar de dinámico para evitar problemas de bundle
      const { visionAnalysisService } = await import('./visionAnalysisService');
      
      console.log('🔧 [DEBUG] visionAnalysisService importado exitosamente');
      
      const result = await visionAnalysisService.analyzeDocument({
        imageFile: input.content,
        documentType: input.context?.documentType || 'general'
      });
      
      console.log('🔧 [DEBUG] Resultado de visionAnalysisService:', {
        success: result.success,
        hasData: !!result.data,
        error: result.error
      });
      
      if (!result.success) {
        throw new Error(`VisionAnalysisService failed: ${result.error}`);
      }
      
      return result.data;
      
    } catch (error) {
      console.error('🔧 [DEBUG] Error en VisionAgent.analyzeContent:', error);
      
      // Fallback robusto si todo falla
      const fallbackData = {
        documentType: input.context?.documentType || 'general',
        patientInfo: {
          name: "Error en procesamiento",
          dateOfBirth: undefined,
          age: undefined
        },
        extractedData: {
          date: new Date().toISOString().split('T')[0],
          provider: "Procesamiento fallido",
          mainFindings: [
                         `Error al procesar archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            "Se requiere procesamiento manual"
          ],
          medications: [],
          measurements: { other: {} },
          recommendations: ["Revisar archivo manualmente"],
          urgentFlags: []
        },
        analysisNotes: {
          confidence: 'bajo',
          allergyWarnings: [],
          ageAppropriate: "Error en procesamiento",
          requiresPhysicianReview: true
        }
      };
      
      console.log('🔧 [DEBUG] Usando fallback data debido a error');
      return fallbackData;
    }
  }
}

// 📝 AGENTE TEXTO - Procesamiento de texto plano
export class TextAgent {
  private static instance: TextAgent;
  
  public static getInstance(): TextAgent {
    if (!TextAgent.instance) {
      TextAgent.instance = new TextAgent();
    }
    return TextAgent.instance;
  }

  async analyzeContent(input: AgentInput): Promise<any> {
    const text = input.content as string;
    
    // Análisis básico de texto
    return {
      rawText: text,
      wordCount: text.split(' ').length,
      detectedKeywords: this.extractKeywords(text),
      extractedEntities: this.extractEntities(text),
      sentiment: this.analyzeSentiment(text)
    };
  }

  private extractKeywords(text: string): string[] {
    const medicalKeywords = [
      'peso', 'altura', 'talla', 'temperatura', 'presión',
      'vacuna', 'medicamento', 'dosis', 'síntoma',
      'hito', 'desarrollo', 'cordón', 'primera vez',
      'consulta', 'pediatra', 'doctor', 'médico'
    ];
    
    return medicalKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    );
  }

  private extractEntities(text: string): any {
    // Extracción básica de entidades
    const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/g;
    const weightRegex = /(\d+(?:\.\d+)?)\s*(kg|kilos?|gramos?|g)/gi;
    const heightRegex = /(\d+(?:\.\d+)?)\s*(cm|centímetros?|metros?|m)/gi;
    
    return {
      dates: text.match(dateRegex) || [],
      weights: text.match(weightRegex) || [],
      heights: text.match(heightRegex) || []
    };
  }

  private analyzeSentiment(text: string): string {
    // Análisis de sentimiento básico
    const positiveWords = ['bien', 'bueno', 'excelente', 'normal', 'sano'];
    const negativeWords = ['mal', 'preocupante', 'problema', 'dolor', 'fiebre'];
    
    const positive = positiveWords.some(word => text.toLowerCase().includes(word));
    const negative = negativeWords.some(word => text.toLowerCase().includes(word));
    
    if (positive && !negative) return 'positive';
    if (negative && !positive) return 'negative';
    return 'neutral';
  }
}

// 🎤 AGENTE AUDIO - Procesamiento de audio (futuro)
export class AudioAgent {
  private static instance: AudioAgent;
  
  public static getInstance(): AudioAgent {
    if (!AudioAgent.instance) {
      AudioAgent.instance = new AudioAgent();
    }
    return AudioAgent.instance;
  }

  async analyzeContent(input: AgentInput): Promise<any> {
    return {
      message: 'Procesamiento de audio en desarrollo',
      type: 'audio',
      requiresTranscription: true
    };
  }
}

// 🎯 ROUTER INTELIGENTE - Distribuye a agentes especializados
export class IntelligentRouter {
  private static instance: IntelligentRouter;
  
  public static getInstance(): IntelligentRouter {
    if (!IntelligentRouter.instance) {
      IntelligentRouter.instance = new IntelligentRouter();
    }
    return IntelligentRouter.instance;
  }

  async routeToAgent(classification: any, extractedContent: any): Promise<AgentOutput> {
    const agentId = classification.routingRecommendation;
    
    switch (agentId) {
      case 'medical_agent':
        return await MedicalAgent.getInstance().process(extractedContent, classification);
      case 'administrative_agent':
        return await AdministrativeAgent.getInstance().process(extractedContent, classification);
      case 'timeline_agent':
        return await TimelineAgent.getInstance().process(extractedContent, classification);
      case 'metrics_agent':
        return await MetricsAgent.getInstance().process(extractedContent, classification);
      case 'pharmacological_agent':
        return await PharmacologicalAgent.getInstance().process(extractedContent, classification);
      default:
        return await MedicalAgent.getInstance().process(extractedContent, classification);
    }
  }
}

// ⚕️ AGENTE MÉDICO - Análisis médico especializado
export class MedicalAgent {
  private static instance: MedicalAgent;
  
  public static getInstance(): MedicalAgent {
    if (!MedicalAgent.instance) {
      MedicalAgent.instance = new MedicalAgent();
    }
    return MedicalAgent.instance;
  }

  async process(content: any, classification: any): Promise<AgentOutput> {
    // Análisis médico del contenido
    const medicalAnalysis = await this.analyzeMedicalContent(content);
    
    return {
      agentId: 'medical_agent',
      classification: classification.contentType,
      extractedData: medicalAnalysis,
      confidence: classification.confidence,
      recommendations: this.generateMedicalRecommendations(medicalAnalysis),
      shouldUpdateFicha: this.shouldUpdateMedicalFicha(medicalAnalysis),
      timestamp: new Date()
    };
  }

  private async analyzeMedicalContent(content: any): Promise<any> {
    console.log('🔧 [DEBUG] MedicalAgent.analyzeMedicalContent iniciando con:', content);
    
    // Análisis médico especializado usando datos reales del Vision API
    const medicalData = {
      symptoms: this.extractSymptoms(content),
      diagnoses: this.extractDiagnoses(content),
      treatments: this.extractTreatments(content),
      measurements: this.extractMeasurements(content),
      medications: this.extractMedications(content),
      provider: this.extractProvider(content),
      date: this.extractDate(content),
      alerts: this.identifyMedicalAlerts(content),
      followUp: this.extractFollowUp(content)
    };
    
    console.log('🔧 [DEBUG] MedicalAgent análisis completado:', medicalData);
    return medicalData;
  }

  private extractSymptoms(content: any): string[] {
    // Extracción real de síntomas del contenido del Vision API
    if (!content) return [];
    
    const findings = content.extractedData?.mainFindings || content.mainFindings || [];
    const symptoms = findings.filter((finding: string) => 
      finding.toLowerCase().includes('síntoma') ||
      finding.toLowerCase().includes('dolor') ||
      finding.toLowerCase().includes('fiebre') ||
      finding.toLowerCase().includes('malestar')
    );
    
    return symptoms;
  }

  private extractDiagnoses(content: any): string[] {
    // Extracción real de diagnósticos
    if (!content) return [];
    
    const findings = content.extractedData?.mainFindings || content.mainFindings || [];
    const diagnoses = findings.filter((finding: string) => 
      finding.toLowerCase().includes('diagnóstico') ||
      finding.toLowerCase().includes('evaluación') ||
      finding.toLowerCase().includes('resultado')
    );
    
    return diagnoses;
  }

  private extractTreatments(content: any): string[] {
    // Extracción real de tratamientos
    if (!content) return [];
    
    const recommendations = content.extractedData?.recommendations || content.recommendations || [];
    const treatments = recommendations.filter((rec: string) => 
      rec.toLowerCase().includes('tratamiento') ||
      rec.toLowerCase().includes('medicamento') ||
      rec.toLowerCase().includes('dosis') ||
      rec.toLowerCase().includes('administrar')
    );
    
    return treatments;
  }

  private extractMeasurements(content: any): any {
    // Extracción real de mediciones
    if (!content) return {};
    
    return content.extractedData?.measurements || content.measurements || {};
  }

  private extractMedications(content: any): any[] {
    // Extracción real de medicamentos
    if (!content) return [];
    
    return content.extractedData?.medications || content.medications || [];
  }

  private extractProvider(content: any): string | null {
    // Extracción real del proveedor médico
    if (!content) return null;
    
    return content.extractedData?.provider || content.provider || null;
  }

  private extractDate(content: any): string | null {
    // Extracción real de fecha del documento
    if (!content) return null;
    
    return content.extractedData?.date || content.date || null;
  }

  private identifyMedicalAlerts(content: any): string[] {
    // Identificación real de alertas médicas
    if (!content) return [];
    
    const urgentFlags = content.extractedData?.urgentFlags || content.urgentFlags || [];
    const allergyWarnings = content.analysisNotes?.allergyWarnings || [];
    
    return [...urgentFlags, ...allergyWarnings];
  }

  private extractFollowUp(content: any): string[] {
    // Extracción real de seguimientos necesarios
    if (!content) return [];
    
    const recommendations = content.extractedData?.recommendations || content.recommendations || [];
    const followUp = recommendations.filter((rec: string) => 
      rec.toLowerCase().includes('control') ||
      rec.toLowerCase().includes('seguimiento') ||
      rec.toLowerCase().includes('próxima') ||
      rec.toLowerCase().includes('revisión')
    );
    
    return followUp;
  }

  private generateMedicalRecommendations(analysis: any): string[] {
    // Generar recomendaciones médicas basadas en análisis real
    const recommendations = [];
    
    if (analysis.symptoms && analysis.symptoms.length > 0) {
      recommendations.push('Monitorear síntomas reportados');
    }
    
    if (analysis.measurements && Object.keys(analysis.measurements).length > 0) {
      recommendations.push('Registrar mediciones en la ficha médica');
    }
    
    if (analysis.alerts && analysis.alerts.length > 0) {
      recommendations.push('⚠️ Consultar con pediatra por alertas identificadas');
    }
    
    if (analysis.medications && analysis.medications.length > 0) {
      recommendations.push('Seguir indicaciones de medicamentos prescritos');
    }
    
    if (analysis.followUp && analysis.followUp.length > 0) {
      recommendations.push('Programar citas de seguimiento indicadas');
    }
    
    // Recomendaciones por defecto si no hay contenido específico
    if (recommendations.length === 0) {
      recommendations.push('Revisar con pediatra si hay dudas');
      recommendations.push('Continuar monitoreo según indicaciones');
    }
    
    return recommendations;
  }

  private shouldUpdateMedicalFicha(analysis: any): boolean {
    // Determinar si se debe actualizar la ficha médica basado en contenido real
    return !!(
      (analysis.measurements && Object.keys(analysis.measurements).length > 0) ||
      (analysis.medications && analysis.medications.length > 0) ||
      (analysis.symptoms && analysis.symptoms.length > 0) ||
      (analysis.diagnoses && analysis.diagnoses.length > 0) ||
      (analysis.treatments && analysis.treatments.length > 0)
    );
  }
}

// 💼 AGENTE ADMINISTRATIVO - Procesamiento de documentos administrativos
export class AdministrativeAgent {
  private static instance: AdministrativeAgent;
  
  public static getInstance(): AdministrativeAgent {
    if (!AdministrativeAgent.instance) {
      AdministrativeAgent.instance = new AdministrativeAgent();
    }
    return AdministrativeAgent.instance;
  }

  async process(content: any, classification: any): Promise<AgentOutput> {
    const adminAnalysis = await this.analyzeAdministrativeContent(content);
    
    return {
      agentId: 'administrative_agent',
      classification: classification.contentType,
      extractedData: adminAnalysis,
      confidence: classification.confidence,
      recommendations: this.generateAdminRecommendations(adminAnalysis),
      shouldUpdateFicha: false,
      historicalData: this.createAdminHistoricalRecord(adminAnalysis),
      timestamp: new Date()
    };
  }

  private async analyzeAdministrativeContent(content: any): Promise<any> {
    return {
      date: this.extractDate(content),
      cost: this.extractCost(content),
      provider: this.extractProvider(content),
      service: this.extractService(content),
      insurance: this.extractInsurance(content),
      documentType: this.classifyDocument(content)
    };
  }

  private extractDate(content: any): Date | null {
    // Extracción de fecha del documento
    return new Date();
  }

  private extractCost(content: any): number | null {
    // Extracción de costo
    return null;
  }

  private extractProvider(content: any): string | null {
    // Extracción del proveedor/centro médico
    return null;
  }

  private extractService(content: any): string | null {
    // Extracción del servicio prestado
    return null;
  }

  private extractInsurance(content: any): string | null {
    // Extracción de información de seguro
    return null;
  }

  private classifyDocument(content: any): string {
    // Clasificación del tipo de documento
    return 'medical_bill';
  }

  private generateAdminRecommendations(analysis: any): string[] {
    return ['Archivar documento administrativo'];
  }

  private createAdminHistoricalRecord(analysis: any): HistoricalRecord[] {
    return [{
      id: `admin_${Date.now()}`,
      type: 'administrative',
      value: analysis,
      date: analysis.date || new Date(),
      source: 'administrative_agent',
      confidence: 0.8,
      metadata: { documentType: analysis.documentType },
      createdAt: new Date(),
      updatedAt: new Date()
    }];
  }
}

// 📅 AGENTE TIMELINE - Gestión de hitos y timeline
export class TimelineAgent {
  private static instance: TimelineAgent;
  
  public static getInstance(): TimelineAgent {
    if (!TimelineAgent.instance) {
      TimelineAgent.instance = new TimelineAgent();
    }
    return TimelineAgent.instance;
  }

  async process(content: any, classification: any): Promise<AgentOutput> {
    const timelineAnalysis = await this.analyzeTimelineContent(content);
    
    return {
      agentId: 'timeline_agent',
      classification: classification.contentType,
      extractedData: timelineAnalysis,
      confidence: classification.confidence,
      recommendations: this.generateTimelineRecommendations(timelineAnalysis),
      shouldUpdateFicha: true,
      historicalData: this.createTimelineHistoricalRecord(timelineAnalysis),
      timestamp: new Date()
    };
  }

  private async analyzeTimelineContent(content: any): Promise<any> {
    return {
      milestoneType: this.identifyMilestoneType(content),
      date: this.extractMilestoneDate(content),
      description: this.extractDescription(content),
      significance: this.assessSignificance(content),
      category: this.categorizeMilestone(content)
    };
  }

  private identifyMilestoneType(content: any): string {
    // Identificar tipo de hito
    return 'development';
  }

  private extractMilestoneDate(content: any): Date {
    // Extraer fecha del hito
    return new Date();
  }

  private extractDescription(content: any): string {
    // Extraer descripción del hito
    return '';
  }

  private assessSignificance(content: any): 'low' | 'medium' | 'high' {
    // Evaluar significancia del hito
    return 'medium';
  }

  private categorizeMilestone(content: any): string {
    // Categorizar el hito
    return 'development';
  }

  private generateTimelineRecommendations(analysis: any): string[] {
    return ['Hito registrado en timeline'];
  }

  private createTimelineHistoricalRecord(analysis: any): HistoricalRecord[] {
    return [{
      id: `timeline_${Date.now()}`,
      type: 'milestone',
      value: analysis,
      date: analysis.date,
      source: 'timeline_agent',
      confidence: 0.9,
      metadata: { 
        category: analysis.category,
        significance: analysis.significance 
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }];
  }
}

// 📊 AGENTE MÉTRICAS - Procesamiento de mediciones
export class MetricsAgent {
  private static instance: MetricsAgent;
  
  public static getInstance(): MetricsAgent {
    if (!MetricsAgent.instance) {
      MetricsAgent.instance = new MetricsAgent();
    }
    return MetricsAgent.instance;
  }

  async process(content: any, classification: any): Promise<AgentOutput> {
    const metricsAnalysis = await this.analyzeMetricsContent(content);
    
    return {
      agentId: 'metrics_agent',
      classification: classification.contentType,
      extractedData: metricsAnalysis,
      confidence: classification.confidence,
      recommendations: this.generateMetricsRecommendations(metricsAnalysis),
      shouldUpdateFicha: true,
      historicalData: this.createMetricsHistoricalRecords(metricsAnalysis),
      timestamp: new Date()
    };
  }

  private async analyzeMetricsContent(content: any): Promise<any> {
    return {
      weight: this.extractWeight(content),
      height: this.extractHeight(content),
      headCircumference: this.extractHeadCircumference(content),
      temperature: this.extractTemperature(content),
      date: this.extractMeasurementDate(content),
      context: this.extractMeasurementContext(content)
    };
  }

  private extractWeight(content: any): number | null {
    // Extraer peso
    return null;
  }

  private extractHeight(content: any): number | null {
    // Extraer altura
    return null;
  }

  private extractHeadCircumference(content: any): number | null {
    // Extraer perímetro cefálico
    return null;
  }

  private extractTemperature(content: any): number | null {
    // Extraer temperatura
    return null;
  }

  private extractMeasurementDate(content: any): Date {
    // Extraer fecha de medición
    return new Date();
  }

  private extractMeasurementContext(content: any): string {
    // Extraer contexto de la medición
    return '';
  }

  private generateMetricsRecommendations(analysis: any): string[] {
    return ['Mediciones registradas'];
  }

  private createMetricsHistoricalRecords(analysis: any): HistoricalRecord[] {
    const records: HistoricalRecord[] = [];
    
    if (analysis.weight) {
      records.push({
        id: `weight_${Date.now()}`,
        type: 'weight',
        value: analysis.weight,
        date: analysis.date,
        source: 'metrics_agent',
        confidence: 0.9,
        metadata: { context: analysis.context },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    if (analysis.height) {
      records.push({
        id: `height_${Date.now()}`,
        type: 'height',
        value: analysis.height,
        date: analysis.date,
        source: 'metrics_agent',
        confidence: 0.9,
        metadata: { context: analysis.context },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return records;
  }
}

// 💉 AGENTE FARMACOLÓGICO - Medicamentos y vacunas
export class PharmacologicalAgent {
  private static instance: PharmacologicalAgent;
  
  public static getInstance(): PharmacologicalAgent {
    if (!PharmacologicalAgent.instance) {
      PharmacologicalAgent.instance = new PharmacologicalAgent();
    }
    return PharmacologicalAgent.instance;
  }

  async process(content: any, classification: any): Promise<AgentOutput> {
    const pharmaAnalysis = await this.analyzePharmacologicalContent(content);
    
    return {
      agentId: 'pharmacological_agent',
      classification: classification.contentType,
      extractedData: pharmaAnalysis,
      confidence: classification.confidence,
      recommendations: this.generatePharmaRecommendations(pharmaAnalysis),
      shouldUpdateFicha: true,
      historicalData: this.createPharmaHistoricalRecord(pharmaAnalysis),
      timestamp: new Date()
    };
  }

  private async analyzePharmacologicalContent(content: any): Promise<any> {
    return {
      type: this.classifyPharmaType(content), // 'medication' | 'vaccination'
      name: this.extractMedicationName(content),
      dose: this.extractDose(content),
      frequency: this.extractFrequency(content),
      duration: this.extractDuration(content),
      date: this.extractAdministrationDate(content),
      sideEffects: this.identifySideEffects(content),
      contraindications: this.identifyContraindications(content)
    };
  }

  private classifyPharmaType(content: any): 'medication' | 'vaccination' {
    // Clasificar si es medicamento o vacuna
    return 'medication';
  }

  private extractMedicationName(content: any): string | null {
    return null;
  }

  private extractDose(content: any): string | null {
    return null;
  }

  private extractFrequency(content: any): string | null {
    return null;
  }

  private extractDuration(content: any): string | null {
    return null;
  }

  private extractAdministrationDate(content: any): Date {
    return new Date();
  }

  private identifySideEffects(content: any): string[] {
    return [];
  }

  private identifyContraindications(content: any): string[] {
    return [];
  }

  private generatePharmaRecommendations(analysis: any): string[] {
    return ['Medicamento/vacuna registrado'];
  }

  private createPharmaHistoricalRecord(analysis: any): HistoricalRecord[] {
    return [{
      id: `pharma_${Date.now()}`,
      type: analysis.type === 'vaccination' ? 'vaccination' : 'medication',
      value: analysis,
      date: analysis.date,
      source: 'pharmacological_agent',
      confidence: 0.8,
      metadata: { 
        name: analysis.name,
        dose: analysis.dose,
        frequency: analysis.frequency 
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }];
  }
}

// 👶 AGENTE FICHA MAXI - Gestión central de la ficha médica
export class FichaMAxiAgent {
  private static instance: FichaMAxiAgent;
  
  public static getInstance(): FichaMAxiAgent {
    if (!FichaMAxiAgent.instance) {
      FichaMAxiAgent.instance = new FichaMAxiAgent();
    }
    return FichaMAxiAgent.instance;
  }

  async updateFicha(agentOutput: AgentOutput): Promise<void> {
    if (!agentOutput.shouldUpdateFicha) {
      return;
    }

    // Actualizar la ficha médica con la nueva información
    await this.processUpdate(agentOutput);
    
    // Guardar registros históricos si existen
    if (agentOutput.historicalData) {
      await this.saveHistoricalRecords(agentOutput.historicalData);
    }
  }

  private async processUpdate(agentOutput: AgentOutput): Promise<void> {
    // Lógica para actualizar la ficha médica
    console.log('Updating Ficha Maxi with:', agentOutput);
  }

  private async saveHistoricalRecords(records: HistoricalRecord[]): Promise<void> {
    // Guardar registros históricos en la base de datos
    for (const record of records) {
      await this.saveRecord(record);
    }
  }

  private async saveRecord(record: HistoricalRecord): Promise<void> {
    // Implementar guardado en IndexedDB
    console.log('Saving historical record:', record);
  }
}

// 🔧 COORDINADOR PRINCIPAL - Orquesta todo el sistema
export class MultiAgentCoordinator {
  private static instance: MultiAgentCoordinator;
  
  public static getInstance(): MultiAgentCoordinator {
    if (!MultiAgentCoordinator.instance) {
      MultiAgentCoordinator.instance = new MultiAgentCoordinator();
    }
    return MultiAgentCoordinator.instance;
  }

  async processInput(input: AgentInput): Promise<AgentOutput> {
    try {
      console.log('🔧 [DEBUG] MultiAgentCoordinator.processInput iniciando...');
      console.log('🔧 [DEBUG] Input:', {
        id: input.id,
        type: input.type,
        userId: input.userId,
        contextKeys: Object.keys(input.context || {})
      });
      
      // 1. Clasificar input con manejo robusto de errores
      console.log('🔧 [DEBUG] Paso 1: Clasificando input...');
      let classification;
      try {
        const classifier = ClassifierAgent.getInstance();
        classification = await classifier.classifyInput(input);
        console.log('🔧 [DEBUG] Clasificación completada:', classification.routingRecommendation);
      } catch (classifierError) {
        console.error('❌ Error en clasificación:', classifierError);
        // Fallback classification
        classification = {
          inputType: input.type,
          contentType: 'general',
          confidence: 0.5,
          routingRecommendation: 'medical_agent'
        };
      }
      
      // 2. Extraer contenido con manejo robusto de errores
      console.log('🔧 [DEBUG] Paso 2: Extrayendo contenido...');
      let extractedContent;
      try {
        if (input.type === 'image' || input.type === 'pdf') {
          console.log('🔧 [DEBUG] Usando VisionAgent...');
          extractedContent = await VisionAgent.getInstance().analyzeContent(input);
        } else {
          console.log('🔧 [DEBUG] Usando TextAgent...');
          extractedContent = await TextAgent.getInstance().analyzeContent(input);
        }
        console.log('🔧 [DEBUG] Contenido extraído:', !!extractedContent);
      } catch (extractionError) {
        console.error('❌ Error en extracción de contenido:', extractionError);
        // Fallback content
        extractedContent = {
          documentType: input.context?.documentType || 'general',
          patientInfo: { name: 'Error en extracción', age: null, dateOfBirth: null },
          extractedData: {
            date: new Date().toISOString().split('T')[0],
            provider: 'Error en extracción',
            mainFindings: ['Error en procesamiento de contenido'],
            medications: [],
            measurements: { weight: null, height: null, temperature: null, other: {} },
            recommendations: ['Revisar manualmente'],
            urgentFlags: ['Error en procesamiento']
          },
          analysisNotes: {
            confidence: 'bajo',
            allergyWarnings: [],
            ageAppropriate: 'Error en procesamiento',
            requiresPhysicianReview: true
          }
        };
      }
      
      // 3. Rutear a agente especializado con manejo robusto de errores
      console.log('🔧 [DEBUG] Paso 3: Ruteando a agente especializado...');
      let agentOutput;
      try {
        const router = IntelligentRouter.getInstance();
        agentOutput = await router.routeToAgent(classification, extractedContent);
        console.log('🔧 [DEBUG] Agente procesado:', agentOutput.agentId);
      } catch (routingError) {
        console.error('❌ Error en ruteo:', routingError);
        // Fallback agent output
        agentOutput = {
          agentId: 'fallback_agent',
          classification: classification.contentType || 'general',
          extractedData: extractedContent,
          confidence: 0.3,
          recommendations: [
            'Error en procesamiento automático',
            'Se requiere revisión manual',
            'Verificar archivo'
          ],
          shouldUpdateFicha: false,
          timestamp: new Date()
        };
      }
      
      // 4. Actualizar ficha si es necesario (no crítico)
      console.log('🔧 [DEBUG] Paso 4: Actualizando ficha...');
      try {
        const fichaAgent = FichaMAxiAgent.getInstance();
        await fichaAgent.updateFicha(agentOutput);
        console.log('🔧 [DEBUG] Ficha actualizada, shouldUpdateFicha:', agentOutput.shouldUpdateFicha);
      } catch (fichaError) {
        console.error('❌ Error actualizando ficha (no crítico):', fichaError);
        // No fallar por errores en la ficha
      }
      
      console.log('🔧 [DEBUG] MultiAgentCoordinator completado exitosamente');
      return agentOutput;
      
    } catch (error) {
      console.error('🔧 [DEBUG] Error crítico in MultiAgentCoordinator:', error);
      console.error('🔧 [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Crear fallback robusto para prevenir crashes
      const fallbackOutput: AgentOutput = {
        agentId: 'error_fallback_agent',
        classification: 'general',
        extractedData: {
          patientInfo: { name: 'Error en sistema', age: null, dateOfBirth: null },
          date: new Date().toISOString().split('T')[0],
          provider: 'Sistema de respaldo',
          mainFindings: [
            'Error crítico en el sistema multiagente',
            `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            'Se requiere procesamiento manual'
          ],
          medications: [],
          measurements: { weight: null, height: null, temperature: null, other: {} },
          recommendations: [
            'Revisar documento manualmente',
            'Verificar que el archivo no esté corrupto',
            'Contactar soporte si el problema persiste'
          ],
          urgentFlags: ['Error crítico en sistema']
        },
        confidence: 0.1,
        recommendations: [
          'Error crítico en el procesamiento automático',
          'Se requiere intervención manual',
          'Verificar integridad del archivo'
        ],
        shouldUpdateFicha: false,
        timestamp: new Date()
      };
      
      console.log('🔄 Retornando fallback debido a error crítico');
      return fallbackOutput;
    }
  }
}

// Export principal
export const multiAgentSystem = MultiAgentCoordinator.getInstance();