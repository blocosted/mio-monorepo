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
import { getInstance, IocService, IocStore, IocConnection, IocRepository } from '../../ioc';
import { WorkflowStepHelper } from './story-generation.workflow.helper';
import {
    type StoryGenerationWorkflowContext,
    WORKFLOW_STEPS,
} from './story-generation.workflow.types';
import { VOICE_GENERATION_CONCURRENCY, S3_TEMP_PATHS, getStepConfig } from './story-generation.workflow.constants';
import type { IEnrichmentService } from '../../services/llm/enrichment.service.types';
import type { IScriptGenerationService } from '../../services/llm/script-generation.service.types';
import type { ITTSService } from '../../services/narration/tts.service.types';
import type { ISfxService } from '../../services/sound-design/sfx.service.types';
import type { IMusicGeneratorService } from '../../services/music/music-generator.service.types';
import type { IAmbianceGeneratorService } from '../../services/ambiance/ambiance-generator.service.types';
import type { IFFmpegMixerService } from '../../services/audio-mixing/ffmpeg-mixer.service.types';
import type { IStorageService } from '../../services/storage/storage.service.types';
import type { StoriesStore } from '../../services/stories/stories.store';
import type { ProfilesStore } from '../../services/profiles/profiles.service.store';
import type { AudioAssetsStore } from '../../services/audio/audio-assets.store';
import type { GenerationJobsStore } from '../../services/stories/generation-jobs.store';
import type { IJobProgressService } from '../../services/cache';
import type { ILLMRepository } from '../../repositories/llm/llm-repository.types';
import type { IVoiceRegistryService } from '../../services/narration/voice-registry.service.types';
import { AudioAssetType, VoiceGender, VoiceAge, VoiceUseCase, type StoryScript } from '@mio/shared/types';
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
            const llmRepository = getInstance<ILLMRepository>(IocRepository.LLM_REPOSITORY);
            const storiesStore = getInstance<StoriesStore>(IocStore.STORIES_STORE);
            const profilesStore = getInstance<ProfilesStore>(IocStore.PROFILES_STORE);

            await helper.updateProgress(context.jobId, config.startProgress, config.name);

            // Load story to get childProfileId and answers
            const story = await storiesStore.findById(context.storyId);
            if (!story) {
                throw new Error(`Story not found: ${context.storyId}`);
            }

            // Load child profile
            const childProfile = await profilesStore.findById(story.childProfileId);
            if (!childProfile) {
                throw new Error(`Child profile not found: ${story.childProfileId}`);
            }

            // Build profile for script generation
            const profile = {
                firstName: childProfile.firstName,
                age: childProfile.age,
                gender: childProfile.gender,
                favoriteThemes: childProfile.preferences.favoriteThemes,
                avoidThemes: childProfile.preferences.avoidThemes,
                includeChildAsCharacter: childProfile.preferences.includeChildAsCharacter,
                preferredHeroGender: childProfile.preferences.preferredHeroGender,
                language: childProfile.preferences.language ?? 'fr',
            };

            // Generate script with correct API (input + provider)
            const result = await scriptService.generateScript(
                {
                    enrichedConcept,
                    profile,
                    answers: story.answers || [],
                    targetDurationMinutes: context.targetDurationMinutes,
                },
                llmRepository
            );

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
 * Step 2.5: Voice Assignment
 * Assigns voice IDs to characters from the database (no hardcoded voices)
 */
export async function voiceAssignmentStep(
    context: StoryGenerationWorkflowContext
): Promise<StoryGenerationWorkflowContext> {
    const config = getStepConfig(WORKFLOW_STEPS.VOICE_ASSIGNMENT);
    const helper = new WorkflowStepHelper();

    if (!context.script) {
        throw new Error('Script not found in context');
    }

    const script = context.script;

    return helper.executeStepWithRollback(
        context.jobId,
        config.name,
        async () => {
            if (await helper.isJobCancelled(context.jobId)) {
                throw new Error('Job cancelled by user');
            }

            const voiceRegistry = getInstance<IVoiceRegistryService>(IocService.VOICE_REGISTRY);
            const profilesStore = getInstance<ProfilesStore>(IocStore.PROFILES_STORE);
            const storiesStore = getInstance<StoriesStore>(IocStore.STORIES_STORE);

            await helper.updateProgress(context.jobId, config.startProgress, config.name);

            // Load child profile for language preference
            const story = await storiesStore.findById(context.storyId);
            if (!story) {
                throw new Error(`Story not found: ${context.storyId}`);
            }

            const childProfile = await profilesStore.findById(story.childProfileId);
            const language = childProfile?.preferences?.language ?? 'fr';

            // Get available voices from database
            const availableVoices = await voiceRegistry.getVoicesByFilter({
                useCase: VoiceUseCase.NarrativeStory,
            });

            if (availableVoices.length === 0) {
                getLogger().error('No voices found in database. Run voice sync first.');
                throw new Error('No voices available. Please sync voices from ElevenLabs.');
            }

            getLogger().info('Assigning voices to characters', {
                jobId: context.jobId,
                characterCount: script.characters.length,
                availableVoices: availableVoices.length,
                language,
            });

            // Assign voices to each character
            const updatedCharacters = script.characters.map((character) => {
                const voiceId = selectVoiceForCharacter(
                    character.voiceDescription ?? character.characterName,
                    availableVoices,
                    language
                );

                getLogger().info('Voice assigned to character', {
                    characterName: character.characterName,
                    voiceDescription: character.voiceDescription,
                    assignedVoiceId: voiceId,
                });

                return {
                    ...character,
                    voiceId,
                };
            });

            // Update script with voice-assigned characters
            const updatedScript: StoryScript = {
                ...script,
                characters: updatedCharacters,
            };

            // Persist updated script to DB
            await storiesStore.updateScript(context.storyId, updatedScript);

            await helper.updateProgress(context.jobId, config.endProgress, config.name);

            return {
                ...context,
                script: updatedScript,
            };
        },
        undefined,
        { retries: config.retries, timeout: config.timeout }
    );
}

/**
 * Select the best voice for a character based on description
 */
function selectVoiceForCharacter(
    description: string,
    voices: Array<{ voiceId: string; gender?: string | null; age?: string | null; language?: string | null; name: string }>,
    preferredLanguage: string
): string {
    const lowerDesc = description.toLowerCase();

    // Detect gender from description
    let targetGender: string | null = null;
    if (lowerDesc.includes('female') || lowerDesc.includes('woman') || lowerDesc.includes('girl') ||
        lowerDesc.includes('femme') || lowerDesc.includes('fille') || lowerDesc.includes('feminine') ||
        lowerDesc.includes('mother') || lowerDesc.includes('maman') || lowerDesc.includes('mere') ||
        lowerDesc.includes('princess') || lowerDesc.includes('princesse') || lowerDesc.includes('queen') ||
        lowerDesc.includes('reine') || lowerDesc.includes('grandmother') || lowerDesc.includes('grand-mere')) {
        targetGender = VoiceGender.Female;
    } else if (lowerDesc.includes('male') || lowerDesc.includes('man') || lowerDesc.includes('boy') ||
        lowerDesc.includes('homme') || lowerDesc.includes('garcon') || lowerDesc.includes('masculine') ||
        lowerDesc.includes('father') || lowerDesc.includes('papa') || lowerDesc.includes('pere') ||
        lowerDesc.includes('prince') || lowerDesc.includes('king') || lowerDesc.includes('roi') ||
        lowerDesc.includes('grandfather') || lowerDesc.includes('grand-pere')) {
        targetGender = VoiceGender.Male;
    }

    // Detect age from description
    let targetAge: string | null = null;
    if (lowerDesc.includes('child') || lowerDesc.includes('young') || lowerDesc.includes('kid') ||
        lowerDesc.includes('enfant') || lowerDesc.includes('jeune') || lowerDesc.includes('petit')) {
        targetAge = VoiceAge.Young;
    } else if (lowerDesc.includes('old') || lowerDesc.includes('elder') || lowerDesc.includes('wise') ||
        lowerDesc.includes('ancien') || lowerDesc.includes('vieux') || lowerDesc.includes('sage') ||
        lowerDesc.includes('grandmother') || lowerDesc.includes('grandfather') ||
        lowerDesc.includes('grand-mere') || lowerDesc.includes('grand-pere')) {
        targetAge = VoiceAge.Old;
    }

    // Filter voices by criteria
    let candidates = voices;

    // Prefer voices matching the language
    const languageMatches = candidates.filter(v =>
        v.language?.toLowerCase().includes(preferredLanguage.toLowerCase())
    );
    if (languageMatches.length > 0) {
        candidates = languageMatches;
    }

    // Filter by gender if detected
    if (targetGender) {
        const genderMatches = candidates.filter(v => v.gender === targetGender);
        if (genderMatches.length > 0) {
            candidates = genderMatches;
        }
    }

    // Filter by age if detected
    if (targetAge) {
        const ageMatches = candidates.filter(v => v.age === targetAge);
        if (ageMatches.length > 0) {
            candidates = ageMatches;
        }
    }

    // Return the first match, or fallback to first available voice
    const selected = candidates[0] ?? voices[0];
    if (!selected) {
        throw new Error('No voice available for assignment');
    }

    return selected.voiceId;
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

            // Extract voice segments from script (using new track-based structure)
            const voiceTrack = script.tracks.find((t) => t.type === 'voice');
            const voiceSegments = voiceTrack?.segments || [];

            getLogger().info('Generating voice audio', {
                jobId: context.jobId,
                segmentCount: voiceSegments.length,
            });

            // Generate with concurrency control
            const limit = pLimit(VOICE_GENERATION_CONCURRENCY);
            const progressPerSegment = (config.endProgress - config.startProgress) / voiceSegments.length;
            let currentProgress = config.startProgress;

            const voiceAssetIds: string[] = [];

            const generateVoiceSegment = async (segment: typeof voiceSegments[number], index: number) => {
                try {
                    // Skip non-voice segments
                    if (segment.content.type !== 'narration' && segment.content.type !== 'dialogue') {
                        return null;
                    }

                    // Check for existing asset (idempotency)
                    const cacheKey = `voice_${context.storyId}_${segment.id}`;
                    const existing = await audioAssetsStore.findByCacheKey(cacheKey);

                    let assetId: string;

                    if (existing) {
                        getLogger().info('Using cached voice asset', { cacheKey });
                        assetId = existing.id;
                    } else {
                        // Find voiceId from character mapping
                        const characterName =
                            segment.content.type === 'dialogue' || segment.content.type === 'narration'
                                ? segment.content.characterName
                                : undefined;
                        const character = characterName
                            ? script.characters.find((c) => c.characterName === characterName)
                            : script.characters[0]; // Default to first character (narrator)

                        if (!character?.voiceId) {
                            getLogger().warn('No voiceId found for character, skipping segment', {
                                segmentId: segment.id,
                                characterName: segment.content.characterName,
                            });
                            return null;
                        }

                        // Generate new voice audio
                        const result = await ttsService.generateSpeech({
                            text: segment.content.text,
                            voiceId: character.voiceId,
                        });

                        // Upload to storage
                        const storageService = getInstance<IStorageService>(IocService.STORAGE);
                        const voicePath = `stories/${context.storyId}/voice/${segment.id}.mp3`;
                        const uploadResult = await storageService.upload(
                            result.audio,
                            voicePath,
                            { contentType: 'audio/mpeg' }
                        );

                        // Store in audioAssets
                        const asset = await audioAssetsStore.create({
                            storyId: context.storyId,
                            type: AudioAssetType.Voice,
                            url: uploadResult.url,
                            duration: result.durationSeconds,
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
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const errorStack = error instanceof Error ? error.stack : undefined;
                    getLogger()
                        .withMetadata({
                            jobId: context.jobId,
                            segmentIndex: index,
                            segmentId: segment.id,
                            errorMessage,
                            errorStack,
                        })
                        .error('Failed to generate voice segment');
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

            // Extract SFX segments from script (using new track-based structure)
            const sfxTrack = script.tracks.find((t) => t.type === 'sfx');
            const sfxSegments = sfxTrack?.segments || [];

            getLogger().info('Generating SFX audio', {
                jobId: context.jobId,
                segmentCount: sfxSegments.length,
            });

            const sfxAssetIds: string[] = [];

            for (const segment of sfxSegments) {
                try {
                    // Skip non-sfx segments
                    if (segment.content.type !== 'sfx') {
                        continue;
                    }

                    // Check for existing asset (idempotency)
                    const cacheKey = `sfx_${context.storyId}_${segment.id}`;
                    const existing = await audioAssetsStore.findByCacheKey(cacheKey);

                    if (existing) {
                        getLogger().info('Using cached SFX asset', { cacheKey });
                        sfxAssetIds.push(existing.id);
                    } else {
                        // Generate SFX audio
                        const result = await sfxService.generateSfx({
                            text: segment.content.description,
                            durationSeconds: segment.duration,
                        });

                        // Upload to storage
                        const sfxPath = `stories/${context.storyId}/sfx/${segment.id}.mp3`;
                        const uploadResult = await storageService.upload(
                            result.audio,
                            sfxPath,
                            { contentType: 'audio/mpeg' }
                        );

                        // Store in audioAssets
                        const asset = await audioAssetsStore.create({
                            storyId: context.storyId,
                            type: AudioAssetType.Sfx,
                            url: uploadResult.url,
                            duration: result.durationSeconds,
                            cacheKey,
                        });

                        sfxAssetIds.push(asset.id);
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const errorStack = error instanceof Error ? error.stack : undefined;
                    getLogger()
                        .withMetadata({
                            jobId: context.jobId,
                            segmentId: segment.id,
                            errorMessage,
                            errorStack,
                        })
                        .error('Failed to generate SFX segment');
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

            // Extract music segments from script (using new track-based structure)
            const musicTrack = script.tracks.find((t) => t.type === 'music');
            const musicSegments = musicTrack?.segments || [];

            getLogger().info('Generating music audio', {
                jobId: context.jobId,
                segmentCount: musicSegments.length,
            });

            const musicAssetIds: string[] = [];

            for (const segment of musicSegments) {
                try {
                    // Skip non-music segments
                    if (segment.content.type !== 'music') {
                        continue;
                    }

                    // Check for existing asset (idempotency)
                    const cacheKey = `music_${context.storyId}_${segment.id}`;
                    const existing = await audioAssetsStore.findByCacheKey(cacheKey);

                    if (existing) {
                        getLogger().info('Using cached music asset', { cacheKey });
                        musicAssetIds.push(existing.id);
                    } else {
                        // Generate music audio
                        const result = await musicService.generate({
                            mood: segment.content.mood as any, // FIXME: Type mismatch between script and service
                            targetDurationSeconds: segment.duration,
                        });

                        // Upload to storage
                        const musicPath = `stories/${context.storyId}/music/${segment.id}.mp3`;
                        const uploadResult = await storageService.upload(
                            result.audio,
                            musicPath,
                            { contentType: 'audio/mpeg' }
                        );

                        // Store in audioAssets
                        const asset = await audioAssetsStore.create({
                            storyId: context.storyId,
                            type: AudioAssetType.Music,
                            url: uploadResult.url,
                            duration: result.durationSeconds,
                            cacheKey,
                        });

                        musicAssetIds.push(asset.id);
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const errorStack = error instanceof Error ? error.stack : undefined;
                    getLogger()
                        .withMetadata({
                            jobId: context.jobId,
                            segmentId: segment.id,
                            errorMessage,
                            errorStack,
                        })
                        .error('Failed to generate music segment');
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

            // Extract ambiance segments from script (using new track-based structure)
            const ambianceTrack = script.tracks.find((t) => t.type === 'ambiance');
            const ambianceSegments = ambianceTrack?.segments || [];

            getLogger().info('Generating ambiance audio', {
                jobId: context.jobId,
                segmentCount: ambianceSegments.length,
            });

            const ambianceAssetIds: string[] = [];

            // Generate ambiance for each segment
            for (const segment of ambianceSegments) {
                if (segment.content.type !== 'ambiance') continue;

                try {
                    // Check for existing asset (idempotency)
                    const cacheKey = `ambiance_${context.storyId}_${segment.id}`;
                    const existing = await audioAssetsStore.findByCacheKey(cacheKey);

                    if (existing) {
                        getLogger().info('Using cached ambiance asset', { cacheKey });
                        ambianceAssetIds.push(existing.id);
                    } else {
                        // Generate ambiance audio
                        const result = await ambianceService.generate({
                            description: segment.content.description,
                            targetDurationSeconds: segment.duration || script.metadata.actualDuration,
                            volume: segment.content.volume || 0.3,
                        });

                        // Upload to storage
                        const ambiancePath = `stories/${context.storyId}/ambiance/${segment.id}.mp3`;
                        const uploadResult = await storageService.upload(
                            result.audio,
                            ambiancePath,
                            { contentType: 'audio/mpeg' }
                        );

                        // Store in audioAssets
                        const asset = await audioAssetsStore.create({
                            storyId: context.storyId,
                            type: AudioAssetType.Ambiance,
                            url: uploadResult.url,
                            duration: result.durationSeconds,
                            cacheKey,
                        });

                        ambianceAssetIds.push(asset.id);
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const errorStack = error instanceof Error ? error.stack : undefined;
                    getLogger()
                        .withMetadata({
                            jobId: context.jobId,
                            segmentId: segment.id,
                            errorMessage,
                            errorStack,
                        })
                        .error('Failed to generate ambiance');
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

            // Build mixer input from assets and script (using new track-based structure)

            // Create maps: segment ID -> asset for efficient lookup
            // Cache keys are in format: {type}_{storyId}_{segmentId}
            const voiceAssetMap = new Map(
                validVoiceAssets
                    .filter(asset => asset.cacheKey)
                    .map(asset => [asset.cacheKey!.split('_').pop()!, asset])
            );
            const sfxAssetMap = new Map(
                validSfxAssets
                    .filter(asset => asset.cacheKey)
                    .map(asset => [asset.cacheKey!.split('_').pop()!, asset])
            );

            // Extract voice segments from voice tracks
            const voiceTrack = script.tracks.find((t) => t.type === 'voice');
            const voiceSegments = voiceTrack?.segments || [];
            const voiceAudioFiles = voiceSegments
                .map((segment) => {
                    const asset = voiceAssetMap.get(segment.id);
                    if (!asset) {
                        getLogger().warn('Missing voice asset for segment', { segmentId: segment.id });
                        return null;
                    }
                    return {
                        path: asset.url,
                        duration: segment.duration,
                        startTime: segment.startTime,
                        volume: 1.0,
                    };
                })
                .filter((file): file is NonNullable<typeof file> => file !== null);

            // Extract SFX segments from SFX tracks
            const sfxTrack = script.tracks.find((t) => t.type === 'sfx');
            const sfxSegments = sfxTrack?.segments || [];
            const sfxAudioFiles = sfxSegments
                .map((segment) => {
                    const asset = sfxAssetMap.get(segment.id);
                    if (!asset) {
                        getLogger().warn('Missing SFX asset for segment', { segmentId: segment.id });
                        return null;
                    }
                    return {
                        path: asset.url,
                        duration: segment.duration,
                        startTime: segment.startTime,
                        volume: 0.7,
                    };
                })
                .filter((file): file is NonNullable<typeof file> => file !== null);

            // Extract music segments from music tracks (take first one for now)
            const musicTrack = script.tracks.find((t) => t.type === 'music');
            const musicSegments = musicTrack?.segments || [];
            const firstMusicAsset = validMusicAssets[0];
            const firstMusicSegment = musicSegments[0];

            // Extract ambiance segments from ambiance tracks (take first one for now)
            const ambianceTrack = script.tracks.find((t) => t.type === 'ambiance');
            const ambianceSegments = ambianceTrack?.segments || [];
            const firstAmbianceAsset = validAmbianceAssets[0];
            const firstAmbianceSegment = ambianceSegments[0];

            // Mix audio
            const result = await mixerService.mixStory({
                storyId: context.storyId,
                voice: {
                    segments: voiceAudioFiles,
                    pauses: new Map(), // No pauses for now
                },
                music: firstMusicAsset && firstMusicSegment ? {
                    file: {
                        path: firstMusicAsset.url,
                        duration: firstMusicSegment.duration,
                        startTime: firstMusicSegment.startTime,
                    },
                    volume: 0.3,
                    enableDucking: true,
                } : undefined,
                ambiance: firstAmbianceAsset && firstAmbianceSegment ? {
                    file: {
                        path: firstAmbianceAsset.url,
                        duration: firstAmbianceSegment.duration,
                        startTime: firstAmbianceSegment.startTime,
                    },
                    volume: 0.2,
                    loop: true,
                } : undefined,
                sfx: sfxAudioFiles.length > 0 ? {
                    files: sfxAudioFiles,
                    volume: 0.7,
                } : undefined,
            });

            // Upload to S3 temp location
            const tempPath = S3_TEMP_PATHS.getMixedAudioPath(context.storyId);
            const tempUrl = await storageService.upload(
                result.audio,
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
                const errorMessage = err instanceof Error ? err.message : String(err);
                const errorStack = err instanceof Error ? err.stack : undefined;
                getLogger()
                    .withMetadata({
                        path: tempPath,
                        errorMessage,
                        errorStack,
                    })
                    .warn('Failed to delete temp file during rollback');
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
