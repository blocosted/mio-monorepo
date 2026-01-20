# CLAUDE.md — Mio

## Overview

**Mio**: Personalized audio story generation app for children.
**PRD**: `story-app-prd.md`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | Nx + Bun |
| Frontend | Next.js 15 (App Router) |
| Backend | Elysia |
| ORM | Drizzle |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage (S3 protocol) + Bun `S3Client` |
| Cache | Redis (Upstash in prod) + Bun `RedisClient` |
| Jobs | Upstash Workflow |
| Audio | fluent-ffmpeg |
| Deploy | Vercel (web) + Scaleway (api) |

## Structure

```
mio/
├── apps/
│   ├── web/                    # Next.js PWA
│   └── api/                    # Elysia API
├── packages/
│   ├── db/                     # Drizzle schemas, migrations
│   ├── helpers/                # Env loader + process helpers
│   └── shared/                 # Types, constants, errors (+ server-only infra)
```

## Architecture (Clean Architecture)

```
PRESENTATION   → Next.js pages, components
APPLICATION    → Elysia routes, services
DOMAIN         → Shared primitives (enum-like literals) (@mio/shared/types)
INFRASTRUCTURE → Drizzle, S3 (Bun), Redis (Bun)
```

**Rule**: Inner layers NEVER depend on outer layers.

## File Organization (API)

```
apps/api/src/
├── api.server.ts                   # Create Elysia app (no listen/side effects)
├── handlers/[feature]/
│   ├── [feature].handlers.ts        # Elysia routes
│   ├── [feature].handlers.types.ts  # Validation schemas (Typebox)
│   └── [feature].handlers.map.ts    # Service ↔ API mapping
├── services/[feature]/
│   ├── [feature].service.ts         # Implementation
│   ├── [feature].service.types.ts   # Types + interfaces
│   ├── [feature].service.store.ts   # DB access (Drizzle)
│   └── [feature].service.map.ts     # DB ↔ Service mapping
├── database/models/
│   └── [feature].models.ts          # Drizzle schemas
├── ioc/                             # Inversify container wiring
├── plugins/                         # Elysia plugins
├── workflows/                       # Upstash Workflow
└── tests/                           # Test runner + helpers
```

**Note (Infrastructure)**: les clients infra (DB/Redis/S3) et le logger ont été déplacés dans `packages/shared/src/server/` pour centraliser l’infrastructure **server-only** et éviter la duplication.

## Critical Files

| File | Content |
|------|---------|
| `packages/shared/src/constants/environment.constants.ts` | Environment keys + `environment` singleton (server/runtime) |
| `packages/shared/src/constants/public-environment.constants.ts` | Public env (`NEXT_PUBLIC_*`) for Next.js (build-time) |
| `packages/shared/src/constants/error.constants.ts` | Business errors (AppError, ErrorCodes) |
| `packages/helpers/env.loader.ts` | Loads `.env.*` and hydrates `environment` |
| `bunfig.toml` | `bun test` configuration + global preload |
| `apps/api/bunfig.toml` | `bun test` configuration for Nx (cwd=`apps/api`) |
| `apps/api/src/tests/bun-test.preload.ts` | Docker+DB migrations bootstrap for tests |
| `packages/shared/src/server/connections/*` | Server-only infra clients (DB/Redis/S3) |
| `packages/shared/src/server/logger/Logger.ts` | Server-only Logger (LogLayer) |

## Conventions

### TypeScript
- Explicit types for public interfaces
- Const assertions for literals
- Discriminated unions for states
- Prefer `environment.*` / `publicEnvironment.*` over direct `process.env`

### Type Architecture (Clean Architecture)

**Rule**: Only primitive types are shared (enum-like literals such as `Gender`, `StoryDuration`, etc.). Each layer defines its own interfaces.

**Shared Primitive Types** (`@mio/shared/src/types/`):
- `[feature].types.ts` — Feature-specific “enums” (prefer `const X = {...} as const` + `type X = ...` for TypeBox compatibility)
- `common.types.ts` — Generic primitives (e.g., `SortDirection`)
- Import: `import { Gender, StoryDuration } from '@mio/shared/types'`

**Never add interfaces to `@mio/shared/types`**. If you need an interface, define it in the layer that owns it:
- handlers: inferred from Elysia schemas (`typeof Schema.static`)
- services: declared in `[feature].service.types.ts`
- store: inferred from Drizzle schema (or mapped from it), but not exported from shared

**Layer-specific Types**:

| Layer | File | Type Source |
|-------|------|-------------|
| Handlers | `[feature].handlers.types.ts` | Inferred from Typebox schemas (`typeof Schema.static`) |
| Services | `[feature].service.types.ts` | Declared interfaces using shared Enums |
| Store | `[feature].service.store.ts` | Inferred from Drizzle schema (`typeof table.$inferSelect`) |

**Mappers**: Use layer-specific types + shared Enums. No `unknown` types needed.

```typescript
// Handler types (inferred from Typebox)
export type CreateProfileBody = typeof CreateProfileBodySchema.static;

// Service types (declared with Enums)
import { Gender } from '@mio/shared/types';
export interface ChildProfile {
    id: string;
    gender: Gender;
    // ...
}

// Mapper (handler → service)
export function mapCreateBodyToInput(body: CreateProfileBody): CreateChildProfileInput {
    return { ...body }; // Types are compatible via shared Enums
}
```

### Elysia
- Validation with Typebox (`t.Object`, `t.String`, etc.)
- Thin handlers: delegate logic to services
- Plugins for cross-cutting concerns

### Drizzle
- Explicit relations
- Explicit select (no `SELECT *`)
- Transactions for multiple operations

### Next.js
- Server Components by default
- `'use client'` only if interactivity required
- Loading/Error boundaries

## Tests

- **Runner**: `bun test`
- **Bootstrap**: `bunfig.toml` + preload (`apps/api/src/tests/bun-test.preload.ts`)
- **Containers**: Docker (PostgreSQL + Redis) started by the test preload (local only)
- **Convention**: `*.test.ts` (unit), `*.spec.ts` (integration)

```bash
bun test                    # All tests
bun test <pattern>          # Filter tests
bun test --coverage         # With coverage
```

## Commands

```bash
# Dev
nx serve api                    # API (localhost:3001)
nx serve web                    # Frontend (localhost:3000)
nx run-many -t serve -p api web # Both

# Database
nx run db:generate              # Generate migrations
nx run db:push                  # Apply (dev)
nx run db:studio                # Drizzle Studio

# Storage (S3 buckets/policies)
nx run scripts:s3 -- setup
nx run scripts:s3 -- list

# Build
nx run-many -t build            # Build all
nx run-many -t lint             # Lint all
```

## Key Considerations

- **Validation**: Always validate inputs with Typebox
- **Secrets**: Centralize access in `packages/shared/src/constants/environment.constants.ts` (future: secret manager)
- **Supabase**: Use pooler for serverless
- **Redis**: Prefer `REDIS_URL` (TLS `rediss://...` in production)
- **Storage**: Use S3 protocol via Bun `S3Client` (Supabase Storage S3 endpoint)
- **FFmpeg**: Limit to 1GB RAM, clean temp files
