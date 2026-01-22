/**
 * LLM Repository Types
 *
 * Defines the low-level interface for LLM repositories.
 * Repositories handle API communication and retry logic only.
 * Business logic (prompt building, parsing) is in service layer.
 */

/**
 * Supported LLM repository types
 */
export type LLMRepositoryType = 'openai' | 'anthropic' | 'mistral' | 'grok';

/**
 * LLM completion options
 */
export interface LLMCompletionOptions {
  /** Model identifier (provider-specific) */
  model?: string;
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
  model: string;
}

/**
 * LLM Repository Interface
 *
 * Low-level abstraction for LLM API communication.
 * Repositories are responsible for:
 * - Making API calls with retry logic
 * - Returning raw text responses
 *
 * Prompt building, parsing, and validation is handled by the service layer.
 */
export interface ILLMRepository {
  /** Repository type identifier */
  readonly repositoryType: LLMRepositoryType;

  /**
   * Complete a prompt with retry logic
   *
   * @param systemPrompt - System instructions for the LLM
   * @param userPrompt - User input/task for the LLM
   * @param options - Completion options (model, temperature, etc.)
   * @returns Raw LLM response containing text content
   */
  completeWithRetry(
    systemPrompt: string,
    userPrompt: string,
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
