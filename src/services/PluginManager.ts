import type { AIResponse, AIAction, AIContextConfig, AIModelConfig } from '../types';

// Base interface for AI providers
export interface AIProvider {
  name: string;
  description: string;
  version: string;
  
  // Core methods
  sendQuery(query: string, options: SendQueryOptions): Promise<AIResponse>;
  streamQuery(query: string, options: StreamOptions): Promise<void>;
  
  // Optional methods
  isAvailable?(): Promise<boolean>;
  getModels?(): Promise<string[]>;
  validateConfig?(config: any): boolean;
}

export interface SendQueryOptions {
  query: string;
  action: AIAction;
  file?: string | null;
  contextConfig?: Partial<AIContextConfig>;
  modelConfig?: Partial<AIModelConfig>;
}

export interface StreamOptions extends SendQueryOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (finalContent: string) => void;
  onError?: (error: Error) => void;
  abortSignal?: AbortSignal;
}

// Plugin registration interface
export interface PluginRegistration {
  provider: AIProvider;
  priority: number; // Higher number = higher priority
  enabled: boolean;
}

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, PluginRegistration> = new Map();
  private defaultProvider: string = 'perplexity';

  private constructor() {}

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  // Register a new AI provider plugin
  registerPlugin(provider: AIProvider, priority: number = 0): void {
    this.plugins.set(provider.name, {
      provider,
      priority,
      enabled: true,
    });
  }

  // Unregister a plugin
  unregisterPlugin(name: string): boolean {
    return this.plugins.delete(name);
  }

  // Get all registered plugins
  getPlugins(): PluginRegistration[] {
    return Array.from(this.plugins.values())
      .sort((a, b) => b.priority - a.priority);
  }

  // Get enabled plugins
  getEnabledPlugins(): PluginRegistration[] {
    return this.getPlugins().filter(p => p.enabled);
  }

  // Get the best available provider
  async getBestProvider(): Promise<AIProvider | null> {
    const enabledPlugins = this.getEnabledPlugins();
    
    for (const registration of enabledPlugins) {
      if (registration.provider.isAvailable) {
        const available = await registration.provider.isAvailable();
        if (available) {
          return registration.provider;
        }
      } else {
        // If no availability check, assume it's available
        return registration.provider;
      }
    }
    
    return null;
  }

  // Get a specific provider by name
  getProvider(name: string): AIProvider | null {
    const registration = this.plugins.get(name);
    return registration?.enabled ? registration.provider : null;
  }

  // Enable/disable a plugin
  setPluginEnabled(name: string, enabled: boolean): boolean {
    const registration = this.plugins.get(name);
    if (registration) {
      registration.enabled = enabled;
      return true;
    }
    return false;
  }

  // Send query using the best available provider
  async sendQuery(query: string, options: SendQueryOptions): Promise<AIResponse> {
    const provider = await this.getBestProvider();
    if (!provider) {
      throw new Error('No AI providers available');
    }
    
    return provider.sendQuery(query, options);
  }

  // Stream query using the best available provider
  async streamQuery(query: string, options: StreamOptions): Promise<void> {
    const provider = await this.getBestProvider();
    if (!provider) {
      throw new Error('No AI providers available');
    }
    
    return provider.streamQuery(query, options);
  }

  // Get available models from all providers
  async getAvailableModels(): Promise<{ provider: string; models: string[] }[]> {
    const results: { provider: string; models: string[] }[] = [];
    
    for (const registration of this.getEnabledPlugins()) {
      if (registration.provider.getModels) {
        try {
          const models = await registration.provider.getModels();
          results.push({
            provider: registration.provider.name,
            models,
          });
        } catch (error) {
          console.warn(`Failed to get models for ${registration.provider.name}:`, error);
        }
      }
    }
    
    return results;
  }

  // Validate configuration for a specific provider
  validateProviderConfig(providerName: string, config: any): boolean {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return false;
    }
    
    if (provider.validateConfig) {
      return provider.validateConfig(config);
    }
    
    // Default validation - check for required fields
    return config && typeof config === 'object';
  }
}

// Export singleton instance
export const pluginManager = PluginManager.getInstance(); 