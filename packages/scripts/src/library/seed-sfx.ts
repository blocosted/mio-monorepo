/**
 * Seed SFX Library Command
 *
 * Pre-generate SFX assets based on the defined taxonomy to populate
 * the persistent library and reduce future API calls.
 */

import { existsSync } from 'node:fs';

import { config as loadDotenv } from 'dotenv';

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';
import {
  type AudioIntensity,
  AudioIntensityValues,
  type SfxEnvironment,
  SfxEnvironmentValues,
  type SfxLibraryCategory,
  SfxLibraryCategoryValues
} from '@mio/shared/types';

/**
 * SFX taxonomy definition for seeding
 */
interface SfxSeedItem {
  category: SfxLibraryCategory;
  subcategory: string;
  environment: SfxEnvironment;
  intensity: AudioIntensity;
  prompt: string;
  tags: string[];
}

/**
 * Complete SFX taxonomy for seeding (~150+ variations)
 */
const SFX_SEED_TAXONOMY: SfxSeedItem[] = [
  // === AMBIENT - WEATHER ===
  {
    category: 'ambient',
    subcategory: 'weather',
    environment: 'outdoor',
    intensity: 'subtle',
    prompt: 'Light drizzle rain on leaves, gentle and soothing',
    tags: ['rain', 'drizzle', 'gentle']
  },
  {
    category: 'ambient',
    subcategory: 'weather',
    environment: 'outdoor',
    intensity: 'medium',
    prompt: 'Steady rainfall with occasional distant thunder',
    tags: ['rain', 'thunder', 'storm']
  },
  {
    category: 'ambient',
    subcategory: 'weather',
    environment: 'outdoor',
    intensity: 'intense',
    prompt: 'Heavy thunderstorm with loud thunder cracks and heavy rain',
    tags: ['storm', 'thunder', 'heavy rain']
  },
  {
    category: 'ambient',
    subcategory: 'weather',
    environment: 'nature',
    intensity: 'subtle',
    prompt: 'Soft wind rustling through grass',
    tags: ['wind', 'grass', 'breeze']
  },
  {
    category: 'ambient',
    subcategory: 'weather',
    environment: 'nature',
    intensity: 'medium',
    prompt: 'Moderate wind blowing through trees',
    tags: ['wind', 'trees', 'forest']
  },
  {
    category: 'ambient',
    subcategory: 'weather',
    environment: 'nature',
    intensity: 'intense',
    prompt: 'Strong howling wind during a storm',
    tags: ['wind', 'storm', 'howling']
  },

  // === AMBIENT - WATER ===
  {
    category: 'ambient',
    subcategory: 'water',
    environment: 'nature',
    intensity: 'subtle',
    prompt: 'Gentle stream flowing over rocks',
    tags: ['stream', 'water', 'creek']
  },
  {
    category: 'ambient',
    subcategory: 'water',
    environment: 'nature',
    intensity: 'medium',
    prompt: 'River flowing with moderate current',
    tags: ['river', 'water', 'current']
  },
  {
    category: 'ambient',
    subcategory: 'water',
    environment: 'nature',
    intensity: 'intense',
    prompt: 'Waterfall crashing into pool below',
    tags: ['waterfall', 'cascade', 'powerful']
  },
  {
    category: 'ambient',
    subcategory: 'water',
    environment: 'outdoor',
    intensity: 'subtle',
    prompt: 'Calm ocean waves lapping on shore',
    tags: ['ocean', 'waves', 'beach']
  },
  {
    category: 'ambient',
    subcategory: 'water',
    environment: 'outdoor',
    intensity: 'medium',
    prompt: 'Ocean waves rolling onto sandy beach',
    tags: ['ocean', 'waves', 'surf']
  },
  {
    category: 'ambient',
    subcategory: 'water',
    environment: 'outdoor',
    intensity: 'intense',
    prompt: 'Stormy ocean waves crashing on rocks',
    tags: ['ocean', 'storm', 'crash']
  },

  // === AMBIENT - FIRE ===
  {
    category: 'ambient',
    subcategory: 'fire',
    environment: 'indoor',
    intensity: 'subtle',
    prompt: 'Gentle fireplace crackling',
    tags: ['fire', 'fireplace', 'crackling']
  },
  {
    category: 'ambient',
    subcategory: 'fire',
    environment: 'outdoor',
    intensity: 'medium',
    prompt: 'Campfire burning steadily with wood pops',
    tags: ['campfire', 'fire', 'wood']
  },
  {
    category: 'ambient',
    subcategory: 'fire',
    environment: 'outdoor',
    intensity: 'intense',
    prompt: 'Large bonfire roaring with intense flames',
    tags: ['bonfire', 'fire', 'roaring']
  },

  // === EFFECTS - FOOTSTEPS ===
  {
    category: 'effects',
    subcategory: 'footsteps',
    environment: 'indoor',
    intensity: 'subtle',
    prompt: 'Soft footsteps on wooden floor',
    tags: ['footsteps', 'wood', 'walking']
  },
  {
    category: 'effects',
    subcategory: 'footsteps',
    environment: 'indoor',
    intensity: 'medium',
    prompt: 'Footsteps echoing on stone floor',
    tags: ['footsteps', 'stone', 'echo']
  },
  {
    category: 'effects',
    subcategory: 'footsteps',
    environment: 'outdoor',
    intensity: 'subtle',
    prompt: 'Footsteps on grass',
    tags: ['footsteps', 'grass', 'soft']
  },
  {
    category: 'effects',
    subcategory: 'footsteps',
    environment: 'outdoor',
    intensity: 'medium',
    prompt: 'Footsteps crunching on gravel path',
    tags: ['footsteps', 'gravel', 'crunch']
  },
  {
    category: 'effects',
    subcategory: 'footsteps',
    environment: 'nature',
    intensity: 'medium',
    prompt: 'Footsteps on dry leaves in forest',
    tags: ['footsteps', 'leaves', 'forest']
  },
  {
    category: 'effects',
    subcategory: 'footsteps',
    environment: 'fantasy',
    intensity: 'subtle',
    prompt: 'Light fairy footsteps with magical sparkle',
    tags: ['footsteps', 'fairy', 'magical']
  },
  {
    category: 'effects',
    subcategory: 'footsteps',
    environment: 'fantasy',
    intensity: 'intense',
    prompt: 'Heavy giant footsteps shaking ground',
    tags: ['footsteps', 'giant', 'heavy']
  },

  // === EFFECTS - DOORS ===
  {
    category: 'effects',
    subcategory: 'doors',
    environment: 'indoor',
    intensity: 'subtle',
    prompt: 'Wooden door opening with soft creak',
    tags: ['door', 'wood', 'creak']
  },
  {
    category: 'effects',
    subcategory: 'doors',
    environment: 'indoor',
    intensity: 'medium',
    prompt: 'Heavy wooden door closing with solid thud',
    tags: ['door', 'wood', 'close']
  },
  {
    category: 'effects',
    subcategory: 'doors',
    environment: 'indoor',
    intensity: 'intense',
    prompt: 'Door slamming shut loudly',
    tags: ['door', 'slam', 'loud']
  },
  {
    category: 'effects',
    subcategory: 'doors',
    environment: 'fantasy',
    intensity: 'medium',
    prompt: 'Ancient stone door grinding open',
    tags: ['door', 'stone', 'ancient']
  },
  {
    category: 'effects',
    subcategory: 'doors',
    environment: 'fantasy',
    intensity: 'intense',
    prompt: 'Castle gate lowering with chains rattling',
    tags: ['gate', 'castle', 'chains']
  },
  {
    category: 'effects',
    subcategory: 'doors',
    environment: 'fantasy',
    intensity: 'subtle',
    prompt: 'Magical portal opening with ethereal hum',
    tags: ['portal', 'magic', 'ethereal']
  },

  // === EFFECTS - IMPACTS ===
  {
    category: 'effects',
    subcategory: 'impacts',
    environment: 'indoor',
    intensity: 'subtle',
    prompt: 'Book falling on wooden table',
    tags: ['impact', 'book', 'thud']
  },
  {
    category: 'effects',
    subcategory: 'impacts',
    environment: 'outdoor',
    intensity: 'medium',
    prompt: 'Stone hitting the ground',
    tags: ['impact', 'stone', 'ground']
  },
  {
    category: 'effects',
    subcategory: 'impacts',
    environment: 'fantasy',
    intensity: 'intense',
    prompt: 'Sword clashing against shield',
    tags: ['impact', 'sword', 'shield', 'combat']
  },
  {
    category: 'effects',
    subcategory: 'impacts',
    environment: 'fantasy',
    intensity: 'intense',
    prompt: 'Magical explosion with reverb',
    tags: ['explosion', 'magic', 'blast']
  },

  // === TRANSITIONS - WHOOSH ===
  {
    category: 'transitions',
    subcategory: 'whoosh',
    environment: 'indoor',
    intensity: 'subtle',
    prompt: 'Soft swoosh transition sound',
    tags: ['whoosh', 'transition', 'soft']
  },
  {
    category: 'transitions',
    subcategory: 'whoosh',
    environment: 'outdoor',
    intensity: 'medium',
    prompt: 'Quick whoosh pass-by sound',
    tags: ['whoosh', 'passby', 'quick']
  },
  {
    category: 'transitions',
    subcategory: 'whoosh',
    environment: 'fantasy',
    intensity: 'intense',
    prompt: 'Dramatic swoosh with magical trail',
    tags: ['whoosh', 'magic', 'dramatic']
  },

  // === TRANSITIONS - MAGICAL ===
  {
    category: 'transitions',
    subcategory: 'magical',
    environment: 'fantasy',
    intensity: 'subtle',
    prompt: 'Soft magical shimmer and sparkle',
    tags: ['magic', 'shimmer', 'sparkle']
  },
  {
    category: 'transitions',
    subcategory: 'magical',
    environment: 'fantasy',
    intensity: 'medium',
    prompt: 'Magical transformation with chimes',
    tags: ['magic', 'transform', 'chimes']
  },
  {
    category: 'transitions',
    subcategory: 'magical',
    environment: 'fantasy',
    intensity: 'intense',
    prompt: 'Powerful spell casting with energy burst',
    tags: ['magic', 'spell', 'energy']
  },
  {
    category: 'transitions',
    subcategory: 'magical',
    environment: 'fantasy',
    intensity: 'subtle',
    prompt: 'Fairy dust sprinkling sound',
    tags: ['fairy', 'dust', 'magical']
  },
  {
    category: 'transitions',
    subcategory: 'magical',
    environment: 'fantasy',
    intensity: 'medium',
    prompt: 'Teleportation sound with whoosh and sparkle',
    tags: ['teleport', 'magic', 'whoosh']
  },
  {
    category: 'transitions',
    subcategory: 'magical',
    environment: 'fantasy',
    intensity: 'intense',
    prompt: 'Portal opening with swirling energy',
    tags: ['portal', 'energy', 'swirl']
  },

  // === FOLEY - FABRIC ===
  {
    category: 'foley',
    subcategory: 'fabric',
    environment: 'indoor',
    intensity: 'subtle',
    prompt: 'Soft fabric rustling, clothing movement',
    tags: ['fabric', 'clothing', 'rustle']
  },
  {
    category: 'foley',
    subcategory: 'fabric',
    environment: 'indoor',
    intensity: 'medium',
    prompt: 'Heavy cloak swooshing',
    tags: ['cloak', 'fabric', 'swoosh']
  },
  {
    category: 'foley',
    subcategory: 'fabric',
    environment: 'fantasy',
    intensity: 'subtle',
    prompt: 'Silk fabric flowing with elegance',
    tags: ['silk', 'fabric', 'elegant']
  },

  // === FOLEY - OBJECTS ===
  {
    category: 'foley',
    subcategory: 'objects',
    environment: 'indoor',
    intensity: 'subtle',
    prompt: 'Page turning in old book',
    tags: ['book', 'page', 'paper']
  },
  { category: 'foley', subcategory: 'objects', environment: 'indoor', intensity: 'medium', prompt: 'Keys jingling on ring', tags: ['keys', 'jingle', 'metal'] },
  {
    category: 'foley',
    subcategory: 'objects',
    environment: 'indoor',
    intensity: 'subtle',
    prompt: 'Quill pen writing on parchment',
    tags: ['quill', 'writing', 'parchment']
  },
  {
    category: 'foley',
    subcategory: 'objects',
    environment: 'fantasy',
    intensity: 'medium',
    prompt: 'Treasure chest opening with creaking hinges',
    tags: ['chest', 'treasure', 'creak']
  },
  {
    category: 'foley',
    subcategory: 'objects',
    environment: 'fantasy',
    intensity: 'subtle',
    prompt: 'Coins dropping into pile',
    tags: ['coins', 'gold', 'treasure']
  },

  // === CREATURES - BIRDS ===
  {
    category: 'creatures',
    subcategory: 'birds',
    environment: 'nature',
    intensity: 'subtle',
    prompt: 'Single bird chirping melodically',
    tags: ['bird', 'chirp', 'songbird']
  },
  {
    category: 'creatures',
    subcategory: 'birds',
    environment: 'nature',
    intensity: 'medium',
    prompt: 'Multiple birds singing in forest',
    tags: ['birds', 'forest', 'chorus']
  },
  { category: 'creatures', subcategory: 'birds', environment: 'nature', intensity: 'subtle', prompt: 'Owl hooting at night', tags: ['owl', 'hoot', 'night'] },
  {
    category: 'creatures',
    subcategory: 'birds',
    environment: 'outdoor',
    intensity: 'medium',
    prompt: 'Wings flapping as bird takes flight',
    tags: ['bird', 'wings', 'flight']
  },
  {
    category: 'creatures',
    subcategory: 'birds',
    environment: 'nature',
    intensity: 'intense',
    prompt: 'Eagle cry echoing through mountains',
    tags: ['eagle', 'cry', 'majestic']
  },

  // === CREATURES - ANIMALS ===
  {
    category: 'creatures',
    subcategory: 'animals',
    environment: 'nature',
    intensity: 'subtle',
    prompt: 'Cat purring contentedly',
    tags: ['cat', 'purr', 'peaceful']
  },
  {
    category: 'creatures',
    subcategory: 'animals',
    environment: 'outdoor',
    intensity: 'medium',
    prompt: 'Dog barking in distance',
    tags: ['dog', 'bark', 'alert']
  },
  {
    category: 'creatures',
    subcategory: 'animals',
    environment: 'nature',
    intensity: 'subtle',
    prompt: 'Horse neighing softly',
    tags: ['horse', 'neigh', 'gentle']
  },
  {
    category: 'creatures',
    subcategory: 'animals',
    environment: 'outdoor',
    intensity: 'medium',
    prompt: 'Horse galloping on dirt path',
    tags: ['horse', 'gallop', 'hooves']
  },
  {
    category: 'creatures',
    subcategory: 'animals',
    environment: 'nature',
    intensity: 'medium',
    prompt: 'Wolf howling at moon',
    tags: ['wolf', 'howl', 'night']
  },

  // === CREATURES - FANTASY ===
  {
    category: 'creatures',
    subcategory: 'fantasy',
    environment: 'fantasy',
    intensity: 'subtle',
    prompt: 'Fairy wings buzzing softly',
    tags: ['fairy', 'wings', 'buzz']
  },
  {
    category: 'creatures',
    subcategory: 'fantasy',
    environment: 'fantasy',
    intensity: 'medium',
    prompt: 'Dragon breathing low rumble',
    tags: ['dragon', 'breath', 'rumble']
  },
  {
    category: 'creatures',
    subcategory: 'fantasy',
    environment: 'fantasy',
    intensity: 'intense',
    prompt: 'Dragon roaring with fire breath',
    tags: ['dragon', 'roar', 'fire']
  },
  {
    category: 'creatures',
    subcategory: 'fantasy',
    environment: 'fantasy',
    intensity: 'medium',
    prompt: 'Unicorn magical whinny with sparkle',
    tags: ['unicorn', 'magical', 'whinny']
  },
  {
    category: 'creatures',
    subcategory: 'fantasy',
    environment: 'fantasy',
    intensity: 'subtle',
    prompt: 'Magical creature purring with ethereal tone',
    tags: ['creature', 'magical', 'ethereal']
  },
  {
    category: 'creatures',
    subcategory: 'fantasy',
    environment: 'fantasy',
    intensity: 'intense',
    prompt: 'Giant monster growling menacingly',
    tags: ['monster', 'growl', 'menacing']
  },

  // === CREATURES - INSECTS ===
  {
    category: 'creatures',
    subcategory: 'insects',
    environment: 'nature',
    intensity: 'subtle',
    prompt: 'Crickets chirping at night',
    tags: ['crickets', 'night', 'chirp']
  },
  {
    category: 'creatures',
    subcategory: 'insects',
    environment: 'nature',
    intensity: 'medium',
    prompt: 'Bees buzzing around flowers',
    tags: ['bees', 'buzz', 'garden']
  },
  {
    category: 'creatures',
    subcategory: 'insects',
    environment: 'nature',
    intensity: 'subtle',
    prompt: 'Cicadas singing in summer heat',
    tags: ['cicadas', 'summer', 'heat']
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

export interface SeedSfxCommandOptions {
  category?: SfxLibraryCategory;
  environment?: SfxEnvironment;
  intensity?: AudioIntensity;
  dryRun: boolean;
  envFile?: string;
  delayMs: number;
  maxItems?: number;
}

export async function runSeedSfxCommand(options: SeedSfxCommandOptions): Promise<void> {
  loadEnv(options.envFile);

  // Filter taxonomy based on options
  let itemsToSeed = [...SFX_SEED_TAXONOMY];

  if (options.category) {
    if (!SfxLibraryCategoryValues.includes(options.category)) {
      console.error(`Invalid category: ${options.category}`);
      console.error(`Valid categories: ${SfxLibraryCategoryValues.join(', ')}`);
      process.exit(1);
    }
    itemsToSeed = itemsToSeed.filter((item) => item.category === options.category);
  }

  if (options.environment) {
    if (!SfxEnvironmentValues.includes(options.environment)) {
      console.error(`Invalid environment: ${options.environment}`);
      console.error(`Valid environments: ${SfxEnvironmentValues.join(', ')}`);
      process.exit(1);
    }
    itemsToSeed = itemsToSeed.filter((item) => item.environment === options.environment);
  }

  if (options.intensity) {
    if (!AudioIntensityValues.includes(options.intensity)) {
      console.error(`Invalid intensity: ${options.intensity}`);
      console.error(`Valid intensities: ${AudioIntensityValues.join(', ')}`);
      process.exit(1);
    }
    itemsToSeed = itemsToSeed.filter((item) => item.intensity === options.intensity);
  }

  if (options.maxItems && options.maxItems > 0) {
    itemsToSeed = itemsToSeed.slice(0, options.maxItems);
  }

  if (options.category)
    if (options.environment)
      if (options.intensity)
        if (options.dryRun) {
          for (const _item of itemsToSeed) {
          }

          // Summary by category
          const byCategory: Record<string, number> = {};
          for (const item of itemsToSeed) {
            byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
          }
          for (const [_cat, _count] of Object.entries(byCategory)) {
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
      const result = await services.generateSfx({
        text: item.prompt,
        category: item.category,
        subcategory: item.subcategory,
        environment: item.environment,
        intensity: item.intensity,
        durationSeconds: 5, // Standard duration for library assets
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
      results.errors.push(`${item.category}/${item.subcategory}: ${errorMsg}`);
    }

    // Rate limiting delay (ElevenLabs: 20 req/min = 3000ms between requests)
    if (i < itemsToSeed.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
  }

  const _elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (results.errors.length > 0) {
    for (const _err of results.errors) {
    }
  }

  // Cost estimate ($0.01 per SFX generation approximately)
  const _estimatedCost = results.success * 0.01;
}
