import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PerformanceService, performanceService } from '../../services/PerformanceService';

describe('PerformanceService', () => {
  let service: PerformanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = PerformanceService.getInstance();
    // Clear metrics before each test
    (service as any).metrics = [];
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = PerformanceService.getInstance();
      const instance2 = PerformanceService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('measure', () => {
    it('should measure async function execution time', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const result = await service.measure('test-metric', mockFn, 'test-context');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalled();

      const metrics = service.getMetrics({ name: 'test-metric' });
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('test-metric');
      expect(metrics[0].context).toBe('test-context');
      expect(metrics[0].duration).toBeGreaterThan(0);
    });

    it('should handle async function errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Test error'));

      await expect(service.measure('test-metric', mockFn, 'test-context')).rejects.toThrow('Test error');

      const metrics = service.getMetrics({ name: 'test-metric_error' });
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('test-metric_error');
      expect(metrics[0].metadata?.error).toBe('Test error');
    });
  });

  describe('measureSync', () => {
    it('should measure sync function execution time', () => {
      const mockFn = vi.fn().mockReturnValue('success');
      const result = service.measureSync('test-sync-metric', mockFn, 'test-context');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalled();

      const metrics = service.getMetrics({ name: 'test-sync-metric' });
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('test-sync-metric');
      expect(metrics[0].context).toBe('test-context');
      expect(metrics[0].duration).toBeGreaterThan(0);
    });

    it('should handle sync function errors', () => {
      const mockFn = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      expect(() => service.measureSync('test-sync-metric', mockFn, 'test-context')).toThrow('Test error');

      const metrics = service.getMetrics({ name: 'test-sync-metric_error' });
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('test-sync-metric_error');
      expect(metrics[0].metadata?.error).toBe('Test error');
    });
  });

  describe('recordMetric', () => {
    it('should record a performance metric', () => {
      service.recordMetric('test-metric', 100, 'test-context', { key: 'value' });

      const metrics = service.getMetrics({ name: 'test-metric' });
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual({
        name: 'test-metric',
        duration: 100,
        context: 'test-context',
        metadata: { key: 'value' },
        timestamp: expect.any(Date),
      });
    });

    it('should maintain metrics array size limit', () => {
      const originalMaxMetrics = (service as any).maxMetrics;
      (service as any).maxMetrics = 3;

      // Add more metrics than the limit
      for (let i = 0; i < 5; i++) {
        service.recordMetric(`metric-${i}`, i * 10);
      }

      const metrics = service.getMetrics();
      expect(metrics).toHaveLength(3);
      expect(metrics[0].name).toBe('metric-2');
      expect(metrics[1].name).toBe('metric-3');
      expect(metrics[2].name).toBe('metric-4');

      // Restore original limit
      (service as any).maxMetrics = originalMaxMetrics;
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      // Add some test metrics
      service.recordMetric('metric-1', 100, 'context-1');
      service.recordMetric('metric-2', 200, 'context-1');
      service.recordMetric('metric-3', 300, 'context-2');
      service.recordMetric('metric-4', 400, 'context-2');
    });

    it('should return all metrics when no filter is provided', () => {
      const metrics = service.getMetrics();
      expect(metrics).toHaveLength(4);
    });

    it('should filter by name', () => {
      const metrics = service.getMetrics({ name: 'metric-1' });
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('metric-1');
    });

    it('should filter by context', () => {
      const metrics = service.getMetrics({ context: 'context-1' });
      expect(metrics).toHaveLength(2);
      expect(metrics[0].context).toBe('context-1');
      expect(metrics[1].context).toBe('context-1');
    });

    it('should filter by minimum duration', () => {
      const metrics = service.getMetrics({ minDuration: 250 });
      expect(metrics).toHaveLength(2);
      expect(metrics[0].duration).toBeGreaterThanOrEqual(250);
      expect(metrics[1].duration).toBeGreaterThanOrEqual(250);
    });

    it('should combine multiple filters', () => {
      const metrics = service.getMetrics({ 
        context: 'context-2', 
        minDuration: 250 
      });
      expect(metrics).toHaveLength(2);
      expect(metrics[0].context).toBe('context-2');
      expect(metrics[0].duration).toBeGreaterThanOrEqual(250);
    });
  });

  describe('getAveragePerformance', () => {
    it('should calculate average performance correctly', () => {
      service.recordMetric('test-metric', 100);
      service.recordMetric('test-metric', 200);
      service.recordMetric('test-metric', 300);

      const average = service.getAveragePerformance('test-metric');
      expect(average).toBe(200);
    });

    it('should return 0 for non-existent metrics', () => {
      const average = service.getAveragePerformance('non-existent');
      expect(average).toBe(0);
    });
  });

  describe('getSlowestOperations', () => {
    it('should return slowest operations in descending order', () => {
      service.recordMetric('metric-1', 100);
      service.recordMetric('metric-2', 300);
      service.recordMetric('metric-3', 200);

      const slowest = service.getSlowestOperations(2);
      expect(slowest).toHaveLength(2);
      expect(slowest[0].duration).toBe(300);
      expect(slowest[1].duration).toBe(200);
    });

    it('should return all operations when count is greater than available', () => {
      service.recordMetric('metric-1', 100);
      service.recordMetric('metric-2', 200);

      const slowest = service.getSlowestOperations(5);
      expect(slowest).toHaveLength(2);
    });
  });

  describe('clearMetrics', () => {
    it('should clear all metrics', () => {
      service.recordMetric('test-metric', 100);
      expect(service.getMetrics()).toHaveLength(1);

      service.clearMetrics();
      expect(service.getMetrics()).toHaveLength(0);
    });
  });

  describe('setThresholds', () => {
    it('should update performance thresholds', () => {
      const originalThresholds = { ...(service as any).thresholds };
      
      service.setThresholds({
        slowQuery: 1000,
        slowRender: 50,
      });

      expect((service as any).thresholds.slowQuery).toBe(1000);
      expect((service as any).thresholds.slowRender).toBe(50);
      expect((service as any).thresholds.memoryWarning).toBe(originalThresholds.memoryWarning);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage when available', () => {
      const memory = service.getMemoryUsage();
      expect(memory).toEqual({
        used: 1, // 1000000 / 1024 / 1024
        total: 2, // 2000000 / 1024 / 1024
        limit: 4, // 4000000 / 1024 / 1024
      });
    });

    it('should return null when memory API is not available', () => {
      // Temporarily remove memory from performance
      const originalMemory = (performance as any).memory;
      delete (performance as any).memory;

      const memory = service.getMemoryUsage();
      expect(memory).toBeNull();

      // Restore memory
      (performance as any).memory = originalMemory;
    });
  });

  describe('generateReport', () => {
    it('should generate a comprehensive performance report', () => {
      service.recordMetric('metric-1', 100);
      service.recordMetric('metric-1', 200);
      service.recordMetric('metric-2', 300);

      const report = service.generateReport();

      expect(report).toEqual({
        totalMetrics: 3,
        averagePerformance: {
          'metric-1': 150,
          'metric-2': 300,
        },
        slowestOperations: expect.arrayContaining([
          expect.objectContaining({ name: 'metric-2', duration: 300 }),
          expect.objectContaining({ name: 'metric-1', duration: 200 }),
        ]),
        memoryUsage: expect.objectContaining({
          used: expect.any(Number),
          total: expect.any(Number),
          limit: expect.any(Number),
        }),
      });
    });
  });

  describe('performance monitoring', () => {
    it('should warn about slow operations', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Set low threshold for testing
      service.setThresholds({ slowQuery: 50 });
      
      service.recordMetric('slow-operation', 100, 'test-context');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Slow operation detected: slow-operation took 100.00ms',
        expect.objectContaining({
          name: 'slow-operation',
          duration: 100,
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should warn about slow renders', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Set low threshold for testing
      service.setThresholds({ slowRender: 50 });
      
      service.recordMetric('slow-render', 100, 'render-context');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Slow render detected: slow-render took 100.00ms',
        expect.objectContaining({
          name: 'slow-render',
          duration: 100,
        })
      );
      
      consoleSpy.mockRestore();
    });
  });
}); 