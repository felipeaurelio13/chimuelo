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