/**
 * Script Generation Service Types
 *
 * Types for script generation service.
 */

import type { EnrichedConcept } from './stories.service.types';

/**
 * Voice segment in the script
 */
export interface VoiceSegment {
  id: string;
  text: string;
  voiceId: string;
  startTime: number;
  duration: number;
}

/**
 * SFX segment in the script
 */
export interface SfxSegment {
  id: string;
  description: string;
  startTime: number;
  duration: number;
}

/**
 * Music segment in the script
 */
export interface MusicSegment {
  id: string;
  description: string;
  mood: string;
  startTime: number;
  duration: number;
}

/**
 * Ambiance configuration in the script
 */
export interface AmbianceConfig {
  description: string;
  mood: string;
  intensity: number;
}

/**
 * Story script
 */
export interface StoryScript {
  voiceSegments: VoiceSegment[];
  sfxSegments: SfxSegment[];
  musicSegments: MusicSegment[];
  ambianceConfig: AmbianceConfig;
  totalDuration: number;
}

/**
 * Input for script generation
 */
export interface GenerateScriptInput {
  storyId: string;
  enrichedConcept: EnrichedConcept;
  targetDurationMinutes: number;
}

/**
 * Result of script generation
 */
export interface GenerateScriptResult {
  script: StoryScript;
}

/**
 * Script Generation Service Interface
 */
export interface IScriptGenerationService {
  /**
   * Generate a script from an enriched concept
   */
  generateScript(input: GenerateScriptInput): Promise<GenerateScriptResult>;
}
