export interface ErrorInfo {
  message: string;
  code?: string;
  context?: string;
  timestamp: Date;
  stack?: string;
  userAgent?: string;
  url?: string;
}

export interface ErrorHandler {
  handle(error: Error, context?: string): void;
  log(error: ErrorInfo): void;
  report(error: ErrorInfo): void;
}

export class ErrorService implements ErrorHandler {
  private static instance: ErrorService;
  private errorLog: ErrorInfo[] = [];
  private maxLogSize = 100;

  private constructor() {}

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  handle(error: Error, context?: string): void {
    const errorInfo: ErrorInfo = {
      message: error.message,
      code: this.getErrorCode(error),
      context,
      timestamp: new Date(),
      stack: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.log(errorInfo);
    this.report(errorInfo);
  }

  log(error: ErrorInfo): void {
    // Add to internal log
    this.errorLog.push(error);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', error);
    }
  }

  report(error: ErrorInfo): void {
    // In a real application, you might send this to an error reporting service
    // For now, we'll just log it
    console.error('Error reported:', error);
    
    // You could integrate with services like:
    // - Sentry
    // - LogRocket
    // - Bugsnag
    // - Custom error reporting endpoint
  }

  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  private getErrorCode(error: Error): string {
    // Map common error types to codes
    if (error.message.includes('API key')) return 'AUTH_ERROR';
    if (error.message.includes('network')) return 'NETWORK_ERROR';
    if (error.message.includes('timeout')) return 'TIMEOUT_ERROR';
    if (error.message.includes('permission')) return 'PERMISSION_ERROR';
    if (error.message.includes('quota')) return 'QUOTA_ERROR';
    return 'UNKNOWN_ERROR';
  }

  // Utility methods for common error scenarios
  handleAPIError(error: Error, endpoint?: string): void {
    this.handle(error, `API Error${endpoint ? ` at ${endpoint}` : ''}`);
  }

  handleNetworkError(error: Error): void {
    this.handle(error, 'Network Error');
  }

  handleStorageError(error: Error): void {
    this.handle(error, 'Storage Error');
  }

  handleValidationError(error: Error, field?: string): void {
    this.handle(error, `Validation Error${field ? ` in ${field}` : ''}`);
  }
}

// Export singleton instance
export const errorService = ErrorService.getInstance();

// Utility function for async error handling
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      errorService.handle(error instanceof Error ? error : new Error(String(error)), context);
      throw error;
    }
  };
}

// Utility function for sync error handling
export function withSyncErrorHandling<T extends any[], R>(
  fn: (...args: T) => R,
  context?: string
): (...args: T) => R {
  return (...args: T): R => {
    try {
      return fn(...args);
    } catch (error) {
      errorService.handle(error instanceof Error ? error : new Error(String(error)), context);
      throw error;
    }
  };
} 