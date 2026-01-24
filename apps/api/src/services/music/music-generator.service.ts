/**
 * Music Generator Service Implementation
 *
 * Service for generating background music using ElevenLabs SFX API.
 * Maps moods to descriptive prompts and supports looping for longer durations.
 *
 * Uses library-first approach:
 * 1. Check persistent library for matching source clip by mood/intensity/tempo
 * 2. Apply looping/fade to source clip on the fly
 * 3. If not found, generate via API and store source clip in library
 */

import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import ffmpeg from 'fluent-ffmpeg';
import { inject, injectable } from 'inversify';

import type { Logger } from '@mio/shared/server/logger';
import type { MusicMood as LibraryMusicMood, MusicIntensity, MusicTempo } from '@mio/shared/types';
import { AppError, DiagnoseSeverity, ErrorCodes } from '@mio/shared';

import type { ISoundEffectsRepository } from '../../repositories/audio/audio-repository.types';
import type { IStorageService } from '../storage';
import type {
  IMusicGeneratorService,
  MoodPromptMapping,
  MusicGenerateInput,
  MusicGenerateResult,
  MusicSegmentInput,
  MusicSegmentResult
} from './music-generator.service.types';
import type { IMusicLibraryService } from './music-library.service.types';
import type { MusicMood } from './music-strategy.service.types';
import { IocConnection, IocRepository, IocService } from '../../ioc/ioc.types';
import { getInstance } from '../../ioc/ioc.config';

/** Maximum duration for a single ElevenLabs SFX clip */
const MAX_SFX_CLIP_DURATION = 22;

/** Minimum duration for a single ElevenLabs SFX clip */
const MIN_SFX_CLIP_DURATION = 0.5;

/** FFmpeg operation timeout */
const FFMPEG_TIMEOUT_MS = 120000; // 2 minutes

/** Probe timeout */
const PROBE_TIMEOUT_MS = 10000; // 10 seconds

/** Default values for music generation */
const DEFAULTS = {
  fadeInDuration: 2.0,
  fadeOutDuration: 3.0,
  volume: 0.15,
  promptInfluence: 0.5 // Higher influence for music to get more consistent results
} as const;

/**
 * Mood to prompt mapping
 * These prompts are optimized for ElevenLabs SFX API to generate music-like audio
 */
const MOOD_PROMPTS: Record<MusicMood, MoodPromptMapping> = {
  calm: {
    prompt: 'soft gentle instrumental music, peaceful piano and strings, ambient background, relaxing melody, no percussion, soothing atmosphere',
    variations: ['peaceful ambient music with soft piano notes, gentle and calming', 'tranquil instrumental background music, floating strings and piano'],
    recommendedDuration: 20
  },
  mysterious: {
    prompt: 'mysterious ambient music, ethereal pads, subtle tension, fantasy atmosphere, magical undertones, soft and intriguing',
    variations: ['enigmatic background music, soft mysterious tones, fantasy atmosphere', 'magical ambient music, soft mysterious melody with ethereal sounds'],
    recommendedDuration: 20
  },
  adventurous: {
    prompt: 'epic adventure music, orchestral strings, heroic melody, inspiring and uplifting, fantasy adventure theme, cinematic',
    variations: ['heroic adventure theme, inspiring orchestral music, epic and uplifting', 'grand adventure music, sweeping strings, courageous melody'],
    recommendedDuration: 22
  },
  tense: {
    prompt: 'suspenseful ambient music, building tension, dark undertones, dramatic pads, anxious atmosphere, subtle danger',
    variations: ['tense background music, suspenseful pads, building anxiety, dramatic', 'dark suspenseful music, ominous tones, tension building'],
    recommendedDuration: 18
  },
  joyful: {
    prompt: 'happy uplifting music, bright melody, cheerful instrumental, playful and light, positive energy, gentle celebration',
    variations: ['cheerful background music, light and happy, uplifting melody', 'joyful instrumental music, bright and positive, playful tune'],
    recommendedDuration: 20
  },
  sad: {
    prompt: 'melancholic music, sad piano melody, emotional strings, bittersweet atmosphere, gentle sorrow, touching',
    variations: ['sorrowful piano music, emotional and sad, gentle melancholy', 'melancholic ambient music, touching and emotional, soft sadness'],
    recommendedDuration: 18
  },
  magical: {
    prompt: 'magical fairy tale music, enchanting melody, sparkle and wonder, whimsical fantasy, dreamy and ethereal, gentle magic',
    variations: ['enchanting fairy music, magical sparkles, dreamy and wonderful', 'whimsical fantasy music, magical atmosphere, fairy tale wonder'],
    recommendedDuration: 20
  },
  serene: {
    prompt: 'serene ambient music, peaceful meditation, soft flowing melody, nature atmosphere, tranquil and gentle, zen-like calm',
    variations: ['peaceful meditation music, serene and tranquil, gentle flowing', 'zen ambient music, calm and peaceful, soft nature atmosphere'],
    recommendedDuration: 20
  }
};

/**
 * Map MusicMood to LibraryMusicMood (same values, different types)
 */
function mapToLibraryMood(mood: MusicMood): LibraryMusicMood {
  return mood as LibraryMusicMood;
}

/**
 * Infer intensity from prompt
 */
function inferIntensity(prompt: string): MusicIntensity {
  const lowerPrompt = prompt.toLowerCase();

  if (/soft|gentle|quiet|subtle|peaceful|calm/i.test(lowerPrompt)) return 'soft';
  if (/epic|grand|powerful|intense|dramatic|heroic/i.test(lowerPrompt)) return 'epic';

  return 'medium';
}

/**
 * Infer tempo from prompt
 */
function inferTempo(prompt: string): MusicTempo {
  const lowerPrompt = prompt.toLowerCase();

  if (/slow|peaceful|tranquil|gentle|flowing/i.test(lowerPrompt)) return 'slow';
  if (/fast|energetic|lively|upbeat|exciting/i.test(lowerPrompt)) return 'fast';

  return 'medium';
}

/**
 * Music Generator Service
 *
 * Generates background music by:
 * 1. Checking persistent library for source clips by mood
 * 2. Mapping moods to descriptive prompts for ElevenLabs SFX API if not found
 * 3. Generating base clips (max 22s)
 * 4. Looping/extending clips to target duration via FFmpeg
 * 5. Applying fade-in/out effects
 * 6. Adjusting volume levels
 */
@injectable()
export class MusicGeneratorService implements IMusicGeneratorService {
  private libraryHits = 0;
  private libraryMisses = 0;

  constructor(
    @inject(IocConnection.LOGGER) private readonly logger: Logger,
    @inject(IocRepository.AUDIO) private readonly sfxRepository: ISoundEffectsRepository
  ) {}

  /**
   * Lazily get MusicLibrary service
   */
  private _musicLibrary: IMusicLibraryService | null = null;
  private get musicLibrary(): IMusicLibraryService {
    if (!this._musicLibrary) {
      this._musicLibrary = getInstance<IMusicLibraryService>(IocService.MUSIC_LIBRARY);
    }
    return this._musicLibrary;
  }

  /**
   * Lazily get Storage service
   */
  private _storage: IStorageService | null = null;
  private get storage(): IStorageService {
    if (!this._storage) {
      this._storage = getInstance<IStorageService>(IocService.STORAGE);
    }
    return this._storage;
  }

  /**
   * Generate music audio for a mood
   */
  async generate(input: MusicGenerateInput): Promise<MusicGenerateResult> {
    const {
      mood,
      targetDurationSeconds,
      fadeInDuration = DEFAULTS.fadeInDuration,
      fadeOutDuration = DEFAULTS.fadeOutDuration,
      volume = DEFAULTS.volume,
      promptInfluence = DEFAULTS.promptInfluence,
      customPrompt
    } = input;

    // Validate target duration
    if (targetDurationSeconds < MIN_SFX_CLIP_DURATION) {
      throw new AppError(ErrorCodes.SFXInvalidInput, {
        name: 'InvalidTargetDuration',
        diagnoses: [
          {
            name: 'targetDurationSeconds',
            message: `Target duration must be at least ${MIN_SFX_CLIP_DURATION}s, got ${targetDurationSeconds}`,
            severity: DiagnoseSeverity.Error
          }
        ]
      });
    }

    // Get prompt for mood
    const promptUsed = customPrompt ?? this.getPromptForMood(mood);
    const libraryMood = mapToLibraryMood(mood);
    const intensity = inferIntensity(promptUsed);
    const tempo = inferTempo(promptUsed);

    this.logger.info('Generating music', {
      mood,
      targetDurationSeconds,
      fadeInDuration,
      fadeOutDuration,
      volume,
      intensity,
      tempo,
      promptPreview: promptUsed.substring(0, 50)
    });

    // =====================================================================
    // Step 1: Check library for existing source clip
    // =====================================================================
    let sourceAudio: Buffer | null = null;
    let sourceDuration = 0;
    let fromLibrary = false;

    const libraryResult = await this.musicLibrary.findMusic({
      mood: libraryMood,
      intensity,
      tempo
    });

    if (libraryResult.music) {
      this.logger.info('[LIBRARY HIT] Found music source in persistent library', {
        musicId: libraryResult.music.id,
        canonicalKey: libraryResult.music.canonicalKey,
        fromCache: libraryResult.fromCache
      });
      this.libraryHits++;

      try {
        // Download source clip from storage
        sourceAudio = await this.storage.download(libraryResult.music.s3Url);
        sourceDuration = libraryResult.music.sourceDurationSeconds;
        fromLibrary = true;

        // Increment usage counter (fire and forget)
        this.musicLibrary.incrementMusicUsage(libraryResult.music.id).catch((err) => {
          this.logger.warn('Failed to increment music usage', { error: err.message });
        });
      } catch (error) {
        this.logger.warn('[LIBRARY INVALID] Library entry exists but file not found', {
          musicId: libraryResult.music.id,
          error: error instanceof Error ? error.message : 'Unknown'
        });
        sourceAudio = null;
      }
    } else {
      this.logger.info('[LIBRARY MISS] No music found in persistent library', { mood });
      this.libraryMisses++;
    }

    // =====================================================================
    // Step 2: Generate source clip via API if not found in library
    // =====================================================================
    if (!sourceAudio) {
      // Calculate source clip duration (max 22s for ElevenLabs, use recommended if shorter)
      const moodConfig = MOOD_PROMPTS[mood];
      const recommendedDuration = moodConfig?.recommendedDuration ?? MAX_SFX_CLIP_DURATION;
      const sourceClipDuration = Math.min(targetDurationSeconds, recommendedDuration, MAX_SFX_CLIP_DURATION);

      // Generate base music clip via ElevenLabs
      const sfxResult = await this.sfxRepository.createSoundEffect({
        text: promptUsed,
        durationSeconds: sourceClipDuration,
        promptInfluence
      });

      sourceAudio = sfxResult.audio;
      sourceDuration = sfxResult.durationSeconds;

      // Store source clip in library for future reuse
      try {
        const storagePath = `music/${mood}/${Date.now()}-${Bun.hash(promptUsed).toString(36)}.mp3`;
        await this.storage.upload(sourceAudio, storagePath, {
          contentType: 'audio/mpeg'
        });

        // Get next variation index
        const variationIndex = Math.floor(Math.random() * 5);

        // Generate canonical key
        const canonicalParts = ['music', libraryMood, intensity ?? 'any', tempo ?? 'any', variationIndex.toString(), Bun.hash(promptUsed).toString(36)];
        const canonicalKey = canonicalParts.join(':');

        await this.musicLibrary.storeMusic({
          canonicalKey,
          mood: libraryMood,
          intensity,
          tempo,
          variationIndex,
          prompt: promptUsed,
          promptInfluence,
          s3Url: storagePath,
          sourceDurationSeconds: sourceDuration,
          format: 'mp3',
          isLoopable: true,
          tags: this.extractTags(promptUsed)
        });

        this.logger.info('Music source stored in library', {
          mood,
          intensity,
          tempo,
          storagePath
        });
      } catch (error) {
        this.logger.warn('Failed to store music in library', {
          error: error instanceof Error ? error.message : 'Unknown'
        });
      }
    }

    // =====================================================================
    // Step 3: Apply looping/fade effects if needed
    // =====================================================================
    const needsLoop = targetDurationSeconds > sourceDuration;

    if (!needsLoop && Math.abs(volume - 1.0) < 0.01 && fadeInDuration === 0 && fadeOutDuration === 0) {
      // No processing needed - upload source clip to processed path for deduplication
      const processedPath = `music/${mood}/${Bun.hash(promptUsed).toString(36)}-${Math.round(sourceDuration)}s.mp3`;
      await this.storage.upload(sourceAudio, processedPath, { contentType: 'audio/mpeg' });

      return {
        audio: sourceAudio,
        durationSeconds: sourceDuration,
        mood,
        looped: false,
        sourceClipDurationSeconds: sourceDuration,
        promptUsed,
        url: processedPath,
        fromLibrary
      };
    }

    // Process with FFmpeg for looping, fades, and volume
    const processedAudio = await this.processMusicWithFFmpeg(sourceAudio, targetDurationSeconds, fadeInDuration, fadeOutDuration, volume, needsLoop);

    const finalDuration = await this.getBufferDuration(processedAudio);

    // Upload processed audio to shared path for deduplication
    const processedPath = `music/${mood}/${Bun.hash(promptUsed).toString(36)}-${Math.round(targetDurationSeconds)}s.mp3`;
    await this.storage.upload(processedAudio, processedPath, { contentType: 'audio/mpeg' });

    this.logger.info('Music generation complete', {
      mood,
      sourceClipDuration: sourceDuration,
      finalDuration,
      looped: needsLoop,
      fromLibrary,
      processedPath
    });

    return {
      audio: processedAudio,
      durationSeconds: finalDuration,
      mood,
      looped: needsLoop,
      sourceClipDurationSeconds: sourceDuration,
      promptUsed,
      url: processedPath,
      fromLibrary
    };
  }

  /**
   * Generate music for a script segment
   */
  async generateForSegment(segment: MusicSegmentInput): Promise<MusicSegmentResult> {
    try {
      const result = await this.generate({
        mood: segment.mood,
        targetDurationSeconds: segment.duration,
        fadeInDuration: segment.fadeInDuration,
        fadeOutDuration: segment.fadeOutDuration,
        volume: segment.volume
      });

      const outputFilename = `${segment.id}-music-${segment.mood}.mp3`;

      return {
        id: segment.id,
        success: true,
        audio: result.audio,
        durationSeconds: result.durationSeconds,
        startTime: segment.startTime,
        outputFile: outputFilename,
        looped: result.looped
      };
    } catch (error) {
      this.logger.error('Music segment generation failed', {
        segmentId: segment.id,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        id: segment.id,
        success: false,
        startTime: segment.startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get the prompt for a mood (for debugging/preview)
   */
  getPromptForMood(mood: MusicMood): string {
    const mapping = MOOD_PROMPTS[mood];
    if (!mapping) {
      // Fallback to calm if mood not found
      return MOOD_PROMPTS.calm.prompt;
    }

    // Optionally use variations for more diversity
    const useVariation = Math.random() > 0.7 && mapping.variations && mapping.variations.length > 0;
    if (useVariation && mapping.variations) {
      const randomIndex = Math.floor(Math.random() * mapping.variations.length);
      return mapping.variations[randomIndex] ?? mapping.prompt;
    }

    return mapping.prompt;
  }

  /**
   * Extract tags from prompt for library search
   */
  private extractTags(prompt: string): string[] {
    const stopWords = new Set([
      'a',
      'an',
      'the',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'to',
      'of',
      'in',
      'for',
      'on',
      'with',
      'at',
      'by',
      'from',
      'as',
      'into',
      'and',
      'but',
      'or',
      'music',
      'sound',
      'audio',
      'background'
    ]);

    return prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .slice(0, 10);
  }

  /**
   * Process music audio with FFmpeg for looping, fades, and volume
   */
  private async processMusicWithFFmpeg(
    audioBuffer: Buffer,
    targetDuration: number,
    fadeInDuration: number,
    fadeOutDuration: number,
    volume: number,
    needsLoop: boolean
  ): Promise<Buffer> {
    const workdir = await this.createWorkdir();

    try {
      const inputPath = join(workdir, 'input.mp3');
      const outputPath = join(workdir, 'output.mp3');

      // Write input buffer to file
      await writeFile(inputPath, audioBuffer);

      // Build FFmpeg filter chain
      const filters = this.buildFilterChain(targetDuration, fadeInDuration, fadeOutDuration, volume, needsLoop);

      // Run FFmpeg
      await this.runFFmpegProcess(inputPath, outputPath, filters, needsLoop);

      // Read output
      return await readFile(outputPath);
    } finally {
      await this.cleanupWorkdir(workdir);
    }
  }

  /**
   * Build FFmpeg filter chain for music processing
   */
  private buildFilterChain(targetDuration: number, fadeInDuration: number, fadeOutDuration: number, volume: number, needsLoop: boolean): string[] {
    const filters: string[] = [];

    // Loop if needed
    if (needsLoop) {
      filters.push('aloop=loop=-1:size=2000000000');
    }

    // Trim to target duration
    filters.push(`atrim=0:${targetDuration}`);

    // Reset timestamps after trim
    filters.push('asetpts=PTS-STARTPTS');

    // Apply fade-in
    if (fadeInDuration > 0) {
      filters.push(`afade=t=in:st=0:d=${fadeInDuration}`);
    }

    // Apply fade-out
    if (fadeOutDuration > 0) {
      const fadeOutStart = Math.max(0, targetDuration - fadeOutDuration);
      filters.push(`afade=t=out:st=${fadeOutStart}:d=${fadeOutDuration}`);
    }

    // Apply volume adjustment
    if (Math.abs(volume - 1.0) > 0.01) {
      filters.push(`volume=${volume}`);
    }

    return filters;
  }

  /**
   * Run FFmpeg process with filter chain
   */
  private runFFmpegProcess(inputPath: string, outputPath: string, filters: string[], needsLoop: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new AppError(ErrorCodes.FFmpegTimeout, {
            diagnoses: [
              {
                name: 'operation',
                message: 'processMusic',
                severity: DiagnoseSeverity.Info
              }
            ]
          })
        );
      }, FFMPEG_TIMEOUT_MS);

      const command = ffmpeg().input(inputPath);

      // Add stream_loop for infinite looping before the input is processed
      if (needsLoop) {
        command.inputOptions(['-stream_loop', '-1']);
      }

      command
        .audioFilters(filters.filter((f) => !f.startsWith('aloop')))
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .audioChannels(2)
        .audioFrequency(44100)
        .output(outputPath)
        .on('end', () => {
          clearTimeout(timeout);
          resolve();
        })
        .on('error', (err: Error) => {
          clearTimeout(timeout);
          reject(
            new AppError(ErrorCodes.FFmpegMixingFailed, {
              diagnoses: [
                {
                  name: 'operation',
                  message: 'processMusic',
                  severity: DiagnoseSeverity.Info
                },
                {
                  name: 'error',
                  message: err.message,
                  severity: DiagnoseSeverity.Error
                }
              ]
            })
          );
        })
        .run();
    });
  }

  /**
   * Get duration of an audio buffer by writing to temp file and probing
   */
  private async getBufferDuration(buffer: Buffer): Promise<number> {
    const workdir = await this.createWorkdir();

    try {
      const tempPath = join(workdir, 'probe.mp3');
      await writeFile(tempPath, buffer);
      return await this.probeAudioDuration(tempPath);
    } finally {
      await this.cleanupWorkdir(workdir);
    }
  }

  /**
   * Probe audio file duration using ffprobe
   */
  private probeAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new AppError(ErrorCodes.FFmpegTimeout, {
            diagnoses: [
              {
                name: 'operation',
                message: 'probeAudioDuration',
                severity: DiagnoseSeverity.Info
              }
            ]
          })
        );
      }, PROBE_TIMEOUT_MS);

      ffmpeg.ffprobe(filePath, (err, metadata) => {
        clearTimeout(timeout);
        if (err) {
          reject(
            new AppError(ErrorCodes.FFmpegInvalidInput, {
              diagnoses: [
                {
                  name: 'operation',
                  message: 'probeAudioDuration',
                  severity: DiagnoseSeverity.Info
                },
                {
                  name: 'error',
                  message: err.message,
                  severity: DiagnoseSeverity.Error
                }
              ]
            })
          );
          return;
        }

        resolve(metadata.format.duration ?? 0);
      });
    });
  }

  /**
   * Create a temporary working directory
   */
  private async createWorkdir(): Promise<string> {
    const workdir = join(tmpdir(), `mio-music-${randomUUID().slice(0, 8)}`);
    await mkdir(workdir, { recursive: true });
    return workdir;
  }

  /**
   * Cleanup temporary working directory
   */
  private async cleanupWorkdir(workdir: string): Promise<void> {
    try {
      await rm(workdir, { recursive: true, force: true });
    } catch (error) {
      this.logger.warn('Failed to cleanup music workdir', {
        workdir,
        error: error instanceof Error ? error.message : 'Unknown'
      });
    }
  }
}
