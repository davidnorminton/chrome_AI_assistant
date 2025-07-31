// Export all services for easy importing
export { aiService, AIService, type SendQueryOptions, type StreamOptions } from './AIService';
export { pluginManager, PluginManager, type AIProvider, type PluginRegistration } from './PluginManager';
export { errorService, ErrorService, type ErrorInfo, type ErrorHandler, withErrorHandling, withSyncErrorHandling } from './ErrorService';
export { performanceService, PerformanceService, type PerformanceMetric, type PerformanceThresholds, measurePerformance } from './PerformanceService';

// Export provider implementations
export { PerplexityProvider } from './providers/PerplexityProvider';

// Initialize services
import { pluginManager } from './PluginManager';
import { PerplexityProvider } from './providers/PerplexityProvider';

// Register the PerplexityProvider with the PluginManager
pluginManager.registerPlugin(new PerplexityProvider()); 