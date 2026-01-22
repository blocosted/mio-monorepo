/**
 * OpenAI LLM Repository
 *
 * Low-level OpenAI API client with retry logic.
 * Business logic (prompt building, parsing) is in service layer.
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
} from './llm-repository.types';
import type { ChatModel } from 'openai/resources/index.mjs';

/** Default configuration */
const DEFAULT_MODEL: ChatModel = 'gpt-4o';
const DEFAULT_MAX_TOKENS = 2000;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TIMEOUT = 60000;

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

  async completeWithRetry(
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
