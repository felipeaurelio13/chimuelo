// Types for Maxi's Complete Medical File

export interface BabyProfile {
  id: string;
  name: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  bloodType?: string;
  allergies: string[];
  currentWeight?: number;
  currentHeight?: number;
  currentHeadCircumference?: number;
  
  // Birth information
  birthWeight?: number;
  birthHeight?: number;
  birthHeadCircumference?: number;
  gestationalAge?: number; // weeks
  birthComplications?: string[];
  
  // Current medical info
  pediatrician?: {
    name: string;
    phone: string;
    clinic: string;
  };
  
  // Auto-filled by AI
  lastUpdated: Date;
  confidence: number; // 0-1 for AI-detected updates
}

export interface MedicalMilestone {
  id: string;
  title: string;
  description: string;
  category: 'vaccination' | 'development' | 'medical_visit' | 'health_event' | 'growth' | 'other';
  date: Date;
  ageAtMilestone: string; // "2 months 3 days"
  
  // Details
  details: {
    notes?: string;
    measurements?: {
      weight?: number;
      height?: number;
      headCircumference?: number;
    };
    medications?: string[];
    reactions?: string[];
    nextAppointment?: Date;
    doctorNotes?: string;
    parentNotes?: string;
  };
  
  // AI Processing
  confidence: number;
  requiresAttention: boolean;
  tags: string[];
  relatedRecordIds: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  source: 'manual' | 'ai_detected' | 'imported';
}

export interface FutureMilestone {
  id: string;
  title: string;
  description: string;
  category: 'vaccination' | 'development' | 'medical_checkup' | 'preventive_care';
  expectedAge: string; // "4 months"
  expectedDate: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Status
  status: 'pending' | 'completed' | 'dismissed';
  completedDate?: Date;
  notes?: string;
  
  // AI Enhanced
  dynamicallyGenerated: boolean;
  source: 'standard_calendar' | 'ai_recommended' | 'doctor_recommended' | 'fallback';
  confidence: number;
  
  // Actions
  reminderSet: boolean;
  dismissed: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicalSummary {
  totalMilestones: number;
  upcomingMilestones: number;
  overdueItems: number;
  lastUpdate: Date;
  
  // Growth stats
  growthPercentiles: {
    weight: number;
    height: number;
    headCircumference: number;
  };
  
  // Recent patterns
  recentConcerns: string[];
  recentAchievements: string[];
  
  // AI insights
  aiInsights: string[];
  recommendedActions: string[];
}

export interface MedicalContextForAI {
  babyProfile: BabyProfile;
  recentMilestones: MedicalMilestone[];
  upcomingMilestones: FutureMilestone[];
  growthTrends: any[];
  parentalConcerns: string[];
  medicalHistory: {
    chronicConditions: string[];
    medications: string[];
    allergies: string[];
    familyHistory: string[];
  };
}