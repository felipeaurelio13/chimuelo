import { BabyProfile } from '../types/medical';

export class DataIntegrityService {
  private static instance: DataIntegrityService;
  
  // Single source of truth for baby profile
  private babyProfileKey = 'babyProfile';
  
  public static getInstance(): DataIntegrityService {
    if (!DataIntegrityService.instance) {
      DataIntegrityService.instance = new DataIntegrityService();
    }
    return DataIntegrityService.instance;
  }

  // Unified baby profile management
  getBabyProfile(): BabyProfile {
    try {
      const stored = localStorage.getItem(this.babyProfileKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('🔧 [DEBUG] Perfil cargado desde localStorage:', parsed?.name);
        
        // Validate that it has the required fields
        if (parsed && parsed.name && parsed.dateOfBirth) {
          // Ensure dateOfBirth is a proper Date object
          if (typeof parsed.dateOfBirth === 'string') {
            parsed.dateOfBirth = new Date(parsed.dateOfBirth);
          }
          return parsed;
        }
      }
    } catch (error) {
      console.error('🔧 [DEBUG] Error parsing stored profile:', error);
      // Clear corrupted data
      localStorage.removeItem(this.babyProfileKey);
    }
    
    console.log('🔧 [DEBUG] Using default profile');
    // Default profile - single definition
    const defaultProfile = {
      id: 'default',
      name: 'Maxi',
      dateOfBirth: new Date('2024-11-01'),
      gender: 'male' as const,
      currentWeight: 0,
      currentHeight: 0,
      bloodType: '',
      allergies: [],
      pediatrician: {
        name: '',
        phone: '',
        clinic: ''
      },
      lastUpdated: new Date(),
      confidence: 0
    };
    
    // Save the default profile
    this.setBabyProfile(defaultProfile);
    return defaultProfile;
  }

  setBabyProfile(profile: BabyProfile): void {
    const updatedProfile = {
      ...profile,
      lastUpdated: new Date()
    };
    localStorage.setItem(this.babyProfileKey, JSON.stringify(updatedProfile));
    
    // Notify components of profile change
    this.notifyProfileChange(updatedProfile);
  }

  // Update specific profile fields while maintaining integrity
  updateProfileField<K extends keyof BabyProfile>(
    field: K, 
    value: BabyProfile[K]
  ): void {
    const currentProfile = this.getBabyProfile();
    const updatedProfile = {
      ...currentProfile,
      [field]: value,
      lastUpdated: new Date()
    };
    this.setBabyProfile(updatedProfile);
  }

  // Calculate derived data consistently
  calculateAge(birthDate?: Date): string {
    if (!birthDate) {
      const profile = this.getBabyProfile();
      birthDate = profile.dateOfBirth;
    }
    
    if (!birthDate) return 'Edad no registrada';
    
    const birth = new Date(birthDate);
    const now = new Date();
    
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + 
                   (now.getMonth() - birth.getMonth());
    const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    
    if (months < 1) {
      return `${days} días`;
    } else if (months < 12) {
      const remainingDays = days % 30;
      return remainingDays > 0 ? `${months} meses ${remainingDays} días` : `${months} meses`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      return remainingMonths > 0 ? `${years} año${years > 1 ? 's' : ''} ${remainingMonths} meses` : `${years} año${years > 1 ? 's' : ''}`;
    }
  }

  // Consistent weight formatting
  formatWeight(weight?: number): string {
    if (!weight) return 'No registrado';
    return `${weight.toFixed(1)} kg`;
  }

  // Consistent height formatting
  formatHeight(height?: number): string {
    if (!height) return 'No registrado';
    return `${height} cm`;
  }

  // Ensure data consistency across components
  private notifyProfileChange(profile: BabyProfile): void {
    // Dispatch custom event for profile changes
    window.dispatchEvent(new CustomEvent('babyProfileUpdated', { 
      detail: profile 
    }));
  }

  // Validate data integrity
  validateProfile(profile: BabyProfile): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!profile.name.trim()) {
      errors.push('El nombre es requerido');
    }

    if (profile.dateOfBirth && profile.dateOfBirth > new Date()) {
      errors.push('La fecha de nacimiento no puede ser futura');
    }

    if (profile.currentWeight && (profile.currentWeight < 0 || profile.currentWeight > 50)) {
      errors.push('El peso debe estar entre 0 y 50 kg');
    }

    if (profile.currentHeight && (profile.currentHeight < 0 || profile.currentHeight > 200)) {
      errors.push('La altura debe estar entre 0 y 200 cm');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get consistent medical context for AI
  getMedicalContext(): string {
    const profile = this.getBabyProfile();
    return `
Información del bebé:
- Nombre: ${profile.name}
- Edad: ${this.calculateAge()}
- Género: ${profile.gender || 'No especificado'}
- Peso actual: ${this.formatWeight(profile.currentWeight)}
- Altura actual: ${this.formatHeight(profile.currentHeight)}
- Tipo de sangre: ${profile.bloodType || 'No registrado'}
- Alergias: ${profile.allergies.length > 0 ? profile.allergies.join(', ') : 'Ninguna conocida'}
- Pediatra: ${profile.pediatrician?.name || 'No asignado'}
    `.trim();
  }
}

// Export singleton instance
export const dataIntegrityService = DataIntegrityService.getInstance();