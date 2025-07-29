// Sistema robusto de manejo de errores para Chimuelo Health Tracker
// v2.2.0

export interface ErrorInfo {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'ai' | 'validation' | 'database' | 'ui' | 'unknown';
  retryable: boolean;
  timestamp: Date;
  context?: any;
}

export interface ErrorResponse {
  success: false;
  error: ErrorInfo;
  fallback?: any;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorInfo[] = [];
  private maxLogSize = 100;

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Errores de red
  static createNetworkError(error: any, context?: any): ErrorInfo {
    const message = error.message || 'Error de conexión';
    let userMessage = 'Error de conexión. Verifica tu internet.';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let retryable = true;

    if (message.includes('fetch')) {
      userMessage = 'No se pudo conectar con el servidor. Intenta de nuevo.';
      severity = 'high';
    } else if (message.includes('timeout')) {
      userMessage = 'La conexión tardó demasiado. Intenta de nuevo.';
      severity = 'medium';
    } else if (message.includes('429')) {
      userMessage = 'Demasiadas peticiones. Espera un momento antes de intentar de nuevo.';
      severity = 'medium';
      retryable = false;
    }

    return {
      code: 'NETWORK_ERROR',
      message,
      userMessage,
      severity,
      category: 'network',
      retryable,
      timestamp: new Date(),
      context
    };
  }

  // Errores de IA
  static createAIError(error: any, context?: any): ErrorInfo {
    const message = error.message || 'Error en el procesamiento de IA';
    let userMessage = 'Error en el análisis de IA. Intenta con un texto más claro.';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let retryable = true;

    if (message.includes('quota')) {
      userMessage = 'Límite de IA alcanzado. Intenta más tarde.';
      severity = 'medium';
      retryable = false;
    } else if (message.includes('invalid')) {
      userMessage = 'El texto no se pudo procesar. Intenta con información más específica.';
      severity = 'low';
      retryable = true;
    } else if (message.includes('timeout')) {
      userMessage = 'El análisis tardó demasiado. Intenta de nuevo.';
      severity = 'medium';
      retryable = true;
    }

    return {
      code: 'AI_ERROR',
      message,
      userMessage,
      severity,
      category: 'ai',
      retryable,
      timestamp: new Date(),
      context
    };
  }

  // Errores de validación
  static createValidationError(field: string, value: any, context?: any): ErrorInfo {
    const message = `Error de validación en ${field}: ${value}`;
    let userMessage = 'Los datos ingresados no son válidos.';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let retryable = true;

    if (field === 'weight' && (value < 0.5 || value > 50)) {
      userMessage = 'El peso ingresado está fuera del rango normal para bebés.';
      severity = 'medium';
    } else if (field === 'temperature' && (value < 35 || value > 42)) {
      userMessage = 'La temperatura ingresada está fuera del rango normal.';
      severity = 'high';
    } else if (field === 'height' && (value < 30 || value > 150)) {
      userMessage = 'La altura ingresada está fuera del rango normal para bebés.';
      severity = 'medium';
    }

    return {
      code: 'VALIDATION_ERROR',
      message,
      userMessage,
      severity,
      category: 'validation',
      retryable: true,
      timestamp: new Date(),
      context: { field, value, ...context }
    };
  }

  // Errores de base de datos
  static createDatabaseError(error: any, context?: any): ErrorInfo {
    const message = error.message || 'Error de base de datos';
    let userMessage = 'Error al guardar los datos. Intenta de nuevo.';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'high';
    let retryable = true;

    if (message.includes('quota')) {
      userMessage = 'Espacio de almacenamiento lleno. Libera espacio e intenta de nuevo.';
      severity = 'high';
      retryable = false;
    } else if (message.includes('permission')) {
      userMessage = 'No tienes permisos para guardar datos.';
      severity = 'critical';
      retryable = false;
    }

    return {
      code: 'DATABASE_ERROR',
      message,
      userMessage,
      severity,
      category: 'database',
      retryable,
      timestamp: new Date(),
      context
    };
  }

  // Errores de UI
  static createUIError(error: any, context?: any): ErrorInfo {
    const message = error.message || 'Error de interfaz';
    let userMessage = 'Error en la interfaz. Recarga la página.';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let retryable = true;

    if (message.includes('render')) {
      userMessage = 'Error al mostrar los datos. Intenta de nuevo.';
      severity = 'medium';
    } else if (message.includes('state')) {
      userMessage = 'Error interno. Recarga la página.';
      severity = 'high';
    }

    return {
      code: 'UI_ERROR',
      message,
      userMessage,
      severity,
      category: 'ui',
      retryable: true,
      timestamp: new Date(),
      context
    };
  }

  // Errores desconocidos
  static createUnknownError(error: any, context?: any): ErrorInfo {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Error desconocido',
      userMessage: 'Ocurrió un error inesperado. Intenta de nuevo.',
      severity: 'medium',
      category: 'unknown',
      retryable: true,
      timestamp: new Date(),
      context
    };
  }

  // Manejar error genérico
  static handleError(error: any, context?: any): ErrorInfo {
    const message = error.message || 'Error desconocido';
    
    if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      return this.createNetworkError(error, context);
    } else if (message.includes('AI') || message.includes('OpenAI') || message.includes('quota')) {
      return this.createAIError(error, context);
    } else if (message.includes('validation') || message.includes('invalid')) {
      return this.createValidationError('unknown', error, context);
    } else if (message.includes('database') || message.includes('storage')) {
      return this.createDatabaseError(error, context);
    } else if (message.includes('render') || message.includes('state')) {
      return this.createUIError(error, context);
    } else {
      return this.createUnknownError(error, context);
    }
  }

  // Log de errores
  logError(errorInfo: ErrorInfo): void {
    this.errorLog.push(errorInfo);
    
    // Mantener solo los últimos errores
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Log en consola en desarrollo
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.error('Error logged:', errorInfo);
    }
  }

  // Obtener errores recientes
  getRecentErrors(limit: number = 10): ErrorInfo[] {
    return this.errorLog.slice(-limit);
  }

  // Limpiar log de errores
  clearErrorLog(): void {
    this.errorLog = [];
  }

  // Verificar si hay errores críticos recientes
  hasCriticalErrors(minutes: number = 5): boolean {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.errorLog.some(error => 
      error.severity === 'critical' && error.timestamp > cutoff
    );
  }

  // Obtener estadísticas de errores
  getErrorStats(): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    recentErrors: number;
  } {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // Última hora

    this.errorLog.forEach(error => {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });

    const recentErrors = this.errorLog.filter(error => error.timestamp > cutoff).length;

    return {
      total: this.errorLog.length,
      byCategory,
      bySeverity,
      recentErrors
    };
  }
}

// Función helper para manejar errores de forma consistente
export function handleErrorWithFallback<T>(
  operation: () => Promise<T>,
  fallback: T,
  context?: any
): Promise<{ success: boolean; data?: T; error?: ErrorInfo; fallback?: T }> {
  return operation()
    .then(result => ({
      success: true,
      data: result
    }))
    .catch(error => {
      const errorInfo = ErrorHandler.handleError(error, context);
      ErrorHandler.getInstance().logError(errorInfo);
      
      return {
        success: false,
        error: errorInfo,
        fallback
      };
    });
}

// Función helper para mostrar errores al usuario
export function showUserFriendlyError(errorInfo: ErrorInfo): void {
  // En una aplicación real, esto mostraría un toast o modal
  console.warn('User-friendly error:', errorInfo.userMessage);
  
  // Aquí podrías integrar con un sistema de notificaciones
  // showNotification(errorInfo.userMessage, errorInfo.severity);
}

// Función helper para determinar si se debe reintentar
export function shouldRetry(errorInfo: ErrorInfo, attemptCount: number): boolean {
  if (!errorInfo.retryable) return false;
  if (attemptCount >= 3) return false;
  if (errorInfo.severity === 'critical') return false;
  
  return true;
}

export default ErrorHandler;