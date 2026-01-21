/**
 * Generate Script Command
 *
 * Runs LLM script generation with precise word count control
 * and ElevenLabs v3 compatibility.
 */

import { existsSync } from 'node:fs';
import { config as loadDotenv } from 'dotenv';

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';
import { Logger } from '@mio/shared/server/logger';
import type { EnrichedConcept, StoryAnswer } from '@mio/shared';

import {
  createRunDir,
  readJsonFile,
  writeJsonFile,
} from '../_local-run-store/run-store';

import {
  ScriptGenerationService,
  OpenAIProvider,
  AnthropicProvider,
  type EnrichmentProfile,
  type LLMCompletionOptions,
  type ILLMProvider,
  getVocabularyLevel,
} from '@mio/api/services/llm';

import {
  buildScriptGenerationSystemPrompt,
  buildScriptGenerationUserPrompt,
} from '@mio/api/services/llm/prompts/scriptGeneration.prompts';

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
  loadEnvironmentFromProcessEnv({ override: true });
}

/**
 * Input stored by enrich-story command
 */
type EnrichStoryStoredInput = {
  story: { id: string; initialPrompt: string };
  profile: EnrichmentProfile;
  options?: LLMCompletionOptions;
};

/**
 * Output stored by enrich-story command
 */
type EnrichStoryStoredOutput = {
  vocabularyLevel: string;
  result: {
    enrichedConcept: EnrichedConcept;
    vocabularyLevel: string;
  };
};

/**
 * Input format for generate-script command
 */
type GenerateScriptStoredInput = {
  enrichedConcept: EnrichedConcept;
  profile: EnrichmentProfile;
  answers: StoryAnswer[];
  targetDurationMinutes: number;
  options?: LLMCompletionOptions;
};

export async function runGenerateScriptCommand(args: {
  enrichInputFile?: string;
  inputFile?: string;
  profile: string;
  answers?: string;
  targetDurationMinutes: number;
  storeDir?: string;
  save: boolean;
  envFile?: string;
  provider?: 'openai' | 'anthropic';
  options?: LLMCompletionOptions;
  dryRun: boolean;
}): Promise<void> {
  loadEnv(args.envFile);

  const logger = await Logger.create();
  const service = new ScriptGenerationService(logger);

  // Create the selected provider
  const providerType = args.provider ?? 'openai';
  let provider: ILLMProvider;
  if (providerType === 'anthropic') {
    provider = new AnthropicProvider(logger);
  } else {
    provider = new OpenAIProvider(logger);
  }

  // Parse answers if provided as JSON string
  let answers: StoryAnswer[] = [];
  if (args.answers) {
    try {
      answers = JSON.parse(args.answers);
    } catch {
      throw new Error(`Invalid JSON for --answers: ${args.answers}`);
    }
  }

  let enrichedConcept: EnrichedConcept;
  let profile: EnrichmentProfile;
  let options = args.options;

  if (args.inputFile) {
    const storedInput = readJsonFile<GenerateScriptStoredInput>(args.inputFile);
    enrichedConcept = storedInput.enrichedConcept;
    profile = storedInput.profile;
    answers = storedInput.answers;
    options = storedInput.options ?? options;
  } else if (args.enrichInputFile) {
    const enrichOutputPath = args.enrichInputFile.replace(
      'input.json',
      'output.json',
    );
    const enrichInputPath = args.enrichInputFile.endsWith('input.json')
      ? args.enrichInputFile
      : args.enrichInputFile.replace('output.json', 'input.json');

    if (existsSync(enrichOutputPath)) {
      const enrichOutput =
        readJsonFile<EnrichStoryStoredOutput>(enrichOutputPath);
      enrichedConcept = enrichOutput.result.enrichedConcept;
    } else if (
      existsSync(args.enrichInputFile) &&
      args.enrichInputFile.endsWith('output.json')
    ) {
      const enrichOutput = readJsonFile<EnrichStoryStoredOutput>(
        args.enrichInputFile,
      );
      enrichedConcept = enrichOutput.result.enrichedConcept;
    } else {
      throw new Error(
        `Cannot find enrich-story output. Provide path to output.json or input.json from an enrich-story run.`,
      );
    }

    if (existsSync(enrichInputPath)) {
      const enrichInput = readJsonFile<EnrichStoryStoredInput>(enrichInputPath);
      profile = enrichInput.profile;
    } else {
      profile = TEST_PROFILES[args.profile as ProfileName];
      if (!profile) {
        throw new Error(
          `Could not find input.json and unknown profile "${args.profile}". Expected one of: ${Object.keys(TEST_PROFILES).join(', ')}`,
        );
      }
    }
  } else {
    throw new Error(
      'Either --enrichInputFile (from enrich-story) or --inputFile (from generate-script) is required',
    );
  }

  const vocabularyLevel = getVocabularyLevel(profile.age);
  const constraints = service.buildConstraints(args.targetDurationMinutes);

  const systemPrompt = buildScriptGenerationSystemPrompt(
    profile,
    enrichedConcept,
    vocabularyLevel,
    constraints,
  );
  const userPrompt = buildScriptGenerationUserPrompt(enrichedConcept, answers);

  const run = args.save
    ? createRunDir({
      rootDir: args.storeDir,
      namespace: 'llm',
      command: 'generate-script',
      labelParts: [profile.firstName, enrichedConcept.title.slice(0, 30)],
    })
    : null;

  if (run) {
    writeJsonFile(run.runDir, 'input.json', {
      enrichedConcept,
      profile,
      answers,
      targetDurationMinutes: args.targetDurationMinutes,
      options,
    } satisfies GenerateScriptStoredInput);

    writeJsonFile(run.runDir, 'prompts.json', {
      vocabularyLevel,
      constraints,
      systemPrompt,
      userPrompt,
    });

    writeJsonFile(run.runDir, 'meta.json', {
      command: 'llm generate-script',
      profileName: profile.firstName,
      storyTitle: enrichedConcept.title,
      targetDurationMinutes: args.targetDurationMinutes,
      targetWordCount: constraints.durationBudget.targetWordCount,
      answersCount: answers.length,
      createdAt: new Date().toISOString(),
      dryRun: args.dryRun,
    });
  }

  if (args.dryRun) {
    const payload = {
      profile: profile.firstName,
      enrichedConcept,
      answers,
      targetDurationMinutes: args.targetDurationMinutes,
      constraints,
      vocabularyLevel,
      systemPrompt,
      userPrompt,
      artifactsDir: run?.runDir,
    };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  try {
    const result = await service.generateScript(
      {
        enrichedConcept,
        profile,
        answers,
        targetDurationMinutes: args.targetDurationMinutes,
      },
      provider,
    );

    if (run) {
      writeJsonFile(run.runDir, 'output.json', {
        vocabularyLevel,
        validation: result.validation,
        attempts: result.attempts,
        script: result.script,
      });
    }

    console.log(
      JSON.stringify(
        {
          profile: profile.firstName,
          storyTitle: enrichedConcept.title,
          targetDurationMinutes: args.targetDurationMinutes,
          targetWordCount: constraints.durationBudget.targetWordCount,
          actualWordCount: result.validation.wordCount,
          estimatedDuration: result.validation.estimatedDuration,
          vocabularyLevel,
          attempts: result.attempts,
          validation: result.validation,
          trackCount: result.script.tracks.length,
          characterCount: result.script.characters.length,
          artifactsDir: run?.runDir,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    // Save debug info even on failure
    if (run) {
      writeJsonFile(run.runDir, 'error.json', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        timestamp: new Date().toISOString(),
      });
    }
    throw error;
  }
}
