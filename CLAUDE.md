# CLAUDE.md — StoryForge Kids

## 🎯 Vue d'ensemble du projet

**StoryForge Kids** est une application de génération d'histoires audio personnalisées pour enfants. L'app permet aux parents de créer un profil pour leur enfant, puis de générer des histoires audio complètes (narration, dialogues, musique, effets sonores) à partir d'une simple idée.

**Document de référence** : Consulter `story-app-prd.md` pour les spécifications détaillées.

---

## 🏗️ Architecture

### Stack Technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **Monorepo** | Nx | Orchestration, cache, tasks |
| **Runtime** | Bun | Runtime JS rapide |
| **Frontend** | Next.js 15 (App Router) | PWA, SSR, RSC |
| **Backend** | Elysia | API REST type-safe |
| **ORM** | Drizzle | Type-safe, migrations |
| **Database** | Supabase PostgreSQL | Données persistantes |
| **Storage** | Supabase Storage | Fichiers audio |
| **Cache** | Upstash Redis | Cache, rate limiting |
| **Jobs** | Upstash Workflow | Orchestration longue durée |
| **Audio** | fluent-ffmpeg | Mixage natif |
| **Déploiement** | Vercel + Scaleway | Frontend + API |

### Structure du Monorepo

```
mio/
├── apps/
│   ├── web/                    # Next.js PWA
│   └── api/                    # Elysia API
├── packages/
│   ├── db/                     # Drizzle schemas, migrations, client
│   └── shared/                 # Types, constantes, utils partagés
├── nx.json
├── package.json
└── CLAUDE.md
```

---

## 🧱 Principes d'Architecture

### Clean Architecture

Le projet suit les principes de **Clean Architecture** pour garantir maintenabilité, testabilité et indépendance des frameworks.

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION                              │
│  (Next.js pages, components, hooks)                             │
├─────────────────────────────────────────────────────────────────┤
│                        APPLICATION                               │
│  (Elysia routes, use cases, orchestration)                      │
├─────────────────────────────────────────────────────────────────┤
│                          DOMAIN                                  │
│  (Entities, interfaces, business rules)                         │
├─────────────────────────────────────────────────────────────────┤
│                       INFRASTRUCTURE                             │
│  (Drizzle, Supabase, ElevenLabs, Redis, FFmpeg)                │
└─────────────────────────────────────────────────────────────────┘
```

#### Règles de dépendance

1. **Les couches internes ne dépendent JAMAIS des couches externes**
2. **Le Domain ne connaît pas l'infrastructure** (pas d'import Drizzle dans les entities)
3. **L'Application orchestre** mais délègue aux services
4. **L'Infrastructure implémente** les interfaces définies dans le Domain

### Séparation des Responsabilités

#### 📁 `packages/shared/` — Domain Layer

Contient les **types**, **constantes** et **erreurs** partagés. **Aucune dépendance externe** (sauf types).

> **Note:** Les interfaces de services sont déclarées dans `apps/api` au niveau des services concernés, pas dans le package shared.

```typescript
// packages/shared/src/models/story.ts
// ✅ Types purs, pas de logique d'infrastructure

export interface Story {
  id: string;
  childProfileId: string;
  initialPrompt: string;
  enrichedConcept: EnrichedConcept | null;
  script: StoryScript | null;
  finalAudioUrl: string | null;
  duration: number | null;
  status: StoryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type StoryStatus = 'draft' | 'generating' | 'ready' | 'failed';
```

```typescript
// packages/shared/src/constants/themes.ts
// ✅ Constantes métier réutilisables

export const THEMES = [
  'animals', 'dinosaurs', 'space', 'ocean',
  'princesses', 'knights', 'pirates', 'superheroes',
  'nature', 'vehicles', 'magic', 'friendship',
] as const;

export type Theme = typeof THEMES[number];

export const AGE_TO_VOCABULARY: Record<number, VocabularyLevel> = {
  3: 'very_simple',
  4: 'very_simple',
  5: 'simple',
  6: 'simple',
  7: 'medium',
  8: 'medium',
  9: 'advanced',
  10: 'advanced',
  11: 'advanced',
  12: 'advanced',
};
```

#### 📁 `packages/db/` — Infrastructure Layer (Data)

Contient **Drizzle schemas**, **migrations** et le **client DB**. Implémente les repositories.

```typescript
// packages/db/src/schema/stories.ts
// ✅ Schema Drizzle, spécifique à l'infrastructure

import { pgTable, uuid, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import type { EnrichedConcept, StoryScript } from '@mio/shared';

export const stories = pgTable('stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  childProfileId: uuid('child_profile_id').notNull(),
  initialPrompt: text('initial_prompt').notNull(),
  enrichedConcept: jsonb('enriched_concept').$type<EnrichedConcept>(),
  script: jsonb('script').$type<StoryScript>(),
  finalAudioUrl: text('final_audio_url'),
  duration: integer('duration'),
  status: text('status', { 
    enum: ['draft', 'generating', 'ready', 'failed'] 
  }).default('draft'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

```typescript
// apps/api/src/services/stories/stories.service.store.ts
// ✅ Database access isolé avec Drizzle

import { eq } from 'drizzle-orm';
import { db } from '../../database/client';
import { stories } from '../../database/models';
import type { Story, CreateStoryInput } from '@mio/shared';

export const storyStore = {
  async findById(id: string): Promise<Story | null> {
    const result = await db.query.stories.findFirst({
      where: eq(stories.id, id),
    });
    return result ?? null;
  },

  async create(data: CreateStoryInput): Promise<Story> {
    const [created] = await db.insert(stories).values(data).returning();
    return created;
  },

  async update(id: string, data: Partial<Story>): Promise<Story> {
    const [updated] = await db
      .update(stories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stories.id, id))
      .returning();
    return updated;
  },
};
```

#### 📁 `apps/api/` — Application Layer

Contient les **handlers Elysia**, **services** et **database access**. Orchestre les opérations.

### File Organization

#### Service Structure
```
services/[feature]/
├── [feature].service.ts           # Service implementation
├── [feature].service.types.ts     # Service types and interfaces
├── [feature].service.store.ts     # Database access (Drizzle/Redis)
├── [feature].service.map.ts       # DB ↔ Service type mapping
└── [feature].service.test.ts      # Service-specific tests
```

#### Handler Structure
```
handlers/[feature]/
├── [feature].handlers.ts          # Elysia routes
├── [feature].handlers.types.ts    # Validation schemas + inferred types
├── [feature].handlers.map.ts      # Service ↔ API type mapping
└── [feature].handlers.test.ts     # Application tests for all routes
```

#### Database Structure
```
database/models/
└── [feature].models.ts            # Drizzle schema definitions
```

#### Complete API Structure
```
apps/api/src/
├── index.ts                       # Entry point Elysia
├── handlers/                      # Couche présentation API
│   ├── profiles/
│   │   ├── profiles.handlers.ts
│   │   ├── profiles.handlers.types.ts
│   │   └── profiles.handlers.map.ts
│   ├── stories/
│   │   ├── stories.handlers.ts
│   │   ├── stories.handlers.types.ts
│   │   └── stories.handlers.map.ts
│   └── jobs/
│       ├── jobs.handlers.ts
│       └── jobs.handlers.types.ts
├── services/                      # Business logic + infrastructure
│   ├── llm/
│   │   ├── llm.service.ts
│   │   ├── llm.service.types.ts
│   │   └── llm.service.store.ts
│   ├── audio/
│   │   ├── audio.service.ts
│   │   ├── audio.service.types.ts
│   │   └── audio.service.store.ts
│   ├── cache/
│   │   └── cache.service.ts
│   └── storage/
│       └── storage.service.ts
├── database/                      # Drizzle schemas
│   └── models/
│       ├── profiles.models.ts
│       ├── stories.models.ts
│       └── index.ts
├── workflows/                     # Upstash Workflow definitions
│   └── storyGeneration.ts
└── plugins/                       # Elysia plugins
    ├── auth.ts
    └── errorHandler.ts
```

**Example Service with Types :**

```typescript
// apps/api/src/services/llm/llm.service.types.ts
// ✅ Types locaux au service

import type { ChildProfile, EnrichedConcept, StoryScript, StoryAnswer } from '@mio/shared';

export interface EnrichStoryParams {
  prompt: string;
  profile: ChildProfile;
  duration: string;
}

export interface GenerateScriptParams {
  concept: EnrichedConcept;
  profile: ChildProfile;
  answers: StoryAnswer[];
  duration: string;
}

export interface ILLMService {
  enrichStory(params: EnrichStoryParams): Promise<EnrichedConcept>;
  generateScript(params: GenerateScriptParams): Promise<StoryScript>;
}
```

```typescript
// apps/api/src/services/llm/llm.service.ts
// ✅ Implémentation du service

import type { ILLMService, EnrichStoryParams, GenerateScriptParams } from './llm.service.types';
import type { EnrichedConcept, StoryScript } from '@mio/shared';

export const llmService: ILLMService = {
  async enrichStory(params: EnrichStoryParams): Promise<EnrichedConcept> {
    // Implementation...
  },

  async generateScript(params: GenerateScriptParams): Promise<StoryScript> {
    // Implementation...
  },
};
```

**Example Handler with Types :**

```typescript
// apps/api/src/handlers/stories/stories.handlers.types.ts
// ✅ Validation schemas avec types inférés

import { t } from 'elysia';

export const createStorySchema = t.Object({
  childProfileId: t.String({ format: 'uuid' }),
  prompt: t.String({ minLength: 3, maxLength: 500 }),
});

export type CreateStoryInput = typeof createStorySchema.static;
```

```typescript
// apps/api/src/handlers/stories/stories.handlers.ts
// ✅ Handler thin, délègue au service

import { Elysia } from 'elysia';
import { createStorySchema } from './stories.handlers.types';
import { storyService } from '../../services/stories/stories.service';

export const storiesHandlers = new Elysia({ prefix: '/stories' })
  .post('/', async ({ body }) => {
    return storyService.create(body);
  }, {
    body: createStorySchema,
  });
```

#### 📁 `apps/web/` — Presentation Layer

Contient le **frontend Next.js**. Communique avec l'API via **Treaty** (client type-safe).

```
apps/web/src/
├── app/                     # App Router
│   ├── (app)/               # Routes groupées
│   │   ├── profiles/
│   │   ├── create/
│   │   ├── library/
│   │   └── story/[id]/
│   ├── api/                 # Route handlers (si besoin)
│   └── layout.tsx
├── components/
│   ├── ui/                  # Composants génériques (Button, Input, Card...)
│   ├── profiles/            # Composants spécifiques profils
│   ├── story/               # Composants spécifiques histoires
│   └── audio/               # Player, waveform, etc.
├── hooks/                   # Custom hooks
│   ├── useJobProgress.ts
│   ├── useStory.ts
│   └── useChildProfile.ts
├── stores/                  # Zustand stores
│   └── appStore.ts
└── lib/
    ├── api.ts               # Client Treaty
    └── utils.ts
```

---

### Shared Package Rules

Le package `@mio/shared` contient uniquement les **types**, **constantes** et **erreurs** partagés entre les applications.

**Critical:** Toutes les variables d'environnement DOIVENT être déclarées dans :
```
packages/shared/src/constants/environment.constants.ts
```

**Error Handling:** Toutes les erreurs métier DOIVENT être déclarées dans :
```
packages/shared/src/constants/error.constants.ts
```

**API Client:** Le package shared exporte un client Treaty pour les appels API type-safe :
```
packages/shared/src/clients/mio-client.ts
```

> **Important:** Les interfaces de services (ILLMService, IAudioGenerator, etc.) sont déclarées dans `apps/api` au niveau des services concernés, pas dans le package shared.

---

## 📐 Conventions & Bonnes Pratiques

### TypeScript

```typescript
// ✅ DO: Types explicites pour les interfaces publiques
export function createStory(input: CreateStoryInput): Promise<Story>

// ❌ DON'T: any ou types implicites sur les APIs
export function createStory(input: any)

// ✅ DO: Utiliser les types de @mio/shared
import type { Story, ChildProfile } from '@mio/shared';

// ❌ DON'T: Redéfinir les types localement
interface Story { ... } // Dupliqué !

// ✅ DO: Const assertions pour les literals
const STATUS = ['draft', 'generating', 'ready', 'failed'] as const;
type Status = typeof STATUS[number];

// ✅ DO: Discriminated unions pour les états
type JobResult = 
  | { status: 'pending' }
  | { status: 'processing'; progress: number }
  | { status: 'completed'; audioUrl: string }
  | { status: 'failed'; error: string };
```

### Elysia

```typescript
// ✅ DO: Validation avec Typebox
.post('/stories', handler, {
  body: t.Object({
    prompt: t.String({ minLength: 3 }),
  }),
  response: {
    200: t.Object({ id: t.String() }),
    404: t.Object({ error: t.String() }),
  },
})

// ✅ DO: Grouper les routes par domaine
const app = new Elysia()
  .use(profilesRoutes)    // /profiles/*
  .use(storiesRoutes)     // /stories/*
  .use(jobsRoutes);       // /jobs/*

// ✅ DO: Plugins pour les concerns transversaux
const app = new Elysia()
  .use(cors())
  .use(swagger())
  .use(errorHandler)      // Plugin custom
  .use(rateLimiter);      // Plugin custom

// ✅ DO: Derive pour le contexte enrichi
.derive(async ({ headers }) => {
  const profileId = headers['x-profile-id'];
  return { profileId };
})

// ❌ DON'T: Logique métier dans les routes
.post('/stories', async ({ body }) => {
  // ❌ 50 lignes de logique ici
  // ✅ Déléguer à un use case
  return createStory(body, deps);
})
```

### Drizzle

```typescript
// ✅ DO: Relations explicites
export const storiesRelations = relations(stories, ({ one, many }) => ({
  childProfile: one(childProfiles, {
    fields: [stories.childProfileId],
    references: [childProfiles.id],
  }),
  segments: many(storySegments),
}));

// ✅ DO: Requêtes avec select explicite pour les perfs
const story = await db.query.stories.findFirst({
  where: eq(stories.id, id),
  columns: { id: true, status: true, finalAudioUrl: true },
  with: { childProfile: { columns: { firstName: true } } },
});

// ✅ DO: Transactions pour les opérations multiples
await db.transaction(async (tx) => {
  const story = await tx.insert(stories).values(data).returning();
  await tx.insert(generationJobs).values({ storyId: story[0].id });
  return story[0];
});

// ❌ DON'T: SELECT * implicite sur les grosses tables
const allStories = await db.select().from(stories); // Charge tout !
```

### Next.js (App Router)

```typescript
// ✅ DO: Server Components par défaut
// app/library/page.tsx
export default async function LibraryPage() {
  const stories = await getStories(); // Fetch côté serveur
  return <StoryList stories={stories} />;
}

// ✅ DO: 'use client' seulement quand nécessaire
'use client';
export function AudioPlayer({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  // Interactivité requise
}

// ✅ DO: Loading et Error boundaries
// app/story/[id]/loading.tsx
export default function Loading() {
  return <StorySkeleton />;
}

// app/story/[id]/error.tsx
'use client';
export default function Error({ error, reset }) {
  return <ErrorDisplay error={error} onRetry={reset} />;
}

// ✅ DO: Metadata dynamique
export async function generateMetadata({ params }): Promise<Metadata> {
  const story = await getStory(params.id);
  return { title: story.title };
}
```

### Gestion des erreurs

Les erreurs sont gérées via un système centralisé basé sur des codes d'erreur (`ErrorCodes`) définis dans `packages/shared/src/constants/error.constants.ts`.

```typescript
// packages/shared/src/constants/error.constants.ts
// ✅ DO: Erreurs centralisées avec codes et définitions

import { type HttpErrorStatusCode, HttpStatusCode } from './http.types';

export enum ErrorCodes {
  InternalError = 'InternalError',
  NotFound = 'NotFound',
  ValidationError = 'ValidationError',
  UnauthorizedError = 'UnauthorizedError',
}

const errorDefinitions: {
  [key in ErrorCodes]: { code?: string; message: string; statusCode?: HttpErrorStatusCode };
} = {
  [ErrorCodes.InternalError]: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  },
  [ErrorCodes.NotFound]: {
    code: 'NOT_FOUND',
    message: 'Not found'
  },
  [ErrorCodes.ValidationError]: {
    code: 'VALIDATION',
    message: 'Validation failed',
    statusCode: HttpStatusCode.BadRequest
  },
  [ErrorCodes.UnauthorizedError]: {
    message: 'Unauthorized',
    statusCode: HttpStatusCode.Unauthorized
  },
};

export class AppError extends Error {
  public readonly code: ErrorCodes;
  public readonly diagnoses: Diagnose[];

  constructor(code: ErrorCodes, options?: { name?: string; diagnoses?: Diagnose[]; error?: Error }) {
    super(errorDefinitions[code].message);
    this.code = code;
    this.name = options?.name ?? httpErrorStatusCodeToName[this.statusCode];
    this.diagnoses = options?.diagnoses ?? [];
  }

  public get statusCode(): HttpErrorStatusCode {
    return errorDefinitions[this.code]?.statusCode ?? HttpStatusCode.InternalServerError;
  }
}

// ✅ Helper pour créer une erreur depuis un code
export function errorFromCode(code: ErrorCodes, options?: { diagnoses?: Diagnose[] }) {
  return new AppError(code, options);
}
```

```typescript
// apps/api/src/plugins/errorHandler.ts
// ✅ DO: Handler centralisé utilisant AppError

import { Elysia } from 'elysia';
import { AppError, ErrorCodes, errorFromCode } from '@mio/shared';

export const errorHandler = new Elysia({ name: 'errorHandler' })
  .onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        error: error.message,
        code: error.code,
        name: error.name,
        diagnoses: error.diagnoses,
      };
    }

    // Validation errors from Elysia
    if (error instanceof Error && error.name === 'ValidationError') {
      const validationError = errorFromCode(ErrorCodes.ValidationError);
      set.status = validationError.statusCode;
      return {
        error: validationError.message,
        code: validationError.code,
        details: error.message,
      };
    }

    // Unexpected errors
    console.error('Unexpected error:', error);
    const internalError = errorFromCode(ErrorCodes.InternalError);
    set.status = internalError.statusCode;
    return {
      error: internalError.message,
      code: internalError.code,
    };
  });
```

---

## 🔄 Patterns Spécifiques

### Services avec Injection de Dépendances

```typescript
// apps/api/src/services/llm/llm.service.types.ts
// ✅ Interface définie localement au service

import type { ChildProfile, EnrichedConcept, StoryScript } from '@mio/shared';

export interface ILLMService {
  enrichStory(params: { prompt: string; profile: ChildProfile }): Promise<EnrichedConcept>;
  generateScript(params: { concept: EnrichedConcept; profile: ChildProfile }): Promise<StoryScript>;
}
```

```typescript
// apps/api/src/services/llm/llm.service.ts
// ✅ Factory pattern avec interface locale

import type { ILLMService } from './llm.service.types';
import { openaiService } from './openai';
import { anthropicService } from './anthropic';

export function createLLMService(provider: 'openai' | 'anthropic'): ILLMService {
  switch (provider) {
    case 'openai':
      return openaiService;
    case 'anthropic':
      return anthropicService;
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

// Usage
const llm = createLLMService(process.env.LLM_PROVIDER as 'openai' | 'anthropic');
```

### Cache avec Upstash Redis

```typescript
// apps/api/src/services/cache/redis.ts
// ✅ Pattern cache-aside

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export const cache = {
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T> {
    // Try cache first
    const cached = await redis.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    const fresh = await fetcher();
    await redis.set(key, fresh, { ex: ttlSeconds });
    return fresh;
  },

  async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};

// Usage
const story = await cache.getOrSet(
  `story:${id}`,
  () => storyRepository.findById(id),
  3600
);
```

### Workflow Upstash avec Retry

```typescript
// apps/api/src/workflows/storyGeneration.ts
// ✅ Steps atomiques, idempotents

export const { POST } = serve<StoryGenerationPayload>(
  async (context) => {
    const { storyId } = context.requestPayload;

    // Chaque step est atomique et peut être retry indépendamment
    const script = await context.run('generate-script', async () => {
      // Vérifier si déjà fait (idempotence)
      const existing = await storyRepository.findById(storyId);
      if (existing?.script) {
        return existing.script;
      }

      const result = await llmService.generateScript(/* ... */);
      await storyRepository.update(storyId, { script: result });
      return result;
    });

    // Step suivant utilise le résultat du précédent
    const voices = await context.run('generate-voices', async () => {
      // ...
    });

    // ...
  },
  {
    retries: 3,
    // Chaque step retry individuellement
  }
);
```

---

## 🧪 Tests

### Stack de Tests

| Outil | Usage |
|-------|-------|
| **bun:test** | Test runner natif Bun (Jest-compatible) |
| **Testcontainers** | Containers Docker pour PostgreSQL et Redis |
| **packages/test-utils** | Helpers partagés pour le setup des tests |

### Structure des Tests

```
mio/
├── packages/
│   └── test-utils/              # Helpers partagés
│       ├── src/
│       │   ├── containers/
│       │   │   ├── postgres.ts  # Setup PostgreSQL container
│       │   │   └── redis.ts     # Setup Redis container
│       │   ├── fixtures/
│       │   │   ├── profiles.ts  # Fixtures profils enfants
│       │   │   └── stories.ts   # Fixtures histoires
│       │   ├── mocks/
│       │   │   ├── llm.ts       # Mock service LLM
│       │   │   ├── elevenlabs.ts# Mock ElevenLabs
│       │   │   └── storage.ts   # Mock Supabase Storage
│       │   └── index.ts
│       └── project.json
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── routes/
│   │       │   └── __tests__/   # Tests routes
│   │       ├── usecases/
│   │       │   └── __tests__/   # Tests use cases
│   │       └── services/
│   │           └── __tests__/   # Tests services
│   └── web/
│       └── src/
│           ├── components/
│           │   └── __tests__/   # Tests composants
│           └── hooks/
│               └── __tests__/   # Tests hooks
```

### Convention de Nommage

```bash
# Fichiers de tests
*.test.ts      # Tests unitaires
*.spec.ts      # Tests d'intégration
*.e2e.ts       # Tests end-to-end (futur)
```

### API bun:test

```typescript
import { describe, test, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';

describe('StoryService', () => {
  beforeAll(async () => {
    // Setup une fois avant tous les tests
  });

  afterAll(async () => {
    // Cleanup après tous les tests
  });

  beforeEach(() => {
    // Reset avant chaque test
  });

  test('should create a story', async () => {
    const result = await createStory(input);
    expect(result.id).toBeDefined();
    expect(result.status).toBe('draft');
  });

  test.skip('skipped test', () => {});
  test.todo('todo test');
});
```

### Helpers Testcontainers

```typescript
// packages/test-utils/src/containers/postgres.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';

let container: StartedPostgreSqlContainer | null = null;
let client: Client | null = null;

export async function setupPostgres() {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('test_db')
    .withUsername('test')
    .withPassword('test')
    .start();

  client = new Client({
    connectionString: container.getConnectionUri(),
  });
  await client.connect();

  const db = drizzle(client);

  // Appliquer les migrations
  await migrate(db, { migrationsFolder: './packages/db/migrations' });

  return { db, connectionString: container.getConnectionUri() };
}

export async function teardownPostgres() {
  if (client) {
    await client.end();
    client = null;
  }
  if (container) {
    await container.stop();
    container = null;
  }
}

export async function cleanupTables(db: DrizzleDb) {
  // Truncate toutes les tables entre les tests
  await db.execute(sql`TRUNCATE child_profiles, stories, story_segments, generation_jobs CASCADE`);
}
```

```typescript
// packages/test-utils/src/containers/redis.ts
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Redis } from '@upstash/redis';

let container: StartedTestContainer | null = null;

export async function setupRedis() {
  container = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(6379);

  // Note: Pour les tests, on utilise ioredis directement au lieu d'Upstash
  const redis = new Redis({
    url: `redis://${host}:${port}`,
  });

  return { redis, host, port };
}

export async function teardownRedis() {
  if (container) {
    await container.stop();
    container = null;
  }
}

export async function flushRedis(redis: Redis) {
  await redis.flushall();
}
```

### Utilisation dans les Tests

```typescript
// apps/api/src/usecases/__tests__/createStory.test.ts
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { setupPostgres, teardownPostgres, cleanupTables } from '@mio/test-utils';
import { createStory } from '../createStory';
import { profileFixture } from '@mio/test-utils/fixtures';

describe('createStory', () => {
  let db: DrizzleDb;

  beforeAll(async () => {
    const setup = await setupPostgres();
    db = setup.db;
  });

  afterAll(async () => {
    await teardownPostgres();
  });

  beforeEach(async () => {
    await cleanupTables(db);
  });

  test('should create a story with valid input', async () => {
    // Arrange
    const profile = await db.insert(childProfiles).values(profileFixture()).returning();

    // Act
    const story = await createStory({
      childProfileId: profile[0].id,
      prompt: 'Un dragon qui a peur du noir',
    }, { storyRepo, profileRepo });

    // Assert
    expect(story.id).toBeDefined();
    expect(story.status).toBe('draft');
    expect(story.initialPrompt).toBe('Un dragon qui a peur du noir');
  });

  test('should throw NotFoundError if profile does not exist', async () => {
    await expect(
      createStory({
        childProfileId: '00000000-0000-0000-0000-000000000000',
        prompt: 'Test',
      }, { storyRepo, profileRepo })
    ).rejects.toThrow('Child profile not found');
  });
});
```

### Mocks pour Services Externes

```typescript
// packages/test-utils/src/mocks/llm.ts
import { mock } from 'bun:test';
import type { EnrichedConcept, StoryScript } from '@mio/shared';
import type { ILLMService } from 'apps/api/src/services/llm/llm.service.types';

export function createMockLLMService(): ILLMService {
  return {
    enrichStory: mock(async () => ({
      title: 'Le Dragon Timide',
      mainCharacter: { name: 'Flamme', description: 'Un petit dragon' },
      // ... autres champs
    } as EnrichedConcept)),

    generateScript: mock(async () => ({
      metadata: { title: 'Le Dragon Timide', estimatedDuration: 300 },
      segments: [
        { id: 'seg_1', type: 'narration', content: { text: 'Il était une fois...' } },
      ],
    } as StoryScript)),
  };
}

// packages/test-utils/src/mocks/elevenlabs.ts
import type { IAudioGenerator } from 'apps/api/src/services/audio/audio.service.types';

export function createMockElevenLabsService(): IAudioGenerator {
  return {
    generateSpeech: mock(async () => ({
      buffer: Buffer.from('fake-audio'),
      duration: 5000,
    })),

    generateSFX: mock(async () => ({
      buffer: Buffer.from('fake-sfx'),
      duration: 2000,
    })),
  };
}
```

### Fixtures

```typescript
// packages/test-utils/src/fixtures/profiles.ts
import type { ChildProfile } from '@mio/shared';

export function profileFixture(overrides: Partial<ChildProfile> = {}): Omit<ChildProfile, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    firstName: 'Emma',
    age: 7,
    gender: 'girl',
    preferences: {
      favoriteThemes: ['animals', 'magic'],
      avoidThemes: ['scary'],
      includeChildAsCharacter: true,
      preferredHeroGender: 'same',
      preferredStoryDuration: '5min',
      narratorVoicePreference: 'female',
      language: 'fr',
    },
    ...overrides,
  };
}

// packages/test-utils/src/fixtures/stories.ts
export function storyFixture(overrides: Partial<Story> = {}): Omit<Story, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    childProfileId: '00000000-0000-0000-0000-000000000001',
    initialPrompt: 'Un dragon qui a peur du noir',
    enrichedConcept: null,
    script: null,
    finalAudioUrl: null,
    duration: null,
    status: 'draft',
    ...overrides,
  };
}
```

### Conventions de Tests

```typescript
// ✅ DO: Nommer les tests clairement avec should/when
test('should create a story when valid input is provided', () => {});
test('should throw NotFoundError when profile does not exist', () => {});

// ✅ DO: Utiliser le pattern AAA (Arrange, Act, Assert)
test('should update story status', async () => {
  // Arrange
  const story = await createTestStory();

  // Act
  const updated = await updateStory(story.id, { status: 'generating' });

  // Assert
  expect(updated.status).toBe('generating');
});

// ✅ DO: Un assert principal par test (ou groupe cohérent)
test('should return complete story data', async () => {
  const story = await getStory(id);

  expect(story).toMatchObject({
    id: expect.any(String),
    status: 'ready',
    finalAudioUrl: expect.stringContaining('https://'),
  });
});

// ✅ DO: Isoler les tests (pas de dépendances entre tests)
beforeEach(async () => {
  await cleanupTables(db);
});

// ❌ DON'T: Tests qui dépendent de l'ordre d'exécution
// ❌ DON'T: Tests avec des timeouts hardcodés (utiliser les mocks)
// ❌ DON'T: Tests qui appellent des services externes réels
```

### Commandes de Test

```bash
# Lancer tous les tests
bun test

# Lancer les tests d'un package spécifique
nx run api:test
nx run shared:test
nx run db:test

# Lancer avec couverture
bun test --coverage

# Lancer en mode watch
bun test --watch

# Lancer les tests correspondant à un pattern
bun test --test-name-pattern "createStory"

# Lancer un fichier spécifique
bun test ./apps/api/src/usecases/__tests__/createStory.test.ts

# Mode CI (quiet, bail on first failure)
AGENT=1 bun test --bail
```

### Intégration CI

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun test --coverage
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
```

---

## 📝 Commandes Utiles

```bash
# Développement
nx serve api                    # Lancer l'API
nx serve web                    # Lancer le frontend
nx run-many -t serve -p api web # Lancer les deux

# Database
nx run db:generate              # Générer les migrations
nx run db:push                  # Appliquer les migrations (dev)
nx run db:migrate               # Appliquer les migrations (prod)
nx run db:studio                # Ouvrir Drizzle Studio

# Build & Deploy
nx run-many -t build            # Build tout
nx run api:docker-build         # Build image Docker API
nx run web:deploy               # Déployer sur Vercel
nx run api:deploy               # Déployer sur Scaleway

# Tests
nx run-many -t test             # Tous les tests
nx run api:test                 # Tests API uniquement
nx run shared:test              # Tests shared uniquement

# Lint & Format
nx run-many -t lint             # Lint tout
nx format:write                 # Formater tout
```

---

## ⚠️ Points d'Attention

### Performance

1. **Cold starts Scaleway** : Prévoir ~2-5s de cold start. Utiliser le keep-alive si fréquence faible.
2. **FFmpeg mémoire** : Limiter à 1GB RAM, nettoyer les fichiers temp systématiquement.
3. **Supabase connections** : Utiliser le pooler pour les serverless functions.

### Sécurité

1. **Validation** : Toujours valider les inputs avec Typebox côté Elysia.
2. **Supabase RLS** : Activer Row Level Security sur les tables (préparer pour l'auth future).
3. **Secrets** : Jamais de secrets dans le code, utiliser les variables d'environnement.

### Coûts

1. **ElevenLabs** : ~$0.40/histoire, monitorer l'usage.
2. **Cache audio** : Essentiel pour réduire les coûts, vérifier le hit rate.
3. **Upstash Workflow** : Facturation par exécution, optimiser le nombre de steps.

---

## 🚀 Getting Started

```bash
# 1. Cloner et installer
git clone <repo>
cd mio
bun install

# 2. Configurer les variables d'environnement
cp .env.example .env.local
# Remplir les valeurs

# 3. Setup la base de données
nx run db:push

# 4. Lancer en dev
nx run-many -t serve -p api web

# 5. Ouvrir
# Frontend: http://localhost:3000
# API: http://localhost:3001
# Swagger: http://localhost:3001/swagger
```
