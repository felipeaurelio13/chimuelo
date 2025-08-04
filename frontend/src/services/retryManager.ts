interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export class RetryManager {
  private static defaultConfig: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    retryableErrors: ['NetworkError', 'TimeoutError', 'ServiceUnavailable']
  };

  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let lastError: Error;
    
    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === finalConfig.maxAttempts || 
            !this.isRetryableError(error as Error, finalConfig)) {
          throw error;
        }
        
        const delay = finalConfig.delayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.warn(`Retry attempt ${attempt}/${finalConfig.maxAttempts} for operation`, {
          error: (error as Error).message,
          nextDelay: delay
        });
      }
    }
    
    throw lastError!;
  }

  private static isRetryableError(error: Error, config: RetryConfig): boolean {
    return config.retryableErrors.some(retryableType => 
      error.name.includes(retryableType) || error.message.includes(retryableType)
    );
  }

  static async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitKey: string,
    failureThreshold: number = 5,
    resetTimeoutMs: number = 60000
  ): Promise<T> {
    // Circuit breaker implementation for preventing cascade failures
    const circuitState = this.getCircuitState(circuitKey);
    
    if (circuitState.isOpen && Date.now() - circuitState.lastFailure < resetTimeoutMs) {
      throw new Error(`Circuit breaker open for ${circuitKey}`);
    }
    
    try {
      const result = await operation();
      this.recordSuccess(circuitKey);
      return result;
    } catch (error) {
      this.recordFailure(circuitKey, failureThreshold);
      throw error;
    }
  }

  private static circuitStates = new Map<string, {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
  }>();

  private static getCircuitState(key: string) {
    if (!this.circuitStates.has(key)) {
      this.circuitStates.set(key, { failures: 0, lastFailure: 0, isOpen: false });
    }
    return this.circuitStates.get(key)!;
  }

  private static recordSuccess(key: string) {
    const state = this.getCircuitState(key);
    state.failures = 0;
    state.isOpen = false;
  }

  private static recordFailure(key: string, threshold: number) {
    const state = this.getCircuitState(key);
    state.failures++;
    state.lastFailure = Date.now();
    state.isOpen = state.failures >= threshold;
  }
}