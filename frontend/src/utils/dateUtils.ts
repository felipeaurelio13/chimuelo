/**
 * Utility functions for date calculations and formatting
 */

export interface AgeBreakdown {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
}

/**
 * Calculate the age between two dates with detailed breakdown
 */
export function calculateAge(birthDate: Date, currentDate: Date = new Date()): string {
  const birth = new Date(birthDate);
  const current = new Date(currentDate);
  
  if (birth > current) {
    return 'Fecha futura';
  }

  let years = current.getFullYear() - birth.getFullYear();
  let months = current.getMonth() - birth.getMonth();
  let days = current.getDate() - birth.getDate();

  // Adjust for negative days
  if (days < 0) {
    months--;
    const lastDayOfPreviousMonth = new Date(current.getFullYear(), current.getMonth(), 0).getDate();
    days += lastDayOfPreviousMonth;
  }

  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
  }

  // For babies under 1 year, be more specific
  if (years === 0) {
    if (months === 0) {
      if (days === 0) {
        return 'Recién nacido';
      } else if (days === 1) {
        return '1 día';
      } else if (days < 7) {
        return `${days} días`;
      } else {
        const weeks = Math.floor(days / 7);
        const remainingDays = days % 7;
        if (weeks === 1) {
          return remainingDays === 0 ? '1 semana' : `1 semana ${remainingDays} día${remainingDays > 1 ? 's' : ''}`;
        } else {
          return remainingDays === 0 ? `${weeks} semanas` : `${weeks} semanas ${remainingDays} día${remainingDays > 1 ? 's' : ''}`;
        }
      }
    } else if (months === 1) {
      return days === 0 ? '1 mes' : `1 mes ${days} día${days > 1 ? 's' : ''}`;
    } else {
      return days === 0 ? `${months} meses` : `${months} meses ${days} día${days > 1 ? 's' : ''}`;
    }
  } else if (years === 1) {
    if (months === 0) {
      return days === 0 ? '1 año' : `1 año ${days} día${days > 1 ? 's' : ''}`;
    } else if (months === 1) {
      return days === 0 ? '1 año 1 mes' : `1 año 1 mes ${days} día${days > 1 ? 's' : ''}`;
    } else {
      return days === 0 ? `1 año ${months} meses` : `1 año ${months} meses ${days} día${days > 1 ? 's' : ''}`;
    }
  } else {
    if (months === 0 && days === 0) {
      return `${years} años`;
    } else if (months === 0) {
      return `${years} años ${days} día${days > 1 ? 's' : ''}`;
    } else if (days === 0) {
      return `${years} años ${months} mes${months > 1 ? 'es' : ''}`;
    } else {
      return `${years} años ${months} mes${months > 1 ? 'es' : ''} ${days} día${days > 1 ? 's' : ''}`;
    }
  }
}

/**
 * Get detailed age breakdown
 */
export function getAgeBreakdown(birthDate: Date, currentDate: Date = new Date()): AgeBreakdown {
  const birth = new Date(birthDate);
  const current = new Date(currentDate);
  
  const totalDays = Math.floor((current.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.floor(totalDays / 7);

  let years = current.getFullYear() - birth.getFullYear();
  let months = current.getMonth() - birth.getMonth();
  let days = current.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    const lastDayOfPreviousMonth = new Date(current.getFullYear(), current.getMonth(), 0).getDate();
    days += lastDayOfPreviousMonth;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return {
    years,
    months,
    days,
    totalDays,
    totalWeeks
  };
}

/**
 * Format age for display purposes
 */
export function formatAge(ageString: string): string {
  return ageString;
}

/**
 * Calculate expected date for milestone based on age
 */
export function calculateMilestoneDate(birthDate: Date, ageInMonths: number): Date {
  const birth = new Date(birthDate);
  return new Date(birth.getFullYear(), birth.getMonth() + ageInMonths, birth.getDate());
}

/**
 * Get age in months (decimal)
 */
export function getAgeInMonths(birthDate: Date, currentDate: Date = new Date()): number {
  const birth = new Date(birthDate);
  const current = new Date(currentDate);
  
  const years = current.getFullYear() - birth.getFullYear();
  const months = current.getMonth() - birth.getMonth();
  const days = current.getDate() - birth.getDate();
  
  let totalMonths = years * 12 + months;
  
  // Add fraction for days
  if (days >= 0) {
    const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
    totalMonths += days / daysInMonth;
  } else {
    totalMonths -= 1;
    const daysInPrevMonth = new Date(current.getFullYear(), current.getMonth(), 0).getDate();
    totalMonths += (daysInPrevMonth + days) / daysInPrevMonth;
  }
  
  return totalMonths;
}

/**
 * Get age in weeks
 */
export function getAgeInWeeks(birthDate: Date, currentDate: Date = new Date()): number {
  const birth = new Date(birthDate);
  const current = new Date(currentDate);
  
  const diffTime = current.getTime() - birth.getTime();
  const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
  
  return Math.floor(diffWeeks);
}

/**
 * Format date for medical records
 */
export function formatMedicalDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Check if a milestone is overdue
 */
export function isMilestoneOverdue(expectedDate: Date, currentDate: Date = new Date()): boolean {
  return expectedDate < currentDate;
}

/**
 * Get days until/since milestone
 */
export function getDaysUntilMilestone(expectedDate: Date, currentDate: Date = new Date()): number {
  const diffTime = expectedDate.getTime() - currentDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format relative time for milestones
 */
export function formatMilestoneTime(expectedDate: Date, currentDate: Date = new Date()): string {
  const days = getDaysUntilMilestone(expectedDate, currentDate);
  
  if (days === 0) {
    return 'Hoy';
  } else if (days === 1) {
    return 'Mañana';
  } else if (days === -1) {
    return 'Ayer';
  } else if (days > 0) {
    if (days < 7) {
      return `En ${days} días`;
    } else if (days < 30) {
      const weeks = Math.floor(days / 7);
      return `En ${weeks} semana${weeks > 1 ? 's' : ''}`;
    } else {
      const months = Math.floor(days / 30);
      return `En ${months} mes${months > 1 ? 'es' : ''}`;
    }
  } else {
    const absDays = Math.abs(days);
    if (absDays < 7) {
      return `Hace ${absDays} días`;
    } else if (absDays < 30) {
      const weeks = Math.floor(absDays / 7);
      return `Hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
    } else {
      const months = Math.floor(absDays / 30);
      return `Hace ${months} mes${months > 1 ? 'es' : ''}`;
    }
  }
}

// Utilidades para manejo de fechas en horario chileno
// Chile está en UTC-4 (horario estándar) o UTC-3 (horario de verano)

/**
 * Obtiene la fecha y hora actual en horario chileno
 */
export function getChileDateTime(): Date {
  // Crear fecha con timezone de Chile
  const now = new Date();
  const chileTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Santiago"}));
  return chileTime;
}

/**
 * Convierte una fecha a horario chileno
 */
export function toChileTime(date: Date): Date {
  const chileTime = new Date(date.toLocaleString("en-US", {timeZone: "America/Santiago"}));
  return chileTime;
}

/**
 * Formatea una fecha en horario chileno
 */
export function formatChileDate(date: Date): string {
  return date.toLocaleDateString('es-CL', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Formatea fecha y hora en horario chileno
 */
export function formatChileDateTime(date: Date): string {
  return date.toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Obtiene un timestamp ISO string en horario chileno
 */
export function getChileISOString(): string {
  const chileTime = getChileDateTime();
  return chileTime.toISOString();
}

/**
 * Parsea una fecha asegurando que esté en contexto chileno
 */
export function parseChileDate(dateString: string): Date {
  const parsed = new Date(dateString);
  // Si la fecha no tiene timezone, asumimos que es chilena
  if (!dateString.includes('T') && !dateString.includes('Z')) {
    return new Date(dateString + 'T00:00:00-03:00'); // Asumimos UTC-3
  }
  return parsed;
}

/**
 * Calcula la edad en días desde una fecha de nacimiento
 */
export function calculateAgeInDays(birthDate: Date): number {
  const now = getChileDateTime();
  const birth = toChileTime(birthDate);
  const diffTime = Math.abs(now.getTime() - birth.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Calcula la edad en semanas desde una fecha de nacimiento
 */
export function calculateAgeInWeeks(birthDate: Date): number {
  const days = calculateAgeInDays(birthDate);
  return Math.floor(days / 7);
}

/**
 * Calcula la edad en meses desde una fecha de nacimiento
 */
export function calculateAgeInMonths(birthDate: Date): number {
  const now = getChileDateTime();
  const birth = toChileTime(birthDate);
  
  let months = (now.getFullYear() - birth.getFullYear()) * 12;
  months += now.getMonth() - birth.getMonth();
  
  // Ajustar si el día actual es anterior al día de nacimiento
  if (now.getDate() < birth.getDate()) {
    months--;
  }
  
  return Math.max(0, months);
}

/**
 * Formato amigable de edad para bebés
 */
export function formatBabyAge(birthDate: Date): string {
  const days = calculateAgeInDays(birthDate);
  const weeks = calculateAgeInWeeks(birthDate);
  const months = calculateAgeInMonths(birthDate);
  
  if (days < 14) {
    return `${days} día${days !== 1 ? 's' : ''}`;
  } else if (weeks < 8) {
    return `${weeks} semana${weeks !== 1 ? 's' : ''}`;
  } else {
    const remainingWeeks = weeks % 4;
    if (months < 12) {
      if (remainingWeeks === 0) {
        return `${months} mes${months !== 1 ? 'es' : ''}`;
      } else {
        return `${months} mes${months !== 1 ? 'es' : ''} y ${remainingWeeks} semana${remainingWeeks !== 1 ? 's' : ''}`;
      }
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      if (remainingMonths === 0) {
        return `${years} año${years !== 1 ? 's' : ''}`;
      } else {
        return `${years} año${years !== 1 ? 's' : ''} y ${remainingMonths} mes${remainingMonths !== 1 ? 'es' : ''}`;
      }
    }
  }
}