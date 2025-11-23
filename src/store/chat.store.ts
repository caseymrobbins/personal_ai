/**
 * Chat State Store (Zustand)
 *
 * Global state management for the "Module-Aware" interface (Step 5)
 * This store tracks which AI module is currently "thinking" and provides
 * the "Humanity Override" mechanism via AbortController
 *
 * Based on Section 3.1: UI Architecture: The "Module-Aware" State
 */

import { create } from 'zustand';

/**
 * All possible states of the AI system
 * These states provide real-time transparency to the user (Step 5)
 */
export type ModuleState =
  | 'IDLE'              // No AI processing
  | 'LOCAL_ROUTING'     // SML Guardian is analyzing the prompt
  | 'SCRUBBING'         // Anonymizer is removing PII
  | 'EXTERNAL_API'      // Calling external LLM (OpenAI, Claude, etc.)
  | 'UNSCRUBBING'       // Anonymizer is de-anonymizing the response
  | 'LOCAL_PROCESSING'; // Local Guardian is processing the request

/**
 * Chat State Interface
 */
interface ChatState {
  // Current state of the AI system
  moduleState: ModuleState;

  // Name of external provider (e.g., 'OpenAI', 'Claude')
  // Only set when moduleState === 'EXTERNAL_API'
  externalProviderName: string | null;

  // AbortController for "Humanity Override" (Step 5)
  // Allows user to cancel any in-flight external API request
  currentAbortController: AbortController | null;

  // Current conversation ID
  currentConversationId: string | null;

  // Session master password (held in memory only)
  // Used for decrypting API keys (Step 3: BYOK)
  sessionMasterPassword: string | null;

  // Currently selected adapter ID (e.g., 'local_guardian', 'openai', 'anthropic')
  selectedAdapterId: string;

  // Actions
  setModuleState: (state: ModuleState, provider?: string) => void;
  setAbortController: (controller: AbortController | null) => void;
  setConversation: (conversationId: string | null) => void;
  setSessionPassword: (password: string | null) => void;
  setSelectedAdapter: (adapterId: string) => void;
  reset: () => void;
}

/**
 * Initial state
 */
const initialState = {
  moduleState: 'IDLE' as ModuleState,
  externalProviderName: null,
  currentAbortController: null,
  currentConversationId: null,
  sessionMasterPassword: null,
  selectedAdapterId: 'local_guardian', // Default to local AI
};

/**
 * Chat State Store
 *
 * Usage in components:
 * ```tsx
 * const { moduleState, externalProviderName } = useChatState();
 * ```
 */
export const useChatState = create<ChatState>((set: any) => ({
  ...initialState,

  /**
   * Update the current module state
   * @param state The new module state
   * @param provider Optional external provider name
   */
  setModuleState: (state: ModuleState, provider?: string) =>
    set({
      moduleState: state,
      externalProviderName: provider ?? null,
    }),

  /**
   * Set the AbortController for the current request
   * Used for "Humanity Override" - allows user to cancel external API calls
   * @param controller The AbortController or null to clear
   */
  setAbortController: (controller: AbortController | null) =>
    set({ currentAbortController: controller }),

  /**
   * Set the current conversation
   * @param conversationId The conversation ID or null
   */
  setConversation: (conversationId: string | null) =>
    set({ currentConversationId: conversationId }),

  /**
   * Set the session master password (in-memory only)
   * This password is NEVER persisted
   * @param password The master password or null to clear
   */
  setSessionPassword: (password: string | null) =>
    set({ sessionMasterPassword: password }),

  /**
   * Set the selected AI adapter
   * @param adapterId The adapter ID (e.g., 'local_guardian', 'openai', 'anthropic')
   */
  setSelectedAdapter: (adapterId: string) =>
    set({ selectedAdapterId: adapterId }),

  /**
   * Reset the store to initial state
   * Call this on logout or session end
   */
  reset: () => set(initialState),
}));
