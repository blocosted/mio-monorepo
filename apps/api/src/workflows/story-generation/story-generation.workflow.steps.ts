/**
 * Story Generation Workflow Steps
 *
 * Implements all 9 steps of the story generation workflow:
 * 1. Enrichment
 * 2. Script Generation
 * 3. Voice Generation (parallel with concurrency control)
 * 4. SFX Generation
 * 5. Music Generation
 * 6. Ambiance Generation
 * 7. Audio Mixing (with S3 temp upload)
 * 8. Upload Final (with cleanup)
 * 9. Finalization (DB transaction)
 */

import pLimit from 'p-limit';
import { getInstance, IocService, IocStore, IocConnection } from '../../ioc';
import { WorkflowStepHelper } from './story-generation.workflow.helper';
import {
    type StoryGenerationWorkflowContext,
    WORKFLOW_STEPS,
} from './story-generation.workflow.types';
import { VOICE_GENERATION_CONCURRENCY, S3_TEMP_PATHS, getStepConfig } from './story-generation.workflow.constants';
import type { IEnrichmentService } from '../../services/llm/enrichment.service.types';
import type { IScriptGenerationService, StoryScript } from '../../services/stories/script-generation.service.types';
import type { ITTSService } from '../../services/audio/tts.service.types';
import type { ISfxService } from '../../services/audio/sfx.service.types';
import type { IMusicGeneratorService } from '../../services/audio/music-generator.service.types';
import type { IAmbianceGeneratorService } from '../../services/audio/ambiance-generator.service.types';
import type { IFFmpegMixerService } from '../../services/audio/ffmpeg-mixer.service.types';
import type { IStorageService } from '../../services/storage/storage.service.types';
import type { StoriesStore } from '../../services/stories/stories.store';
import type { ProfilesStore } from '../../services/profiles/profiles.service.store';
import type { AudioAssetsStore } from '../../services/audio/audio-assets.store';
import type { GenerationJobsStore } from '../../services/stories/generation-jobs.store';
import type { IJobProgressService } from '../../services/cache';
import { AudioAssetType } from '@mio/shared/types';
import type { Logger } from '@mio/shared/server/logger/Logger';

const getLogger = () => getInstance<Logger>(IocConnection.LOGGER);

/**
 * Step 1: Enrichment
 * Enriches the story prompt with child profile information
 */
export async function enrichmentStep(
    context: StoryGenerationWorkflowContext
): Promise<StoryGenerationWorkflowContext> {
    const config = getStepConfig(WORKFLOW_STEPS.ENRICHMENT);
    const helper = new WorkflowStepHelper();

    return helper.executeStepWithRollback(
        context.jobId,
        config.name,
        async () => {
            // Check if job is cancelled
            if (await helper.isJobCancelled(context.jobId)) {
                throw new Error('Job cancelled by user');
            }

            // Load services
            const enrichmentService = getInstance<IEnrichmentService>(IocService.ENRICHMENT);
            const storiesStore = getInstance<StoriesStore>(IocStore.STORIES_STORE);
            const profilesStore = getInstance<ProfilesStore>(IocStore.PROFILES_STORE);

            // Update progress
            await helper.updateProgress(
                context.jobId,
                config.startProgress,
                config.name
            );

            // Load story from DB
            const story = await storiesStore.findById(context.storyId);
            if (!story) {
                throw new Error(`Story not found: ${context.storyId}`);
            }

            // Load child profile
            const childProfile = await profilesStore.findById(story.childProfileId);
            if (!childProfile) {
                throw new Error(`Child profile not found: ${story.childProfileId}`);
            }

            // Build enrichment profile from child profile
            const { enrichedConcept } = await enrichmentService.enrichStory({
                story: {
                    id: context.storyId,
                    initialPrompt: story.initialPrompt,
                },
                profile: {
                    firstName: childProfile.firstName,
                    age: childProfile.age,
                    gender: childProfile.gender,
                    favoriteThemes: childProfile.preferences.favoriteThemes,
                    avoidThemes: childProfile.preferences.avoidThemes,
                    includeChildAsCharacter: childProfile.preferences.includeChildAsCharacter,
                    preferredHeroGender: childProfile.preferences.preferredHeroGender,
                    language: childProfile.preferences.language ?? 'fr',
                },
            });

            // Update story in DB
            await storiesStore.updateEnrichedConcept(context.storyId, enrichedConcept);

            // Update progress
            await helper.updateProgress(
                context.jobId,
                config.endProgress,
                config.name,
                { enrichedConcept }
            );

            return {
                ...context,
                enrichedConcept,
            };
        },
        undefined,
        { retries: config.retries, timeout: config.timeout }
    );
}

/**
 * Step 2: Script Generation
 * Generates the story script from enriched concept
 */
export async function scriptGenerationStep(
    context: StoryGenerationWorkflowContext
): Promise<StoryGenerationWorkflowContext> {
    const config = getStepConfig(WORKFLOW_STEPS.SCRIPT_GENERATION);
    const helper = new WorkflowStepHelper();

    if (!context.enrichedConcept) {
        throw new Error('Enriched concept not found in context');
    }

    // Store in const to satisfy TypeScript that it's not undefined
    const enrichedConcept = context.enrichedConcept;

    return helper.executeStepWithRollback(
        context.jobId,
        config.name,
        async () => {
            if (await helper.isJobCancelled(context.jobId)) {
                throw new Error('Job cancelled by user');
            }

            const scriptService = getInstance<IScriptGenerationService>(IocService.SCRIPT_GENERATION);
            const storiesStore = getInstance<StoriesStore>(IocStore.STORIES_STORE);

            await helper.updateProgress(context.jobId, config.startProgress, config.name);

            // Generate script using new simplified API
            const result = await scriptService.generateScript({
                storyId: context.storyId,
                enrichedConcept,
                targetDurationMinutes: context.targetDurationMinutes,
            });

            // Update story in DB
            await storiesStore.updateScript(context.storyId, result.script);

            await helper.updateProgress(context.jobId, config.endProgress, config.name);

            return {
                ...context,
                script: result.script,
            };
        },
        undefined,
        { retries: config.retries, timeout: config.timeout }
    );
}

/**
 * Step 3: Voice Generation
 * Generates voice audio for all voice segments (with concurrency control)
 */
export async function voiceGenerationStep(
    context: StoryGenerationWorkflowContext
): Promise<StoryGenerationWorkflowContext> {
    const config = getStepConfig(WORKFLOW_STEPS.VOICE_GENERATION);
    const helper = new WorkflowStepHelper();

    if (!context.script) {
        throw new Error('Script not found in context');
    }

    // Store in const to satisfy TypeScript that it's not undefined
    const script = context.script;

    return helper.executeStepWithRollback(
        context.jobId,
        config.name,
        async () => {
            if (await helper.isJobCancelled(context.jobId)) {
                throw new Error('Job cancelled by user');
            }

            const ttsService = getInstance<ITTSService>(IocService.TTS);
            const audioAssetsStore = getInstance<AudioAssetsStore>(IocStore.AUDIO_ASSETS_STORE);

            await helper.updateProgress(context.jobId, config.startProgress, config.name);

            // Extract voice segments from script (using old StoryScript structure)
            const voiceSegments = script.voiceSegments || [];

            getLogger().info('Generating voice audio', {
                jobId: context.jobId,
                segmentCount: voiceSegments.length,
            });

            // Generate with concurrency control
            const limit = pLimit(VOICE_GENERATION_CONCURRENCY);
            const progressPerSegment = (config.endProgress - config.startProgress) / voiceSegments.length;
            let currentProgress = config.startProgress;

            const voiceAssetIds: string[] = [];

            const generateVoiceSegment = async (segment: StoryScript['voiceSegments'][number], index: number) => {
                try {
                    // Check for existing asset (idempotency)
                    const cacheKey = `voice_${context.storyId}_${segment.id}`;
                    const existing = await audioAssetsStore.findByCacheKey(cacheKey);

                    let assetId: string;

                    if (existing) {
                        getLogger().info('Using cached voice asset', { cacheKey });
                        assetId = existing.id;
                    } else {
                        // Generate new voice audio
                        const result = await ttsService.generateVoice({
                            text: segment.text,
                            voiceId: segment.voiceId,
                        });

                        // Upload to storage
                        const storageService = getInstance<IStorageService>(IocService.STORAGE);
                        const voicePath = `stories/${context.storyId}/voice/${segment.id}.mp3`;
                        const uploadResult = await storageService.upload(
                            result.audioBuffer,
                            voicePath,
                            { contentType: 'audio/mpeg' }
                        );

                        // Store in audioAssets
                        const asset = await audioAssetsStore.create({
                            storyId: context.storyId,
                            type: AudioAssetType.Voice,
                            url: uploadResult.url,
                            duration: result.duration,
                            cacheKey,
                        });

                        assetId = asset.id;
                    }

                    // Update progress incrementally
                    currentProgress += progressPerSegment;
                    await helper.updateProgress(
                        context.jobId,
                        Math.min(Math.floor(currentProgress), config.endProgress),
                        config.name,
                        { voiceSegmentsCompleted: index + 1, totalVoiceSegments: voiceSegments.length }
                    );

                    return assetId;
                } catch (error) {
                    getLogger().error('Failed to generate voice segment', {
                        jobId: context.jobId,
                        segmentIndex: index,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    // Skip failed segments (partial success is OK)
                    return null;
                }
            };

            const results = await Promise.all(
                voiceSegments.map((segment, index) =>
                    limit(() => generateVoiceSegment(segment, index))
                )
            );

            // Filter out nulls (failed segments)
            voiceAssetIds.push(...results.filter((id): id is string => id !== null));

            await helper.updateProgress(context.jobId, config.endProgress, config.name);

            return {
                ...context,
                voiceAssetIds,
            };
        },
        undefined,
        { retries: config.retries, timeout: config.timeout }
    );
}

/**
 * Step 4: SFX Generation
 * Generates sound effects audio
 */
export async function sfxGenerationStep(
    context: StoryGenerationWorkflowContext
): Promise<StoryGenerationWorkflowContext> {
    const config = getStepConfig(WORKFLOW_STEPS.SFX_GENERATION);
    const helper = new WorkflowStepHelper();

    if (!context.script) {
        throw new Error('Script not found in context');
    }

    // Store in const to satisfy TypeScript that it's not undefined
    const script = context.script;

    return helper.executeStepWithRollback(
        context.jobId,
        config.name,
        async () => {
            if (await helper.isJobCancelled(context.jobId)) {
                throw new Error('Job cancelled by user');
            }

            const sfxService = getInstance<ISfxService>(IocService.SFX);
            const storageService = getInstance<IStorageService>(IocService.STORAGE);
            const audioAssetsStore = getInstance<AudioAssetsStore>(IocStore.AUDIO_ASSETS_STORE);

            await helper.updateProgress(context.jobId, config.startProgress, config.name);

            // Extract SFX segments from script (using old StoryScript structure)
            const sfxSegments = script.sfxSegments || [];

            getLogger().info('Generating SFX audio', {
                jobId: context.jobId,
                segmentCount: sfxSegments.length,
            });

            const sfxAssetIds: string[] = [];

            for (const segment of sfxSegments) {
                try {
                    // Check for existing asset (idempotency)
                    const cacheKey = `sfx_${context.storyId}_${segment.id}`;
                    const existing = await audioAssetsStore.findByCacheKey(cacheKey);

                    if (existing) {
                        getLogger().info('Using cached SFX asset', { cacheKey });
                        sfxAssetIds.push(existing.id);
                    } else {
                        // Generate SFX audio
                        const result = await sfxService.generateSfx({
                            description: segment.description,
                            duration: segment.duration,
                        });

                        // Upload to storage
                        const sfxPath = `stories/${context.storyId}/sfx/${segment.id}.mp3`;
                        const uploadResult = await storageService.upload(
                            result.audioBuffer,
                            sfxPath,
                            { contentType: 'audio/mpeg' }
                        );

                        // Store in audioAssets
                        const asset = await audioAssetsStore.create({
                            storyId: context.storyId,
                            type: AudioAssetType.Sfx,
                            url: uploadResult.url,
                            duration: result.duration,
                            cacheKey,
                        });

                        sfxAssetIds.push(asset.id);
                    }
                } catch (error) {
                    getLogger().error('Failed to generate SFX segment', {
                        jobId: context.jobId,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }

            await helper.updateProgress(context.jobId, config.endProgress, config.name);

            return {
                ...context,
                sfxAssetIds,
            };
        },
        undefined,
        { retries: config.retries, timeout: config.timeout }
    );
}

/**
 * Step 5: Music Generation
 * Generates background music
 */
export async function musicGenerationStep(
    context: StoryGenerationWorkflowContext
): Promise<StoryGenerationWorkflowContext> {
    const config = getStepConfig(WORKFLOW_STEPS.MUSIC_GENERATION);
    const helper = new WorkflowStepHelper();

    if (!context.script) {
        throw new Error('Script not found in context');
    }

    // Store in const to satisfy TypeScript that it's not undefined
    const script = context.script;

    return helper.executeStepWithRollback(
        context.jobId,
        config.name,
        async () => {
            if (await helper.isJobCancelled(context.jobId)) {
                throw new Error('Job cancelled by user');
            }

            const musicService = getInstance<IMusicGeneratorService>(IocService.MUSIC_GENERATOR);
            const storageService = getInstance<IStorageService>(IocService.STORAGE);
            const audioAssetsStore = getInstance<AudioAssetsStore>(IocStore.AUDIO_ASSETS_STORE);

            await helper.updateProgress(context.jobId, config.startProgress, config.name);

            // Extract music segments from script (using old StoryScript structure)
            const musicSegments = script.musicSegments || [];

            getLogger().info('Generating music audio', {
                jobId: context.jobId,
                segmentCount: musicSegments.length,
            });

            const musicAssetIds: string[] = [];

            for (const segment of musicSegments) {
                try {
                    // Check for existing asset (idempotency)
                    const cacheKey = `music_${context.storyId}_${segment.id}`;
                    const existing = await audioAssetsStore.findByCacheKey(cacheKey);

                    if (existing) {
                        getLogger().info('Using cached music asset', { cacheKey });
                        musicAssetIds.push(existing.id);
                    } else {
                        // Generate music audio
                        const result = await musicService.generateMusic({
                            description: segment.description,
                            mood: segment.mood,
                            duration: segment.duration,
                        });

                        // Upload to storage
                        const musicPath = `stories/${context.storyId}/music/${segment.id}.mp3`;
                        const uploadResult = await storageService.upload(
                            result.audioBuffer,
                            musicPath,
                            { contentType: 'audio/mpeg' }
                        );

                        // Store in audioAssets
                        const asset = await audioAssetsStore.create({
                            storyId: context.storyId,
                            type: AudioAssetType.Music,
                            url: uploadResult.url,
                            duration: result.duration,
                            cacheKey,
                        });

                        musicAssetIds.push(asset.id);
                    }
                } catch (error) {
                    getLogger().error('Failed to generate music segment', {
                        jobId: context.jobId,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }

            await helper.updateProgress(context.jobId, config.endProgress, config.name);

            return {
                ...context,
                musicAssetIds,
            };
        },
        undefined,
        { retries: config.retries, timeout: config.timeout }
    );
}

/**
 * Step 6: Ambiance Generation
 * Generates ambient sounds
 */
export async function ambianceGenerationStep(
    context: StoryGenerationWorkflowContext
): Promise<StoryGenerationWorkflowContext> {
    const config = getStepConfig(WORKFLOW_STEPS.AMBIANCE_GENERATION);
    const helper = new WorkflowStepHelper();

    if (!context.script) {
        throw new Error('Script not found in context');
    }

    // Store in const to satisfy TypeScript that it's not undefined
    const script = context.script;

    return helper.executeStepWithRollback(
        context.jobId,
        config.name,
        async () => {
            if (await helper.isJobCancelled(context.jobId)) {
                throw new Error('Job cancelled by user');
            }

            const ambianceService = getInstance<IAmbianceGeneratorService>(IocService.AMBIANCE_GENERATOR);
            const storageService = getInstance<IStorageService>(IocService.STORAGE);
            const audioAssetsStore = getInstance<AudioAssetsStore>(IocStore.AUDIO_ASSETS_STORE);

            await helper.updateProgress(context.jobId, config.startProgress, config.name);

            // Extract ambiance config from script (using old StoryScript structure)
            const ambianceConfig = script.ambianceConfig;

            getLogger().info('Generating ambiance audio', {
                jobId: context.jobId,
                ambianceConfig,
            });

            const ambianceAssetIds: string[] = [];

            if (ambianceConfig) {
                try {
                    // Check for existing asset (idempotency)
                    const cacheKey = `ambiance_${context.storyId}`;
                    const existing = await audioAssetsStore.findByCacheKey(cacheKey);

                    if (existing) {
                        getLogger().info('Using cached ambiance asset', { cacheKey });
                        ambianceAssetIds.push(existing.id);
                    } else {
                        // Generate ambiance audio
                        const result = await ambianceService.generateAmbiance({
                            description: ambianceConfig.description,
                            mood: ambianceConfig.mood,
                            intensity: ambianceConfig.intensity,
                            duration: script.totalDuration,
                        });

                        // Upload to storage
                        const ambiancePath = `stories/${context.storyId}/ambiance/ambiance.mp3`;
                        const uploadResult = await storageService.upload(
                            result.audioBuffer,
                            ambiancePath,
                            { contentType: 'audio/mpeg' }
                        );

                        // Store in audioAssets
                        const asset = await audioAssetsStore.create({
                            storyId: context.storyId,
                            type: AudioAssetType.Ambiance,
                            url: uploadResult.url,
                            duration: result.duration,
                            cacheKey,
                        });

                        ambianceAssetIds.push(asset.id);
                    }
                } catch (error) {
                    getLogger().error('Failed to generate ambiance', {
                        jobId: context.jobId,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }

            await helper.updateProgress(context.jobId, config.endProgress, config.name);

            return {
                ...context,
                ambianceAssetIds,
            };
        },
        undefined,
        { retries: config.retries, timeout: config.timeout }
    );
}

/**
 * Step 7: Audio Mixing
 * Mix all audio assets together and upload to S3 temp location
 */
export async function mixingStep(
    context: StoryGenerationWorkflowContext
): Promise<StoryGenerationWorkflowContext> {
    const config = getStepConfig(WORKFLOW_STEPS.MIXING);
    const helper = new WorkflowStepHelper();

    if (!context.script) {
        throw new Error('Script not found in context');
    }

    // Store in const to satisfy TypeScript that it's not undefined
    const script = context.script;

    return helper.executeStepWithRollback(
        context.jobId,
        config.name,
        async () => {
            if (await helper.isJobCancelled(context.jobId)) {
                throw new Error('Job cancelled by user');
            }

            const mixerService = getInstance<IFFmpegMixerService>(IocService.FFMPEG_MIXER);
            const storageService = getInstance<IStorageService>(IocService.STORAGE);
            const audioAssetsStore = getInstance<AudioAssetsStore>(IocStore.AUDIO_ASSETS_STORE);

            await helper.updateProgress(context.jobId, config.startProgress, config.name);

            // Load all audio assets from DB
            const voiceAssets = context.voiceAssetIds
                ? await Promise.all(
                    context.voiceAssetIds.map((id) => audioAssetsStore.findById(id))
                )
                : [];
            const sfxAssets = context.sfxAssetIds
                ? await Promise.all(context.sfxAssetIds.map((id) => audioAssetsStore.findById(id)))
                : [];
            const musicAssets = context.musicAssetIds
                ? await Promise.all(
                    context.musicAssetIds.map((id) => audioAssetsStore.findById(id))
                )
                : [];
            const ambianceAssets = context.ambianceAssetIds
                ? await Promise.all(
                    context.ambianceAssetIds.map((id) => audioAssetsStore.findById(id))
                )
                : [];

            // Filter out nulls
            const validVoiceAssets = voiceAssets.filter((a): a is NonNullable<typeof a> => a !== null);
            const validSfxAssets = sfxAssets.filter((a): a is NonNullable<typeof a> => a !== null);
            const validMusicAssets = musicAssets.filter((a): a is NonNullable<typeof a> => a !== null);
            const validAmbianceAssets = ambianceAssets.filter((a): a is NonNullable<typeof a> => a !== null);

            // Build mixer input from assets and script
            const voiceTracks = script.voiceSegments.map((segment, index) => ({
                id: segment.id,
                url: validVoiceAssets[index]?.url || '',
                startTime: segment.startTime,
                volume: 1.0,
            }));

            const sfxTracks = script.sfxSegments.map((segment, index) => ({
                id: segment.id,
                url: validSfxAssets[index]?.url || '',
                startTime: segment.startTime,
                volume: 0.7,
            }));

            const musicTracks = script.musicSegments.map((segment, index) => ({
                id: segment.id,
                url: validMusicAssets[index]?.url || '',
                startTime: segment.startTime,
                volume: 0.3,
            }));

            const ambianceTracks = validAmbianceAssets.map((asset) => ({
                id: asset.id,
                url: asset.url,
                startTime: 0,
                volume: 0.2,
            }));

            // Mix audio
            const result = await mixerService.mixStory({
                voiceTracks,
                sfxTracks,
                musicTracks,
                ambianceTracks,
            });

            // Upload to S3 temp location
            const tempPath = S3_TEMP_PATHS.getMixedAudioPath(context.storyId);
            const tempUrl = await storageService.upload(
                result.buffer,
                tempPath,
                { contentType: 'audio/mpeg' }
            );

            getLogger().info('Mixed audio uploaded to temp location', {
                jobId: context.jobId,
                tempUrl: tempUrl.url,
                duration: result.duration,
            });

            await helper.updateProgress(context.jobId, config.endProgress, config.name);

            return {
                ...context,
                tempMixedAudioUrl: tempUrl.url,
                duration: result.duration,
            };
        },
        async () => {
            // Rollback: delete temp file from S3
            const storageService = getInstance<IStorageService>(IocService.STORAGE);
            const tempPath = S3_TEMP_PATHS.getMixedAudioPath(context.storyId);
            try {
                await storageService.delete(tempPath);
            } catch (err) {
                getLogger().warn('Failed to delete temp file during rollback', {
                    path: tempPath,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        },
        { retries: config.retries, timeout: config.timeout }
    );
}

/**
 * Step 8: Upload Final
 * Move mixed audio from temp to final location and cleanup temp
 */
export async function uploadStep(
    context: StoryGenerationWorkflowContext
): Promise<StoryGenerationWorkflowContext> {
    const config = getStepConfig(WORKFLOW_STEPS.UPLOAD);
    const helper = new WorkflowStepHelper();

    if (!context.tempMixedAudioUrl) {
        throw new Error('Temp mixed audio URL not found in context');
    }

    return helper.executeStepWithRollback(
        context.jobId,
        config.name,
        async () => {
            if (await helper.isJobCancelled(context.jobId)) {
                throw new Error('Job cancelled by user');
            }

            const storageService = getInstance<IStorageService>(IocService.STORAGE);
            const audioAssetsStore = getInstance<AudioAssetsStore>(IocStore.AUDIO_ASSETS_STORE);

            await helper.updateProgress(context.jobId, config.startProgress, config.name);

            // Download buffer from temp location
            const tempPath = S3_TEMP_PATHS.getMixedAudioPath(context.storyId);
            const buffer = await storageService.download(tempPath);

            // Upload to final location
            const finalPath = S3_TEMP_PATHS.getFinalAudioPath(context.storyId);
            const finalUrl = await storageService.upload(
                buffer,
                finalPath,
                { contentType: 'audio/mpeg' }
            );

            // Store in audioAssets
            await audioAssetsStore.create({
                storyId: context.storyId,
                type: AudioAssetType.FinalMix,
                url: finalUrl.url,
                duration: context.duration ?? 0,
            });

            // Delete temp file
            await storageService.delete(tempPath);

            getLogger().info('Final audio uploaded and temp cleaned', {
                jobId: context.jobId,
                finalUrl: finalUrl.url,
            });

            await helper.updateProgress(context.jobId, config.endProgress, config.name);

            return {
                ...context,
                finalAudioUrl: finalUrl.url,
            };
        },
        async () => {
            // Rollback: delete both temp and final files
            const storageService = getInstance<IStorageService>(IocService.STORAGE);
            try {
                await storageService.delete(S3_TEMP_PATHS.getMixedAudioPath(context.storyId));
                await storageService.delete(S3_TEMP_PATHS.getFinalAudioPath(context.storyId));
            } catch (err) {
                getLogger().warn('Failed to delete files during rollback', {
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        },
        { retries: config.retries, timeout: config.timeout }
    );
}

/**
 * Step 9: Finalization
 * Update DB with final results in a transaction
 */
export async function finalizationStep(
    context: StoryGenerationWorkflowContext
): Promise<StoryGenerationWorkflowContext> {
    const config = getStepConfig(WORKFLOW_STEPS.FINALIZATION);
    const helper = new WorkflowStepHelper();

    if (!context.finalAudioUrl) {
        throw new Error('Final audio URL not found in context');
    }

    return helper.executeStepWithRollback(
        context.jobId,
        config.name,
        async () => {
            if (await helper.isJobCancelled(context.jobId)) {
                throw new Error('Job cancelled by user');
            }

            const storiesStore = getInstance<StoriesStore>(IocStore.STORIES_STORE);
            const jobsStore = getInstance<GenerationJobsStore>(IocStore.GENERATION_JOBS_STORE);
            const jobProgress = getInstance<IJobProgressService>(IocService.JOB_PROGRESS);

            await helper.updateProgress(context.jobId, config.startProgress, config.name);

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const finalAudioUrl = context.finalAudioUrl!;

            // Update story (status=ready, finalAudioUrl, duration)
            await storiesStore.finalize(context.storyId, {
                finalAudioUrl,
                duration: context.duration ?? 0,
            });

            // Update job (status=completed, progress=100, result)
            await jobsStore.complete(context.jobId, {
                audioUrl: finalAudioUrl,
                duration: context.duration ?? 0,
            });

            // Update Redis cache + publish completion event
            await jobProgress.update(context.jobId, {
                status: 'completed',
                progress: 100,
            });

            getLogger().info('Workflow completed successfully', {
                jobId: context.jobId,
                storyId: context.storyId,
                finalAudioUrl: context.finalAudioUrl,
            });

            await helper.updateProgress(context.jobId, config.endProgress, config.name);

            return context;
        },
        undefined,
        { retries: config.retries, timeout: config.timeout }
    );
}
