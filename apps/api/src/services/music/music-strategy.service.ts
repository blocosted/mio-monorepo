/**
 * Music Strategy Service
 *
 * Generates intelligent music cues based on story structure.
 * Default strategy: punctual music at key moments (intro, climax, outro).
 */

import type { Logger } from '@mio/shared/server/logger';

import type {
    IMusicStrategyService,
    MusicStrategyInput,
    MusicStrategyOutput,
    MusicCue,
    MusicMood,
    PunctualStrategyConfig,
} from './music-strategy.service.types';

/**
 * Default configuration for punctual music strategy
 *
 * This places music at three key moments:
 * - Intro: Sets the initial mood (mysterious, intriguing)
 * - Climax: Heightens tension/excitement around 70% of the story
 * - Outro: Resolves with calm, satisfying conclusion
 */
const DEFAULT_PUNCTUAL_CONFIG: PunctualStrategyConfig = {
    intro: {
        durationRatio: 0.10, // 10% of story for intro music
        mood: 'mysterious',
        fadeIn: 1.0,
        fadeOut: 2.0,
        volume: 0.15,
    },
    climax: {
        positionRatio: 0.70, // Climax around 70% of story
        durationRatio: 0.15, // 15% of story for climax music
        mood: 'adventurous',
        fadeIn: 1.5,
        fadeOut: 1.5,
        volume: 0.20,
    },
    outro: {
        positionRatio: 0.90, // Outro starts at 90%
        durationRatio: 0.10, // 10% of story for outro
        mood: 'calm',
        fadeIn: 1.0,
        fadeOut: 3.0,
        volume: 0.12,
    },
};

/**
 * Mood normalization mapping
 */
const MOOD_MAP: Record<string, MusicMood> = {
    // Direct mappings
    mysterious: 'mysterious',
    adventurous: 'adventurous',
    calm: 'calm',
    tense: 'tense',
    joyful: 'joyful',
    sad: 'sad',
    magical: 'magical',
    serene: 'serene',
    // Aliases
    happy: 'joyful',
    exciting: 'adventurous',
    scary: 'tense',
    peaceful: 'calm',
    wonder: 'magical',
    suspense: 'tense',
    gentle: 'serene',
    dramatic: 'adventurous',
    melancholic: 'sad',
    whimsical: 'magical',
    triumphant: 'joyful',
};

/**
 * Music Strategy Service Implementation
 *
 * Designed to be used standalone (without IoC) in CLI scripts.
 */
export class MusicStrategyService implements IMusicStrategyService {
    private readonly config: PunctualStrategyConfig;

    constructor(
        private readonly logger?: Logger,
        config?: Partial<PunctualStrategyConfig>,
    ) {
        this.config = {
            ...DEFAULT_PUNCTUAL_CONFIG,
            ...config,
        };
    }

    /**
     * Generate music cues based on story structure
     */
    generateMusicCues(input: MusicStrategyInput): MusicStrategyOutput {
        const { totalDuration, scriptMusicSegments, strategy } = input;

        // If script has music segments and no forced strategy, use them
        if (scriptMusicSegments && scriptMusicSegments.length > 0 && !strategy) {
            return this.generateFromScriptSegments(scriptMusicSegments, totalDuration);
        }

        // Use specified strategy or default to punctual
        const selectedStrategy = strategy ?? 'punctual';

        switch (selectedStrategy) {
            case 'minimal':
                return this.generateMinimalCues(totalDuration);
            case 'continuous':
                return this.generateContinuousCues(totalDuration, scriptMusicSegments);
            case 'punctual':
            default:
                return this.generatePunctualCues(totalDuration, input.storyMoments);
        }
    }

    /**
     * Generate punctual cues (intro, climax, outro)
     */
    private generatePunctualCues(
        totalDuration: number,
        storyMoments?: MusicStrategyInput['storyMoments'],
    ): MusicStrategyOutput {
        const cues: MusicCue[] = [];

        // Intro music (start of story)
        const introDuration = totalDuration * this.config.intro.durationRatio;
        cues.push({
            startTime: 0,
            duration: introDuration,
            mood: this.config.intro.mood,
            fadeIn: this.config.intro.fadeIn,
            fadeOut: this.config.intro.fadeOut,
            volume: this.config.intro.volume,
            reason: 'intro',
        });

        // Climax music - use story moment if provided, otherwise default position
        const climaxPosition = storyMoments?.find(m => m.type === 'climax')?.time
            ?? (totalDuration * this.config.climax.positionRatio);
        const climaxDuration = totalDuration * this.config.climax.durationRatio;
        cues.push({
            startTime: climaxPosition,
            duration: climaxDuration,
            mood: this.config.climax.mood,
            fadeIn: this.config.climax.fadeIn,
            fadeOut: this.config.climax.fadeOut,
            volume: this.config.climax.volume,
            reason: 'climax',
        });

        // Outro music (end of story)
        const outroStart = storyMoments?.find(m => m.type === 'resolution')?.time
            ?? (totalDuration * this.config.outro.positionRatio);
        const outroDuration = Math.min(
            totalDuration * this.config.outro.durationRatio,
            totalDuration - outroStart,
        );
        cues.push({
            startTime: outroStart,
            duration: outroDuration,
            mood: this.config.outro.mood,
            fadeIn: this.config.outro.fadeIn,
            fadeOut: this.config.outro.fadeOut,
            volume: this.config.outro.volume,
            reason: 'outro',
        });

        const totalMusicDuration = cues.reduce((sum, cue) => sum + cue.duration, 0);

        this.logger?.info('Generated punctual music cues', {
            totalDuration,
            cueCount: cues.length,
            totalMusicDuration,
            coveragePercentage: Math.round((totalMusicDuration / totalDuration) * 100),
        });

        return {
            cues,
            strategy: 'punctual',
            totalMusicDuration,
            coveragePercentage: Math.round((totalMusicDuration / totalDuration) * 100),
        };
    }

    /**
     * Generate cues from script music segments
     */
    private generateFromScriptSegments(
        segments: Array<{ startTime: number; duration: number; mood: string }>,
        totalDuration: number,
    ): MusicStrategyOutput {
        const cues = this.convertScriptMusicToCues(segments, totalDuration);
        const totalMusicDuration = cues.reduce((sum, cue) => sum + cue.duration, 0);

        return {
            cues,
            strategy: 'continuous', // Script-defined is usually continuous
            totalMusicDuration,
            coveragePercentage: Math.round((totalMusicDuration / totalDuration) * 100),
        };
    }

    /**
     * Generate minimal cues (only intro)
     */
    private generateMinimalCues(totalDuration: number): MusicStrategyOutput {
        const introDuration = Math.min(10, totalDuration * 0.05); // Max 10s or 5%

        const cues: MusicCue[] = [{
            startTime: 0,
            duration: introDuration,
            mood: 'mysterious',
            fadeIn: 1.0,
            fadeOut: 2.0,
            volume: 0.10,
            reason: 'intro',
        }];

        return {
            cues,
            strategy: 'minimal',
            totalMusicDuration: introDuration,
            coveragePercentage: Math.round((introDuration / totalDuration) * 100),
        };
    }

    /**
     * Generate continuous cues (music throughout)
     */
    private generateContinuousCues(
        totalDuration: number,
        existingSegments?: Array<{ startTime: number; duration: number; mood: string }>,
    ): MusicStrategyOutput {
        // If we have existing segments, convert them
        if (existingSegments && existingSegments.length > 0) {
            return this.generateFromScriptSegments(existingSegments, totalDuration);
        }

        // Otherwise, create continuous music with mood changes
        const cues: MusicCue[] = [];
        const sectionDuration = totalDuration / 3;

        // Act 1: Mysterious/Introduction
        cues.push({
            startTime: 0,
            duration: sectionDuration,
            mood: 'mysterious',
            fadeIn: 1.0,
            fadeOut: 1.0,
            volume: 0.12,
            reason: 'intro',
        });

        // Act 2: Adventurous/Development
        cues.push({
            startTime: sectionDuration,
            duration: sectionDuration,
            mood: 'adventurous',
            fadeIn: 1.0,
            fadeOut: 1.0,
            volume: 0.15,
            reason: 'transition',
        });

        // Act 3: Resolution
        cues.push({
            startTime: sectionDuration * 2,
            duration: sectionDuration,
            mood: 'joyful',
            fadeIn: 1.0,
            fadeOut: 2.0,
            volume: 0.12,
            reason: 'outro',
        });

        const totalMusicDuration = cues.reduce((sum, cue) => sum + cue.duration, 0);

        return {
            cues,
            strategy: 'continuous',
            totalMusicDuration,
            coveragePercentage: Math.round((totalMusicDuration / totalDuration) * 100),
        };
    }

    /**
     * Convert script music segments to standardized cues
     */
    convertScriptMusicToCues(
        segments: Array<{ startTime: number; duration: number; mood: string }>,
        totalDuration: number,
    ): MusicCue[] {
        return segments.map((seg, index) => ({
            startTime: seg.startTime,
            duration: seg.duration,
            mood: this.normalizeMood(seg.mood),
            fadeIn: 1.0,
            fadeOut: index === segments.length - 1 ? 3.0 : 1.5,
            volume: 0.15,
            reason: index === 0
                ? 'intro'
                : index === segments.length - 1
                    ? 'outro'
                    : 'transition',
        }));
    }

    /**
     * Normalize a mood string to MusicMood
     */
    normalizeMood(mood: string): MusicMood {
        const normalized = MOOD_MAP[mood.toLowerCase()];
        return normalized ?? 'calm';
    }
}
