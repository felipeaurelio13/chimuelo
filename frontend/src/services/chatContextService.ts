import { dataIntegrityService } from './dataIntegrityService';
import { useData } from '../contexts/DataContext';

export interface MedicalContextFormat {
  babyProfile: {
    name: string;
    age: string;
    gender: string;
    currentMetrics: {
      weight: string;
      height: string;
      bloodType: string;
    };
    medicalInfo: {
      allergies: string[];
      pediatrician: string;
      lastUpdated: string;
    };
  };
  recentActivity: {
    totalRecords: number;
    lastRecordsDate: string;
    recentTypes: string[];
    requiresAttention: string[];
  };
  developmentMilestones: {
    currentStage: string;
    recentAchievements: string[];
    upcomingMilestones: string[];
  };
  summary: string;
}

export class ChatContextService {
  private static instance: ChatContextService;
  
  public static getInstance(): ChatContextService {
    if (!ChatContextService.instance) {
      ChatContextService.instance = new ChatContextService();
    }
    return ChatContextService.instance;
  }

  /**
   * Formats complete medical context for OpenAI API
   * Optimized for GPT-4 understanding with structured sections
   */
  public formatMedicalContextForAI(): string {
    const profile = dataIntegrityService.getBabyProfile();
    const age = dataIntegrityService.calculateAge();
    
    // Get health records from DataContext (we'll need to pass this in)
    const healthRecords = this.getHealthRecords();
    
    const context = `=== CONTEXTO MÉDICO COMPLETO DE ${profile.name.toUpperCase()} ===

📋 INFORMACIÓN PERSONAL:
• Nombre: ${profile.name}
• Edad actual: ${age}
• Género: ${this.formatGender(profile.gender)}
• Fecha de nacimiento: ${this.formatDate(profile.dateOfBirth)}

📊 MÉTRICAS ACTUALES:
• Peso: ${dataIntegrityService.formatWeight(profile.currentWeight)}
• Altura: ${dataIntegrityService.formatHeight(profile.currentHeight)}
• Tipo de sangre: ${profile.bloodType || 'No registrado'}

🚨 INFORMACIÓN MÉDICA CRÍTICA:
• Alergias conocidas: ${profile.allergies.length > 0 ? profile.allergies.join(', ') : 'Ninguna registrada'}
• Pediatra: ${profile.pediatrician?.name || 'No asignado'}
• Contacto pediatra: ${profile.pediatrician?.phone || 'No disponible'}
• Clínica: ${profile.pediatrician?.clinic || 'No registrada'}

📈 HISTORIAL RECIENTE (${healthRecords.length} registros totales):
${this.formatRecentRecords(healthRecords)}

⚠️ REGISTROS QUE REQUIEREN ATENCIÓN:
${this.formatAttentionRecords(healthRecords)}

🎯 DESARROLLO Y HITOS:
• Etapa actual: ${this.getDevelopmentStage(age)}
• Próximos hitos esperados: ${this.getUpcomingMilestones(age)}

📝 ÚLTIMA ACTUALIZACIÓN: ${this.formatDate(profile.lastUpdated)}

=== INSTRUCCIONES PARA IA ===
1. SIEMPRE considera la edad específica de ${profile.name} (${age}) en tus respuestas
2. Si hay alergias, menciónalas cuando sea relevante
3. Considera el contexto de los registros recientes
4. Proporciona información apropiada para la etapa de desarrollo actual
5. Si detectas algo preocupante, recomienda consultar al pediatra
6. Mantén un tono empático y comprensivo para padres primerizos

=== CONTEXTO PARA RESPUESTA ===`;

    return context;
  }

  /**
   * Creates a comprehensive medical context object for AI processing
   */
  public createStructuredMedicalContext(): MedicalContextFormat {
    const profile = dataIntegrityService.getBabyProfile();
    const age = dataIntegrityService.calculateAge();
    const healthRecords = this.getHealthRecords();
    
    return {
      babyProfile: {
        name: profile.name,
        age: age,
        gender: this.formatGender(profile.gender),
        currentMetrics: {
          weight: dataIntegrityService.formatWeight(profile.currentWeight),
          height: dataIntegrityService.formatHeight(profile.currentHeight),
          bloodType: profile.bloodType || 'No registrado'
        },
        medicalInfo: {
          allergies: profile.allergies,
          pediatrician: profile.pediatrician?.name || 'No asignado',
          lastUpdated: this.formatDate(profile.lastUpdated)
        }
      },
      recentActivity: {
        totalRecords: healthRecords.length,
        lastRecordsDate: healthRecords.length > 0 ? 
          this.formatDate(new Date(healthRecords[0].timestamp)) : 'Sin registros',
        recentTypes: this.getRecentRecordTypes(healthRecords),
        requiresAttention: this.getAttentionRecords(healthRecords)
      },
      developmentMilestones: {
        currentStage: this.getDevelopmentStage(age),
        recentAchievements: this.getRecentMilestones(healthRecords),
        upcomingMilestones: this.getUpcomingMilestones(age)
      },
      summary: `${profile.name} es ${this.getGenderArticle(profile.gender)} ${age} de edad, ${this.getHealthSummary(healthRecords)}`
    };
  }

  /**
   * Formats medical context specifically for vision AI analysis
   */
  public formatContextForVisionAnalysis(documentType: 'medical_report' | 'prescription' | 'lab_result' | 'vaccine_record' | 'growth_chart' | 'general'): string {
    const profile = dataIntegrityService.getBabyProfile();
    const age = dataIntegrityService.calculateAge();
    
    return `Analiza este documento médico para ${profile.name}, ${this.getGenderArticle(profile.gender)} bebé de ${age}.

CONTEXTO DEL PACIENTE:
- Nombre: ${profile.name}
- Edad: ${age}
- Alergias conocidas: ${profile.allergies.length > 0 ? profile.allergies.join(', ') : 'Ninguna'}
- Peso actual: ${dataIntegrityService.formatWeight(profile.currentWeight)}
- Altura actual: ${dataIntegrityService.formatHeight(profile.currentHeight)}

INSTRUCCIONES DE ANÁLISIS:
1. Extrae TODA la información médica relevante del documento
2. Organiza la información en formato JSON estructurado
3. Identifica: fechas, medicamentos, dosis, indicaciones, resultados, recomendaciones
4. Marca cualquier información que requiera atención médica urgente
5. Considera la edad específica del bebé para el contexto
6. Si hay alergias conocidas, verifica compatibilidad con medicamentos

FORMATO DE SALIDA REQUERIDO:
Responde ÚNICAMENTE con un JSON válido con esta estructura:
{
  "documentType": "${documentType}",
  "patientInfo": {
    "name": "nombre extraído",
    "dateOfBirth": "fecha si está disponible",
    "age": "edad calculada o extraída"
  },
  "extractedData": {
    "date": "fecha del documento",
    "provider": "médico o institución",
    "mainFindings": ["hallazgo1", "hallazgo2"],
    "medications": [
      {
        "name": "nombre medicamento",
        "dose": "dosis",
        "frequency": "frecuencia",
        "duration": "duración"
      }
    ],
    "measurements": {
      "weight": "peso si disponible",
      "height": "altura si disponible",
      "temperature": "temperatura si disponible",
      "other": {}
    },
    "recommendations": ["recomendación1", "recomendación2"],
    "nextAppointment": "fecha próxima cita si disponible",
    "urgentFlags": ["elementos que requieren atención inmediata"]
  },
  "analysisNotes": {
    "confidence": "alto/medio/bajo",
    "allergyWarnings": ["advertencias sobre alergias"],
    "ageAppropriate": "si es apropiado para la edad",
    "requiresPhysicianReview": true/false
  }
}`;
  }

  // Helper methods
  private getHealthRecords(): any[] {
    // This will be provided by the component that uses this service
    // For now, return empty array
    return [];
  }

  private formatGender(gender: string): string {
    const genderMap: Record<string, string> = {
      'male': 'Masculino',
      'female': 'Femenino',
      'other': 'Otro'
    };
    return genderMap[gender] || 'No especificado';
  }

  private getGenderArticle(gender: string): string {
    return gender === 'female' ? 'una niña' : gender === 'male' ? 'un niño' : 'un bebé';
  }

  private formatDate(date: Date): string {
    if (!date) return 'No disponible';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private formatRecentRecords(records: any[]): string {
    if (records.length === 0) return '• Sin registros recientes';
    
    const recent = records
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
    
    return recent.map(record => 
      `• ${this.formatRecordType(record.type)} - ${this.formatDate(new Date(record.timestamp))}`
    ).join('\n');
  }

  private formatAttentionRecords(records: any[]): string {
    const attentionRecords = records.filter(r => r.requiresAttention);
    if (attentionRecords.length === 0) return '• Ninguno actualmente';
    
    return attentionRecords.map(record =>
      `• ${this.formatRecordType(record.type)} - ${record.notes || 'Revisar con pediatra'}`
    ).join('\n');
  }

  private formatRecordType(type: string): string {
    const typeMap: Record<string, string> = {
      'weight': 'Peso',
      'height': 'Altura',
      'temperature': 'Temperatura',
      'medication': 'Medicación',
      'vaccine': 'Vacuna',
      'symptom': 'Síntoma',
      'milestone': 'Hito de desarrollo',
      'note': 'Nota médica'
    };
    return typeMap[type] || type;
  }

  private getRecentRecordTypes(records: any[]): string[] {
    const recentTypes = records
      .slice(0, 10)
      .map(r => this.formatRecordType(r.type));
    return [...new Set(recentTypes)];
  }

  private getAttentionRecords(records: any[]): string[] {
    return records
      .filter(r => r.requiresAttention)
      .map(r => `${this.formatRecordType(r.type)}: ${r.notes || 'Revisar'}`);
  }

  private getDevelopmentStage(age: string): string {
    // Simple age-based development stage mapping
    if (age.includes('días') || age.includes('semana')) {
      return 'Recién nacido (0-2 meses)';
    } else if (age.includes('1 mes') || age.includes('2 mes')) {
      return 'Lactante temprano (0-2 meses)';
    } else if (age.includes('3 mes') || age.includes('4 mes') || age.includes('5 mes')) {
      return 'Lactante (3-5 meses)';
    } else if (age.includes('6 mes') || age.includes('7 mes') || age.includes('8 mes')) {
      return 'Lactante avanzado (6-8 meses)';
    } else if (age.includes('9 mes') || age.includes('10 mes') || age.includes('11 mes')) {
      return 'Pre-caminador (9-11 meses)';
    } else if (age.includes('1 año')) {
      return 'Primer año completado';
    } else {
      return 'Niño pequeño';
    }
  }

  private getUpcomingMilestones(age: string): string[] {
    // Age-appropriate upcoming milestones
    if (age.includes('días') || age.includes('1 mes')) {
      return ['Control de cabeza', 'Sonrisa social', 'Seguimiento visual'];
    } else if (age.includes('2 mes') || age.includes('3 mes')) {
      return ['Sostener cabeza erguida', 'Primeros balbuceos', 'Vacunas de 2 meses'];
    } else if (age.includes('4 mes') || age.includes('5 mes')) {
      return ['Volteo', 'Agarre voluntario', 'Vacunas de 4 meses'];
    } else if (age.includes('6 mes')) {
      return ['Sentarse con apoyo', 'Alimentación complementaria', 'Vacunas de 6 meses'];
    } else {
      return ['Desarrollo motor grueso', 'Desarrollo del lenguaje', 'Controles pediátricos'];
    }
  }

  private getRecentMilestones(records: any[]): string[] {
    return records
      .filter(r => r.type === 'milestone')
      .slice(0, 3)
      .map(r => r.notes || 'Hito registrado');
  }

  private getHealthSummary(records: any[]): string {
    if (records.length === 0) return 'sin registros médicos previos.';
    
    const hasSymptoms = records.some(r => r.type === 'symptom');
    const hasMedications = records.some(r => r.type === 'medication');
    const needsAttention = records.some(r => r.requiresAttention);
    
    if (needsAttention) return 'con algunos registros que requieren seguimiento médico.';
    if (hasSymptoms) return 'con algunos síntomas registrados recientemente.';
    if (hasMedications) return 'con medicaciones bajo seguimiento.';
    return 'con desarrollo aparentemente normal según los registros.';
  }

  /**
   * Updates context when health records change
   */
  public setHealthRecords(records: any[]): void {
    // This method allows components to provide health records
    this.healthRecords = records;
  }

  private healthRecords: any[] = [];
}

export const chatContextService = ChatContextService.getInstance();