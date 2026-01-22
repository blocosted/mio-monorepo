/**
 * OpenAI LLM Repository
 *
 * Implements ILLMRepository using the OpenAI API.
 * Handles prompt construction and API communication for OpenAI models.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import OpenAI from 'openai';

import { AppError, ErrorCodes } from '@mio/shared';
import { environment } from '@mio/shared/constants/environment.constants';
import { Logger } from '@mio/shared/server/logger';

import { IocConnection } from '../../ioc';
import type {
  ILLMRepository,
  LLMRepositoryType,
  LLMCompletionOptions,
  LLMRawResponse,
  EnrichmentContext,
  ScriptGenerationContext,
} from './llm-repository.types';
import {
  buildEnrichmentSystemPrompt,
  buildEnrichmentUserPrompt,
} from '../../services/llm/prompts/enrichment.prompts';
import {
  buildScriptGenerationSystemPrompt,
  buildScriptGenerationUserPrompt,
} from '../../services/llm/prompts/scriptGeneration.prompts';
import type { ChatModel } from 'openai/resources/index.mjs';

/** Default configuration */
const DEFAULT_MODEL: ChatModel = 'gpt-4o';
const DEFAULT_MAX_TOKENS = 2000;
const DEFAULT_SCRIPT_MAX_TOKENS = 12000;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TIMEOUT = 60000;
const DEFAULT_SCRIPT_TIMEOUT = 180000;

/** Rate limit retry configuration */
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

@injectable()
export class OpenAIRepository implements ILLMRepository {
  readonly repositoryType: LLMRepositoryType = 'openai';
  private readonly client: OpenAI;

  constructor(
    @inject(IocConnection.LOGGER)
    private readonly logger: Logger,
  ) {
    const apiKey = environment.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.client = new OpenAI({
      apiKey,
      timeout: DEFAULT_TIMEOUT,
    });
  }

  isAvailable(): boolean {
    return !!environment.OPENAI_API_KEY;
  }

  async generateEnrichedConcept(
    context: EnrichmentContext,
    options?: LLMCompletionOptions,
  ): Promise<LLMRawResponse> {
    const systemPrompt = buildEnrichmentSystemPrompt(
      {
        firstName: context.childName,
        age: context.childAge,
        gender: context.childGender as 'boy' | 'girl' | 'neutral',
        favoriteThemes: context.favoriteThemes,
        avoidThemes: context.avoidThemes,
        includeChildAsCharacter: context.includeChildAsCharacter,
        preferredHeroGender: context.preferredHeroGender,
        language: context.language,
      },
      context.vocabularyLevel,
    );
    const userPrompt = buildEnrichmentUserPrompt(context.initialPrompt);

    this.logger.info('OpenAI: Generating enriched concept', {
      childName: context.childName,
      vocabularyLevel: context.vocabularyLevel,
    });

    return this.completeWithRetry(systemPrompt, userPrompt, options);
  }

  async generateScript(
    context: ScriptGenerationContext,
    options?: LLMCompletionOptions,
  ): Promise<LLMRawResponse> {
    const systemPrompt = buildScriptGenerationSystemPrompt(
      {
        firstName: context.childName,
        age: context.childAge,
        gender: 'neutral',
        language: context.language,
      },
      context.enrichedConcept,
      context.vocabularyLevel,
      context.constraints,
    );

    const userPrompt = buildScriptGenerationUserPrompt(
      context.enrichedConcept,
      context.answers,
      context.previousAttemptFeedback,
    );

    this.logger.info('OpenAI: Generating script', {
      title: context.enrichedConcept.title,
      targetWordCount: context.constraints.durationBudget.targetWordCount,
      targetDuration: context.constraints.durationBudget.totalSeconds,
    });

    const scriptOptions: LLMCompletionOptions = {
      ...options,
      maxTokens: options?.maxTokens ?? DEFAULT_SCRIPT_MAX_TOKENS,
      timeout: options?.timeout ?? DEFAULT_SCRIPT_TIMEOUT,
    };

    return this.completeWithRetry(systemPrompt, userPrompt, scriptOptions);
  }

  private async completeWithRetry(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMCompletionOptions,
  ): Promise<LLMRawResponse> {
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
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new AppError(ErrorCodes.InternalError, {
            name: 'LLMEmptyResponse',
          });
        }

        return {
          content,
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          model: completion.model,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this.isRateLimitError(error)) {
          this.logger.warn('OpenAI rate limit, retrying', {
            attempt,
            retryDelay,
          });

          if (attempt < MAX_RETRIES) {
            await this.sleep(retryDelay);
            retryDelay *= 2;
            continue;
          }
        }

        if (this.isTimeoutError(error)) {
          this.logger.error('OpenAI timeout', { attempt });
          throw new AppError(ErrorCodes.InternalError, {
            name: 'LLMTimeout',
            error: lastError,
          });
        }

        break;
      }
    }

    this.logger.error('OpenAI request failed', { error: lastError?.message });
    throw new AppError(ErrorCodes.InternalError, {
      name: 'LLMRequestFailed',
      error: lastError ?? undefined,
    });
  }

  private isRateLimitError(error: unknown): boolean {
    if (error instanceof OpenAI.RateLimitError) return true;
    if (error instanceof OpenAI.APIError && error.status === 429) return true;
    return false;
  }

  private isTimeoutError(error: unknown): boolean {
    if (error instanceof OpenAI.APIConnectionTimeoutError) return true;
    if (error instanceof Error && error.message.includes('timeout')) return true;
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
