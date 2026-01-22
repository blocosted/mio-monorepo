/**
 * LLM Service Exports
 *
 * Centralized exports for the LLM service module.
 */

// Legacy service types (kept for backward compatibility)
export type {
  ILLMService,
  LLMProvider,
} from './llm.service.types';

export {
  getVocabularyLevel,
  AGE_TO_VOCABULARY,
  AVAILABLE_TONES,
  AVAILABLE_AMBIANCES,
} from './llm.service.types';

// Enrichment service types
export type {
  IEnrichmentService,
  EnrichStoryInput,
  EnrichStoryResult,
  EnrichmentProfile,
  EnrichmentStory,
  LLMCompletionOptions,
} from './enrichment.service.types';

// Script generation service types (timeline-based)
export type {
  IScriptGenerationService,
  ScriptValidationResult,
  ScriptGenerationInput,
  ScriptGenerationResult,
  ScriptGenerationContext,
} from './script-generation.service.types';

// Repository types (re-exported for convenience)
export type {
  LLMRepositoryType,
  LLMRawResponse,
  ILLMRepository,
  ILLMRepositoryRegistry,
} from '../../repositories/llm';

// Implementations
export { EnrichmentService } from './enrichment.service';
export { ScriptGenerationService } from './script-generation.service';

// Parsers
export { parseEnrichedConcept } from './llm.service.parser';

// Prompts
export {
  buildScriptGenerationSystemPrompt,
  buildScriptGenerationUserPrompt,
} from './prompts/scriptGeneration.prompts';
