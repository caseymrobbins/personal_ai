/**
 * Voice Service for SML Guardian
 *
 * Provides voice interaction capabilities:
 * - Speech-to-Text (STT) using Web Speech API
 * - Text-to-Speech (TTS) using Web Speech API
 * - Voice settings management
 * - Browser compatibility detection
 */

/// <reference path="../types/speech.d.ts" />

/**
 * Voice configuration
 */
export interface VoiceConfig {
  sttEnabled: boolean;
  ttsEnabled: boolean;
  ttsVoice: string | null; // Voice name
  ttsRate: number; // 0.1 to 10
  ttsPitch: number; // 0 to 2
  ttsVolume: number; // 0 to 1
  sttLanguage: string; // e.g., 'en-US'
  sttContinuous: boolean;
  sttInterimResults: boolean;
}

/**
 * Speech recognition result
 */
export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

/**
 * Voice service events
 */
export type VoiceServiceEvent =
  | { type: 'stt-start' }
  | { type: 'stt-result'; result: SpeechRecognitionResult }
  | { type: 'stt-end' }
  | { type: 'stt-error'; error: string }
  | { type: 'tts-start'; text: string }
  | { type: 'tts-end' }
  | { type: 'tts-error'; error: string };

type VoiceEventListener = (event: VoiceServiceEvent) => void;

class VoiceService {
  private config: VoiceConfig = {
    sttEnabled: true,
    ttsEnabled: true,
    ttsVoice: null,
    ttsRate: 1.0,
    ttsPitch: 1.0,
    ttsVolume: 1.0,
    sttLanguage: 'en-US',
    sttContinuous: false,
    sttInterimResults: true,
  };

  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private isSpeaking = false;
  private listeners: VoiceEventListener[] = [];

  constructor() {
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
  }

  /**
   * Check if browser supports Speech Recognition
   */
  isSpeechRecognitionSupported(): boolean {
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  /**
   * Check if browser supports Speech Synthesis
   */
  isSpeechSynthesisSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Initialize Speech Recognition (STT)
   */
  private initializeSpeechRecognition(): void {
    if (!this.isSpeechRecognitionSupported()) {
      console.warn('[Voice] Speech Recognition not supported in this browser');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    this.recognition = new SpeechRecognition();

    if (!this.recognition) {
      return;
    }

    this.recognition.continuous = this.config.sttContinuous;
    this.recognition.interimResults = this.config.sttInterimResults;
    this.recognition.lang = this.config.sttLanguage;

    // Event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      this.emit({ type: 'stt-start' });
      console.log('[Voice] 🎤 Speech recognition started');
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;

      this.emit({
        type: 'stt-result',
        result: { transcript, confidence, isFinal },
      });

      console.log(`[Voice] 📝 Recognized: "${transcript}" (${isFinal ? 'final' : 'interim'})`);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.emit({ type: 'stt-end' });
      console.log('[Voice] 🎤 Speech recognition ended');
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.isListening = false;
      const error = `Speech recognition error: ${event.error}`;
      this.emit({ type: 'stt-error', error });
      console.error('[Voice] ❌ Speech recognition error:', event.error);
    };
  }

  /**
   * Initialize Speech Synthesis (TTS)
   */
  private initializeSpeechSynthesis(): void {
    if (!this.isSpeechSynthesisSupported()) {
      console.warn('[Voice] Speech Synthesis not supported in this browser');
      return;
    }

    this.synthesis = window.speechSynthesis;
  }

  /**
   * Start listening for speech input
   */
  startListening(): void {
    if (!this.config.sttEnabled) {
      console.warn('[Voice] STT is disabled');
      return;
    }

    if (!this.recognition) {
      console.error('[Voice] Speech recognition not initialized');
      return;
    }

    if (this.isListening) {
      console.warn('[Voice] Already listening');
      return;
    }

    try {
      this.recognition.start();
    } catch (err) {
      console.error('[Voice] Failed to start speech recognition:', err);
      this.emit({
        type: 'stt-error',
        error: err instanceof Error ? err.message : 'Failed to start',
      });
    }
  }

  /**
   * Stop listening for speech input
   */
  stopListening(): void {
    if (!this.recognition || !this.isListening) {
      return;
    }

    try {
      this.recognition.stop();
    } catch (err) {
      console.error('[Voice] Failed to stop speech recognition:', err);
    }
  }

  /**
   * Speak text using TTS
   */
  speak(text: string): void {
    if (!this.config.ttsEnabled) {
      console.warn('[Voice] TTS is disabled');
      return;
    }

    if (!this.synthesis) {
      console.error('[Voice] Speech synthesis not initialized');
      return;
    }

    // Cancel any ongoing speech
    this.stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);

    // Apply voice settings
    utterance.rate = this.config.ttsRate;
    utterance.pitch = this.config.ttsPitch;
    utterance.volume = this.config.ttsVolume;
    utterance.lang = this.config.sttLanguage; // Use same language as STT

    // Set voice if specified
    if (this.config.ttsVoice) {
      const voices = this.synthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === this.config.ttsVoice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // Event handlers
    utterance.onstart = () => {
      this.isSpeaking = true;
      this.emit({ type: 'tts-start', text });
      console.log('[Voice] 🔊 Speaking:', text.substring(0, 50) + '...');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.emit({ type: 'tts-end' });
      console.log('[Voice] 🔊 Finished speaking');
    };

    utterance.onerror = (event) => {
      this.isSpeaking = false;
      const error = `TTS error: ${event.error}`;
      this.emit({ type: 'tts-error', error });
      console.error('[Voice] ❌ TTS error:', event.error);
    };

    this.synthesis.speak(utterance);
  }

  /**
   * Stop speaking
   */
  stopSpeaking(): void {
    if (!this.synthesis) {
      return;
    }

    if (this.isSpeaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.emit({ type: 'tts-end' });
    }
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) {
      return [];
    }

    return this.synthesis.getVoices();
  }

  /**
   * Update voice configuration
   */
  updateConfig(updates: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...updates };

    // Update recognition settings if changed
    if (this.recognition && this.isSpeechRecognitionSupported()) {
      if (updates.sttLanguage !== undefined) {
        this.recognition.lang = updates.sttLanguage;
      }
      if (updates.sttContinuous !== undefined) {
        this.recognition.continuous = updates.sttContinuous;
      }
      if (updates.sttInterimResults !== undefined) {
        this.recognition.interimResults = updates.sttInterimResults;
      }
    }

    console.log('[Voice] Configuration updated:', updates);
  }

  /**
   * Get current configuration
   */
  getConfig(): VoiceConfig {
    return { ...this.config };
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Check if currently speaking
   */
  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: VoiceEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: VoiceEventListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: VoiceServiceEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (err) {
        console.error('[Voice] Error in event listener:', err);
      }
    });
  }

  /**
   * Get browser compatibility information
   */
  getCompatibilityInfo(): {
    sttSupported: boolean;
    ttsSupported: boolean;
    sttBrowser: string;
    ttsBrowser: string;
  } {
    return {
      sttSupported: this.isSpeechRecognitionSupported(),
      ttsSupported: this.isSpeechSynthesisSupported(),
      sttBrowser: this.isSpeechRecognitionSupported()
        ? (window as any).SpeechRecognition ? 'Standard' : 'WebKit'
        : 'Not Supported',
      ttsBrowser: this.isSpeechSynthesisSupported() ? 'Supported' : 'Not Supported',
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopListening();
    this.stopSpeaking();
    this.listeners = [];
  }
}

export const voiceService = new VoiceService();
