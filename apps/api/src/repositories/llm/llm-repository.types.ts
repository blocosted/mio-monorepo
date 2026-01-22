/**
 * LLM Repository Types
 *
 * Defines the interface for LLM repositories, separating the raw LLM interaction
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
 * Supported LLM repository types
 */
export type LLMRepositoryType = 'openai' | 'anthropic' | 'mistral' | 'grok';

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
 * LLM Repository Interface
 *
 * Abstracts the LLM interaction layer. Repositories are responsible for:
 * - Building appropriate prompts for their specific model
 * - Making API calls and handling retries
 * - Returning raw JSON responses
 *
 * Parsing and validation is handled by the service layer.
 */
export interface ILLMRepository {
  /** Repository type identifier */
  readonly repositoryType: LLMRepositoryType;

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
   * Check if repository is available and configured
   */
  isAvailable(): boolean;
}

/**
 * Repository factory function type
 */
export type LLMRepositoryFactory = () => ILLMRepository;

/**
 * Repository registry for dependency injection
 */
export interface ILLMRepositoryRegistry {
  /**
   * Get a repository by type
   */
  getRepository(type: LLMRepositoryType): ILLMRepository;

  /**
   * Get the default repository
   */
  getDefaultRepository(): ILLMRepository;

  /**
   * Register a repository
   */
  registerRepository(type: LLMRepositoryType, repository: ILLMRepository): void;

  /**
   * List available repositories
   */
  listAvailableRepositories(): LLMRepositoryType[];
}
