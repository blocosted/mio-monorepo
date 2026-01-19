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
| Storage | Supabase Storage |
| Cache | Upstash Redis |
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
│   └── shared/                 # Types, constants, errors
```

## Architecture (Clean Architecture)

```
PRESENTATION   → Next.js pages, components
APPLICATION    → Elysia routes, services
DOMAIN         → Types, interfaces (@mio/shared)
INFRASTRUCTURE → Drizzle, Supabase, Redis
```

**Rule**: Inner layers NEVER depend on outer layers.

## File Organization (API)

```
apps/api/src/
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
├── workflows/                       # Upstash Workflow
└── plugins/                         # Elysia plugins
```

## Critical Files

| File | Content |
|------|---------|
| `packages/shared/src/constants/environment.constants.ts` | Environment variables |
| `packages/shared/src/constants/error.constants.ts` | Business errors (AppError, ErrorCodes) |
| `packages/shared/src/clients/mio-client.ts` | Type-safe Treaty client |

## Conventions

### TypeScript
- Explicit types for public interfaces
- Use types from `@mio/shared`
- Const assertions for literals
- Discriminated unions for states

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

- **Runner**: `bun:test`
- **Containers**: Testcontainers (PostgreSQL, Redis)
- **Helpers**: `packages/test-utils`
- **Convention**: `*.test.ts` (unit), `*.spec.ts` (integration)

```bash
bun test                    # All tests
nx run api:test             # API tests
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

# Build
nx run-many -t build            # Build all
nx run-many -t lint             # Lint all
```

## Key Considerations

- **Validation**: Always validate inputs with Typebox
- **Secrets**: Environment variables only
- **Supabase**: Use pooler for serverless
- **FFmpeg**: Limit to 1GB RAM, clean temp files
