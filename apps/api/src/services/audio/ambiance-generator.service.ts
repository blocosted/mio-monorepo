/**
 * Ambiance Generator Service Implementation
 *
 * Service for generating ambient background sounds using ElevenLabs SFX API.
 * Supports looping for longer durations and fade effects via FFmpeg.
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

import { IocInfrastructure } from '../../ioc';
import type { ISoundEffectsProvider } from './soundEffects.provider.types';
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
 * Ambiance Generator Service
 *
 * Generates ambient background sounds by:
 * 1. Creating base ambient clips via ElevenLabs SFX API (max 22s)
 * 2. Looping/extending clips to target duration via FFmpeg
 * 3. Applying fade-in/out effects
 * 4. Adjusting volume levels
 */
@injectable()
export class AmbianceGeneratorService implements IAmbianceGeneratorService {
    constructor(
        @inject(IocInfrastructure.LOGGER) private readonly logger: Logger,
        @inject('ISoundEffectsProvider') private readonly sfxProvider: ISoundEffectsProvider,
    ) {}

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

        this.logger.info('Generating ambiance', {
            description: description.substring(0, 50),
            targetDurationSeconds,
            fadeInDuration,
            fadeOutDuration,
            volume,
        });

        // Calculate source clip duration (max 22s for ElevenLabs)
        const sourceClipDuration = Math.min(targetDurationSeconds, MAX_SFX_CLIP_DURATION);

        // Generate base ambient clip via ElevenLabs
        const sfxResult = await this.sfxProvider.convert({
            text: this.buildAmbiancePrompt(description),
            durationSeconds: sourceClipDuration,
            promptInfluence,
        });

        // Check if we need to loop
        const needsLoop = targetDurationSeconds > sfxResult.durationSeconds;

        if (!needsLoop && Math.abs(volume - 1.0) < 0.01 && fadeInDuration === 0 && fadeOutDuration === 0) {
            // No processing needed, return as-is
            return {
                audio: sfxResult.audio,
                durationSeconds: sfxResult.durationSeconds,
                description,
                looped: false,
                sourceClipDurationSeconds: sfxResult.durationSeconds,
            };
        }

        // Process with FFmpeg for looping, fades, and volume
        const processedAudio = await this.processAmbianceWithFFmpeg(
            sfxResult.audio,
            targetDurationSeconds,
            fadeInDuration,
            fadeOutDuration,
            volume,
            needsLoop,
        );

        const finalDuration = await this.getBufferDuration(processedAudio);

        this.logger.info('Ambiance generation complete', {
            description: description.substring(0, 30),
            sourceClipDuration: sfxResult.durationSeconds,
            finalDuration,
            looped: needsLoop,
        });

        return {
            audio: processedAudio,
            durationSeconds: finalDuration,
            description,
            looped: needsLoop,
            sourceClipDurationSeconds: sfxResult.durationSeconds,
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
    private sanitizeFilename(text: string, maxLength: number = 30): string {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, maxLength);
    }
}
