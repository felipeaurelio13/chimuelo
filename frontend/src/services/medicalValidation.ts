// Sistema de Validación Médica para Multi-Agentes
// Basado en estándares médicos pediátricos internacionales

export interface MedicalValidationRule {
  field: string;
  minValue: number;
  maxValue: number;
  unit: string;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  source: string;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  criticalAlerts: string[];
  confidence: number;
  recommendations: string[];
}

export class MedicalValidator {
  private static instance: MedicalValidator;
  
  // Reglas de validación médica pediátrica
  private validationRules: MedicalValidationRule[] = [
    // Peso (kg) - Rangos por edad
    {
      field: 'weight',
      minValue: 0.5,
      maxValue: 50,
      unit: 'kg',
      severity: 'error',
      message: 'Peso fuera del rango normal para bebés (0.5-50 kg)',
      source: 'WHO Growth Standards'
    },
    
    // Altura (cm) - Rangos por edad
    {
      field: 'height',
      minValue: 30,
      maxValue: 150,
      unit: 'cm',
      severity: 'error',
      message: 'Altura fuera del rango normal para bebés (30-150 cm)',
      source: 'WHO Growth Standards'
    },
    
    // Temperatura (°C) - Rangos médicos
    {
      field: 'temperature',
      minValue: 35,
      maxValue: 42,
      unit: '°C',
      severity: 'critical',
      message: 'Temperatura fuera del rango normal (35-42°C)',
      source: 'AAP Guidelines'
    },
    
    // Circunferencia cefálica (cm)
    {
      field: 'headCircumference',
      minValue: 25,
      maxValue: 60,
      unit: 'cm',
      severity: 'warning',
      message: 'Circunferencia cefálica fuera del rango normal',
      source: 'WHO Growth Standards'
    },
    
    // Frecuencia cardíaca (latidos/min)
    {
      field: 'heartRate',
      minValue: 60,
      maxValue: 200,
      unit: 'latidos/min',
      severity: 'critical',
      message: 'Frecuencia cardíaca fuera del rango normal',
      source: 'AAP Guidelines'
    },
    
    // Presión arterial sistólica (mmHg)
    {
      field: 'bloodPressureSystolic',
      minValue: 50,
      maxValue: 140,
      unit: 'mmHg',
      severity: 'critical',
      message: 'Presión arterial sistólica fuera del rango normal',
      source: 'AAP Guidelines'
    }
  ];

  public static getInstance(): MedicalValidator {
    if (!MedicalValidator.instance) {
      MedicalValidator.instance = new MedicalValidator();
    }
    return MedicalValidator.instance;
  }

  // Validar datos médicos
  validateMedicalData(data: any, patientAge?: number): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      criticalAlerts: [],
      confidence: 1.0,
      recommendations: []
    };

    // Validar cada campo
    for (const rule of this.validationRules) {
      const value = data[rule.field];
      if (value !== undefined && value !== null) {
        const validation = this.validateField(value, rule, patientAge);
        
        if (!validation.isValid) {
          result.isValid = false;
          result.confidence *= 0.8; // Reducir confianza
          
          switch (rule.severity) {
            case 'critical':
              result.criticalAlerts.push(validation.message);
              break;
            case 'error':
              result.errors.push(validation.message);
              break;
            case 'warning':
              result.warnings.push(validation.message);
              break;
          }
        }
      }
    }

    // Generar recomendaciones basadas en validaciones
    result.recommendations = this.generateRecommendations(result);
    
    return result;
  }

  // Validar campo específico
  private validateField(value: number, rule: MedicalValidationRule, patientAge?: number): {
    isValid: boolean;
    message: string;
  } {
    // Validación básica de rango
    if (value < rule.minValue || value > rule.maxValue) {
      return {
        isValid: false,
        message: rule.message
      };
    }

    // Validaciones específicas por edad
    if (patientAge && rule.field === 'weight') {
      return this.validateWeightByAge(value, patientAge);
    }

    if (patientAge && rule.field === 'height') {
      return this.validateHeightByAge(value, patientAge);
    }

    return { isValid: true, message: '' };
  }

  // Validar peso por edad (percentiles WHO)
  private validateWeightByAge(weight: number, ageMonths: number): {
    isValid: boolean;
    message: string;
  } {
    // Percentiles WHO para peso por edad
    const percentiles = this.getWeightPercentiles(ageMonths);
    
    if (weight < percentiles.p3) {
      return {
        isValid: false,
        message: `Peso bajo percentil 3 para edad (${ageMonths} meses)`
      };
    }
    
    if (weight > percentiles.p97) {
      return {
        isValid: false,
        message: `Peso alto percentil 97 para edad (${ageMonths} meses)`
      };
    }

    return { isValid: true, message: '' };
  }

  // Validar altura por edad (percentiles WHO)
  private validateHeightByAge(height: number, ageMonths: number): {
    isValid: boolean;
    message: string;
  } {
    // Percentiles WHO para altura por edad
    const percentiles = this.getHeightPercentiles(ageMonths);
    
    if (height < percentiles.p3) {
      return {
        isValid: false,
        message: `Altura baja percentil 3 para edad (${ageMonths} meses)`
      };
    }
    
    if (height > percentiles.p97) {
      return {
        isValid: false,
        message: `Altura alta percentil 97 para edad (${ageMonths} meses)`
      };
    }

    return { isValid: true, message: '' };
  }

  // Obtener percentiles de peso WHO (simplificado)
  private getWeightPercentiles(ageMonths: number): { p3: number; p97: number } {
    // Datos simplificados de percentiles WHO
    const percentiles: Record<number, { p3: number; p97: number }> = {
      0: { p3: 2.5, p97: 4.2 },
      1: { p3: 3.2, p97: 5.4 },
      2: { p3: 3.9, p97: 6.6 },
      3: { p3: 4.5, p97: 7.5 },
      6: { p3: 5.7, p97: 8.9 },
      9: { p3: 6.6, p97: 10.0 },
      12: { p3: 7.3, p97: 11.0 },
      18: { p3: 8.1, p97: 12.2 },
      24: { p3: 8.8, p97: 13.2 }
    };

    // Encontrar percentiles más cercanos
    const ages = Object.keys(percentiles).map(Number).sort((a, b) => a - b);
    let closestAge = ages[0];
    
    for (const age of ages) {
      if (age <= ageMonths) {
        closestAge = age;
      } else {
        break;
      }
    }

    return percentiles[closestAge] || { p3: 2.5, p97: 15.0 };
  }

  // Obtener percentiles de altura WHO (simplificado)
  private getHeightPercentiles(ageMonths: number): { p3: number; p97: number } {
    // Datos simplificados de percentiles WHO
    const percentiles: Record<number, { p3: number; p97: number }> = {
      0: { p3: 46, p97: 54 },
      1: { p3: 50, p97: 58 },
      2: { p3: 54, p97: 62 },
      3: { p3: 57, p97: 65 },
      6: { p3: 61, p97: 70 },
      9: { p3: 64, p97: 73 },
      12: { p3: 67, p97: 76 },
      18: { p3: 71, p97: 80 },
      24: { p3: 75, p97: 84 }
    };

    // Encontrar percentiles más cercanos
    const ages = Object.keys(percentiles).map(Number).sort((a, b) => a - b);
    let closestAge = ages[0];
    
    for (const age of ages) {
      if (age <= ageMonths) {
        closestAge = age;
      } else {
        break;
      }
    }

    return percentiles[closestAge] || { p3: 46, p97: 100 };
  }

  // Generar recomendaciones basadas en validaciones
  private generateRecommendations(result: ValidationResult): string[] {
    const recommendations: string[] = [];

    if (result.criticalAlerts.length > 0) {
      recommendations.push('⚠️ Consultar inmediatamente con pediatra');
    }

    if (result.errors.length > 0) {
      recommendations.push('📋 Verificar datos con profesional médico');
    }

    if (result.warnings.length > 0) {
      recommendations.push('📊 Monitorear valores en próximas mediciones');
    }

    if (result.confidence < 0.8) {
      recommendations.push('🔍 Revisar precisión de mediciones');
    }

    return recommendations;
  }

  // Validar medicamentos
  validateMedication(medication: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      criticalAlerts: [],
      confidence: 1.0,
      recommendations: []
    };

    // Validar dosis
    if (medication.dose) {
      const doseValidation = this.validateDose(medication.dose, medication.name);
      if (!doseValidation.isValid) {
        result.isValid = false;
        result.errors.push(doseValidation.message);
      }
    }

    // Validar frecuencia
    if (medication.frequency) {
      const frequencyValidation = this.validateFrequency(medication.frequency);
      if (!frequencyValidation.isValid) {
        result.isValid = false;
        result.warnings.push(frequencyValidation.message);
      }
    }

    // Validar duración
    if (medication.duration) {
      const durationValidation = this.validateDuration(medication.duration);
      if (!durationValidation.isValid) {
        result.isValid = false;
        result.warnings.push(durationValidation.message);
      }
    }

    return result;
  }

  // Validar dosis de medicamento
  private validateDose(dose: string, medicationName: string): {
    isValid: boolean;
    message: string;
  } {
    // Validaciones básicas de dosis
    if (!dose || dose.trim() === '') {
      return {
        isValid: false,
        message: 'Dosis no especificada'
      };
    }

    // Verificar formato de dosis
    const dosePattern = /^\d+(\.\d+)?\s*(mg|ml|mcg|g|kg|drops|puffs|units)$/i;
    if (!dosePattern.test(dose)) {
      return {
        isValid: false,
        message: 'Formato de dosis inválido'
      };
    }

    return { isValid: true, message: '' };
  }

  // Validar frecuencia de medicamento
  private validateFrequency(frequency: string): {
    isValid: boolean;
    message: string;
  } {
    const validFrequencies = [
      'once daily', 'twice daily', 'three times daily', 'four times daily',
      'every 4 hours', 'every 6 hours', 'every 8 hours', 'every 12 hours',
      'as needed', 'before meals', 'after meals'
    ];

    if (!validFrequencies.some(f => frequency.toLowerCase().includes(f))) {
      return {
        isValid: false,
        message: 'Frecuencia de medicación no estándar'
      };
    }

    return { isValid: true, message: '' };
  }

  // Validar duración de tratamiento
  private validateDuration(duration: string): {
    isValid: boolean;
    message: string;
  } {
    const durationPattern = /^\d+\s*(days|weeks|months|years)$/i;
    if (!durationPattern.test(duration)) {
      return {
        isValid: false,
        message: 'Duración de tratamiento no especificada correctamente'
      };
    }

    return { isValid: true, message: '' };
  }
}

export default MedicalValidator;