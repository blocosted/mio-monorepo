/**
 * LLM Service Exports
 *
 * Centralized exports for the LLM service module.
 */

// Service types
export type {
  ILLMService,
  EnrichStoryInput,
  EnrichStoryResult,
  EnrichmentProfile,
  EnrichmentStory,
  LLMCompletionOptions,
  LLMProvider,
} from './llm.service.types';

export {
  getVocabularyLevel,
  AGE_TO_VOCABULARY,
  AVAILABLE_TONES,
  AVAILABLE_AMBIANCES,
} from './llm.service.types';

// Provider types
export type {
  LLMProviderType,
  LLMRawResponse,
  EnrichmentContext,
  ScriptGenerationContext,
  ILLMProvider,
  ILLMProviderRegistry,
} from './providers';

// Script generation service types (timeline-based)
export type {
  ScriptValidationResult,
  ScriptGenerationInput,
  ScriptGenerationResult,
} from './script-generation.service';

// Implementations
export { OpenAILLMService } from './openai';
export { OpenAIProvider, AnthropicProvider } from './providers';
export { ScriptGenerationService } from './script-generation.service';

// Parsers
export { parseEnrichedConcept } from './llm.service.parser';

// Prompts
export {
  buildScriptGenerationSystemPrompt,
  buildScriptGenerationUserPrompt,
} from './prompts/scriptGeneration.prompts';
