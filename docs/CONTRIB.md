# Guide de Contribution

**Dernière mise à jour:** 23 Janvier 2026

Ce guide couvre le workflow de développement pour contribuer au projet Mio.

---

## Prérequis

- **Bun** v1.2+ (runtime + package manager)
- **Node.js** v20+ (pour certains outils Nx)
- **Docker** (optionnel, pour services locaux)
- **Git**

---

## Setup Initial

### 1. Clone & Install

```bash
git clone <repo-url>
cd mio
bun install
```

### 2. Configuration Environnement

```bash
cp env.template .env.local
```

Remplir au minimum:
- `DATABASE_URL` (Supabase PostgreSQL)
- `REDIS_URL` (Upstash Redis ou local)
- `S3_*` (Supabase Storage S3)
- `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY`
- `ELEVENLABS_API_KEY`

Voir `docs/ENV.md` pour la référence complète.

### 3. Base de Données

```bash
# Générer les migrations
bun run db:generate

# Appliquer les migrations
bun run db:migrate

# Ou en dev: push direct du schéma
bun run db:push
```

### 4. Storage S3

```bash
# Créer les buckets
bun run s3:setup

# Vérifier
bun run s3:list
```

---

## Développement Local

### Lancer les Services

**API + Frontend:**
```bash
bun run dev
```

**API seulement:**
```bash
bun run dev:api
```

**Frontend seulement:**
```bash
bun run dev:web
```

### URLs Locales

- **API:** http://localhost:3001
- **Frontend:** http://localhost:3000
- **Swagger:** http://localhost:3001/swagger

---

## Workflow de Développement

### 1. Branching

```bash
# Créer une feature branch
git checkout -b feature/my-feature

# Ou bugfix
git checkout -b fix/my-bugfix
```

### 2. Développement

**Itération rapide:**
1. Modifier le code
2. Auto-reload (API: Bun watch, Frontend: Next.js Fast Refresh)
3. Tester manuellement via Swagger ou frontend
4. Écrire/ajuster les tests

**Tests:**
```bash
# Tous les tests
bun test

# Tests API seulement
nx test api

# Tests avec coverage
bun test --coverage
```

### 3. Qualité Code

**Lint:**
```bash
bun run lint
```

**Format:**
```bash
# Check
bun run format:check

# Fix
bun run format
```

---

## Tester le Workflow Génération

### Test Enrichissement

```bash
nx run scripts:llm -- enrich-story \
  --prompt "A mysterious door in a tree" \
  --profile emilie
```

### Test Génération Script

```bash
nx run scripts:llm -- generate-script \
  --enrichInputFile .mio-data/<run-id>/input.json \
  --provider openai \
  --targetDurationMinutes 5
```

### Pipeline Complet (Local)

```bash
nx run scripts:pipeline -- full-story \
  --prompt "A mysterious door in a tree" \
  --profile emilie \
  --targetDurationMinutes 5 \
  --outputDir output/test-story/
```

### Dry Run (Inspecter Prompts)

```bash
nx run scripts:llm -- generate-script \
  --enrichInputFile .mio-data/<run-id>/input.json \
  --dryRun
```

---

## Structure du Projet

```
mio/
├── apps/
│   ├── api/           # API Elysia (backend)
│   │   ├── src/
│   │   │   ├── handlers/      # Routes HTTP
│   │   │   ├── services/      # Business logic
│   │   │   ├── repositories/  # Data access
│   │   │   ├── workflows/     # Upstash Workflow
│   │   │   └── ioc/          # Inversify container
│   │   └── bunfig.toml
│   └── web/           # Next.js (frontend)
├── packages/
│   ├── db/            # Drizzle ORM + migrations
│   ├── shared/        # Types + constants + server utils
│   ├── helpers/       # Env loader + utilities
│   └── scripts/       # CLI tools
├── docs/              # Documentation
├── roadmap/           # Méthode, epics, specs, décisions, veille, écoutes
│   ├── CONVENTIONS.md # Méthode de travail (référence unique)
│   ├── PRODUIT.md     # Vision + charte sonore
│   └── archive/       # Ancienne planification (janvier 2026)
└── CLAUDE.md          # Contexte projet
```

---

## Conventions de Code

### TypeScript

- **Types explicites** pour les interfaces publiques
- **Const assertions** pour les littéraux
- **Discriminated unions** pour les états
- Utiliser `environment.*` et `publicEnvironment.*` au lieu de `process.env`

### Immutabilité (CRITIQUE)

**TOUJOURS créer de nouveaux objets, JAMAIS muter:**

```typescript
// ❌ MAUVAIS: Mutation
function updateUser(user, name) {
  user.name = name;  // MUTATION!
  return user;
}

// ✅ BON: Immutabilité
function updateUser(user, name) {
  return {
    ...user,
    name,
  };
}
```

### Organisation Fichiers

- **Beaucoup de petits fichiers** > Quelques gros fichiers
- 200-400 lignes typique, 800 max
- Haute cohésion, faible couplage
- Organiser par feature/domain, pas par type

### Gestion d'Erreurs

```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', { error });
  throw new Error('Detailed user-friendly message');
}
```

### Validation

```typescript
import { t } from 'elysia';

// Elysia + Typebox
const schema = t.Object({
  email: t.String({ format: 'email' }),
  age: t.Integer({ minimum: 0, maximum: 150 }),
});
```

---

## Architecture Clean

```
PRESENTATION   → Next.js pages, components
APPLICATION    → Elysia routes, services
DOMAIN         → Shared primitives (@mio/shared/types)
INFRASTRUCTURE → Drizzle, S3, Redis
```

**Règle:** Les couches internes ne dépendent JAMAIS des couches externes.

---

## Types & Mappers

### Types Partagés (Primitives Only)

Dans `packages/shared/src/types/`:
- **Enums** (ex: `Gender`, `StoryDuration`)
- **Pas d'interfaces** (chaque couche définit les siennes)

### Types par Couche

| Couche | Fichier | Source |
|--------|---------|--------|
| Handlers | `*.handlers.types.ts` | Inféré depuis Typebox |
| Services | `*.service.types.ts` | Interfaces déclarées |
| Store | `*.store.ts` | Inféré depuis Drizzle |

### Mappers

```typescript
// Handler → Service
export function mapCreateBodyToInput(
  body: CreateProfileBody
): CreateProfileInput {
  return { ...body };
}

// Store → Service
export function mapDbProfileToServiceProfile(
  dbProfile: DbProfile
): ServiceProfile {
  return {
    id: dbProfile.id,
    firstName: dbProfile.first_name,
    // ...
  };
}
```

---

## Tests

### Convention

- `*.test.ts` → Tests unitaires
- `*.spec.ts` → Tests d'intégration

### Coverage Requis

**Minimum 80%** pour:
- Services
- Repositories
- Mappers
- Handlers (API)

### Exemple Test Service

```typescript
import { describe, test, expect } from 'bun:test';
import { ProfilesService } from './profiles.service';

describe('ProfilesService', () => {
  test('createProfile créer un profil valide', async () => {
    const service = new ProfilesService(mockStore);
    const input = { firstName: 'Emma', age: 7, ... };

    const profile = await service.create(input);

    expect(profile.firstName).toBe('Emma');
    expect(profile.id).toBeDefined();
  });
});
```

---

## Git Workflow

### Commits

Format: [Conventional Commits](https://www.conventionalcommits.org/)

```
feat: ajouter endpoint de génération d'histoires
fix: corriger validation âge profil
refactor: simplifier service LLM
docs: mettre à jour ENV.md
test: ajouter tests service profils
```

### Pull Requests

1. **Branch feature/fix depuis `main`**
2. **Développer + tester localement**
3. **Commit avec messages descriptifs**
4. **Push vers origin**
5. **Créer PR sur GitHub**
6. **Attendre review + CI**
7. **Merge après approbation**

---

## Modifier les Prompts LLM

### Localisation

- **Enrichissement:** `apps/api/src/services/llm/prompts/enrichment.prompts.ts`
- **Script:** `apps/api/src/services/llm/prompts/scriptGeneration.prompts.ts`

### Workflow

1. **Dry run pour voir l'état actuel:**
   ```bash
   nx run scripts:llm -- generate-script \
     --enrichInputFile .mio-data/<run-id>/input.json \
     --dryRun
   ```

2. **Modifier le prompt** dans `*.prompts.ts`

3. **Tester:**
   ```bash
   nx run scripts:llm -- generate-script \
     --enrichInputFile .mio-data/<run-id>/input.json
   ```

4. **Comparer output avant/après** dans `.mio-data/`

5. **Valider avec plusieurs profiles** (`--all`)

---

## Débogage

### Logs Détaillés

```bash
LOG_LEVEL=debug bun run dev:api
```

### Drizzle Studio

```bash
bun run db:studio
```

Ouvre une GUI sur http://localhost:4983 pour inspecter la DB.

### Swagger API

http://localhost:3001/swagger

Tester tous les endpoints manuellement.

---

## Bonnes Pratiques

### À FAIRE

- ✅ Lire la documentation (`docs/`)
- ✅ Écrire des tests (80%+ coverage)
- ✅ Utiliser immutabilité
- ✅ Valider les inputs
- ✅ Logger les erreurs avec contexte
- ✅ Commits atomiques et descriptifs
- ✅ Dry run pour tester prompts LLM

### À ÉVITER

- ❌ Committer `.env.local` ou `.mio-data/`
- ❌ Muter des objets/arrays
- ❌ Fichiers > 800 lignes
- ❌ Nested ternaries > 2 niveaux
- ❌ Hardcoder des valeurs (utiliser env)
- ❌ Console.log en production
- ❌ Commits vagues ("fix stuff")

---

## Ressources

- **Méthode:** `roadmap/CONVENTIONS.md`
- **Produit et charte sonore:** `roadmap/PRODUIT.md`
- **Index de la roadmap:** `roadmap/README.md` (régénéré par le skill `roadmap-keeper`)
- **Ancienne planification:** `roadmap/archive/` (voir `TRI-EXISTANT.md` pour ce qui a été conservé)
- **PRD:** `story-app-prd.md` (spec produit)
- **Docs:** `docs/` (référence)
- **CLAUDE.md:** Contexte pour Claude AI

---

## Support

Pour toute question:
1. Vérifier `docs/`
2. Inspecter le code existant
3. Tester en local avec dry run
4. Demander en PR/issue sur GitHub
