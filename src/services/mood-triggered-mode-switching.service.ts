/**
 * Mood-Triggered Mode Switching Service
 *
 * Orchestrates real-time transitions between Mirror Mode and Balancer Mode
 * based on detected emotional states and stability changes.
 *
 * Switching Logic:
 * - Continuous emotional monitoring
 * - Threshold-based mode selection
 * - Smooth transitions with context preservation
 * - Mood tracking with historical analysis
 * - Automatic re-evaluation on mood changes
 * - User preference override capabilities
 *
 * Modes:
 * - MIRROR MODE: User is stable, resonance/mirroring appropriate
 * - BALANCER MODE: User needs support, structured responses appropriate
 * - HYBRID MODE: Intelligent blending of both approaches
 */

import { advancedEmotionDetectionService, EmotionalState, PrimaryEmotion } from './advanced-emotion-detection.service';
import { stabilityDetectionService } from './stability-detection.service';
import { stateResponseMappingService } from './state-response-mapping.service';

export interface MoodState {
  userId: string;
  currentMode: 'mirror' | 'balancer' | 'hybrid';
  previousMode: 'mirror' | 'balancer' | 'hybrid' | null;
  emotionalState: EmotionalState;
  stabilityScore: number;
  moodIntensity: number;                    // 0.0-1.0
  moodValence: number;                      // -1.0 to +1.0
  triggerReason: string;
  switchTriggered: boolean;
  switchConfidence: number;                 // 0.0-1.0
  timeInCurrentMode: number;                // milliseconds
  timestamp: number;
}

export interface MoodHistory {
  userId: string;
  moodStates: MoodState[];
  moodTrend: 'improving' | 'declining' | 'stable' | 'volatile';
  averageIntensity: number;
  averageValence: number;
  criticalEvents: CriticalEvent[];
  lastModeSwitch: number;                   // timestamp
  modeSwithchFrequency: number;             // switches per hour
}

export interface CriticalEvent {
  timestamp: number;
  emotion: PrimaryEmotion;
  intensity: number;
  reason: string;
  mode: 'mirror' | 'balancer';
  intervention: string;
}

export interface MoodTransition {
  userId: string;
  fromMode: 'mirror' | 'balancer' | 'hybrid';
  toMode: 'mirror' | 'balancer' | 'hybrid';
  emotionalTrigger: PrimaryEmotion;
  transitionReason: string;
  contextPreservation: ContextPreservation;
  transitionSmoothing: TransitionSmoothing;
}

export interface ContextPreservation {
  maintain_conversation_history: boolean;
  preserve_user_preferences: boolean;
  keep_understanding_of_situation: boolean;
  retain_emotional_nuance: boolean;
}

export interface TransitionSmoothing {
  gradual_tone_shift: boolean;
  bridge_statement: string;
  technical_latency: number;                // milliseconds
}

/**
 * MoodTriggeredModeSwitchingService
 *
 * Manages mood-based mode transitions
 */
class MoodTriggeredModeSwitchingService {
  private moodHistory: Map<string, MoodHistory> = new Map();
  private activeMoodStates: Map<string, MoodState> = new Map();
  private modeStartTimes: Map<string, number> = new Map();
  private switchThresholds = {
    mirrorToBalancer: {
      stabilityScore: 0.55,
      emotionalIntensity: 0.65,
      negativeValence: -0.3,
    },
    balancerToMirror: {
      stabilityScore: 0.70,
      emotionalIntensity: 0.4,
    },
  };

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[MoodTriggeredModeSwitching] ✅ Service initialized');
  }

  /**
   * Evaluate current mood and determine if mode switch needed
   */
  evaluateMoodAndSwitch(userId: string, recentMessage?: string): MoodTransition | null {
    // Detect current emotional state
    const emotionalState = advancedEmotionDetectionService.detectEmotionalState(userId, recentMessage);
    const stabilityProfile = stabilityDetectionService.assessStability(userId, recentMessage);

    // Get current active mode
    const currentMoodState = this.activeMoodStates.get(userId);
    const currentMode = currentMoodState?.currentMode || 'mirror';

    // Determine if mode switch is needed
    const shouldSwitch = this.determineSwitchNeed(
      currentMode,
      emotionalState,
      stabilityProfile.overallStabilityScore
    );

    if (!shouldSwitch) {
      // Update current mood state without switching
      this.updateMoodState(userId, emotionalState, stabilityProfile.overallStabilityScore, currentMode);
      return null;
    }

    // Determine target mode
    const targetMode = this.selectTargetMode(emotionalState, stabilityProfile.overallStabilityScore);

    // Create transition
    const transition = this.createTransition(userId, currentMode, targetMode, emotionalState);

    // Execute mode switch
    this.executeModSwitch(userId, transition);

    console.log(
      `[MoodTriggeredModeSwitching] 🔄 Mode switch for user ${userId}: ` +
      `${currentMode.toUpperCase()} → ${targetMode.toUpperCase()} (${transition.transitionReason})`
    );

    return transition;
  }

  /**
   * Determine if mode switch is needed
   */
  private determineSwitchNeed(
    currentMode: 'mirror' | 'balancer' | 'hybrid',
    emotionalState: EmotionalState,
    stabilityScore: number
  ): boolean {
    const intensity = emotionalState.intensityScore;
    const valence = emotionalState.valence;
    const hasRiskFactors = emotionalState.riskFactors.length > 0;

    // Mirror to Balancer: High intensity, low stability, or risk factors
    if (currentMode === 'mirror') {
      if (stabilityScore < this.switchThresholds.mirrorToBalancer.stabilityScore) {
        return true;
      }
      if (intensity > this.switchThresholds.mirrorToBalancer.emotionalIntensity && valence < this.switchThresholds.mirrorToBalancer.negativeValence) {
        return true;
      }
      if (hasRiskFactors) {
        return true;
      }
    }

    // Balancer to Mirror: Stabilizing, lower intensity
    if (currentMode === 'balancer') {
      if (
        stabilityScore > this.switchThresholds.balancerToMirror.stabilityScore &&
        intensity < this.switchThresholds.balancerToMirror.emotionalIntensity
      ) {
        return true;
      }
      if (emotionalState.emotionalTrajectory === 'de-escalating' && intensity < 0.4) {
        return true;
      }
    }

    // Hybrid considerations
    if (currentMode === 'hybrid') {
      // Evaluate if should transition to pure mode
      if (stabilityScore > 0.75 && intensity < 0.3) {
        return true;  // Switch to Mirror
      }
      if (stabilityScore < 0.45 || intensity > 0.75) {
        return true;  // Switch to Balancer
      }
    }

    return false;
  }

  /**
   * Select target mode
   */
  private selectTargetMode(
    emotionalState: EmotionalState,
    stabilityScore: number
  ): 'mirror' | 'balancer' | 'hybrid' {
    const intensity = emotionalState.intensityScore;
    const valence = emotionalState.valence;
    const hasRiskFactors = emotionalState.riskFactors.length > 0;

    // Critical cases go to Balancer
    if (hasRiskFactors || stabilityScore < 0.3 || (intensity > 0.8 && valence < -0.5)) {
      return 'balancer';
    }

    // High intensity but stable: Hybrid
    if (intensity > 0.6 && stabilityScore > 0.5) {
      return 'hybrid';
    }

    // Moderate-high intensity: Balancer
    if (intensity > 0.65 && valence < -0.2) {
      return 'balancer';
    }

    // Stable and low intensity: Mirror
    if (stabilityScore > 0.65 && intensity < 0.4) {
      return 'mirror';
    }

    // Default based on stability
    if (stabilityScore > 0.6) {
      return 'mirror';
    } else if (stabilityScore > 0.4) {
      return 'hybrid';
    } else {
      return 'balancer';
    }
  }

  /**
   * Create transition object
   */
  private createTransition(
    userId: string,
    fromMode: 'mirror' | 'balancer' | 'hybrid',
    toMode: 'mirror' | 'balancer' | 'hybrid',
    emotionalState: EmotionalState
  ): MoodTransition {
    const transitionReasons: Record<string, string> = {
      'mirror-balancer': 'Emotional intensity increased or stability decreased',
      'balancer-mirror': 'Emotional state stabilized and intensity reduced',
      'mirror-hybrid': 'Moderate emotional intensity with maintained stability',
      'balancer-hybrid': 'Emotional intensity decreasing while still processing',
      'hybrid-mirror': 'Stabilization complete, returning to resonance mode',
      'hybrid-balancer': 'Emotion escalating, increase support level',
    };

    const reasonKey = `${fromMode}-${toMode}`;
    const transitionReason = transitionReasons[reasonKey] || 'Mood and stability changes warrant mode adjustment';

    // Create bridge statement for smooth transition
    const bridgeStatement = this.createBridgeStatement(fromMode, toMode, emotionalState.primaryEmotion);

    const transition: MoodTransition = {
      userId,
      fromMode,
      toMode,
      emotionalTrigger: emotionalState.primaryEmotion,
      transitionReason,
      contextPreservation: {
        maintain_conversation_history: true,
        preserve_user_preferences: true,
        keep_understanding_of_situation: true,
        retain_emotional_nuance: true,
      },
      transitionSmoothing: {
        gradual_tone_shift: true,
        bridge_statement: bridgeStatement,
        technical_latency: 50,  // milliseconds
      },
    };

    return transition;
  }

  /**
   * Create bridge statement for smooth transition
   */
  private createBridgeStatement(
    fromMode: 'mirror' | 'balancer' | 'hybrid',
    toMode: 'mirror' | 'balancer' | 'hybrid',
    emotion: PrimaryEmotion
  ): string {
    const statements: Record<string, string> = {
      'mirror-balancer-sadness': 'I notice you\'re carrying a lot of pain right now. I want to shift how I support you.',
      'mirror-balancer-anger': 'I can see this is really difficult. Let me focus on supporting you more directly.',
      'mirror-balancer-fear': 'I want to help you feel safer. Let me adjust my approach.',
      'balancer-mirror-sadness': 'You\'re finding your footing. I\'ll follow your lead more closely.',
      'balancer-mirror-anger': 'I see you\'re stabilizing. I\'ll tune more into your natural rhythm.',
      'hybrid-mirror': 'You\'re feeling more grounded. Let me align with your natural style.',
      'hybrid-balancer': 'I want to provide more direct support as things feel more intense.',
    };

    const key = `${fromMode}-${toMode}-${emotion}`;
    return statements[key] || 'I\'m adjusting how I support you based on how you\'re feeling.';
  }

  /**
   * Execute mode switch
   */
  private executeModSwitch(userId: string, transition: MoodTransition): void {
    const moodState = this.activeMoodStates.get(userId);

    if (moodState) {
      moodState.previousMode = moodState.currentMode;
    }

    // Update active mode
    const updatedMoodState: MoodState = {
      ...moodState,
      currentMode: transition.toMode,
      previousMode: moodState?.currentMode || null,
      triggerReason: transition.transitionReason,
      switchTriggered: true,
      switchConfidence: 0.85,
      timeInCurrentMode: 0,
      timestamp: Date.now(),
    } as MoodState;

    this.activeMoodStates.set(userId, updatedMoodState);
    this.modeStartTimes.set(userId, Date.now());

    // Record in history
    this.recordMoodStateInHistory(userId, updatedMoodState);
  }

  /**
   * Update mood state without switching
   */
  private updateMoodState(
    userId: string,
    emotionalState: EmotionalState,
    stabilityScore: number,
    currentMode: 'mirror' | 'balancer' | 'hybrid'
  ): void {
    const moodStartTime = this.modeStartTimes.get(userId) || Date.now();
    const timeInMode = Date.now() - moodStartTime;

    const moodState: MoodState = {
      userId,
      currentMode,
      previousMode: null,
      emotionalState,
      stabilityScore,
      moodIntensity: emotionalState.intensityScore,
      moodValence: emotionalState.valence,
      triggerReason: 'No mode switch needed',
      switchTriggered: false,
      switchConfidence: 0,
      timeInCurrentMode: timeInMode,
      timestamp: Date.now(),
    };

    this.activeMoodStates.set(userId, moodState);
  }

  /**
   * Record mood state in history
   */
  private recordMoodStateInHistory(userId: string, moodState: MoodState): void {
    let history = this.moodHistory.get(userId);

    if (!history) {
      history = {
        userId,
        moodStates: [],
        moodTrend: 'stable',
        averageIntensity: 0,
        averageValence: 0,
        criticalEvents: [],
        lastModeSwitch: Date.now(),
        modeSwithchFrequency: 0,
      };
    }

    // Add to history
    history.moodStates.push(moodState);

    // Keep only last 100 states
    if (history.moodStates.length > 100) {
      history.moodStates.shift();
    }

    // Update statistics
    this.updateHistoryStats(history);

    // Record critical events
    if (moodState.switchTriggered || moodState.emotionalState.riskFactors.length > 0) {
      history.criticalEvents.push({
        timestamp: moodState.timestamp,
        emotion: moodState.emotionalState.primaryEmotion,
        intensity: moodState.moodIntensity,
        reason: moodState.triggerReason,
        mode: moodState.currentMode,
        intervention: moodState.switchTriggered ? 'Mode switched' : 'High alert',
      });
    }

    // Update mode switch frequency
    if (moodState.switchTriggered) {
      history.lastModeSwitch = Date.now();
      const oneHourAgo = Date.now() - 3600000;
      const recentSwitches = history.criticalEvents.filter(e => e.timestamp > oneHourAgo && e.intervention === 'Mode switched').length;
      history.modeSwithchFrequency = recentSwitches;
    }

    this.moodHistory.set(userId, history);
  }

  /**
   * Update history statistics
   */
  private updateHistoryStats(history: MoodHistory): void {
    if (history.moodStates.length === 0) return;

    const recent = history.moodStates.slice(-20);  // Last 20 states

    // Average intensity
    history.averageIntensity = recent.reduce((sum, s) => sum + s.moodIntensity, 0) / recent.length;

    // Average valence
    history.averageValence = recent.reduce((sum, s) => sum + s.moodValence, 0) / recent.length;

    // Trend analysis
    if (recent.length > 1) {
      const first = recent[0].moodIntensity;
      const last = recent[recent.length - 1].moodIntensity;
      const difference = last - first;

      if (Math.abs(difference) > 0.2) {
        history.moodTrend = difference > 0 ? 'declining' : 'improving';
      } else {
        history.moodTrend = 'stable';
      }

      // Check for volatility
      const variance = recent.reduce((sum, s) => sum + Math.pow(s.moodIntensity - history.averageIntensity, 2), 0) / recent.length;
      if (variance > 0.1) {
        history.moodTrend = 'volatile';
      }
    }
  }

  /**
   * Get current mood for user
   */
  getCurrentMood(userId: string): MoodState | null {
    return this.activeMoodStates.get(userId) || null;
  }

  /**
   * Get mood history for user
   */
  getMoodHistory(userId: string): MoodHistory | null {
    return this.moodHistory.get(userId) || null;
  }

  /**
   * Get mode recommendation based on mood
   */
  getModeRecommendation(userId: string): {
    recommendedMode: 'mirror' | 'balancer' | 'hybrid';
    confidence: number;
    reason: string;
    alternatives: ('mirror' | 'balancer' | 'hybrid')[];
  } {
    const mood = this.activeMoodStates.get(userId);

    if (!mood) {
      return {
        recommendedMode: 'mirror',
        confidence: 0.5,
        reason: 'No recent mood data available',
        alternatives: ['balancer', 'hybrid'],
      };
    }

    const confidence = Math.min(1, mood.stabilityScore + (1 - mood.moodIntensity));

    const alternatives: ('mirror' | 'balancer' | 'hybrid')[] = [];
    if (mood.currentMode !== 'balancer') alternatives.push('balancer');
    if (mood.currentMode !== 'mirror') alternatives.push('mirror');
    if (mood.currentMode !== 'hybrid') alternatives.push('hybrid');

    return {
      recommendedMode: mood.currentMode,
      confidence,
      reason: mood.triggerReason,
      alternatives,
    };
  }

  /**
   * Override mode (manual control)
   */
  overrideMode(userId: string, forcedMode: 'mirror' | 'balancer' | 'hybrid', reason: string): void {
    const mood = this.activeMoodStates.get(userId);

    if (mood) {
      mood.previousMode = mood.currentMode;
      mood.currentMode = forcedMode;
      mood.triggerReason = `Manual override: ${reason}`;
    }

    this.modeStartTimes.set(userId, Date.now());
    console.log(`[MoodTriggeredModeSwitching] 🎮 Manual mode override for user ${userId}: ${forcedMode}`);
  }

  /**
   * Get mode switch statistics
   */
  getModeSwitchStats(userId: string): {
    totalSwitches: number;
    averageSwitchFrequency: number;
    criticalEventsCount: number;
    lastSwitchAge: number;
  } {
    const history = this.moodHistory.get(userId);

    if (!history) {
      return {
        totalSwitches: 0,
        averageSwitchFrequency: 0,
        criticalEventsCount: 0,
        lastSwitchAge: 0,
      };
    }

    const switchEvents = history.criticalEvents.filter(e => e.intervention === 'Mode switched');
    const lastSwitch = history.lastModeSwitch;
    const age = Date.now() - lastSwitch;

    return {
      totalSwitches: switchEvents.length,
      averageSwitchFrequency: history.modeSwithchFrequency,
      criticalEventsCount: history.criticalEvents.length,
      lastSwitchAge: age,
    };
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    this.moodHistory.clear();
    this.activeMoodStates.clear();
    this.modeStartTimes.clear();
    console.log('[MoodTriggeredModeSwitching] 🔄 Service reset');
  }
}

// Export singleton instance
export const moodTriggeredModeSwitchingService = new MoodTriggeredModeSwitchingService();
