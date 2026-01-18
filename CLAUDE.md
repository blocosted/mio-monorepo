# CLAUDE.md — Mio

Mio is a personalized audio story generator for children.
The app generates complete audio stories (narration, dialogs, music, SFX)
from a short user prompt.

REFERENCE DOCS:
- story-app-prd.md (functional specs)
- docs/ (architecture & implementation details)

---

## Architecture Invariants (NON-NEGOTIABLE)

- Clean Architecture is enforced
- Inner layers MUST NOT depend on outer layers
- Domain MUST NOT depend on infrastructure
- Handlers are thin (no business logic)
- Services orchestrate, repositories persist
- Prefer composition over inheritance

LAYERS:

- Presentation
  - Next.js (apps/web)
  - Elysia handlers (apps/api)

- Application
  - Services
  - Use cases
  - Workflows orchestration

- Domain
  - Types, constants, business rules
  - Located in @mio/shared

- Infrastructure
  - Drizzle, Supabase, Redis, FFmpeg, external APIs

---

## Monorepo Rules

apps/web
- Presentation only
- No business logic
- Uses Treaty client

apps/api
- Application + infrastructure
- Elysia handlers
- Inversify dependency injection
- Drizzle repositories

packages/shared
- Domain layer ONLY
- Types, constants, errors
- NO services
- NO infrastructure
- NO runtime dependencies (except types)

packages/db
- Drizzle schemas & migrations
- Database client

---

## Critical Rules (MUST / MUST NOT)

### Shared
- MUST define env vars in:
  packages/shared/src/constants/environment.constants.ts
- MUST define business errors in:
  packages/shared/src/constants/error.constants.ts
- MUST reuse shared types
- MUST NOT redeclare domain models

### API
- MUST validate inputs with Typebox
- MUST keep handlers thin
- MUST delegate logic to services
- MUST throw AppError for business errors

### Services
- MUST expose an interface
- MUST be injected via Inversify
- MUST NOT instantiate dependencies manually
- MUST be stateless when possible

### Database
- MUST use Drizzle
- MUST avoid implicit SELECT *
- MUST use transactions for multi-step writes

---

## Dependency Injection (Inversify)

- All services are injected via Inversify
- Tokens are defined in container/types.ts
- Services are Singleton by default
- reflect-metadata MUST be imported first
- Handlers retrieve services from the container

See: docs/architecture/inversify.md

---

## Coding Style

TypeScript
- Explicit public types
- Discriminated unions for state
- No any

Elysia
- Typebox validation
- Domain-based route grouping
- Plugins for cross-cutting concerns

Next.js
- Server Components by default
- 'use client' only when required
- Loading & error boundaries mandatory

Drizzle
- Explicit column selection
- Relations declared
- No full-table scans

---

## Operational Constraints

Performance
- Expect cold starts on Scaleway (2–5s)
- Clean FFmpeg temp files
- Use DB pooler

Security
- Always validate inputs
- Prepare for Supabase RLS
- No secrets in code

Costs
- ElevenLabs is expensive → cache aggressively
- Minimize workflow steps

---

## How Claude Should Behave

- Prefer existing patterns over new abstractions
- Ask before introducing new libraries
- Do not refactor architecture without explicit request
- Optimize for clarity and consistency, not cleverness
