/**
 * Voice Generation Orchestrator Implementation
 *
 * Orchestrates voice generation for all segments in a story script.
 * Extracts logic from voiceGenerationStep with:
 * - Content-based caching via audio_assets
 * - Concurrency control via p-limit
 * - Progress reporting
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';
import pLimit from 'p-limit';

import { AudioAssetType, type ScriptSegment, type StoryScript } from '@mio/shared/types';

import type { AudioAssetsService } from '../stories/audio-assets.service';
import type { TTSService } from './tts.service';
import type {
  VoiceGenerationInput,
  VoiceGenerationResult,
  VoiceSegmentGenerationResult
} from './voice-generation.orchestrator.types';
import { IocService } from '../../ioc/ioc.types';
import { AbstractService } from '../service.abstract';

/** Default concurrency for voice generation */
const DEFAULT_CONCURRENCY = 3;

/** Maximum retry attempts for failed segments */
const MAX_SEGMENT_RETRIES = 3;

/** Delay between retries in ms (exponential backoff base) */
const RETRY_DELAY_BASE_MS = 1000;

/**
 * Voice Generation Orchestrator
 *
 * Generates voice audio for all voice segments in a script.
 * Provides caching, concurrency control, and progress reporting.
 */
@injectable()
export class VoiceGenerationOrchestrator extends AbstractService {
  constructor(
    @inject(IocService.TTS) private readonly ttsService: TTSService,
    @inject(IocService.AUDIO_ASSETS) private readonly audioAssetsService: AudioAssetsService
  ) {
    super();
  }

  /**
   * Generate voice audio for all voice segments in a script
   */
  async generateAll(input: VoiceGenerationInput): Promise<VoiceGenerationResult> {
    const { storyId, script, concurrency = DEFAULT_CONCURRENCY, onProgress } = input;

    // Extract voice segments from script
    const voiceTrack = script.tracks.find((t) => t.type === 'voice');
    const voiceSegments = voiceTrack?.segments ?? [];

    this.logger.info('Starting voice generation', {
      storyId,
      segmentCount: voiceSegments.length,
      concurrency
    });

    if (voiceSegments.length === 0) {
      return {
        assetIds: [],
        segments: [],
        successCount: 0,
        failedCount: 0,
        cachedCount: 0,
        totalDurationSeconds: 0
      };
    }

    // Setup concurrency control
    const limit = pLimit(concurrency);
    let completedCount = 0;

    // Generate each segment
    const results = await Promise.all(
      voiceSegments.map((segment, _index) =>
        limit(() =>
          this.generateSegment(storyId, script, segment, () => {
            completedCount++;
            onProgress?.(completedCount, voiceSegments.length);
          })
        )
      )
    );

    // Filter successful results
    const successfulResults = results.filter((r): r is VoiceSegmentGenerationResult => r !== null);
    const failedCount = results.length - successfulResults.length;
    const cachedCount = successfulResults.filter((r) => r.fromCache).length;
    const totalDurationSeconds = successfulResults.reduce((sum, r) => sum + r.durationSeconds, 0);

    this.logger.info('Voice generation complete', {
      storyId,
      successCount: successfulResults.length,
      failedCount,
      cachedCount,
      totalDurationSeconds
    });

    return {
      assetIds: successfulResults.map((r) => r.assetId),
      segments: successfulResults,
      successCount: successfulResults.length,
      failedCount,
      cachedCount,
      totalDurationSeconds
    };
  }

  /**
   * Generate voice audio for a single segment with retry logic
   */
  private async generateSegment(
    storyId: string,
    script: StoryScript,
    segment: ScriptSegment,
    onComplete: () => void
  ): Promise<VoiceSegmentGenerationResult | null> {
    // Skip non-voice segments
    if (segment.content.type !== 'narration' && segment.content.type !== 'dialogue') {
      onComplete();
      return null;
    }

    // Build cache key for idempotency
    const cacheKey = `voice_${storyId}_${segment.id}`;

    // Check for existing asset first (no retry needed)
    const existing = await this.audioAssetsService.findByCacheKey(cacheKey);
    if (existing) {
      this.logger.debug('Using cached voice asset', { cacheKey, segmentId: segment.id });
      onComplete();
      return {
        segmentId: segment.id,
        assetId: existing.id,
        fromCache: true,
        durationSeconds: existing.duration
      };
    }

    // Find voice ID from character mapping
    const characterName = segment.content.characterName;
    const character = characterName ? script.characters.find((c) => c.characterName === characterName) : script.characters[0];

    if (!character?.voiceId) {
      this.logger.warn('No voiceId found for character, skipping segment', {
        segmentId: segment.id,
        characterName
      });
      onComplete();
      return null;
    }

    // Retry loop for TTS generation
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_SEGMENT_RETRIES; attempt++) {
      try {
        // Generate voice audio
        // Pass segmentType for TTS text extraction:
        // - 'dialogue': extracts only quoted text (e.g., "REGARDE!" from '[excited] "REGARDE!" s\'ecria-t-il')
        // - 'narration': uses full text
        const result = await this.ttsService.generateSpeech({
          text: segment.content.text,
          voiceId: character.voiceId,
          segmentType: segment.content.type as 'narration' | 'dialogue',
          emotion: segment.content.emotion,
          characterName
        });

        // Upload to storage
        const voicePath = `stories/${storyId}/voice/${segment.id}.mp3`;
        const uploadResult = await this.storageService.upload(result.audio, voicePath, { contentType: 'audio/mpeg' });

        // Store in audio_assets table
        const asset = await this.audioAssetsService.create({
          storyId,
          type: AudioAssetType.Voice,
          url: uploadResult.url,
          duration: result.durationSeconds,
          cacheKey
        });

        this.logger.debug('Voice segment generated', {
          segmentId: segment.id,
          assetId: asset.id,
          durationSeconds: result.durationSeconds,
          attempt
        });

        onComplete();
        return {
          segmentId: segment.id,
          assetId: asset.id,
          fromCache: false,
          durationSeconds: result.durationSeconds
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < MAX_SEGMENT_RETRIES) {
          const delayMs = RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1);
          this.logger.warn('Voice segment generation failed, retrying', {
            segmentId: segment.id,
            storyId,
            attempt,
            maxAttempts: MAX_SEGMENT_RETRIES,
            nextRetryMs: delayMs,
            error: lastError.message
          });
          await this.sleep(delayMs);
        }
      }
    }

    // All retries exhausted
    this.logger.error('Failed to generate voice segment after all retries', {
      segmentId: segment.id,
      storyId,
      attempts: MAX_SEGMENT_RETRIES,
      error: lastError?.message
    });
    onComplete();
    return null;
  }

  /**
   * Sleep for the specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
