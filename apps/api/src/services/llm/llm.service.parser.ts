/**
 * LLM Response Parser
 *
 * Parses and validates JSON responses from the LLM.
 */

import { AppError, ErrorCodes } from '@mio/shared';
import { Ambiance, Tone } from '@mio/shared/types';

import type { EnrichedConcept } from '../stories/stories.service.types';

/**
 * Valid tone values
 */
const VALID_TONES = new Set<string>(Object.values(Tone));

/**
 * Valid ambiance values
 */
const VALID_AMBIANCES = new Set<string>(Object.values(Ambiance));

/**
 * Clean JSON string by removing markdown code blocks
 */
function cleanJsonString(jsonString: string): string {
  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  let cleaned = jsonString.trim();

  // Check for markdown code block
  if (cleaned.startsWith('```')) {
    // Remove opening ```json or ```
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '');
    // Remove closing ```
    cleaned = cleaned.replace(/\n?```\s*$/, '');
  }

  return cleaned.trim();
}

/**
 * Parse and validate an enriched concept from LLM response
 */
export function parseEnrichedConcept(jsonString: string): EnrichedConcept {
  let parsed: unknown;

  try {
    const cleaned = cleanJsonString(jsonString);
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AppError(ErrorCodes.ValidationError, {
      name: 'LLMInvalidJSON'
    });
  }

  if (!isObject(parsed)) {
    throw new AppError(ErrorCodes.ValidationError, {
      name: 'LLMResponseNotObject'
    });
  }

  // Validate required fields
  const title = validateString(parsed, 'title');
  const mainCharacter = validateMainCharacter(parsed);
  const setting = validateSetting(parsed);
  const tone = validateTone(parsed);
  const themes = validateThemes(parsed);

  // Optional fields
  const secondaryCharacters = validateSecondaryCharacters(parsed);
  const synopsis = validateOptionalString(parsed, 'synopsis');

  return {
    title,
    mainCharacter,
    secondaryCharacters,
    setting,
    tone,
    themes,
    synopsis
  };
}

/**
 * Type guard for object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate a required string field
 */
function validateString(obj: Record<string, unknown>, field: string): string {
  const value = obj[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(ErrorCodes.ValidationError, {
      name: `LLMMissingField_${field}`
    });
  }
  return value.trim();
}

/**
 * Validate an optional string field
 */
function validateOptionalString(obj: Record<string, unknown>, field: string): string | undefined {
  const value = obj[field];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  return value.trim() || undefined;
}

/**
 * Validate main character
 */
function validateMainCharacter(obj: Record<string, unknown>): EnrichedConcept['mainCharacter'] {
  const char = obj['mainCharacter'];
  if (!isObject(char)) {
    throw new AppError(ErrorCodes.ValidationError, {
      name: 'LLMMissingField_mainCharacter'
    });
  }

  return {
    name: validateString(char, 'name'),
    description: validateString(char, 'description'),
    voiceType: validateOptionalString(char, 'voiceType')
  };
}

/**
 * Validate secondary characters (optional array)
 */
function validateSecondaryCharacters(obj: Record<string, unknown>): EnrichedConcept['secondaryCharacters'] {
  const chars = obj['secondaryCharacters'];
  if (!chars || !Array.isArray(chars)) {
    return undefined;
  }

  const result: NonNullable<EnrichedConcept['secondaryCharacters']> = [];

  for (const char of chars) {
    if (!isObject(char)) continue;

    const name = validateOptionalString(char, 'name');
    const description = validateOptionalString(char, 'description');

    if (name && description) {
      result.push({
        name,
        description,
        voiceType: validateOptionalString(char, 'voiceType')
      });
    }
  }

  return result.length > 0 ? result : undefined;
}

/**
 * Validate setting
 */
function validateSetting(obj: Record<string, unknown>): EnrichedConcept['setting'] {
  const setting = obj['setting'];
  if (!isObject(setting)) {
    throw new AppError(ErrorCodes.ValidationError, {
      name: 'LLMMissingField_setting'
    });
  }

  const ambianceValue = validateString(setting, 'ambiance');
  const ambiance = VALID_AMBIANCES.has(ambianceValue) ? (ambianceValue as Ambiance) : Ambiance.Forest; // Default fallback

  return {
    location: validateString(setting, 'location'),
    era: validateString(setting, 'era'),
    ambiance
  };
}

/**
 * Validate tone
 */
function validateTone(obj: Record<string, unknown>): Tone {
  const toneValue = validateString(obj, 'tone');
  if (!VALID_TONES.has(toneValue)) {
    // Default to adventurous if invalid
    return Tone.Adventurous;
  }
  return toneValue as Tone;
}

/**
 * Validate themes array
 */
function validateThemes(obj: Record<string, unknown>): string[] {
  const themes = obj['themes'];
  if (!Array.isArray(themes)) {
    throw new AppError(ErrorCodes.ValidationError, {
      name: 'LLMMissingField_themes'
    });
  }

  const result: string[] = [];
  for (const theme of themes) {
    if (typeof theme === 'string' && theme.trim()) {
      result.push(theme.trim());
    }
  }

  if (result.length === 0) {
    throw new AppError(ErrorCodes.ValidationError, {
      name: 'LLMEmptyThemes'
    });
  }

  return result;
}
