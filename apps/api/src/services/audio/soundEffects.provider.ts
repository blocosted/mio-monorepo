/**
 * Sound Effects Provider Implementation
 *
 * Wrapper around the ElevenLabs SDK for sound effects generation.
 * Uses the textToSoundEffects API to generate audio from text descriptions.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { ElevenLabsClient } from 'elevenlabs';
import { Readable } from 'stream';

import { AppError, ErrorCodes, DiagnoseSeverity } from '@mio/shared';
import { environment } from '@mio/shared/constants/environment.constants';
import { Logger } from '@mio/shared/server/logger';

import { IocInfrastructure } from '../../ioc';
import type {
    ISoundEffectsProvider,
    SoundEffectsConvertInput,
    SoundEffectsConvertResult,
} from './soundEffects.provider.types';

/** Default output format (FFmpeg compatible: 44.1kHz stereo) */
const DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128' as const;

/** Default prompt influence (how closely to follow the prompt, 0-1) */
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
 * ElevenLabs Sound Effects Provider
 *
 * Provides access to ElevenLabs Sound Effects API with:
 * - Text-to-sound-effect generation
 * - Configurable duration (0.5-22 seconds)
 * - Prompt influence control
 */
@injectable()
export class SoundEffectsProvider implements ISoundEffectsProvider {
    private readonly client: ElevenLabsClient;

    constructor(
        @inject(IocInfrastructure.LOGGER) private readonly logger: Logger,
    ) {
        const apiKey = environment.ELEVENLABS_API_KEY;
        if (!apiKey) {
            throw new Error('ELEVENLABS_API_KEY is not configured');
        }

        this.client = new ElevenLabsClient({
            apiKey,
        });
    }

    /**
     * Convert text description to sound effect audio
     */
    async convert(input: SoundEffectsConvertInput): Promise<SoundEffectsConvertResult> {
        const {
            text,
            outputFormat = DEFAULT_OUTPUT_FORMAT,
            durationSeconds,
            promptInfluence = DEFAULT_PROMPT_INFLUENCE,
        } = input;

        // Validate duration if provided (ElevenLabs supports 0.5-22 seconds)
        if (durationSeconds !== undefined) {
            if (durationSeconds < 0.5 || durationSeconds > 22) {
                throw new AppError(ErrorCodes.SFXInvalidInput, {
                    name: 'InvalidDuration',
                    diagnoses: [{
                        name: 'durationSeconds',
                        message: `Duration must be between 0.5 and 22 seconds, got ${durationSeconds}`,
                        severity: DiagnoseSeverity.Error,
                    }],
                });
            }
        }

        // Validate prompt influence (0-1)
        if (promptInfluence < 0 || promptInfluence > 1) {
            throw new AppError(ErrorCodes.SFXInvalidInput, {
                name: 'InvalidPromptInfluence',
                diagnoses: [{
                    name: 'promptInfluence',
                    message: `Prompt influence must be between 0 and 1, got ${promptInfluence}`,
                    severity: DiagnoseSeverity.Error,
                }],
            });
        }

        this.logger.info('[SFX API CALL] Generating sound effect', {
            textLength: text.length,
            textPreview: text.substring(0, 100),
            outputFormat,
            durationSeconds,
            promptInfluence,
        });

        try {
            const response = await this.client.textToSoundEffects.convert({
                text,
                output_format: outputFormat,
                duration_seconds: durationSeconds,
                prompt_influence: promptInfluence,
            });

            // Convert stream to buffer
            const audioBuffer = await streamToBuffer(response);

            // Estimate duration from buffer size if not provided
            // MP3 128kbps = 16KB/s
            const estimatedDuration = durationSeconds ?? audioBuffer.length / (128 * 1000 / 8);

            this.logger.debug('Sound effect generation complete', {
                textPreview: text.substring(0, 50),
                bufferSize: audioBuffer.length,
                estimatedDuration,
            });

            return {
                audio: audioBuffer,
                durationSeconds: estimatedDuration,
            };
        } catch (error) {
            this.logger.error('Sound effect generation failed', {
                text: text.substring(0, 100),
                error: error instanceof Error ? error.message : String(error),
            });

            // Check for specific error types
            if (this.isRateLimitError(error)) {
                throw new AppError(ErrorCodes.SFXRateLimited, {
                    name: 'ElevenLabsSFXRateLimited',
                    diagnoses: [{
                        name: 'text',
                        message: text.substring(0, 100),
                        severity: DiagnoseSeverity.Info,
                    }],
                });
            }

            if (this.isTimeoutError(error)) {
                throw new AppError(ErrorCodes.SFXTimeout, {
                    name: 'ElevenLabsSFXTimeout',
                    diagnoses: [{
                        name: 'text',
                        message: text.substring(0, 100),
                        severity: DiagnoseSeverity.Info,
                    }],
                });
            }

            throw new AppError(ErrorCodes.SFXGenerationFailed, {
                name: 'ElevenLabsSFXError',
                error: error instanceof Error ? error : new Error(String(error)),
                diagnoses: [{
                    name: 'text',
                    message: text.substring(0, 100),
                    severity: DiagnoseSeverity.Info,
                }],
            });
        }
    }

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
