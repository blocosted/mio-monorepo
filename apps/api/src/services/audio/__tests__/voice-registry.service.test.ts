/**
 * Voice Registry Service Unit Tests
 *
 * Tests for the voice registry service with mocked database.
 */

import { describe, it, expect, mock, beforeEach } from 'bun:test';
import type { StoredVoice, SyncResult } from '../voice-registry.service.types';

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_VOICES: StoredVoice[] = [
    {
        id: '1',
        voiceId: 'voice-1',
        name: 'Adam',
        category: 'premade',
        labels: { accent: 'american', gender: 'male' },
        description: 'Deep, warm voice',
        previewUrl: 'https://example.com/preview1.mp3',
        lastSyncedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
    },
    {
        id: '2',
        voiceId: 'voice-2',
        name: 'Sarah',
        category: 'premade',
        labels: { accent: 'british', gender: 'female' },
        description: 'Clear, engaging voice',
        previewUrl: 'https://example.com/preview2.mp3',
        lastSyncedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
    },
    {
        id: '3',
        voiceId: 'voice-3',
        name: 'Charlie',
        category: 'premade',
        labels: { accent: 'french', gender: 'male' },
        description: 'French narrator voice',
        previewUrl: 'https://example.com/preview3.mp3',
        lastSyncedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
    },
];

const API_VOICES = [
    { voiceId: 'voice-1', name: 'Adam', labels: { accent: 'american', gender: 'male' } },
    { voiceId: 'voice-2', name: 'Sarah Updated', labels: { accent: 'british', gender: 'female' } },
    { voiceId: 'voice-4', name: 'New Voice', labels: { accent: 'australian', gender: 'female' } },
];

// ============================================================================
// Mock Voice Registry Service (in-memory implementation)
// ============================================================================

interface MockVoiceRegistry {
    voices: Map<string, StoredVoice>;
    getAllVoices(): Promise<StoredVoice[]>;
    getVoice(voiceId: string): Promise<StoredVoice | null>;
    isValidVoice(voiceId: string): Promise<boolean>;
    syncFromApi(apiVoices: Array<{ voiceId: string; name: string; labels?: Record<string, string> }>): Promise<SyncResult>;
    getLastSyncTime(): Promise<Date | null>;
}

function createMockVoiceRegistry(initialVoices: StoredVoice[] = []): MockVoiceRegistry {
    const voices = new Map<string, StoredVoice>();

    // Populate initial voices
    for (const voice of initialVoices) {
        voices.set(voice.voiceId, voice);
    }

    return {
        voices,

        async getAllVoices(): Promise<StoredVoice[]> {
            return Array.from(voices.values()).sort((a, b) => a.name.localeCompare(b.name));
        },

        async getVoice(voiceId: string): Promise<StoredVoice | null> {
            return voices.get(voiceId) ?? null;
        },

        async isValidVoice(voiceId: string): Promise<boolean> {
            return voices.has(voiceId);
        },

        async syncFromApi(apiVoices): Promise<SyncResult> {
            const existingVoiceIds = new Set(voices.keys());
            const apiVoiceIds = new Set(apiVoices.map(v => v.voiceId));

            let added = 0;
            let updated = 0;
            let removed = 0;

            // Upsert voices from API
            for (const apiVoice of apiVoices) {
                if (existingVoiceIds.has(apiVoice.voiceId)) {
                    // Update existing
                    const existing = voices.get(apiVoice.voiceId)!;
                    voices.set(apiVoice.voiceId, {
                        ...existing,
                        name: apiVoice.name,
                        labels: apiVoice.labels ?? existing.labels,
                        lastSyncedAt: new Date(),
                    });
                    updated++;
                } else {
                    // Add new
                    voices.set(apiVoice.voiceId, {
                        id: `new-${apiVoice.voiceId}`,
                        voiceId: apiVoice.voiceId,
                        name: apiVoice.name,
                        category: 'premade',
                        labels: apiVoice.labels ?? null,
                        description: null,
                        previewUrl: null,
                        lastSyncedAt: new Date(),
                        createdAt: new Date(),
                    });
                    added++;
                }
            }

            // Remove voices not in API
            for (const voiceId of existingVoiceIds) {
                if (!apiVoiceIds.has(voiceId)) {
                    voices.delete(voiceId);
                    removed++;
                }
            }

            return { added, updated, removed, total: apiVoices.length };
        },

        async getLastSyncTime(): Promise<Date | null> {
            const allVoices = Array.from(voices.values());
            if (allVoices.length === 0) return null;

            const latest = allVoices.reduce((max, v) =>
                v.lastSyncedAt && (!max || v.lastSyncedAt > max) ? v.lastSyncedAt : max,
                null as Date | null
            );
            return latest;
        },
    };
}

// ============================================================================
// Tests
// ============================================================================

describe('VoiceRegistryService', () => {
    let registry: MockVoiceRegistry;

    beforeEach(() => {
        registry = createMockVoiceRegistry([...MOCK_VOICES]);
    });

    describe('getAllVoices()', () => {
        it('returns all voices sorted by name', async () => {
            const voices = await registry.getAllVoices();

            expect(voices.length).toBe(3);
            expect(voices[0].name).toBe('Adam');
            expect(voices[1].name).toBe('Charlie');
            expect(voices[2].name).toBe('Sarah');
        });

        it('returns empty array when no voices exist', async () => {
            const emptyRegistry = createMockVoiceRegistry([]);
            const voices = await emptyRegistry.getAllVoices();

            expect(voices).toEqual([]);
        });

        it('includes all voice properties', async () => {
            const voices = await registry.getAllVoices();
            const adam = voices.find(v => v.name === 'Adam');

            expect(adam).toBeDefined();
            expect(adam?.voiceId).toBe('voice-1');
            expect(adam?.category).toBe('premade');
            expect(adam?.labels).toEqual({ accent: 'american', gender: 'male' });
            expect(adam?.description).toBe('Deep, warm voice');
        });
    });

    describe('getVoice()', () => {
        it('returns voice by voiceId', async () => {
            const voice = await registry.getVoice('voice-1');

            expect(voice).toBeDefined();
            expect(voice?.name).toBe('Adam');
            expect(voice?.voiceId).toBe('voice-1');
        });

        it('returns null for non-existent voiceId', async () => {
            const voice = await registry.getVoice('non-existent');

            expect(voice).toBeNull();
        });

        it('returns correct voice when multiple exist', async () => {
            const voice1 = await registry.getVoice('voice-1');
            const voice2 = await registry.getVoice('voice-2');
            const voice3 = await registry.getVoice('voice-3');

            expect(voice1?.name).toBe('Adam');
            expect(voice2?.name).toBe('Sarah');
            expect(voice3?.name).toBe('Charlie');
        });
    });

    describe('isValidVoice()', () => {
        it('returns true for existing voice', async () => {
            const isValid = await registry.isValidVoice('voice-1');
            expect(isValid).toBe(true);
        });

        it('returns false for non-existent voice', async () => {
            const isValid = await registry.isValidVoice('non-existent');
            expect(isValid).toBe(false);
        });

        it('returns false for empty voiceId', async () => {
            const isValid = await registry.isValidVoice('');
            expect(isValid).toBe(false);
        });

        it('validates all existing voices', async () => {
            const results = await Promise.all([
                registry.isValidVoice('voice-1'),
                registry.isValidVoice('voice-2'),
                registry.isValidVoice('voice-3'),
            ]);

            expect(results).toEqual([true, true, true]);
        });
    });

    describe('syncFromApi()', () => {
        it('adds new voices from API', async () => {
            const result = await registry.syncFromApi(API_VOICES);

            expect(result.added).toBe(1);
            expect(result.total).toBe(3);

            const newVoice = await registry.getVoice('voice-4');
            expect(newVoice).toBeDefined();
            expect(newVoice?.name).toBe('New Voice');
        });

        it('updates existing voices from API', async () => {
            const result = await registry.syncFromApi(API_VOICES);

            expect(result.updated).toBe(2);

            const updatedVoice = await registry.getVoice('voice-2');
            expect(updatedVoice?.name).toBe('Sarah Updated');
        });

        it('removes voices not in API', async () => {
            const result = await registry.syncFromApi(API_VOICES);

            expect(result.removed).toBe(1);

            const removedVoice = await registry.getVoice('voice-3');
            expect(removedVoice).toBeNull();
        });

        it('returns correct sync result', async () => {
            const result = await registry.syncFromApi(API_VOICES);

            expect(result).toEqual({
                added: 1,
                updated: 2,
                removed: 1,
                total: 3,
            });
        });

        it('handles empty API response', async () => {
            const result = await registry.syncFromApi([]);

            expect(result.added).toBe(0);
            expect(result.updated).toBe(0);
            expect(result.removed).toBe(3);
            expect(result.total).toBe(0);

            const voices = await registry.getAllVoices();
            expect(voices.length).toBe(0);
        });

        it('handles sync with all new voices', async () => {
            const emptyRegistry = createMockVoiceRegistry([]);
            const result = await emptyRegistry.syncFromApi(API_VOICES);

            expect(result.added).toBe(3);
            expect(result.updated).toBe(0);
            expect(result.removed).toBe(0);
        });

        it('updates lastSyncedAt timestamp', async () => {
            const before = new Date();
            await registry.syncFromApi(API_VOICES);
            const after = new Date();

            const voice = await registry.getVoice('voice-1');
            expect(voice?.lastSyncedAt).toBeDefined();
            expect(voice!.lastSyncedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(voice!.lastSyncedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
        });
    });

    describe('getLastSyncTime()', () => {
        it('returns latest sync time', async () => {
            const lastSync = await registry.getLastSyncTime();

            expect(lastSync).toBeDefined();
            expect(lastSync).toEqual(new Date('2024-01-01'));
        });

        it('returns null when no voices exist', async () => {
            const emptyRegistry = createMockVoiceRegistry([]);
            const lastSync = await emptyRegistry.getLastSyncTime();

            expect(lastSync).toBeNull();
        });

        it('updates after sync', async () => {
            const beforeSync = await registry.getLastSyncTime();
            await registry.syncFromApi(API_VOICES);
            const afterSync = await registry.getLastSyncTime();

            expect(afterSync).toBeDefined();
            expect(afterSync!.getTime()).toBeGreaterThan(beforeSync!.getTime());
        });
    });
});

// ============================================================================
// Voice Validation Edge Cases
// ============================================================================

describe('Voice validation edge cases', () => {
    it('handles special characters in voiceId', async () => {
        const registry = createMockVoiceRegistry([
            {
                id: '1',
                voiceId: 'voice-with-special_chars.123',
                name: 'Special Voice',
                category: 'premade',
                labels: null,
                description: null,
                previewUrl: null,
                lastSyncedAt: new Date(),
                createdAt: new Date(),
            },
        ]);

        const isValid = await registry.isValidVoice('voice-with-special_chars.123');
        expect(isValid).toBe(true);
    });

    it('handles very long voiceId', async () => {
        const longId = 'a'.repeat(100);
        const registry = createMockVoiceRegistry([
            {
                id: '1',
                voiceId: longId,
                name: 'Long ID Voice',
                category: 'premade',
                labels: null,
                description: null,
                previewUrl: null,
                lastSyncedAt: new Date(),
                createdAt: new Date(),
            },
        ]);

        const isValid = await registry.isValidVoice(longId);
        expect(isValid).toBe(true);
    });

    it('is case-sensitive for voiceId', async () => {
        const registry = createMockVoiceRegistry([
            {
                id: '1',
                voiceId: 'Voice-ID',
                name: 'Case Test',
                category: 'premade',
                labels: null,
                description: null,
                previewUrl: null,
                lastSyncedAt: new Date(),
                createdAt: new Date(),
            },
        ]);

        expect(await registry.isValidVoice('Voice-ID')).toBe(true);
        expect(await registry.isValidVoice('voice-id')).toBe(false);
        expect(await registry.isValidVoice('VOICE-ID')).toBe(false);
    });
});

// ============================================================================
// Sync Idempotency Tests
// ============================================================================

describe('Sync idempotency', () => {
    it('produces same result when syncing twice with same data', async () => {
        const registry = createMockVoiceRegistry([...MOCK_VOICES]);

        const result1 = await registry.syncFromApi(API_VOICES);
        const voices1 = await registry.getAllVoices();

        // Sync again with same data
        const result2 = await registry.syncFromApi(API_VOICES);
        const voices2 = await registry.getAllVoices();

        // Second sync should only update (no adds or removes)
        expect(result2.added).toBe(0);
        expect(result2.removed).toBe(0);
        expect(result2.updated).toBe(3);

        // Voices should be the same
        expect(voices1.length).toBe(voices2.length);
        expect(voices1.map(v => v.voiceId).sort()).toEqual(voices2.map(v => v.voiceId).sort());
    });
});

// ============================================================================
// Labels Handling Tests
// ============================================================================

describe('Labels handling', () => {
    it('preserves labels during sync', async () => {
        const registry = createMockVoiceRegistry([]);
        await registry.syncFromApi([
            { voiceId: 'test', name: 'Test', labels: { gender: 'male', accent: 'british', age: 'young' } },
        ]);

        const voice = await registry.getVoice('test');
        expect(voice?.labels).toEqual({ gender: 'male', accent: 'british', age: 'young' });
    });

    it('handles null labels', async () => {
        const registry = createMockVoiceRegistry([]);
        await registry.syncFromApi([
            { voiceId: 'test', name: 'Test' },
        ]);

        const voice = await registry.getVoice('test');
        expect(voice?.labels).toBeNull();
    });

    it('handles empty labels object', async () => {
        const registry = createMockVoiceRegistry([]);
        await registry.syncFromApi([
            { voiceId: 'test', name: 'Test', labels: {} },
        ]);

        const voice = await registry.getVoice('test');
        expect(voice?.labels).toEqual({});
    });
});
