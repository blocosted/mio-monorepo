import fs from 'node:fs';
import path from 'node:path';

/**
 * Find the monorepo root directory by walking up from a starting directory.
 *
 * Heuristic: a Mio workspace root contains both `nx.json` and `package.json`.
 */
export function findMonorepoRoot(startDir: string = process.cwd()): string {
  let current = path.resolve(startDir);

  // Walk up to filesystem root.
  for (;;) {
    const hasNx = fs.existsSync(path.join(current, 'nx.json'));
    const hasPkg = fs.existsSync(path.join(current, 'package.json'));

    if (hasNx && hasPkg) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      // Fallback to startDir if nothing matched.
      return path.resolve(startDir);
    }
    current = parent;
  }
}

const monorepoRoot = findMonorepoRoot();
export default monorepoRoot;
