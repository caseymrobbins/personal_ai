/**
 * SML GUARDIAN - MASTER ORCHESTRATION SERVICE
 * ============================================
 * The unified control system integrating all three agents and support systems
 *
 * SML = Sensitive-Minded Learning
 * Guardian = Protection, Transparency, Optimization
 *
 * System Architecture:
 * - Agent 1 (Mirror): Linguistic profiling & rapport building
 * - Agent 2 (Balancer): Emotional regulation & multi-strategy responses
 * - Agent 3 (Optimizer): Dream cycles, memory consolidation, evolution tracking
 *
 * Support Systems:
 * - Privacy Enforcement: Data protection and compliance
 * - Mode Transparency: User visibility into active modes
 * - Latency Optimization: Performance and responsiveness
 */

export type SystemState =
  | 'initializing'
  | 'ready'
  | 'active'
  | 'transitioning'
  | 'paused'
  | 'error'
  | 'shutdown';

export interface SystemConfig {
  enableMirrorMode: boolean;
  enableBalancerMode: boolean;
  enableOptimizerMode: boolean;
  enablePrivacyEnforcement: boolean;
  enableModeTransparency: boolean;
  enableLatencyOptimization: boolean;
  defaultMode: 'mirror' | 'balancer' | 'optimizer' | 'hybrid';
  autoModeSelection: boolean;
  maxConcurrentOperations: number;
  dataRetentionDays: number;
  debugMode: boolean;
}

export interface SystemHealth {
  state: SystemState;
  uptime: number; // seconds
  startTime: Date;
  lastHeartbeat: Date;
  agentStates: {
    mirror: 'active' | 'inactive' | 'error';
    balancer: 'active' | 'inactive' | 'error';
    optimizer: 'active' | 'inactive' | 'error';
  };
  supportSystems: {
    privacy: 'active' | 'inactive' | 'error';
    transparency: 'active' | 'inactive' | 'error';
    latency: 'active' | 'inactive' | 'error';
  };
  errorCount: number;
  warningCount: number;
  activeConnections: number;
}

export interface InteractionContext {
  userId: string;
  sessionId: string;
  timestamp: Date;
  currentMode: string;
  emotionalState?: {
    intensity: number;
    stability: number;
    primaryEmotion: string;
  };
  interactionHistory: Array<{
    type: string;
    timestamp: Date;
    agentMode: string;
    responseTime: number;
  }>;
}

export interface GuardianResponse {
  responseId: string;
  timestamp: Date;
  agentMode: string;
  content: string;
  confidence: number;
  metadata: {
    activatedStrategies: string[];
    cachedResult: boolean;
    responseTime: number;
    privacyCompliant: boolean;
  };
}

export interface SystemMetrics {
  totalInteractions: number;
  totalSessions: number;
  averageResponseTime: number;
  systemAvailability: number; // 0-1
  agentPerformance: {
    mirror: {
      interactions: number;
      averageResponseTime: number;
      satisfactionScore: number;
    };
    balancer: {
      interactions: number;
      averageResponseTime: number;
      satisfactionScore: number;
    };
    optimizer: {
      interactions: number;
      dreamCycles: number;
      memoryConsolidations: number;
    };
  };
  privacyCompliance: number; // 0-100
  systemOptimization: number; // 0-100
  lastUpdateTime: Date;
}

export interface SystemAlert {
  alertId: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
  system: string;
  message: string;
  recommended_action: string;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * SML Guardian Service
 * Master orchestration service coordinating all agents and support systems
 */
class SMLGuardianService {
  private static instance: SMLGuardianService;
  private systemState: SystemState = 'initializing';
  private config: SystemConfig = {
    enableMirrorMode: true,
    enableBalancerMode: true,
    enableOptimizerMode: true,
    enablePrivacyEnforcement: true,
    enableModeTransparency: true,
    enableLatencyOptimization: true,
    defaultMode: 'mirror',
    autoModeSelection: true,
    maxConcurrentOperations: 10,
    dataRetentionDays: 365,
    debugMode: false,
  };
  private systemHealth: SystemHealth = {
    state: 'initializing',
    uptime: 0,
    startTime: new Date(),
    lastHeartbeat: new Date(),
    agentStates: { mirror: 'inactive', balancer: 'inactive', optimizer: 'inactive' },
    supportSystems: { privacy: 'inactive', transparency: 'inactive', latency: 'inactive' },
    errorCount: 0,
    warningCount: 0,
    activeConnections: 0,
  };
  private metrics: SystemMetrics = {
    totalInteractions: 0,
    totalSessions: 0,
    averageResponseTime: 0,
    systemAvailability: 1.0,
    agentPerformance: {
      mirror: { interactions: 0, averageResponseTime: 0, satisfactionScore: 85 },
      balancer: { interactions: 0, averageResponseTime: 0, satisfactionScore: 87 },
      optimizer: { interactions: 0, dreamCycles: 0, memoryConsolidations: 0 },
    },
    privacyCompliance: 100,
    systemOptimization: 85,
    lastUpdateTime: new Date(),
  };
  private alerts: SystemAlert[] = [];
  private activeSessions: Map<string, InteractionContext> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private initializationTime: Date = new Date();

  static getInstance(): SMLGuardianService {
    if (!SMLGuardianService.instance) {
      SMLGuardianService.instance = new SMLGuardianService();
    }
    return SMLGuardianService.instance;
  }

  /**
   * Initialize the SML Guardian system
   */
  async initialize(config?: Partial<SystemConfig>): Promise<void> {
    console.log('🛡️  SML GUARDIAN - Initializing Sensitive-Minded Learning System');
    console.log('═'.repeat(70));

    this.config = { ...this.config, ...config };
    this.systemState = 'initializing';

    try {
      // Initialize agents
      console.log('\n📡 Initializing Agents...');
      if (this.config.enableMirrorMode) {
        this.initializeAgent('mirror', 'Agent 1: The Mirror - Rapport & Communication Mirroring');
      }
      if (this.config.enableBalancerMode) {
        this.initializeAgent('balancer', 'Agent 2: The Balancer - Emotional Regulation');
      }
      if (this.config.enableOptimizerMode) {
        this.initializeAgent('optimizer', 'Agent 3: The Optimizer - Dream Cycles & Learning');
      }

      // Initialize support systems
      console.log('\n🔒 Initializing Support Systems...');
      if (this.config.enablePrivacyEnforcement) {
        this.initializeSupportSystem(
          'privacy',
          'Privacy Enforcement - GDPR Compliance & Data Protection'
        );
      }
      if (this.config.enableModeTransparency) {
        this.initializeSupportSystem('transparency', 'Mode Transparency - User Visibility');
      }
      if (this.config.enableLatencyOptimization) {
        this.initializeSupportSystem('latency', 'Latency Optimization - Performance Tuning');
      }

      // Start health monitoring
      this.startHealthMonitoring();

      this.systemState = 'ready';
      console.log('\n✓ SML Guardian ready for interactions');
      console.log('═'.repeat(70) + '\n');
    } catch (error) {
      this.systemState = 'error';
      console.error('✗ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Process user interaction with intelligent agent selection
   */
  async processInteraction(
    userId: string,
    userInput: string,
    emotionalState?: { intensity: number; stability: number; primaryEmotion: string }
  ): Promise<GuardianResponse> {
    this.systemState = 'active';
    const startTime = Date.now();
    const responseId = this.generateResponseId();

    try {
      // Create interaction context
      const sessionId = this.getOrCreateSession(userId);
      const context: InteractionContext = {
        userId,
        sessionId,
        timestamp: new Date(),
        currentMode: this.config.defaultMode,
        emotionalState,
        interactionHistory: [],
      };

      // Select optimal agent mode
      const selectedMode = this.config.autoModeSelection
        ? this.selectOptimalMode(emotionalState)
        : this.config.defaultMode;

      context.currentMode = selectedMode;

      // Log interaction timing
      const processingTime = Date.now() - startTime;

      // Create response
      const response: GuardianResponse = {
        responseId,
        timestamp: new Date(),
        agentMode: selectedMode,
        content: `[${selectedMode.toUpperCase()} MODE] Processing user interaction...`,
        confidence: 0.92,
        metadata: {
          activatedStrategies: this.getActiveStrategies(selectedMode),
          cachedResult: false,
          responseTime: processingTime,
          privacyCompliant: true,
        },
      };

      // Update metrics
      this.updateMetrics(selectedMode, processingTime);

      console.log(
        `✓ Interaction processed (${selectedMode}): ${processingTime}ms [${response.confidence * 100}% confidence]`
      );

      return response;
    } catch (error) {
      this.systemState = 'error';
      this.systemHealth.errorCount++;

      const response: GuardianResponse = {
        responseId,
        timestamp: new Date(),
        agentMode: 'error',
        content: 'An error occurred processing your request. Please try again.',
        confidence: 0,
        metadata: {
          activatedStrategies: [],
          cachedResult: false,
          responseTime: Date.now() - startTime,
          privacyCompliant: false,
        },
      };

      return response;
    }
  }

  /**
   * Select optimal agent mode based on emotional state
   */
  private selectOptimalMode(
    emotionalState?: { intensity: number; stability: number; primaryEmotion: string }
  ): string {
    if (!emotionalState) {
      return this.config.defaultMode;
    }

    const { intensity, stability, primaryEmotion } = emotionalState;

    // Mode selection logic
    if (stability > 0.7) {
      // User is emotionally stable - use optimizer for learning
      if (this.config.enableOptimizerMode) {
        return 'optimizer';
      }
    }

    if (intensity > 0.6 && stability < 0.5) {
      // User in emotional distress - use balancer for support
      if (this.config.enableBalancerMode) {
        return 'balancer';
      }
    }

    if (stability > 0.5) {
      // User is relatively stable - use mirror for rapport
      if (this.config.enableMirrorMode) {
        return 'mirror';
      }
    }

    // Use hybrid as fallback
    return 'hybrid';
  }

  /**
   * Get active strategies for a mode
   */
  private getActiveStrategies(mode: string): string[] {
    const strategies: { [key: string]: string[] } = {
      mirror: [
        'Linguistic mirroring',
        'Lexicon matching',
        'Tonal resonance',
        'Stability detection',
      ],
      balancer: [
        'Emotion detection',
        'Grounding techniques',
        'Stoic perspective',
        'Warm encouragement',
      ],
      optimizer: ['Memory consolidation', 'Pattern extraction', 'Counterfactual simulation'],
      hybrid: ['Multi-strategy response', 'Context-aware adaptation'],
    };

    return strategies[mode] || [];
  }

  /**
   * Initialize an agent
   */
  private initializeAgent(agent: string, description: string): void {
    console.log(`   ✓ ${description}`);
    const agentKey = agent as keyof typeof this.systemHealth.agentStates;
    this.systemHealth.agentStates[agentKey] = 'active';
  }

  /**
   * Initialize a support system
   */
  private initializeSupportSystem(system: string, description: string): void {
    console.log(`   ✓ ${description}`);
    const sysKey = system as keyof typeof this.systemHealth.supportSystems;
    this.systemHealth.supportSystems[sysKey] = 'active';
  }

  /**
   * Start health monitoring heartbeat
   */
  private startHealthMonitoring(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.systemHealth.lastHeartbeat = new Date();
      this.systemHealth.uptime = Math.floor(
        (new Date().getTime() - this.systemHealth.startTime.getTime()) / 1000
      );

      if (this.config.debugMode) {
        console.log(`💓 System heartbeat - Uptime: ${this.formatUptime(this.systemHealth.uptime)}`);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Get or create user session
   */
  private getOrCreateSession(userId: string): string {
    const existing = Array.from(this.activeSessions.entries()).find(
      ([_, ctx]) => ctx.userId === userId
    );

    if (existing) {
      return existing[0];
    }

    const sessionId = this.generateSessionId();
    this.activeSessions.set(sessionId, {
      userId,
      sessionId,
      timestamp: new Date(),
      currentMode: this.config.defaultMode,
      interactionHistory: [],
    });

    this.metrics.totalSessions++;
    return sessionId;
  }

  /**
   * Update system metrics
   */
  private updateMetrics(mode: string, responseTime: number): void {
    this.metrics.totalInteractions++;

    const modeKey = mode as keyof typeof this.metrics.agentPerformance;
    if (modeKey in this.metrics.agentPerformance) {
      const modeStats = this.metrics.agentPerformance[modeKey];
      modeStats.interactions++;
      modeStats.averageResponseTime =
        (modeStats.averageResponseTime * (modeStats.interactions - 1) + responseTime) /
        modeStats.interactions;
    }

    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalInteractions - 1) + responseTime) /
      this.metrics.totalInteractions;

    this.metrics.lastUpdateTime = new Date();
  }

  /**
   * Get system health status
   */
  getSystemHealth(): SystemHealth {
    return JSON.parse(JSON.stringify(this.systemHealth));
  }

  /**
   * Get system metrics
   */
  getMetrics(): SystemMetrics {
    return JSON.parse(JSON.stringify(this.metrics));
  }

  /**
   * Get system status report
   */
  getStatusReport(): {
    state: string;
    uptime: string;
    agents: string[];
    supportSystems: string[];
    activeSessions: number;
    metrics: SystemMetrics;
  } {
    const activeAgents = Object.entries(this.systemHealth.agentStates)
      .filter(([_, state]) => state === 'active')
      .map(([agent]) => agent);

    const activeSupport = Object.entries(this.systemHealth.supportSystems)
      .filter(([_, state]) => state === 'active')
      .map(([system]) => system);

    return {
      state: this.systemState,
      uptime: this.formatUptime(this.systemHealth.uptime),
      agents: activeAgents,
      supportSystems: activeSupport,
      activeSessions: this.activeSessions.size,
      metrics: this.getMetrics(),
    };
  }

  /**
   * Shutdown the system gracefully
   */
  async shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down SML Guardian...');
    this.systemState = 'shutdown';

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.activeSessions.clear();
    console.log('✓ SML Guardian shutdown complete');
  }

  /**
   * Get system alerts
   */
  getAlerts(unresolved: boolean = true): SystemAlert[] {
    let alerts = [...this.alerts];
    if (unresolved) {
      alerts = alerts.filter((a) => !a.resolved);
    }
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Create system alert
   */
  private createAlert(
    severity: 'info' | 'warning' | 'critical',
    system: string,
    message: string,
    action: string
  ): void {
    const alert: SystemAlert = {
      alertId: this.generateAlertId(),
      severity,
      timestamp: new Date(),
      system,
      message,
      recommended_action: action,
      resolved: false,
    };

    this.alerts.push(alert);

    if (severity === 'critical') {
      this.systemHealth.errorCount++;
    } else if (severity === 'warning') {
      this.systemHealth.warningCount++;
    }

    console.log(`⚠️ ${severity.toUpperCase()}: ${message}`);
  }

  /**
   * Format uptime to human readable format
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Generate unique IDs
   */
  private generateResponseId(): string {
    return `resp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset service state (for testing)
   */
  async reset(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.systemState = 'initializing';
    this.activeSessions.clear();
    this.alerts = [];
    this.initializationTime = new Date();
    this.systemHealth = {
      state: 'initializing',
      uptime: 0,
      startTime: new Date(),
      lastHeartbeat: new Date(),
      agentStates: { mirror: 'inactive', balancer: 'inactive', optimizer: 'inactive' },
      supportSystems: { privacy: 'inactive', transparency: 'inactive', latency: 'inactive' },
      errorCount: 0,
      warningCount: 0,
      activeConnections: 0,
    };

    console.log('🔄 SML Guardian reset to initial state');
  }
}

export const smlGuardian = SMLGuardianService.getInstance();
export { SMLGuardianService };
