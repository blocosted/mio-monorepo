/**
 * Audio Library Taxonomy Helpers
 *
 * Inference functions for categorizing audio based on text descriptions.
 * Pure functions with no side effects or dependencies.
 */

import type {
    SfxLibraryCategory,
    SfxEnvironment,
    AmbianceEnvironment,
    TimeOfDay,
    WeatherCondition,
    AudioMood,
} from '@mio/shared/types';

/**
 * Extract keywords from text for semantic matching
 */
export function extractKeywords(text: string): string[] {
    const stopWords = new Set([
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
        'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
        'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
        'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
        'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'not',
        'sound', 'sounds', 'effect', 'effects', 'audio', 'background', 'ambient',
    ]);

    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Infer SFX category from text description
 */
export function inferSfxCategory(text: string): SfxLibraryCategory | undefined {
    const lowerText = text.toLowerCase();

    // Ambient indicators
    if (/rain|wind|storm|weather|breeze|rustling|flowing|nature|forest|ocean|sea|stream|river/i.test(lowerText)) {
        return 'ambient';
    }

    // Effects indicators
    if (/footstep|door|knock|click|tap|slam|crash|break|hit|strike|impact|step/i.test(lowerText)) {
        return 'effects';
    }

    // Transitions indicators
    if (/whoosh|swish|swoosh|transition|fade|magic.*appear|disappear|portal|teleport/i.test(lowerText)) {
        return 'transitions';
    }

    // Foley indicators
    if (/cloth|fabric|paper|book|page|eating|drinking|writing|typing/i.test(lowerText)) {
        return 'foley';
    }

    // Creatures indicators
    if (/bird|animal|creature|monster|dragon|wolf|howl|roar|growl|squawk|chirp/i.test(lowerText)) {
        return 'creatures';
    }

    return undefined;
}

/**
 * Infer SFX environment from text description
 */
export function inferSfxEnvironment(text: string): SfxEnvironment | undefined {
    const lowerText = text.toLowerCase();

    if (/forest|tree|leaf|leaves|nature|garden|park|meadow/i.test(lowerText)) {
        return 'nature';
    }
    if (/city|urban|street|traffic|car|bus|train|subway/i.test(lowerText)) {
        return 'urban';
    }
    if (/indoor|room|house|building|kitchen|bathroom|office/i.test(lowerText)) {
        return 'indoor';
    }
    if (/outdoor|outside|field|sky|open|mountain/i.test(lowerText)) {
        return 'outdoor';
    }
    if (/magic|magical|fantasy|enchant|spell|fairy|dragon|castle/i.test(lowerText)) {
        return 'fantasy';
    }

    return undefined;
}

/**
 * Infer ambiance environment from description
 */
export function inferAmbianceEnvironment(description: string): AmbianceEnvironment | undefined {
    const lowerDesc = description.toLowerCase();

    if (/forest|tree|woods|woodland|jungle/i.test(lowerDesc)) return 'forest';
    if (/ocean|sea|beach|wave|coast|shore/i.test(lowerDesc)) return 'ocean';
    if (/city|urban|street|traffic|downtown/i.test(lowerDesc)) return 'city';
    if (/village|town|market|shop/i.test(lowerDesc)) return 'village';
    if (/castle|palace|throne|dungeon|tower/i.test(lowerDesc)) return 'castle';
    if (/cave|cavern|underground|grotto/i.test(lowerDesc)) return 'cave';
    if (/mountain|peak|cliff|summit|alpine/i.test(lowerDesc)) return 'mountain';
    if (/meadow|field|grassland|prairie/i.test(lowerDesc)) return 'meadow';
    if (/space|star|galaxy|cosmic|nebula/i.test(lowerDesc)) return 'space';
    if (/underwater|ocean floor|deep sea|coral/i.test(lowerDesc)) return 'underwater';

    return undefined;
}

/**
 * Infer time of day from description
 */
export function inferTimeOfDay(description: string): TimeOfDay | undefined {
    const lowerDesc = description.toLowerCase();

    if (/night|midnight|nocturnal|starry|moonlit/i.test(lowerDesc)) return 'night';
    if (/dawn|sunrise|early morning|first light/i.test(lowerDesc)) return 'dawn';
    if (/dusk|sunset|evening|twilight/i.test(lowerDesc)) return 'dusk';
    if (/day|sunny|afternoon|morning|noon/i.test(lowerDesc)) return 'day';

    return 'any';
}

/**
 * Infer weather from description
 */
export function inferWeather(description: string): WeatherCondition | undefined {
    const lowerDesc = description.toLowerCase();

    if (/rain|rainy|drizzle|shower/i.test(lowerDesc)) return 'rainy';
    if (/storm|thunder|lightning|tempest/i.test(lowerDesc)) return 'stormy';
    if (/snow|snowy|blizzard|frost/i.test(lowerDesc)) return 'snowy';
    if (/fog|foggy|mist|misty|hazy/i.test(lowerDesc)) return 'foggy';
    if (/clear|sunny|bright|cloudless/i.test(lowerDesc)) return 'clear';

    return 'any';
}

/**
 * Infer mood from description
 */
export function inferMood(description: string): AudioMood | undefined {
    const lowerDesc = description.toLowerCase();

    if (/peaceful|calm|serene|tranquil|relaxing/i.test(lowerDesc)) return 'peaceful';
    if (/mysterious|eerie|enigmatic|strange|curious/i.test(lowerDesc)) return 'mysterious';
    if (/tense|suspense|danger|threat|scary|dark/i.test(lowerDesc)) return 'tense';
    if (/magic|magical|enchant|wonder|fairy/i.test(lowerDesc)) return 'magical';
    if (/adventure|epic|heroic|exciting|action/i.test(lowerDesc)) return 'adventurous';

    return undefined;
}

/**
 * Select random item from array
 */
export function selectRandom<T>(items: T[]): T | undefined {
    if (items.length === 0) return undefined;
    const index = Math.floor(Math.random() * items.length);
    return items[index];
}
