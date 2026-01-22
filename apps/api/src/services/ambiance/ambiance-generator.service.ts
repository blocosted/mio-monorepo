/**
 * Ambiance Generator Service Implementation
 *
 * Service for generating ambient background sounds using ElevenLabs SFX API.
 * Supports looping for longer durations and fade effects via FFmpeg.
 *
 * Uses library-first approach:
 * 1. Check persistent library for matching source clip
 * 2. Apply looping/fade to source clip on the fly
 * 3. If not found, generate via API and store source clip in library
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import ffmpeg from 'fluent-ffmpeg';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';

import { AppError, ErrorCodes, DiagnoseSeverity } from '@mio/shared';
import { Logger } from '@mio/shared/server/logger';
import type {
    AmbianceEnvironment,
    TimeOfDay,
    WeatherCondition,
    AudioMood,
} from '@mio/shared/types';

import { getInstance, IocConnection, IocRepository, IocService } from '../../ioc';
import type { ISoundEffectsRepository } from '../../repositories/audio/audio-repository.types';
import type { IAmbianceLibraryService } from './ambiance-library.service.types';
import type { IStorageService } from '../storage';
import type {
    IAmbianceGeneratorService,
    AmbianceGenerateInput,
    AmbianceGenerateResult,
    AmbianceSegmentInput,
    AmbianceSegmentResult,
} from './ambiance-generator.service.types';

/** Maximum duration for a single ElevenLabs SFX clip */
const MAX_SFX_CLIP_DURATION = 22;

/** Minimum duration for a single ElevenLabs SFX clip */
const MIN_SFX_CLIP_DURATION = 0.5;

/** FFmpeg operation timeout */
const FFMPEG_TIMEOUT_MS = 120000; // 2 minutes

/** Probe timeout */
const PROBE_TIMEOUT_MS = 10000; // 10 seconds

/** Default values for ambiance generation */
const DEFAULTS = {
    fadeInDuration: 1.0,
    fadeOutDuration: 2.0,
    volume: 0.3,
    promptInfluence: 0.3,
} as const;

/**
 * Infer environment from description
 */
function inferEnvironment(description: string): AmbianceEnvironment | undefined {
    const lowerDesc = description.toLowerCase();

    if (/forest|tree|woods|woodland|jungle/i.test(lowerDesc)) return 'forest';
    if (/ocean|sea|beach|wave|coast|shore/i.test(lowerDesc)) return 'ocean';
    if (/city|urban|street|traffic|downtown/i.test(lowerDesc)) return 'city';
    if (/village|town|market|shop/i.test(lowerDesc)) return 'village';
    if (/castle|palace|throne|dungeon|tower/i.test(lowerDesc)) return 'castle';
    if (/cave|cavern|underground|grotto/i.test(lowerDesc)) return 'cave';
    if (/mountain|peak|cliff|summit|alpine/i.test(lowerDesc)) return 'mountain';
    if (/meadow|field|grassland|prairie/i.test(lowerDesc)) return 'meadow';
    if (/space|star|galaxy|cosmic|nebula/i.test(lowerDesc)) return 'space';
    if (/underwater|ocean floor|deep sea|coral/i.test(lowerDesc)) return 'underwater';

    return undefined;
}

/**
 * Infer time of day from description
 */
function inferTimeOfDay(description: string): TimeOfDay {
    const lowerDesc = description.toLowerCase();

    if (/night|midnight|nocturnal|starry|moonlit/i.test(lowerDesc)) return 'night';
    if (/dawn|sunrise|early morning|first light/i.test(lowerDesc)) return 'dawn';
    if (/dusk|sunset|evening|twilight/i.test(lowerDesc)) return 'dusk';
    if (/day|sunny|afternoon|morning|noon/i.test(lowerDesc)) return 'day';

    return 'any';
}

/**
 * Infer weather from description
 */
function inferWeather(description: string): WeatherCondition {
    const lowerDesc = description.toLowerCase();

    if (/rain|rainy|drizzle|shower/i.test(lowerDesc)) return 'rainy';
    if (/storm|thunder|lightning|tempest/i.test(lowerDesc)) return 'stormy';
    if (/snow|snowy|blizzard|frost/i.test(lowerDesc)) return 'snowy';
    if (/fog|foggy|mist|misty|hazy/i.test(lowerDesc)) return 'foggy';
    if (/clear|sunny|bright|cloudless/i.test(lowerDesc)) return 'clear';

    return 'any';
}

/**
 * Infer mood from description
 */
function inferMood(description: string): AudioMood | undefined {
    const lowerDesc = description.toLowerCase();

    if (/peaceful|calm|serene|tranquil|relaxing/i.test(lowerDesc)) return 'peaceful';
    if (/mysterious|eerie|enigmatic|strange|curious/i.test(lowerDesc)) return 'mysterious';
    if (/tense|suspense|danger|threat|scary|dark/i.test(lowerDesc)) return 'tense';
    if (/magic|magical|enchant|wonder|fairy/i.test(lowerDesc)) return 'magical';
    if (/adventure|epic|heroic|exciting|action/i.test(lowerDesc)) return 'adventurous';

    return undefined;
}

/**
 * Ambiance Generator Service
 *
 * Generates ambient background sounds by:
 * 1. Checking persistent library for source clips
 * 2. Creating base ambient clips via ElevenLabs SFX API (max 22s) if not found
 * 3. Looping/extending clips to target duration via FFmpeg
 * 4. Applying fade-in/out effects
 * 5. Adjusting volume levels
 */
@injectable()
export class AmbianceGeneratorService implements IAmbianceGeneratorService {
    private libraryHits = 0;
    private libraryMisses = 0;

    constructor(
        @inject(IocConnection.LOGGER) private readonly logger: Logger,
        @inject(IocRepository.SOUND_EFFECTS) private readonly sfxRepository: ISoundEffectsRepository,
    ) { }

    /**
     * Lazily get AmbianceLibrary service
     */
    private _ambianceLibrary: IAmbianceLibraryService | null = null;
    private get ambianceLibrary(): IAmbianceLibraryService {
        if (!this._ambianceLibrary) {
            this._ambianceLibrary = getInstance<IAmbianceLibraryService>(IocService.AMBIANCE_LIBRARY);
        }
        return this._ambianceLibrary;
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
     * Generate an ambient sound track
     */
    async generate(input: AmbianceGenerateInput): Promise<AmbianceGenerateResult> {
        const {
            description,
            targetDurationSeconds,
            fadeInDuration = DEFAULTS.fadeInDuration,
            fadeOutDuration = DEFAULTS.fadeOutDuration,
            volume = DEFAULTS.volume,
            promptInfluence = DEFAULTS.promptInfluence,
        } = input;

        // Validate target duration
        if (targetDurationSeconds < MIN_SFX_CLIP_DURATION) {
            throw new AppError(ErrorCodes.SFXInvalidInput, {
                name: 'InvalidTargetDuration',
                diagnoses: [{
                    name: 'targetDurationSeconds',
                    message: `Target duration must be at least ${MIN_SFX_CLIP_DURATION}s, got ${targetDurationSeconds}`,
                    severity: DiagnoseSeverity.Error,
                }],
            });
        }

        // Infer taxonomy from description
        const environment = inferEnvironment(description);
        const timeOfDay = inferTimeOfDay(description);
        const weather = inferWeather(description);
        const mood = inferMood(description);

        this.logger.info('Generating ambiance', {
            description: description.substring(0, 50),
            targetDurationSeconds,
            fadeInDuration,
            fadeOutDuration,
            volume,
            environment,
            timeOfDay,
            weather,
            mood,
        });

        // =====================================================================
        // Step 1: Check library for existing source clip
        // =====================================================================
        let sourceAudio: Buffer | null = null;
        let sourceDuration = 0;
        let fromLibrary = false;

        if (environment) {
            const libraryResult = await this.ambianceLibrary.findAmbiance({
                description,
                environment,
                timeOfDay,
                weather,
                mood,
            });

            if (libraryResult.ambiance) {
                this.logger.info('[LIBRARY HIT] Found ambiance source in persistent library', {
                    ambianceId: libraryResult.ambiance.id,
                    canonicalKey: libraryResult.ambiance.canonicalKey,
                    fromCache: libraryResult.fromCache,
                });
                this.libraryHits++;

                try {
                    // Download source clip from storage
                    sourceAudio = await this.storage.download(libraryResult.ambiance.s3Url);
                    sourceDuration = libraryResult.ambiance.sourceDurationSeconds;
                    fromLibrary = true;

                    // Increment usage counter (fire and forget)
                    this.ambianceLibrary.incrementAmbianceUsage(libraryResult.ambiance.id).catch((err) => {
                        this.logger.warn('Failed to increment ambiance usage', { error: err.message });
                    });
                } catch (error) {
                    this.logger.warn('[LIBRARY INVALID] Library entry exists but file not found', {
                        ambianceId: libraryResult.ambiance.id,
                        error: error instanceof Error ? error.message : 'Unknown',
                    });
                    sourceAudio = null;
                }
            } else {
                this.logger.info('[LIBRARY MISS] No ambiance found in persistent library', {
                    description: description.substring(0, 50),
                    environment,
                });
                this.libraryMisses++;
            }
        }

        // =====================================================================
        // Step 2: Generate source clip via API if not found in library
        // =====================================================================
        if (!sourceAudio) {
            // Calculate source clip duration (max 22s for ElevenLabs)
            const sourceClipDuration = Math.min(targetDurationSeconds, MAX_SFX_CLIP_DURATION);

            // Generate base ambient clip via ElevenLabs
            const sfxResult = await this.sfxRepository.convert({
                text: this.buildAmbiancePrompt(description),
                durationSeconds: sourceClipDuration,
                promptInfluence,
            });

            sourceAudio = sfxResult.audio;
            sourceDuration = sfxResult.durationSeconds;

            // Store source clip in library for future reuse
            if (environment) {
                try {
                    const storagePath = `ambiance/${environment}/${Date.now()}-${Bun.hash(description).toString(36)}.mp3`;
                    await this.storage.upload(sourceAudio, storagePath, {
                        contentType: 'audio/mpeg',
                    });

                    // Generate canonical key
                    const canonicalParts = [
                        'ambiance',
                        environment,
                        timeOfDay ?? 'any',
                        weather ?? 'any',
                        mood ?? 'any',
                        Bun.hash(description).toString(36),
                    ];
                    const canonicalKey = canonicalParts.join(':');

                    await this.ambianceLibrary.storeAmbiance({
                        canonicalKey,
                        environment,
                        timeOfDay,
                        weather,
                        mood,
                        prompt: description,
                        promptInfluence,
                        s3Url: storagePath,
                        sourceDurationSeconds: sourceDuration,
                        format: 'mp3',
                        isLoopable: true,
                        tags: this.extractTags(description),
                    });

                    this.logger.info('Ambiance source stored in library', {
                        environment,
                        storagePath,
                    });
                } catch (error) {
                    this.logger.warn('Failed to store ambiance in library', {
                        error: error instanceof Error ? error.message : 'Unknown',
                    });
                }
            }
        }

        // =====================================================================
        // Step 3: Apply looping/fade effects if needed
        // =====================================================================
        const needsLoop = targetDurationSeconds > sourceDuration;

        if (!needsLoop && Math.abs(volume - 1.0) < 0.01 && fadeInDuration === 0 && fadeOutDuration === 0) {
            // No processing needed, return as-is
            return {
                audio: sourceAudio,
                durationSeconds: sourceDuration,
                description,
                looped: false,
                sourceClipDurationSeconds: sourceDuration,
                fromLibrary,
            };
        }

        // Process with FFmpeg for looping, fades, and volume
        const processedAudio = await this.processAmbianceWithFFmpeg(
            sourceAudio,
            targetDurationSeconds,
            fadeInDuration,
            fadeOutDuration,
            volume,
            needsLoop,
        );

        const finalDuration = await this.getBufferDuration(processedAudio);

        this.logger.info('Ambiance generation complete', {
            description: description.substring(0, 30),
            sourceClipDuration: sourceDuration,
            finalDuration,
            looped: needsLoop,
            fromLibrary,
        });

        return {
            audio: processedAudio,
            durationSeconds: finalDuration,
            description,
            looped: needsLoop,
            sourceClipDurationSeconds: sourceDuration,
            fromLibrary,
        };
    }

    /**
     * Generate ambient sound for a script segment
     */
    async generateForSegment(segment: AmbianceSegmentInput): Promise<AmbianceSegmentResult> {
        try {
            const result = await this.generate({
                description: segment.description,
                targetDurationSeconds: segment.duration,
                fadeInDuration: segment.fadeInDuration,
                volume: segment.volume,
            });

            const sanitizedDesc = this.sanitizeFilename(segment.description);
            const outputFilename = `${segment.id}-${sanitizedDesc}.mp3`;

            return {
                id: segment.id,
                success: true,
                audio: result.audio,
                durationSeconds: result.durationSeconds,
                startTime: segment.startTime,
                outputFile: outputFilename,
            };
        } catch (error) {
            this.logger.error('Ambiance segment generation failed', {
                segmentId: segment.id,
                error: error instanceof Error ? error.message : String(error),
            });

            return {
                id: segment.id,
                success: false,
                startTime: segment.startTime,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    /**
     * Build an optimized prompt for ambient sound generation
     */
    private buildAmbiancePrompt(description: string): string {
        // Add ambient-specific hints if not already present
        const lowerDesc = description.toLowerCase();
        const hasAmbientHints = ['ambient', 'background', 'continuous', 'looping'].some(
            hint => lowerDesc.includes(hint)
        );

        if (hasAmbientHints) {
            return description;
        }

        return `ambient background sound of ${description}, continuous and loopable`;
    }

    /**
     * Extract tags from description for library search
     */
    private extractTags(description: string): string[] {
        const stopWords = new Set([
            'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
            'and', 'but', 'or', 'sound', 'sounds', 'ambient', 'background',
        ]);

        return description
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .slice(0, 10);
    }

    /**
     * Process ambiance audio with FFmpeg for looping, fades, and volume
     */
    private async processAmbianceWithFFmpeg(
        audioBuffer: Buffer,
        targetDuration: number,
        fadeInDuration: number,
        fadeOutDuration: number,
        volume: number,
        needsLoop: boolean,
    ): Promise<Buffer> {
        const workdir = await this.createWorkdir();

        try {
            const inputPath = join(workdir, 'input.mp3');
            const outputPath = join(workdir, 'output.mp3');

            // Write input buffer to file
            await writeFile(inputPath, audioBuffer);

            // Build FFmpeg filter chain
            const filters = this.buildFilterChain(
                targetDuration,
                fadeInDuration,
                fadeOutDuration,
                volume,
                needsLoop,
            );

            // Run FFmpeg
            await this.runFFmpegProcess(inputPath, outputPath, filters, needsLoop);

            // Read output
            return await readFile(outputPath);
        } finally {
            await this.cleanupWorkdir(workdir);
        }
    }

    /**
     * Build FFmpeg filter chain for ambiance processing
     */
    private buildFilterChain(
        targetDuration: number,
        fadeInDuration: number,
        fadeOutDuration: number,
        volume: number,
        needsLoop: boolean,
    ): string[] {
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
    private runFFmpegProcess(
        inputPath: string,
        outputPath: string,
        filters: string[],
        needsLoop: boolean,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new AppError(ErrorCodes.FFmpegTimeout, {
                    diagnoses: [{
                        name: 'operation',
                        message: 'processAmbiance',
                        severity: DiagnoseSeverity.Info,
                    }],
                }));
            }, FFMPEG_TIMEOUT_MS);

            const command = ffmpeg()
                .input(inputPath);

            // Add stream_loop for infinite looping before the input is processed
            if (needsLoop) {
                command.inputOptions(['-stream_loop', '-1']);
            }

            command
                .audioFilters(filters.filter(f => !f.startsWith('aloop')))
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
                    reject(new AppError(ErrorCodes.FFmpegMixingFailed, {
                        diagnoses: [
                            {
                                name: 'operation',
                                message: 'processAmbiance',
                                severity: DiagnoseSeverity.Info,
                            },
                            {
                                name: 'error',
                                message: err.message,
                                severity: DiagnoseSeverity.Error,
                            },
                        ],
                    }));
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
                reject(new AppError(ErrorCodes.FFmpegTimeout, {
                    diagnoses: [{
                        name: 'operation',
                        message: 'probeAudioDuration',
                        severity: DiagnoseSeverity.Info,
                    }],
                }));
            }, PROBE_TIMEOUT_MS);

            ffmpeg.ffprobe(filePath, (err, metadata) => {
                clearTimeout(timeout);
                if (err) {
                    reject(new AppError(ErrorCodes.FFmpegInvalidInput, {
                        diagnoses: [
                            {
                                name: 'operation',
                                message: 'probeAudioDuration',
                                severity: DiagnoseSeverity.Info,
                            },
                            {
                                name: 'error',
                                message: err.message,
                                severity: DiagnoseSeverity.Error,
                            },
                        ],
                    }));
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
        const workdir = join(tmpdir(), `mio-ambiance-${randomUUID().slice(0, 8)}`);
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
            this.logger.warn('Failed to cleanup ambiance workdir', {
                workdir,
                error: error instanceof Error ? error.message : 'Unknown',
            });
        }
    }

    /**
     * Generate a safe filename from description
     */
    private sanitizeFilename(text: string, maxLength = 30): string {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, maxLength);
    }
}
