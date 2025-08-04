export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  error?: Error;
  stack?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByLevel: Record<LogLevel, number>;
  errorsByComponent: Record<string, number>;
  errorRate: number;
  lastError: LogEntry | null;
}

export class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private currentLogLevel: LogLevel = LogLevel.INFO;
  private sessionId: string;
  private userId?: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandlers(): void {
    // Capture unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.error('Unhandled JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        url: window.location.href
      }, event.error);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack,
        url: window.location.href
      }, event.reason);
    });

    // Capture network errors from fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.warn('HTTP Error', {
            url: args[0]?.toString(),
            status: response.status,
            statusText: response.statusText,
            method: args[1]?.method || 'GET'
          });
        }
        return response;
      } catch (error) {
        this.error('Network Error', {
          url: args[0]?.toString(),
          method: args[1]?.method || 'GET',
          error: (error as Error).message
        }, error as Error);
        throw error;
      }
    };
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  debug(message: string, context?: Record<string, any>, component?: string): void {
    this.log(LogLevel.DEBUG, message, context, undefined, component);
  }

  info(message: string, context?: Record<string, any>, component?: string): void {
    this.log(LogLevel.INFO, message, context, undefined, component);
  }

  warn(message: string, context?: Record<string, any>, component?: string): void {
    this.log(LogLevel.WARN, message, context, undefined, component);
  }

  error(message: string, context?: Record<string, any>, error?: Error, component?: string): void {
    this.log(LogLevel.ERROR, message, context, error, component);
  }

  critical(message: string, context?: Record<string, any>, error?: Error, component?: string): void {
    this.log(LogLevel.CRITICAL, message, context, error, component);
    // For critical errors, also send to external service immediately
    this.sendCriticalErrorToService({
      message,
      context,
      error: error?.message,
      stack: error?.stack,
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      url: window.location.href
    });
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error,
    component?: string,
    action?: string
  ): void {
    if (level < this.currentLogLevel) {
      return; // Skip logs below current level
    }

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      error,
      stack: error?.stack,
      userId: this.userId,
      sessionId: this.sessionId,
      component,
      action
    };

    this.logs.push(logEntry);

    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with formatting
    this.outputToConsole(logEntry);

    // Store critical errors in localStorage for persistence
    if (level >= LogLevel.ERROR) {
      this.persistErrorLog(logEntry);
    }

    // Batch send logs to service
    this.queueForUpload(logEntry);
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${LogLevel[entry.level]}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.context);
        break;
      case LogLevel.INFO:
        console.info(message, entry.context);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.context);
        break;
      case LogLevel.ERROR:
        console.error(message, entry.context, entry.error);
        break;
      case LogLevel.CRITICAL:
        console.error(`🚨 CRITICAL: ${message}`, entry.context, entry.error);
        break;
    }
  }

  private persistErrorLog(entry: LogEntry): void {
    try {
      const persistedErrors = JSON.parse(localStorage.getItem('chimuelo_error_logs') || '[]');
      persistedErrors.push({
        ...entry,
        error: entry.error ? {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack
        } : undefined
      });

      // Keep only last 50 error logs
      if (persistedErrors.length > 50) {
        persistedErrors.splice(0, persistedErrors.length - 50);
      }

      localStorage.setItem('chimuelo_error_logs', JSON.stringify(persistedErrors));
    } catch (error) {
      console.warn('Failed to persist error log:', error);
    }
  }

  private uploadQueue: LogEntry[] = [];
  private uploadTimer?: number;

  private queueForUpload(entry: LogEntry): void {
    this.uploadQueue.push(entry);

    // Immediate upload for critical errors
    if (entry.level === LogLevel.CRITICAL) {
      this.flushLogs();
      return;
    }

    // Batch upload every 30 seconds or when queue reaches 20 entries
    if (this.uploadQueue.length >= 20) {
      this.flushLogs();
    } else if (!this.uploadTimer) {
      this.uploadTimer = window.setTimeout(() => {
        this.flushLogs();
      }, 30000);
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.uploadQueue.length === 0) return;

    const logsToUpload = [...this.uploadQueue];
    this.uploadQueue = [];

    if (this.uploadTimer) {
      clearTimeout(this.uploadTimer);
      this.uploadTimer = undefined;
    }

    try {
      await fetch('/api/logging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          userId: this.userId,
          logs: logsToUpload.map(log => ({
            ...log,
            error: log.error ? {
              name: log.error.name,
              message: log.error.message,
              stack: log.error.stack
            } : undefined
          }))
        })
      });
    } catch (error) {
      console.warn('Failed to upload logs:', error);
      // Re-queue failed logs for retry
      this.uploadQueue.unshift(...logsToUpload);
    }
  }

  private async sendCriticalErrorToService(errorData: any): Promise<void> {
    try {
      await fetch('/api/alerts/critical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      });
    } catch (error) {
      console.error('Failed to send critical error alert:', error);
    }
  }

  getLogs(level?: LogLevel, component?: string, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= level);
    }

    if (component) {
      filteredLogs = filteredLogs.filter(log => log.component === component);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  getErrorMetrics(): ErrorMetrics {
    const errorLogs = this.logs.filter(log => log.level >= LogLevel.ERROR);
    const totalLogs = this.logs.length;

    const errorsByLevel = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.CRITICAL]: 0
    };

    const errorsByComponent: Record<string, number> = {};

    errorLogs.forEach(log => {
      errorsByLevel[log.level]++;
      if (log.component) {
        errorsByComponent[log.component] = (errorsByComponent[log.component] || 0) + 1;
      }
    });

    return {
      totalErrors: errorLogs.length,
      errorsByLevel,
      errorsByComponent,
      errorRate: totalLogs > 0 ? errorLogs.length / totalLogs : 0,
      lastError: errorLogs[errorLogs.length - 1] || null
    };
  }

  exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      userId: this.userId,
      exportTimestamp: Date.now(),
      logs: this.logs,
      metrics: this.getErrorMetrics()
    }, null, 2);
  }

  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('chimuelo_error_logs');
  }

  // Contextual logging helpers
  logUserAction(action: string, context?: Record<string, any>, component?: string): void {
    this.info(`User Action: ${action}`, context, component);
  }

  logPerformanceIssue(metric: string, value: number, threshold: number, component?: string): void {
    this.warn(`Performance Issue: ${metric}`, {
      value,
      threshold,
      exceededBy: value - threshold
    }, component);
  }

  logApiCall(url: string, method: string, duration: number, status?: number): void {
    const level = status && status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, `API Call: ${method} ${url}`, {
      method,
      url,
      duration,
      status
    });
  }

  logComponentError(component: string, action: string, error: Error, context?: Record<string, any>): void {
    this.error(`Component Error in ${component}`, {
      action,
      ...context
    }, error, component);
  }
}

// Global logger instance
export const logger = ErrorLogger.getInstance();

// React hook for component logging
export const useLogger = (componentName: string) => {
  return {
    debug: (message: string, context?: Record<string, any>) => 
      logger.debug(message, context, componentName),
    info: (message: string, context?: Record<string, any>) => 
      logger.info(message, context, componentName),
    warn: (message: string, context?: Record<string, any>) => 
      logger.warn(message, context, componentName),
    error: (message: string, context?: Record<string, any>, error?: Error) => 
      logger.error(message, context, error, componentName),
    logAction: (action: string, context?: Record<string, any>) => 
      logger.logUserAction(action, context, componentName),
    logError: (action: string, error: Error, context?: Record<string, any>) => 
      logger.logComponentError(componentName, action, error, context)
  };
};