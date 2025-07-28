// Servicio de Datos Históricos - NUNCA sobreescribe, siempre añade con timestamp
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { HistoricalRecord } from './multiAgentSystem';

interface HistoricalDataDB extends DBSchema {
  weight_history: {
    key: string;
    value: WeightRecord;
    indexes: { 'by-date': Date; 'by-user': string; };
  };
  height_history: {
    key: string;
    value: HeightRecord;
    indexes: { 'by-date': Date; 'by-user': string; };
  };
  medical_visits: {
    key: string;
    value: MedicalVisitRecord;
    indexes: { 'by-date': Date; 'by-user': string; 'by-type': string; };
  };
  milestones: {
    key: string;
    value: MilestoneRecord;
    indexes: { 'by-date': Date; 'by-user': string; 'by-category': string; };
  };
  medications: {
    key: string;
    value: MedicationRecord;
    indexes: { 'by-date': Date; 'by-user': string; 'by-type': string; };
  };
  vaccinations: {
    key: string;
    value: VaccinationRecord;
    indexes: { 'by-date': Date; 'by-user': string; 'by-vaccine': string; };
  };
  administrative: {
    key: string;
    value: AdministrativeRecord;
    indexes: { 'by-date': Date; 'by-user': string; 'by-type': string; };
  };
  symptoms: {
    key: string;
    value: SymptomRecord;
    indexes: { 'by-date': Date; 'by-user': string; 'by-severity': string; };
  };
  growth_charts: {
    key: string;
    value: GrowthChartRecord;
    indexes: { 'by-date': Date; 'by-user': string; 'by-metric': string; };
  };
}

// Interfaces específicas para cada tipo de registro histórico
export interface WeightRecord {
  id: string;
  userId: string;
  weight: number; // en kg
  unit: 'kg' | 'g';
  date: Date;
  context: string; // "control pediátrico", "casa", "hospital", etc.
  source: string; // agente que lo registró
  confidence: number;
  percentile?: number;
  isEstimated: boolean;
  metadata: {
    measurementMethod?: string;
    clothingType?: string;
    timeOfDay?: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface HeightRecord {
  id: string;
  userId: string;
  height: number; // en cm
  unit: 'cm' | 'm';
  date: Date;
  context: string;
  source: string;
  confidence: number;
  percentile?: number;
  isEstimated: boolean;
  metadata: {
    measurementMethod?: string;
    position?: 'lying' | 'standing';
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicalVisitRecord {
  id: string;
  userId: string;
  date: Date;
  visitType: 'routine_checkup' | 'illness' | 'vaccination' | 'emergency' | 'specialist';
  provider: {
    name?: string;
    specialty?: string;
    clinic?: string;
    location?: string;
  };
  diagnosis: string[];
  symptoms: string[];
  treatments: string[];
  prescriptions: any[];
  followUp: {
    required: boolean;
    date?: Date;
    instructions?: string;
  };
  cost?: {
    total?: number;
    currency?: string;
    covered?: number;
    outOfPocket?: number;
  };
  source: string;
  confidence: number;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface MilestoneRecord {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: Date;
  category: 'motor' | 'cognitive' | 'social' | 'language' | 'physical' | 'medical';
  significance: 'low' | 'medium' | 'high' | 'critical';
  ageAtMilestone: {
    months: number;
    weeks: number;
    days: number;
  };
  isTypical: boolean;
  source: string;
  confidence: number;
  metadata: {
    location?: string;
    witnesses?: string[];
    photos?: string[];
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicationRecord {
  id: string;
  userId: string;
  medicationName: string;
  activeIngredient?: string;
  dose: string;
  frequency: string;
  duration?: string;
  startDate: Date;
  endDate?: Date;
  prescribedBy?: string;
  indication: string;
  sideEffects?: string[];
  effectiveness?: 'poor' | 'fair' | 'good' | 'excellent';
  source: string;
  confidence: number;
  metadata: {
    brand?: string;
    generic?: string;
    form?: 'liquid' | 'tablet' | 'capsule' | 'topical' | 'injection';
    administrationMethod?: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface VaccinationRecord {
  id: string;
  userId: string;
  vaccineName: string;
  vaccineType: string;
  dose: number; // primera dosis, segunda, etc.
  date: Date;
  ageAtVaccination: {
    months: number;
    weeks: number;
    days: number;
  };
  administeredBy?: string;
  location?: string;
  lotNumber?: string;
  manufacturer?: string;
  reactions?: {
    immediate?: string[];
    delayed?: string[];
    severity?: 'mild' | 'moderate' | 'severe';
  };
  nextDue?: Date;
  source: string;
  confidence: number;
  metadata: {
    clinic?: string;
    batchInfo?: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AdministrativeRecord {
  id: string;
  userId: string;
  documentType: 'medical_bill' | 'insurance_claim' | 'prescription' | 'lab_result' | 'referral';
  date: Date;
  provider?: string;
  service?: string;
  cost?: {
    total: number;
    currency: string;
    covered?: number;
    outOfPocket?: number;
  };
  insurance?: {
    provider?: string;
    policyNumber?: string;
    claimNumber?: string;
  };
  documentDetails: any;
  source: string;
  confidence: number;
  metadata: {
    documentPath?: string;
    extractedText?: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SymptomRecord {
  id: string;
  userId: string;
  symptom: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  startDate: Date;
  endDate?: Date;
  duration?: string;
  triggers?: string[];
  relatedSymptoms?: string[];
  treatment?: string[];
  resolved: boolean;
  source: string;
  confidence: number;
  metadata: {
    timeOfDay?: string;
    frequency?: string;
    impact?: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface GrowthChartRecord {
  id: string;
  userId: string;
  date: Date;
  metric: 'weight' | 'height' | 'head_circumference' | 'bmi';
  value: number;
  percentile: number;
  zScore?: number;
  referenceStandard: 'WHO' | 'CDC' | 'local';
  ageAtMeasurement: {
    months: number;
    weeks: number;
    days: number;
  };
  source: string;
  confidence: number;
  metadata: {
    chartType?: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Clase principal del servicio de datos históricos
export class HistoricalDataService {
  private static instance: HistoricalDataService;
  private db: IDBPDatabase<HistoricalDataDB> | null = null;
  private readonly DB_NAME = 'ChimueloHistoricalData';
  private readonly DB_VERSION = 1;

  private constructor() {}

  public static getInstance(): HistoricalDataService {
    if (!HistoricalDataService.instance) {
      HistoricalDataService.instance = new HistoricalDataService();
    }
    return HistoricalDataService.instance;
  }

  async initialize(): Promise<void> {
    this.db = await openDB<HistoricalDataDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Weight History
        const weightStore = db.createObjectStore('weight_history', { keyPath: 'id' });
        weightStore.createIndex('by-date', 'date');
        weightStore.createIndex('by-user', 'userId');

        // Height History
        const heightStore = db.createObjectStore('height_history', { keyPath: 'id' });
        heightStore.createIndex('by-date', 'date');
        heightStore.createIndex('by-user', 'userId');

        // Medical Visits
        const visitsStore = db.createObjectStore('medical_visits', { keyPath: 'id' });
        visitsStore.createIndex('by-date', 'date');
        visitsStore.createIndex('by-user', 'userId');
        visitsStore.createIndex('by-type', 'visitType');

        // Milestones
        const milestonesStore = db.createObjectStore('milestones', { keyPath: 'id' });
        milestonesStore.createIndex('by-date', 'date');
        milestonesStore.createIndex('by-user', 'userId');
        milestonesStore.createIndex('by-category', 'category');

        // Medications
        const medicationsStore = db.createObjectStore('medications', { keyPath: 'id' });
        medicationsStore.createIndex('by-date', 'startDate');
        medicationsStore.createIndex('by-user', 'userId');
        medicationsStore.createIndex('by-type', 'medicationName');

        // Vaccinations
        const vaccinationsStore = db.createObjectStore('vaccinations', { keyPath: 'id' });
        vaccinationsStore.createIndex('by-date', 'date');
        vaccinationsStore.createIndex('by-user', 'userId');
        vaccinationsStore.createIndex('by-vaccine', 'vaccineName');

        // Administrative
        const adminStore = db.createObjectStore('administrative', { keyPath: 'id' });
        adminStore.createIndex('by-date', 'date');
        adminStore.createIndex('by-user', 'userId');
        adminStore.createIndex('by-type', 'documentType');

        // Symptoms
        const symptomsStore = db.createObjectStore('symptoms', { keyPath: 'id' });
        symptomsStore.createIndex('by-date', 'startDate');
        symptomsStore.createIndex('by-user', 'userId');
        symptomsStore.createIndex('by-severity', 'severity');

        // Growth Charts
        const growthStore = db.createObjectStore('growth_charts', { keyPath: 'id' });
        growthStore.createIndex('by-date', 'date');
        growthStore.createIndex('by-user', 'userId');
        growthStore.createIndex('by-metric', 'metric');
      }
    });
  }

  // Método principal para guardar cualquier registro histórico
  async saveHistoricalRecord(record: HistoricalRecord): Promise<void> {
    if (!this.db) await this.initialize();

    switch (record.type) {
      case 'weight':
        await this.saveWeightRecord(record);
        break;
      case 'height':
        await this.saveHeightRecord(record);
        break;
      case 'medical_visit':
        await this.saveMedicalVisitRecord(record);
        break;
      case 'milestone':
        await this.saveMilestoneRecord(record);
        break;
      case 'medication':
        await this.saveMedicationRecord(record);
        break;
      case 'vaccination':
        await this.saveVaccinationRecord(record);
        break;
      case 'administrative':
        await this.saveAdministrativeRecord(record);
        break;
      default:
        console.warn('Unknown record type:', record.type);
    }
  }

  // Métodos específicos para cada tipo de registro
  async saveWeightRecord(record: HistoricalRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const weightRecord: WeightRecord = {
      id: record.id,
      userId: this.getCurrentUserId(),
      weight: record.value as number,
      unit: 'kg',
      date: record.date,
      context: record.metadata?.context || 'manual_entry',
      source: record.source,
      confidence: record.confidence,
      isEstimated: record.metadata?.isEstimated || false,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };

    await this.db.add('weight_history', weightRecord);
  }

  async saveHeightRecord(record: HistoricalRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const heightRecord: HeightRecord = {
      id: record.id,
      userId: this.getCurrentUserId(),
      height: record.value as number,
      unit: 'cm',
      date: record.date,
      context: record.metadata?.context || 'manual_entry',
      source: record.source,
      confidence: record.confidence,
      isEstimated: record.metadata?.isEstimated || false,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };

    await this.db.add('height_history', heightRecord);
  }

  async saveMilestoneRecord(record: HistoricalRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const milestoneRecord: MilestoneRecord = {
      id: record.id,
      userId: this.getCurrentUserId(),
      title: record.value.title || 'Hito registrado',
      description: record.value.description || '',
      date: record.date,
      category: record.value.category || 'physical',
      significance: record.value.significance || 'medium',
      ageAtMilestone: this.calculateAgeAtDate(record.date),
      isTypical: record.value.isTypical !== false,
      source: record.source,
      confidence: record.confidence,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };

    await this.db.add('milestones', milestoneRecord);
  }

  async saveMedicationRecord(record: HistoricalRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const medicationRecord: MedicationRecord = {
      id: record.id,
      userId: this.getCurrentUserId(),
      medicationName: record.value.name || 'Medicamento',
      dose: record.value.dose || '',
      frequency: record.value.frequency || '',
      startDate: record.date,
      indication: record.value.indication || '',
      source: record.source,
      confidence: record.confidence,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };

    await this.db.add('medications', medicationRecord);
  }

  async saveVaccinationRecord(record: HistoricalRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const vaccinationRecord: VaccinationRecord = {
      id: record.id,
      userId: this.getCurrentUserId(),
      vaccineName: record.value.name || 'Vacuna',
      vaccineType: record.value.type || '',
      dose: record.value.dose || 1,
      date: record.date,
      ageAtVaccination: this.calculateAgeAtDate(record.date),
      source: record.source,
      confidence: record.confidence,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };

    await this.db.add('vaccinations', vaccinationRecord);
  }

  async saveMedicalVisitRecord(record: HistoricalRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const visitRecord: MedicalVisitRecord = {
      id: record.id,
      userId: this.getCurrentUserId(),
      date: record.date,
      visitType: record.value.visitType || 'routine_checkup',
      provider: record.value.provider || {},
      diagnosis: record.value.diagnosis || [],
      symptoms: record.value.symptoms || [],
      treatments: record.value.treatments || [],
      prescriptions: record.value.prescriptions || [],
      followUp: record.value.followUp || { required: false },
      source: record.source,
      confidence: record.confidence,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };

    await this.db.add('medical_visits', visitRecord);
  }

  async saveAdministrativeRecord(record: HistoricalRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const adminRecord: AdministrativeRecord = {
      id: record.id,
      userId: this.getCurrentUserId(),
      documentType: record.value.documentType || 'medical_bill',
      date: record.date,
      provider: record.value.provider,
      service: record.value.service,
      cost: record.value.cost,
      insurance: record.value.insurance,
      documentDetails: record.value,
      source: record.source,
      confidence: record.confidence,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };

    await this.db.add('administrative', adminRecord);
  }

  // Métodos de consulta histórica
  async getWeightHistory(userId?: string, startDate?: Date, endDate?: Date): Promise<WeightRecord[]> {
    if (!this.db) await this.initialize();
    
    const userIdToUse = userId || this.getCurrentUserId();
    let records = await this.db!.getAllFromIndex('weight_history', 'by-user', userIdToUse);
    
    if (startDate || endDate) {
      records = records.filter(record => {
        const recordDate = new Date(record.date);
        if (startDate && recordDate < startDate) return false;
        if (endDate && recordDate > endDate) return false;
        return true;
      });
    }
    
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getHeightHistory(userId?: string, startDate?: Date, endDate?: Date): Promise<HeightRecord[]> {
    if (!this.db) await this.initialize();
    
    const userIdToUse = userId || this.getCurrentUserId();
    let records = await this.db!.getAllFromIndex('height_history', 'by-user', userIdToUse);
    
    if (startDate || endDate) {
      records = records.filter(record => {
        const recordDate = new Date(record.date);
        if (startDate && recordDate < startDate) return false;
        if (endDate && recordDate > endDate) return false;
        return true;
      });
    }
    
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Método para consultas tipo "¿cuánto pesaba hace 2 meses?"
  async getWeightAtDate(targetDate: Date, userId?: string): Promise<WeightRecord | null> {
    const history = await this.getWeightHistory(userId);
    
    // Buscar la medición más cercana a la fecha objetivo
    let closestRecord: WeightRecord | null = null;
    let minDifference = Infinity;
    
    for (const record of history) {
      const recordDate = new Date(record.date);
      const difference = Math.abs(targetDate.getTime() - recordDate.getTime());
      
      if (difference < minDifference) {
        minDifference = difference;
        closestRecord = record;
      }
    }
    
    return closestRecord;
  }

  async getHeightAtDate(targetDate: Date, userId?: string): Promise<HeightRecord | null> {
    const history = await this.getHeightHistory(userId);
    
    let closestRecord: HeightRecord | null = null;
    let minDifference = Infinity;
    
    for (const record of history) {
      const recordDate = new Date(record.date);
      const difference = Math.abs(targetDate.getTime() - recordDate.getTime());
      
      if (difference < minDifference) {
        minDifference = difference;
        closestRecord = record;
      }
    }
    
    return closestRecord;
  }

  // Método para obtener tendencias de crecimiento
  async getGrowthTrends(userId?: string, months: number = 6): Promise<{
    weightTrend: { date: Date; value: number; }[];
    heightTrend: { date: Date; value: number; }[];
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);
    
    const weightHistory = await this.getWeightHistory(userId, startDate, endDate);
    const heightHistory = await this.getHeightHistory(userId, startDate, endDate);
    
    return {
      weightTrend: weightHistory.map(record => ({
        date: new Date(record.date),
        value: record.weight
      })),
      heightTrend: heightHistory.map(record => ({
        date: new Date(record.date),
        value: record.height
      }))
    };
  }

  // Métodos utilitarios
  private getCurrentUserId(): string {
    // Obtener del contexto de autenticación
    return 'current_user'; // Placeholder
  }

  private calculateAgeAtDate(date: Date): { months: number; weeks: number; days: number } {
    // Calcular edad en la fecha específica
    const birthDate = new Date('2024-01-01'); // Placeholder - obtener fecha real de nacimiento
    const diffTime = date.getTime() - birthDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      months: Math.floor(diffDays / 30.44),
      weeks: Math.floor(diffDays / 7),
      days: diffDays
    };
  }

  // Método para limpiar datos antiguos (opcional)
  async cleanOldData(olderThanYears: number = 5): Promise<void> {
    if (!this.db) await this.initialize();
    
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - olderThanYears);
    
    // Implementar limpieza si es necesario
    console.log(`Cleaning data older than ${cutoffDate}`);
  }

  // Método para exportar datos históricos
  async exportHistoricalData(userId?: string): Promise<any> {
    const userIdToUse = userId || this.getCurrentUserId();
    
    return {
      weightHistory: await this.getWeightHistory(userIdToUse),
      heightHistory: await this.getHeightHistory(userIdToUse),
      // Agregar otros tipos de datos según sea necesario
      exportDate: new Date(),
      userId: userIdToUse
    };
  }
}

// Export del singleton
export const historicalDataService = HistoricalDataService.getInstance();