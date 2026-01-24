/**
 * Seed Music Library Command
 *
 * Pre-generate music assets based on the defined taxonomy to populate
 * the persistent library and reduce future API calls.
 */

import { existsSync } from 'node:fs';

import { config as loadDotenv } from 'dotenv';

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';
import { type MusicIntensity, MusicIntensityValues, type MusicMood, MusicMoodValues, type MusicTempo, MusicTempoValues } from '@mio/shared/types';

/**
 * Music taxonomy definition for seeding
 */
interface MusicSeedItem {
  mood: MusicMood;
  intensity: MusicIntensity;
  tempo: MusicTempo;
  variationIndex: number;
  prompt: string;
  tags: string[];
}

/**
 * Generate all music variations based on mood, intensity, tempo combinations
 */
function generateMusicTaxonomy(): MusicSeedItem[] {
  const items: MusicSeedItem[] = [];

  // Mood to prompt mapping (base prompts)
  const moodPrompts: Record<MusicMood, string> = {
    calm: 'Gentle, calming orchestral music with soft strings and peaceful atmosphere',
    mysterious: 'Mysterious, enigmatic music with subtle tension and wonder',
    adventurous: 'Epic adventure music with heroic themes and exciting energy',
    tense: 'Suspenseful, tension-building music with dramatic undertones',
    joyful: 'Happy, uplifting music with cheerful melodies and bright instruments',
    sad: 'Melancholic, emotional music with gentle piano and sorrowful strings',
    magical: 'Enchanting, whimsical music with sparkles, chimes, and wonder',
    serene: 'Peaceful, tranquil music for meditation and quiet moments'
  };

  // Intensity modifiers
  const intensityModifiers: Record<MusicIntensity, string> = {
    soft: ', very soft and delicate, minimal instrumentation',
    medium: ', balanced dynamics, full but not overwhelming',
    epic: ', grand and powerful, full orchestra with dramatic swells'
  };

  // Tempo modifiers
  const tempoModifiers: Record<MusicTempo, string> = {
    slow: ', slow tempo around 60 BPM, relaxed pace',
    medium: ', moderate tempo around 90 BPM, comfortable pace',
    fast: ', upbeat tempo around 120 BPM, energetic pace'
  };

  // Define valid combinations (not all combinations make sense)
  const validCombinations: Array<{ mood: MusicMood; intensity: MusicIntensity; tempo: MusicTempo; variations: number }> = [
    // Calm
    { mood: 'calm', intensity: 'soft', tempo: 'slow', variations: 3 },
    { mood: 'calm', intensity: 'soft', tempo: 'medium', variations: 2 },
    { mood: 'calm', intensity: 'medium', tempo: 'slow', variations: 2 },

    // Mysterious
    { mood: 'mysterious', intensity: 'soft', tempo: 'slow', variations: 3 },
    { mood: 'mysterious', intensity: 'medium', tempo: 'slow', variations: 2 },
    { mood: 'mysterious', intensity: 'medium', tempo: 'medium', variations: 2 },

    // Adventurous
    { mood: 'adventurous', intensity: 'medium', tempo: 'medium', variations: 3 },
    { mood: 'adventurous', intensity: 'epic', tempo: 'medium', variations: 3 },
    { mood: 'adventurous', intensity: 'epic', tempo: 'fast', variations: 2 },

    // Tense
    { mood: 'tense', intensity: 'medium', tempo: 'slow', variations: 2 },
    { mood: 'tense', intensity: 'medium', tempo: 'medium', variations: 3 },
    { mood: 'tense', intensity: 'epic', tempo: 'medium', variations: 2 },
    { mood: 'tense', intensity: 'epic', tempo: 'fast', variations: 2 },

    // Joyful
    { mood: 'joyful', intensity: 'soft', tempo: 'medium', variations: 2 },
    { mood: 'joyful', intensity: 'medium', tempo: 'medium', variations: 3 },
    { mood: 'joyful', intensity: 'medium', tempo: 'fast', variations: 2 },

    // Sad
    { mood: 'sad', intensity: 'soft', tempo: 'slow', variations: 3 },
    { mood: 'sad', intensity: 'medium', tempo: 'slow', variations: 2 },

    // Magical
    { mood: 'magical', intensity: 'soft', tempo: 'slow', variations: 3 },
    { mood: 'magical', intensity: 'soft', tempo: 'medium', variations: 2 },
    { mood: 'magical', intensity: 'medium', tempo: 'medium', variations: 3 },

    // Serene
    { mood: 'serene', intensity: 'soft', tempo: 'slow', variations: 3 },
    { mood: 'serene', intensity: 'soft', tempo: 'medium', variations: 2 }
  ];

  for (const combo of validCombinations) {
    for (let v = 0; v < combo.variations; v++) {
      const basePrompt = moodPrompts[combo.mood];
      const prompt = `${basePrompt}${intensityModifiers[combo.intensity]}${tempoModifiers[combo.tempo]}`;

      items.push({
        mood: combo.mood,
        intensity: combo.intensity,
        tempo: combo.tempo,
        variationIndex: v,
        prompt,
        tags: [combo.mood, combo.intensity, combo.tempo, 'background', 'story']
      });
    }
  }

  return items;
}

const MUSIC_SEED_TAXONOMY = generateMusicTaxonomy();

function loadEnv(envFile?: string): void {
  const files = envFile ? [envFile] : ['.env.local', '.env'];
  for (const file of files) {
    if (existsSync(file)) {
      loadDotenv({ path: file });
    }
  }
  loadEnvironmentFromProcessEnv({ override: true });
}

export interface SeedMusicCommandOptions {
  mood?: MusicMood;
  intensity?: MusicIntensity;
  tempo?: MusicTempo;
  dryRun: boolean;
  envFile?: string;
  delayMs: number;
  maxItems?: number;
}

export async function runSeedMusicCommand(options: SeedMusicCommandOptions): Promise<void> {
  loadEnv(options.envFile);

  // Filter taxonomy based on options
  let itemsToSeed = [...MUSIC_SEED_TAXONOMY];

  if (options.mood) {
    if (!MusicMoodValues.includes(options.mood)) {
      console.error(`Invalid mood: ${options.mood}`);
      console.error(`Valid moods: ${MusicMoodValues.join(', ')}`);
      process.exit(1);
    }
    itemsToSeed = itemsToSeed.filter((item) => item.mood === options.mood);
  }

  if (options.intensity) {
    if (!MusicIntensityValues.includes(options.intensity)) {
      console.error(`Invalid intensity: ${options.intensity}`);
      console.error(`Valid intensities: ${MusicIntensityValues.join(', ')}`);
      process.exit(1);
    }
    itemsToSeed = itemsToSeed.filter((item) => item.intensity === options.intensity);
  }

  if (options.tempo) {
    if (!MusicTempoValues.includes(options.tempo)) {
      console.error(`Invalid tempo: ${options.tempo}`);
      console.error(`Valid tempos: ${MusicTempoValues.join(', ')}`);
      process.exit(1);
    }
    itemsToSeed = itemsToSeed.filter((item) => item.tempo === options.tempo);
  }

  if (options.maxItems && options.maxItems > 0) {
    itemsToSeed = itemsToSeed.slice(0, options.maxItems);
  }

  if (options.mood)
    if (options.intensity)
      if (options.tempo)
        if (options.dryRun) {
          for (const _item of itemsToSeed) {
          }

          // Summary by mood
          const byMood: Record<string, number> = {};
          for (const item of itemsToSeed) {
            byMood[item.mood] = (byMood[item.mood] ?? 0) + 1;
          }
          for (const [_mood, _count] of Object.entries(byMood)) {
          }
          return;
        }

  // Dynamic imports after env is loaded
  const { Logger } = await import('@mio/shared/server/logger');
  const { createCliServices } = await import('./factory');

  const logger = await Logger.create();
  const services = await createCliServices(logger);

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[]
  };

  const startTime = Date.now();

  for (let i = 0; i < itemsToSeed.length; i++) {
    const item = itemsToSeed[i];
    if (!item) continue;
    const _progress = `[${i + 1}/${itemsToSeed.length}]`;

    try {
      const result = await services.generateMusic({
        mood: item.mood,
        intensity: item.intensity,
        tempo: item.tempo,
        variationIndex: item.variationIndex,
        customPrompt: item.prompt,
        targetDurationSeconds: 15, // Source clip duration for library
        promptInfluence: 0.5
      });

      if (result.fromLibrary) {
        results.skipped++;
      } else {
        results.success++;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.failed++;
      results.errors.push(`${item.mood}/${item.intensity}/${item.tempo} v${item.variationIndex}: ${errorMsg}`);
    }

    // Rate limiting delay
    if (i < itemsToSeed.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
  }

  const _elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (results.errors.length > 0) {
    for (const _err of results.errors) {
    }
  }

  // Cost estimate
  const _estimatedCost = results.success * 0.01;
}
