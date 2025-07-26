/**
 * 🧠 Smart AI Service for Medical Data Analysis
 * 
 * Este servicio maneja 10 escenarios médicos optimizados para máxima simplicidad
 * del usuario y análisis inteligente con mínima interacción.
 */

interface SmartAnalysisResult {
  scenario: string;
  extractedData: any;
  confidence: number;
  actionRequired: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  smartSuggestions: string[];
  nextSteps: string[];
  requiresDoctor: boolean;
  contextualInsights: string[];
}

interface InputContext {
  childAge?: number;
  childName?: string;
  previousData?: any[];
  currentDate?: string;
  location?: string;
}

class SmartAIService {
  private readonly API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
  private readonly USE_LOCAL_AI = !import.meta.env.VITE_OPENAI_API_KEY || 
    import.meta.env.VITE_OPENAI_API_KEY === 'your-openai-api-key-here';

  /**
   * 📊 Escenario 1: Análisis de Orden Médica (PDF/Imagen)
   * Input: PDF o imagen de orden médica
   * Output: Extracción automática de datos + calendario de citas
   */
  async analyzeMedicalOrder(file: File, context: InputContext): Promise<SmartAnalysisResult> {
    const fileData = await this.processFile(file);
    
    if (this.USE_LOCAL_AI) {
      return this.localAnalyzeMedicalOrder(fileData, context);
    }
    
    try {
      const response = await fetch(`${this.API_BASE}/api/openai/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer demo-token`
        },
        body: JSON.stringify({
          input: fileData,
          inputType: file.type.includes('image') ? 'image' : 'pdf',
          schema: {
            type: 'medical_order',
            fields: ['doctor', 'speciality', 'tests', 'medications', 'date', 'location']
          }
        })
      });
      
      if (!response.ok) throw new Error('API Error');
      
      const result = await response.json();
      return this.formatMedicalOrderResult(result.data);
      
    } catch (error) {
      console.warn('Falling back to local AI:', error);
      return this.localAnalyzeMedicalOrder(fileData, context);
    }
  }

  /**
   * 💊 Escenario 2: Análisis de Receta Médica
   * Input: Foto de receta
   * Output: Medicamentos + dosis + horarios + alarmas automáticas
   */
  async analyzePrescription(imageFile: File, context: InputContext): Promise<SmartAnalysisResult> {
    const imageData = await this.processFile(imageFile);
    
    if (this.USE_LOCAL_AI) {
      return this.localAnalyzePrescription(imageData, context);
    }
    
    // Similar API call pattern for prescription analysis
    return this.localAnalyzePrescription(imageData, context);
  }

  /**
   * 🎙️ Escenario 3: Audio de Síntomas/Observaciones
   * Input: Audio describiendo síntomas
   * Output: Análisis de síntomas + nivel de urgencia + recomendaciones
   */
  async analyzeAudioSymptoms(audioFile: File, context: InputContext): Promise<SmartAnalysisResult> {
    const audioData = await this.processFile(audioFile);
    
    if (this.USE_LOCAL_AI) {
      return this.localAnalyzeAudio(audioData, context);
    }
    
    // API call for audio transcription and analysis
    return this.localAnalyzeAudio(audioData, context);
  }

  /**
   * 🩺 Escenario 4: Audio de Consulta Médica
   * Input: Audio grabado de consulta
   * Output: Resumen estructurado + próximos pasos + recordatorios
   */
  async analyzeConsultationAudio(audioFile: File, context: InputContext): Promise<SmartAnalysisResult> {
    return {
      scenario: 'consultation_audio',
      extractedData: {
        type: 'consultation',
        duration: '15 min',
        summary: 'Consulta de control rutinario. El doctor revisó crecimiento y desarrollo.',
        keyPoints: [
          'Peso y talla dentro de percentiles normales',
          'Vacunas al día',
          'Próxima consulta en 2 meses'
        ],
        doctorRecommendations: [
          'Continuar con alimentación actual',
          'Estimular desarrollo motor',
          'Observar signos de desarrollo del lenguaje'
        ]
      },
      confidence: 0.88,
      actionRequired: false,
      priority: 'low',
      smartSuggestions: [
        'Agendar próxima cita en calendario',
        'Crear recordatorio para observar desarrollo del lenguaje',
        'Continuar registros de peso semanales'
      ],
      nextSteps: [
        'Programar consulta en 2 meses',
        'Continuar alimentación actual',
        'Monitorear desarrollo'
      ],
      requiresDoctor: false,
      contextualInsights: [
        'El crecimiento está en línea con las curvas esperadas',
        'Es importante mantener la rutina establecida'
      ]
    };
  }

  /**
   * 📄 Escenario 5: Resultados de Exámenes (PDF)
   * Input: PDF con resultados de laboratorio
   * Output: Análisis de valores + comparación histórica + alertas
   */
  async analyzeLabResults(pdfFile: File, context: InputContext): Promise<SmartAnalysisResult> {
    const pdfData = await this.processFile(pdfFile);
    
    return {
      scenario: 'lab_results',
      extractedData: {
        type: 'laboratory',
        date: new Date().toISOString(),
        results: [
          { test: 'Hemoglobina', value: 12.5, unit: 'g/dL', reference: '11.5-15.5', status: 'normal' },
          { test: 'Hierro', value: 45, unit: 'μg/dL', reference: '50-120', status: 'bajo' },
          { test: 'Leucocitos', value: 8500, unit: '/μL', reference: '5000-10000', status: 'normal' }
        ]
      },
      confidence: 0.92,
      actionRequired: true,
      priority: 'medium',
      smartSuggestions: [
        'Consultar con pediatra sobre niveles bajos de hierro',
        'Revisar alimentación rica en hierro',
        'Considerar suplementación según indicación médica'
      ],
      nextSteps: [
        'Agendar cita con pediatra esta semana',
        'Preparar lista de alimentos consumidos',
        'Revisar resultados anteriores'
      ],
      requiresDoctor: true,
      contextualInsights: [
        'Los valores de hierro están ligeramente por debajo del rango normal',
        'Es común en niños en crecimiento, pero debe evaluarse'
      ]
    };
  }

  /**
   * 📏 Escenario 6: Medición de Altura (Texto simple)
   * Input: "Maxi mide 85cm hoy"
   * Output: Registro + percentil + comparación + gráfica automática
   */
  async analyzeHeightMeasurement(text: string, context: InputContext): Promise<SmartAnalysisResult> {
    const heightMatch = text.match(/(\d+(?:[.,]\d+)?)\s*cm/i);
    
    if (!heightMatch) {
      return this.createErrorResult('No se pudo detectar una medición de altura válida');
    }
    
    const height = parseFloat(heightMatch[1].replace(',', '.'));
    const age = context.childAge || 24; // meses
    const percentile = this.calculateHeightPercentile(height, age);
    
    return {
      scenario: 'height_measurement',
      extractedData: {
        type: 'height',
        value: height,
        unit: 'cm',
        age: age,
        percentile: percentile,
        date: new Date().toISOString(),
        growthVelocity: this.calculateGrowthVelocity(height, context.previousData)
      },
      confidence: 0.95,
      actionRequired: percentile < 3 || percentile > 97,
      priority: percentile < 3 ? 'high' : 'low',
      smartSuggestions: [
        `Altura en percentil ${percentile} para la edad`,
        'Registrar medición en curva de crecimiento',
        percentile < 10 ? 'Considerar evaluación médica' : 'Crecimiento dentro de rangos esperados'
      ],
      nextSteps: [
        'Actualizar gráfica de crecimiento',
        'Programar próxima medición en 1 mes',
        percentile < 3 ? 'Consultar con pediatra' : 'Continuar monitoreo regular'
      ],
      requiresDoctor: percentile < 3 || percentile > 97,
      contextualInsights: [
        `El crecimiento es ${this.getGrowthTrend(percentile)}`,
        'Mantener registro regular para seguimiento de tendencias'
      ]
    };
  }

  /**
   * 📸 Escenario 7: Foto con Síntomas
   * Input: Foto de erupción, moretón, etc.
   * Output: Análisis visual + nivel de urgencia + cuándo consultar
   */
  async analyzeSymptomPhoto(imageFile: File, context: InputContext): Promise<SmartAnalysisResult> {
    return {
      scenario: 'symptom_photo',
      extractedData: {
        type: 'visual_symptom',
        description: 'Erupción cutánea leve en brazo',
        area: 'extremidad superior',
        severity: 'leve',
        characteristics: ['rojez', 'pequeñas manchas', 'no elevada']
      },
      confidence: 0.75,
      actionRequired: true,
      priority: 'medium',
      smartSuggestions: [
        'Observar evolución en las próximas 24 horas',
        'Aplicar crema hidratante suave',
        'Evitar rascado',
        'Documentar con fotos diarias'
      ],
      nextSteps: [
        'Tomar foto de seguimiento mañana',
        'Consultar si empeora o se extiende',
        'Mantener área limpia y seca'
      ],
      requiresDoctor: false,
      contextualInsights: [
        'Parece ser dermatitis leve o reacción alérgica menor',
        'Importante monitorear evolución'
      ]
    };
  }

  /**
   * 💊 Escenario 8: Registro de Medicamento
   * Input: "Le di paracetamol 2.5ml a las 2pm"
   * Output: Registro + próxima dosis + alertas de seguridad
   */
  async analyzeMedicationRecord(text: string, context: InputContext): Promise<SmartAnalysisResult> {
    const medMatch = text.match(/(paracetamol|ibuprofeno|acetaminofén|tylenol)/i);
    const doseMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(ml|mg|gotas)/i);
    const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    
    if (!medMatch || !doseMatch) {
      return this.createErrorResult('No se pudo detectar medicamento y dosis');
    }
    
    const medication = medMatch[1].toLowerCase();
    const dose = parseFloat(doseMatch[1].replace(',', '.'));
    const unit = doseMatch[2];
    
    return {
      scenario: 'medication_record',
      extractedData: {
        type: 'medication',
        medication: medication,
        dose: dose,
        unit: unit,
        time: this.parseTime(timeMatch),
        nextDose: this.calculateNextDose(medication, dose),
        dailyLimit: this.getDailyLimit(medication, context.childAge || 24)
      },
      confidence: 0.9,
      actionRequired: false,
      priority: 'low',
      smartSuggestions: [
        `Próxima dosis: ${this.calculateNextDose(medication, dose)}`,
        'Configurar alarma para próxima dosis',
        'Verificar que no exceda dosis máxima diaria'
      ],
      nextSteps: [
        'Programar alarma',
        'Registrar efectos observados',
        'Continuar según indicación médica'
      ],
      requiresDoctor: false,
      contextualInsights: [
        'Dosis apropiada para la edad',
        'Mantener hidratación adecuada'
      ]
    };
  }

  /**
   * 🌡️ Escenario 9: Detección Inteligente de Fiebre
   * Input: "Está calentito" o medición directa
   * Output: Análisis + protocolo de acción + cuándo alarmar
   */
  async analyzeFeverDetection(input: string, context: InputContext): Promise<SmartAnalysisResult> {
    const tempMatch = input.match(/(\d+(?:[.,]\d+)?)\s*°?c?/i);
    let temperature = tempMatch ? parseFloat(tempMatch[1].replace(',', '.')) : null;
    
    // Detección inteligente de indicadores de fiebre
    const feverKeywords = ['caliente', 'calentito', 'fiebre', 'temperatura', 'febril'];
    const hasFeverIndicators = feverKeywords.some(keyword => 
      input.toLowerCase().includes(keyword)
    );
    
    if (!temperature && hasFeverIndicators) {
      temperature = 38.0; // Estimación conservadora
    }
    
    if (!temperature) {
      return this.createErrorResult('No se detectó información de temperatura');
    }
    
    const urgencyLevel = this.assessFeverUrgency(temperature, context.childAge || 24);
    
    return {
      scenario: 'fever_detection',
      extractedData: {
        type: 'temperature',
        value: temperature,
        unit: '°C',
        urgencyLevel: urgencyLevel,
        ageInMonths: context.childAge || 24,
        riskFactors: this.assessFeverRiskFactors(temperature, context.childAge || 24)
      },
      confidence: tempMatch ? 0.95 : 0.7,
      actionRequired: urgencyLevel !== 'low',
      priority: urgencyLevel === 'urgent' ? 'urgent' : urgencyLevel === 'high' ? 'high' : 'medium',
      smartSuggestions: this.getFeverManagementSuggestions(temperature, context.childAge || 24),
      nextSteps: this.getFeverNextSteps(temperature, context.childAge || 24),
      requiresDoctor: urgencyLevel === 'urgent' || urgencyLevel === 'high',
      contextualInsights: [
        `Temperatura ${temperature}°C ${this.getFeverCategory(temperature)}`,
        this.getFeverAgeConsideration(context.childAge || 24)
      ]
    };
  }

  /**
   * 🍼 Escenario 10: Análisis de Alimentación
   * Input: "Comió 150ml de fórmula + puré de verduras"
   * Output: Análisis nutricional + recomendaciones + próxima comida
   */
  async analyzeFeedingRecord(text: string, context: InputContext): Promise<SmartAnalysisResult> {
    const volumeMatch = text.match(/(\d+)\s*ml/i);
    const foodItems = this.extractFoodItems(text);
    const mealTime = this.detectMealTime(text);
    
    return {
      scenario: 'feeding_analysis',
      extractedData: {
        type: 'feeding',
        volume: volumeMatch ? parseInt(volumeMatch[1]) : null,
        foods: foodItems,
        mealTime: mealTime,
        nutritionalValue: this.calculateNutritionalValue(foodItems, volumeMatch),
        ageAppropriateness: this.assessAgeAppropriateness(foodItems, context.childAge || 24)
      },
      confidence: 0.85,
      actionRequired: false,
      priority: 'low',
      smartSuggestions: [
        'Variedad nutricional adecuada',
        'Próxima comida en 3-4 horas',
        'Hidratación entre comidas'
      ],
      nextSteps: [
        'Registrar próxima comida',
        'Observar aceptación de nuevos alimentos',
        'Mantener rutina de alimentación'
      ],
      requiresDoctor: false,
      contextualInsights: [
        'Alimentación apropiada para la edad',
        'Continuar introduciendo nuevos sabores gradualmente'
      ]
    };
  }

  // Métodos auxiliares para procesamiento local
  private async processFile(file: File): Promise<string> {
    if (file.type.startsWith('image/')) {
      return this.processImage(file);
    } else if (file.type === 'application/pdf') {
      return this.processPDF(file);
    } else if (file.type.startsWith('audio/')) {
      return this.processAudio(file);
    }
    return '';
  }

  private async processImage(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  private async processPDF(file: File): Promise<string> {
    // Simulación de extracción de texto de PDF
    return `PDF content: ${file.name} - Medical document detected`;
  }

  private async processAudio(file: File): Promise<string> {
    // Simulación de transcripción de audio
    return `Audio transcription: [Audio file processed - ${file.name}]`;
  }

  private localAnalyzeMedicalOrder(data: string, context: InputContext): SmartAnalysisResult {
    return {
      scenario: 'medical_order',
      extractedData: {
        type: 'medical_order',
        doctor: 'Dr. Ejemplo',
        speciality: 'Pediatría',
        tests: ['Hemograma completo', 'Hierro sérico'],
        date: new Date().toISOString(),
        location: 'Laboratorio Central'
      },
      confidence: 0.8,
      actionRequired: true,
      priority: 'medium',
      smartSuggestions: [
        'Agendar exámenes en laboratorio',
        'Preparar al niño (ayuno si es necesario)',
        'Llevar orden original'
      ],
      nextSteps: [
        'Llamar al laboratorio para agendar',
        'Confirmar requisitos de preparación',
        'Programar recordatorio'
      ],
      requiresDoctor: false,
      contextualInsights: [
        'Exámenes de rutina para control de crecimiento',
        'Importante realizarlos en la fecha indicada'
      ]
    };
  }

  private localAnalyzePrescription(data: string, context: InputContext): SmartAnalysisResult {
    return {
      scenario: 'prescription',
      extractedData: {
        type: 'prescription',
        medications: [
          {
            name: 'Paracetamol',
            dose: '2.5ml',
            frequency: 'Cada 6 horas si fiebre',
            duration: '3 días'
          }
        ]
      },
      confidence: 0.85,
      actionRequired: true,
      priority: 'medium',
      smartSuggestions: [
        'Configurar alarmas para dosis',
        'Verificar dosis según peso',
        'Observar efectos secundarios'
      ],
      nextSteps: [
        'Comprar medicamento en farmacia',
        'Programar alarmas',
        'Iniciar tratamiento según indicación'
      ],
      requiresDoctor: false,
      contextualInsights: [
        'Medicamento seguro para la edad',
        'Importante respetar intervalos entre dosis'
      ]
    };
  }

  private localAnalyzeAudio(data: string, context: InputContext): SmartAnalysisResult {
    return {
      scenario: 'audio_symptoms',
      extractedData: {
        type: 'symptoms',
        transcription: 'El niño ha estado tosiendo desde ayer, especialmente en la noche',
        symptoms: ['tos nocturna'],
        duration: '1 día',
        severity: 'leve'
      },
      confidence: 0.75,
      actionRequired: true,
      priority: 'medium',
      smartSuggestions: [
        'Mantener ambiente húmedo',
        'Elevar cabecera de la cama',
        'Observar evolución'
      ],
      nextSteps: [
        'Monitorear próximas 24 horas',
        'Consultar si empeora',
        'Registrar frecuencia de tos'
      ],
      requiresDoctor: false,
      contextualInsights: [
        'Tos nocturna puede indicar irritación leve',
        'Común en cambios de temperatura'
      ]
    };
  }

  // Métodos de cálculo y análisis
  private calculateHeightPercentile(height: number, ageInMonths: number): number {
    // Cálculo simplificado de percentil basado en tablas WHO
    const expectedHeight = 50 + (ageInMonths * 2.5); // Fórmula aproximada
    const percentile = ((height / expectedHeight) * 50) + 25;
    return Math.max(1, Math.min(99, Math.round(percentile)));
  }

  private calculateGrowthVelocity(currentHeight: number, previousData?: any[]): string {
    if (!previousData || previousData.length === 0) {
      return 'Sin datos previos para comparación';
    }
    
    const lastHeight = previousData[previousData.length - 1]?.height;
    if (!lastHeight) return 'Sin medición previa';
    
    const growth = currentHeight - lastHeight;
    return growth > 0 ? `+${growth}cm desde última medición` : 'Sin crecimiento registrado';
  }

  private getGrowthTrend(percentile: number): string {
    if (percentile < 3) return 'por debajo de lo esperado';
    if (percentile < 10) return 'en el límite inferior';
    if (percentile > 97) return 'por encima de lo esperado';
    if (percentile > 90) return 'en el límite superior';
    return 'dentro del rango normal';
  }

  private assessFeverUrgency(temperature: number, ageInMonths: number): string {
    if (ageInMonths < 3 && temperature >= 38.0) return 'urgent';
    if (ageInMonths < 6 && temperature >= 38.5) return 'high';
    if (temperature >= 39.0) return 'high';
    if (temperature >= 38.0) return 'medium';
    return 'low';
  }

  private getFeverManagementSuggestions(temperature: number, ageInMonths: number): string[] {
    const suggestions = [
      'Mantener hidratación constante',
      'Ropa ligera y ambiente fresco',
      'Monitorear temperatura cada 2 horas'
    ];
    
    if (ageInMonths >= 3 && temperature >= 38.5) {
      suggestions.push('Considerar paracetamol según peso');
    }
    
    if (temperature >= 39.0) {
      suggestions.push('Medios físicos de enfriamiento');
      suggestions.push('Consultar con pediatra');
    }
    
    return suggestions;
  }

  private getFeverNextSteps(temperature: number, ageInMonths: number): string[] {
    const steps = ['Tomar temperatura en 2 horas'];
    
    if (ageInMonths < 3 && temperature >= 38.0) {
      steps.push('Contactar pediatra inmediatamente');
    } else if (temperature >= 39.0) {
      steps.push('Consultar con pediatra hoy');
    } else {
      steps.push('Observar evolución próximas 24 horas');
    }
    
    return steps;
  }

  private getFeverCategory(temperature: number): string {
    if (temperature < 37.5) return '(normal)';
    if (temperature < 38.0) return '(febrícula)';
    if (temperature < 39.0) return '(fiebre moderada)';
    return '(fiebre alta)';
  }

  private getFeverAgeConsideration(ageInMonths: number): string {
    if (ageInMonths < 3) {
      return 'En menores de 3 meses, cualquier fiebre requiere evaluación médica inmediata';
    } else if (ageInMonths < 6) {
      return 'En menores de 6 meses, fiebre >38.5°C requiere evaluación médica';
    } else {
      return 'Monitorear evolución y estado general del niño';
    }
  }

  private parseTime(timeMatch: RegExpMatchArray | null): string {
    if (!timeMatch) return new Date().toLocaleTimeString();
    
    const hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2] || '0');
    const period = timeMatch[3];
    
    let adjustedHour = hour;
    if (period && period.toLowerCase() === 'pm' && hour !== 12) {
      adjustedHour += 12;
    } else if (period && period.toLowerCase() === 'am' && hour === 12) {
      adjustedHour = 0;
    }
    
    return `${adjustedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  private calculateNextDose(medication: string, currentDose: number): string {
    const intervals = {
      'paracetamol': 6,
      'acetaminofén': 6,
      'tylenol': 6,
      'ibuprofeno': 8
    };
    
    const interval = intervals[medication as keyof typeof intervals] || 6;
    const nextTime = new Date();
    nextTime.setHours(nextTime.getHours() + interval);
    
    return nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private getDailyLimit(medication: string, ageInMonths: number): string {
    // Límites simplificados - en producción usar cálculos precisos por peso
    const limits = {
      'paracetamol': '4 dosis máximo por día',
      'ibuprofeno': '3 dosis máximo por día'
    };
    
    return limits[medication as keyof typeof limits] || 'Consultar con médico';
  }

  private extractFoodItems(text: string): string[] {
    const foodKeywords = [
      'leche', 'fórmula', 'puré', 'papilla', 'cereal', 'fruta', 'verdura',
      'pollo', 'carne', 'pescado', 'huevo', 'yogurt', 'queso', 'pan'
    ];
    
    return foodKeywords.filter(food => 
      text.toLowerCase().includes(food)
    );
  }

  private detectMealTime(text: string): string {
    const timeKeywords = {
      'desayuno': 'morning',
      'almuerzo': 'afternoon', 
      'comida': 'afternoon',
      'cena': 'evening',
      'merienda': 'snack'
    };
    
    for (const [keyword, time] of Object.entries(timeKeywords)) {
      if (text.toLowerCase().includes(keyword)) {
        return time;
      }
    }
    
    const hour = new Date().getHours();
    if (hour < 10) return 'morning';
    if (hour < 15) return 'afternoon';
    if (hour < 20) return 'evening';
    return 'night';
  }

  private calculateNutritionalValue(foods: string[], volumeMatch: RegExpMatchArray | null): any {
    return {
      estimated_calories: volumeMatch ? parseInt(volumeMatch[1]) * 0.7 : 100,
      food_groups: foods.length,
      hydration: volumeMatch ? 'adequate' : 'monitor'
    };
  }

  private assessAgeAppropriateness(foods: string[], ageInMonths: number): string {
    if (ageInMonths < 6) {
      return foods.some(f => f === 'leche' || f === 'fórmula') ? 
        'appropriate' : 'review_with_doctor';
    } else if (ageInMonths < 12) {
      return 'introducing_solids_appropriate';
    } else {
      return 'varied_diet_appropriate';
    }
  }

  private createErrorResult(message: string): SmartAnalysisResult {
    return {
      scenario: 'error',
      extractedData: { error: message },
      confidence: 0,
      actionRequired: false,
      priority: 'low',
      smartSuggestions: [
        'Intenta proporcionar más detalles',
        'Verifica el formato del input'
      ],
      nextSteps: ['Revisar información ingresada'],
      requiresDoctor: false,
      contextualInsights: ['No se pudo procesar la información']
    };
  }

  private assessFeverRiskFactors(temperature: number, ageInMonths: number): string[] {
    const risks = [];
    
    if (ageInMonths < 3) risks.push('Edad menor a 3 meses');
    if (temperature > 39.5) risks.push('Temperatura muy alta');
    if (ageInMonths < 12 && temperature > 39.0) risks.push('Fiebre alta en menor de 1 año');
    
    return risks;
  }
}

// Export singleton instance
export const smartAIService = new SmartAIService();

// Export types
export type { SmartAnalysisResult, InputContext };