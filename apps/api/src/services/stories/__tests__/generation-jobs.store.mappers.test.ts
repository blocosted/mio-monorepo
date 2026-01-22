/**
 * Generation Jobs Store Mapper Tests
 *
 * Unit tests for Date ↔ string conversion mappers used in generation_jobs table.
 */

import { describe, it, expect } from 'bun:test';
import { JobStatus, JobStep } from '@mio/shared/types';
import type { JobStepProgress } from '../stories.service.types';

/**
 * Map JobStepProgress to DB format (Date → string)
 */
function mapStepProgressToDb(steps: JobStepProgress[]) {
    return steps.map(step => ({
        name: step.name,
        status: step.status,
        progress: step.progress,
        completedAt: step.completedAt?.toISOString(),
        error: step.error,
    }));
}

/**
 * Map DB format to JobStepProgress (string → Date)
 */
function mapStepProgressFromDb(steps: any[]): JobStepProgress[] {
    return steps.map(step => ({
        name: step.name as JobStep,
        status: step.status as JobStatus,
        progress: step.progress,
        completedAt: step.completedAt ? new Date(step.completedAt) : undefined,
        error: step.error,
    }));
}

describe('Generation Jobs Store Mappers', () => {
    describe('mapStepProgressToDb()', () => {
        it('converts Date to ISO string', () => {
            const date = new Date('2026-01-22T12:00:00Z');
            const steps: JobStepProgress[] = [
                {
                    name: JobStep.ScriptGeneration,
                    status: JobStatus.Completed,
                    progress: 100,
                    completedAt: date,
                },
            ];

            const result = mapStepProgressToDb(steps);

            expect(result).toEqual([
                {
                    name: JobStep.ScriptGeneration,
                    status: JobStatus.Completed,
                    progress: 100,
                    completedAt: '2026-01-22T12:00:00.000Z',
                    error: undefined,
                },
            ]);
        });

        it('handles undefined completedAt', () => {
            const steps: JobStepProgress[] = [
                {
                    name: JobStep.GeneratingVoice,
                    status: JobStatus.Processing,
                    progress: 50,
                    completedAt: undefined,
                },
            ];

            const result = mapStepProgressToDb(steps);

            expect(result[0].completedAt).toBeUndefined();
        });

        it('preserves error field', () => {
            const steps: JobStepProgress[] = [
                {
                    name: JobStep.GeneratingSfx,
                    status: JobStatus.Failed,
                    progress: 30,
                    error: 'SFX generation failed',
                },
            ];

            const result = mapStepProgressToDb(steps);

            expect(result[0].error).toBe('SFX generation failed');
        });

        it('handles multiple steps', () => {
            const steps: JobStepProgress[] = [
                {
                    name: JobStep.ScriptGeneration,
                    status: JobStatus.Completed,
                    progress: 100,
                    completedAt: new Date('2026-01-22T10:00:00Z'),
                },
                {
                    name: JobStep.GeneratingVoice,
                    status: JobStatus.Processing,
                    progress: 75,
                },
                {
                    name: JobStep.GeneratingSfx,
                    status: JobStatus.Pending,
                    progress: 0,
                },
            ];

            const result = mapStepProgressToDb(steps);

            expect(result).toHaveLength(3);
            expect(result[0].completedAt).toBe('2026-01-22T10:00:00.000Z');
            expect(result[1].completedAt).toBeUndefined();
            expect(result[2].progress).toBe(0);
        });

        it('handles empty array', () => {
            const steps: JobStepProgress[] = [];
            const result = mapStepProgressToDb(steps);
            expect(result).toEqual([]);
        });
    });

    describe('mapStepProgressFromDb()', () => {
        it('converts ISO string to Date', () => {
            const dbSteps = [
                {
                    name: JobStep.ScriptGeneration,
                    status: JobStatus.Completed,
                    progress: 100,
                    completedAt: '2026-01-22T12:00:00.000Z',
                },
            ];

            const result = mapStepProgressFromDb(dbSteps);

            expect(result[0].completedAt).toBeInstanceOf(Date);
            expect(result[0].completedAt?.toISOString()).toBe('2026-01-22T12:00:00.000Z');
        });

        it('handles undefined completedAt', () => {
            const dbSteps = [
                {
                    name: JobStep.GeneratingVoice,
                    status: JobStatus.Processing,
                    progress: 50,
                    completedAt: undefined,
                },
            ];

            const result = mapStepProgressFromDb(dbSteps);

            expect(result[0].completedAt).toBeUndefined();
        });

        it('handles null completedAt', () => {
            const dbSteps = [
                {
                    name: JobStep.GeneratingMusic,
                    status: JobStatus.Pending,
                    progress: 0,
                    completedAt: null,
                },
            ];

            const result = mapStepProgressFromDb(dbSteps);

            expect(result[0].completedAt).toBeUndefined();
        });

        it('preserves error field', () => {
            const dbSteps = [
                {
                    name: JobStep.Mixing,
                    status: JobStatus.Failed,
                    progress: 80,
                    error: 'Mixing failed',
                },
            ];

            const result = mapStepProgressFromDb(dbSteps);

            expect(result[0].error).toBe('Mixing failed');
        });

        it('handles multiple steps', () => {
            const dbSteps = [
                {
                    name: JobStep.ScriptGeneration,
                    status: JobStatus.Completed,
                    progress: 100,
                    completedAt: '2026-01-22T10:00:00.000Z',
                },
                {
                    name: JobStep.GeneratingVoice,
                    status: JobStatus.Completed,
                    progress: 100,
                    completedAt: '2026-01-22T10:05:00.000Z',
                },
                {
                    name: JobStep.GeneratingSfx,
                    status: JobStatus.Processing,
                    progress: 50,
                },
            ];

            const result = mapStepProgressFromDb(dbSteps);

            expect(result).toHaveLength(3);
            expect(result[0].completedAt).toBeInstanceOf(Date);
            expect(result[1].completedAt).toBeInstanceOf(Date);
            expect(result[2].completedAt).toBeUndefined();
        });

        it('handles empty array', () => {
            const dbSteps: any[] = [];
            const result = mapStepProgressFromDb(dbSteps);
            expect(result).toEqual([]);
        });

        it('casts name to JobStep enum', () => {
            const dbSteps = [
                {
                    name: 'script_generation',
                    status: JobStatus.Completed,
                    progress: 100,
                },
            ];

            const result = mapStepProgressFromDb(dbSteps);

            expect(result[0].name).toBe('script_generation');
        });

        it('casts status to JobStatus enum', () => {
            const dbSteps = [
                {
                    name: JobStep.Finalizing,
                    status: 'completed',
                    progress: 100,
                },
            ];

            const result = mapStepProgressFromDb(dbSteps);

            expect(result[0].status).toBe('completed');
        });
    });

    describe('round-trip conversion', () => {
        it('preserves data through to-db and from-db conversion', () => {
            const originalSteps: JobStepProgress[] = [
                {
                    name: JobStep.ScriptGeneration,
                    status: JobStatus.Completed,
                    progress: 100,
                    completedAt: new Date('2026-01-22T12:00:00Z'),
                },
                {
                    name: JobStep.GeneratingVoice,
                    status: JobStatus.Processing,
                    progress: 60,
                },
                {
                    name: JobStep.GeneratingSfx,
                    status: JobStatus.Failed,
                    progress: 20,
                    error: 'Test error',
                },
            ];

            const dbFormat = mapStepProgressToDb(originalSteps);
            const backToOriginal = mapStepProgressFromDb(dbFormat);

            expect(backToOriginal).toHaveLength(originalSteps.length);
            expect(backToOriginal[0].name).toBe(originalSteps[0].name);
            expect(backToOriginal[0].status).toBe(originalSteps[0].status);
            expect(backToOriginal[0].progress).toBe(originalSteps[0].progress);
            expect(backToOriginal[0].completedAt?.getTime()).toBe(originalSteps[0].completedAt?.getTime());
            expect(backToOriginal[1].completedAt).toBeUndefined();
            expect(backToOriginal[2].error).toBe(originalSteps[2].error);
        });

        it('handles edge cases in round-trip', () => {
            const originalSteps: JobStepProgress[] = [
                {
                    name: JobStep.Mixing,
                    status: JobStatus.Pending,
                    progress: 0,
                    completedAt: undefined,
                    error: undefined,
                },
            ];

            const dbFormat = mapStepProgressToDb(originalSteps);
            const backToOriginal = mapStepProgressFromDb(dbFormat);

            expect(backToOriginal[0].completedAt).toBeUndefined();
            expect(backToOriginal[0].error).toBeUndefined();
            expect(backToOriginal[0].progress).toBe(0);
        });
    });
});
