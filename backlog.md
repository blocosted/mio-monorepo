# Backlog — Mio

**Dernière mise à jour:** Janvier 2026
**Légende:** `[ ]` Todo | `[~]` In Progress | `[x]` Done | `[!]` Blocked

---

## Résumé

| Phase | US | Tâches | Complétées |
|-------|-----|--------|------------|
| Phase 1 - MVP Minimal | 13 | 65 | 63 |
| Phase 2 - MVP Complet | 18 | 68 | 0 |
| Phase 3 - Production Ready | 16 | 58 | 0 |
| Phase 4 - Polish & Sécurité | 9 | 27 | 0 |
| **Total** | **56** | **218** | **63** |

---

## Phase 1 — MVP Minimal (Chemin Critique)

### Epic 1: Infrastructure & Setup

#### US-001: Configuration du Monorepo Nx [3/5] ✅
- [x] Initialiser le workspace Nx avec `bunx create-nx-workspace@latest`
- [x] Créer `apps/web` avec Next.js 15 App Router
- [x] Créer `apps/api` avec Elysia (template custom Bun)
- [x] Créer `packages/db` avec Drizzle ORM
- [x] Créer `packages/shared` pour types/constantes
- [x] Configurer les alias TypeScript (`@mio/*`)
- [x] Configurer ESLint partagé (nx.json)
- [x] Configurer Prettier partagé (.prettierrc)
- [x] Tester `nx serve api` et `nx serve web`
- [x] Tester `nx run-many -t build`

#### US-002: Configuration base de données Supabase [3/5] ✅
- [x] Créer projet Supabase (dashboard)
- [x] Récupérer DATABASE_URL et configurer `.env`
- [x] Installer `drizzle-orm` et `drizzle-kit` dans packages/db
- [x] Centraliser la connexion DB **server-only** via `packages/shared/src/server/connections/db.ts` (factory Drizzle + pool postgres)
- [x] Créer schema `child_profiles` (id, firstName, age, gender, preferences, timestamps)
- [x] Créer schema `stories` (id, childProfileId, initialPrompt, enrichedConcept, script, finalAudioUrl, duration, status, timestamps)
- [x] Créer schema `story_segments` (id, storyId, order, type, content, timing, audioUrl, audioDuration)
- [x] Créer schema `audio_assets` (id, type, promptHash, url, duration, usageCount, cost)
- [x] Créer schema `generation_jobs` (id, storyId, status, currentStep, progress, result, error, timestamps)
- [x] Définir les relations Drizzle entre tables
- [x] Créer `drizzle.config.ts`
- [x] Tester `nx run db:generate` et `nx run db:push`

#### US-003: Configuration Supabase Storage [2/5] ✅
- [x] Créer bucket `audio` sur Supabase Storage (via CLI `s3:setup`)
- [x] Configurer policies publiques pour lecture
- [x] Créer `apps/api/src/services/storage/storage.service.ts`
- [x] Encapsuler le client **server-only** dans `packages/shared/src/server/connections/storage.ts` (Bun `S3Client`)
- [x] Déclarer les variables `S3_*` dans `packages/shared/src/constants/environment.constants.ts` + `env.template`
- [x] Implémenter `upload(file: Buffer, path: string): Promise<UploadResult>`
- [x] Implémenter `download(path: string): Promise<Buffer>`
- [x] Implémenter `delete(path: string): Promise<void>`
- [x] Implémenter `deleteMany(paths: string[]): Promise<void>`
- [x] Implémenter `exists(path: string): Promise<boolean>`
- [x] Implémenter `getPublicUrl(path: string): string`
- [x] Tester upload/download d'un fichier audio

#### US-004: Configuration Redis (Bun) [4/5]
- [ ] Créer instance Upstash Redis (dashboard) (prod)
- [ ] Récupérer l'URL **TLS** (format `rediss://...`) et la définir dans `REDIS_URL`
- [x] Encapsuler Redis **server-only** dans `packages/shared/src/server/connections/redis.ts` (Bun `RedisClient`)
- [x] Supprimer `@upstash/redis` et le code d'adaptation de tests
- [x] Implémenter cache-aside (`getOrSet`) + TTL dans `CacheService`
- [x] Passer les tests cache/job-progress/audio-cache sur un vrai Redis (Docker)
- [x] Standardiser la config via `REDIS_URL` (et fallback `REDIS_HOST/PORT/PASSWORD`)

#### US-007: API Elysia de base [2/5] ✅
- [x] Créer `apps/api/src/index.ts` avec Elysia
- [x] Installer `@elysiajs/swagger` et configurer
- [x] Installer `@elysiajs/cors` et configurer
- [x] Créer `apps/api/src/plugins/errorHandler.ts`
- [x] Créer structure `handlers/`, `services/`, `ioc/` (les endpoints HTTP Elysia vivent dans `handlers/`) + infrastructure **server-only** dans `packages/shared/src/server/`
- [x] Créer `apps/api/src/handlers/index.ts` pour aggregation
- [x] Exporter `type App = typeof app` pour Eden
- [x] Tester Swagger UI sur `http://localhost:3001/swagger`

#### US-009: Infrastructure de Tests [3/5] ✅
- [x] Test utils créés dans `apps/api/src/tests/` (Docker natif au lieu de testcontainers pour compatibilité Bun)
- [x] Implémenter `setupDatabase()` avec PostgreSQL 15 container (via Docker natif)
- [x] Implémenter cleanup containers automatique (afterAll dans preload)
- [x] Implémenter `cleanTestPostgresData(db)` pour truncate entre tests
- [x] Implémenter `setupRedis()` avec Redis 7 container (via Docker natif)
- [x] Implémenter `cleanTestRedisData()` pour flush entre tests
- [x] Configurer `bun test` globalement (via `bunfig.toml` + preload)
- [x] Migrations automatiques au démarrage des tests
- [x] Configuration silencieuse de la DB pour réduire le bruit des logs
- [ ] Créer fixtures de base: `profileFixture()`, `storyFixture()` (à faire quand nécessaire)
- [ ] Créer mocks de base: `createMockLLMService()`, etc. (à faire quand nécessaire)
- [x] Target `test` dans `apps/api/project.json` fonctionnel

---

### Epic 2: Gestion des Profils (Backend only pour Phase 1)

#### US-010: Création d'un profil enfant (Backend) [2/5] ✅
- [x] Créer `apps/api/src/handlers/profiles/profiles.handlers.ts` (handlers)
- [x] Définir schema Typebox pour POST body (`profiles.handlers.types.ts`)
- [x] Implémenter validation firstName (1-50 chars)
- [x] Implémenter validation age (3-12)
- [x] Implémenter validation gender (boy/girl/neutral)
- [x] Implémenter preferences optionnelles (JSON)
- [x] Créer `apps/api/src/services/profiles/` (service + store layer)
- [x] Implémenter insertion DB via Drizzle (`profiles.service.store.ts`)
- [x] Retourner profil créé avec 201
- [x] Tester via Swagger (POST /profiles, GET /profiles/:id, PATCH, DELETE)
- [x] **Tests:** Créer `apps/api/src/services/profiles/__tests__/profiles.service.test.ts`
- [x] **Tests:** Test création réussie avec données valides
- [x] **Tests:** Test CRUD complet (create, getById, getAll, update, delete)
- [x] **Tests:** 17 tests couvrant tous les cas

---

### Epic 3: Création d'Histoire (Backend only pour Phase 1)

#### US-020: Création d'une histoire avec prompt (Backend) [2/5] ✅
- [x] Créer `apps/api/src/handlers/stories/stories.handlers.ts`
- [x] Définir schema Typebox pour POST body
- [x] Implémenter validation childProfileId (UUID)
- [x] Implémenter validation prompt (3-500 chars)
- [x] Créer `apps/api/src/services/stories/stories.service.ts` (logique de création)
- [x] Vérifier existence du profil enfant
- [x] Créer histoire avec status='draft'
- [x] Retourner histoire créée avec 201
- [x] Tester (via tests handlers Elysia / Eden)
- [x] **Tests:** Créer `apps/api/src/services/stories/__tests__/stories.service.test.ts`
- [x] **Tests:** Test création réussie avec profil valide
- [x] **Tests:** Test erreur NotFoundError si profil inexistant
- [x] **Tests:** Test validation prompt (trop court, trop long)

#### US-022: Service d'enrichissement LLM (Backend) [4/5] ✅
- [x] Créer `apps/api/src/services/llm/llm.service.types.ts` (interfaces service)
- [x] Créer `apps/api/src/services/llm/openai.ts`
- [x] Installer `openai` SDK
- [x] Déclarer `ILLMService` dans `apps/api/src/services/llm/llm.service.types.ts` (pas dans `packages/shared`)
- [x] Implémenter `enrichStory(story, profile): Promise<EnrichedConcept>`
- [x] Créer system prompt avec variables Handlebars
- [x] Intégrer profil enfant (prénom, âge, genre)
- [x] Intégrer thèmes favoris/évités
- [x] Adapter vocabulaire selon âge (very_simple/simple/medium/advanced)
- [x] Parser réponse JSON avec validation
- [x] Gérer erreurs API (rate limit, timeout)
- [x] Créer `apps/api/src/services/llm/anthropic.ts` (optionnel)
- [x] Tester enrichissement avec prompt simple
- [x] **Tests:** Créer `apps/api/src/services/llm/__tests__/enrichment.test.ts`
- [x] **Tests:** Test parsing JSON réponse LLM (avec mock)
- [x] **Tests:** Test adaptation vocabulaire selon âge (4 ans vs 10 ans)
- [x] **Tests:** Test exclusion thèmes à éviter
- [x] **Tests:** Test intégration prénom enfant

---

### Epic 5: Génération Script (Backend only pour Phase 1)

#### US-040: Service de génération de script (Backend) [5/5] ✅
- [x] Implémenter `generateScript(enrichedConcept, answers, profile): Promise<StoryScript>`
- [x] Créer system prompt avec structure narrative complète
- [x] Définir structure segments (narration, dialogue, pause, sound_effect, music_change)
- [x] Implémenter règles de vocabulaire par niveau
- [x] Générer timing pour chaque segment (pauseBefore, pauseAfter)
- [x] Spécifier émotions pour les dialogues
- [x] Décrire effets sonores en langage naturel
- [x] Calculer durée estimée
- [x] Valider output JSON contre schema StoryScript
- [x] Définir/compléter les interfaces `StoryScript` et `StorySegment` dans `packages/shared/src/models/` (modèles de domaine)
- [x] Tester génération avec concept enrichi
- [x] **Tests:** Créer `apps/api/src/services/llm/__tests__/scriptGeneration.test.ts`
- [x] **Tests:** Test structure segments valide (avec mock)
- [x] **Tests:** Test tous types de segments présents
- [x] **Tests:** Test calcul durée estimée
- [x] **Tests:** Test validation JSON output

---

### Epic 6: Synthèse Audio (Minimal pour Phase 1)

#### US-050: Service ElevenLabs TTS (Backend) [4/5]
- [ ] Installer SDK ElevenLabs ou utiliser fetch
- [ ] Créer `apps/api/src/services/audio/elevenLabs.ts`
- [ ] Configurer ELEVENLABS_API_KEY
- [ ] Créer interface `IAudioGenerator` dans `apps/api/src/services/audio/audio.service.types.ts` (pas dans `packages/shared`)
- [ ] Implémenter `generateSpeech({ text, voiceId, emotion }): Promise<AudioResult>`
- [ ] Créer mapping émotions -> voice settings
- [ ] Créer mapping personnages -> voiceIds
- [ ] Configurer voices par défaut (narrator, childHero, wiseCharacter, villain, comedic)
- [ ] Gérer rate limits (429)
- [ ] Gérer erreurs API
- [ ] Retourner buffer audio + durée
- [ ] Tester génération voix simple
- [ ] **Tests:** Créer `apps/api/src/services/audio/__tests__/elevenLabs.test.ts`
- [ ] **Tests:** Test mapping émotions -> voice settings
- [ ] **Tests:** Test sélection voix par personnage
- [ ] **Tests:** Test gestion erreur rate limit (avec mock)
- [ ] **Tests:** Test retry sur erreur temporaire

---

### Epic 7: Mixage Audio (Minimal pour Phase 1)

#### US-060: Service FFmpeg Mixer (Backend) [5/5]
- [ ] Installer `fluent-ffmpeg` et `@types/fluent-ffmpeg`
- [ ] Vérifier FFmpeg installé sur la machine
- [ ] Créer `apps/api/src/services/audio/ffmpegMixer.ts`
- [ ] Implémenter `mixStory(params): Promise<Buffer>`
- [ ] Créer workdir temporaire (`/tmp/story-{id}/`)
- [ ] Télécharger tous les fichiers audio dans workdir
- [ ] Générer fichiers silence (.wav) pour les pauses
- [ ] Créer concat.txt pour timeline vocale
- [ ] Concaténer voix avec `ffmpeg -f concat`
- [ ] Ajouter musique de fond avec volume réduit (0.15)
- [ ] Implémenter sidechain compression (ducking)
- [ ] Ajouter ambiance en loop avec acrossfade
- [ ] Insérer SFX aux timings corrects avec adelay
- [ ] Mixer toutes les pistes avec amix
- [ ] Appliquer normalisation loudnorm (I=-16, TP=-1.5)
- [ ] Exporter MP3 192kbps, 44.1kHz, stereo
- [ ] Nettoyer workdir temporaire
- [ ] Tester mixage avec fichiers audio de test
- [ ] **Tests:** Créer `apps/api/src/services/audio/__tests__/ffmpegMixer.spec.ts` (intégration)
- [ ] **Tests:** Créer fichiers audio de test (fixtures .wav)
- [ ] **Tests:** Test création timeline vocale avec pauses
- [ ] **Tests:** Test calcul durées correctes
- [ ] **Tests:** Test nettoyage workdir après mixage
- [ ] **Tests:** Test gestion erreur FFmpeg manquant

#### US-063: Step workflow - Upload et finalisation (Backend) [3/5]
- [ ] Créer step `finalize` dans le workflow
- [ ] Uploader buffer audio vers Supabase Storage
- [ ] Générer path: `stories/{storyId}/final.mp3`
- [ ] Mettre à jour story.finalAudioUrl
- [ ] Mettre à jour story.duration
- [ ] Mettre à jour story.status = 'ready'
- [ ] Mettre à jour job.status = 'completed'
- [ ] Mettre à jour job.progress = 100
- [ ] Mettre à jour job.result = { audioUrl, duration }
- [ ] Nettoyer fichiers temporaires
- [ ] Tester upload et finalisation
- [ ] **Tests:** Créer `apps/api/src/workflows/__tests__/finalize.test.ts`
- [ ] **Tests:** Test upload réussi (avec mock Storage)
- [ ] **Tests:** Test mise à jour statuts story et job
- [ ] **Tests:** Test cleanup fichiers temporaires

---

## Phase 2 — MVP Complet (Interface Utilisateur)

### Epic 1: Infrastructure (Suite)

#### US-005: Configuration Upstash Workflow [3/5]
- [ ] Installer `@upstash/workflow`
- [ ] Créer `apps/api/src/workflows/storyGeneration.ts`
- [ ] Définir payload type `StoryGenerationPayload`
- [ ] Configurer endpoint `/api/workflows/story`
- [ ] Implémenter steps atomiques (fetch-story, generate-script, generate-voices, etc.)
- [ ] Configurer retries (3 par défaut)
- [ ] Implémenter idempotence par step
- [ ] Tester workflow complet

#### US-008: Client Eden type-safe [2/5]
- [ ] Installer `@elysiajs/eden` dans apps/web
- [ ] Créer `apps/web/src/lib/api.ts`
- [ ] Configurer URL API via `NEXT_PUBLIC_API_URL`
- [ ] Exporter client `api` typé
- [ ] Créer helpers pour gestion erreurs
- [ ] Tester appel API depuis Next.js

---

### Epic 2: Gestion des Profils (Frontend)

#### US-011: Page de création de profil (Frontend) [3/5]
- [ ] Créer `apps/web/src/app/(app)/profiles/new/page.tsx`
- [ ] Installer et configurer react-hook-form
- [ ] Créer composant `ProfileForm` multi-étapes
- [ ] Étape 1: Prénom + Âge
- [ ] Étape 2: Genre (icônes boy/girl/neutral)
- [ ] Étape 3: Thèmes favoris (grille visuelle)
- [ ] Étape 4: Thèmes à éviter
- [ ] Étape 5: Préférences (durée, voix, langue)
- [ ] Implémenter navigation entre étapes
- [ ] Implémenter validation par étape
- [ ] Soumettre formulaire via Eden
- [ ] Rediriger vers liste profils après succès
- [ ] Ajouter animations de transition

#### US-012: Liste des profils (Backend) [1/5]
- [ ] Ajouter GET `/profiles` dans `apps/api/src/handlers/profiles/profiles.handlers.ts`
- [ ] Implémenter query Drizzle avec orderBy createdAt desc
- [ ] Retourner liste des profils
- [ ] Tester via Swagger

#### US-013: Page de liste des profils (Frontend) [2/5]
- [ ] Créer `apps/web/src/app/(app)/profiles/page.tsx`
- [ ] Créer composant `ProfileCard`
- [ ] Afficher avatar généré (initiales ou DiceBear)
- [ ] Afficher prénom et âge
- [ ] Ajouter bouton "Créer une histoire"
- [ ] Ajouter bouton "Ajouter un profil" si liste vide
- [ ] Créer composant `EmptyState`
- [ ] Implémenter grille responsive

#### US-014: Détail et édition d'un profil (Backend) [2/5]
- [ ] Ajouter GET `/profiles/:id` avec histoires associées
- [ ] Ajouter PATCH `/profiles/:id` pour mise à jour partielle
- [ ] Valider champs modifiés
- [ ] Retourner 404 si profil inexistant
- [ ] Tester via Swagger

#### US-015: Page de détail et édition d'un profil (Frontend) [2/5]
- [ ] Créer `apps/web/src/app/(app)/profiles/[id]/page.tsx`
- [ ] Afficher informations du profil
- [ ] Afficher histoires récentes (3-5)
- [ ] Créer `apps/web/src/app/(app)/profiles/[id]/edit/page.tsx`
- [ ] Pré-remplir formulaire avec données existantes
- [ ] Soumettre modification via PATCH
- [ ] Ajouter bouton retour

---

### Epic 3: Création d'Histoire (Frontend)

#### US-021: Page d'input initial (Frontend) [3/5]
- [ ] Créer `apps/web/src/app/(app)/create/page.tsx`
- [ ] Créer sélecteur de profil enfant (dropdown ou cards)
- [ ] Créer zone de texte grande et stylée
- [ ] Ajouter placeholder inspirant
- [ ] Créer grille de suggestions de thèmes cliquables
- [ ] Implémenter compteur de caractères (max 500)
- [ ] Créer bouton "C'est parti!" avec animation
- [ ] Appliquer design enfant-friendly (couleurs, arrondis, ombres)
- [ ] Soumettre via POST /stories
- [ ] Rediriger vers page enrichissement

#### US-023: Endpoint d'enrichissement (Backend) [2/5]
- [ ] Ajouter POST `/stories/:id/enrich` dans `apps/api/src/handlers/stories/stories.handlers.ts`
- [ ] Récupérer histoire avec profil enfant
- [ ] Appeler service enrichissement LLM
- [ ] Sauvegarder enrichedConcept dans story
- [ ] Retourner concept enrichi
- [ ] Tester via Swagger

#### US-024: Page d'enrichissement (Frontend) [3/5]
- [ ] Créer `apps/web/src/app/(app)/create/[storyId]/enrich/page.tsx`
- [ ] Afficher loader pendant enrichissement
- [ ] Afficher titre proposé en grand
- [ ] Afficher personnage principal avec description
- [ ] Afficher cadre/setting avec illustration
- [ ] Afficher badge de ton (drôle, aventurier, etc.)
- [ ] Créer bouton "Ça me plaît!" animé
- [ ] Gérer état "enriching" avec animations
- [ ] Rediriger vers questions après validation

---

### Epic 4: Questions Guidées

#### US-030: Génération des questions guidées (Backend) [3/5]
- [ ] Créer service de génération de questions
- [ ] Définir types de questions possibles
- [ ] Adapter questions à l'âge de l'enfant
- [ ] Générer 2-4 options visuelles par question
- [ ] Retourner format JSON (id, texte, options)
- [ ] Intégrer dans endpoint /stories/:id/enrich ou créer endpoint dédié

#### US-031: Page des questions guidées (Frontend) [3/5]
- [ ] Créer `apps/web/src/app/(app)/create/[storyId]/questions/page.tsx`
- [ ] Implémenter carrousel de questions
- [ ] Créer composant `QuestionCard`
- [ ] Créer composant `OptionCard` cliquable
- [ ] Afficher illustrations/icônes pour chaque option
- [ ] Implémenter animations de transition
- [ ] Afficher indicateur de progression
- [ ] Ajouter bouton retour à question précédente
- [ ] Soumettre réponses et lancer génération

#### US-032: Sauvegarde des réponses (Backend) [1/5]
- [ ] Ajouter gestion des réponses dans POST /stories/:id/generate
- [ ] Valider format des réponses (questionId, value)
- [ ] Sauvegarder dans story.answers
- [ ] Tester via Swagger

---

### Epic 5: Génération Script (Suite)

#### US-041: Endpoint de lancement de génération (Backend) [2/5]
- [ ] Ajouter POST `/stories/:id/generate`
- [ ] Valider présence des réponses
- [ ] Créer entrée dans generation_jobs
- [ ] Déclencher workflow Upstash
- [ ] Mettre à jour story.status = 'generating'
- [ ] Retourner jobId
- [ ] Tester via Swagger

#### US-042: Step workflow - Génération script (Backend) [3/5]
- [ ] Créer step `generate-script` dans workflow
- [ ] Vérifier si script existe déjà (idempotence)
- [ ] Récupérer concept enrichi et réponses
- [ ] Appeler service LLM génération script
- [ ] Sauvegarder script dans story
- [ ] Mettre à jour progression (10% -> 25%)
- [ ] Tester step isolé

---

### Epic 8: Lecture (Minimal)

#### US-070: Récupération d'une histoire complète (Backend) [2/5]
- [ ] Ajouter GET `/stories/:id` avec segments et profil
- [ ] Inclure URL audio si status='ready'
- [ ] Retourner 404 si inexistant
- [ ] Tester via Swagger

#### US-071: Player audio (Frontend) [4/5]
- [ ] Créer `apps/web/src/app/(app)/story/[id]/page.tsx`
- [ ] Installer Howler.js
- [ ] Créer composant `AudioPlayer`
- [ ] Implémenter bouton play/pause grand
- [ ] Implémenter barre de progression cliquable
- [ ] Afficher temps écoulé / durée totale
- [ ] Ajouter bouton retour 10s
- [ ] Ajouter contrôle volume
- [ ] Afficher titre de l'histoire
- [ ] Appliquer design enfant-friendly
- [ ] Gérer états loading/error

---

## Phase 3 — Production Ready

### Epic 6: Synthèse Audio (Complet)

#### US-051: Service ElevenLabs SFX (Backend) [3/5]
- [ ] Implémenter `generateSFX({ prompt, duration, promptInfluence })`
- [ ] Optimiser prompts pour ElevenLabs
- [ ] Configurer durée (0.5 - 22s)
- [ ] Intégrer cache Redis
- [ ] Retourner buffer audio
- [ ] Tester génération SFX

#### US-052: Service Suno pour la musique (Backend) [3/5]
- [ ] Créer `apps/api/src/services/audio/suno.ts`
- [ ] Configurer SUNO_API_KEY
- [ ] Implémenter `generateMusic({ mood, duration, instrumental })`
- [ ] Créer mapping mood -> prompts musicaux
- [ ] Toujours générer en instrumental
- [ ] Gérer durée max 2 min
- [ ] Implémenter looping pour durées plus longues
- [ ] Tester génération musique

#### US-053: Step workflow - Génération voix (Backend) [3/5]
- [ ] Créer step `generate-voices` dans workflow
- [ ] Filtrer segments narration/dialogue
- [ ] Générer en parallèle (max 5 concurrent)
- [ ] Sélectionner voix selon personnage et profil
- [ ] Mettre à jour progression (30% -> 55%)
- [ ] Stocker fichiers temporaires
- [ ] Tester step isolé

#### US-054: Step workflow - Génération SFX (Backend) [2/5]
- [ ] Créer step `generate-sfx` dans workflow
- [ ] Filtrer segments sound_effect
- [ ] Vérifier cache avant génération
- [ ] Générer SFX manquants
- [ ] Mettre en cache nouveaux SFX
- [ ] Mettre à jour progression (55% -> 65%)
- [ ] Tester step isolé

#### US-055: Step workflow - Génération musique (Backend) [2/5]
- [ ] Créer step `generate-music` dans workflow
- [ ] Déterminer mood depuis script
- [ ] Générer via Suno
- [ ] Adapter durée à l'histoire
- [ ] Mettre à jour progression (70% -> 80%)
- [ ] Tester step isolé

#### US-056: Step workflow - Génération ambiance (Backend) [2/5]
- [ ] Créer step `generate-ambiance` dans workflow
- [ ] Détecter setting depuis script
- [ ] Mapper setting -> prompt ambiance
- [ ] Générer via ElevenLabs SFX (30s)
- [ ] Mettre à jour progression (82% -> 85%)
- [ ] Tester step isolé

---

### Epic 7: Mixage Audio (Complet)

#### US-061: Création de la timeline vocale (Backend) [3/5]
- [ ] Créer fonction `createVoiceTimeline(segments, voiceFiles)`
- [ ] Générer fichiers silence de durées variées
- [ ] Créer fichier concat.txt avec séquence
- [ ] Respecter pauses avant/après segments
- [ ] Concaténer avec ffmpeg -f concat
- [ ] Tester timeline avec segments variés

#### US-062: Step workflow - Mixage final (Backend) [3/5]
- [ ] Créer step `mix-audio` dans workflow
- [ ] Appeler ffmpegMixer avec toutes les pistes
- [ ] Mettre à jour progression (88% -> 95%)
- [ ] Retourner buffer audio final
- [ ] Tester step isolé

---

### Epic 8: Lecture & Bibliothèque (Complet)

#### US-072: Bibliothèque d'histoires par profil (Backend) [2/5]
- [ ] Ajouter GET `/stories/profile/:profileId`
- [ ] Trier par date décroissante
- [ ] Filtrer par status (optionnel via query param)
- [ ] Retourner id, title, duration, status, createdAt
- [ ] Tester via Swagger

#### US-073: Page bibliothèque (Frontend) [3/5]
- [ ] Créer `apps/web/src/app/(app)/library/page.tsx`
- [ ] Créer grille d'histoires responsive
- [ ] Créer composant `StoryCard`
- [ ] Implémenter filtre par profil
- [ ] Afficher badge status (prêt, en cours, échec)
- [ ] Clic carte -> page player
- [ ] Créer état vide avec CTA

#### US-074: Suppression d'une histoire (Backend) [2/5]
- [ ] Ajouter DELETE `/stories/:id`
- [ ] Supprimer fichiers audio sur Supabase Storage
- [ ] Supprimer segments en cascade
- [ ] Supprimer histoire
- [ ] Retourner 204
- [ ] Tester via Swagger

---

### Epic 9: Progress Tracking

#### US-080: Stockage de la progression dans Redis (Backend) [2/5]
- [ ] Créer fonction `updateJobProgress(storyId, step, progress)`
- [ ] Stocker dans Redis `job:{storyId}:progress`
- [ ] Configurer TTL 1 heure
- [ ] Mettre à jour aussi table generation_jobs
- [ ] Tester stockage et récupération

#### US-081: Endpoint de polling du status (Backend) [2/5]
- [ ] Ajouter GET `/jobs/:jobId/status`
- [ ] Lire depuis Redis d'abord
- [ ] Fallback sur base de données
- [ ] Retourner step, progress, status, result
- [ ] Tester via Swagger

#### US-082: Endpoint SSE pour streaming du status (Backend) [3/5]
- [ ] Ajouter GET `/jobs/:jobId/stream` en SSE
- [ ] Utiliser generator function Elysia
- [ ] Envoyer event à chaque changement
- [ ] Fermer à 100% ou erreur
- [ ] Configurer intervalle vérification
- [ ] Tester avec EventSource

#### US-083: Hook useJobProgress (Frontend) [2/5]
- [ ] Créer `apps/web/src/hooks/useJobProgress.ts`
- [ ] Tenter SSE d'abord
- [ ] Fallback polling si SSE échoue
- [ ] Intervalle polling: 2s
- [ ] Retourner { progress, error, isComplete }
- [ ] Cleanup automatique
- [ ] Tester hook

#### US-084: Page de génération en cours (Frontend) [3/5]
- [ ] Créer `apps/web/src/app/(app)/create/[storyId]/generating/page.tsx`
- [ ] Intégrer useJobProgress
- [ ] Créer barre de progression animée
- [ ] Afficher étape en cours avec icône
- [ ] Définir labels étapes (Préparation, Script, Voix, etc.)
- [ ] Créer animation d'attente engageante
- [ ] Afficher messages encourageants
- [ ] Rediriger vers player à la fin
- [ ] Afficher erreur avec retry si échec

---

## Phase 4 — Polish & Sécurité

### Epic 1: Infrastructure (Déploiement)

#### US-006: Configuration Docker pour Scaleway [3/5]
- [ ] Créer `apps/api/Dockerfile`
- [ ] Base image `oven/bun:1.0-alpine`
- [ ] Installer FFmpeg via apk
- [ ] Optimiser avec multi-stage build
- [ ] Créer script `nx run api:docker-build`
- [ ] Tester image localement
- [ ] Pousser vers registry Scaleway

---

### Epic 9: UX Avancée

#### US-085: Gestion des états de l'application (Frontend) [3/5]
- [ ] Installer Zustand
- [ ] Créer `apps/web/src/stores/appStore.ts`
- [ ] Définir états: IDLE, INPUT_COLLECTION, ENRICHING, etc.
- [ ] Implémenter transitions d'état
- [ ] Persister état dans localStorage
- [ ] Implémenter reprise après fermeture

#### US-086: Gestion des erreurs utilisateur (Frontend) [2/5]
- [ ] Créer composant `ErrorDisplay`
- [ ] Écrire messages d'erreur simples
- [ ] Ajouter bouton "Réessayer"
- [ ] Implémenter redirection support si persistant
- [ ] Logger erreurs pour debugging

#### US-087: Configuration PWA (Frontend) [2/5]
- [ ] Créer `apps/web/public/manifest.json`
- [ ] Installer et configurer next-pwa
- [ ] Créer icônes 192x192 et 512x512
- [ ] Définir theme_color et background_color
- [ ] Configurer mode standalone
- [ ] Créer splash screen
- [ ] Tester installation sur mobile

#### US-088: Loading states et skeletons (Frontend) [2/5]
- [ ] Créer composant `ProfileCardSkeleton`
- [ ] Créer composant `StoryCardSkeleton`
- [ ] Créer loading.tsx pour chaque route
- [ ] Créer composant `Spinner`
- [ ] Désactiver boutons pendant actions
- [ ] Ajouter feedback visuel sur clics

---

### Epic 10: Sécurité & Qualité

#### US-090: Filtrage de contenu (Backend) [3/5]
- [ ] Créer liste de mots/contenus interdits
- [ ] Créer service `contentFilter`
- [ ] Vérifier prompt initial avant enrichissement
- [ ] Ajouter instructions strictes dans system prompts
- [ ] Vérifier script généré avant audio
- [ ] Retourner erreur claire si contenu inapproprié
- [ ] Tester avec contenus limites

#### US-091: Validation des inputs (Backend) [2/5]
- [ ] Réviser tous les schemas Typebox
- [ ] Valider format UUIDs
- [ ] Implémenter limites de longueur
- [ ] Ajouter sanitization des inputs
- [ ] Améliorer messages d'erreur validation
- [ ] Tester avec inputs malformés

#### US-092: Retry et fallbacks (Backend) [2/5]
- [ ] Configurer retry LLM (3 tentatives)
- [ ] Configurer retry ElevenLabs (2 tentatives)
- [ ] Configurer retry FFmpeg (1 tentative)
- [ ] Implémenter backoff exponentiel
- [ ] Créer fallback histoire template
- [ ] Créer fallback voix en cache
- [ ] Logger erreurs pour monitoring
- [ ] Tester comportement retry

---

## Notes & Blockers

### Notes Générales
- Prioriser Phase 1 pour avoir un prototype fonctionnel rapidement
- ElevenLabs: ~$0.40/histoire, surveiller les coûts
- FFmpeg: Nécessite ~1GB RAM, attention aux limites serverless
- Supabase: Utiliser le pooler pour éviter les problèmes de connexions

### Blockers Actuels
_Aucun blocker identifié pour le moment_

### Décisions Techniques à Prendre
- [ ] Choix du provider LLM principal (OpenAI vs Anthropic)
- [ ] Stratégie de voix ElevenLabs (1 appel/segment vs groupé)
- [ ] Format de stockage des fichiers temporaires (local vs cloud)

---

## Historique des Mises à Jour

| Date | Modification |
|------|--------------|
| Janvier 2026 | Création initiale du backlog |
| 19 Janvier 2026 | US-003 complétée - Supabase Storage + Inversify DI |
| 20 Janvier 2026 | Refactor infra: `bun test` via preload, Redis via Bun, Storage via Bun S3 |