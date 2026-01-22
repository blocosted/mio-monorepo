/**
 * Test Emotions Command
 *
 * Generate audio samples for all emotions with the same text.
 */

import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';
import { Logger } from '@mio/shared/server/logger';
import { Emotion } from '@mio/shared/types';

import {
    createRunDir,
    writeJsonFile,
} from '../_local-run-store/run-store';

import { VoicesRepository } from '@mio/api/repositories/audio';
import {
    VOICE_IDS_BY_LANGUAGE,
    EMOTION_VOICE_SETTINGS,
    EMOTION_AUDIO_TAGS,
    type CharacterArchetype,
} from '@mio/api/services/narration';

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

export async function runTestEmotionsCommand(args: {
    text: string;
    voice: string;
    gender: 'male' | 'female';
    language: 'fr' | 'en';
    storeDir?: string;
    save: boolean;
    envFile?: string;
    dryRun: boolean;
}): Promise<void> {
    loadEnv(args.envFile);

    const emotions = Object.values(Emotion);
    const voiceId = selectVoiceForCharacter(args.voice, args.gender, args.language);

    // Create run directory for artifacts
    const run = args.save
        ? createRunDir({
            rootDir: args.storeDir,
            namespace: 'tts',
            command: 'test-emotions',
            labelParts: [args.voice, args.gender],
        })
        : null;

    // Save input
    if (run) {
        writeJsonFile(run.runDir, 'input.json', {
            text: args.text,
            voice: args.voice,
            voiceId,
            gender: args.gender,
            language: args.language,
            emotions,
            dryRun: args.dryRun,
        });
    }

    console.log(`Testing ${emotions.length} emotions with voice "${args.voice}" (${voiceId}) [${args.language}]`);
    console.log(`Text: "${args.text.substring(0, 50)}${args.text.length > 50 ? '...' : ''}"\n`);

    if (args.dryRun) {
        const payload = {
            text: args.text,
            voice: args.voice,
            voiceId,
            gender: args.gender,
            language: args.language,
            emotions: emotions.map(emotion => ({
                emotion,
                voiceSettings: EMOTION_VOICE_SETTINGS[emotion],
            })),
            artifactsDir: run?.runDir,
        };
        console.log(JSON.stringify(payload, null, 2));
        return;
    }

    // Initialize repository
    const logger = await Logger.create();
    const repository = new VoicesRepository(logger);

    console.log('Generating speech for all emotions...\n');
    const startTime = Date.now();

    const results: Array<{
        emotion: string;
        success: boolean;
        durationSeconds?: number;
        error?: string;
        outputFile?: string;
    }> = [];

    for (const emotion of emotions) {
        try {
            const voiceSettings = EMOTION_VOICE_SETTINGS[emotion];
            const audioTag = EMOTION_AUDIO_TAGS[emotion];

            // Apply audio tag for emotion (eleven_v3 best practice)
            const textWithEmotion = audioTag ? `${audioTag} ${args.text}` : args.text;

            // Log the exact settings being sent
            console.log(`\n  [${emotion}] Audio tag: ${audioTag || '(none)'}`);
            console.log(`    Text sent: "${textWithEmotion.substring(0, 60)}..."`);
            console.log(`    Voice settings:`, JSON.stringify(voiceSettings));

            const result = await repository.convertWithTimestamps({
                text: textWithEmotion,
                voiceId,
                voiceSettings,
            });

            const outputFilename = `${emotion}.mp3`;

            if (run) {
                const outputPath = path.join(run.runDir, outputFilename);
                writeFileSync(outputPath, result.audio);
            }

            results.push({
                emotion,
                success: true,
                durationSeconds: result.durationSeconds,
                outputFile: outputFilename,
            });

            const settings = voiceSettings;
            console.log(
                `  [OK] ${emotion.padEnd(10)} | ${result.durationSeconds.toFixed(2)}s | ` +
                `stability=${settings.stability} similarity=${settings.similarityBoost} style=${settings.style} speed=${settings.speed}`
            );
        } catch (error) {
            results.push({
                emotion,
                success: false,
                error: error instanceof Error ? error.message : String(error),
            });
            console.log(`  [FAIL] ${emotion.padEnd(10)} | ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // Save output
    if (run) {
        writeJsonFile(run.runDir, 'output.json', {
            successCount,
            failCount,
            generationTimeSeconds: parseFloat(elapsed),
            results,
        });

        writeJsonFile(run.runDir, 'meta.json', {
            command: 'tts test-emotions',
            text: args.text,
            voice: args.voice,
            voiceId,
            gender: args.gender,
            language: args.language,
            emotionCount: emotions.length,
            successCount,
            failCount,
            generationTimeSeconds: parseFloat(elapsed),
            createdAt: new Date().toISOString(),
        });
    }

    console.log(`\nGeneration complete:`);
    console.log(JSON.stringify({
        successCount,
        failCount,
        generationTimeSeconds: elapsed,
        artifactsDir: run?.runDir,
    }, null, 2));
}
