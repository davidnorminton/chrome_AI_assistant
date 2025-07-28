export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  context?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  slowQuery: number; // milliseconds
  slowRender: number; // milliseconds
  memoryWarning: number; // MB
}

export class PerformanceService {
  private static instance: PerformanceService;
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;
  private thresholds: PerformanceThresholds = {
    slowQuery: 5000, // 5 seconds
    slowRender: 100, // 100ms
    memoryWarning: 50, // 50MB
  };

  private constructor() {
    this.setupMemoryMonitoring();
  }

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  // Measure execution time of a function
  async measure<T>(name: string, fn: () => Promise<T>, context?: string): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, context);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_error`, duration, context, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Measure synchronous execution time
  measureSync<T>(name: string, fn: () => T, context?: string): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, context);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_error`, duration, context, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Record a performance metric
  recordMetric(name: string, duration: number, context?: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date(),
      context,
      metadata,
    };

    this.metrics.push(metric);

    // Keep metrics array manageable
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Check for performance issues
    this.checkPerformanceIssues(metric);
  }

  // Get performance metrics
  getMetrics(filter?: { name?: string; context?: string; minDuration?: number }): PerformanceMetric[] {
    let filtered = this.metrics;

    if (filter?.name) {
      filtered = filtered.filter(m => m.name.includes(filter.name!));
    }

    if (filter?.context) {
      filtered = filtered.filter(m => m.context === filter.context);
    }

    if (filter?.minDuration) {
      filtered = filtered.filter(m => m.duration >= filter.minDuration!);
    }

    return filtered;
  }

  // Get average performance for a metric
  getAveragePerformance(name: string): number {
    const metrics = this.metrics.filter(m => m.name === name);
    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  // Get slowest operations
  getSlowestOperations(count: number = 10): PerformanceMetric[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics = [];
  }

  // Set performance thresholds
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  // Check for performance issues
  private checkPerformanceIssues(metric: PerformanceMetric): void {
    if (metric.duration > this.thresholds.slowQuery) {
      console.warn(`Slow operation detected: ${metric.name} took ${metric.duration.toFixed(2)}ms`, metric);
    }

    if (metric.duration > this.thresholds.slowRender) {
      console.warn(`Slow render detected: ${metric.name} took ${metric.duration.toFixed(2)}ms`, metric);
    }
  }

  // Monitor memory usage
  private setupMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        
        if (usedMB > this.thresholds.memoryWarning) {
          console.warn(`High memory usage: ${usedMB.toFixed(2)}MB`);
        }
      }, 30000); // Check every 30 seconds
    }
  }

  // Get memory usage (if available)
  getMemoryUsage(): { used: number; total: number; limit: number } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize / 1024 / 1024, // MB
        total: memory.totalJSHeapSize / 1024 / 1024, // MB
        limit: memory.jsHeapSizeLimit / 1024 / 1024, // MB
      };
    }
    return null;
  }

  // Generate performance report
  generateReport(): {
    totalMetrics: number;
    averagePerformance: Record<string, number>;
    slowestOperations: PerformanceMetric[];
    memoryUsage: any;
  } {
    const uniqueNames = [...new Set(this.metrics.map(m => m.name))];
    const averagePerformance: Record<string, number> = {};
    
    uniqueNames.forEach(name => {
      averagePerformance[name] = this.getAveragePerformance(name);
    });

    return {
      totalMetrics: this.metrics.length,
      averagePerformance,
      slowestOperations: this.getSlowestOperations(5),
      memoryUsage: this.getMemoryUsage(),
    };
  }
}

// Export singleton instance
export const performanceService = PerformanceService.getInstance();

// Utility decorator for measuring function performance
export function measurePerformance(name: string, context?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return performanceService.measure(name, () => originalMethod.apply(this, args), context);
    };

    return descriptor;
  };
} 