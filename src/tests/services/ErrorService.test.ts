import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorService, errorService } from '../../services/ErrorService';

describe('ErrorService', () => {
  let service: ErrorService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = ErrorService.getInstance();
    // Clear the error log before each test
    (service as any).errorLog = [];
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = ErrorService.getInstance();
      const instance2 = ErrorService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('handle', () => {
    it('should handle errors correctly', () => {
      const error = new Error('Test error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.handle(error, 'test context');

      expect(consoleSpy).toHaveBeenCalledWith('Error reported:', expect.objectContaining({
        message: 'Test error',
        code: 'UNKNOWN_ERROR',
        context: 'test context',
        timestamp: expect.any(Date),
        stack: expect.any(String),
        userAgent: expect.any(String),
        url: expect.any(String),
      }));

      consoleSpy.mockRestore();
    });

    it('should categorize errors correctly', () => {
      const authError = new Error('API key not set');
      const networkError = new Error('Network timeout');
      const timeoutError = new Error('Request timeout');
      const permissionError = new Error('Permission denied');
      const quotaError = new Error('Quota exceeded');

      service.handle(authError);
      service.handle(networkError);
      service.handle(timeoutError);
      service.handle(permissionError);
      service.handle(quotaError);

      const errorLog = (service as any).getErrorLog();
      expect(errorLog[0].code).toBe('AUTH_ERROR');
      expect(errorLog[1].code).toBe('NETWORK_ERROR');
      expect(errorLog[2].code).toBe('TIMEOUT_ERROR');
      expect(errorLog[3].code).toBe('PERMISSION_ERROR');
      expect(errorLog[4].code).toBe('QUOTA_ERROR');
    });
  });

  describe('log', () => {
    it('should log error information', () => {
      const errorInfo = {
        message: 'Test error',
        code: 'TEST_ERROR',
        context: 'test',
        timestamp: new Date(),
        stack: 'Error stack',
        userAgent: 'test-agent',
        url: 'http://test.com',
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.log(errorInfo);

      expect(consoleSpy).toHaveBeenCalledWith('Error logged:', errorInfo);
      consoleSpy.mockRestore();
    });

    it('should maintain log size limit', () => {
      const originalMaxSize = (service as any).maxLogSize;
      (service as any).maxLogSize = 3;

      // Add more errors than the limit
      for (let i = 0; i < 5; i++) {
        service.log({
          message: `Error ${i}`,
          timestamp: new Date(),
        });
      }

      const errorLog = (service as any).getErrorLog();
      expect(errorLog).toHaveLength(3);
      expect(errorLog[0].message).toBe('Error 2');
      expect(errorLog[1].message).toBe('Error 3');
      expect(errorLog[2].message).toBe('Error 4');

      // Restore original size
      (service as any).maxLogSize = originalMaxSize;
    });
  });

  describe('report', () => {
    it('should report errors', () => {
      const errorInfo = {
        message: 'Test error',
        timestamp: new Date(),
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.report(errorInfo);

      expect(consoleSpy).toHaveBeenCalledWith('Error reported:', errorInfo);
      consoleSpy.mockRestore();
    });
  });

  describe('getErrorLog', () => {
    it('should return a copy of the error log', () => {
      const errorInfo = {
        message: 'Test error',
        timestamp: new Date(),
      };

      service.log(errorInfo);

      const log = service.getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].message).toBe('Test error');

      // Verify it's a copy, not the original
      log[0].message = 'Modified';
      const originalLog = (service as any).getErrorLog();
      expect(originalLog[0].message).toBe('Test error');
    });
  });

  describe('clearErrorLog', () => {
    it('should clear the error log', () => {
      service.log({
        message: 'Test error',
        timestamp: new Date(),
      });

      expect(service.getErrorLog()).toHaveLength(1);

      service.clearErrorLog();

      expect(service.getErrorLog()).toHaveLength(0);
    });
  });

  describe('utility methods', () => {
    it('should handle API errors', () => {
      const error = new Error('API Error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.handleAPIError(error, 'test-endpoint');

      expect(consoleSpy).toHaveBeenCalledWith('Error logged:', expect.objectContaining({
        context: 'API Error at test-endpoint',
      }));

      consoleSpy.mockRestore();
    });

    it('should handle network errors', () => {
      const error = new Error('Network Error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.handleNetworkError(error);

      expect(consoleSpy).toHaveBeenCalledWith('Error logged:', expect.objectContaining({
        context: 'Network Error',
      }));

      consoleSpy.mockRestore();
    });

    it('should handle storage errors', () => {
      const error = new Error('Storage Error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.handleStorageError(error);

      expect(consoleSpy).toHaveBeenCalledWith('Error logged:', expect.objectContaining({
        context: 'Storage Error',
      }));

      consoleSpy.mockRestore();
    });

    it('should handle validation errors', () => {
      const error = new Error('Validation Error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.handleValidationError(error, 'test-field');

      expect(consoleSpy).toHaveBeenCalledWith('Error logged:', expect.objectContaining({
        context: 'Validation Error in test-field',
      }));

      consoleSpy.mockRestore();
    });
  });

  describe('withErrorHandling', () => {
    it('should wrap async functions with error handling', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Test error'));
      const wrappedFn = (service as any).withErrorHandling(mockFn, 'test context');

      await expect(wrappedFn('test')).rejects.toThrow('Test error');

      const errorLog = service.getErrorLog();
      expect(errorLog).toHaveLength(1);
      expect(errorLog[0].message).toBe('Test error');
      expect(errorLog[0].context).toBe('test context');
    });

    it('should pass through successful results', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const wrappedFn = (service as any).withErrorHandling(mockFn, 'test context');

      const result = await wrappedFn('test');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledWith('test');
    });
  });

  describe('withSyncErrorHandling', () => {
    it('should wrap sync functions with error handling', () => {
      const mockFn = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      const wrappedFn = (service as any).withSyncErrorHandling(mockFn, 'test context');

      expect(() => wrappedFn('test')).toThrow('Test error');

      const errorLog = service.getErrorLog();
      expect(errorLog).toHaveLength(1);
      expect(errorLog[0].message).toBe('Test error');
      expect(errorLog[0].context).toBe('test context');
    });

    it('should pass through successful results', () => {
      const mockFn = vi.fn().mockReturnValue('success');
      const wrappedFn = (service as any).withSyncErrorHandling(mockFn, 'test context');

      const result = wrappedFn('test');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledWith('test');
    });
  });
}); 