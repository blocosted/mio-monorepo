/**
 * Seed Ambiance Library Command
 *
 * Pre-generate ambiance assets based on the defined taxonomy to populate
 * the persistent library and reduce future API calls.
 */

import { existsSync } from 'node:fs';

import { config as loadDotenv } from 'dotenv';

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';
import {
  type AmbianceEnvironment,
  AmbianceEnvironmentValues,
  type AudioMood,
  AudioMoodValues,
  type TimeOfDay,
  TimeOfDayValues,
  type WeatherCondition,
  WeatherConditionValues
} from '@mio/shared/types';

/**
 * Ambiance taxonomy definition for seeding
 */
interface AmbianceSeedItem {
  environment: AmbianceEnvironment;
  subEnvironment: string;
  timeOfDay: TimeOfDay;
  weather: WeatherCondition;
  mood: AudioMood;
  prompt: string;
  tags: string[];
}

/**
 * Complete Ambiance taxonomy for seeding (~100+ variations)
 */
const AMBIANCE_SEED_TAXONOMY: AmbianceSeedItem[] = [
  // === FOREST ===
  {
    environment: 'forest',
    subEnvironment: 'deep',
    timeOfDay: 'day',
    weather: 'clear',
    mood: 'peaceful',
    prompt: 'Deep forest ambiance with birds chirping, leaves rustling, peaceful daytime atmosphere',
    tags: ['forest', 'birds', 'peaceful', 'nature']
  },
  {
    environment: 'forest',
    subEnvironment: 'deep',
    timeOfDay: 'night',
    weather: 'clear',
    mood: 'mysterious',
    prompt: 'Mysterious night forest with crickets, distant owl hoots, and soft wind through trees',
    tags: ['forest', 'night', 'crickets', 'owls']
  },
  {
    environment: 'forest',
    subEnvironment: 'deep',
    timeOfDay: 'dawn',
    weather: 'clear',
    mood: 'peaceful',
    prompt: 'Forest at dawn with morning bird chorus and gentle mist',
    tags: ['forest', 'dawn', 'birds', 'mist']
  },
  {
    environment: 'forest',
    subEnvironment: 'clearing',
    timeOfDay: 'day',
    weather: 'clear',
    mood: 'peaceful',
    prompt: 'Sunny forest clearing with meadow birds and gentle breeze',
    tags: ['forest', 'clearing', 'meadow', 'sunny']
  },
  {
    environment: 'forest',
    subEnvironment: 'clearing',
    timeOfDay: 'night',
    weather: 'clear',
    mood: 'magical',
    prompt: 'Magical forest clearing at night with fireflies and enchanted atmosphere',
    tags: ['forest', 'magical', 'fireflies', 'enchanted']
  },
  {
    environment: 'forest',
    subEnvironment: 'edge',
    timeOfDay: 'day',
    weather: 'rainy',
    mood: 'peaceful',
    prompt: 'Forest edge during gentle rain with drops on leaves',
    tags: ['forest', 'rain', 'leaves', 'peaceful']
  },
  {
    environment: 'forest',
    subEnvironment: 'deep',
    timeOfDay: 'night',
    weather: 'stormy',
    mood: 'tense',
    prompt: 'Stormy forest night with thunder, heavy rain, and creaking trees',
    tags: ['forest', 'storm', 'thunder', 'tense']
  },

  // === OCEAN ===
  {
    environment: 'ocean',
    subEnvironment: 'beach',
    timeOfDay: 'day',
    weather: 'clear',
    mood: 'peaceful',
    prompt: 'Peaceful beach with gentle waves, seagulls, and warm breeze',
    tags: ['beach', 'waves', 'seagulls', 'peaceful']
  },
  {
    environment: 'ocean',
    subEnvironment: 'beach',
    timeOfDay: 'night',
    weather: 'clear',
    mood: 'peaceful',
    prompt: 'Calm beach at night with gentle waves and distant boat horn',
    tags: ['beach', 'night', 'waves', 'calm']
  },
  {
    environment: 'ocean',
    subEnvironment: 'beach',
    timeOfDay: 'day',
    weather: 'stormy',
    mood: 'tense',
    prompt: 'Stormy beach with crashing waves and strong wind',
    tags: ['beach', 'storm', 'waves', 'wind']
  },
  {
    environment: 'ocean',
    subEnvironment: 'dock',
    timeOfDay: 'day',
    weather: 'clear',
    mood: 'adventurous',
    prompt: 'Busy harbor dock with boats creaking, seagulls, water lapping',
    tags: ['dock', 'harbor', 'boats', 'adventure']
  },
  {
    environment: 'ocean',
    subEnvironment: 'dock',
    timeOfDay: 'night',
    weather: 'foggy',
    mood: 'mysterious',
    prompt: 'Foggy dock at night with distant fog horn and water sounds',
    tags: ['dock', 'fog', 'night', 'mysterious']
  },
  {
    environment: 'ocean',
    subEnvironment: 'open_sea',
    timeOfDay: 'day',
    weather: 'clear',
    mood: 'adventurous',
    prompt: 'Open sea sailing ambiance with wind in sails and waves against hull',
    tags: ['sea', 'sailing', 'adventure', 'wind']
  },

  // === CITY ===
  {
    environment: 'city',
    subEnvironment: 'street',
    timeOfDay: 'day',
    weather: 'clear',
    mood: 'adventurous',
    prompt: 'Busy medieval market street with merchants, crowds, and cart wheels',
    tags: ['city', 'market', 'medieval', 'busy']
  },
  {
    environment: 'city',
    subEnvironment: 'street',
    timeOfDay: 'night',
    weather: 'clear',
    mood: 'mysterious',
    prompt: 'Quiet city street at night with distant footsteps and lantern creaking',
    tags: ['city', 'night', 'quiet', 'mysterious']
  },
  {
    environment: 'city',
    subEnvironment: 'market',
    timeOfDay: 'day',
    weather: 'clear',
    mood: 'adventurous',
    prompt: 'Lively marketplace with vendors calling, coins clinking, crowd chatter',
    tags: ['market', 'vendors', 'busy', 'medieval']
  },
  {
    environment: 'city',
    subEnvironment: 'alley',
    timeOfDay: 'night',
    weather: 'rainy',
    mood: 'mysterious',
    prompt: 'Dark rainy alley with dripping water and distant echoes',
    tags: ['alley', 'rain', 'dark', 'mysterious']
  },

  // === VILLAGE ===
  {
    environment: 'village',
    subEnvironment: 'center',
    timeOfDay: 'day',
    weather: 'clear',
    mood: 'peaceful',
    prompt: 'Peaceful village center with chickens, distant blacksmith, and friendly chatter',
    tags: ['village', 'peaceful', 'rural', 'daytime']
  },
  {
    environment: 'village',
    subEnvironment: 'center',
    timeOfDay: 'night',
    weather: 'clear',
    mood: 'peaceful',
    prompt: 'Quiet village night with crickets and distant dog barking',
    tags: ['village', 'night', 'quiet', 'peaceful']
  },
  {
    environment: 'village',
    subEnvironment: 'farm',
    timeOfDay: 'dawn',
    weather: 'clear',
    mood: 'peaceful',
    prompt: 'Farm at dawn with rooster crowing, animals waking, peaceful morning',
    tags: ['farm', 'dawn', 'rooster', 'animals']
  },
  {
    environment: 'village',
    subEnvironment: 'home',
    timeOfDay: 'any',
    weather: 'any',
    mood: 'peaceful',
    prompt: 'Cozy cottage interior with fireplace crackling and wind outside',
    tags: ['cottage', 'cozy', 'fireplace', 'home']
  },
  {
    environment: 'village',
    subEnvironment: 'tavern',
    timeOfDay: 'night',
    weather: 'any',
    mood: 'adventurous',
    prompt: 'Lively tavern with music, laughter, clinking mugs, and chatter',
    tags: ['tavern', 'music', 'lively', 'medieval']
  },

  // === CASTLE ===
  {
    environment: 'castle',
    subEnvironment: 'hall',
    timeOfDay: 'any',
    weather: 'any',
    mood: 'mysterious',
    prompt: 'Grand castle hall with echoing footsteps, torch crackling, distant voices',
    tags: ['castle', 'hall', 'grand', 'echo']
  },
  {
    environment: 'castle',
    subEnvironment: 'dungeon',
    timeOfDay: 'any',
    weather: 'any',
    mood: 'tense',
    prompt: 'Dark dungeon with dripping water, chains rattling, distant moans',
    tags: ['dungeon', 'dark', 'chains', 'tense']
  },
  {
    environment: 'castle',
    subEnvironment: 'tower',
    timeOfDay: 'night',
    weather: 'clear',
    mood: 'mysterious',
    prompt: 'Castle tower at night with wind howling and owls outside',
    tags: ['tower', 'night', 'wind', 'owls']
  },
  {
    environment: 'castle',
    subEnvironment: 'courtyard',
    timeOfDay: 'day',
    weather: 'clear',
    mood: 'adventurous',
    prompt: 'Castle courtyard with guards training, horses, flag flapping in wind',
    tags: ['courtyard', 'guards', 'training', 'medieval']
  },
  {
    environment: 'castle',
    subEnvironment: 'throne',
    timeOfDay: 'any',
    weather: 'any',
    mood: 'mysterious',
    prompt: 'Majestic throne room with echo, distant trumpets, royal atmosphere',
    tags: ['throne', 'royal', 'majestic', 'echo']
  },

  // === CAVE ===
  {
    environment: 'cave',
    subEnvironment: 'entrance',
    timeOfDay: 'any',
    weather: 'any',
    mood: 'mysterious',
    prompt: 'Cave entrance with wind echoing, dripping water, birds in distance',
    tags: ['cave', 'entrance', 'echo', 'mysterious']
  },
  {
    environment: 'cave',
    subEnvironment: 'deep',
    timeOfDay: 'any',
    weather: 'any',
    mood: 'tense',
    prompt: 'Deep cave with echoing drips, distant rumbles, oppressive silence',
    tags: ['cave', 'deep', 'drips', 'tense']
  },
  {
    environment: 'cave',
    subEnvironment: 'crystal',
    timeOfDay: 'any',
    weather: 'any',
    mood: 'magical',
    prompt: 'Crystal cave with magical resonance, ethereal hums, sparkling sounds',
    tags: ['cave', 'crystal', 'magical', 'ethereal']
  },
  {
    environment: 'cave',
    subEnvironment: 'underground_river',
    timeOfDay: 'any',
    weather: 'any',
    mood: 'mysterious',
    prompt: 'Underground river in cave with flowing water and echoing drips',
    tags: ['cave', 'river', 'water', 'echo']
  },

  // === MOUNTAIN ===
  {
    environment: 'mountain',
    subEnvironment: 'peak',
    timeOfDay: 'day',
    weather: 'clear',
    mood: 'adventurous',
    prompt: 'Mountain peak with strong wind, distant eagle, vast open feeling',
    tags: ['mountain', 'peak', 'wind', 'eagle']
  },
  {
    environment: 'mountain',
    subEnvironment: 'peak',
    timeOfDay: 'night',
    weather: 'clear',
    mood: 'peaceful',
    prompt: 'Mountain peak at night with gentle wind and star-gazing atmosphere',
    tags: ['mountain', 'night', 'stars', 'peaceful']
  },
  {
    environment: 'mountain',
    subEnvironment: 'path',
    timeOfDay: 'day',
    weather: 'clear',
    mood: 'adventurous',
    prompt: 'Mountain hiking path with gravel footsteps, birds, and wind',
    tags: ['mountain', 'hiking', 'path', 'adventure']
  },
  {
    environment: 'mountain',
    subEnvironment: 'valley',
    timeOfDay: 'dawn',
    weather: 'foggy',
    mood: 'mysterious',
    prompt: 'Misty mountain valley at dawn with distant waterfalls',
    tags: ['mountain', 'valley', 'mist', 'waterfall']
  },
  {
    environment: 'mountain',
    subEnvironment: 'peak',
    timeOfDay: 'any',
    weather: 'snowy',
    mood: 'peaceful',
    prompt: 'Snowy mountain with howling wind and crunching snow underfoot',
    tags: ['mountain', 'snow', 'winter', 'cold']
  },

  // === MEADOW ===
  {
    environment: 'meadow',
    subEnvironment: 'flower',
    timeOfDay: 'day',
    weather: 'clear',
    mood: 'peaceful',
    prompt: 'Sunny flower meadow with bees buzzing, birds singing, gentle breeze',
    tags: ['meadow', 'flowers', 'bees', 'sunny']
  },
  {
    environment: 'meadow',
    subEnvironment: 'grass',
    timeOfDay: 'dusk',
    weather: 'clear',
    mood: 'peaceful',
    prompt: 'Meadow at sunset with crickets starting and warm evening breeze',
    tags: ['meadow', 'sunset', 'crickets', 'peaceful']
  },
  {
    environment: 'meadow',
    subEnvironment: 'stream',
    timeOfDay: 'day',
    weather: 'clear',
    mood: 'peaceful',
    prompt: 'Meadow with gentle stream, frogs, and rustling grass',
    tags: ['meadow', 'stream', 'frogs', 'nature']
  },
  {
    environment: 'meadow',
    subEnvironment: 'flower',
    timeOfDay: 'night',
    weather: 'clear',
    mood: 'magical',
    prompt: 'Magical meadow at night with fireflies and enchanted atmosphere',
    tags: ['meadow', 'night', 'fireflies', 'magical']
  },

  // === SPACE ===
  {
    environment: 'space',
    subEnvironment: 'void',
    timeOfDay: 'any',
    weather: 'any',
    mood: 'mysterious',
    prompt: 'Deep space void with subtle cosmic hums and distant stars',
    tags: ['space', 'void', 'cosmic', 'mysterious']
  },
  {
    environment: 'space',
    subEnvironment: 'ship',
    timeOfDay: 'any',
    weather: 'any',
    mood: 'adventurous',
    prompt: 'Spaceship interior with engine hum, beeping consoles, ventilation',
    tags: ['space', 'ship', 'scifi', 'adventure']
  },
  {
    environment: 'space',
    subEnvironment: 'station',
    timeOfDay: 'any',
    weather: 'any',
    mood: 'tense',
    prompt: 'Space station with distant alarms, machinery, and radio static',
    tags: ['space', 'station', 'scifi', 'tense']
  },

  // === UNDERWATER ===
  {
    environment: 'underwater',
    subEnvironment: 'shallow',
    timeOfDay: 'any',
    weather: 'any',
    mood: 'peaceful',
    prompt: 'Shallow underwater ambiance with bubbles, distant whale song, peaceful depths',
    tags: ['underwater', 'ocean', 'bubbles', 'peaceful']
  },
  {
    environment: 'underwater',
    subEnvironment: 'deep',
    timeOfDay: 'any',
    weather: 'any',
    mood: 'mysterious',
    prompt: 'Deep ocean with pressure sounds, distant creatures, mysterious darkness',
    tags: ['underwater', 'deep', 'ocean', 'mysterious']
  },
  {
    environment: 'underwater',
    subEnvironment: 'reef',
    timeOfDay: 'any',
    weather: 'any',
    mood: 'magical',
    prompt: 'Coral reef with bubbles, colorful fish sounds, magical underwater world',
    tags: ['underwater', 'reef', 'fish', 'magical']
  },
  {
    environment: 'underwater',
    subEnvironment: 'cave',
    timeOfDay: 'any',
    weather: 'any',
    mood: 'tense',
    prompt: 'Underwater cave with echoing bubbles and mysterious currents',
    tags: ['underwater', 'cave', 'echo', 'tense']
  }
];

function loadEnv(envFile?: string): void {
  const files = envFile ? [envFile] : ['.env.local', '.env'];
  for (const file of files) {
    if (existsSync(file)) {
      loadDotenv({ path: file });
    }
  }
  loadEnvironmentFromProcessEnv({ override: true });
}

export interface SeedAmbianceCommandOptions {
  environment?: AmbianceEnvironment;
  timeOfDay?: TimeOfDay;
  weather?: WeatherCondition;
  mood?: AudioMood;
  dryRun: boolean;
  envFile?: string;
  delayMs: number;
  maxItems?: number;
}

export async function runSeedAmbianceCommand(options: SeedAmbianceCommandOptions): Promise<void> {
  loadEnv(options.envFile);

  // Filter taxonomy based on options
  let itemsToSeed = [...AMBIANCE_SEED_TAXONOMY];

  if (options.environment) {
    if (!AmbianceEnvironmentValues.includes(options.environment)) {
      console.error(`Invalid environment: ${options.environment}`);
      console.error(`Valid environments: ${AmbianceEnvironmentValues.join(', ')}`);
      process.exit(1);
    }
    itemsToSeed = itemsToSeed.filter((item) => item.environment === options.environment);
  }

  if (options.timeOfDay) {
    if (!TimeOfDayValues.includes(options.timeOfDay)) {
      console.error(`Invalid time-of-day: ${options.timeOfDay}`);
      console.error(`Valid values: ${TimeOfDayValues.join(', ')}`);
      process.exit(1);
    }
    itemsToSeed = itemsToSeed.filter((item) => item.timeOfDay === options.timeOfDay || item.timeOfDay === 'any');
  }

  if (options.weather) {
    if (!WeatherConditionValues.includes(options.weather)) {
      console.error(`Invalid weather: ${options.weather}`);
      console.error(`Valid values: ${WeatherConditionValues.join(', ')}`);
      process.exit(1);
    }
    itemsToSeed = itemsToSeed.filter((item) => item.weather === options.weather || item.weather === 'any');
  }

  if (options.mood) {
    if (!AudioMoodValues.includes(options.mood)) {
      console.error(`Invalid mood: ${options.mood}`);
      console.error(`Valid values: ${AudioMoodValues.join(', ')}`);
      process.exit(1);
    }
    itemsToSeed = itemsToSeed.filter((item) => item.mood === options.mood);
  }

  if (options.maxItems && options.maxItems > 0) {
    itemsToSeed = itemsToSeed.slice(0, options.maxItems);
  }

  if (options.environment)
    if (options.timeOfDay)
      if (options.weather)
        if (options.mood)
          if (options.dryRun) {
            for (const _item of itemsToSeed) {
            }

            // Summary by environment
            const byEnvironment: Record<string, number> = {};
            for (const item of itemsToSeed) {
              byEnvironment[item.environment] = (byEnvironment[item.environment] ?? 0) + 1;
            }
            for (const [_env, _count] of Object.entries(byEnvironment)) {
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
      const result = await services.generateAmbiance({
        description: item.prompt,
        environment: item.environment,
        subEnvironment: item.subEnvironment,
        timeOfDay: item.timeOfDay,
        weather: item.weather,
        mood: item.mood,
        targetDurationSeconds: 10, // Source clip duration for library
        promptInfluence: 0.3
      });

      if (result.fromLibrary) {
        results.skipped++;
      } else {
        results.success++;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.failed++;
      results.errors.push(`${item.environment}/${item.subEnvironment}: ${errorMsg}`);
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
