/**
 * Enrichment Service Implementation
 *
 * Handles story enrichment by building prompts, calling LLM repository, and parsing responses.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { Logger } from '@mio/shared/server/logger';

import type { ILLMRepository } from '../../repositories/llm';
import type { EnrichStoryInput, EnrichStoryResult, LLMCompletionOptions } from './enrichment.service.types';
import { IocConnection, IocRepository } from '../../ioc/ioc.types';
import { parseEnrichedConcept } from './llm.service.parser';
import { getVocabularyLevel } from './llm.service.types';
import { buildEnrichmentSystemPrompt, buildEnrichmentUserPrompt } from './prompts/enrichment.prompts';

@injectable()
export class EnrichmentService {
  constructor(
    @inject(IocRepository.LLM_REPOSITORY)
    private readonly repository: ILLMRepository,
    @inject(IocConnection.LOGGER)
    private readonly logger: Logger
  ) {}

  /**
   * Enrich a story prompt into a full concept
   */
  async enrichStory(input: EnrichStoryInput, options?: LLMCompletionOptions): Promise<EnrichStoryResult> {
    const { story, profile } = input;
    const vocabularyLevel = getVocabularyLevel(profile.age);

    const systemPrompt = buildEnrichmentSystemPrompt(profile, vocabularyLevel);
    const userPrompt = buildEnrichmentUserPrompt(story.initialPrompt);

    this.logger.info('Enriching story', {
      storyId: story.id,
      childName: profile.firstName,
      childAge: profile.age,
      vocabularyLevel,
      provider: this.repository.repositoryType
    });

    const response = await this.repository.completeWithRetry(systemPrompt, userPrompt, options);

    const enrichedConcept = parseEnrichedConcept(response.content);

    this.logger.info('Story enrichment complete', {
      storyId: story.id,
      title: enrichedConcept.title,
      tone: enrichedConcept.tone,
      themes: enrichedConcept.themes,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens
    });

    return {
      enrichedConcept,
      vocabularyLevel
    };
  }
}
