/**
 * Timeline Sync Service Tests
 *
 * Tests for the post-TTS timeline synchronization service.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { TimelineSyncService } from '../timeline-sync.service';
import type { StoryScript } from '@mio/shared/models';

describe('TimelineSyncService', () => {
    let service: TimelineSyncService;

    beforeEach(() => {
        service = new TimelineSyncService();
    });

    describe('buildVoiceTimeline', () => {
        it('should build correct timeline with pauses', () => {
            const ttsResults = [
                { segmentId: 'seg-1', actualDurationSeconds: 5.0 },
                { segmentId: 'seg-2', actualDurationSeconds: 3.0 },
                { segmentId: 'seg-3', actualDurationSeconds: 4.0 },
            ];

            const timeline = service.buildVoiceTimeline(ttsResults, 0.5);

            const seg1 = timeline.get('seg-1');
            expect(seg1?.startTime).toBe(0);
            expect(seg1?.endTime).toBe(5.0);
            expect(seg1?.duration).toBe(5.0);

            const seg2 = timeline.get('seg-2');
            expect(seg2?.startTime).toBe(5.5); // 5.0 + 0.5 pause
            expect(seg2?.endTime).toBe(8.5);

            const seg3 = timeline.get('seg-3');
            expect(seg3?.startTime).toBe(9.0); // 8.5 + 0.5 pause
            expect(seg3?.endTime).toBe(13.0);
        });

        it('should handle zero pause duration', () => {
            const ttsResults = [
                { segmentId: 'seg-1', actualDurationSeconds: 5.0 },
                { segmentId: 'seg-2', actualDurationSeconds: 3.0 },
            ];

            const timeline = service.buildVoiceTimeline(ttsResults, 0);

            expect(timeline.get('seg-1')?.startTime).toBe(0);
            expect(timeline.get('seg-1')?.endTime).toBe(5.0);
            expect(timeline.get('seg-2')?.startTime).toBe(5.0);
            expect(timeline.get('seg-2')?.endTime).toBe(8.0);
        });

        it('should handle single segment', () => {
            const ttsResults = [
                { segmentId: 'seg-1', actualDurationSeconds: 10.0 },
            ];

            const timeline = service.buildVoiceTimeline(ttsResults);

            expect(timeline.get('seg-1')?.startTime).toBe(0);
            expect(timeline.get('seg-1')?.endTime).toBe(10.0);
            expect(timeline.size).toBe(1);
        });

        it('should use default pause if not specified', () => {
            const ttsResults = [
                { segmentId: 'seg-1', actualDurationSeconds: 5.0 },
                { segmentId: 'seg-2', actualDurationSeconds: 3.0 },
            ];

            const timeline = service.buildVoiceTimeline(ttsResults);

            // Default pause is 0.5s
            expect(timeline.get('seg-2')?.startTime).toBe(5.5);
        });
    });

    describe('syncTimings', () => {
        const createMockScript = (voiceSegments: Array<{ id: string; startTime: number; duration: number }>): StoryScript => ({
            metadata: {
                title: 'Test Story',
                description: 'A test story',
                language: 'en',
                totalDuration: 60,
                totalWordCount: 100,
                generatedAt: new Date().toISOString(),
            },
            characters: [],
            tracks: [
                {
                    id: 'voice-track',
                    type: 'voice',
                    segments: voiceSegments.map(seg => ({
                        id: seg.id,
                        startTime: seg.startTime,
                        duration: seg.duration,
                        content: { type: 'narration', text: 'Test text' },
                    })),
                },
            ],
        });

        it('should update voice segment durations with actual TTS durations', () => {
            const script = createMockScript([
                { id: 'v1', startTime: 0, duration: 5 },
                { id: 'v2', startTime: 5, duration: 5 },
            ]);

            const ttsResults = [
                { segmentId: 'v1', actualDurationSeconds: 6.0 }, // Actually longer
                { segmentId: 'v2', actualDurationSeconds: 4.0 }, // Actually shorter
            ];

            const synced = service.syncTimings(script, ttsResults);

            const voiceTrack = synced.tracks.find(t => t.type === 'voice');
            expect(voiceTrack?.segments[0]?.duration).toBe(6.0);
            expect(voiceTrack?.segments[1]?.duration).toBe(4.0);
        });

        it('should calculate correct total actual duration', () => {
            const script = createMockScript([
                { id: 'v1', startTime: 0, duration: 10 },
                { id: 'v2', startTime: 10, duration: 10 },
            ]);

            const ttsResults = [
                { segmentId: 'v1', actualDurationSeconds: 12.0 },
                { segmentId: 'v2', actualDurationSeconds: 8.0 },
            ];

            const synced = service.syncTimings(script, ttsResults);

            // 12.0 + 0.5 pause + 8.0 = 20.5
            expect(synced.syncMetadata.actualTotalDuration).toBe(20.5);
        });

        it('should calculate drift percentage', () => {
            const script = createMockScript([
                { id: 'v1', startTime: 0, duration: 10 },
            ]);
            // Override metadata
            script.metadata.totalDuration = 10;

            const ttsResults = [
                { segmentId: 'v1', actualDurationSeconds: 12.0 }, // 20% longer
            ];

            const synced = service.syncTimings(script, ttsResults);

            expect(synced.syncMetadata.originalTotalDuration).toBe(10);
            expect(synced.syncMetadata.actualTotalDuration).toBe(12.0);
            expect(synced.syncMetadata.driftPercentage).toBe(20);
        });

        it('should not mutate original script', () => {
            const script = createMockScript([
                { id: 'v1', startTime: 0, duration: 5 },
            ]);
            const originalDuration = script.tracks[0]?.segments[0]?.duration;

            const ttsResults = [
                { segmentId: 'v1', actualDurationSeconds: 10.0 },
            ];

            service.syncTimings(script, ttsResults);

            expect(script.tracks[0]?.segments[0]?.duration).toBe(originalDuration);
        });

        it('should handle SFX track synchronization', () => {
            const script: StoryScript = {
                metadata: {
                    title: 'Test Story',
                    description: 'A test story',
                    language: 'en',
                    totalDuration: 20,
                    totalWordCount: 100,
                    generatedAt: new Date().toISOString(),
                },
                characters: [],
                tracks: [
                    {
                        id: 'voice-track',
                        type: 'voice',
                        segments: [
                            { id: 'v1', startTime: 0, duration: 10, content: { type: 'narration', text: 'Part 1' } },
                            { id: 'v2', startTime: 10, duration: 10, content: { type: 'narration', text: 'Part 2' } },
                        ],
                    },
                    {
                        id: 'sfx-track',
                        type: 'sfx',
                        segments: [
                            { id: 'sfx1', startTime: 5, duration: 2, content: { type: 'sfx', description: 'Sound 1' } },
                            { id: 'sfx2', startTime: 15, duration: 2, content: { type: 'sfx', description: 'Sound 2' } },
                        ],
                    },
                ],
            };

            const ttsResults = [
                { segmentId: 'v1', actualDurationSeconds: 12.0 }, // v1 now ends at 12
                { segmentId: 'v2', actualDurationSeconds: 8.0 },  // v2 starts at 12.5, ends at 20.5
            ];

            const synced = service.syncTimings(script, ttsResults);

            const sfxTrack = synced.tracks.find(t => t.type === 'sfx');

            // sfx1 was at 5s (50% into v1 which was 10s), now should be at 6s (50% into v1 which is 12s)
            expect(sfxTrack?.segments[0]?.startTime).toBe(6);

            // sfx2 was at 15s (50% into v2), v2 now starts at 12.5s, so sfx2 should be at 12.5 + 4 = 16.5
            expect(sfxTrack?.segments[1]?.startTime).toBe(16.5);
        });
    });
});
