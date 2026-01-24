/**
 * OpenAI LLM Service Implementation
 *
 * Implements ILLMService using the OpenAI API.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';
import OpenAI from 'openai';

import type { Logger } from '@mio/shared/server/logger';
import { AppError, ErrorCodes } from '@mio/shared';
import { environment } from '@mio/shared/constants/environment.constants';

import type { EnrichStoryInput, EnrichStoryResult, ILLMService, LLMCompletionOptions } from './llm.service.types';
import { IocConnection } from '../../ioc/ioc.types';
import { parseEnrichedConcept } from './llm.service.parser';
import { getVocabularyLevel } from './llm.service.types';
import { buildEnrichmentSystemPrompt, buildEnrichmentUserPrompt } from './prompts/enrichment.prompts';

/** Default configuration */
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_MAX_TOKENS = 2000;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TIMEOUT = 60000;

/** Rate limit retry configuration */
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

@injectable()
export class OpenAILLMService implements ILLMService {
  private readonly client: OpenAI;

  constructor(
    @inject(IocConnection.LOGGER)
    private readonly logger: Logger
  ) {
    const apiKey = environment.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.client = new OpenAI({
      apiKey,
      timeout: DEFAULT_TIMEOUT
    });
  }

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
      vocabularyLevel
    });

    const response = await this.completeWithRetry(systemPrompt, userPrompt, options);

    const enrichedConcept = parseEnrichedConcept(response);

    this.logger.info('Story enrichment complete', {
      storyId: story.id,
      title: enrichedConcept.title,
      tone: enrichedConcept.tone,
      themes: enrichedConcept.themes
    });

    return {
      enrichedConcept,
      vocabularyLevel
    };
  }

  /**
   * Make a completion request with retry logic for rate limits
   */
  private async completeWithRetry(systemPrompt: string, userPrompt: string, options?: LLMCompletionOptions): Promise<string> {
    const model = options?.model ?? DEFAULT_MODEL;
    const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
    const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;

    let lastError: Error | null = null;
    let retryDelay = INITIAL_RETRY_DELAY;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const completion = await this.client.chat.completions.create({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' }
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new AppError(ErrorCodes.InternalError, {
            name: 'LLMEmptyResponse'
          });
        }

        return content;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this.isRateLimitError(error)) {
          this.logger.warn('Rate limit hit, retrying', {
            attempt,
            maxRetries: MAX_RETRIES,
            retryDelay
          });

          if (attempt < MAX_RETRIES) {
            await this.sleep(retryDelay);
            retryDelay *= 2; // Exponential backoff
            continue;
          }
        }

        if (this.isTimeoutError(error)) {
          this.logger.error('LLM request timeout', { attempt });
          throw new AppError(ErrorCodes.InternalError, {
            name: 'LLMTimeout',
            error: lastError
          });
        }

        // For other errors, don't retry
        break;
      }
    }

    this.logger.error('LLM request failed after retries', {
      error: lastError?.message
    });

    throw new AppError(ErrorCodes.InternalError, {
      name: 'LLMRequestFailed',
      error: lastError ?? undefined
    });
  }

  /**
   * Check if error is a rate limit error (429)
   */
  private isRateLimitError(error: unknown): boolean {
    if (error instanceof OpenAI.RateLimitError) {
      return true;
    }
    if (error instanceof OpenAI.APIError && error.status === 429) {
      return true;
    }
    return false;
  }

  /**
   * Check if error is a timeout error
   */
  private isTimeoutError(error: unknown): boolean {
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return true;
    }
    if (error instanceof Error && error.message.includes('timeout')) {
      return true;
    }
    return false;
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
