/**
 * Service Factory for CLI Usage
 *
 * Creates service instances for CLI scripts using direct provider and store access.
 * Bypasses IoC for simplicity in CLI context.
 */

import type { Logger } from '@mio/shared/server/logger';
import type {
    SfxLibraryCategory,
    SfxEnvironment,
    AudioIntensity,
    AmbianceEnvironment,
    TimeOfDay,
    WeatherCondition,
    AudioMood,
    MusicMood,
    MusicIntensity,
    MusicTempo,
} from '@mio/shared/types';
import type { SfxLibraryStats } from '@mio/api/services/sound-design';
import type { AmbianceLibraryStats } from '@mio/api/services/ambiance';
import type { MusicLibraryStats } from '@mio/api/services/music';

/**
 * Combined audio library stats
 */
export interface AudioLibraryStats {
    sfx: Omit<SfxLibraryStats, 'topUsed'>;
    ambiance: Omit<AmbianceLibraryStats, 'topUsed'>;
    music: Omit<MusicLibraryStats, 'topUsed'>;
    topUsed: {
        sfx: SfxLibraryStats['topUsed'];
        ambiance: AmbianceLibraryStats['topUsed'];
        music: MusicLibraryStats['topUsed'];
    };
}

/**
 * SFX generation result for CLI
 */
export interface CliSfxResult {
    audio: Buffer;
    durationSeconds: number;
    format: string;
    fromLibrary: boolean;
}

/**
 * Ambiance generation result for CLI
 */
export interface CliAmbianceResult {
    audio: Buffer;
    durationSeconds: number;
    sourceClipDurationSeconds: number;
    looped: boolean;
    fromLibrary: boolean;
}

/**
 * Music generation result for CLI
 */
export interface CliMusicResult {
    audio: Buffer;
    durationSeconds: number;
    sourceClipDurationSeconds: number;
    looped: boolean;
    fromLibrary: boolean;
    promptUsed: string;
}

/**
 * CLI services factory result
 */
export interface CliServices {
    /**
     * Generate SFX and store in library
     */
    generateSfx(input: {
        text: string;
        category?: SfxLibraryCategory;
        subcategory?: string;
        environment?: SfxEnvironment;
        intensity?: AudioIntensity;
        durationSeconds?: number;
        promptInfluence?: number;
    }): Promise<CliSfxResult>;

    /**
     * Generate ambiance and store in library
     */
    generateAmbiance(input: {
        description: string;
        environment?: AmbianceEnvironment;
        subEnvironment?: string;
        timeOfDay?: TimeOfDay;
        weather?: WeatherCondition;
        mood?: AudioMood;
        targetDurationSeconds: number;
        promptInfluence?: number;
    }): Promise<CliAmbianceResult>;

    /**
     * Generate music and store in library
     */
    generateMusic(input: {
        mood: MusicMood;
        intensity?: MusicIntensity;
        tempo?: MusicTempo;
        variationIndex?: number;
        customPrompt?: string;
        targetDurationSeconds: number;
        promptInfluence?: number;
    }): Promise<CliMusicResult>;

    /**
     * Get library stats
     */
    getStats(): Promise<AudioLibraryStats>;
}

/** Audio bucket name (same as in ioc.types.ts) */
const AUDIO_BUCKET = 'audio';

/**
 * Create CLI services for audio library management
 */
export async function createCliServices(logger: Logger): Promise<CliServices> {
    // Get database connection
    const { dbConnectionFactory } = await import('@mio/shared/server/connections/db');
    const db = dbConnectionFactory();

    // Import repository
    const { SoundEffectsRepository } = await import('@mio/api/repositories/audio');

    // Create storage client directly
    const { storageConnectionFactory } = await import('@mio/shared/server/connections/storage');
    const storageClient = storageConnectionFactory();

    // Simple storage helper
    const storage = {
        async upload(file: Buffer, path: string, options: { contentType?: string } = {}): Promise<void> {
            await storageClient.upload(AUDIO_BUCKET, path, file, options);
        },
        async download(path: string): Promise<Buffer> {
            return await storageClient.download(AUDIO_BUCKET, path);
        },
    };

    // Create a no-op cache for CLI (no persistent caching needed)
    const mockCache = {
        async get<T>(_key: string): Promise<T | null> {
            return null;
        },
        async set(_key: string, _value: unknown, _options?: unknown): Promise<void> {
            // No-op
        },
        async delete(_key: string): Promise<void> {
            // No-op
        },
        async clear(): Promise<void> {
            // No-op
        },
    };

    // Import and instantiate stores
    const { SfxLibraryStore } = await import('@mio/api/services/sound-design');
    const { AmbianceLibraryStore } = await import('@mio/api/services/ambiance');
    const { MusicLibraryStore } = await import('@mio/api/services/music');

    // Create store instances (pass dependencies manually for CLI context)
    const sfxStore = new SfxLibraryStore(db as any, mockCache as any);
    const ambianceStore = new AmbianceLibraryStore(db as any, mockCache as any);
    const musicStore = new MusicLibraryStore(db as any, mockCache as any);

    // Create repository
    const sfxRepository = new SoundEffectsRepository(logger);

    return {
        async generateSfx(input) {
            const {
                text,
                category,
                subcategory = 'general',
                environment,
                intensity = 'medium',
                durationSeconds = 5,
                promptInfluence = 0.3,
            } = input;

            // Check library first
            if (category) {
                const results = await sfxStore.query({
                    category,
                    subcategory,
                    environment,
                    intensity,
                    limit: 5,
                });

                if (results.length > 0) {
                    const index = Math.floor(Math.random() * results.length);
                    const sfx = results[index];
                    if (!sfx) {
                        throw new Error('Unexpected: SFX not found at valid index');
                    }
                    logger.info('[LIBRARY HIT] Found SFX in library', {
                        canonicalKey: sfx.canonicalKey,
                    });

                    // Download from storage
                    const audio = await storage.download(sfx.s3Url);

                    return {
                        audio,
                        durationSeconds: sfx.durationSeconds,
                        format: 'mp3',
                        fromLibrary: true,
                    };
                }
            }

            logger.info('[LIBRARY MISS] Generating new SFX', { text: text.substring(0, 50) });

            // Generate via provider
            const result = await sfxRepository.convert({
                text,
                durationSeconds,
                promptInfluence,
            });

            // Store in storage
            const storagePath = `sfx/${category ?? 'general'}/${Date.now()}-${Bun.hash(text).toString(36)}.mp3`;
            await storage.upload(result.audio, storagePath, {
                contentType: 'audio/mpeg',
            });

            // Store in library
            if (category) {
                try {
                    // Generate canonical key
                    const canonicalParts = [
                        'sfx',
                        category,
                        subcategory ?? 'general',
                        environment ?? 'any',
                        intensity ?? 'any',
                        Bun.hash(text).toString(36),
                    ];
                    const canonicalKey = canonicalParts.join(':');

                    await sfxStore.insert({
                        canonicalKey,
                        category,
                        subcategory,
                        environment,
                        intensity,
                        prompt: text,
                        promptInfluence,
                        s3Url: storagePath,
                        durationSeconds: result.durationSeconds,
                        format: 'mp3',
                        tags: extractTags(text),
                    });
                    logger.info('SFX stored in library', { storagePath });
                } catch (error) {
                    logger.warn('Failed to store SFX in library', {
                        error: error instanceof Error ? error.message : 'Unknown',
                    });
                }
            }

            return {
                audio: result.audio,
                durationSeconds: result.durationSeconds,
                format: 'mp3',
                fromLibrary: false,
            };
        },

        async generateAmbiance(input) {
            const {
                description,
                environment,
                subEnvironment,
                timeOfDay = 'any',
                weather = 'any',
                mood,
                targetDurationSeconds,
                promptInfluence = 0.3,
            } = input;

            // Check library first
            if (environment) {
                const results = await ambianceStore.query({
                    environment,
                    subEnvironment,
                    timeOfDay,
                    weather,
                    mood,
                    limit: 5,
                });

                if (results.length > 0) {
                    const index = Math.floor(Math.random() * results.length);
                    const ambiance = results[index];
                    if (!ambiance) {
                        throw new Error('Unexpected: Ambiance not found at valid index');
                    }
                    logger.info('[LIBRARY HIT] Found ambiance in library', {
                        canonicalKey: ambiance.canonicalKey,
                    });

                    // Download source clip from storage
                    const sourceAudio = await storage.download(ambiance.s3Url);

                    // For simplicity in CLI, return source without additional processing
                    return {
                        audio: sourceAudio,
                        durationSeconds: ambiance.sourceDurationSeconds,
                        sourceClipDurationSeconds: ambiance.sourceDurationSeconds,
                        looped: false,
                        fromLibrary: true,
                    };
                }
            }

            logger.info('[LIBRARY MISS] Generating new ambiance', {
                description: description.substring(0, 50),
            });

            // Generate via provider
            const result = await sfxRepository.convert({
                text: description,
                durationSeconds: Math.min(targetDurationSeconds, 22), // ElevenLabs max
                promptInfluence,
            });

            // Store in storage
            const storagePath = `ambiance/${environment ?? 'general'}/${Date.now()}-${Bun.hash(description).toString(36)}.mp3`;
            await storage.upload(result.audio, storagePath, {
                contentType: 'audio/mpeg',
            });

            // Store in library
            if (environment) {
                try {
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

                    await ambianceStore.insert({
                        canonicalKey,
                        environment,
                        subEnvironment,
                        timeOfDay,
                        weather,
                        mood,
                        prompt: description,
                        promptInfluence,
                        s3Url: storagePath,
                        sourceDurationSeconds: result.durationSeconds,
                        format: 'mp3',
                        isLoopable: true,
                        tags: extractTags(description),
                    });
                    logger.info('Ambiance stored in library', { storagePath });
                } catch (error) {
                    logger.warn('Failed to store ambiance in library', {
                        error: error instanceof Error ? error.message : 'Unknown',
                    });
                }
            }

            return {
                audio: result.audio,
                durationSeconds: result.durationSeconds,
                sourceClipDurationSeconds: result.durationSeconds,
                looped: false,
                fromLibrary: false,
            };
        },

        async generateMusic(input) {
            const {
                mood,
                intensity = 'medium',
                tempo = 'medium',
                variationIndex = 0,
                customPrompt,
                targetDurationSeconds,
                promptInfluence = 0.5,
            } = input;

            // Check library first
            const results = await musicStore.query({
                mood,
                intensity,
                tempo,
                limit: 5,
            });

            if (results.length > 0) {
                const index = Math.floor(Math.random() * results.length);
                const music = results[index];
                if (!music) {
                    throw new Error('Unexpected: Music not found at valid index');
                }
                logger.info('[LIBRARY HIT] Found music in library', {
                    canonicalKey: music.canonicalKey,
                });

                // Download source clip from storage
                const sourceAudio = await storage.download(music.s3Url);

                return {
                    audio: sourceAudio,
                    durationSeconds: music.sourceDurationSeconds,
                    sourceClipDurationSeconds: music.sourceDurationSeconds,
                    looped: false,
                    fromLibrary: true,
                    promptUsed: music.prompt,
                };
            }

            // Build prompt if not custom
            const prompt = customPrompt ?? buildMusicPrompt(mood, intensity, tempo);

            logger.info('[LIBRARY MISS] Generating new music', { mood, intensity, tempo });

            // Generate via provider
            const result = await sfxRepository.convert({
                text: prompt,
                durationSeconds: Math.min(targetDurationSeconds, 22), // ElevenLabs max
                promptInfluence,
            });

            // Store in storage
            const storagePath = `music/${mood}/${Date.now()}-${Bun.hash(prompt).toString(36)}.mp3`;
            await storage.upload(result.audio, storagePath, {
                contentType: 'audio/mpeg',
            });

            // Store in library
            try {
                // Generate canonical key
                const canonicalParts = [
                    'music',
                    mood,
                    intensity ?? 'any',
                    tempo ?? 'any',
                    variationIndex.toString(),
                    Bun.hash(prompt).toString(36),
                ];
                const canonicalKey = canonicalParts.join(':');

                await musicStore.insert({
                    canonicalKey,
                    mood,
                    intensity,
                    tempo,
                    variationIndex,
                    prompt,
                    promptInfluence,
                    s3Url: storagePath,
                    sourceDurationSeconds: result.durationSeconds,
                    format: 'mp3',
                    isLoopable: true,
                    tags: [mood, intensity, tempo],
                });
                logger.info('Music stored in library', { storagePath });
            } catch (error) {
                logger.warn('Failed to store music in library', {
                    error: error instanceof Error ? error.message : 'Unknown',
                });
            }

            return {
                audio: result.audio,
                durationSeconds: result.durationSeconds,
                sourceClipDurationSeconds: result.durationSeconds,
                looped: false,
                fromLibrary: false,
                promptUsed: prompt,
            };
        },

        async getStats() {
            const [sfxStats, ambianceStats, musicStats] = await Promise.all([
                sfxStore.getStats(),
                ambianceStore.getStats(),
                musicStore.getStats(),
            ]);

            return {
                sfx: {
                    total: sfxStats.total,
                    byCategory: sfxStats.byCategory,
                    byEnvironment: sfxStats.byEnvironment,
                },
                ambiance: {
                    total: ambianceStats.total,
                    byEnvironment: ambianceStats.byEnvironment,
                    byMood: ambianceStats.byMood,
                },
                music: {
                    total: musicStats.total,
                    byMood: musicStats.byMood,
                    byIntensity: musicStats.byIntensity,
                },
                topUsed: {
                    sfx: sfxStats.topUsed,
                    ambiance: ambianceStats.topUsed,
                    music: musicStats.topUsed,
                },
            };
        },
    };
}

/**
 * Extract tags from text for search
 */
function extractTags(text: string): string[] {
    const stopWords = new Set([
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
        'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
        'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'not',
        'sound', 'sounds', 'effect', 'effects', 'audio', 'background', 'ambient',
    ]);

    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word))
        .slice(0, 10);
}

/**
 * Build music prompt from mood, intensity, and tempo
 */
function buildMusicPrompt(mood: MusicMood, intensity: MusicIntensity, tempo: MusicTempo): string {
    const moodPrompts: Record<MusicMood, string> = {
        calm: 'Gentle, calming orchestral music with soft strings and peaceful atmosphere',
        mysterious: 'Mysterious, enigmatic music with subtle tension and wonder',
        adventurous: 'Epic adventure music with heroic themes and exciting energy',
        tense: 'Suspenseful, tension-building music with dramatic undertones',
        joyful: 'Happy, uplifting music with cheerful melodies and bright instruments',
        sad: 'Melancholic, emotional music with gentle piano and sorrowful strings',
        magical: 'Enchanting, whimsical music with sparkles, chimes, and wonder',
        serene: 'Peaceful, tranquil music for meditation and quiet moments',
    };

    const intensityModifiers: Record<MusicIntensity, string> = {
        soft: ', very soft and delicate, minimal instrumentation',
        medium: ', balanced dynamics, full but not overwhelming',
        epic: ', grand and powerful, full orchestra with dramatic swells',
    };

    const tempoModifiers: Record<MusicTempo, string> = {
        slow: ', slow tempo around 60 BPM, relaxed pace',
        medium: ', moderate tempo around 90 BPM, comfortable pace',
        fast: ', upbeat tempo around 120 BPM, energetic pace',
    };

    return `${moodPrompts[mood]}${intensityModifiers[intensity]}${tempoModifiers[tempo]}`;
}
