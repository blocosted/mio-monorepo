/**
 * Generate from Script Command
 *
 * Generate all voice segments from a StoryScript JSON file.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';
import { Logger } from '@mio/shared/server/logger';
import type { StoryScript, VoiceSegmentContent } from '@mio/shared/models';
import { Emotion } from '@mio/shared/models';

import {
    createRunDir,
    writeJsonFile,
} from '../_local-run-store/run-store';

import { Language } from '@mio/shared/types';

import {
    ElevenLabsProvider,
    VOICE_IDS_BY_LANGUAGE,
    EMOTION_VOICE_SETTINGS,
    TimelineSyncService,
    type CharacterArchetype,
    type TTSSegmentResult,
} from '@mio/api/services/audio';

function loadEnv(envFile?: string): void {
    const files = envFile ? [envFile] : ['.env.local', '.env'];
    for (const file of files) {
        if (existsSync(file)) {
            loadDotenv({ path: file });
        }
    }
    loadEnvironmentFromProcessEnv({ override: true });
}

/**
 * Gender detection keywords
 */
const GENDER_KEYWORDS = {
    male: [
        // English
        'male', 'man', 'boy', 'father', 'dad', 'papa', 'grandfather', 'king', 'prince',
        'his', 'him', 'he', 'brother', 'son', 'uncle', 'gentleman', 'mister', 'mr',
        // French
        'homme', 'garcon', 'garçon', 'pere', 'père', 'grand-pere', 'grand-père', 'roi', 'prince',
        'frere', 'frère', 'fils', 'oncle', 'monsieur',
    ],
    female: [
        // English
        'female', 'woman', 'girl', 'mother', 'mom', 'mama', 'grandmother', 'queen', 'princess',
        'her', 'she', 'sister', 'daughter', 'aunt', 'lady', 'miss', 'mrs',
        // French
        'femme', 'fille', 'mere', 'mère', 'maman', 'grand-mere', 'grand-mère', 'reine', 'princesse',
        'soeur', 'sœur', 'tante', 'madame', 'mademoiselle',
    ],
};

/**
 * Archetype keywords - ORDER MATTERS!
 * Priority: narrator > childHero > magical > animal > wiseCharacter > comedic > parent > friend > villain
 * This ensures "dragon" matches "magical" not "villain"
 */
const ARCHETYPE_KEYWORDS_ORDERED: Array<[CharacterArchetype, string[]]> = [
    ['narrator', [
        'narrator', 'narration', 'story', 'storyteller',
        'narrateur', 'narratrice', 'conteur', 'conteuse',
    ]],
    ['childHero', [
        'child', 'kid', 'young', 'hero', 'protagonist', 'main character',
        'enfant', 'jeune', 'heros', 'héros', 'heroine', 'héroïne', 'protagoniste', 'petit', 'petite',
        '7 years', '8 years', '9 years', '10 years', 'ans',
    ]],
    ['magical', [
        // IMPORTANT: dragon, fairy, etc. should match magical, not villain
        'magical', 'fairy', 'elf', 'sprite', 'unicorn', 'magic', 'enchanted',
        'dragon', 'pixie', 'gnome', 'nymph', 'crystal', 'sparkle', 'glitter',
        'magique', 'fee', 'fée', 'elfe', 'lutin', 'licorne', 'magie', 'enchante', 'enchanté',
        'fantastique', 'farfadet', 'cristal', 'brillant', 'scintillant',
    ]],
    ['animal', [
        'animal', 'pet', 'dog', 'cat', 'bird', 'rabbit', 'bear', 'fox', 'creature',
        'wolf', 'mouse', 'owl', 'butterfly', 'lion', 'tiger', 'elephant',
        'chien', 'chat', 'oiseau', 'lapin', 'ours', 'renard', 'creature', 'créature',
        'loup', 'souris', 'hibou', 'papillon',
    ]],
    ['wiseCharacter', [
        'wise', 'elder', 'sage', 'mentor', 'wizard', 'grandmother', 'grandfather', 'old',
        'ancient', 'teacher', 'master', 'guide',
        'sage', 'ancien', 'ancienne', 'mentor', 'sorcier', 'magicien',
        'grand-mere', 'grand-mère', 'grand-pere', 'grand-père', 'vieux', 'vieille',
    ]],
    ['comedic', [
        'funny', 'silly', 'comic', 'clown', 'joker', 'goofy', 'playful',
        'drole', 'drôle', 'rigolo', 'comique', 'clown', 'bouffon', 'amusant', 'farceur',
    ]],
    ['parent', [
        'parent', 'mom', 'dad', 'mother', 'father', 'mama', 'papa',
        'maman', 'mere', 'mère', 'pere', 'père',
    ]],
    ['friend', [
        'friend', 'buddy', 'sidekick', 'companion', 'pal', 'partner',
        'ami', 'amie', 'copain', 'copine', 'compagnon', 'compagne', 'camarade',
    ]],
    ['villain', [
        // villain is LAST - this ensures other types match first
        'villain', 'evil', 'bad', 'witch', 'monster', 'dark', 'wicked', 'sinister',
        'mechant', 'méchant', 'mechante', 'méchante', 'mal', 'mauvais',
        'sorciere', 'sorcière', 'monstre', 'sombre', 'vilain',
    ]],
];

/**
 * Detect gender from character name and description
 */
function detectGender(name: string, description: string): 'male' | 'female' {
    const combined = `${name} ${description}`.toLowerCase();

    const maleScore = GENDER_KEYWORDS.male.filter(kw => combined.includes(kw)).length;
    const femaleScore = GENDER_KEYWORDS.female.filter(kw => combined.includes(kw)).length;

    // Return male only if male score is strictly higher
    return maleScore > femaleScore ? 'male' : 'female';
}

/**
 * Detect archetype from character name and description
 */
function detectArchetype(name: string, description: string): CharacterArchetype {
    const combined = `${name} ${description}`.toLowerCase();

    for (const [archetype, keywords] of ARCHETYPE_KEYWORDS_ORDERED) {
        if (keywords.some(keyword => combined.includes(keyword))) {
            return archetype;
        }
    }

    return 'narrator'; // Default
}

interface VoiceSelectionResult {
    voiceId: string;
    detectedGender: 'male' | 'female';
    detectedArchetype: CharacterArchetype;
}

/**
 * Select voice for a character based on name, description, and language
 * Uses improved gender detection and ordered archetype matching
 */
function selectVoiceForCharacter(
    characterName: string,
    voiceDescription: string,
    language: 'fr' | 'en' = 'fr'
): VoiceSelectionResult {
    const voiceIds = VOICE_IDS_BY_LANGUAGE[language];

    const detectedGender = detectGender(characterName, voiceDescription);
    const detectedArchetype = detectArchetype(characterName, voiceDescription);

    const voiceId = voiceIds[detectedArchetype][detectedGender];

    return {
        voiceId,
        detectedGender,
        detectedArchetype,
    };
}

interface VoiceSegmentInfo {
    id: string;
    text: string;
    characterName?: string;
    emotion?: Emotion;
    voiceId: string;
    detectedGender?: 'male' | 'female';
    detectedArchetype?: CharacterArchetype;
}

interface CharacterVoiceInfo {
    voiceId: string;
    gender: 'male' | 'female';
    archetype: CharacterArchetype;
}

function extractVoiceSegments(script: StoryScript, language: 'fr' | 'en'): VoiceSegmentInfo[] {
    const segments: VoiceSegmentInfo[] = [];

    // Build character to voice map with improved detection
    const characterVoices: Record<string, CharacterVoiceInfo> = {};

    console.log('\nVoice selection:');
    for (const char of script.characters) {
        if (char.voiceId) {
            characterVoices[char.characterName] = {
                voiceId: char.voiceId,
                gender: 'female', // Default when manually specified
                archetype: 'narrator',
            };
            console.log(`  "${char.characterName}": custom voice (${char.voiceId})`);
        } else {
            const selection = selectVoiceForCharacter(
                char.characterName,
                char.voiceDescription,
                language
            );
            characterVoices[char.characterName] = {
                voiceId: selection.voiceId,
                gender: selection.detectedGender,
                archetype: selection.detectedArchetype,
            };
            console.log(`  "${char.characterName}": ${selection.detectedArchetype} (${selection.detectedGender})`);
        }
    }
    console.log('');

    for (const track of script.tracks) {
        if (track.type === 'voice') {
            for (const segment of track.segments) {
                const content = segment.content as VoiceSegmentContent;
                const characterName = content.characterName ?? 'narrator';

                // Get voice info or create new selection for unknown character
                let voiceInfo = characterVoices[characterName];
                if (!voiceInfo) {
                    const selection = selectVoiceForCharacter(characterName, '', language);
                    voiceInfo = {
                        voiceId: selection.voiceId,
                        gender: selection.detectedGender,
                        archetype: selection.detectedArchetype,
                    };
                }

                segments.push({
                    id: segment.id,
                    text: content.text,
                    characterName,
                    emotion: content.emotion as Emotion | undefined,
                    voiceId: voiceInfo.voiceId,
                    detectedGender: voiceInfo.gender,
                    detectedArchetype: voiceInfo.archetype,
                });
            }
        }
    }

    return segments;
}

export async function runGenerateFromScriptCommand(args: {
    scriptFile: string;
    language?: 'fr' | 'en';
    storeDir?: string;
    save: boolean;
    envFile?: string;
    dryRun: boolean;
}): Promise<void> {
    loadEnv(args.envFile);

    // Load script
    if (!existsSync(args.scriptFile)) {
        throw new Error(`Script file not found: ${args.scriptFile}`);
    }
    const scriptJson = readFileSync(args.scriptFile, 'utf-8');
    const parsed = JSON.parse(scriptJson);

    // Handle both direct StoryScript and wrapped format (from generate-script output.json)
    const script: StoryScript = parsed.script ?? parsed;

    // Determine language: CLI override > script metadata > default (French)
    const language = args.language ?? (script.metadata.language as 'fr' | 'en') ?? 'fr';

    // Extract voice segments with language-aware voice selection
    const voiceSegments = extractVoiceSegments(script, language);

    // Create run directory for artifacts
    const run = args.save
        ? createRunDir({
            rootDir: args.storeDir,
            namespace: 'tts',
            command: 'from-script',
            labelParts: [script.metadata.title.substring(0, 20)],
        })
        : null;

    // Save input
    if (run) {
        writeJsonFile(run.runDir, 'input.json', {
            scriptFile: args.scriptFile,
            storyTitle: script.metadata.title,
            language,
            segmentCount: voiceSegments.length,
            dryRun: args.dryRun,
        });

        writeJsonFile(run.runDir, 'segments.json', voiceSegments);
    }

    console.log(`Found ${voiceSegments.length} voice segments in script "${script.metadata.title}" (${language})`);

    if (args.dryRun) {
        const payload = {
            storyTitle: script.metadata.title,
            language,
            segmentCount: voiceSegments.length,
            segments: voiceSegments.map(s => ({
                id: s.id,
                text: s.text.substring(0, 50) + (s.text.length > 50 ? '...' : ''),
                characterName: s.characterName,
                emotion: s.emotion,
                voiceId: s.voiceId,
            })),
            artifactsDir: run?.runDir,
        };
        console.log(JSON.stringify(payload, null, 2));
        return;
    }

    // Initialize provider
    const logger = await Logger.create();
    const provider = new ElevenLabsProvider(logger);

    console.log('Generating speech for all segments...\n');
    const startTime = Date.now();

    const results: Array<{
        id: string;
        success: boolean;
        durationSeconds?: number;
        error?: string;
        outputFile?: string;
    }> = [];

    for (const segment of voiceSegments) {
        try {
            const voiceSettings = segment.emotion
                ? EMOTION_VOICE_SETTINGS[segment.emotion]
                : undefined;

            const result = await provider.convertWithTimestamps({
                text: segment.text,
                voiceId: segment.voiceId,
                voiceSettings,
            });

            const outputFilename = `${segment.id}.mp3`;

            if (run) {
                const outputPath = path.join(run.runDir, outputFilename);
                writeFileSync(outputPath, result.audio);
            }

            results.push({
                id: segment.id,
                success: true,
                durationSeconds: result.durationSeconds,
                outputFile: outputFilename,
            });

            console.log(`  [OK] ${segment.id} (${result.durationSeconds.toFixed(2)}s) - ${segment.characterName}`);
        } catch (error) {
            results.push({
                id: segment.id,
                success: false,
                error: error instanceof Error ? error.message : String(error),
            });
            console.log(`  [FAIL] ${segment.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const totalDuration = results
        .filter(r => r.durationSeconds)
        .reduce((sum, r) => sum + (r.durationSeconds ?? 0), 0);

    // Sync timings based on actual TTS durations
    const ttsResults: TTSSegmentResult[] = results
        .filter(r => r.success && r.durationSeconds !== undefined)
        .map(r => ({
            segmentId: r.id,
            actualDurationSeconds: r.durationSeconds!,
        }));

    let syncedScript = null;
    if (ttsResults.length > 0) {
        console.log('\nSynchronizing timeline with actual TTS durations...');
        const syncService = new TimelineSyncService(logger);
        syncedScript = syncService.syncTimings(script, ttsResults);

        console.log(`  Original duration: ${syncedScript.syncMetadata.originalTotalDuration.toFixed(2)}s`);
        console.log(`  Actual duration: ${syncedScript.syncMetadata.actualTotalDuration.toFixed(2)}s`);
        console.log(`  Drift: ${syncedScript.syncMetadata.driftPercentage > 0 ? '+' : ''}${syncedScript.syncMetadata.driftPercentage}%`);
    }

    // Save output
    if (run) {
        writeJsonFile(run.runDir, 'output.json', {
            successCount,
            failCount,
            totalDurationSeconds: totalDuration,
            generationTimeSeconds: parseFloat(elapsed),
            results,
        });

        // Save synced script with recalculated timings
        if (syncedScript) {
            writeJsonFile(run.runDir, 'synced-script.json', syncedScript);
        }

        writeJsonFile(run.runDir, 'meta.json', {
            command: 'tts from-script',
            storyTitle: script.metadata.title,
            language,
            segmentCount: voiceSegments.length,
            successCount,
            failCount,
            totalDurationSeconds: totalDuration,
            generationTimeSeconds: parseFloat(elapsed),
            syncMetadata: syncedScript?.syncMetadata,
            createdAt: new Date().toISOString(),
        });
    }

    console.log(`\nGeneration complete:`);
    console.log(JSON.stringify({
        successCount,
        failCount,
        totalDurationSeconds: totalDuration.toFixed(2),
        generationTimeSeconds: elapsed,
        syncMetadata: syncedScript?.syncMetadata,
        artifactsDir: run?.runDir,
    }, null, 2));
}
