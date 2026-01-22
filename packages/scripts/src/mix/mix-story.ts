/**
 * Mix Story Command
 *
 * Mix all audio tracks from a TTS run into a final story MP3.
 * Uses FFmpegMixerService to combine voice, music, ambiance, and SFX.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';
import { Logger } from '@mio/shared/server/logger';

import { createRunDir, writeJsonFile, readJsonFile } from '../_local-run-store/run-store';
import { FFmpegMixerService } from '@mio/api/services/audio-mixing';
import { MusicStrategyService } from '@mio/api/services/music';
import type { MusicCue } from '@mio/api/services/music';
import type { MusicMood } from '@mio/shared/types';
import type { MixStoryInput } from '@mio/api/services/audio-mixing';

function loadEnv(envFile?: string): void {
    const files = envFile ? [envFile] : ['.env.local', '.env'];
    for (const file of files) {
        if (existsSync(file)) {
            loadDotenv({ path: file });
        }
    }
    loadEnvironmentFromProcessEnv({ override: true });
}

interface TtsRunOutput {
    successCount: number;
    failCount: number;
    totalDurationSeconds: number;
    generationTimeSeconds: number;
    results: Array<{
        id: string;
        success: boolean;
        durationSeconds?: number;
        error?: string;
        outputFile?: string;
    }>;
}

interface TtsRunMeta {
    command: string;
    storyTitle: string;
    language: string;
    segmentCount: number;
    successCount: number;
    failCount: number;
    totalDurationSeconds: number;
    generationTimeSeconds: number;
    createdAt: string;
}

interface TtsSegmentInfo {
    id: string;
    text: string;
    characterName?: string;
    emotion?: string;
    voiceId: string;
}

/**
 * Load music library from directory
 *
 * Expected structure:
 * musicLibraryDir/
 *   calm/
 *     track1.mp3
 *     track2.mp3
 *   mysterious/
 *     track1.mp3
 *   adventurous/
 *     ...
 */
function loadMusicLibrary(libraryDir: string): MusicLibrary {
    if (!existsSync(libraryDir)) {
        throw new Error(`Music library directory not found: ${libraryDir}`);
    }

    const library: MusicLibrary = {};
    const moods = ['calm', 'mysterious', 'adventurous', 'tense', 'joyful', 'sad', 'magical', 'serene'];

    for (const mood of moods) {
        const moodDir = path.join(libraryDir, mood);
        if (existsSync(moodDir)) {
            const files = readdirSync(moodDir)
                .filter(f => f.endsWith('.mp3') || f.endsWith('.wav'))
                .map(f => path.join(moodDir, f));
            if (files.length > 0) {
                library[mood] = files;
            }
        }
    }

    return library;
}

/**
 * Select a music file for a given mood from the library
 */
function selectMusicForMood(library: MusicLibrary, mood: MusicMood): string | null {
    const files = library[mood];
    if (!files || files.length === 0) {
        // Fallback to calm if requested mood not available
        const fallback = library['calm'];
        if (fallback && fallback.length > 0) {
            return fallback[Math.floor(Math.random() * fallback.length)] ?? null;
        }
        return null;
    }
    // Random selection from available files for variety
    return files[Math.floor(Math.random() * files.length)] ?? null;
}

/**
 * Create a mock storage service that reads files from local disk
 */
function createLocalStorageService(baseDir: string) {
    return {
        download: async (filePath: string): Promise<Buffer> => {
            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(baseDir, filePath);
            if (!existsSync(fullPath)) {
                throw new Error(`File not found: ${fullPath}`);
            }
            return readFileSync(fullPath);
        },
        upload: async () => ({ path: '', url: '' }),
        delete: async () => { /* mock */ },
        deleteMany: async () => { /* mock */ },
        getPublicUrl: () => '',
        exists: async () => true,
    };
}

/**
 * Music library structure for auto-music
 */
interface MusicLibrary {
    /** Map of mood to music file paths */
    [mood: string]: string[];
}

/**
 * Output structure for SFX/Ambiance/Music run directories
 */
interface AudioRunOutput {
    successCount: number;
    failCount: number;
    totalDurationSeconds: number;
    generationTimeSeconds: number;
    results: Array<{
        id: string;
        success: boolean;
        durationSeconds?: number;
        actualDuration?: number;
        startTime: number;
        error?: string;
        outputFile?: string;
        description?: string;
        mood?: string;
        looped?: boolean;
    }>;
}

export interface MixStoryCommandArgs {
    ttsRunDir: string;
    music?: string;
    musicVolume?: number;
    enableDucking?: boolean;
    ambiance?: string;
    ambianceVolume?: number;
    loopAmbiance?: boolean;
    sfx?: string[];
    sfxTimings?: number[];
    sfxVolume?: number;
    // Auto-load from run directories
    sfxRunDir?: string;
    ambianceRunDir?: string;
    musicRunDir?: string;
    pauseBetweenSegments?: number;
    outputBitrate?: string;
    storeDir?: string;
    save: boolean;
    envFile?: string;
    dryRun: boolean;
    // Auto-music options
    autoMusic?: boolean;
    musicLibraryDir?: string;
    musicStrategy?: 'punctual' | 'continuous' | 'minimal';
}

export async function runMixStoryCommand(args: MixStoryCommandArgs): Promise<void> {
    loadEnv(args.envFile);

    // Validate TTS run directory
    if (!existsSync(args.ttsRunDir)) {
        throw new Error(`TTS run directory not found: ${args.ttsRunDir}`);
    }

    // Load TTS run metadata
    const outputPath = path.join(args.ttsRunDir, 'output.json');
    const metaPath = path.join(args.ttsRunDir, 'meta.json');
    const segmentsPath = path.join(args.ttsRunDir, 'segments.json');

    if (!existsSync(outputPath)) {
        throw new Error(`output.json not found in TTS run directory. Did the TTS generation complete?`);
    }

    const ttsOutput = readJsonFile<TtsRunOutput>(outputPath);
    const ttsMeta = existsSync(metaPath) ? readJsonFile<TtsRunMeta>(metaPath) : null;
    const ttsSegments = existsSync(segmentsPath) ? readJsonFile<TtsSegmentInfo[]>(segmentsPath) : [];

    // Get successful segments with their audio files
    const successfulResults = ttsOutput.results.filter(r => r.success && r.outputFile);
    if (successfulResults.length === 0) {
        throw new Error('No successful TTS segments found in run directory');
    }

    console.log(`Found ${successfulResults.length} voice segments from "${ttsMeta?.storyTitle ?? 'Unknown'}"`);

    // Build voice track input
    const voiceSegments = successfulResults
        .filter((result): result is typeof result & { outputFile: string } =>
            result.outputFile !== undefined
        )
        .map(result => {
            const segmentInfo = ttsSegments.find(s => s.id === result.id);
            return {
                path: path.join(args.ttsRunDir, result.outputFile),
                duration: result.durationSeconds ?? 0,
                characterName: segmentInfo?.characterName,
                emotion: segmentInfo?.emotion,
            };
        });

    // Build pauses map (pause after each segment except the last)
    const pauses = new Map<number, number>();
    const pauseDuration = args.pauseBetweenSegments ?? 0.5; // Default 0.5s pause
    for (let i = 0; i < voiceSegments.length - 1; i++) {
        pauses.set(i, pauseDuration);
    }

    // Calculate total voice duration (segments + pauses)
    const totalVoiceDuration = voiceSegments.reduce((sum, s) => sum + s.duration, 0)
        + (voiceSegments.length - 1) * pauseDuration;

    // Generate auto-music cues if enabled
    let musicCues: MusicCue[] = [];
    let musicLibrary: MusicLibrary | null = null;

    if (args.autoMusic) {
        if (!args.musicLibraryDir) {
            throw new Error('--music-library-dir is required when using --auto-music');
        }

        console.log('\nGenerating auto-music cues...');
        musicLibrary = loadMusicLibrary(args.musicLibraryDir);
        const availableMoods = Object.keys(musicLibrary);
        console.log(`  Music library loaded: ${availableMoods.length} moods (${availableMoods.join(', ')})`);

        const musicStrategy = new MusicStrategyService();
        const strategyOutput = musicStrategy.generateMusicCues({
            totalDuration: totalVoiceDuration,
            strategy: args.musicStrategy ?? 'punctual',
        });

        musicCues = strategyOutput.cues;
        console.log(`  Strategy: ${strategyOutput.strategy}`);
        console.log(`  Generated ${musicCues.length} music cues (${strategyOutput.coveragePercentage}% coverage)`);

        for (const cue of musicCues) {
            const musicFile = selectMusicForMood(musicLibrary, cue.mood);
            console.log(`    - ${cue.reason}: ${cue.mood} @ ${cue.startTime.toFixed(1)}s for ${cue.duration.toFixed(1)}s`);
            if (!musicFile) {
                console.log(`      [WARN] No music file found for mood "${cue.mood}"`);
            }
        }
    }

    // Build mix input
    const mixInput: MixStoryInput = {
        storyId: `mix-${Date.now()}`,
        voice: {
            segments: voiceSegments.map(s => ({
                path: s.path,
                duration: s.duration,
            })),
            pauses,
        },
    };

    // Add music if provided
    if (args.music) {
        if (!existsSync(args.music)) {
            throw new Error(`Music file not found: ${args.music}`);
        }
        mixInput.music = {
            file: {
                path: args.music,
                duration: 0, // Will be determined by ffprobe
            },
            volume: args.musicVolume ?? 0.15,
            enableDucking: args.enableDucking ?? true,
        };
        console.log(`  + Music: ${path.basename(args.music)} (volume: ${mixInput.music.volume}, ducking: ${mixInput.music.enableDucking})`);
    }

    // Add ambiance if provided
    if (args.ambiance) {
        if (!existsSync(args.ambiance)) {
            throw new Error(`Ambiance file not found: ${args.ambiance}`);
        }
        mixInput.ambiance = {
            file: {
                path: args.ambiance,
                duration: 0,
            },
            volume: args.ambianceVolume ?? 0.3,
            loop: args.loopAmbiance ?? true,
        };
        console.log(`  + Ambiance: ${path.basename(args.ambiance)} (volume: ${mixInput.ambiance.volume}, loop: ${mixInput.ambiance.loop})`);
    }

    // Add SFX if provided
    const sfxFiles: Array<{ path: string; duration: number; startTime: number; volume?: number }> = [];

    // Load SFX from run directory if provided
    if (args.sfxRunDir) {
        if (!existsSync(args.sfxRunDir)) {
            throw new Error(`SFX run directory not found: ${args.sfxRunDir}`);
        }
        const sfxOutputPath = path.join(args.sfxRunDir, 'output.json');
        if (!existsSync(sfxOutputPath)) {
            throw new Error(`output.json not found in SFX run directory. Did the SFX generation complete?`);
        }
        const sfxOutput = readJsonFile<AudioRunOutput>(sfxOutputPath);
        const sfxResults = sfxOutput.results.filter(r => r.success && r.outputFile);

        console.log(`  + SFX from run dir: ${sfxResults.length} files`);
        for (const result of sfxResults) {
            if (!result.outputFile) continue;
            const sfxPath = path.join(args.sfxRunDir, result.outputFile);
            if (existsSync(sfxPath)) {
                sfxFiles.push({
                    path: sfxPath,
                    duration: result.actualDuration ?? result.durationSeconds ?? 0,
                    startTime: result.startTime,
                });
                console.log(`    [${result.id}] @ ${result.startTime.toFixed(1)}s - ${result.description?.substring(0, 30) ?? 'SFX'}...`);
            }
        }
    }

    // Add manually specified SFX
    if (args.sfx && args.sfx.length > 0) {
        for (let index = 0; index < args.sfx.length; index++) {
            const sfxPath = args.sfx[index];
            if (sfxPath && !existsSync(sfxPath)) {
                throw new Error(`SFX file not found: ${sfxPath}`);
            }
            if (sfxPath) {
                sfxFiles.push({
                    path: sfxPath,
                    duration: 0,
                    startTime: args.sfxTimings?.[index] ?? 0,
                });
            }
        }
        console.log(`  + SFX (manual): ${args.sfx.length} files`);
    }

    // Load ambiance from run directory if provided
    if (args.ambianceRunDir) {
        if (!existsSync(args.ambianceRunDir)) {
            throw new Error(`Ambiance run directory not found: ${args.ambianceRunDir}`);
        }
        const ambianceOutputPath = path.join(args.ambianceRunDir, 'output.json');
        if (!existsSync(ambianceOutputPath)) {
            throw new Error(`output.json not found in ambiance run directory. Did the ambiance generation complete?`);
        }
        const ambianceOutput = readJsonFile<AudioRunOutput>(ambianceOutputPath);
        const ambianceResults = ambianceOutput.results.filter(r => r.success && r.outputFile);

        if (ambianceResults.length > 0) {
            // For ambiance, we typically use the first one as the main ambiance track
            // Additional ambiance files can be added as SFX with their timings
            const mainAmbiance = ambianceResults[0];
            if (mainAmbiance?.outputFile) {
                const ambiancePath = path.join(args.ambianceRunDir, mainAmbiance.outputFile);
                if (existsSync(ambiancePath) && !mixInput.ambiance) {
                    mixInput.ambiance = {
                        file: {
                            path: ambiancePath,
                            duration: mainAmbiance.actualDuration ?? mainAmbiance.durationSeconds ?? 0,
                        },
                        volume: args.ambianceVolume ?? 0.3,
                        loop: args.loopAmbiance ?? true,
                    };
                    console.log(`  + Ambiance from run dir: ${mainAmbiance.description?.substring(0, 30) ?? 'Ambiance'}...`);
                }
            }

            // Additional ambiance files are treated as timed SFX
            for (let i = 1; i < ambianceResults.length; i++) {
                const result = ambianceResults[i];
                if (result?.outputFile) {
                    const filePath = path.join(args.ambianceRunDir, result.outputFile);
                    if (existsSync(filePath)) {
                        sfxFiles.push({
                            path: filePath,
                            duration: result.actualDuration ?? result.durationSeconds ?? 0,
                            startTime: result.startTime,
                            volume: 0.3, // Ambiance volume
                        });
                        console.log(`    [${result.id}] @ ${result.startTime.toFixed(1)}s - ${result.description?.substring(0, 30) ?? 'Ambiance'}...`);
                    }
                }
            }
        }
    }

    // Load music from run directory if provided
    if (args.musicRunDir) {
        if (!existsSync(args.musicRunDir)) {
            throw new Error(`Music run directory not found: ${args.musicRunDir}`);
        }
        const musicOutputPath = path.join(args.musicRunDir, 'output.json');
        if (!existsSync(musicOutputPath)) {
            throw new Error(`output.json not found in music run directory. Did the music generation complete?`);
        }
        const musicOutput = readJsonFile<AudioRunOutput>(musicOutputPath);
        const musicResults = musicOutput.results.filter(r => r.success && r.outputFile);

        console.log(`  + Music from run dir: ${musicResults.length} files`);
        // Music files are added as timed SFX with appropriate volume
        for (const result of musicResults) {
            if (result.outputFile) {
                const musicPath = path.join(args.musicRunDir, result.outputFile);
                if (existsSync(musicPath)) {
                    sfxFiles.push({
                        path: musicPath,
                        duration: result.actualDuration ?? result.durationSeconds ?? 0,
                        startTime: result.startTime,
                        volume: args.musicVolume ?? 0.15, // Music volume
                    });
                    console.log(`    [${result.id}] @ ${result.startTime.toFixed(1)}s - ${result.mood ?? 'Music'}`);
                }
            }
        }
    }

    // Add auto-music cues as SFX (with music-appropriate volume)
    if (args.autoMusic && musicLibrary && musicCues.length > 0) {
        console.log('  + Auto-music cues:');
        for (const cue of musicCues) {
            const musicFile = selectMusicForMood(musicLibrary, cue.mood);
            if (musicFile) {
                sfxFiles.push({
                    path: musicFile,
                    duration: 0, // Will use actual file duration
                    startTime: cue.startTime,
                    volume: cue.volume, // Use cue-specific volume (typically 0.12-0.20)
                });
                console.log(`    [${cue.reason}] ${path.basename(musicFile)} @ ${cue.startTime.toFixed(1)}s (vol: ${cue.volume})`);
            }
        }
    }

    // Add SFX to mix input if we have any
    if (sfxFiles.length > 0) {
        mixInput.sfx = {
            files: sfxFiles,
            volume: args.sfxVolume ?? 0.8, // Default SFX volume (individual files can override)
        };
    }

    // Set output format
    if (args.outputBitrate) {
        mixInput.output = {
            bitrate: args.outputBitrate,
        };
    }

    // Create run directory for artifacts
    const run = args.save
        ? createRunDir({
            rootDir: args.storeDir,
            namespace: 'mix',
            command: 'mix-story',
            labelParts: [ttsMeta?.storyTitle?.substring(0, 20) ?? 'story'],
        })
        : null;

    // Save input
    if (run) {
        writeJsonFile(run.runDir, 'input.json', {
            ttsRunDir: args.ttsRunDir,
            storyTitle: ttsMeta?.storyTitle,
            voiceSegmentCount: voiceSegments.length,
            pauseBetweenSegments: pauseDuration,
            hasMusic: !!args.music,
            hasAmbiance: !!args.ambiance,
            sfxCount: args.sfx?.length ?? 0,
            autoMusic: args.autoMusic ?? false,
            autoMusicStrategy: args.musicStrategy ?? 'punctual',
            autoMusicCues: musicCues.length,
            totalVoiceDuration: totalVoiceDuration,
            dryRun: args.dryRun,
        });
    }

    if (args.dryRun) {
        const payload = {
            storyTitle: ttsMeta?.storyTitle,
            totalVoiceDuration: totalVoiceDuration.toFixed(2),
            voiceSegments: voiceSegments.map(s => ({
                path: path.basename(s.path),
                duration: s.duration,
                characterName: s.characterName,
            })),
            pauseBetweenSegments: pauseDuration,
            music: args.music ? path.basename(args.music) : null,
            ambiance: args.ambiance ? path.basename(args.ambiance) : null,
            sfx: args.sfx?.map(s => path.basename(s)) ?? [],
            autoMusic: args.autoMusic ? {
                strategy: args.musicStrategy ?? 'punctual',
                cues: musicCues.map(c => ({
                    reason: c.reason,
                    mood: c.mood,
                    startTime: c.startTime.toFixed(1),
                    duration: c.duration.toFixed(1),
                    volume: c.volume,
                })),
            } : null,
            outputBitrate: args.outputBitrate ?? '192k',
            artifactsDir: run?.runDir,
        };
        console.log('\n[DRY RUN] Mix parameters:');
        console.log(JSON.stringify(payload, null, 2));
        return;
    }

    // Initialize services
    const logger = await Logger.create();
    const localStorage = createLocalStorageService('');
    const mixerService = new FFmpegMixerService(logger, localStorage);

    // Verify FFmpeg
    console.log('\nVerifying FFmpeg...');
    const ffmpegInfo = await mixerService.verifyFFmpegInstalled();
    console.log(`  FFmpeg: ${ffmpegInfo.version}`);
    console.log(`  Codecs: libmp3lame=${ffmpegInfo.codecs.libmp3lame}, aac=${ffmpegInfo.codecs.aac}`);

    // Mix story
    console.log('\nMixing story...');
    const startTime = Date.now();

    const result = await mixerService.mixStory(mixInput);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\nMix complete!`);
    console.log(`  Duration: ${result.duration.toFixed(2)}s`);
    console.log(`  Format: ${result.format.codec} @ ${result.format.bitrate}`);
    console.log(`  Size: ${(result.audio.length / 1024).toFixed(1)} KB`);
    console.log(`  Processing time: ${elapsed}s`);

    // Save output
    if (run) {
        const outputFilename = 'mixed-story.mp3';
        const outputPath = path.join(run.runDir, outputFilename);
        writeFileSync(outputPath, result.audio);

        writeJsonFile(run.runDir, 'output.json', {
            durationSeconds: result.duration,
            format: result.format,
            sizeBytes: result.audio.length,
            processingTimeSeconds: parseFloat(elapsed),
            outputFile: outputFilename,
        });

        writeJsonFile(run.runDir, 'meta.json', {
            command: 'mix mix-story',
            storyTitle: ttsMeta?.storyTitle,
            voiceSegmentCount: voiceSegments.length,
            durationSeconds: result.duration,
            format: result.format,
            processingTimeSeconds: parseFloat(elapsed),
            createdAt: new Date().toISOString(),
        });

        console.log(`\nOutput saved to: ${outputPath}`);
    }
}
