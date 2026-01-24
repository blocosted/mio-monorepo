/**
 * Voice Assignment Service Implementation
 *
 * Centralizes the logic for assigning voices to story characters.
 * Extracts and improves the selectVoiceForCharacter logic from workflow steps.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import { type CharacterVoiceMap, type Language, type StoryScript, VoiceAge, VoiceGender, VoiceUseCase } from '@mio/shared/types';

import type {
  CharacterVoiceAssignment,
  IVoiceAssignmentService,
  VoiceAssignmentInput,
  VoiceAssignmentResult,
  VoiceCandidate,
  VoiceSelection
} from './voice-assignment.service.types';
import type { IVoiceRegistryService } from './voice-registry.service.types';
import { IocService } from '../../ioc/ioc.types';
import { AbstractService } from '../service.abstract';

/**
 * Gender detection keywords (English and French)
 */
const FEMALE_KEYWORDS = [
  // English
  'female',
  'woman',
  'girl',
  'feminine',
  'mother',
  'princess',
  'queen',
  'grandmother',
  'sister',
  'daughter',
  'aunt',
  'lady',
  'miss',
  'mrs',
  // French
  'femme',
  'fille',
  'feminine',
  'maman',
  'mere',
  'princesse',
  'reine',
  'grand-mere',
  'soeur',
  'tante',
  'madame',
  'mademoiselle'
];

const MALE_KEYWORDS = [
  // English
  'male',
  'man',
  'boy',
  'masculine',
  'father',
  'prince',
  'king',
  'grandfather',
  'brother',
  'son',
  'uncle',
  'gentleman',
  'mister',
  'mr',
  // French
  'homme',
  'garcon',
  'masculin',
  'papa',
  'pere',
  'prince',
  'roi',
  'grand-pere',
  'frere',
  'oncle',
  'monsieur'
];

/**
 * Age detection keywords
 */
const YOUNG_KEYWORDS = [
  // English
  'child',
  'young',
  'kid',
  'little',
  'small',
  'boy',
  'girl',
  'baby',
  // French
  'enfant',
  'jeune',
  'petit',
  'petite',
  'garcon',
  'fille',
  'bebe'
];

const OLD_KEYWORDS = [
  // English
  'old',
  'elder',
  'wise',
  'ancient',
  'grandmother',
  'grandfather',
  // French
  'ancien',
  'vieux',
  'vieille',
  'sage',
  'grand-mere',
  'grand-pere'
];

/**
 * Voice Assignment Service
 *
 * Provides centralized voice selection logic for story characters.
 * Uses the voice registry to access available voices.
 */
@injectable()
export class VoiceAssignmentService extends AbstractService implements IVoiceAssignmentService {
  constructor(@inject(IocService.VOICE_REGISTRY) private readonly voiceRegistry: IVoiceRegistryService) {
    super();
  }

  /**
   * Assign voices to all characters in a script
   */
  async assignVoices(input: VoiceAssignmentInput): Promise<VoiceAssignmentResult> {
    const { script, language } = input;

    this.logger.info('Assigning voices to characters', {
      characterCount: script.characters.length,
      language
    });

    // Get available voices from registry
    const availableVoices = await this.voiceRegistry.getVoicesByFilter({
      useCase: VoiceUseCase.NarrativeStory
    });

    if (availableVoices.length === 0) {
      this.logger.error('No voices found in database. Run voice sync first.');
      throw new Error('No voices available. Please sync voices from ElevenLabs.');
    }

    // Map stored voices to voice candidates
    const voiceCandidates: VoiceCandidate[] = availableVoices.map((v) => ({
      voiceId: v.voiceId,
      name: v.name,
      gender: v.gender,
      age: v.age,
      language: v.language
    }));

    // Assign voices to each character
    const assignments: CharacterVoiceAssignment[] = [];
    const updatedCharacters: CharacterVoiceMap[] = [];

    for (const character of script.characters) {
      // Skip if already has a voiceId
      if (character.voiceId) {
        this.logger.debug('Character already has voice', {
          characterName: character.characterName,
          voiceId: character.voiceId
        });
        updatedCharacters.push(character);
        continue;
      }

      const description = character.voiceDescription ?? character.characterName;
      const selection = this.selectVoiceForCharacter(description, voiceCandidates, language);

      this.logger.info('Voice assigned to character', {
        characterName: character.characterName,
        voiceDescription: character.voiceDescription,
        assignedVoiceId: selection.voiceId,
        matchedGender: selection.matchedGender,
        matchedAge: selection.matchedAge,
        confidence: selection.confidence
      });

      assignments.push({
        characterName: character.characterName,
        voiceDescription: description,
        selection
      });

      updatedCharacters.push({
        ...character,
        voiceId: selection.voiceId
      });
    }

    // Build updated script with voice assignments
    const updatedScript: StoryScript = {
      ...script,
      characters: updatedCharacters
    };

    return {
      script: updatedScript,
      assignments
    };
  }

  /**
   * Select the best voice for a character based on description
   *
   * Selection priority:
   * 1. Language match
   * 2. Gender match
   * 3. Age match
   */
  selectVoiceForCharacter(description: string, availableVoices: VoiceCandidate[], preferredLanguage: Language): VoiceSelection {
    const lowerDesc = description.toLowerCase();

    // Detect target attributes from description
    const targetGender = this.detectGender(lowerDesc);
    const targetAge = this.detectAge(lowerDesc);

    // Start with all voices
    let candidates = [...availableVoices];
    let confidence: 'high' | 'medium' | 'low' = 'low';

    // Filter by language
    const languageMatches = candidates.filter((v) => v.language?.toLowerCase().includes(preferredLanguage.toLowerCase()));
    if (languageMatches.length > 0) {
      candidates = languageMatches;
      confidence = 'medium';
    }

    // Filter by gender if detected
    let matchedGender: string | null = null;
    if (targetGender) {
      const genderMatches = candidates.filter((v) => v.gender === targetGender);
      if (genderMatches.length > 0) {
        candidates = genderMatches;
        matchedGender = targetGender;
        confidence = 'medium';
      }
    }

    // Filter by age if detected
    let matchedAge: string | null = null;
    if (targetAge) {
      const ageMatches = candidates.filter((v) => v.age === targetAge);
      if (ageMatches.length > 0) {
        candidates = ageMatches;
        matchedAge = targetAge;
        confidence = 'high';
      }
    }

    // If we matched both gender and age, confidence is high
    if (matchedGender && matchedAge) {
      confidence = 'high';
    } else if (matchedGender || matchedAge) {
      confidence = 'medium';
    }

    // Select first available candidate (or fallback to first voice)
    const selected = candidates[0] ?? availableVoices[0];
    if (!selected) {
      throw new Error('No voice available for assignment');
    }

    return {
      voiceId: selected.voiceId,
      matchedGender,
      matchedAge,
      confidence
    };
  }

  /**
   * Detect gender from description text
   */
  private detectGender(lowerDesc: string): string | null {
    const hasFemale = FEMALE_KEYWORDS.some((kw) => lowerDesc.includes(kw));
    const hasMale = MALE_KEYWORDS.some((kw) => lowerDesc.includes(kw));

    if (hasFemale && !hasMale) {
      return VoiceGender.Female;
    }
    if (hasMale && !hasFemale) {
      return VoiceGender.Male;
    }

    // If both or neither, return null (no preference)
    return null;
  }

  /**
   * Detect age from description text
   */
  private detectAge(lowerDesc: string): string | null {
    const hasYoung = YOUNG_KEYWORDS.some((kw) => lowerDesc.includes(kw));
    const hasOld = OLD_KEYWORDS.some((kw) => lowerDesc.includes(kw));

    if (hasYoung && !hasOld) {
      return VoiceAge.Young;
    }
    if (hasOld && !hasYoung) {
      return VoiceAge.Old;
    }

    // Default to middle_aged if neither young nor old
    return null;
  }
}
