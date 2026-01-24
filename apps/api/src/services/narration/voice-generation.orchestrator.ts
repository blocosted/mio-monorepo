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

import { AudioAssetType, type StoryScript, type TimelineSegment } from '@mio/shared/types';

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
   * Generate voice audio for a single segment
   */
  private async generateSegment(
    storyId: string,
    script: StoryScript,
    segment: TimelineSegment,
    onComplete: () => void
  ): Promise<VoiceSegmentGenerationResult | null> {
    try {
      // Skip non-voice segments
      if (segment.content.type !== 'narration' && segment.content.type !== 'dialogue') {
        onComplete();
        return null;
      }

      // Build cache key for idempotency
      const cacheKey = `voice_${storyId}_${segment.id}`;

      // Check for existing asset
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
      const character = characterName ? script.characters.find((c) => c.characterName === characterName) : script.characters[0]; // Default to first character (narrator)

      if (!character?.voiceId) {
        this.logger.warn('No voiceId found for character, skipping segment', {
          segmentId: segment.id,
          characterName
        });
        onComplete();
        return null;
      }

      // Generate voice audio
      const result = await this.ttsService.generateSpeech({
        text: segment.content.text,
        voiceId: character.voiceId,
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
        durationSeconds: result.durationSeconds
      });

      onComplete();
      return {
        segmentId: segment.id,
        assetId: asset.id,
        fromCache: false,
        durationSeconds: result.durationSeconds
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to generate voice segment', {
        segmentId: segment.id,
        storyId,
        error: errorMessage
      });
      onComplete();
      return null;
    }
  }
}
