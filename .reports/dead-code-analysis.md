# Dead Code Analysis Report

**Date**: 2026-01-24
**Tools Used**: knip, depcheck, ts-prune
**Test Status**: All 343 tests passing

---

## Executive Summary

| Category | Count |
|----------|-------|
| Unused Files | 65 (many are config/entry points) |
| Unused Dependencies | 4 |
| Unused Dev Dependencies | 5 |
| Unused Exports | 89 |
| Unused Type Exports | 196 |
| Unused Enum Members | 45 |

---

## Cleanup Completed

### Files Deleted (16 files)

| File | Reason |
|------|--------|
| `apps/api/src/services/llm/openai.ts` | Unused OpenAI LLM implementation (app uses Anthropic) |
| `apps/api/src/services/index.ts` | Unused barrel file |
| `apps/api/src/handlers/jobs/jobs.handlers.map.ts` | Empty placeholder file |
| `apps/api/src/tests/test-runner.ts` | Replaced by bun-test.preload.ts |
| `apps/api/src/tests/index.ts` | Unused barrel file |
| `apps/api/src/workflows/index.ts` | Unused barrel file |
| `apps/api/src/repositories/index.ts` | Unused barrel file |
| `apps/api/src/services/llm/prompts/index.ts` | Unused barrel file |
| `apps/api/src/services/audio/ambiance-generator.service.types.ts` | Orphaned type file |
| `apps/api/src/services/audio/ffmpeg-mixer.service.types.ts` | Orphaned type file |
| `apps/api/src/services/audio/music-generator.service.types.ts` | Orphaned type file |
| `apps/api/src/services/audio/sfx.service.types.ts` | Orphaned type file |
| `apps/api/src/services/audio/tts.service.types.ts` | Orphaned type file |
| `apps/api/src/services/stories/script-generation.service.types.ts` | Orphaned type file |
| `packages/shared/src/server/connections/index.ts` | Unused barrel file |
| `packages/shared/src/server/index.ts` | Unused barrel file |

### Verification

- All 343 tests pass
- TypeScript check passes (npx tsc --noEmit)
- No runtime errors

---

## NOT Deleted (False Positives)

These files were flagged by tools but are actually required:

### Config/Entry Points
| File | Reason to Keep |
|------|----------------|
| `apps/api/drizzle.config.ts` | Drizzle CLI config |
| `apps/web/next.config.mjs` | Next.js config |
| `apps/web/postcss.config.mjs` | PostCSS config (uses @tailwindcss/postcss) |
| `packages/db/drizzle.config.ts` | Drizzle CLI config |
| `apps/api/src/tests/bun-test.preload.ts` | Bun test preload (referenced in bunfig.toml) |
| `apps/web/src/app/layout.tsx` | Next.js root layout |
| `apps/web/src/app/page.tsx` | Next.js home page |
| `apps/web/src/app/globals.css` | Global CSS (imports tailwindcss) |
| `packages/helpers/index.ts` | Package entry point |
| `packages/db/src/index.ts` | Package entry point |

### Scripts Package (CLI Tools)
| Path | Purpose |
|------|---------|
| `packages/scripts/src/s3/*` | S3 CLI commands |
| `packages/scripts/src/tts/*` | TTS CLI commands |
| `packages/scripts/src/llm/*` | LLM CLI commands |
| `packages/scripts/src/library/*` | Audio library seeding |
| `packages/scripts/src/ambiance/*` | Ambiance generation |
| `packages/scripts/src/music/*` | Music generation |
| `packages/scripts/src/sfx/*` | Sound effects |
| `packages/scripts/src/mix/*` | Audio mixing |
| `packages/scripts/src/pipeline/*` | Full story pipeline |
| `packages/scripts/src/_local-run-store/*` | Script file storage utilities |

### Dependencies NOT Removed
| Package | Reason to Keep |
|---------|----------------|
| `@supabase/supabase-js` | Used in packages/scripts/src/s3/client.ts |
| `@tailwindcss/postcss` | Used by postcss.config.mjs |
| `tailwindcss` | Used in globals.css |
| `@upstash/qstash` | Dependency of @upstash/workflow |
| `yargs` | Used by all CLI scripts |
| `@types/yargs` | Types for yargs |

---

## Remaining Cleanup Opportunities

### Unused Exports (Low Priority)

Many barrel files export items that are only used via direct imports. These are not causing harm but could be cleaned up for consistency:

- `apps/api/src/ioc/index.ts` - Some exports unused (BUCKETS, IocRepository)
- Various service `index.ts` files - Re-exports not used externally

### Unused Enum Members (Low Priority)

`packages/shared/src/constants/http.types.ts` contains many HTTP status codes that are never used. These could be cleaned but are harmless constants.

---

## Impact Summary

| Metric | Value |
|--------|-------|
| Files deleted | 16 |
| Lines removed | ~600 |
| Dependencies removed | 0 |
| Tests affected | 0 |
| Build impact | None |

---

## Verification Commands

```bash
# Run tests
bun test

# TypeScript check
npx tsc --noEmit -p apps/api/tsconfig.json

# Run knip again
npx knip
```
