/**
 * Audio Repository Implementation
 *
 * Unified wrapper around the ElevenLabs SDK for:
 * - Text-to-Speech (TTS) with eleven_v3 model
 * - Sound Effects generation
 *
 * Provides low-level access to ElevenLabs APIs with comprehensive error handling.
 */

import 'reflect-metadata';
import type { Readable } from 'node:stream';

import { ElevenLabsClient } from 'elevenlabs';
import { inject, injectable } from 'inversify';

import type { Logger } from '@mio/shared/server/logger';
import { AppError, DiagnoseSeverity, ErrorCodes } from '@mio/shared';
import { environment } from '@mio/shared/constants/environment.constants';

import type {
  IAudioRepository,
  ISoundEffectsRepository,
  SoundEffectsConvertInput,
  SoundEffectsConvertResult,
  VoicesConvertInput,
  VoicesConvertResult
} from './audio-repository.types';
import { IocConnection } from '../../ioc/ioc.types';

/** Default ElevenLabs model (v3 for better expressivity and audio tags) */
const DEFAULT_TTS_MODEL = 'eleven_v3';

/** Default output format (FFmpeg compatible: 44.1kHz stereo) */
const DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128' as const;

/** Default prompt influence for sound effects (how closely to follow the prompt, 0-1) */
const DEFAULT_PROMPT_INFLUENCE = 0.3;

/**
 * Convert a readable stream to a Buffer
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * ElevenLabs "convertWithTimestamps" currently enforces discrete stability values.
 *
 * Error example:
 * - status: invalid_ttd_stability
 * - allowed: [0.0, 0.5, 1.0]
 *
 * We normalize to the closest allowed value to keep higher-level emotion settings expressive
 * while staying compatible with the API constraints.
 */
function normalizeTtdStability(value: number | undefined): 0 | 0.5 | 1 | undefined {
  if (value === undefined) return undefined;
  const clamped = Math.max(0, Math.min(1, value));
  const allowed: Array<0 | 0.5 | 1> = [0, 0.5, 1];
  return allowed.reduce((best, current) => (Math.abs(current - clamped) < Math.abs(best - clamped) ? current : best));
}

/**
 * Audio Repository
 *
 * Unified repository for ElevenLabs audio generation:
 * - Text-to-Speech with timestamps and alignment data
 * - Sound Effects from text descriptions
 * - Voice management
 */
@injectable()
export class AudioRepository implements IAudioRepository, ISoundEffectsRepository {
  private readonly client: ElevenLabsClient;

  constructor(@inject(IocConnection.LOGGER) private readonly logger: Logger) {
    const apiKey = environment.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    this.client = new ElevenLabsClient({
      apiKey
    });
  }

  // ===== Text-to-Speech (TTS) Methods =====

  /**
   * Convert text to speech with timestamps for accurate duration
   */
  async convertTextToSpeech(input: VoicesConvertInput): Promise<VoicesConvertResult> {
    const { text, voiceId, modelId = DEFAULT_TTS_MODEL, outputFormat = DEFAULT_OUTPUT_FORMAT, voiceSettings } = input;

    const normalizedStability = normalizeTtdStability(voiceSettings?.stability);
    if (voiceSettings?.stability !== undefined && normalizedStability !== voiceSettings.stability) {
      this.logger.debug('Normalized ElevenLabs stability for convertWithTimestamps', {
        voiceId,
        from: voiceSettings.stability,
        to: normalizedStability
      });
    }

    // Build the actual voice_settings object that will be sent to the API
    const apiVoiceSettings = voiceSettings
      ? {
          stability: normalizedStability,
          similarity_boost: voiceSettings.similarityBoost,
          style: voiceSettings.style,
          speed: voiceSettings.speed
        }
      : undefined;

    this.logger.info('[TTS API CALL] Converting text to speech', {
      voiceId,
      modelId,
      outputFormat,
      textLength: text.length,
      inputVoiceSettings: voiceSettings
        ? {
            stability: voiceSettings.stability,
            similarityBoost: voiceSettings.similarityBoost,
            style: voiceSettings.style,
            speed: voiceSettings.speed
          }
        : null,
      apiVoiceSettings
    });

    try {
      const response = await this.client.textToSpeech.convertWithTimestamps(voiceId, {
        text,
        model_id: modelId,
        output_format: outputFormat,
        voice_settings: apiVoiceSettings
      });

      // Decode base64 audio
      const audioBuffer = Buffer.from(response.audio_base64, 'base64');

      // Calculate duration from alignment data (last character end time)
      const alignment = response.alignment;
      let durationSeconds = 0;

      if (alignment && alignment.character_end_times_seconds.length > 0) {
        // Use the last character's end time as the total duration
        durationSeconds = alignment.character_end_times_seconds.at(-1) ?? 0;
      } else {
        // Fallback: estimate from buffer size (128kbps = 16KB/s)
        durationSeconds = audioBuffer.length / ((128 * 1000) / 8);
        this.logger.warn('No alignment data, using estimated duration', {
          voiceId,
          estimatedDuration: durationSeconds
        });
      }

      this.logger.debug('Text to speech conversion complete', {
        voiceId,
        durationSeconds,
        bufferSize: audioBuffer.length,
        hasAlignment: !!alignment
      });

      return {
        audio: audioBuffer,
        durationSeconds,
        alignment: alignment
          ? {
              characters: alignment.characters,
              characterStartTimesSeconds: alignment.character_start_times_seconds,
              characterEndTimesSeconds: alignment.character_end_times_seconds
            }
          : undefined
      };
    } catch (error) {
      this.logger.error('TTS conversion failed', {
        voiceId,
        modelId,
        error: error instanceof Error ? error.message : String(error)
      });

      // Check for specific error types
      if (this.isRateLimitError(error)) {
        throw new AppError(ErrorCodes.TTSRateLimited, {
          name: 'ElevenLabsRateLimited',
          diagnoses: [
            {
              name: 'voiceId',
              message: voiceId,
              severity: DiagnoseSeverity.Info
            }
          ]
        });
      }

      if (this.isTimeoutError(error)) {
        throw new AppError(ErrorCodes.TTSTimeout, {
          name: 'ElevenLabsTimeout',
          diagnoses: [
            {
              name: 'voiceId',
              message: voiceId,
              severity: DiagnoseSeverity.Info
            }
          ]
        });
      }

      throw new AppError(ErrorCodes.TTSGenerationFailed, {
        name: 'ElevenLabsError',
        error: error instanceof Error ? error : new Error(String(error)),
        diagnoses: [
          {
            name: 'voiceId',
            message: voiceId,
            severity: DiagnoseSeverity.Info
          }
        ]
      });
    }
  }

  /**
   * List available voices
   */
  async listVoices(): Promise<Array<{ voiceId: string; name: string; labels?: Record<string, string> }>> {
    try {
      const response = await this.client.voices.getAll();

      return response.voices
        .filter((voice): voice is typeof voice & { name: string } => typeof voice.name === 'string')
        .map((voice) => ({
          voiceId: voice.voice_id,
          name: voice.name,
          labels: voice.labels
        }));
    } catch (error) {
      this.logger.error('Failed to list voices', error);
      throw new AppError(ErrorCodes.TTSGenerationFailed, {
        name: 'ListVoicesFailed',
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * Check if a voice ID is valid using VoiceRegistry (database lookup, no API call)
   *
   * Falls back to assuming valid if VoiceRegistry is not available
   * (e.g., during initial setup before voices are synced).
   */
  async isValidVoice(voiceId: string): Promise<boolean> {
    try {
      // Lazy load VoiceRegistry to avoid circular dependency at import time
      const { getInstance, IocService } = await import('../../ioc');
      const voiceRegistry = getInstance<import('../../services/narration/voice-registry.service').VoiceRegistryService>(IocService.VOICE_REGISTRY);
      return voiceRegistry.isValidVoice(voiceId);
    } catch {
      // If VoiceRegistry is not available (e.g., no voices synced yet),
      // assume valid (will fail at generation time if invalid)
      this.logger.warn('VoiceRegistry not available, assuming voice is valid', { voiceId });
      return true;
    }
  }

  // ===== Sound Effects Methods =====

  /**
   * Convert text description to sound effect audio
   */
  async createSoundEffect(input: SoundEffectsConvertInput): Promise<SoundEffectsConvertResult> {
    const { text, outputFormat = DEFAULT_OUTPUT_FORMAT, durationSeconds, promptInfluence = DEFAULT_PROMPT_INFLUENCE } = input;

    // Validate duration if provided (ElevenLabs supports 0.5-22 seconds)
    if (durationSeconds !== undefined) {
      if (durationSeconds < 0.5 || durationSeconds > 22) {
        throw new AppError(ErrorCodes.SFXInvalidInput, {
          name: 'InvalidDuration',
          diagnoses: [
            {
              name: 'durationSeconds',
              message: `Duration must be between 0.5 and 22 seconds, got ${durationSeconds}`,
              severity: DiagnoseSeverity.Error
            }
          ]
        });
      }
    }

    // Validate prompt influence (0-1)
    if (promptInfluence < 0 || promptInfluence > 1) {
      throw new AppError(ErrorCodes.SFXInvalidInput, {
        name: 'InvalidPromptInfluence',
        diagnoses: [
          {
            name: 'promptInfluence',
            message: `Prompt influence must be between 0 and 1, got ${promptInfluence}`,
            severity: DiagnoseSeverity.Error
          }
        ]
      });
    }

    this.logger.info('[SFX API CALL] Generating sound effect', {
      textLength: text.length,
      textPreview: text.substring(0, 100),
      outputFormat,
      durationSeconds,
      promptInfluence
    });

    try {
      const response = await this.client.textToSoundEffects.convert({
        text,
        output_format: outputFormat,
        duration_seconds: durationSeconds,
        prompt_influence: promptInfluence
      });

      // Convert stream to buffer
      const audioBuffer = await streamToBuffer(response);

      // Estimate duration from buffer size if not provided
      // MP3 128kbps = 16KB/s
      const estimatedDuration = durationSeconds ?? audioBuffer.length / ((128 * 1000) / 8);

      this.logger.debug('Sound effect generation complete', {
        textPreview: text.substring(0, 50),
        bufferSize: audioBuffer.length,
        estimatedDuration
      });

      return {
        audio: audioBuffer,
        durationSeconds: estimatedDuration
      };
    } catch (error) {
      this.logger.error('Sound effect generation failed', {
        text: text.substring(0, 100),
        error: error instanceof Error ? error.message : String(error)
      });

      // Check for specific error types
      if (this.isRateLimitError(error)) {
        throw new AppError(ErrorCodes.SFXRateLimited, {
          name: 'ElevenLabsSFXRateLimited',
          diagnoses: [
            {
              name: 'text',
              message: text.substring(0, 100),
              severity: DiagnoseSeverity.Info
            }
          ]
        });
      }

      if (this.isTimeoutError(error)) {
        throw new AppError(ErrorCodes.SFXTimeout, {
          name: 'ElevenLabsSFXTimeout',
          diagnoses: [
            {
              name: 'text',
              message: text.substring(0, 100),
              severity: DiagnoseSeverity.Info
            }
          ]
        });
      }

      throw new AppError(ErrorCodes.SFXGenerationFailed, {
        name: 'ElevenLabsSFXError',
        error: error instanceof Error ? error : new Error(String(error)),
        diagnoses: [
          {
            name: 'text',
            message: text.substring(0, 100),
            severity: DiagnoseSeverity.Info
          }
        ]
      });
    }
  }

  // ===== Backward Compatibility Aliases =====

  /**
   * Alias for convertTextToSpeech (legacy scripts compatibility)
   */
  async convertWithTimestamps(input: VoicesConvertInput): Promise<VoicesConvertResult> {
    return this.convertTextToSpeech(input);
  }

  /**
   * Alias for createSoundEffect (legacy scripts compatibility)
   */
  async convert(input: SoundEffectsConvertInput): Promise<SoundEffectsConvertResult> {
    return this.createSoundEffect(input);
  }

  // ===== Private Helper Methods =====

  /**
   * Check if error is a rate limit error (429)
   */
  private isRateLimitError(error: unknown): boolean {
    if (error && typeof error === 'object') {
      const err = error as { status?: number; statusCode?: number; message?: string };
      if (err.status === 429 || err.statusCode === 429) {
        return true;
      }
      if (err.message?.includes('rate limit') || err.message?.includes('429')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if error is a timeout error
   */
  private isTimeoutError(error: unknown): boolean {
    if (error && typeof error === 'object') {
      const err = error as { message?: string; code?: string };
      if (err.code === 'ETIMEDOUT' || err.code === 'TIMEOUT') {
        return true;
      }
      if (err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT')) {
        return true;
      }
    }
    return false;
  }
}
