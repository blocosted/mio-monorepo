/**
 * Music Strategy Service Tests
 *
 * Tests for the intelligent music cue generation service.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { MusicStrategyService } from '../music-strategy.service';
import type { MusicMood, MusicStrategy } from '../music-strategy.service.types';

describe('MusicStrategyService', () => {
    let service: MusicStrategyService;

    beforeEach(() => {
        service = new MusicStrategyService();
    });

    describe('generateMusicCues (punctual strategy)', () => {
        it('should generate intro, climax, and outro cues', () => {
            const result = service.generateMusicCues({
                totalDuration: 100,
                strategy: 'punctual',
            });

            expect(result.strategy).toBe('punctual');
            expect(result.cues).toHaveLength(3);

            const reasons = result.cues.map(c => c.reason);
            expect(reasons).toContain('intro');
            expect(reasons).toContain('climax');
            expect(reasons).toContain('outro');
        });

        it('should place intro at the start', () => {
            const result = service.generateMusicCues({
                totalDuration: 100,
                strategy: 'punctual',
            });

            const intro = result.cues.find(c => c.reason === 'intro');
            expect(intro?.startTime).toBe(0);
            expect(intro?.duration).toBe(10); // 10% of 100s
            expect(intro?.mood).toBe('mysterious');
        });

        it('should place climax at ~70%', () => {
            const result = service.generateMusicCues({
                totalDuration: 100,
                strategy: 'punctual',
            });

            const climax = result.cues.find(c => c.reason === 'climax');
            expect(climax?.startTime).toBe(70); // 70% of 100s
            expect(climax?.duration).toBe(15); // 15% of 100s
            expect(climax?.mood).toBe('adventurous');
        });

        it('should place outro at ~90%', () => {
            const result = service.generateMusicCues({
                totalDuration: 100,
                strategy: 'punctual',
            });

            const outro = result.cues.find(c => c.reason === 'outro');
            expect(outro?.startTime).toBe(90); // 90% of 100s
            expect(outro?.mood).toBe('calm');
        });

        it('should calculate correct coverage percentage', () => {
            const result = service.generateMusicCues({
                totalDuration: 100,
                strategy: 'punctual',
            });

            // 10% intro + 15% climax + 10% outro = 35%
            expect(result.coveragePercentage).toBe(35);
        });

        it('should use custom story moments for climax position', () => {
            const result = service.generateMusicCues({
                totalDuration: 100,
                strategy: 'punctual',
                storyMoments: [
                    { time: 50, type: 'climax' }, // Override to 50s
                ],
            });

            const climax = result.cues.find(c => c.reason === 'climax');
            expect(climax?.startTime).toBe(50);
        });

        it('should use resolution moment for outro position', () => {
            const result = service.generateMusicCues({
                totalDuration: 100,
                strategy: 'punctual',
                storyMoments: [
                    { time: 85, type: 'resolution' },
                ],
            });

            const outro = result.cues.find(c => c.reason === 'outro');
            expect(outro?.startTime).toBe(85);
        });
    });

    describe('generateMusicCues (minimal strategy)', () => {
        it('should generate only intro cue', () => {
            const result = service.generateMusicCues({
                totalDuration: 100,
                strategy: 'minimal',
            });

            expect(result.strategy).toBe('minimal');
            expect(result.cues).toHaveLength(1);
            expect(result.cues[0]?.reason).toBe('intro');
        });

        it('should limit intro to 10s max or 5%', () => {
            const shortResult = service.generateMusicCues({
                totalDuration: 100,
                strategy: 'minimal',
            });
            expect(shortResult.cues[0]?.duration).toBe(5); // 5% of 100s

            const longResult = service.generateMusicCues({
                totalDuration: 300,
                strategy: 'minimal',
            });
            expect(longResult.cues[0]?.duration).toBe(10); // Max 10s
        });
    });

    describe('generateMusicCues (continuous strategy)', () => {
        it('should generate three cues covering the whole story', () => {
            const result = service.generateMusicCues({
                totalDuration: 120,
                strategy: 'continuous',
            });

            expect(result.strategy).toBe('continuous');
            expect(result.cues).toHaveLength(3);
            expect(result.coveragePercentage).toBe(100);
        });

        it('should divide duration into three equal parts', () => {
            const result = service.generateMusicCues({
                totalDuration: 120,
                strategy: 'continuous',
            });

            expect(result.cues[0]?.startTime).toBe(0);
            expect(result.cues[0]?.duration).toBe(40);

            expect(result.cues[1]?.startTime).toBe(40);
            expect(result.cues[1]?.duration).toBe(40);

            expect(result.cues[2]?.startTime).toBe(80);
            expect(result.cues[2]?.duration).toBe(40);
        });

        it('should use appropriate moods for three-act structure', () => {
            const result = service.generateMusicCues({
                totalDuration: 120,
                strategy: 'continuous',
            });

            expect(result.cues[0]?.mood).toBe('mysterious'); // Act 1
            expect(result.cues[1]?.mood).toBe('adventurous'); // Act 2
            expect(result.cues[2]?.mood).toBe('joyful'); // Act 3
        });
    });

    describe('generateMusicCues (auto strategy selection)', () => {
        it('should default to punctual when no strategy specified', () => {
            const result = service.generateMusicCues({
                totalDuration: 100,
            });

            expect(result.strategy).toBe('punctual');
            expect(result.cues).toHaveLength(3);
        });

        it('should use script segments when provided without forced strategy', () => {
            const result = service.generateMusicCues({
                totalDuration: 100,
                scriptMusicSegments: [
                    { startTime: 0, duration: 20, mood: 'magical' },
                    { startTime: 50, duration: 30, mood: 'tense' },
                ],
            });

            expect(result.strategy).toBe('continuous'); // Script-defined is continuous
            expect(result.cues).toHaveLength(2);
            expect(result.cues[0]?.mood).toBe('magical');
            expect(result.cues[1]?.mood).toBe('tense');
        });
    });

    describe('normalizeMood', () => {
        it('should return exact matches as-is', () => {
            expect(service.normalizeMood('calm')).toBe('calm');
            expect(service.normalizeMood('mysterious')).toBe('mysterious');
            expect(service.normalizeMood('adventurous')).toBe('adventurous');
        });

        it('should normalize aliases', () => {
            expect(service.normalizeMood('happy')).toBe('joyful');
            expect(service.normalizeMood('exciting')).toBe('adventurous');
            expect(service.normalizeMood('scary')).toBe('tense');
            expect(service.normalizeMood('peaceful')).toBe('calm');
        });

        it('should be case-insensitive', () => {
            expect(service.normalizeMood('CALM')).toBe('calm');
            expect(service.normalizeMood('Mysterious')).toBe('mysterious');
        });

        it('should default to calm for unknown moods', () => {
            expect(service.normalizeMood('unknown')).toBe('calm');
            expect(service.normalizeMood('')).toBe('calm');
        });
    });

    describe('convertScriptMusicToCues', () => {
        it('should convert script segments to music cues', () => {
            const segments = [
                { startTime: 0, duration: 20, mood: 'magical' },
                { startTime: 30, duration: 15, mood: 'tense' },
                { startTime: 60, duration: 20, mood: 'calm' },
            ];

            const cues = service.convertScriptMusicToCues(segments, 80);

            expect(cues).toHaveLength(3);
            expect(cues[0]?.mood).toBe('magical');
            expect(cues[0]?.reason).toBe('intro');

            expect(cues[1]?.mood).toBe('tense');
            expect(cues[1]?.reason).toBe('transition');

            expect(cues[2]?.mood).toBe('calm');
            expect(cues[2]?.reason).toBe('outro');
        });

        it('should apply longer fade out to last cue', () => {
            const segments = [
                { startTime: 0, duration: 20, mood: 'calm' },
                { startTime: 30, duration: 20, mood: 'calm' },
            ];

            const cues = service.convertScriptMusicToCues(segments, 50);

            expect(cues[0]?.fadeOut).toBe(1.5); // Middle cue
            expect(cues[1]?.fadeOut).toBe(3.0); // Last cue
        });
    });

    describe('cue properties', () => {
        it('should include fade in/out and volume', () => {
            const result = service.generateMusicCues({
                totalDuration: 100,
                strategy: 'punctual',
            });

            for (const cue of result.cues) {
                expect(cue.fadeIn).toBeGreaterThan(0);
                expect(cue.fadeOut).toBeGreaterThan(0);
                expect(cue.volume).toBeGreaterThan(0);
                expect(cue.volume).toBeLessThanOrEqual(1);
            }
        });

        it('should have appropriate volumes for background music', () => {
            const result = service.generateMusicCues({
                totalDuration: 100,
                strategy: 'punctual',
            });

            // Background music should be subtle (0.1-0.25 range)
            for (const cue of result.cues) {
                expect(cue.volume).toBeLessThanOrEqual(0.25);
                expect(cue.volume).toBeGreaterThanOrEqual(0.1);
            }
        });
    });
});
