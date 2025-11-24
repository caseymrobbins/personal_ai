/**
 * Multi-SLM Manager Service
 *
 * Manages multiple local Small Language Models (SLMs) and provides
 * unified interface for model selection and routing.
 *
 * Supported Models:
 * - Phi-3 (Microsoft): General purpose, 3.8B params, fast
 * - Llama-3 (Meta): Strong reasoning, 8B params, high quality
 * - CodeLlama (Meta): Code-specialized, 7B params, best for programming
 * - Gemma (Google): Lightweight, 2B params, very fast
 */

export type LocalSLMType = 'phi-3' | 'llama-3' | 'codellama' | 'gemma';

export interface LocalSLMInfo {
  id: LocalSLMType;
  name: string;
  description: string;
  modelSize: string;
  parameters: string;
  strengths: string[];
  avgLatency: number; // milliseconds
  contextWindow: number; // tokens
  specialization: 'general' | 'code' | 'reasoning' | 'lightweight';
  available: boolean; // Whether model is installed/available
}

export interface SLMCapabilities {
  supportsStreaming: boolean;
  supportsToolCalling: boolean;
  maxTokens: number;
  languages: string[];
}

export class MultiSLMManagerService {
  private static instance: MultiSLMManagerService;
  private currentSLM: LocalSLMType = 'phi-3';
  private availableModels: Map<LocalSLMType, LocalSLMInfo>;

  private constructor() {
    this.availableModels = new Map();
    this.initializeModels();
    this.loadSavedSelection();
  }

  public static getInstance(): MultiSLMManagerService {
    if (!MultiSLMManagerService.instance) {
      MultiSLMManagerService.instance = new MultiSLMManagerService();
    }
    return MultiSLMManagerService.instance;
  }

  /**
   * Initialize available models with their metadata
   */
  private initializeModels(): void {
    // Phi-3 (Microsoft) - Default
    this.availableModels.set('phi-3', {
      id: 'phi-3',
      name: 'Phi-3 Mini',
      description: 'Balanced general-purpose model from Microsoft',
      modelSize: '3.8B',
      parameters: '3.8 billion',
      strengths: ['Fast inference', 'Low memory', 'Good balance', 'Multi-task'],
      avgLatency: 250,
      contextWindow: 4096,
      specialization: 'general',
      available: true, // Always available as default
    });

    // Llama-3 (Meta)
    this.availableModels.set('llama-3', {
      id: 'llama-3',
      name: 'Llama 3',
      description: 'High-quality reasoning model from Meta',
      modelSize: '8B',
      parameters: '8 billion',
      strengths: ['Strong reasoning', 'High quality', 'Complex tasks', 'Nuanced answers'],
      avgLatency: 450,
      contextWindow: 8192,
      specialization: 'reasoning',
      available: this.checkModelAvailability('llama-3'),
    });

    // CodeLlama (Meta)
    this.availableModels.set('codellama', {
      id: 'codellama',
      name: 'CodeLlama',
      description: 'Code-specialized model from Meta',
      modelSize: '7B',
      parameters: '7 billion',
      strengths: ['Code generation', 'Debugging', 'Code explanation', 'Multiple languages'],
      avgLatency: 400,
      contextWindow: 16384,
      specialization: 'code',
      available: this.checkModelAvailability('codellama'),
    });

    // Gemma (Google)
    this.availableModels.set('gemma', {
      id: 'gemma',
      name: 'Gemma 2B',
      description: 'Lightweight fast model from Google',
      modelSize: '2B',
      parameters: '2 billion',
      strengths: ['Very fast', 'Low resource', 'Quick responses', 'Efficient'],
      avgLatency: 150,
      contextWindow: 8192,
      specialization: 'lightweight',
      available: this.checkModelAvailability('gemma'),
    });
  }

  /**
   * Check if a model is available (installed and ready)
   */
  private checkModelAvailability(modelId: LocalSLMType): boolean {
    // In a real implementation, this would check:
    // - Model files exist in local directory
    // - Required dependencies are installed
    // - Model is loaded in memory or can be loaded
    // For now, we'll simulate availability

    // Check localStorage for simulated availability
    const savedAvailability = localStorage.getItem(`slm-availability-${modelId}`);
    if (savedAvailability !== null) {
      return savedAvailability === 'true';
    }

    // Default: only Phi-3 is available
    return modelId === 'phi-3';
  }

  /**
   * Get list of all available models
   */
  public getAvailableModels(): LocalSLMInfo[] {
    return Array.from(this.availableModels.values());
  }

  /**
   * Get list of only installed/ready models
   */
  public getInstalledModels(): LocalSLMInfo[] {
    return Array.from(this.availableModels.values()).filter((model) => model.available);
  }

  /**
   * Get current selected model
   */
  public getCurrentSLM(): LocalSLMType {
    return this.currentSLM;
  }

  /**
   * Get current model info
   */
  public getCurrentModelInfo(): LocalSLMInfo | undefined {
    return this.availableModels.get(this.currentSLM);
  }

  /**
   * Set current model (switches active SLM)
   */
  public setCurrentSLM(modelId: LocalSLMType): boolean {
    const model = this.availableModels.get(modelId);

    if (!model) {
      console.error(`[MultiSLM] Model not found: ${modelId}`);
      return false;
    }

    if (!model.available) {
      console.error(`[MultiSLM] Model not available: ${modelId}`);
      return false;
    }

    this.currentSLM = modelId;
    this.saveSelection();

    console.log(`[MultiSLM] Switched to ${model.name} (${model.modelSize})`);
    return true;
  }

  /**
   * Get model info by ID
   */
  public getModelInfo(modelId: LocalSLMType): LocalSLMInfo | undefined {
    return this.availableModels.get(modelId);
  }

  /**
   * Recommend best model for query type
   */
  public recommendModel(queryType: 'code' | 'reasoning' | 'general' | 'quick'): LocalSLMType {
    const installedModels = this.getInstalledModels();

    switch (queryType) {
      case 'code':
        // Prefer CodeLlama for code queries
        if (installedModels.find((m) => m.id === 'codellama')) {
          return 'codellama';
        }
        break;

      case 'reasoning':
        // Prefer Llama-3 for complex reasoning
        if (installedModels.find((m) => m.id === 'llama-3')) {
          return 'llama-3';
        }
        break;

      case 'quick':
        // Prefer Gemma for quick responses
        if (installedModels.find((m) => m.id === 'gemma')) {
          return 'gemma';
        }
        break;

      case 'general':
      default:
        // Default to Phi-3 for general queries
        break;
    }

    // Fallback to current model or Phi-3
    return this.currentSLM;
  }

  /**
   * Get capabilities of a model
   */
  public getCapabilities(modelId: LocalSLMType): SLMCapabilities {
    const model = this.availableModels.get(modelId);

    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Define capabilities based on model
    const capabilities: SLMCapabilities = {
      supportsStreaming: true, // All models support streaming
      supportsToolCalling: ['llama-3', 'codellama'].includes(modelId), // Advanced models only
      maxTokens: model.contextWindow,
      languages: modelId === 'codellama'
        ? ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust', 'Ruby', 'PHP']
        : ['English'], // CodeLlama supports multiple programming languages
    };

    return capabilities;
  }

  /**
   * Simulate model installation (for demo purposes)
   */
  public async installModel(modelId: LocalSLMType): Promise<boolean> {
    const model = this.availableModels.get(modelId);

    if (!model) {
      console.error(`[MultiSLM] Model not found: ${modelId}`);
      return false;
    }

    if (model.available) {
      console.log(`[MultiSLM] Model already installed: ${model.name}`);
      return true;
    }

    console.log(`[MultiSLM] Installing ${model.name}...`);

    // Simulate installation delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mark as available
    model.available = true;
    this.availableModels.set(modelId, model);

    // Save to localStorage
    localStorage.setItem(`slm-availability-${modelId}`, 'true');

    console.log(`[MultiSLM] Successfully installed ${model.name}`);
    return true;
  }

  /**
   * Uninstall a model (keep Phi-3 as cannot be uninstalled)
   */
  public uninstallModel(modelId: LocalSLMType): boolean {
    if (modelId === 'phi-3') {
      console.error('[MultiSLM] Cannot uninstall default model Phi-3');
      return false;
    }

    const model = this.availableModels.get(modelId);
    if (!model) {
      console.error(`[MultiSLM] Model not found: ${modelId}`);
      return false;
    }

    // Mark as unavailable
    model.available = false;
    this.availableModels.set(modelId, model);

    // Save to localStorage
    localStorage.setItem(`slm-availability-${modelId}`, 'false');

    // If currently selected, switch to Phi-3
    if (this.currentSLM === modelId) {
      this.setCurrentSLM('phi-3');
    }

    console.log(`[MultiSLM] Uninstalled ${model.name}`);
    return true;
  }

  /**
   * Get estimated metrics for a model
   */
  public getEstimatedMetrics(modelId: LocalSLMType): {
    latency: number;
    quality: number;
    resourceUsage: 'low' | 'medium' | 'high';
  } {
    const model = this.availableModels.get(modelId);

    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    let quality = 0.75; // Default quality score
    let resourceUsage: 'low' | 'medium' | 'high' = 'medium';

    switch (modelId) {
      case 'gemma':
        quality = 0.70;
        resourceUsage = 'low';
        break;
      case 'phi-3':
        quality = 0.75;
        resourceUsage = 'low';
        break;
      case 'codellama':
        quality = 0.82;
        resourceUsage = 'medium';
        break;
      case 'llama-3':
        quality = 0.88;
        resourceUsage = 'high';
        break;
    }

    return {
      latency: model.avgLatency,
      quality,
      resourceUsage,
    };
  }

  /**
   * Save current selection to localStorage
   */
  private saveSelection(): void {
    try {
      localStorage.setItem('selected-slm', this.currentSLM);
    } catch (error) {
      console.error('[MultiSLM] Failed to save selection:', error);
    }
  }

  /**
   * Load saved selection from localStorage
   */
  private loadSavedSelection(): void {
    try {
      const saved = localStorage.getItem('selected-slm');
      if (saved && this.availableModels.has(saved as LocalSLMType)) {
        const model = this.availableModels.get(saved as LocalSLMType);
        if (model?.available) {
          this.currentSLM = saved as LocalSLMType;
          console.log(`[MultiSLM] Loaded saved selection: ${model.name}`);
        }
      }
    } catch (error) {
      console.error('[MultiSLM] Failed to load saved selection:', error);
    }
  }

  /**
   * Export model configuration
   */
  public exportConfig(): string {
    return JSON.stringify(
      {
        currentModel: this.currentSLM,
        installedModels: this.getInstalledModels().map((m) => m.id),
        timestamp: Date.now(),
      },
      null,
      2
    );
  }
}
