/**
 * Anthropic (Claude) LLM Repository
 *
 * Implements ILLMRepository using the Anthropic API.
 * Handles prompt construction and API communication for Claude models.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import Anthropic from '@anthropic-ai/sdk';
import type { Model } from '@anthropic-ai/sdk/resources';

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

/** Default configuration */
const DEFAULT_MODEL: Model = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 2000;
const DEFAULT_SCRIPT_MAX_TOKENS = 12000;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TIMEOUT = 60000;
const DEFAULT_SCRIPT_TIMEOUT = 180000;

/** Rate limit retry configuration */
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

@injectable()
export class AnthropicRepository implements ILLMRepository {
  readonly repositoryType: LLMRepositoryType = 'anthropic';
  private readonly client: Anthropic;

  constructor(
    @inject(IocConnection.LOGGER)
    private readonly logger: Logger,
  ) {
    const apiKey = environment.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    this.client = new Anthropic({
      apiKey,
      timeout: DEFAULT_TIMEOUT,
    });
  }

  isAvailable(): boolean {
    return !!environment.ANTHROPIC_API_KEY;
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

    this.logger.info('Anthropic: Generating enriched concept', {
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

    this.logger.info('Anthropic: Generating script', {
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
        const message = await this.client.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt },
          ],
        });

        // Extract text content from the response
        const textBlock = message.content.find((block) => block.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
          throw new AppError(ErrorCodes.InternalError, {
            name: 'LLMEmptyResponse',
          });
        }

        // Claude doesn't have native JSON mode, so we need to extract JSON from the response
        const content = this.extractJson(textBlock.text);

        return {
          content,
          promptTokens: message.usage.input_tokens,
          completionTokens: message.usage.output_tokens,
          model: message.model,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this.isRateLimitError(error)) {
          this.logger.warn('Anthropic rate limit, retrying', {
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
          this.logger.error('Anthropic timeout', { attempt });
          throw new AppError(ErrorCodes.InternalError, {
            name: 'LLMTimeout',
            error: lastError,
          });
        }

        break;
      }
    }

    this.logger.error('Anthropic request failed', { error: lastError?.message });
    throw new AppError(ErrorCodes.InternalError, {
      name: 'LLMRequestFailed',
      error: lastError ?? undefined,
    });
  }

  /**
   * Extract JSON from Claude's response
   * Claude doesn't have native JSON mode, so we need to find and extract the JSON
   */
  private extractJson(text: string): string {
    // Try to find JSON in code blocks first
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }

    // Try to find raw JSON (starts with { and ends with })
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    // If no JSON found, return the raw text (will fail validation later)
    return text;
  }

  private isRateLimitError(error: unknown): boolean {
    if (error instanceof Anthropic.RateLimitError) return true;
    if (error instanceof Anthropic.APIError && error.status === 429) return true;
    return false;
  }

  private isTimeoutError(error: unknown): boolean {
    if (error instanceof Anthropic.APIConnectionTimeoutError) return true;
    if (error instanceof Error && error.message.includes('timeout')) return true;
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
