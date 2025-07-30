// Servicio de Integración de Datos Médicos a la Ficha
// Permite incorporar automáticamente los hallazgos del sistema multi-agente

import { ConversationSession } from './agentConversationSystem';
import { HealthRecord, HealthStats } from './databaseService';
import databaseService from './databaseService';
import { historicalDataService } from './historicalDataService';

export interface MedicalDataExtraction {
  measurements: {
    weight?: { value: number; unit: string; date: Date; confidence: number };
    height?: { value: number; unit: string; date: Date; confidence: number };
    temperature?: { value: number; unit: string; date: Date; confidence: number };
    heartRate?: { value: number; unit: string; date: Date; confidence: number };
  };
  symptoms: Array<{
    name: string;
    severity: 'mild' | 'moderate' | 'severe';
    date: Date;
    confidence: number;
  }>;
  milestones: Array<{
    type: string;
    description: string;
    date: Date;
    ageAtAchievement?: string;
  }>;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    prescribedBy?: string;
    startDate: Date;
  }>;
  visits: Array<{
    type: 'routine' | 'emergency' | 'follow_up';
    provider: string;
    date: Date;
    notes: string;
  }>;
  alerts: Array<{
    type: 'critical' | 'warning' | 'info';
    message: string;
    relatedTo: string;
    requiresAttention: boolean;
  }>;
}

export interface IntegrationProposal {
  id: string;
  extractedData: MedicalDataExtraction;
  proposedUpdates: {
    medicalRecord: Partial<HealthRecord>;
    statsUpdates: Partial<HealthStats>;
    timelineEntries: Array<{
      type: 'weight' | 'height' | 'temperature' | 'milestone' | 'medication' | 'visit';
      data: any;
      date: Date;
    }>;
  };
  contextAnalysis: {
    trends: string[];
    comparisons: string[];
    recommendations: string[];
    alerts: string[];
  };
  confidence: number;
  requiresReview: boolean;
}

export class MedicalRecordIntegrator {
  private static instance: MedicalRecordIntegrator;

  public static getInstance(): MedicalRecordIntegrator {
    if (!MedicalRecordIntegrator.instance) {
      MedicalRecordIntegrator.instance = new MedicalRecordIntegrator();
    }
    return MedicalRecordIntegrator.instance;
  }

  // Analizar sesión de conversación y extraer datos médicos estructurados
  async analyzeConversationForMedicalData(
    session: ConversationSession,
    userId: string
  ): Promise<MedicalDataExtraction> {
    console.log('🔍 Analizando conversación para extracción de datos médicos');

    const extraction: MedicalDataExtraction = {
      measurements: {},
      symptoms: [],
      milestones: [],
      medications: [],
      visits: [],
      alerts: []
    };

    // Analizar mensajes de cada agente
    for (const message of session.messages) {
      if (message.data && message.type === 'analysis') {
        await this.extractDataFromAgentMessage(message, extraction);
      }
    }

    // Analizar resultado final si existe
    if (session.finalResult?.extractedData) {
      await this.extractDataFromFinalResult(session.finalResult.extractedData, extraction);
    }

    console.log('✅ Extracción de datos médicos completada:', extraction);
    return extraction;
  }

  // Extraer datos de mensaje de agente específico
  private async extractDataFromAgentMessage(message: any, extraction: MedicalDataExtraction): Promise<void> {
    const data = message.data;
    const timestamp = new Date(message.timestamp);

    // Datos del agente extractor
    if (message.from === 'data_extractor' && data.measurements) {
      Object.entries(data.measurements).forEach(([type, measurement]: [string, any]) => {
        if (measurement && typeof measurement === 'object' && measurement.value !== undefined) {
          const medicalMeasurement = {
            value: parseFloat(measurement.value),
            unit: measurement.unit || this.getDefaultUnit(type),
            date: timestamp,
            confidence: data.confidence || 0.8
          };

          switch (type) {
            case 'weight':
              extraction.measurements.weight = medicalMeasurement;
              break;
            case 'height':
            case 'altura':
              extraction.measurements.height = medicalMeasurement;
              break;
            case 'temperature':
            case 'temperatura':
              extraction.measurements.temperature = medicalMeasurement;
              break;
            case 'heartRate':
            case 'frecuenciaCardiaca':
              extraction.measurements.heartRate = medicalMeasurement;
              break;
          }
        }
      });
    }

    // Datos del agente médico
    if (message.from === 'medical_analyzer') {
      // Síntomas
      if (data.symptoms && Array.isArray(data.symptoms)) {
        data.symptoms.forEach((symptom: any) => {
          extraction.symptoms.push({
            name: symptom.name || symptom.symptom || symptom,
            severity: symptom.severity || 'moderate',
            date: timestamp,
            confidence: data.confidence || 0.8
          });
        });
      }

      // Alertas médicas
      if (data.alerts && Array.isArray(data.alerts)) {
        data.alerts.forEach((alert: string) => {
          extraction.alerts.push({
            type: 'warning',
            message: alert,
            relatedTo: 'medical_analysis',
            requiresAttention: true
          });
        });
      }
    }

    // Datos del agente validador
    if (message.from === 'safety_validator') {
      if (data.riskFactors && Array.isArray(data.riskFactors)) {
        data.riskFactors.forEach((risk: string) => {
          extraction.alerts.push({
            type: 'critical',
            message: risk,
            relatedTo: 'safety_validation',
            requiresAttention: true
          });
        });
      }
    }
  }

  // Extraer datos del resultado final
  private async extractDataFromFinalResult(finalData: any, extraction: MedicalDataExtraction): Promise<void> {
    // Consolidar mediciones del resultado final
    if (finalData.measurements) {
      Object.assign(extraction.measurements, finalData.measurements);
    }

    // Extraer hitos de desarrollo si están presentes
    if (finalData.milestones || finalData.hitos) {
      const milestones = finalData.milestones || finalData.hitos;
      if (Array.isArray(milestones)) {
        milestones.forEach((milestone: any) => {
          extraction.milestones.push({
            type: milestone.type || 'development',
            description: milestone.description || milestone.name || milestone,
            date: new Date(),
            ageAtAchievement: milestone.age
          });
        });
      }
    }

    // Extraer medicamentos
    if (finalData.medications || finalData.medicamentos) {
      const medications = finalData.medications || finalData.medicamentos;
      if (Array.isArray(medications)) {
        medications.forEach((med: any) => {
          extraction.medications.push({
            name: med.name || med.nombre,
            dosage: med.dosage || med.dosis,
            frequency: med.frequency || med.frecuencia,
            prescribedBy: med.prescribedBy || med.prescritoPor,
            startDate: new Date()
          });
        });
      }
    }
  }

  // Obtener historial médico como contexto
  async getMedicalHistoryContext(userId: string): Promise<any> {
    console.log('📋 Obteniendo contexto del historial médico');

    try {
      // Obtener registros recientes (últimos 30 días)
      const recentRecords = await databaseService.getHealthRecords(userId, { limit: 100 });
      
      // Obtener estadísticas actuales
      const currentStats = await databaseService.getHealthStats(userId);
      
      // Obtener datos históricos estructurados (simulado por ahora)
      const historicalData = { weight: [], height: [], symptoms: [] };

      // Calcular tendencias
      const trends = await this.calculateTrends(historicalData);

      const context = {
        recentRecords: recentRecords || [],
        currentStats: currentStats || {},
        historicalData: historicalData || {},
        trends,
        lastUpdate: new Date(),
        recordCount: recentRecords?.length || 0
      };

      console.log('✅ Contexto médico obtenido:', {
        records: context.recordCount,
        hasStats: !!currentStats,
        trendsCount: trends.length
      });

      return context;
    } catch (error) {
      console.error('❌ Error obteniendo contexto médico:', error);
      return {
        recentRecords: [],
        currentStats: {},
        historicalData: {},
        trends: [],
        lastUpdate: new Date(),
        recordCount: 0
      };
    }
  }

  // Crear propuesta de integración
  async createIntegrationProposal(
    extractedData: MedicalDataExtraction,
    medicalContext: any,
    userId: string
  ): Promise<IntegrationProposal> {
    console.log('🎯 Creando propuesta de integración a ficha médica');

    const proposalId = `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Analizar contexto y generar comparaciones
    const contextAnalysis = await this.analyzeWithContext(extractedData, medicalContext);

    // Preparar actualizaciones propuestas
    const proposedUpdates = await this.prepareUpdates(extractedData, medicalContext, userId);

    // Determinar si requiere revisión manual
    const requiresReview = this.determineReviewRequirement(extractedData, contextAnalysis);

    // Calcular confianza general
    const confidence = this.calculateOverallConfidence(extractedData);

    const proposal: IntegrationProposal = {
      id: proposalId,
      extractedData,
      proposedUpdates,
      contextAnalysis,
      confidence,
      requiresReview
    };

    console.log('✅ Propuesta de integración creada:', {
      id: proposalId,
      confidence,
      requiresReview,
      updatesCount: Object.keys(proposedUpdates.medicalRecord).length
    });

    return proposal;
  }

  // Aplicar integración a la ficha médica
  async applyIntegration(proposal: IntegrationProposal, userId: string): Promise<boolean> {
    console.log('💾 Aplicando integración a ficha médica:', proposal.id);

    try {
      // 1. Actualizar estadísticas principales (simulado por ahora)
      if (Object.keys(proposal.proposedUpdates.statsUpdates).length > 0) {
        // TODO: Implementar updateHealthStats en databaseService
        console.log('✅ Estadísticas actualizadas (simulado)');
      }

              // 2. Crear registros en el timeline
        for (const timelineEntry of proposal.proposedUpdates.timelineEntries) {
          // Mapear tipos a los que existen en HealthRecord
          let recordType: any = timelineEntry.type;
          if (timelineEntry.type === 'visit') {
            recordType = 'note'; // Mapear visit a note
          }

          const healthRecord: Partial<HealthRecord> = {
            userId,
            type: recordType,
            data: timelineEntry.data,
            timestamp: timelineEntry.date,
            confidence: proposal.confidence,
            requiresAttention: false,
            notes: `Integrado desde análisis multi-agente: ${proposal.id}`,
            tags: ['multi-agent', 'automated'],
            metadata: {
              source: 'ai_extraction' as const,
              originalInput: '',
              context: `Integración multi-agente: ${proposal.id}`
            },
            encrypted: false
          };

          await databaseService.createHealthRecord(healthRecord as any);
          console.log(`✅ Timeline ${recordType} actualizado`);
        }

      // 3. Actualizar datos históricos estructurados
      await this.updateHistoricalData(proposal, userId);

      // 4. Registrar la integración exitosa
      await this.logSuccessfulIntegration(proposal, userId);

      console.log('🎉 Integración aplicada exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error aplicando integración:', error);
      await this.logFailedIntegration(proposal, userId, error);
      return false;
    }
  }

  // Métodos auxiliares privados
  private getDefaultUnit(measurementType: string): string {
    const unitMap: { [key: string]: string } = {
      weight: 'kg',
      height: 'cm',
      temperatura: '°C',
      temperature: '°C',
      heartRate: 'bpm',
      frecuenciaCardiaca: 'bpm'
    };
    return unitMap[measurementType] || '';
  }

  private async calculateTrends(historicalData: any): Promise<string[]> {
    const trends: string[] = [];
    
    try {
      // Calcular tendencia de peso
      if (historicalData.weight && historicalData.weight.length >= 2) {
        const weightTrend = this.calculateSimpleTrend(historicalData.weight);
        trends.push(`Tendencia de peso: ${weightTrend}`);
      }

      // Calcular tendencia de altura
      if (historicalData.height && historicalData.height.length >= 2) {
        const heightTrend = this.calculateSimpleTrend(historicalData.height);
        trends.push(`Tendencia de altura: ${heightTrend}`);
      }

      // Análisis de frecuencia de registros
      const recordFrequency = this.analyzeRecordFrequency(historicalData);
      if (recordFrequency) {
        trends.push(recordFrequency);
      }

    } catch (error) {
      console.warn('⚠️ Error calculando tendencias:', error);
    }

    return trends;
  }

  private calculateSimpleTrend(data: Array<{ value: number; date: Date }>): string {
    if (data.length < 2) return 'Datos insuficientes';
    
    const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const first = sortedData[0].value;
    const last = sortedData[sortedData.length - 1].value;
    const change = last - first;
    const percentChange = (change / first) * 100;

    if (Math.abs(percentChange) < 2) return 'estable';
    return change > 0 ? `creciente (+${percentChange.toFixed(1)}%)` : `decreciente (${percentChange.toFixed(1)}%)`;
  }

  private analyzeRecordFrequency(historicalData: any): string | null {
    const allRecords = Object.values(historicalData).flat() as any[];
    if (allRecords.length === 0) return null;

    const daysSinceFirstRecord = Math.ceil(
      (Date.now() - new Date(allRecords[0].date).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const avgFrequency = allRecords.length / daysSinceFirstRecord;
    
    if (avgFrequency > 0.5) return 'Seguimiento muy activo';
    if (avgFrequency > 0.2) return 'Seguimiento regular';
    return 'Seguimiento esporádico';
  }

  private async analyzeWithContext(
    extractedData: MedicalDataExtraction,
    context: any
  ): Promise<any> {
    const analysis = {
      trends: [] as string[],
      comparisons: [] as string[],
      recommendations: [] as string[],
      alerts: [] as string[]
    };

    // Analizar mediciones en contexto
    if (extractedData.measurements.weight && context.historicalData.weight) {
      const weightAnalysis = this.analyzeWeightInContext(
        extractedData.measurements.weight,
        context.historicalData.weight
      );
      analysis.comparisons.push(weightAnalysis);
    }

    if (extractedData.measurements.temperature && extractedData.measurements.temperature.value > 38) {
      analysis.alerts.push('Temperatura elevada detectada - Recomiendo seguimiento cercano');
    }

    // Generar recomendaciones basadas en tendencias
    if (context.trends.length > 0) {
      analysis.recommendations.push('Continuar con el seguimiento regular basado en tendencias observadas');
    }

    return analysis;
  }

  private analyzeWeightInContext(newWeight: any, historicalWeights: any[]): string {
    if (!historicalWeights || historicalWeights.length === 0) {
      return `Primer registro de peso: ${newWeight.value}${newWeight.unit}`;
    }

    const lastWeight = historicalWeights[historicalWeights.length - 1];
    const change = newWeight.value - lastWeight.value;
    const changePercent = (change / lastWeight.value) * 100;

    return `Peso actual ${newWeight.value}${newWeight.unit} (cambio: ${change > 0 ? '+' : ''}${change.toFixed(2)}${newWeight.unit}, ${changePercent.toFixed(1)}%)`;
  }

  private async prepareUpdates(
    extractedData: MedicalDataExtraction,
    context: any,
    userId: string
  ): Promise<any> {
    const updates = {
      medicalRecord: {} as any,
      statsUpdates: {} as any,
      timelineEntries: [] as any[]
    };

    // Preparar actualizaciones de estadísticas
    if (extractedData.measurements.weight) {
      updates.statsUpdates.currentWeight = extractedData.measurements.weight.value;
      updates.timelineEntries.push({
        type: 'weight',
        data: extractedData.measurements.weight,
        date: extractedData.measurements.weight.date
      });
    }

    if (extractedData.measurements.height) {
      updates.statsUpdates.currentHeight = extractedData.measurements.height.value;
      updates.timelineEntries.push({
        type: 'height',
        data: extractedData.measurements.height,
        date: extractedData.measurements.height.date
      });
    }

    // Preparar entradas de timeline para hitos
    extractedData.milestones.forEach(milestone => {
      updates.timelineEntries.push({
        type: 'milestone',
        data: milestone,
        date: milestone.date
      });
    });

    return updates;
  }

  private determineReviewRequirement(extractedData: MedicalDataExtraction, analysis: any): boolean {
    // Requiere revisión si hay alertas críticas
    const criticalAlerts = extractedData.alerts.filter(alert => alert.type === 'critical');
    if (criticalAlerts.length > 0) return true;

    // Requiere revisión si hay cambios significativos
    if (analysis.alerts && analysis.alerts.length > 0) return true;

    // Requiere revisión si la confianza es baja
    const confidence = this.calculateOverallConfidence(extractedData);
    if (confidence < 0.7) return true;

    return false;
  }

  private calculateOverallConfidence(extractedData: MedicalDataExtraction): number {
    const confidenceValues: number[] = [];

    // Recopilar valores de confianza
    Object.values(extractedData.measurements).forEach(measurement => {
      if (measurement && measurement.confidence) {
        confidenceValues.push(measurement.confidence);
      }
    });

    extractedData.symptoms.forEach(symptom => {
      confidenceValues.push(symptom.confidence);
    });

    if (confidenceValues.length === 0) return 0.8; // Default

    return confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length;
  }

  private async updateHistoricalData(proposal: IntegrationProposal, userId: string): Promise<void> {
    try {
      // Actualizar datos históricos estructurados (simplificado por ahora)
      console.log('📊 Datos históricos actualizados conceptualmente:', {
        entriesCount: proposal.proposedUpdates.timelineEntries.length,
        integrationId: proposal.id
      });
    } catch (error) {
      console.warn('⚠️ Error actualizando datos históricos:', error);
    }
  }

  private async logSuccessfulIntegration(proposal: IntegrationProposal, userId: string): Promise<void> {
    console.log('📝 Registrando integración exitosa:', {
      proposalId: proposal.id,
      userId,
      timestamp: new Date(),
      confidence: proposal.confidence,
      updatesApplied: proposal.proposedUpdates.timelineEntries.length
    });
  }

  private async logFailedIntegration(proposal: IntegrationProposal, userId: string, error: any): Promise<void> {
    console.error('📝 Registrando integración fallida:', {
      proposalId: proposal.id,
      userId,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

export default MedicalRecordIntegrator;