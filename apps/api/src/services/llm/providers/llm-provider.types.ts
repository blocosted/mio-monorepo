/**
 * LLM Provider Types
 *
 * Defines the interface for LLM providers, separating the raw LLM interaction
 * from the business logic of script generation.
 */

import type { Model } from '@anthropic-ai/sdk/resources';
import type {
  EnrichedConcept,
  ScriptGenerationConstraints,
  VocabularyLevel,
} from '@mio/shared';
import type { Language } from '@mio/shared/types';

/**
 * Supported LLM providers
 */
export type LLMProviderType = 'openai' | 'anthropic' | 'mistral' | 'grok';

/**
 * LLM completion options
 */
export interface LLMCompletionOptions {
  /** Model identifier (provider-specific) */
  model?: Model;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Sampling temperature (0-2, lower = more deterministic) */
  temperature?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Top-p sampling (nucleus sampling) */
  topP?: number;
}

/**
 * Raw LLM response (before parsing)
 */
export interface LLMRawResponse {
  /** Raw JSON string from LLM */
  content: string;
  /** Tokens used in prompt */
  promptTokens?: number;
  /** Tokens used in completion */
  completionTokens?: number;
  /** Model used */
  model: Model;
}

/**
 * Context for story enrichment
 */
export interface EnrichmentContext {
  /** Initial story prompt */
  initialPrompt: string;
  /** Child's first name */
  childName: string;
  /** Child's age */
  childAge: number;
  /** Child's gender */
  childGender: string;
  /** Favorite themes to include */
  favoriteThemes: string[];
  /** Themes to avoid */
  avoidThemes: string[];
  /** Whether to include child as character */
  includeChildAsCharacter: boolean;
  /** Preferred hero gender */
  preferredHeroGender: 'same' | 'any';
  /** Target language */
  language: Language;
  /** Determined vocabulary level */
  vocabularyLevel: VocabularyLevel;
}

/**
 * Context for script generation
 */
export interface ScriptGenerationContext {
  /** Enriched story concept */
  enrichedConcept: EnrichedConcept;
  /** Child profile info */
  childName: string;
  childAge: number;
  /** Target language */
  language: Language;
  /** Vocabulary level */
  vocabularyLevel: VocabularyLevel;
  /** Generation constraints (word budget, structure) */
  constraints: ScriptGenerationConstraints;
  /** Guided answers from user */
  answers: Array<{ questionId: string; value: string }>;
  /** Feedback from previous failed attempt (for retry) */
  previousAttemptFeedback?: string;
}

/**
 * LLM Provider Interface
 *
 * Abstracts the LLM interaction layer. Providers are responsible for:
 * - Building appropriate prompts for their specific model
 * - Making API calls and handling retries
 * - Returning raw JSON responses
 *
 * Parsing and validation is handled by the service layer.
 */
export interface ILLMProvider {
  /** Provider type identifier */
  readonly providerType: LLMProviderType;

  /**
   * Generate enriched concept from story prompt
   *
   * @param context - Enrichment context with profile and prompt
   * @param options - Completion options
   * @returns Raw LLM response containing JSON
   */
  generateEnrichedConcept(
    context: EnrichmentContext,
    options?: LLMCompletionOptions,
  ): Promise<LLMRawResponse>;

  /**
   * Generate story script from enriched concept
   *
   * @param context - Script generation context with constraints
   * @param options - Completion options
   * @returns Raw LLM response containing JSON
   */
  generateScript(
    context: ScriptGenerationContext,
    options?: LLMCompletionOptions,
  ): Promise<LLMRawResponse>;

  /**
   * Check if provider is available and configured
   */
  isAvailable(): boolean;
}

/**
 * Provider factory function type
 */
export type LLMProviderFactory = () => ILLMProvider;

/**
 * Provider registry for dependency injection
 */
export interface ILLMProviderRegistry {
  /**
   * Get a provider by type
   */
  getProvider(type: LLMProviderType): ILLMProvider;

  /**
   * Get the default provider
   */
  getDefaultProvider(): ILLMProvider;

  /**
   * Register a provider
   */
  registerProvider(type: LLMProviderType, provider: ILLMProvider): void;

  /**
   * List available providers
   */
  listAvailableProviders(): LLMProviderType[];
}
