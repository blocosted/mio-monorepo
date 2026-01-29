/**
 * Voice Selection Service Implementation
 *
 * Enables manual voice selection for narrator and characters.
 * Provides recommendations based on character descriptions and
 * allows users to override auto-assigned voices.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import { AppError, ErrorCodes } from '@mio/shared';
import { Language, VoiceAge, VoiceGender, VoiceUseCase } from '@mio/shared/types';

import type {
  CharacterWithVoiceRecommendations,
  GetCharactersInput,
  GetCharactersResult,
  GetRecommendedVoicesOptions,
  UpdateVoiceAssignmentsInput,
  UpdateVoiceAssignmentsResult,
  VoiceInfo,
  VoiceRecommendation
} from './voice-selection.service.types';
import type { StoredVoice } from './voice-registry.service.types';
import type { VoiceRegistryService } from './voice-registry.service';
import type { StoriesService } from '../stories/stories.service';
import type { StoryContextService } from '../stories/story-context.service';
import { IocService } from '../../ioc/ioc.types';
import { AbstractService } from '../service.abstract';

/**
 * Default number of voice recommendations per character
 */
const DEFAULT_RECOMMENDATION_LIMIT = 5;

/**
 * Keyword weights for simple scoring (0-100 scale)
 */
const SCORE_WEIGHTS = {
  language: 40,
  gender: 35,
  age: 25
} as const;

/**
 * Gender detection keywords (English and French)
 */
const FEMALE_KEYWORDS = [
  'female', 'woman', 'girl', 'feminine', 'mother', 'princess', 'queen',
  'grandmother', 'sister', 'daughter', 'aunt', 'lady', 'miss', 'mrs',
  'femme', 'fille', 'maman', 'mere', 'princesse', 'reine', 'grand-mere',
  'soeur', 'tante', 'madame', 'mademoiselle', 'she', 'her', 'elle'
];

const MALE_KEYWORDS = [
  'male', 'man', 'boy', 'masculine', 'father', 'prince', 'king',
  'grandfather', 'brother', 'son', 'uncle', 'gentleman', 'mister', 'mr',
  'homme', 'garcon', 'papa', 'pere', 'prince', 'roi', 'grand-pere',
  'frere', 'oncle', 'monsieur', 'he', 'him', 'il', 'lui'
];

/**
 * Age detection keywords
 */
const YOUNG_KEYWORDS = [
  'child', 'young', 'kid', 'little', 'small', 'boy', 'girl', 'baby',
  'enfant', 'jeune', 'petit', 'petite', 'garcon', 'fille', 'bebe'
];

const OLD_KEYWORDS = [
  'old', 'elder', 'wise', 'ancient', 'grandmother', 'grandfather',
  'ancien', 'vieux', 'vieille', 'sage', 'grand-mere', 'grand-pere'
];

/**
 * Voice Selection Service
 *
 * Provides voice selection functionality for story characters.
 */
@injectable()
export class VoiceSelectionService extends AbstractService {
  constructor(
    @inject(IocService.STORIES) private readonly storiesService: StoriesService,
    @inject(IocService.STORY_CONTEXT) private readonly storyContext: StoryContextService,
    @inject(IocService.VOICE_REGISTRY) private readonly voiceRegistry: VoiceRegistryService
  ) {
    super();
  }

  /**
   * Get characters with current voice assignments and recommendations
   */
  async getCharactersWithRecommendations(input: GetCharactersInput): Promise<GetCharactersResult> {
    const { storyId } = input;

    this.logger.info('Getting characters with voice recommendations', { storyId });

    // Load story context (includes script and language)
    const context = await this.storyContext.loadContext(storyId);

    if (!context.story.script) {
      throw new AppError(ErrorCodes.ValidationError, {
        name: 'ScriptNotGenerated'
      });
    }

    const script = context.story.script;
    const language = context.language;

    // Get all available voices for recommendations
    const availableVoices = await this.voiceRegistry.getVoicesByFilter({
      useCase: VoiceUseCase.NarrativeStory
    });

    // Build character list with recommendations
    const characters: CharacterWithVoiceRecommendations[] = [];

    for (const character of script.characters) {
      const voiceDescription = character.voiceDescription ?? character.characterName;

      // Get current voice info if assigned
      let currentVoice: VoiceInfo | undefined;
      if (character.voiceId) {
        const voice = await this.voiceRegistry.getVoice(character.voiceId);
        if (voice) {
          currentVoice = this.mapStoredVoiceToInfo(voice);
        }
      }

      // Get recommended voices
      const recommendedVoices = this.getRecommendedVoices({
        description: voiceDescription,
        language,
        limit: DEFAULT_RECOMMENDATION_LIMIT
      }, availableVoices);

      characters.push({
        characterName: character.characterName,
        voiceDescription,
        currentVoiceId: character.voiceId,
        currentVoice,
        recommendedVoices
      });
    }

    this.logger.info('Characters loaded with recommendations', {
      storyId,
      characterCount: characters.length,
      language
    });

    return {
      characters,
      storyLanguage: language
    };
  }

  /**
   * Update voice assignments for characters
   */
  async updateVoiceAssignments(input: UpdateVoiceAssignmentsInput): Promise<UpdateVoiceAssignmentsResult> {
    const { storyId, voiceAssignments } = input;

    this.logger.info('Updating voice assignments', {
      storyId,
      assignmentCount: voiceAssignments.length
    });

    // Load current story via service (respects scope boundaries)
    const story = await this.storiesService.findById(storyId);
    if (!story) {
      throw new AppError(ErrorCodes.NotFound, { name: 'StoryNotFound' });
    }

    if (!story.script) {
      throw new AppError(ErrorCodes.ValidationError, {
        name: 'ScriptNotGenerated'
      });
    }

    // Build set of valid character names for validation
    const validCharacterNames = new Set(
      story.script.characters.map((c) => c.characterName.toLowerCase())
    );

    // Validate character names exist and voice IDs are valid
    const voiceMap = new Map<string, StoredVoice>();
    for (const assignment of voiceAssignments) {
      // Validate character exists
      if (!validCharacterNames.has(assignment.characterName.toLowerCase())) {
        throw new AppError(ErrorCodes.ValidationError, {
          name: 'CharacterNotFound'
        });
      }

      // Validate voice exists
      const voice = await this.voiceRegistry.getVoice(assignment.voiceId);
      if (!voice) {
        throw new AppError(ErrorCodes.NotFound, {
          name: 'VoiceNotFound'
        });
      }
      voiceMap.set(assignment.voiceId, voice);
    }

    // Create assignment lookup
    const assignmentLookup = new Map(
      voiceAssignments.map((a) => [a.characterName.toLowerCase(), a.voiceId])
    );

    // Update characters with new voice assignments
    const updatedCharacters = story.script.characters.map((character) => {
      const newVoiceId = assignmentLookup.get(character.characterName.toLowerCase());
      if (newVoiceId) {
        return {
          ...character,
          voiceId: newVoiceId
        };
      }
      return character;
    });

    // Update script with new character data
    const updatedScript = {
      ...story.script,
      characters: updatedCharacters
    };

    // Persist updated script via service
    await this.storiesService.updateScript(storyId, updatedScript);

    // Build result with voice names
    const resultCharacters = voiceAssignments.map((assignment) => {
      const voice = voiceMap.get(assignment.voiceId);
      return {
        characterName: assignment.characterName,
        voiceId: assignment.voiceId,
        voiceName: voice?.name ?? 'Unknown'
      };
    });

    this.logger.info('Voice assignments updated', {
      storyId,
      updatedCount: voiceAssignments.length
    });

    return {
      success: true,
      updatedCount: voiceAssignments.length,
      characters: resultCharacters
    };
  }

  /**
   * Get recommended voices for a character description
   */
  private getRecommendedVoices(
    options: GetRecommendedVoicesOptions,
    availableVoices: StoredVoice[]
  ): VoiceRecommendation[] {
    const { description, language, limit = DEFAULT_RECOMMENDATION_LIMIT } = options;

    if (availableVoices.length === 0) {
      return [];
    }

    const lowerDesc = description.toLowerCase();

    // Detect attributes from description
    const detectedGender = this.detectGender(lowerDesc);
    const detectedAge = this.detectAge(lowerDesc);

    // Score each voice
    const scoredVoices = availableVoices.map((voice) => ({
      voice,
      score: this.scoreVoice(voice, language, detectedGender, detectedAge)
    }));

    // Sort by score descending
    scoredVoices.sort((a, b) => b.score - a.score);

    // Return top N recommendations
    return scoredVoices.slice(0, limit).map(({ voice, score }) => ({
      voiceId: voice.voiceId,
      name: voice.name,
      previewUrl: voice.previewUrl,
      gender: voice.gender,
      age: voice.age,
      language: voice.language,
      matchScore: score
    }));
  }

  /**
   * Score a voice based on matching criteria
   */
  private scoreVoice(
    voice: StoredVoice,
    preferredLanguage: Language,
    detectedGender: VoiceGender | null,
    detectedAge: VoiceAge | null
  ): number {
    let score = 0;

    // Language match (most important)
    if (voice.language?.toLowerCase().includes(preferredLanguage.toLowerCase())) {
      score += SCORE_WEIGHTS.language;
    }

    // Gender match
    if (detectedGender) {
      if (voice.gender === detectedGender) {
        score += SCORE_WEIGHTS.gender;
      }
    } else {
      // No gender preference - give partial score
      score += SCORE_WEIGHTS.gender * 0.5;
    }

    // Age match
    if (detectedAge) {
      if (voice.age === detectedAge) {
        score += SCORE_WEIGHTS.age;
      }
    } else {
      // No age preference - give partial score
      score += SCORE_WEIGHTS.age * 0.5;
    }

    return Math.round(score);
  }

  /**
   * Detect gender from description text
   */
  private detectGender(lowerDesc: string): VoiceGender | null {
    const hasFemale = FEMALE_KEYWORDS.some((kw) => lowerDesc.includes(kw));
    const hasMale = MALE_KEYWORDS.some((kw) => lowerDesc.includes(kw));

    if (hasFemale && !hasMale) {
      return VoiceGender.Female;
    }
    if (hasMale && !hasFemale) {
      return VoiceGender.Male;
    }

    return null;
  }

  /**
   * Detect age from description text
   */
  private detectAge(lowerDesc: string): VoiceAge | null {
    const hasYoung = YOUNG_KEYWORDS.some((kw) => lowerDesc.includes(kw));
    const hasOld = OLD_KEYWORDS.some((kw) => lowerDesc.includes(kw));

    if (hasYoung && !hasOld) {
      return VoiceAge.Young;
    }
    if (hasOld && !hasYoung) {
      return VoiceAge.Old;
    }

    return null;
  }

  /**
   * Map StoredVoice to VoiceInfo for API response
   */
  private mapStoredVoiceToInfo(voice: StoredVoice): VoiceInfo {
    return {
      voiceId: voice.voiceId,
      name: voice.name,
      previewUrl: voice.previewUrl,
      gender: voice.gender,
      age: voice.age,
      language: voice.language,
      description: voice.description
    };
  }
}
