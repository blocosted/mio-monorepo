/**
 * Local Run Store (non-committed)
 *
 * Stores CLI inputs/outputs on disk with a stable, reusable structure.
 *
 * Default root (repo): .mio-data/
 *
 * Example:
 * .mio-data/
 *   llm/
 *     enrich-story/
 *       2026-01-20/
 *         2026-01-20T12-34-56.789Z_emilie_<storyId>/
 *           input.json
 *           prompts.json
 *           output.json
 *           meta.json
 */

import path from 'node:path';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

export type RunStoreWriteResult = {
    runDir: string;
    files: Record<string, string>;
};

function safeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
}

export function createRunDir(args: {
    rootDir?: string;
    namespace: string;
    command: string;
    date?: Date;
    labelParts?: string[];
}): { runDir: string; runId: string } {
    const date = args.date ?? new Date();
    const day = date.toISOString().slice(0, 10); // YYYY-MM-DD
    const iso = date.toISOString().replace(/:/g, '-'); // file-system friendly

    const runId = [iso, ...(args.labelParts ?? []).map(safeSegment)].filter(Boolean).join('_');
    const root = path.resolve(process.cwd(), args.rootDir ?? '.mio-data');
    const runDir = path.join(root, safeSegment(args.namespace), safeSegment(args.command), day, runId);

    mkdirSync(runDir, { recursive: true });
    return { runDir, runId };
}

export function writeJsonFile(runDir: string, filename: string, data: unknown): string {
    const filePath = path.join(runDir, filename);
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    return filePath;
}

export function readJsonFile<T>(filePath: string): T {
    if (!existsSync(filePath)) {
        throw new Error(`Input file not found: ${filePath}`);
    }
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
}

