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
    type CharacterArchetype,
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

function selectVoiceForCharacter(
    description: string,
    gender: 'male' | 'female' = 'female',
    language: 'fr' | 'en' = 'fr'
): string {
    const lowerDescription = description.toLowerCase();
    const voiceIds = VOICE_IDS_BY_LANGUAGE[language];

    const archetypeKeywords: Record<CharacterArchetype, string[]> = {
        narrator: [
            'narrator', 'narration', 'story', 'storyteller',
            'narrateur', 'narratrice', 'conteur', 'conteuse', 'histoire',
        ],
        childHero: [
            'child', 'kid', 'boy', 'girl', 'young', 'hero', 'protagonist',
            'enfant', 'garcon', 'fille', 'jeune', 'heros', 'heroine', 'protagoniste', 'petit', 'petite',
        ],
        wiseCharacter: [
            'wise', 'elder', 'sage', 'mentor', 'wizard', 'grandmother', 'grandfather', 'old',
            'sage', 'ancien', 'ancienne', 'mentor', 'sorcier', 'magicien', 'grand-mere', 'grand-pere', 'vieux', 'vieille',
        ],
        villain: [
            'villain', 'evil', 'bad', 'witch', 'monster', 'dragon', 'dark',
            'mechant', 'mechante', 'mal', 'mauvais', 'sorciere', 'monstre', 'dragon', 'sombre', 'vilain',
        ],
        comedic: [
            'funny', 'silly', 'comic', 'clown', 'joker', 'goofy',
            'drole', 'rigolo', 'comique', 'clown', 'bouffon', 'amusant', 'farceur',
        ],
        parent: [
            'parent', 'mom', 'dad', 'mother', 'father', 'mama', 'papa',
            'parent', 'maman', 'papa', 'mere', 'pere', 'mère', 'père',
        ],
        friend: [
            'friend', 'buddy', 'sidekick', 'companion', 'pal',
            'ami', 'amie', 'copain', 'copine', 'compagnon', 'compagne', 'camarade',
        ],
        animal: [
            'animal', 'pet', 'dog', 'cat', 'bird', 'rabbit', 'bear', 'fox', 'creature',
            'animal', 'chien', 'chat', 'oiseau', 'lapin', 'ours', 'renard', 'creature', 'loup', 'souris',
        ],
        magical: [
            'magical', 'fairy', 'elf', 'sprite', 'unicorn', 'magic', 'enchanted',
            'magique', 'fee', 'elfe', 'lutin', 'licorne', 'magie', 'enchante', 'fantastique',
        ],
    };

    for (const [archetype, keywords] of Object.entries(archetypeKeywords)) {
        if (keywords.some(keyword => lowerDescription.includes(keyword))) {
            const voices = voiceIds[archetype as CharacterArchetype];
            return voices[gender];
        }
    }

    return voiceIds.narrator[gender];
}

interface VoiceSegmentInfo {
    id: string;
    text: string;
    characterName?: string;
    emotion?: Emotion;
    voiceId: string;
}

function extractVoiceSegments(script: StoryScript, language: 'fr' | 'en'): VoiceSegmentInfo[] {
    const segments: VoiceSegmentInfo[] = [];

    // Build character to voice map
    const characterVoices: Record<string, string> = {};
    for (const char of script.characters) {
        if (char.voiceId) {
            characterVoices[char.characterName] = char.voiceId;
        } else {
            // Select voice based on description and language
            characterVoices[char.characterName] = selectVoiceForCharacter(char.voiceDescription, 'female', language);
        }
    }

    for (const track of script.tracks) {
        if (track.type === 'voice') {
            for (const segment of track.segments) {
                const content = segment.content as VoiceSegmentContent;
                const characterName = content.characterName ?? 'narrator';
                const voiceId = characterVoices[characterName] ?? selectVoiceForCharacter(characterName, 'female', language);

                segments.push({
                    id: segment.id,
                    text: content.text,
                    characterName,
                    emotion: content.emotion as Emotion | undefined,
                    voiceId,
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
    const script: StoryScript = JSON.parse(scriptJson);

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

    // Save output
    if (run) {
        writeJsonFile(run.runDir, 'output.json', {
            successCount,
            failCount,
            totalDurationSeconds: totalDuration,
            generationTimeSeconds: parseFloat(elapsed),
            results,
        });

        writeJsonFile(run.runDir, 'meta.json', {
            command: 'tts from-script',
            storyTitle: script.metadata.title,
            language,
            segmentCount: voiceSegments.length,
            successCount,
            failCount,
            totalDurationSeconds: totalDuration,
            generationTimeSeconds: parseFloat(elapsed),
            createdAt: new Date().toISOString(),
        });
    }

    console.log(`\nGeneration complete:`);
    console.log(JSON.stringify({
        successCount,
        failCount,
        totalDurationSeconds: totalDuration.toFixed(2),
        generationTimeSeconds: elapsed,
        artifactsDir: run?.runDir,
    }, null, 2));
}
