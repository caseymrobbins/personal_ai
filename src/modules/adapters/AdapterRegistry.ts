/**
 * Adapter Registry
 *
 * Central registry for all AI adapters (local and external)
 * Manages adapter lifecycle and provides unified access
 */

import { IModuleAdapter } from './adapter.interface';
import { LocalGuardianAdapter } from './LocalGuardianAdapter';
import { OpenAIAdapter } from './OpenAIAdapter';
import { AnthropicAdapter } from './AnthropicAdapter';
import { GeminiAdapter } from './GeminiAdapter';
import { CohereAdapter } from './CohereAdapter';

class AdapterRegistry {
  private adapters: Map<string, IModuleAdapter> = new Map();
  private initialized: Set<string> = new Set();

  constructor() {
    // Register all available adapters
    this.register(new LocalGuardianAdapter());
    this.register(new OpenAIAdapter());
    this.register(new AnthropicAdapter());
    this.register(new GeminiAdapter());
    this.register(new CohereAdapter());
  }

  /**
   * Register an adapter
   */
  private register(adapter: IModuleAdapter): void {
    this.adapters.set(adapter.id, adapter);
    console.log(`[AdapterRegistry] Registered adapter: ${adapter.id}`);
  }

  /**
   * Get an adapter by ID
   */
  get(adapterId: string): IModuleAdapter | null {
    return this.adapters.get(adapterId) || null;
  }

  /**
   * Get all adapters
   */
  getAll(): IModuleAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Initialize an adapter if not already initialized
   */
  async initialize(adapterId: string): Promise<void> {
    if (this.initialized.has(adapterId)) {
      console.log(`[AdapterRegistry] Adapter ${adapterId} already initialized`);
      return;
    }

    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }

    console.log(`[AdapterRegistry] Initializing adapter: ${adapterId}...`);
    await adapter.initialize();
    this.initialized.add(adapterId);
    console.log(`[AdapterRegistry] ✅ Adapter ${adapterId} initialized`);
  }

  /**
   * Shutdown an adapter
   */
  async shutdown(adapterId: string): Promise<void> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }

    await adapter.shutdown();
    this.initialized.delete(adapterId);
    console.log(`[AdapterRegistry] Adapter ${adapterId} shut down`);
  }

  /**
   * Shutdown all adapters
   */
  async shutdownAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      if (adapter.isReady()) {
        await adapter.shutdown();
      }
    }
    this.initialized.clear();
    console.log('[AdapterRegistry] All adapters shut down');
  }

  /**
   * Check if an adapter is initialized
   */
  isInitialized(adapterId: string): boolean {
    return this.initialized.has(adapterId);
  }

  /**
   * Get adapter status
   */
  getStatus(adapterId: string) {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      return { ready: false, error: 'Adapter not found' };
    }
    return adapter.getStatus();
  }
}

// Singleton instance
export const adapterRegistry = new AdapterRegistry();
