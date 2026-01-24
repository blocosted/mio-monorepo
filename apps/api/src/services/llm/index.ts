/**
 * LLM Service Exports
 *
 * Centralized exports for the LLM service module.
 */

// Repository types (re-exported for convenience)
export type {
  ILLMRepository,
  ILLMRepositoryRegistry,
  LLMRawResponse,
  LLMRepositoryType
} from '../../repositories/llm';
// Enrichment service types
export type {
  EnrichmentProfile,
  EnrichmentStory,
  EnrichStoryInput,
  EnrichStoryResult,
  IEnrichmentService,
  LLMCompletionOptions
} from './enrichment.service.types';
// Legacy service types (kept for backward compatibility)
export type {
  ILLMService,
  LLMProvider
} from './llm.service.types';
// Script generation service types (timeline-based)
export type {
  IScriptGenerationService,
  ScriptGenerationContext,
  ScriptGenerationInput,
  ScriptGenerationResult,
  ScriptValidationResult
} from './script-generation.service.types';
// Implementations
export { EnrichmentService } from './enrichment.service';
// Parsers
export { parseEnrichedConcept } from './llm.service.parser';
export {
  AGE_TO_VOCABULARY,
  AVAILABLE_AMBIANCES,
  AVAILABLE_TONES,
  getVocabularyLevel
} from './llm.service.types';
// Prompts
export {
  buildScriptGenerationSystemPrompt,
  buildScriptGenerationUserPrompt
} from './prompts/scriptGeneration.prompts';
export { ScriptGenerationService } from './script-generation.service';
