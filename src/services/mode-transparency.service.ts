/**
 * MODE TRANSPARENCY SYSTEM
 * ========================
 * Provides complete visibility into which agent mode is active
 * Explains why mode changes occur and what behaviors are active
 *
 * Transparency Principles:
 * - Users always know which mode is active
 * - Mode transitions are clearly communicated
 * - Reasons for mode changes are explained
 * - Active behaviors and strategies are visible
 * - Performance metrics for each mode are accessible
 */

export type AgentMode = 'mirror' | 'balancer' | 'optimizer' | 'hybrid';
export type ModeReason =
  | 'emotional-stability'
  | 'emotional-volatility'
  | 'idle-time'
  | 'user-request'
  | 'system-default'
  | 'learning-opportunity'
  | 'recovery-needed'
  | 'scheduled-cycle';

export interface ModeState {
  currentMode: AgentMode;
  reason: ModeReason;
  confidence: number; // 0-1, confidence in mode selection
  activeStrategies: string[];
  inactiveStrategies: string[];
  transitionTime: Date;
  estimatedDurationMinutes?: number;
  nextExpectedTransition?: Date;
}

export interface ModeCharacteristics {
  mode: AgentMode;
  description: string;
  purpose: string;
  targetEmotionalStates: string[];
  activeStrategies: string[];
  inactiveStrategies: string[];
  staminaRequirement: 'low' | 'medium' | 'high';
  responseLatency: number; // ms
  contextRetention: number; // 0-1, how much context is retained
  creativeThinking: number; // 0-1, encourages novel approaches
  emotionalEmpathy: number; // 0-1, emotional responsiveness
  analyticalThinking: number; // 0-1, logical reasoning
  memoryIntegration: number; // 0-1, uses past learnings
}

export interface ModeTransition {
  transitionId: string;
  fromMode: AgentMode;
  toMode: AgentMode;
  reason: ModeReason;
  timestamp: Date;
  triggeringEvent?: string;
  userNotified: boolean;
  explanation: string;
  confidence: number;
  metricsImpact: {
    emotionalStabilityChange: number;
    responseSpeedChange: number;
    contextRetentionChange: number;
  };
}

export interface TransparencyNotification {
  notificationId: string;
  type: 'mode-active' | 'mode-transition' | 'strategy-change' | 'capability-notice';
  timestamp: Date;
  title: string;
  message: string;
  details: string;
  modeAffected: AgentMode;
  userAcknowledged: boolean;
  acknowledgedAt?: Date;
}

export interface ModePerformanceMetrics {
  mode: AgentMode;
  totalActiveSessions: number;
  totalInteractions: number;
  averageSessionDuration: number;
  userSatisfactionScore: number; // 0-100
  responseAccuracy: number; // 0-100
  memoryRecallAccuracy: number; // 0-100
  emotionalSupportEffectiveness: number; // 0-100
  learningProgressRate: number; // 0-100
}

export interface ModeCapabilityNotice {
  noticeId: string;
  mode: AgentMode;
  capability: string;
  isActive: boolean;
  description: string;
  limitations?: string;
  estimatedAccuracy: number; // 0-100
}

export interface TransparencySettings {
  detailedNotifications: boolean;
  notifyOnModeTransition: boolean;
  notifyOnStrategyChange: boolean;
  showConfidenceScores: boolean;
  showMetricsData: boolean;
  showActiveBehaviors: boolean;
  explanationLevel: 'minimal' | 'standard' | 'detailed';
  languageForExplanations: 'simple' | 'technical' | 'mixed';
}

export interface TransparencyMetrics {
  totalNotificationsSent: number;
  totalTransitions: number;
  averageModeStability: number; // 0-1
  userUnderstanding: number; // 0-100, how well user understands active mode
  notificationAcknowledgmentRate: number; // 0-1
  modeChangeFrequency: number; // per hour
  lastTransitionTime: Date | null;
}

/**
 * Mode Transparency Service
 * Ensures users understand which mode is active and why
 */
class ModeTransparencyService {
  private static instance: ModeTransparencyService;
  private currentModeState: ModeState | null = null;
  private modeTransitionHistory: ModeTransition[] = [];
  private notificationQueue: TransparencyNotification[] = [];
  private modeCharacteristics: Map<AgentMode, ModeCharacteristics> = new Map();
  private performanceMetrics: Map<AgentMode, ModePerformanceMetrics> = new Map();
  private transparencySettings: TransparencySettings = {
    detailedNotifications: true,
    notifyOnModeTransition: true,
    notifyOnStrategyChange: true,
    showConfidenceScores: true,
    showMetricsData: true,
    showActiveBehaviors: true,
    explanationLevel: 'standard',
    languageForExplanations: 'mixed',
  };
  private metrics: TransparencyMetrics = {
    totalNotificationsSent: 0,
    totalTransitions: 0,
    averageModeStability: 0,
    userUnderstanding: 0,
    notificationAcknowledgmentRate: 0,
    modeChangeFrequency: 0,
    lastTransitionTime: null,
  };

  static getInstance(): ModeTransparencyService {
    if (!ModeTransparencyService.instance) {
      ModeTransparencyService.instance = new ModeTransparencyService();
    }
    return ModeTransparencyService.instance;
  }

  /**
   * Initialize transparency service with mode characteristics
   */
  initialize(): void {
    this.initializeModeCharacteristics();
    this.initializePerformanceMetrics();
    console.log('📢 Mode Transparency Service initialized');
    console.log(`   Modes configured: ${this.modeCharacteristics.size}`);
  }

  /**
   * Initialize mode characteristics and behaviors
   */
  private initializeModeCharacteristics(): void {
    const characteristics: ModeCharacteristics[] = [
      {
        mode: 'mirror',
        description: 'The Mirror - Rapport Building & Communication Mirroring',
        purpose:
          'Builds trust and connection through linguistic mirroring and tonal alignment',
        targetEmotionalStates: [
          'anxiety',
          'disconnection',
          'lack-of-trust',
          'unfamiliarity',
        ],
        activeStrategies: [
          'Linguistic mirroring',
          'Lexicon matching',
          'Syntax alignment',
          'Tonal resonance',
          'Stability detection',
        ],
        inactiveStrategies: [
          'Emotional regulation',
          'Goal directive',
          'Analytical reasoning',
          'Counterfactual simulation',
        ],
        staminaRequirement: 'low',
        responseLatency: 100,
        contextRetention: 0.9,
        creativeThinking: 0.4,
        emotionalEmpathy: 0.8,
        analyticalThinking: 0.3,
        memoryIntegration: 0.5,
      },
      {
        mode: 'balancer',
        description: 'The Balancer - Emotional Regulation & Response Optimization',
        purpose:
          'Supports emotional regulation and provides multi-strategy responses tailored to emotional state',
        targetEmotionalStates: [
          'emotional-distress',
          'overwhelm',
          'fear',
          'anger',
          'sadness',
        ],
        activeStrategies: [
          'Emotion detection',
          'State-response mapping',
          'Grounding techniques',
          'Stoic perspective',
          'Directive guidance',
          'Warm encouragement',
        ],
        inactiveStrategies: [
          'Linguistic mirroring',
          'Long-term learning',
          'Counterfactual simulation',
        ],
        staminaRequirement: 'high',
        responseLatency: 200,
        contextRetention: 0.7,
        creativeThinking: 0.6,
        emotionalEmpathy: 1.0,
        analyticalThinking: 0.7,
        memoryIntegration: 0.6,
      },
      {
        mode: 'optimizer',
        description: 'The Optimizer - Self-Reflection & Long-Term Learning',
        purpose:
          'Enables dream cycles for memory consolidation, counterfactual simulation, and profile evolution',
        targetEmotionalStates: [
          'idle',
          'post-interaction',
          'learning-opportunities',
          'stable',
        ],
        activeStrategies: [
          'Memory consolidation',
          'Pattern extraction',
          'Counterfactual simulation',
          'Profile evolution tracking',
          'Data analysis',
        ],
        inactiveStrategies: [
          'Real-time emotional support',
          'Linguistic mirroring',
          'Immediate response',
        ],
        staminaRequirement: 'low',
        responseLatency: 5000,
        contextRetention: 1.0,
        creativeThinking: 0.9,
        emotionalEmpathy: 0.3,
        analyticalThinking: 1.0,
        memoryIntegration: 1.0,
      },
      {
        mode: 'hybrid',
        description: 'Hybrid - Combining Multiple Agent Capabilities',
        purpose:
          'Blends mirror, balancer, and optimizer capabilities for complex situations',
        targetEmotionalStates: [
          'complex-emotions',
          'multi-layered-issues',
          'growth-with-support',
        ],
        activeStrategies: [
          'Linguistic mirroring',
          'Emotion detection',
          'Pattern analysis',
          'Flexible response generation',
          'Memory integration',
        ],
        inactiveStrategies: [],
        staminaRequirement: 'high',
        responseLatency: 300,
        contextRetention: 0.95,
        creativeThinking: 0.8,
        emotionalEmpathy: 0.9,
        analyticalThinking: 0.8,
        memoryIntegration: 0.9,
      },
    ];

    characteristics.forEach((c) => {
      this.modeCharacteristics.set(c.mode, c);
    });
  }

  /**
   * Initialize performance metrics for each mode
   */
  private initializePerformanceMetrics(): void {
    const modes: AgentMode[] = ['mirror', 'balancer', 'optimizer', 'hybrid'];

    modes.forEach((mode) => {
      this.performanceMetrics.set(mode, {
        mode,
        totalActiveSessions: 0,
        totalInteractions: 0,
        averageSessionDuration: 0,
        userSatisfactionScore: 85,
        responseAccuracy: 92,
        memoryRecallAccuracy: 88,
        emotionalSupportEffectiveness: 87,
        learningProgressRate: 84,
      });
    });
  }

  /**
   * Set the active mode and create transition record
   */
  setActiveMode(
    newMode: AgentMode,
    reason: ModeReason,
    activeStrategies: string[],
    confidence: number = 0.9,
    triggeringEvent?: string
  ): ModeState {
    const now = new Date();
    const previousMode = this.currentModeState?.currentMode;

    // Create transition record if mode is changing
    if (previousMode && previousMode !== newMode) {
      const transition: ModeTransition = {
        transitionId: this.generateTransitionId(),
        fromMode: previousMode,
        toMode: newMode,
        reason,
        timestamp: now,
        triggeringEvent,
        userNotified: false,
        explanation: this.generateTransitionExplanation(previousMode, newMode, reason),
        confidence,
        metricsImpact: this.calculateMetricsImpact(previousMode, newMode),
      };

      this.modeTransitionHistory.push(transition);
      this.metrics.totalTransitions++;
      this.metrics.lastTransitionTime = now;

      // Notify user of transition if enabled
      if (this.transparencySettings.notifyOnModeTransition) {
        this.createModeNotification(
          'mode-transition',
          `Switching to ${newMode} mode`,
          transition.explanation,
          newMode,
          transition.transitionId
        );
        transition.userNotified = true;
      }

      console.log(
        `🔄 Mode transition: ${previousMode.toUpperCase()} → ${newMode.toUpperCase()}`
      );
      console.log(`   Reason: ${reason}`);
      console.log(`   Confidence: ${(confidence * 100).toFixed(0)}%`);
    }

    const characteristics = this.modeCharacteristics.get(newMode)!;
    this.currentModeState = {
      currentMode: newMode,
      reason,
      confidence,
      activeStrategies,
      inactiveStrategies: characteristics.inactiveStrategies,
      transitionTime: now,
      nextExpectedTransition: this.calculateNextTransition(newMode, reason),
    };

    // Send mode active notification if enabled
    if (this.transparencySettings.notifyOnModeTransition && !previousMode) {
      this.createModeNotification(
        'mode-active',
        `${newMode.toUpperCase()} mode active`,
        characteristics.description,
        newMode
      );
    }

    return this.currentModeState;
  }

  /**
   * Get current mode state with full details
   */
  getCurrentModeState(): ModeState | null {
    return this.currentModeState;
  }

  /**
   * Get detailed information about the current mode
   */
  getCurrentModeDetails(): {
    state: ModeState;
    characteristics: ModeCharacteristics;
    metrics: ModePerformanceMetrics;
  } | null {
    if (!this.currentModeState) {
      return null;
    }

    const characteristics = this.modeCharacteristics.get(this.currentModeState.currentMode)!;
    const metrics = this.performanceMetrics.get(this.currentModeState.currentMode)!;

    return { state: this.currentModeState, characteristics, metrics };
  }

  /**
   * Get all pending notifications for user
   */
  getPendingNotifications(onlyUnacknowledged: boolean = false): TransparencyNotification[] {
    let notifications = [...this.notificationQueue];

    if (onlyUnacknowledged) {
      notifications = notifications.filter((n) => !n.userAcknowledged);
    }

    return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Acknowledge a notification
   */
  acknowledgeNotification(notificationId: string): boolean {
    const notification = this.notificationQueue.find((n) => n.notificationId === notificationId);
    if (!notification) {
      return false;
    }

    notification.userAcknowledged = true;
    notification.acknowledgedAt = new Date();

    // Update understanding metric when user acknowledges
    this.metrics.userUnderstanding = Math.min(
      100,
      this.metrics.userUnderstanding + 2
    );

    console.log(`✓ Notification acknowledged: ${notificationId.slice(0, 8)}`);
    return true;
  }

  /**
   * Get mode transition history
   */
  getModeTransitionHistory(limit: number = 20): ModeTransition[] {
    return this.modeTransitionHistory.slice(-limit);
  }

  /**
   * Get explanation of current active behaviors
   */
  getActiveBehaviorsExplanation(): string {
    if (!this.currentModeState) {
      return 'No mode currently active';
    }

    const characteristics = this.modeCharacteristics.get(this.currentModeState.currentMode)!;

    let explanation = `Currently in ${this.currentModeState.currentMode.toUpperCase()} mode.\n\n`;
    explanation += `Purpose: ${characteristics.purpose}\n\n`;
    explanation += `Active strategies:\n`;
    this.currentModeState.activeStrategies.forEach((s) => {
      explanation += `• ${s}\n`;
    });

    if (this.currentModeState.inactiveStrategies.length > 0) {
      explanation += `\nCurrently inactive strategies:\n`;
      this.currentModeState.inactiveStrategies.slice(0, 3).forEach((s) => {
        explanation += `• ${s}\n`;
      });
    }

    explanation += `\nMode characteristics:\n`;
    explanation += `• Response latency: ${characteristics.responseLatency}ms\n`;
    explanation += `• Emotional empathy: ${(characteristics.emotionalEmpathy * 100).toFixed(0)}%\n`;
    explanation += `• Analytical thinking: ${(characteristics.analyticalThinking * 100).toFixed(0)}%\n`;
    explanation += `• Memory integration: ${(characteristics.memoryIntegration * 100).toFixed(0)}%\n`;

    return explanation;
  }

  /**
   * Update transparency settings
   */
  updateTransparencySettings(settings: Partial<TransparencySettings>): void {
    this.transparencySettings = { ...this.transparencySettings, ...settings };
    console.log('⚙️ Transparency settings updated');
    console.log(`   Detailed notifications: ${this.transparencySettings.detailedNotifications}`);
    console.log(`   Explanation level: ${this.transparencySettings.explanationLevel}`);
  }

  /**
   * Get transparency settings
   */
  getTransparencySettings(): TransparencySettings {
    return { ...this.transparencySettings };
  }

  /**
   * Get performance metrics for a mode
   */
  getModePerformanceMetrics(mode: AgentMode): ModePerformanceMetrics | null {
    return this.performanceMetrics.get(mode) || null;
  }

  /**
   * Get all mode characteristics
   */
  getAllModeCharacteristics(): ModeCharacteristics[] {
    return Array.from(this.modeCharacteristics.values());
  }

  /**
   * Get transparency metrics
   */
  getTransparencyMetrics(): TransparencyMetrics {
    return { ...this.metrics };
  }

  /**
   * Create a transparency notification
   */
  private createModeNotification(
    type: 'mode-active' | 'mode-transition' | 'strategy-change' | 'capability-notice',
    title: string,
    message: string,
    mode: AgentMode,
    relatedId?: string
  ): TransparencyNotification {
    const notification: TransparencyNotification = {
      notificationId: this.generateNotificationId(),
      type,
      timestamp: new Date(),
      title,
      message,
      details: this.getDetailedExplanation(type, mode),
      modeAffected: mode,
      userAcknowledged: false,
    };

    this.notificationQueue.push(notification);
    this.metrics.totalNotificationsSent++;

    console.log(`📢 Notification: ${title}`);
    if (this.transparencySettings.detailedNotifications) {
      console.log(`   ${message}`);
    }

    return notification;
  }

  /**
   * Generate transition explanation based on reason
   */
  private generateTransitionExplanation(from: AgentMode, to: AgentMode, reason: ModeReason): string {
    const reasons: { [key in ModeReason]: string } = {
      'emotional-stability': 'User is emotionally stable, switching to learning mode',
      'emotional-volatility':
        'User experiencing emotional changes, activating emotional support mode',
      'idle-time': 'System idle, initiating memory consolidation cycle',
      'user-request': 'Switching mode per user request',
      'system-default': 'Initializing to default system mode',
      'learning-opportunity': 'Detected learning opportunity, activating optimizer',
      'recovery-needed': 'User needs recovery support, activating balancer mode',
      'scheduled-cycle': 'Starting scheduled dream cycle in optimizer mode',
    };

    let explanation = `Transitioning from ${from} to ${to} mode: ${reasons[reason]}. `;
    explanation += `This mode is optimized for ${this.getTargetContext(to)}.`;

    return explanation;
  }

  /**
   * Get target context for a mode
   */
  private getTargetContext(mode: AgentMode): string {
    const contexts: { [key in AgentMode]: string } = {
      mirror: 'building rapport and understanding your communication style',
      balancer: 'supporting emotional regulation and wellbeing',
      optimizer: 'consolidating learning and supporting growth',
      hybrid: 'complex situations requiring multiple approaches',
    };
    return contexts[mode];
  }

  /**
   * Calculate expected metrics impact of mode transition
   */
  private calculateMetricsImpact(from: AgentMode, to: AgentMode) {
    const fromChar = this.modeCharacteristics.get(from)!;
    const toChar = this.modeCharacteristics.get(to)!;

    return {
      emotionalStabilityChange:
        toChar.emotionalEmpathy - fromChar.emotionalEmpathy,
      responseSpeedChange: -(toChar.responseLatency - fromChar.responseLatency) / 1000,
      contextRetentionChange: toChar.contextRetention - fromChar.contextRetention,
    };
  }

  /**
   * Calculate next expected transition time
   */
  private calculateNextTransition(mode: AgentMode, reason: ModeReason): Date | undefined {
    if (mode === 'optimizer' || reason === 'scheduled-cycle') {
      // Dream cycles last ~1 minute
      const nextTime = new Date();
      nextTime.setMinutes(nextTime.getMinutes() + 1);
      return nextTime;
    }

    if (reason === 'idle-time') {
      // Optimizer cycles are triggered by idle, may transition back to mirror/balancer
      const nextTime = new Date();
      nextTime.setMinutes(nextTime.getMinutes() + 5); // Rough estimate
      return nextTime;
    }

    return undefined;
  }

  /**
   * Get detailed explanation for notification type
   */
  private getDetailedExplanation(type: string, mode: AgentMode): string {
    const characteristics = this.modeCharacteristics.get(mode)!;

    if (type === 'mode-transition' || type === 'mode-active') {
      return `${characteristics.description}\n\nPurpose: ${characteristics.purpose}`;
    }

    return characteristics.description;
  }

  /**
   * Generate unique IDs
   */
  private generateTransitionId(): string {
    return `transition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateNotificationId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.currentModeState = null;
    this.modeTransitionHistory = [];
    this.notificationQueue = [];
    this.metrics = {
      totalNotificationsSent: 0,
      totalTransitions: 0,
      averageModeStability: 0,
      userUnderstanding: 0,
      notificationAcknowledgmentRate: 0,
      modeChangeFrequency: 0,
      lastTransitionTime: null,
    };
    console.log('🔄 Mode Transparency Service reset');
  }
}

export const modeTransparency = ModeTransparencyService.getInstance();
export { ModeTransparencyService };
