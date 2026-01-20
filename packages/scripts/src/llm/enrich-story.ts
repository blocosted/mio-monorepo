/**
 * Enrich Story command
 *
 * Runs the LLM enrichment step with a few built-in EnrichmentProfile fixtures.
 */

import { existsSync } from 'node:fs';
import { config as loadDotenv } from 'dotenv';

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';
import { Logger } from '@mio/shared/server/logger';

import { createRunDir, readJsonFile, writeJsonFile } from '../_local-run-store/run-store';

import {
    OpenAILLMService,
    type EnrichmentProfile,
    type LLMCompletionOptions,
    getVocabularyLevel,
} from '@mio/api/services/llm';
import { buildEnrichmentSystemPrompt, buildEnrichmentUserPrompt } from '@mio/api/services/llm/prompts/enrichment.prompts';

type ProfileName = 'emilie' | 'leo' | 'sam';

const TEST_PROFILES: Record<ProfileName, EnrichmentProfile> = {
    emilie: {
        firstName: 'Emilie',
        age: 7,
        gender: 'girl',
        favoriteThemes: ['dragons', 'magic', 'friendship'],
        avoidThemes: ['spiders', 'blood'],
        includeChildAsCharacter: true,
        preferredHeroGender: 'same',
        language: 'fr',
    },
    leo: {
        firstName: 'Leo',
        age: 5,
        gender: 'boy',
        favoriteThemes: ['trains', 'dinosaurs'],
        avoidThemes: ['monsters'],
        includeChildAsCharacter: false,
        preferredHeroGender: 'any',
        language: 'fr',
    },
    sam: {
        firstName: 'Sam',
        age: 10,
        gender: 'neutral',
        favoriteThemes: ['space', 'mystery'],
        avoidThemes: ['nightmares'],
        includeChildAsCharacter: true,
        preferredHeroGender: 'any',
        language: 'en',
    },
};

function loadEnv(envFile?: string): void {
    const files = envFile ? [envFile] : ['.env.local', '.env'];
    for (const file of files) {
        if (existsSync(file)) {
            loadDotenv({ path: file });
        }
    }

    // Ensure the shared `environment` singleton is refreshed after dotenv.
    loadEnvironmentFromProcessEnv({ override: true });
}

type EnrichStoryStoredInput = {
    story: { id: string; initialPrompt: string };
    profile: EnrichmentProfile;
    options?: LLMCompletionOptions;
};

export async function runEnrichStoryCommand(args: {
    prompt: string;
    profile: string;
    all: boolean;
    inputFile?: string;
    storeDir?: string;
    save: boolean;
    envFile?: string;
    options?: LLMCompletionOptions;
    dryRun: boolean;
}): Promise<void> {
    loadEnv(args.envFile);

    const logger = await Logger.create();
    const llm = new OpenAILLMService(logger);

    const storedInput: EnrichStoryStoredInput | null = args.inputFile
        ? readJsonFile<EnrichStoryStoredInput>(args.inputFile)
        : null;

    const selected: Array<[ProfileName, EnrichmentProfile]> = storedInput
        ? ([['inputFile' as unknown as ProfileName, storedInput.profile]] as Array<
              [ProfileName, EnrichmentProfile]
          >)
        : args.all
            ? (Object.entries(TEST_PROFILES) as Array<[ProfileName, EnrichmentProfile]>)
            : ([[args.profile as ProfileName, TEST_PROFILES[args.profile as ProfileName]]] as Array<
                  [ProfileName, EnrichmentProfile]
              >);

    for (const [name, profile] of selected) {
        if (!profile) {
            throw new Error(
                `Unknown profile "${args.profile}". Expected one of: ${Object.keys(TEST_PROFILES).join(', ')}`
            );
        }

        const storyId = storedInput?.story?.id ?? crypto.randomUUID();
        const prompt = storedInput?.story?.initialPrompt ?? args.prompt;
        const options = storedInput?.options ?? args.options;
        const vocabularyLevel = getVocabularyLevel(profile.age);
        const systemPrompt = buildEnrichmentSystemPrompt(profile, vocabularyLevel);
        const userPrompt = buildEnrichmentUserPrompt(prompt);

        const run = args.save
            ? createRunDir({
                  rootDir: args.storeDir,
                  namespace: 'llm',
                  command: 'enrich-story',
                  labelParts: [String(name), storyId],
              })
            : null;

        if (run) {
            writeJsonFile(run.runDir, 'input.json', {
                story: { id: storyId, initialPrompt: prompt },
                profile,
                options,
            } satisfies EnrichStoryStoredInput);

            writeJsonFile(run.runDir, 'prompts.json', {
                vocabularyLevel,
                systemPrompt,
                userPrompt,
            });

            writeJsonFile(run.runDir, 'meta.json', {
                command: 'llm enrich-story',
                profileName: name,
                createdAt: new Date().toISOString(),
                dryRun: args.dryRun,
            });
        }

        if (args.dryRun) {
            const payload = {
                profile: name,
                story: { id: storyId, initialPrompt: prompt },
                vocabularyLevel,
                systemPrompt,
                userPrompt,
                artifactsDir: run?.runDir,
            };
            console.log(JSON.stringify(payload, null, 2));
            continue;
        }

        const result = await llm.enrichStory(
            {
                story: { id: storyId, initialPrompt: prompt },
                profile,
            },
            options
        );

        if (run) {
            writeJsonFile(run.runDir, 'output.json', {
                vocabularyLevel,
                result,
            });
        }

        console.log(
            JSON.stringify(
                {
                    profile: name,
                    story: { id: storyId, initialPrompt: prompt },
                    vocabularyLevel,
                    result,
                    artifactsDir: run?.runDir,
                },
                null,
                2
            )
        );
    }
}

