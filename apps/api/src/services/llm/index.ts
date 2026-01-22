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

// Repository types (re-exported for convenience)
export type {
  LLMRepositoryType,
  LLMRawResponse,
  EnrichmentContext,
  ScriptGenerationContext,
  ILLMRepository,
  ILLMRepositoryRegistry,
} from '../../repositories/llm';

// Script generation service types (timeline-based)
export type {
  IScriptGenerationService,
  ScriptValidationResult,
  ScriptGenerationInput,
  ScriptGenerationResult,
} from './script-generation.service.types';

// Implementations
export { OpenAILLMService } from './openai';
export { ScriptGenerationService } from './script-generation.service';

// Parsers
export { parseEnrichedConcept } from './llm.service.parser';

// Prompts
export {
  buildScriptGenerationSystemPrompt,
  buildScriptGenerationUserPrompt,
} from './prompts/scriptGeneration.prompts';
