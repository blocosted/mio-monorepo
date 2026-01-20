# Roadmap — Mio

**Version:** 1.0.0
**Dernière mise à jour:** Janvier 2026
**Méthode:** Organisation par priorité MVP

---

## Vision

Permettre aux enfants (et leurs parents) de créer des histoires audio personnalisées et immersives en quelques minutes, avec une qualité de production professionnelle.

### Métriques de Succès
- Temps moyen de génération < 3 minutes pour une histoire de 5 minutes
- Taux de complétion du flow > 80%
- NPS parents > 50

---

## Vue d'Ensemble des Phases

| Phase | Objectif | User Stories | Complexité Totale |
|-------|----------|--------------|-------------------|
| **Phase 1** | MVP Minimal - Chemin critique | 13 US | 39 pts |
| **Phase 2** | MVP Complet - Interface utilisateur | 18 US | 42 pts |
| **Phase 3** | Production Ready - Features complètes | 16 US | 38 pts |
| **Phase 4** | Polish & Sécurité | 9 US | 18 pts |
| **Total** | | **56 US** | **137 pts** |

---

## Phase 1 — MVP Minimal (Chemin Critique)

> **Objectif:** Générer une histoire audio de bout en bout via API, sans interface

### US-001: Configuration du Monorepo Nx [Complexité: 3/5]

**En tant que** développeur,
**Je veux** une structure de monorepo Nx configurée avec les packages nécessaires,
**Afin de** pouvoir développer l'application de manière organisée et maintenable.

**Critères d'acceptation:**
- [x] Workspace Nx initialisé avec Bun comme runtime
- [x] Package `apps/web` configuré avec Next.js 15 (App Router)
- [x] Package `apps/api` configuré avec Elysia
- [x] Package `packages/db` configuré avec Drizzle
- [x] Package `packages/shared` pour les types et constantes partagées
- [x] Configuration ESLint/Prettier partagée
- [x] Scripts Nx pour serve, build, test fonctionnels

---

### US-002: Configuration base de données Supabase [Complexité: 3/5] ✅

**En tant que** développeur,
**Je veux** une base de données PostgreSQL configurée sur Supabase avec Drizzle ORM,
**Afin de** persister les données de l'application.

**Critères d'acceptation:**
- [x] Projet Supabase créé et configuré
- [x] Client Drizzle connecté à Supabase PostgreSQL
- [x] Schema initial avec tables: `child_profiles`, `stories`, `story_segments`, `audio_assets`, `generation_jobs`
- [x] Relations Drizzle définies entre les tables
- [x] Commandes `db:generate` et `db:push` fonctionnelles
- [x] Row Level Security préparée (désactivée pour MVP)

---

### US-003: Configuration Supabase Storage [Complexité: 2/5] ✅

**En tant que** développeur,
**Je veux** un bucket Supabase Storage configuré pour les fichiers audio,
**Afin de** stocker les histoires générées.

**Critères d'acceptation:**
- [x] Bucket `audio` créé sur Supabase Storage
- [x] Connexion Storage encapsulée dans `packages/shared/src/server/connections/storage.ts` (Bun `S3Client`, protocole S3 Supabase)
- [x] Variables S3 déclarées (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_ENDPOINT`)
- [x] Service `storageService` implémenté avec méthodes upload/download/delete/deleteMany/exists/getPublicUrl
- [x] URLs publiques accessibles pour la lecture audio
- [x] Configuration CORS pour le frontend

---

### US-004: Configuration Redis (Bun) [Complexité: 2/5]

**En tant que** développeur,
**Je veux** un cache Redis configuré (Upstash en prod, Redis local en dev/tests),
**Afin de** cacher les assets audio et suivre la progression des jobs.

**Critères d'acceptation:**
- [ ] Instance Upstash Redis créée (prod) + `REDIS_URL` configuré (TLS `rediss://...`)
- [x] Client Redis encapsulé dans `packages/shared/src/server/connections/redis.ts` (Bun `RedisClient`)
- [ ] Service `audioCache` avec méthodes get/set et TTL 30 jours
- [x] Pattern cache-aside implémenté (`getOrSet`)
- [ ] Stockage du progress des jobs dans Redis

---

### US-007: API Elysia de base [Complexité: 2/5] ✅

**En tant que** développeur,
**Je veux** un serveur API Elysia configuré avec les plugins essentiels,
**Afin d'** exposer les endpoints de l'application.

**Critères d'acceptation:**
- [x] Serveur Elysia sur port 3001
- [x] Plugin Swagger pour documentation automatique
- [x] Plugin CORS configuré
- [x] Plugin error handler centralisé
- [x] Structure handlers/services/usecases respectée (handlers = routes per CLAUDE.md)
- [x] Export du type `App` pour Eden

---

### US-009: Infrastructure de Tests [Complexité: 3/5] ✅

**En tant que** développeur,
**Je veux** une infrastructure de tests avec containers Docker pour PostgreSQL et Redis,
**Afin de** pouvoir écrire des tests unitaires et d'intégration fiables.

**Critères d'acceptation:**
- [x] Test utils dans `apps/api/src/tests/` (Docker natif pour compatibilité Bun)
- [x] Helper `setupDatabase()` avec PostgreSQL 15 container
- [x] Helper `setupRedis()` avec Redis 7 container
- [x] Helper `cleanTestPostgresData()` pour reset entre tests
- [x] Helper `cleanTestRedisData()` pour flush Redis
- [x] Cleanup automatique des containers (afterAll dans preload)
- [x] Configuration `bun test` (global) via `bunfig.toml` + preload Docker/migrations
- [x] Scripts Nx `nx run api:test` fonctionnel
- [ ] Fixtures de base (à créer quand nécessaire)
- [ ] Mocks de base (à créer quand nécessaire)

---

### US-010: Création d'un profil enfant (Backend) [Complexité: 2/5] ✅

**En tant que** parent,
**Je veux** pouvoir créer un profil pour mon enfant via l'API,
**Afin de** personnaliser les histoires générées.

**Critères d'acceptation:**
- [x] Endpoint POST `/profiles` créé (+ GET, PATCH, DELETE)
- [x] Validation Typebox: firstName (1-50 chars), age (3-12), gender (boy/girl/neutral)
- [x] Preferences optionnelles: thèmes favoris/évités, durée préférée, voix narrateur, langue
- [x] Profil sauvegardé en base de données via ProfilesStore + Drizzle
- [x] Retour du profil créé avec ID (201 Created)
- [x] **Tests:** 17 tests d'intégration (create, getById, getAll, update, delete)

---

### US-020: Création d'une histoire avec prompt initial (Backend) [Complexité: 2/5]

**En tant qu'** utilisateur,
**Je veux** pouvoir créer une nouvelle histoire avec une idée,
**Afin de** démarrer le processus de génération.

**Critères d'acceptation:**
- [x] Endpoint POST `/stories` créé
- [x] Validation: childProfileId (UUID), prompt (3-500 chars)
- [x] Vérification que le profil enfant existe
- [x] Histoire créée avec status 'draft'
- [x] Retour de l'histoire avec ID
- [x] **Tests:** Création réussie, erreur si profil inexistant, validation du prompt

---

### US-022: Service d'enrichissement LLM (Backend) [Complexité: 4/5] ✅

**En tant que** système,
**Je veux** enrichir l'idée initiale via un appel LLM,
**Afin de** créer un concept d'histoire détaillé.

**Critères d'acceptation:**
- [x] Service LLM avec provider abstrait (impl OpenAI; Anthropic à venir)
- [x] System prompt avec profil enfant intégré
- [x] Adaptation du vocabulaire selon l'âge
- [x] Génération de: titre, personnage principal, personnages secondaires, cadre, ton, thèmes
- [x] Output JSON structuré conforme à `EnrichedConcept`
- [x] Gestion des thèmes à éviter du profil
- [x] Intégration du prénom de l'enfant si `includeChildAsCharacter` actif
- [x] **Tests:** Parsing JSON, adaptation vocabulaire par âge, gestion thèmes évités (avec mock LLM)

---

### US-040: Service de génération de script (Backend) [Complexité: 5/5]

**En tant que** système,
**Je veux** générer un script complet à partir du concept et des réponses,
**Afin de** produire le contenu narratif de l'histoire.

**Critères d'acceptation:**
- [ ] System prompt avec structure narrative (accroche, contexte, problème, aventure, climax, résolution)
- [ ] Adaptation du vocabulaire selon `vocabularyLevel` du profil
- [ ] Génération de segments: narration, dialogue, pause, sound_effect, music_change
- [ ] Chaque segment contient: id, order, type, content, timing
- [ ] Emotions spécifiées pour les dialogues
- [ ] Effets sonores décrits en langage naturel
- [ ] Durée estimée respectant la préférence du profil
- [ ] Output JSON conforme à `StoryScript`
- [ ] **Tests:** Structure segments valide, calcul durée, validation JSON (avec mock LLM)

---

### US-050: Service ElevenLabs TTS (Backend) [Complexité: 4/5]

**En tant que** système,
**Je veux** générer les voix via ElevenLabs Text-to-Speech,
**Afin de** produire la narration et les dialogues.

**Critères d'acceptation:**
- [ ] Client ElevenLabs configuré avec API key
- [ ] Méthode `generateSpeech` avec: text, voiceId, emotion
- [ ] Mapping émotions -> voice settings (stability, style)
- [ ] Mapping personnages -> voiceIds (narrator, childHero, wiseCharacter, etc.)
- [ ] Retour du buffer audio avec durée
- [ ] Gestion des erreurs et rate limits
- [ ] **Tests:** Mapping émotions, sélection voix, gestion erreurs (avec mock ElevenLabs)

---

### US-060: Service FFmpeg Mixer (Backend) [Complexité: 5/5]

**En tant que** système,
**Je veux** mixer toutes les pistes audio avec FFmpeg,
**Afin de** produire le fichier audio final.

**Critères d'acceptation:**
- [ ] Service `ffmpegMixer` avec fluent-ffmpeg
- [ ] Téléchargement de tous les fichiers audio dans un workdir temporaire
- [ ] Création de la timeline vocale avec pauses
- [ ] Ajout de la musique de fond avec volume réduit
- [ ] Sidechain compression (ducking) musique/voix
- [ ] Ajout de l'ambiance en loop
- [ ] Insertion des SFX avec leurs timings
- [ ] Mix final avec amix
- [ ] Normalisation loudnorm (I=-16, TP=-1.5)
- [ ] Export MP3 192kbps, 44.1kHz, stereo
- [ ] Nettoyage du workdir temporaire
- [ ] **Tests:** Timeline vocale, calcul pauses, nettoyage workdir (tests d'intégration avec fichiers audio de test)

---

### US-063: Step workflow - Upload et finalisation (Backend) [Complexité: 3/5]

**En tant que** système,
**Je veux** uploader l'audio final et finaliser l'histoire,
**Afin de** la rendre disponible à l'écoute.

**Critères d'acceptation:**
- [ ] Step `finalize` dans le workflow
- [ ] Upload vers Supabase Storage
- [ ] Mise à jour de l'histoire: finalAudioUrl, duration, status='ready'
- [ ] Mise à jour du job: status='completed', progress=100, result
- [ ] Nettoyage des fichiers temporaires
- [ ] **Tests:** Upload réussi, mise à jour statuts, cleanup (avec mock Storage)

---

## Phase 2 — MVP Complet (Interface Utilisateur)

> **Objectif:** Flow utilisateur complet avec interface web

### US-005: Configuration Upstash Workflow [Complexité: 3/5]

**En tant que** développeur,
**Je veux** Upstash Workflow configuré pour l'orchestration,
**Afin de** gérer les jobs longue durée de génération d'histoires.

**Critères d'acceptation:**
- [ ] Upstash Workflow configuré avec l'API Elysia
- [ ] Endpoint `/api/workflows/story` fonctionnel
- [ ] Steps workflow atomiques et idempotents
- [ ] Configuration retry (3 retries par défaut)
- [ ] Gestion des erreurs par step

---

### US-008: Client Eden type-safe [Complexité: 2/5]

**En tant que** développeur frontend,
**Je veux** un client Eden configuré pour communiquer avec l'API,
**Afin d'** avoir des appels API type-safe.

**Critères d'acceptation:**
- [ ] Client Eden configuré dans `apps/web/src/lib/api.ts`
- [ ] Types inférés automatiquement depuis l'API Elysia
- [ ] Gestion des erreurs standardisée
- [ ] Configuration de l'URL API (env variable)

---

### US-011: Page de création de profil (Frontend) [Complexité: 3/5]

**En tant que** parent,
**Je veux** une interface visuelle pour créer le profil de mon enfant,
**Afin de** configurer ses préférences facilement.

**Critères d'acceptation:**
- [ ] Page `/profiles/new` avec formulaire multi-étapes
- [ ] Champ prénom avec validation
- [ ] Sélecteur d'âge visuel (3-12 ans)
- [ ] Choix du genre avec icônes
- [ ] Sélecteur de thèmes favoris avec illustrations
- [ ] Sélecteur de thèmes à éviter
- [ ] Option "inclure l'enfant comme personnage"
- [ ] Choix de la durée préférée (2/5/10 min)
- [ ] Choix de la voix narrateur (masculin/féminin/indifférent)
- [ ] Choix de la langue (FR/EN)
- [ ] Bouton de sauvegarde avec feedback

---

### US-012: Liste des profils (Backend) [Complexité: 1/5]

**En tant que** parent,
**Je veux** pouvoir récupérer la liste de tous les profils,
**Afin de** sélectionner un profil existant.

**Critères d'acceptation:**
- [ ] Endpoint GET `/profiles` créé
- [ ] Tri par date de création décroissante
- [ ] Retour de la liste des profils
- [ ] **Tests:** Liste vide, liste avec profils, tri correct

---

### US-013: Page de liste des profils (Frontend) [Complexité: 2/5]

**En tant que** parent,
**Je veux** voir tous les profils enfant créés,
**Afin de** sélectionner celui pour lequel créer une histoire.

**Critères d'acceptation:**
- [ ] Page `/profiles` avec grille de profils
- [ ] Card par profil: avatar, prénom, âge
- [ ] Bouton "Créer une histoire" par profil
- [ ] Bouton "Ajouter un profil" si aucun profil
- [ ] État vide avec illustration

---

### US-014: Détail et édition d'un profil (Backend) [Complexité: 2/5]

**En tant que** parent,
**Je veux** pouvoir consulter et modifier un profil enfant,
**Afin de** mettre à jour ses préférences.

**Critères d'acceptation:**
- [ ] Endpoint GET `/profiles/:id` avec les histoires associées
- [ ] Endpoint PATCH `/profiles/:id` pour mise à jour partielle
- [ ] Validation des champs modifiés
- [ ] Erreur 404 si profil inexistant
- [ ] **Tests:** GET avec histoires, PATCH partiel, erreur 404

---

### US-015: Page de détail et édition d'un profil (Frontend) [Complexité: 2/5]

**En tant que** parent,
**Je veux** consulter et modifier le profil de mon enfant,
**Afin d'** ajuster ses préférences au fil du temps.

**Critères d'acceptation:**
- [ ] Page `/profiles/[id]` avec informations du profil
- [ ] Affichage des histoires récentes du profil
- [ ] Page `/profiles/[id]/edit` avec formulaire pré-rempli
- [ ] Bouton retour vers la liste

---

### US-021: Page d'input initial (Frontend) [Complexité: 3/5]

**En tant qu'** enfant ou parent,
**Je veux** saisir mon idée d'histoire de manière ludique,
**Afin de** donner le point de départ de l'histoire.

**Critères d'acceptation:**
- [ ] Page `/create` avec sélection du profil enfant
- [ ] Zone de texte grande et accueillante pour l'idée
- [ ] Placeholder inspirant ("Un dragon qui a peur du noir...")
- [ ] Suggestions visuelles de thèmes cliquables
- [ ] Compteur de caractères (max 500)
- [ ] Bouton "C'est parti!" animé
- [ ] Design adapté aux enfants (couleurs vives, gros boutons)

---

### US-023: Endpoint d'enrichissement (Backend) [Complexité: 2/5]

**En tant qu'** utilisateur,
**Je veux** lancer l'enrichissement de mon idée,
**Afin de** voir les directions créatives proposées.

**Critères d'acceptation:**
- [ ] Endpoint POST `/stories/:id/enrich` créé
- [ ] Récupération de l'histoire et du profil enfant
- [ ] Appel au service d'enrichissement
- [ ] Sauvegarde du concept enrichi dans la story
- [ ] Retour du concept enrichi
- [ ] **Tests:** Enrichissement réussi, sauvegarde concept, erreur story inexistante

---

### US-024: Page d'enrichissement (Frontend) [Complexité: 3/5]

**En tant qu'** utilisateur,
**Je veux** voir le concept enrichi de mon histoire,
**Afin de** valider ou ajuster la direction créative.

**Critères d'acceptation:**
- [ ] Page `/create/[storyId]/enrich` avec résultat de l'enrichissement
- [ ] Affichage du titre proposé
- [ ] Présentation visuelle du personnage principal
- [ ] Affichage du cadre avec illustration
- [ ] Indication du ton (drôle, aventurier, etc.)
- [ ] Bouton "Ça me plaît!" pour continuer
- [ ] Animation de chargement pendant l'enrichissement
- [ ] Gestion de l'état "enriching"

---

### US-030: Génération des questions guidées (Backend) [Complexité: 3/5]

**En tant que** système,
**Je veux** générer 2-4 questions adaptées au concept enrichi,
**Afin de** personnaliser davantage l'histoire.

**Critères d'acceptation:**
- [ ] Questions générées basées sur le concept enrichi
- [ ] Questions adaptées à l'âge de l'enfant
- [ ] Chaque question a 2-4 choix visuels
- [ ] Types de questions: choix du héros, lieu, ton, élément spécial
- [ ] Format JSON avec id, texte, options (label + icône/image)

---

### US-031: Page des questions guidées (Frontend) [Complexité: 3/5]

**En tant qu'** enfant,
**Je veux** répondre à des questions simples avec des images,
**Afin de** personnaliser mon histoire sans écrire.

**Critères d'acceptation:**
- [ ] Page `/create/[storyId]/questions` avec questions séquentielles
- [ ] Une question à la fois (carrousel)
- [ ] Choix présentés comme cartes visuelles cliquables
- [ ] Illustrations ou icônes pour chaque option
- [ ] Texte minimal, gros boutons
- [ ] Animation de transition entre questions
- [ ] Indicateur de progression (étape X sur Y)
- [ ] Bouton retour à la question précédente

---

### US-032: Sauvegarde des réponses aux questions (Backend) [Complexité: 1/5]

**En tant que** système,
**Je veux** sauvegarder les réponses aux questions guidées,
**Afin de** les utiliser pour la génération du script.

**Critères d'acceptation:**
- [ ] Endpoint POST `/stories/:id/answers` ou inclus dans generate
- [ ] Validation des réponses (questionId, value)
- [ ] Sauvegarde des réponses dans le champ `answers` de la story
- [ ] Mise à jour du status de l'histoire

---

### US-041: Endpoint de lancement de génération (Backend) [Complexité: 2/5]

**En tant qu'** utilisateur,
**Je veux** lancer la génération complète de mon histoire,
**Afin de** démarrer le processus de création audio.

**Critères d'acceptation:**
- [ ] Endpoint POST `/stories/:id/generate` créé
- [ ] Validation des réponses aux questions
- [ ] Création d'un job de génération dans `generation_jobs`
- [ ] Déclenchement du workflow Upstash
- [ ] Mise à jour du status de l'histoire à 'generating'
- [ ] Retour du jobId pour le suivi

---

### US-042: Step workflow - Génération script (Backend) [Complexité: 3/5]

**En tant que** système,
**Je veux** exécuter la génération du script comme step du workflow,
**Afin de** bénéficier du retry automatique.

**Critères d'acceptation:**
- [ ] Step `generate-script` dans le workflow
- [ ] Récupération du concept enrichi et des réponses
- [ ] Appel au service LLM de génération de script
- [ ] Sauvegarde du script dans la story
- [ ] Mise à jour de la progression (10% -> 25%)
- [ ] Idempotence: ne pas régénérer si script existe déjà

---

### US-070: Récupération d'une histoire complète (Backend) [Complexité: 2/5]

**En tant qu'** utilisateur,
**Je veux** récupérer les détails d'une histoire générée,
**Afin de** l'écouter.

**Critères d'acceptation:**
- [ ] Endpoint GET `/stories/:id` retourne l'histoire complète
- [ ] Inclusion des segments
- [ ] Inclusion du profil enfant
- [ ] URL audio publique si status='ready'

---

### US-071: Player audio (Frontend) [Complexité: 4/5]

**En tant qu'** enfant ou parent,
**Je veux** écouter l'histoire générée avec un player adapté,
**Afin de** profiter de l'expérience audio.

**Critères d'acceptation:**
- [ ] Page `/story/[id]` avec player audio
- [ ] Intégration Howler.js pour lecture avancée
- [ ] Bouton play/pause grand et visible
- [ ] Barre de progression cliquable
- [ ] Affichage du temps écoulé / durée totale
- [ ] Bouton retour 10s
- [ ] Contrôle du volume
- [ ] Design enfant-friendly (couleurs, animations)
- [ ] Affichage du titre et illustration

---

## Phase 3 — Production Ready (Features Complètes)

> **Objectif:** Tous les services audio et bibliothèque complète

### US-051: Service ElevenLabs SFX (Backend) [Complexité: 3/5]

**En tant que** système,
**Je veux** générer les effets sonores via ElevenLabs Sound Effects,
**Afin de** produire les ambiances et bruitages.

**Critères d'acceptation:**
- [ ] Méthode `generateSFX` avec: prompt, duration, promptInfluence
- [ ] Optimisation des prompts pour ElevenLabs
- [ ] Durée configurable (0.5 - 22s)
- [ ] Cache Redis pour éviter les régénérations
- [ ] Retour du buffer audio

---

### US-052: Service Suno pour la musique (Backend) [Complexité: 3/5]

**En tant que** système,
**Je veux** générer la musique de fond via Suno,
**Afin de** produire une bande sonore adaptée.

**Critères d'acceptation:**
- [ ] Client Suno API configuré
- [ ] Méthode `generateMusic` avec: mood, duration, instrumental
- [ ] Mapping mood -> prompts musicaux (adventure, mystery, joyful, calm, magical, exciting)
- [ ] Toujours en mode instrumental
- [ ] Durée max 2 minutes par génération
- [ ] Gestion des musiques plus longues (looping)

---

### US-053: Step workflow - Génération voix (Backend) [Complexité: 3/5]

**En tant que** système,
**Je veux** générer toutes les pistes vocales dans le workflow,
**Afin de** produire narration et dialogues.

**Critères d'acceptation:**
- [ ] Step `generate-voices` dans le workflow
- [ ] Filtrage des segments de type 'narration' et 'dialogue'
- [ ] Génération en parallèle (max 5 concurrent pour rate limit)
- [ ] Sélection de la voix selon le personnage et le profil enfant
- [ ] Progression granulaire (30% -> 55%)
- [ ] Stockage temporaire des fichiers audio

---

### US-054: Step workflow - Génération SFX (Backend) [Complexité: 2/5]

**En tant que** système,
**Je veux** générer tous les effets sonores dans le workflow,
**Afin d'** ajouter les bruitages à l'histoire.

**Critères d'acceptation:**
- [ ] Step `generate-sfx` dans le workflow
- [ ] Filtrage des segments de type 'sound_effect'
- [ ] Vérification du cache avant génération
- [ ] Génération des SFX manquants
- [ ] Mise en cache des nouveaux SFX
- [ ] Progression (55% -> 65%)

---

### US-055: Step workflow - Génération musique (Backend) [Complexité: 2/5]

**En tant que** système,
**Je veux** générer la musique de fond dans le workflow,
**Afin d'** avoir une bande sonore pour l'histoire.

**Critères d'acceptation:**
- [ ] Step `generate-music` dans le workflow
- [ ] Détermination du mood depuis le script
- [ ] Génération via Suno
- [ ] Durée adaptée à l'histoire
- [ ] Progression (70% -> 80%)

---

### US-056: Step workflow - Génération ambiance (Backend) [Complexité: 2/5]

**En tant que** système,
**Je veux** générer l'ambiance de fond dans le workflow,
**Afin d'** avoir un environnement sonore immersif.

**Critères d'acceptation:**
- [ ] Step `generate-ambiance` dans le workflow
- [ ] Détection du setting depuis le script
- [ ] Mapping setting -> prompt d'ambiance
- [ ] Génération via ElevenLabs SFX (30s)
- [ ] Progression (82% -> 85%)

---

### US-061: Création de la timeline vocale (Backend) [Complexité: 3/5]

**En tant que** système,
**Je veux** créer une timeline des voix avec silences,
**Afin de** respecter le rythme narratif.

**Critères d'acceptation:**
- [ ] Fonction `createVoiceTimeline`
- [ ] Génération de fichiers silence de différentes durées
- [ ] Fichier concat.txt avec la séquence
- [ ] Pauses avant/après chaque segment selon le timing
- [ ] Concaténation avec FFmpeg

---

### US-062: Step workflow - Mixage final (Backend) [Complexité: 3/5]

**En tant que** système,
**Je veux** mixer l'audio final dans le workflow,
**Afin de** produire le fichier audio complet.

**Critères d'acceptation:**
- [ ] Step `mix-audio` dans le workflow
- [ ] Appel au service ffmpegMixer avec toutes les pistes
- [ ] Progression (88% -> 95%)
- [ ] Retour du buffer audio final

---

### US-072: Bibliothèque d'histoires par profil (Backend) [Complexité: 2/5]

**En tant que** parent,
**Je veux** récupérer toutes les histoires d'un profil enfant,
**Afin de** les retrouver facilement.

**Critères d'acceptation:**
- [ ] Endpoint GET `/stories/profile/:profileId`
- [ ] Tri par date de création décroissante
- [ ] Filtrage par status (optionnel)
- [ ] Retour: id, title, duration, status, createdAt

---

### US-073: Page bibliothèque (Frontend) [Complexité: 3/5]

**En tant que** parent ou enfant,
**Je veux** voir toutes les histoires créées,
**Afin de** les réécouter.

**Critères d'acceptation:**
- [ ] Page `/library` avec grille d'histoires
- [ ] Filtrage par profil enfant
- [ ] Card par histoire: titre, illustration, durée, date
- [ ] Badge de status (prêt, en cours, échec)
- [ ] Clic sur une carte -> page du player
- [ ] État vide avec invitation à créer une histoire

---

### US-074: Suppression d'une histoire (Backend) [Complexité: 2/5]

**En tant que** parent,
**Je veux** pouvoir supprimer une histoire,
**Afin de** gérer la bibliothèque.

**Critères d'acceptation:**
- [ ] Endpoint DELETE `/stories/:id`
- [ ] Suppression des fichiers audio associés sur Supabase Storage
- [ ] Suppression des segments en base
- [ ] Suppression de l'histoire en base
- [ ] Confirmation requise côté frontend

---

### US-080: Stockage de la progression dans Redis (Backend) [Complexité: 2/5]

**En tant que** système,
**Je veux** stocker la progression du job dans Redis,
**Afin de** permettre un suivi temps réel.

**Critères d'acceptation:**
- [ ] Fonction `updateJobProgress(storyId, step, progress)`
- [ ] Stockage dans Redis avec clé `job:{storyId}:progress`
- [ ] TTL 1 heure sur les clés de progression
- [ ] Mise à jour également dans la table `generation_jobs`

---

### US-081: Endpoint de polling du status (Backend) [Complexité: 2/5]

**En tant que** frontend,
**Je veux** pouvoir interroger le status d'un job,
**Afin d'** afficher la progression à l'utilisateur.

**Critères d'acceptation:**
- [ ] Endpoint GET `/jobs/:jobId/status`
- [ ] Lecture depuis Redis d'abord (rapide)
- [ ] Fallback sur la base de données
- [ ] Retour: step, progress, status, result (si complète)

---

### US-082: Endpoint SSE pour streaming du status (Backend) [Complexité: 3/5]

**En tant que** frontend,
**Je veux** recevoir les mises à jour en temps réel via SSE,
**Afin d'** éviter le polling intensif.

**Critères d'acceptation:**
- [ ] Endpoint GET `/jobs/:jobId/stream` en SSE
- [ ] Envoi d'event à chaque changement de progression
- [ ] Fermeture automatique à 100% ou en cas d'erreur
- [ ] Intervalle de vérification configurable

---

### US-083: Hook useJobProgress (Frontend) [Complexité: 2/5]

**En tant que** développeur frontend,
**Je veux** un hook pour suivre la progression des jobs,
**Afin de** simplifier l'affichage du status.

**Critères d'acceptation:**
- [ ] Hook `useJobProgress(jobId)` créé
- [ ] Tentative SSE d'abord
- [ ] Fallback sur polling si SSE échoue
- [ ] Intervalle de polling: 2 secondes
- [ ] Retour: progress, error, isComplete
- [ ] Cleanup automatique à la fin

---

### US-084: Page de génération en cours (Frontend) [Complexité: 3/5]

**En tant qu'** utilisateur,
**Je veux** voir la progression de la génération de mon histoire,
**Afin de** patienter de manière informée.

**Critères d'acceptation:**
- [ ] Page `/create/[storyId]/generating` avec suivi en temps réel
- [ ] Barre de progression animée (0-100%)
- [ ] Indication de l'étape en cours avec texte et icône
- [ ] Étapes: Préparation, Script, Voix, Effets sonores, Musique, Ambiance, Mixage, Finalisation
- [ ] Animation d'attente engageante pour enfants
- [ ] Messages encourageants pendant l'attente
- [ ] Redirection automatique vers le player à la fin
- [ ] Affichage d'erreur si échec avec option de retry

---

## Phase 4 — Polish & Sécurité

> **Objectif:** Finitions, UX avancée et sécurité

### US-006: Configuration Docker pour Scaleway [Complexité: 3/5]

**En tant que** développeur,
**Je veux** une image Docker pour l'API avec FFmpeg inclus,
**Afin de** déployer sur Scaleway Serverless Containers.

**Critères d'acceptation:**
- [ ] Dockerfile basé sur `oven/bun:1.0-alpine`
- [ ] FFmpeg installé dans l'image
- [ ] Build optimisé (multi-stage si nécessaire)
- [ ] Commande `nx run api:docker-build` fonctionnelle
- [ ] Image testée localement

---

### US-085: Gestion des états de l'application (Frontend) [Complexité: 3/5]

**En tant qu'** utilisateur,
**Je veux** que l'interface reflète clairement l'état de l'application,
**Afin de** comprendre où j'en suis dans le processus.

**Critères d'acceptation:**
- [ ] Store Zustand pour l'état global
- [ ] États gérés: IDLE, INPUT_COLLECTION, ENRICHING, QUESTIONING, SCRIPT_GENERATION, AUDIO_SYNTHESIS, AUDIO_MIXING, READY, PLAYING, ERROR
- [ ] Transitions d'état animées
- [ ] Persistance de l'état en cours (localStorage)
- [ ] Reprise possible après fermeture de l'app

---

### US-086: Gestion des erreurs utilisateur (Frontend) [Complexité: 2/5]

**En tant qu'** utilisateur,
**Je veux** voir des messages d'erreur compréhensibles,
**Afin de** savoir quoi faire en cas de problème.

**Critères d'acceptation:**
- [ ] Composant ErrorDisplay réutilisable
- [ ] Messages d'erreur en langage simple
- [ ] Bouton "Réessayer" quand applicable
- [ ] Redirection vers une page de contact/support si erreur persistante
- [ ] Log des erreurs pour debugging

---

### US-087: Configuration PWA (Frontend) [Complexité: 2/5]

**En tant qu'** utilisateur mobile,
**Je veux** pouvoir installer l'application sur mon appareil,
**Afin d'** y accéder facilement.

**Critères d'acceptation:**
- [ ] Fichier manifest.json configuré
- [ ] Service worker via next-pwa
- [ ] Icônes 192x192 et 512x512
- [ ] Theme color et background color définis
- [ ] Mode standalone
- [ ] Splash screen configuré

---

### US-088: Loading states et skeletons (Frontend) [Complexité: 2/5]

**En tant qu'** utilisateur,
**Je veux** voir des indicateurs de chargement clairs,
**Afin de** savoir que l'application travaille.

**Critères d'acceptation:**
- [ ] Composants skeleton pour les listes (profils, histoires)
- [ ] Loading page pour chaque route
- [ ] Spinner animé pour les actions courtes
- [ ] Désactivation des boutons pendant les actions
- [ ] Feedback visuel immédiat sur les clics

---

### US-090: Filtrage de contenu (Backend) [Complexité: 3/5]

**En tant que** parent,
**Je veux** que le contenu généré soit toujours adapté aux enfants,
**Afin d'** avoir confiance dans l'application.

**Critères d'acceptation:**
- [ ] Liste de contenus interdits dans les prompts
- [ ] Vérification du prompt initial avant enrichissement
- [ ] Instructions strictes dans les system prompts LLM
- [ ] Double vérification du script généré
- [ ] Rejet des contenus inappropriés avec message utilisateur

---

### US-091: Validation des inputs (Backend) [Complexité: 2/5]

**En tant que** système,
**Je veux** valider tous les inputs utilisateur,
**Afin de** prévenir les erreurs et attaques.

**Critères d'acceptation:**
- [ ] Schemas Typebox sur tous les endpoints
- [ ] Validation des UUIDs
- [ ] Limites de longueur sur les textes
- [ ] Sanitization des inputs
- [ ] Messages d'erreur de validation clairs

---

### US-092: Retry et fallbacks (Backend) [Complexité: 2/5]

**En tant que** système,
**Je veux** gérer les échecs des services externes,
**Afin d'** assurer la fiabilité.

**Critères d'acceptation:**
- [ ] Configuration retry par service (LLM: 3, ElevenLabs: 2, FFmpeg: 1)
- [ ] Backoff exponentiel pour les retries
- [ ] Fallback vers histoire template si LLM échoue
- [ ] Fallback vers voix en cache si ElevenLabs échoue
- [ ] Logging des erreurs pour monitoring

---

## Dépendances entre Epics

```
Phase 1 (Infrastructure)
    │
    ├── US-001 Monorepo ──────────────────┐
    │                                      │
    ├── US-002 Supabase DB ───────────────┤
    │                                      │
    ├── US-003 Supabase Storage ──────────┤
    │                                      ▼
    ├── US-004 Redis (Bun) ──────────► US-007 API Elysia
    │                                      │
    │                                      ▼
    │                              US-010 Profils API
    │                                      │
    │                                      ▼
    │                              US-020 Stories API
    │                                      │
    ├──────────────────────────────────────┤
    │                                      │
    ▼                                      ▼
US-022 Enrichissement LLM          US-040 Script LLM
                                           │
                                           ▼
                                   US-050 ElevenLabs TTS
                                           │
                                           ▼
                                   US-060 FFmpeg Mixer
                                           │
                                           ▼
                                   US-063 Upload Final

Phase 2 (Interface)
    │
    ├── US-008 Eden Client
    │       │
    │       ▼
    ├── US-011-015 Pages Profils
    │       │
    │       ▼
    ├── US-021-024 Pages Création
    │       │
    │       ▼
    ├── US-030-032 Questions
    │       │
    │       ▼
    ├── US-041-042 Workflow
    │       │
    │       ▼
    └── US-070-071 Player

Phase 3 (Production)
    │
    ├── US-051-056 Services Audio Complets
    │       │
    │       ▼
    ├── US-061-062 Mixage Avancé
    │       │
    │       ▼
    ├── US-072-074 Bibliothèque
    │       │
    │       ▼
    └── US-080-084 Progress Tracking

Phase 4 (Polish)
    │
    ├── US-006 Docker
    ├── US-085-088 UX Avancée
    └── US-090-092 Sécurité
```

---

## Annexe: Estimation Totale

| Complexité | Nombre US | Points |
|------------|-----------|--------|
| 1/5 | 3 | 3 |
| 2/5 | 22 | 44 |
| 3/5 | 17 | 51 |
| 4/5 | 4 | 16 |
| 5/5 | 3 | 15 |
| **Total** | **53** | **131** |
