# PRD — Mio
## Application de Génération d'Histoires Audio pour Enfants

**Version:** 1.0.0  
**Date:** Janvier 2026  
**Stack:** TypeScript / Bun / Nx / Elysia / Drizzle / Upstash / Next.js (PWA)  
**Architecture:** Serverless (Edge-first)

---

## 1. Vision & Objectifs

### 1.1 Vision
Permettre aux enfants (et leurs parents) de créer des histoires audio personnalisées et immersives en quelques minutes, avec une qualité de production professionnelle (narration, dialogues, ambiances sonores, effets).

### 1.2 Objectifs Clés
- **Simplicité** : Un enfant de 6 ans doit pouvoir lancer une histoire avec une aide minimale
- **Qualité audio** : Rendu final comparable à un audiobook professionnel
- **Personnalisation** : Chaque histoire est unique, basée sur les idées de l'enfant
- **Évolutivité** : Architecture prête pour l'interactivité future (histoires à embranchements)

### 1.3 Métriques de Succès
- Temps moyen de génération < 3 minutes pour une histoire de 5 minutes
- Taux de complétion du flow > 80%
- NPS parents > 50

---

## 2. Personas

### 2.1 Enfant (6-12 ans)
- Veut raconter SES idées
- Attention limitée (flow rapide nécessaire)
- Interface visuelle, peu de texte

### 2.2 Parent
- Cherche du contenu sûr et éducatif
- Veut superviser/aider sans friction
- Apprécie la personnalisation (prénom de l'enfant dans l'histoire, etc.)

---

## 3. Architecture Fonctionnelle

### 3.1 Flow Principal (MVP)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FLOW DE GÉNÉRATION                            │
└─────────────────────────────────────────────────────────────────────────┘

[0. PROFIL ENFANT] (une seule fois, ou éditable)
     │
     │  Parent configure le profil de l'enfant
     │  → Prénom, âge, genre
     │  → Préférences (thèmes aimés/évités)
     │  → Langue
     ▼
[1. INPUT INITIAL]
     │
     │  Enfant/Parent donne une idée libre
     │  Ex: "Un dragon qui a peur du noir"
     ▼
[2. ENRICHISSEMENT]
     │
     │  LLM Call #1 : Expansion créative
     │  → Utilise le profil enfant pour adapter
     │  → Suggestions de personnages, lieux, conflits
     │  → Affichage de 2-3 directions possibles
     ▼
[3. QUESTIONS GUIDÉES]
     │
     │  2-4 questions simples (choix visuels)
     │  - Qui est le héros ? (avatars)
     │  - Où ça se passe ? (décors illustrés)
     │  - C'est plutôt drôle ou aventurier ?
     ▼
[4. GÉNÉRATION DU SCRIPT]
     │
     │  LLM Call #2 : Prompt engineering avancé
     │  → Structure narrative (début/milieu/fin)
     │  → Vocabulaire adapté à l'âge
     │  → Output JSON structuré (voir §4.2)
     ▼
[5. SYNTHÈSE AUDIO]
     │
     │  ElevenLabs API : Génération des pistes
     │  → Narration (voix neutre)
     │  → Dialogues (voix par personnage)
     │  → Timing markers inclus
     ▼
[6. MIXAGE AUDIO]
     │
     │  fluent-ffmpeg : Post-production
     │  → Superposition ambiances/musique
     │  → Effets sonores aux markers
     │  → Normalisation & export final
     ▼
[7. LECTURE & SAUVEGARDE]
     │
     │  Player intégré + bibliothèque personnelle
```

### 3.2 États de l'Application

```typescript
enum StoryState {
  IDLE = 'idle',
  INPUT_COLLECTION = 'input_collection',
  ENRICHING = 'enriching',           // LLM Call #1
  QUESTIONING = 'questioning',
  SCRIPT_GENERATION = 'script_generation', // LLM Call #2
  AUDIO_SYNTHESIS = 'audio_synthesis',     // ElevenLabs
  AUDIO_MIXING = 'audio_mixing',           // FFmpeg
  READY = 'ready',
  PLAYING = 'playing',
  ERROR = 'error'
}
```

---

## 4. Modèles de Données

### 4.1 Child Profile Model

```typescript
interface ChildProfile {
  id: string;
  
  // Identité
  firstName: string;
  age: number;                    // 3-12 ans
  gender: 'boy' | 'girl' | 'neutral';
  
  // Préférences
  preferences: ChildPreferences;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

interface ChildPreferences {
  // Thèmes favoris (pour suggestions)
  favoriteThemes: Theme[];        // ['animals', 'space', 'princesses', 'pirates'...]
  
  // Thèmes à éviter
  avoidThemes: Theme[];           // ['scary', 'monsters'...]
  
  // Personnalisation narrative
  includeChildAsCharacter: boolean;  // Inclure l'enfant dans l'histoire
  preferredHeroGender: 'same' | 'any';
  
  // Audio
  preferredStoryDuration: '2min' | '5min' | '10min';
  narratorVoicePreference?: 'male' | 'female' | 'any';
  
  // Langue
  language: 'fr' | 'en';
}

type Theme = 
  | 'animals' | 'dinosaurs' | 'space' | 'ocean'
  | 'princesses' | 'knights' | 'pirates' | 'superheroes'
  | 'nature' | 'vehicles' | 'magic' | 'friendship'
  | 'family' | 'school' | 'sports' | 'music'
  | 'scary' | 'monsters' | 'dragons';

// Mapping âge → niveau de vocabulaire
const ageToVocabularyLevel: Record<number, VocabularyLevel> = {
  3: 'very_simple',   // Phrases courtes, mots simples
  4: 'very_simple',
  5: 'simple',        // Phrases un peu plus longues
  6: 'simple',
  7: 'medium',        // Vocabulaire enrichi
  8: 'medium',
  9: 'advanced',      // Structures complexes OK
  10: 'advanced',
  11: 'advanced',
  12: 'advanced',
};

type VocabularyLevel = 'very_simple' | 'simple' | 'medium' | 'advanced';

// Mapping âge → durée max recommandée
const ageToMaxDuration: Record<number, number> = {
  3: 3,   // 3 minutes max
  4: 4,
  5: 5,
  6: 7,
  7: 10,
  8: 10,
  9: 15,
  10: 15,
  11: 20,
  12: 20,
};
```

### 4.2 Story Input Model

```typescript
interface StoryInput {
  id: string;
  childProfileId: string;         // Référence au profil
  childProfile?: ChildProfile;    // Dénormalisé pour le LLM
  
  initialPrompt: string;
  enrichedConcept?: EnrichedConcept;
  answers: QuestionAnswer[];
  createdAt: Date;
}

interface EnrichedConcept {
  title: string;
  mainCharacter: Character;
  supportingCharacters: Character[];
  setting: Setting;
  tone: 'funny' | 'adventurous' | 'heartwarming' | 'mysterious' | 'educational';
  themes: string[];
  suggestedDuration: '2min' | '5min' | '10min';
  
  // Ajouté pour personnalisation
  vocabularyLevel: VocabularyLevel;
  childIncluded: boolean;         // L'enfant est un personnage
  childCharacterName?: string;    // Prénom utilisé dans l'histoire
}

interface Character {
  name: string;
  description: string;
  voiceProfile: VoiceProfile;
  personality: string[];
}

interface VoiceProfile {
  elevenLabsVoiceId?: string;
  pitch: 'low' | 'medium' | 'high';
  speed: 'slow' | 'normal' | 'fast';
  style: 'warm' | 'energetic' | 'mysterious' | 'playful' | 'wise';
  age: 'child' | 'young_adult' | 'adult' | 'elderly';
}

interface Setting {
  location: string;
  era: string;
  ambiance: AmbianceType;
}

type AmbianceType = 
  | 'forest' | 'ocean' | 'castle' | 'space' 
  | 'city' | 'countryside' | 'magical_realm' | 'underwater';
```

### 4.2 Story Script Model (Output LLM)

```typescript
interface StoryScript {
  id: string;
  metadata: StoryMetadata;
  segments: StorySegment[];
  audioDirections: GlobalAudioDirections;
}

interface StoryMetadata {
  title: string;
  estimatedDuration: number; // seconds
  ageRange: [number, number];
  contentWarnings: string[];
}

interface StorySegment {
  id: string;
  order: number;
  type: 'narration' | 'dialogue' | 'pause' | 'sound_effect' | 'music_change';
  content: SegmentContent;
  timing: SegmentTiming;
  audio?: GeneratedAudio; // Filled after synthesis
}

interface SegmentContent {
  text?: string;                    // For narration/dialogue
  characterId?: string;             // For dialogue
  emotion?: Emotion;                // Affects voice delivery
  soundEffectId?: string;           // For sound_effect type
  ambianceChange?: AmbianceType;    // For music_change type
}

type Emotion = 
  | 'neutral' | 'happy' | 'sad' | 'excited' 
  | 'scared' | 'angry' | 'surprised' | 'whispering';

interface SegmentTiming {
  pauseBefore: number;    // ms
  pauseAfter: number;     // ms
  fadeIn?: number;        // ms (for music/ambiance)
  fadeOut?: number;       // ms
  overlap?: number;       // ms (for layering)
}

interface GlobalAudioDirections {
  backgroundMusic: {
    trackId: string;
    volume: number;        // 0-1
    loopPoints?: [number, number];
  };
  masterVolume: {
    narration: number;
    dialogue: number;
    effects: number;
    music: number;
  };
  transitions: {
    defaultCrossfade: number; // ms
  };
}
```

### 4.3 Audio Asset Model

```typescript
interface GeneratedAudio {
  segmentId: string;
  filePath: string;
  duration: number;       // ms
  format: 'mp3' | 'wav';
  sampleRate: number;
  generatedAt: Date;
  cost: number;           // For tracking API costs
}

interface AudioLibrary {
  soundEffects: Map<string, SoundEffect>;
  ambianceTracks: Map<AmbianceType, AmbianceTrack>;
  musicTracks: Map<string, MusicTrack>;
}

interface SoundEffect {
  id: string;
  name: string;
  filePath: string;
  duration: number;
  tags: string[];
}

interface AmbianceTrack {
  id: string;
  type: AmbianceType;
  filePath: string;
  loopable: boolean;
  loopPoints?: [number, number]; // ms
}
```

---

## 5. Intégrations API

### 5.1 LLM Provider (OpenAI / Anthropic)

**Call #1 : Enrichissement**
```typescript
interface EnrichmentRequest {
  userPrompt: string;
  childAge?: number;
  preferredDuration: '2min' | '5min' | '10min';
  excludeThemes?: string[]; // Pour filtrage parental
}

// System prompt inclura:
// - Guidelines de contenu adapté à l'âge
// - Structure de réponse JSON attendue
// - Exemples de bonnes expansions créatives
```

**Call #2 : Génération du Script**
```typescript
interface ScriptGenerationRequest {
  enrichedConcept: EnrichedConcept;
  userAnswers: QuestionAnswer[];
  outputFormat: 'full_script'; // Référence au JSON schema
  constraints: {
    maxSegments: number;
    targetDuration: number;
    vocabularyLevel: 'simple' | 'medium' | 'advanced';
  };
}
```

### 5.2 ElevenLabs

**Stratégie de génération :**

```typescript
interface ElevenLabsStrategy {
  // Option A: Un appel par segment (recommandé)
  // + Contrôle fin sur chaque voix/émotion
  // + Parallélisation possible
  // - Plus d'appels API = plus de coûts
  
  // Option B: Appels groupés par personnage
  // + Moins d'appels
  // - Moins de contrôle sur les émotions segment par segment
  
  approach: 'per_segment' | 'per_character';
  
  // Voice settings par personnage
  voiceSettings: {
    stability: number;        // 0-1 (plus bas = plus expressif)
    similarityBoost: number;  // 0-1
    style: number;            // 0-1 (v2 voices only)
    useSpeakerBoost: boolean;
  };
}

// Mapping émotions → ElevenLabs settings
const emotionToVoiceSettings: Record<Emotion, Partial<VoiceSettings>> = {
  excited: { stability: 0.3, style: 0.8 },
  sad: { stability: 0.7, style: 0.3 },
  whispering: { stability: 0.9, style: 0.1 },
  // ...
};
```

**Gestion des voix :**
```typescript
interface VoiceMapping {
  // Voix pré-sélectionnées pour les archétypes
  narrator: string;           // Voix neutre, chaleureuse
  childHero: string;          // Voix enfantine
  wiseCharacter: string;      // Voix posée, mature
  villain: string;            // Voix grave (mais pas effrayante)
  comedic: string;            // Voix expressive
  
  // Voice cloning pour personnalisation future (premium)
  customVoices: Map<string, string>;
}
```

### 5.3 FFmpeg (fluent-ffmpeg)

**Pipeline de mixage :**

```typescript
interface MixingPipeline {
  steps: [
    // 1. Préparation des pistes
    'normalize_all_tracks',      // Normalisation volume
    'convert_to_common_format',  // Tout en WAV 44.1kHz
    
    // 2. Arrangement temporel
    'create_timeline',           // Placement selon timings
    'apply_segment_pauses',      // Pauses entre segments
    
    // 3. Layering
    'add_background_music',      // Piste de fond continue
    'add_ambiance_layer',        // Ambiances (forêt, océan...)
    'insert_sound_effects',      // Effets ponctuels
    
    // 4. Mixage
    'apply_volume_automation',   // Duck music pendant dialogue
    'apply_crossfades',          // Transitions douces
    'apply_master_compression',  // Compression finale
    
    // 5. Export
    'export_final_mix'           // MP3 320kbps + metadata
  ];
}
```

**Exemple de commande FFmpeg complexe :**
```typescript
// Pseudo-code pour le mixage final
async function mixStory(segments: GeneratedAudio[], script: StoryScript): Promise<string> {
  const command = ffmpeg();
  
  // Ajouter toutes les pistes vocales
  segments.forEach((seg, i) => {
    command.input(seg.filePath);
  });
  
  // Ajouter musique de fond
  command.input(script.audioDirections.backgroundMusic.trackId);
  
  // Ajouter ambiance
  command.input(getAmbianceTrack(script.segments[0].content.ambianceChange));
  
  // Filtres complexes pour le mixage
  command.complexFilter([
    // Concaténer les voix avec pauses
    `[0:a]adelay=${getDelay(0)}|${getDelay(0)}[voice0]`,
    // ... pour chaque segment
    
    // Mixer voix + musique (ducking)
    `[voices][music]sidechaincompress=threshold=0.02:ratio=4:attack=50:release=300[ducked]`,
    
    // Mix final
    `[ducked][ambiance]amix=inputs=2:duration=longest[final]`
  ]);
  
  return outputPath;
}
```

---

## 6. Architecture Technique

### 6.1 Stack Technique

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 15 (PWA)                                               │
│  - next-pwa (service worker, offline)                           │
│  - Howler.js (lecture audio avancée)                            │
│  - zustand (state management)                                   │
│  - react-query (API calls)                                      │
│  - Tailwind CSS + Framer Motion (UI/animations)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (Serverless)                     │
├─────────────────────────────────────────────────────────────────┤
│  Elysia (sur Bun, déployé sur Scaleway Serverless Containers)   │
│  - End-to-end type safety avec Eden                             │
│  - Drizzle ORM (PostgreSQL - Supabase)                          │
│  - Upstash Workflow (orchestration jobs longue durée)           │
│  - Upstash Redis (cache audio + progress tracking)              │
│  - fluent-ffmpeg (mixage audio natif)                           │
│  - Supabase Storage (stockage audio S3-compatible)              │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────────┐
        │  OpenAI  │   │ElevenLabs│   │ FFmpeg Worker│
        │   API    │   │   API    │   │   (local)    │
        └──────────┘   └──────────┘   └──────────────┘
```

### 6.2 Structure du Projet

```
mio/
├── apps/
│   ├── web/                    # Next.js PWA (Vercel)
│   │   ├── src/
│   │   │   ├── app/            # App Router
│   │   │   │   ├── (app)/      # Routes principales
│   │   │   │   │   ├── profiles/
│   │   │   │   │   │   ├── page.tsx        # Liste des profils
│   │   │   │   │   │   ├── new/page.tsx    # Créer un profil
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       ├── page.tsx    # Détail profil
│   │   │   │   │   │       └── edit/page.tsx
│   │   │   │   │   ├── create/             # Création histoire
│   │   │   │   │   │   ├── page.tsx        # Sélection profil + prompt
│   │   │   │   │   │   └── [storyId]/
│   │   │   │   │   │       ├── enrich/page.tsx
│   │   │   │   │   │       ├── questions/page.tsx
│   │   │   │   │   │       └── generating/page.tsx
│   │   │   │   │   ├── library/
│   │   │   │   │   │   └── page.tsx        # Bibliothèque par profil
│   │   │   │   │   └── story/[id]/
│   │   │   │   │       └── page.tsx        # Player
│   │   │   │   ├── api/                    # Route Handlers (serverless)
│   │   │   │   │   ├── [...route]/route.ts # Proxy vers Elysia
│   │   │   │   │   └── workflows/
│   │   │   │   │       └── story/route.ts  # Upstash Workflow endpoint
│   │   │   │   └── layout.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/         # Composants génériques
│   │   │   │   ├── profiles/   # Avatar picker, theme selector
│   │   │   │   ├── story/      # Composants métier
│   │   │   │   └── audio/      # Player, visualizer
│   │   │   ├── hooks/
│   │   │   │   ├── useJobProgress.ts
│   │   │   │   └── useStory.ts
│   │   │   ├── stores/
│   │   │   └── lib/
│   │   │       ├── api.ts      # Client Eden (type-safe)
│   │   │       └── upstash.ts  # Redis client
│   │   ├── public/
│   │   │   └── manifest.json   # PWA manifest
│   │   ├── next.config.js
│   │   └── project.json        # Nx config
│   │
│   └── api/                    # Elysia API (peut être déployé sur Vercel/Cloudflare)
│       ├── src/
│       │   ├── index.ts        # Entry point Elysia
│       │   ├── routes/
│       │   │   ├── index.ts    # Route aggregation
│       │   │   ├── profiles.ts
│       │   │   ├── stories.ts
│       │   │   └── jobs.ts
│       │   ├── services/
│       │   │   ├── llm/
│       │   │   │   ├── client.ts
│       │   │   │   ├── enrichment.ts
│       │   │   │   └── scriptGeneration.ts
│       │   │   ├── audio/
│       │   │   │   ├── elevenLabs.ts
│       │   │   │   ├── suno.ts
│       │   │   │   └── ffmpegMixer.ts
│       │   │   ├── cache/
│       │   │   │   └── audioCache.ts   # Upstash Redis
│       │   │   └── storage/
│       │   │       └── supabase.ts     # Supabase Storage
│       │   ├── workflows/
│       │   │   └── storyGeneration.ts  # Upstash Workflow
│       │   └── plugins/
│       │       └── swagger.ts
│       └── project.json        # Nx config
│
├── packages/
│   ├── db/                     # Drizzle schemas + migrations
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── childProfiles.ts
│   │   │   │   ├── stories.ts
│   │   │   │   ├── segments.ts
│   │   │   │   ├── audioAssets.ts
│   │   │   │   ├── jobs.ts
│   │   │   │   └── index.ts
│   │   │   ├── migrations/
│   │   │   ├── client.ts       # Drizzle client (Supabase PostgreSQL)
│   │   │   └── seed.ts
│   │   ├── drizzle.config.ts
│   │   └── project.json
│   │
│   └── shared/                 # Types & constantes partagés
│       ├── src/
│       │   ├── models/
│       │   │   ├── story.ts
│       │   │   ├── audio.ts
│       │   │   ├── childProfile.ts
│       │   │   └── index.ts
│       │   ├── constants/
│       │   │   ├── emotions.ts
│       │   │   ├── ambiances.ts
│       │   │   ├── themes.ts
│       │   │   └── index.ts
│       │   └── index.ts
│       └── project.json
│
├── nx.json                     # Nx workspace config
├── package.json
└── bun.lockb
```
│   │
│   └── api/                    # Bun + Elysia backend
│       ├── src/
│       │   ├── index.ts        # Entry point Elysia
│       │   ├── routes/
│       │   │   ├── index.ts    # Route aggregation
│       │   │   ├── stories.ts
│       │   │   ├── audio.ts
│       │   │   └── jobs.ts
│       │   ├── services/
│       │   │   ├── llm/
│       │   │   │   ├── client.ts
│       │   │   │   ├── enrichment.ts
│       │   │   │   └── scriptGeneration.ts
│       │   │   ├── audio/
│       │   │   │   ├── elevenLabs.ts
│       │   │   │   ├── suno.ts
│       │   │   │   └── ffmpegMixer.ts
│       │   │   └── cache/
│       │   │       └── audioCache.ts
│       │   ├── jobs/
│       │   │   ├── queue.ts    # BullMQ setup
│       │   │   └── storyGeneration.ts
│       │   └── plugins/
│       │       └── swagger.ts  # Documentation auto
│       └── project.json        # Nx config
│
├── packages/
│   ├── db/                     # Drizzle schemas + migrations
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── stories.ts
│   │   │   │   ├── segments.ts
│   │   │   │   ├── audioAssets.ts
│   │   │   │   └── index.ts
│   │   │   ├── migrations/
│   │   │   ├── client.ts       # Drizzle client export
│   │   │   └── seed.ts
│   │   ├── drizzle.config.ts
│   │   └── project.json
│   │
│   └── shared/                 # Types & constantes partagés
│       ├── src/
│       │   ├── models/
│       │   │   ├── story.ts
│       │   │   ├── audio.ts
│       │   │   └── index.ts
│       │   ├── constants/
│       │   │   ├── emotions.ts
│       │   │   ├── ambiances.ts
│       │   │   └── index.ts
│       │   └── index.ts
│       └── project.json
│
├── nx.json                     # Nx workspace config
├── package.json
└── bun.lockb
```

### 6.3 Orchestration avec Upstash Workflow

Upstash Workflow permet d'orchestrer des jobs longue durée en serverless avec retry automatique, sans timeout de fonction.

```typescript
// apps/api/src/workflows/storyGeneration.ts
import { serve } from '@upstash/workflow/nextjs'; // ou elysia adapter
import { db } from '@mio/db';
import { stories, storySegments, generationJobs } from '@mio/db/schema';

interface StoryGenerationPayload {
  storyId: string;
  answers: QuestionAnswer[];
}

export const { POST } = serve<StoryGenerationPayload>(
  async (context) => {
    const { storyId, answers } = context.requestPayload;

    // ============================================
    // STEP 1: Récupérer l'histoire et le profil
    // ============================================
    const story = await context.run('fetch-story', async () => {
      const result = await db.query.stories.findFirst({
        where: eq(stories.id, storyId),
        with: { childProfile: true },
      });
      
      await updateJobProgress(storyId, 'fetching', 5);
      return result;
    });

    if (!story) throw new Error('Story not found');

    // ============================================
    // STEP 2: Générer le script complet (LLM)
    // ============================================
    const script = await context.run('generate-script', async () => {
      await updateJobProgress(storyId, 'script_generation', 10);
      
      const result = await llmService.generateScript({
        story,
        childProfile: story.childProfile,
        enrichedConcept: story.enrichedConcept,
        answers,
      });
      
      // Sauvegarder le script
      await db.update(stories)
        .set({ script: result })
        .where(eq(stories.id, storyId));
      
      await updateJobProgress(storyId, 'script_generation', 25);
      return result;
    });

    // ============================================
    // STEP 3: Générer les voix (ElevenLabs TTS)
    // En parallèle pour chaque segment vocal
    // ============================================
    const voiceSegments = script.segments.filter(
      s => s.type === 'narration' || s.type === 'dialogue'
    );

    const voiceResults = await context.run('generate-voices', async () => {
      await updateJobProgress(storyId, 'voice_synthesis', 30);
      
      // Générer en parallèle (max 5 concurrent pour rate limit)
      const results = await Promise.all(
        voiceSegments.map(async (segment, index) => {
          const audio = await elevenLabsService.generateSpeech({
            text: segment.content.text!,
            voiceId: getVoiceForSegment(segment, story.childProfile),
            emotion: segment.content.emotion,
          });
          
          // Progress granulaire
          const progress = 30 + Math.floor((index / voiceSegments.length) * 25);
          await updateJobProgress(storyId, 'voice_synthesis', progress);
          
          return { segmentId: segment.id, audio };
        })
      );
      
      return results;
    });

    // ============================================
    // STEP 4: Générer les effets sonores (ElevenLabs SFX)
    // ============================================
    const sfxSegments = script.segments.filter(s => s.type === 'sound_effect');

    const sfxResults = await context.run('generate-sfx', async () => {
      await updateJobProgress(storyId, 'sfx_generation', 55);
      
      const results = await Promise.all(
        sfxSegments.map(async (segment) => {
          // Check cache first
          const cached = await audioCache.get(segment.content.soundEffectId!);
          if (cached) return { segmentId: segment.id, audio: cached };
          
          const audio = await elevenLabsService.generateSFX({
            prompt: segment.content.soundEffectId!,
            duration: 2,
          });
          
          // Cache for reuse
          await audioCache.set(segment.content.soundEffectId!, audio);
          
          return { segmentId: segment.id, audio };
        })
      );
      
      await updateJobProgress(storyId, 'sfx_generation', 65);
      return results;
    });

    // ============================================
    // STEP 5: Générer la musique (Suno)
    // ============================================
    const musicTrack = await context.run('generate-music', async () => {
      await updateJobProgress(storyId, 'music_generation', 70);
      
      const mood = determineMoodFromScript(script);
      const duration = script.metadata.estimatedDuration;
      
      const audio = await sunoService.generateMusic({
        mood,
        duration: Math.min(duration, 120),
        instrumental: true,
      });
      
      await updateJobProgress(storyId, 'music_generation', 80);
      return audio;
    });

    // ============================================
    // STEP 6: Générer l'ambiance
    // ============================================
    const ambianceTrack = await context.run('generate-ambiance', async () => {
      await updateJobProgress(storyId, 'ambiance_generation', 82);
      
      const setting = script.segments.find(s => s.content.ambianceChange)?.content.ambianceChange 
        || 'forest';
      
      const audio = await elevenLabsService.generateSFX({
        prompt: getAmbiancePrompt(setting),
        duration: 30,
      });
      
      await updateJobProgress(storyId, 'ambiance_generation', 85);
      return audio;
    });

    // ============================================
    // STEP 7: Mixage final (FFmpeg)
    // ============================================
    const finalAudio = await context.run('mix-audio', async () => {
      await updateJobProgress(storyId, 'mixing', 88);
      
      const result = await ffmpegService.mixStory({
        voiceSegments: voiceResults,
        sfxSegments: sfxResults,
        musicTrack,
        ambianceTrack,
        script,
      });
      
      await updateJobProgress(storyId, 'mixing', 95);
      return result;
    });

    // ============================================
    // STEP 8: Upload & Finalisation
    // ============================================
    await context.run('finalize', async () => {
      // Upload to Supabase Storage
      const audioUrl = await storageService.upload(finalAudio, `stories/${storyId}/final.mp3`);
      
      // Update story record
      await db.update(stories)
        .set({ 
          finalAudioUrl: audioUrl,
          duration: script.metadata.estimatedDuration,
          status: 'ready',
        })
        .where(eq(stories.id, storyId));
      
      // Mark job complete
      await db.update(generationJobs)
        .set({ 
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
          result: { audioUrl, duration: script.metadata.estimatedDuration },
        })
        .where(eq(generationJobs.storyId, storyId));
    });

    return { success: true, storyId };
  },
  {
    // Configuration Upstash Workflow
    retries: 3,
  }
);

// Service Supabase Storage
// apps/api/src/services/storage/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const storageService = {
  async upload(file: Buffer, path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('audio')
      .upload(path, file, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (error) throw error;

    // Générer URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('audio')
      .getPublicUrl(path);

    return publicUrl;
  },

  async download(path: string): Promise<Buffer> {
    const { data, error } = await supabase.storage
      .from('audio')
      .download(path);

    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  },

  async delete(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from('audio')
      .remove([path]);

    if (error) throw error;
  },

  getPublicUrl(path: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from('audio')
      .getPublicUrl(path);
    return publicUrl;
  },
};

// Helper pour mettre à jour le progress
async function updateJobProgress(storyId: string, step: string, progress: number) {
  await db.update(generationJobs)
    .set({ currentStep: step, progress })
    .where(eq(generationJobs.storyId, storyId));
  
  // Aussi publier sur Upstash Redis pour SSE/polling
  await redis.set(`job:${storyId}:progress`, JSON.stringify({ step, progress }), { ex: 3600 });
}
```

**Avantages d'Upstash Workflow :**
- Pas de timeout serverless (chaque step est indépendant)
- Retry automatique par step
- État persisté entre les steps
- Coût à l'usage (pas de serveur 24/7)
- Intégration native avec Vercel/Cloudflare

### 6.4 Progress Tracking (SSE ou Polling)

```typescript
// apps/api/src/routes/jobs.ts
import { Elysia, t } from 'elysia';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export const jobsRoutes = new Elysia({ prefix: '/jobs' })
  
  // Polling endpoint (simple, fonctionne partout)
  .get('/:jobId/status', async ({ params }) => {
    const progress = await redis.get(`job:${params.jobId}:progress`);
    
    if (!progress) {
      // Fallback sur la DB
      const job = await db.query.generationJobs.findFirst({
        where: eq(generationJobs.id, params.jobId),
      });
      return job || { status: 'not_found' };
    }
    
    return JSON.parse(progress as string);
  }, {
    params: t.Object({ jobId: t.String({ format: 'uuid' }) }),
  })
  
  // SSE endpoint (real-time, si supporté)
  .get('/:jobId/stream', async function* ({ params }) {
    const jobId = params.jobId;
    let lastProgress = 0;
    
    while (lastProgress < 100) {
      const data = await redis.get(`job:${jobId}:progress`);
      if (data) {
        const progress = JSON.parse(data as string);
        if (progress.progress !== lastProgress) {
          lastProgress = progress.progress;
          yield { data: JSON.stringify(progress) };
        }
      }
      
      // Check si terminé
      if (lastProgress >= 100) break;
      
      // Attendre avant le prochain check
      await new Promise(r => setTimeout(r, 1000));
    }
  }, {
    params: t.Object({ jobId: t.String({ format: 'uuid' }) }),
  });
```

```typescript
// apps/web/src/hooks/useJobProgress.ts
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface JobProgress {
  step: string;
  progress: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  result?: { audioUrl: string; duration: number };
}

export function useJobProgress(jobId: string | null) {
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!jobId) return;

    // Tenter SSE d'abord, fallback sur polling
    const eventSource = new EventSource(`/api/jobs/${jobId}/stream`);
    
    eventSource.onmessage = (event) => {
      setProgress(JSON.parse(event.data));
    };
    
    eventSource.onerror = () => {
      // Fallback sur polling si SSE échoue
      eventSource.close();
      startPolling();
    };

    const startPolling = () => {
      const interval = setInterval(async () => {
        try {
          const { data } = await api.jobs[jobId].status.get();
          setProgress(data);
          
          if (data?.status === 'completed' || data?.status === 'failed') {
            clearInterval(interval);
          }
        } catch (err) {
          setError(err as Error);
          clearInterval(interval);
        }
      }, 2000);
      
      return () => clearInterval(interval);
    };

    return () => eventSource.close();
  }, [jobId]);

  return { progress, error, isComplete: progress?.progress === 100 };
}
```

### 6.4 Schéma Base de Données (Drizzle)

```typescript
// packages/db/src/schema/childProfiles.ts
import { pgTable, uuid, text, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';

export const childProfiles = pgTable('child_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Identité
  firstName: text('first_name').notNull(),
  age: integer('age').notNull(),
  gender: text('gender', { 
    enum: ['boy', 'girl', 'neutral'] 
  }).notNull(),
  
  // Préférences (JSON pour flexibilité)
  preferences: jsonb('preferences').$type<ChildPreferences>().default({
    favoriteThemes: [],
    avoidThemes: [],
    includeChildAsCharacter: true,
    preferredHeroGender: 'same',
    preferredStoryDuration: '5min',
    narratorVoicePreference: 'any',
    language: 'fr',
  }),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// packages/db/src/schema/stories.ts
import { pgTable, uuid, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { childProfiles } from './childProfiles';

export const stories = pgTable('stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Relation avec le profil enfant
  childProfileId: uuid('child_profile_id')
    .references(() => childProfiles.id)
    .notNull(),
  
  // Input
  initialPrompt: text('initial_prompt').notNull(),
  enrichedConcept: jsonb('enriched_concept').$type<EnrichedConcept>(),
  answers: jsonb('answers').$type<QuestionAnswer[]>().default([]),
  
  // Generated
  script: jsonb('script').$type<StoryScript>(),
  
  // Output
  finalAudioUrl: text('final_audio_url'),
  duration: integer('duration'), // seconds
  
  // Metadata
  status: text('status', { 
    enum: ['draft', 'generating', 'ready', 'failed'] 
  }).default('draft'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations Drizzle
export const childProfilesRelations = relations(childProfiles, ({ many }) => ({
  stories: many(stories),
}));

export const storiesRelations = relations(stories, ({ one, many }) => ({
  childProfile: one(childProfiles, {
    fields: [stories.childProfileId],
    references: [childProfiles.id],
  }),
  segments: many(storySegments),
}));

// packages/db/src/schema/segments.ts
export const storySegments = pgTable('story_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').references(() => stories.id).notNull(),
  
  order: integer('order').notNull(),
  type: text('type', { 
    enum: ['narration', 'dialogue', 'pause', 'sound_effect', 'music_change'] 
  }).notNull(),
  
  content: jsonb('content').$type<SegmentContent>().notNull(),
  timing: jsonb('timing').$type<SegmentTiming>().notNull(),
  
  // Generated audio
  audioUrl: text('audio_url'),
  audioDuration: integer('audio_duration'), // ms
  
  createdAt: timestamp('created_at').defaultNow(),
});

// packages/db/src/schema/audioAssets.ts
export const audioAssets = pgTable('audio_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  type: text('type', { 
    enum: ['voice', 'sfx', 'music', 'ambiance'] 
  }).notNull(),
  
  // Pour le cache sémantique
  promptHash: text('prompt_hash').unique(),
  originalPrompt: text('original_prompt'),
  promptEmbedding: jsonb('prompt_embedding').$type<number[]>(), // Pour similarité
  
  // Audio
  url: text('url').notNull(),
  duration: integer('duration').notNull(), // ms
  format: text('format', { enum: ['mp3', 'wav'] }).default('mp3'),
  
  // Stats
  usageCount: integer('usage_count').default(0),
  cost: integer('cost'), // centimes
  
  createdAt: timestamp('created_at').defaultNow(),
});

// packages/db/src/schema/jobs.ts
export const generationJobs = pgTable('generation_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').references(() => stories.id).notNull(),
  
  status: text('status', { 
    enum: ['pending', 'processing', 'completed', 'failed'] 
  }).default('pending'),
  
  currentStep: text('current_step'),
  progress: integer('progress').default(0), // 0-100
  
  result: jsonb('result').$type<JobResult>(),
  error: text('error'),
  
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 6.5 API Elysia (Type-Safe)

```typescript
// apps/api/src/routes/childProfiles.ts
import { Elysia, t } from 'elysia';
import { db } from '@mio/db';
import { childProfiles } from '@mio/db/schema';

export const childProfilesRoutes = new Elysia({ prefix: '/profiles' })
  
  // Créer un profil enfant
  .post('/', async ({ body }) => {
    const profile = await db.insert(childProfiles).values({
      firstName: body.firstName,
      age: body.age,
      gender: body.gender,
      preferences: body.preferences,
    }).returning();
    
    return profile[0];
  }, {
    body: t.Object({
      firstName: t.String({ minLength: 1, maxLength: 50 }),
      age: t.Number({ minimum: 3, maximum: 12 }),
      gender: t.Union([
        t.Literal('boy'),
        t.Literal('girl'),
        t.Literal('neutral'),
      ]),
      preferences: t.Optional(t.Object({
        favoriteThemes: t.Optional(t.Array(t.String())),
        avoidThemes: t.Optional(t.Array(t.String())),
        includeChildAsCharacter: t.Optional(t.Boolean()),
        preferredHeroGender: t.Optional(t.Union([
          t.Literal('same'),
          t.Literal('any'),
        ])),
        preferredStoryDuration: t.Optional(t.Union([
          t.Literal('2min'),
          t.Literal('5min'),
          t.Literal('10min'),
        ])),
        narratorVoicePreference: t.Optional(t.Union([
          t.Literal('male'),
          t.Literal('female'),
          t.Literal('any'),
        ])),
        language: t.Optional(t.Union([
          t.Literal('fr'),
          t.Literal('en'),
        ])),
      })),
    }),
  })
  
  // Récupérer un profil
  .get('/:id', async ({ params }) => {
    const profile = await db.query.childProfiles.findFirst({
      where: eq(childProfiles.id, params.id),
      with: { stories: true },
    });
    
    if (!profile) throw new NotFoundError('Profile not found');
    return profile;
  }, {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
  })
  
  // Mettre à jour un profil
  .patch('/:id', async ({ params, body }) => {
    const updated = await db.update(childProfiles)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(childProfiles.id, params.id))
      .returning();
    
    return updated[0];
  }, {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    body: t.Partial(t.Object({
      firstName: t.String(),
      age: t.Number({ minimum: 3, maximum: 12 }),
      gender: t.Union([
        t.Literal('boy'),
        t.Literal('girl'),
        t.Literal('neutral'),
      ]),
      preferences: t.Object({
        favoriteThemes: t.Optional(t.Array(t.String())),
        avoidThemes: t.Optional(t.Array(t.String())),
        includeChildAsCharacter: t.Optional(t.Boolean()),
        preferredHeroGender: t.Optional(t.Union([
          t.Literal('same'),
          t.Literal('any'),
        ])),
        preferredStoryDuration: t.Optional(t.Union([
          t.Literal('2min'),
          t.Literal('5min'),
          t.Literal('10min'),
        ])),
        narratorVoicePreference: t.Optional(t.Union([
          t.Literal('male'),
          t.Literal('female'),
          t.Literal('any'),
        ])),
        language: t.Optional(t.Union([
          t.Literal('fr'),
          t.Literal('en'),
        ])),
      }),
    })),
  })
  
  // Lister tous les profils
  .get('/', async () => {
    return await db.query.childProfiles.findMany({
      orderBy: (profiles, { desc }) => [desc(profiles.createdAt)],
    });
  });

// apps/api/src/routes/stories.ts
import { Elysia, t } from 'elysia';
import { db } from '@mio/db';
import { stories, childProfiles } from '@mio/db/schema';

export const storiesRoutes = new Elysia({ prefix: '/stories' })
  
  // Créer une nouvelle histoire
  .post('/', async ({ body }) => {
    // Vérifier que le profil existe
    const profile = await db.query.childProfiles.findFirst({
      where: eq(childProfiles.id, body.childProfileId),
    });
    
    if (!profile) throw new NotFoundError('Child profile not found');
    
    const story = await db.insert(stories).values({
      childProfileId: body.childProfileId,
      initialPrompt: body.prompt,
    }).returning();
    
    return story[0];
  }, {
    body: t.Object({
      childProfileId: t.String({ format: 'uuid' }),
      prompt: t.String({ minLength: 3, maxLength: 500 }),
    }),
  })
  
  // Lancer l'enrichissement
  .post('/:id/enrich', async ({ params, body }) => {
    // Récupérer l'histoire avec le profil enfant
    const story = await db.query.stories.findFirst({
      where: eq(stories.id, params.id),
      with: { childProfile: true },
    });
    
    if (!story) throw new NotFoundError('Story not found');
    
    // Passer le profil au service d'enrichissement
    const enriched = await enrichmentService.enrich(
      story,
      story.childProfile,
      body.duration
    );
    
    return enriched;
  }, {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    body: t.Object({
      duration: t.Optional(t.Union([
        t.Literal('2min'),
        t.Literal('5min'),
        t.Literal('10min'),
      ])),
    }),
  })
  
  // Soumettre les réponses et lancer la génération
  .post('/:id/generate', async ({ params, body }) => {
    const job = await jobQueue.add('generateStory', {
      storyId: params.id,
      answers: body.answers,
    });
    
    return { jobId: job.id };
  }, {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    body: t.Object({
      answers: t.Array(t.Object({
        questionId: t.String(),
        value: t.String(),
      })),
    }),
  })
  
  // Récupérer une histoire
  .get('/:id', async ({ params }) => {
    const story = await db.query.stories.findFirst({
      where: eq(stories.id, params.id),
      with: { 
        segments: true,
        childProfile: true,
      },
    });
    
    if (!story) throw new NotFoundError('Story not found');
    return story;
  }, {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
  })
  
  // Lister les histoires d'un profil
  .get('/profile/:profileId', async ({ params }) => {
    return await db.query.stories.findMany({
      where: eq(stories.childProfileId, params.profileId),
      orderBy: (stories, { desc }) => [desc(stories.createdAt)],
    });
  }, {
    params: t.Object({ profileId: t.String({ format: 'uuid' }) }),
  });

// apps/api/src/index.ts
import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { childProfilesRoutes } from './routes/childProfiles';
import { storiesRoutes } from './routes/stories';
import { jobsRoutes } from './routes/jobs';

const app = new Elysia()
  .use(swagger())
  .use(cors())
  .use(childProfilesRoutes)
  .use(storiesRoutes)
  .use(jobsRoutes)
  .listen(3001);

export type App = typeof app;
console.log(`🦊 Elysia running at ${app.server?.hostname}:${app.server?.port}`);
```

### 6.6 Client Eden (Frontend Type-Safe)

```typescript
// apps/web/src/lib/api.ts
import { treaty } from '@elysiajs/eden';
import type { App } from '@mio/api';

export const api = treaty<App>('http://localhost:3001');

// Utilisation dans les composants
const createStory = async (prompt: string) => {
  const { data, error } = await api.stories.post({ prompt });
  if (error) throw error;
  return data;
};

const subscribeToProgress = (jobId: string, onProgress: (p: Progress) => void) => {
  const ws = api.jobs[jobId].progress.subscribe();
  ws.on('message', onProgress);
  return () => ws.close();
};
```

---

## 7. Prompt Engineering

### 7.1 System Prompt — Enrichissement

```markdown
Tu es un créateur d'histoires pour enfants. Tu reçois une idée brute 
et tu dois l'enrichir de manière créative tout en restant adapté à l'âge.

## PROFIL DE L'ENFANT
- Prénom: {{childProfile.firstName}}
- Âge: {{childProfile.age}} ans
- Genre: {{childProfile.gender}}
- Thèmes favoris: {{childProfile.preferences.favoriteThemes}}
- Thèmes à éviter: {{childProfile.preferences.avoidThemes}}
- Inclure l'enfant comme personnage: {{childProfile.preferences.includeChildAsCharacter}}
- Langue: {{childProfile.preferences.language}}

## RÈGLES D'ADAPTATION À L'ÂGE
{{#if age <= 4}}
- Vocabulaire très simple, phrases courtes (5-8 mots max)
- Histoire linéaire, pas de flashbacks
- Personnages clairement gentils ou un peu bêtes (pas méchants)
- Beaucoup de répétitions rassurantes
- Fin toujours très positive
{{else if age <= 6}}
- Vocabulaire simple, phrases courtes à moyennes
- Un petit obstacle facilement surmonté
- Émotions basiques (joie, tristesse, peur légère, surprise)
- Morale claire et explicite
{{else if age <= 9}}
- Vocabulaire enrichi, structures variées
- Conflits plus élaborés mais toujours résolubles
- Personnages nuancés
- Humour et jeux de mots simples OK
{{else}}
- Vocabulaire avancé, narration sophistiquée
- Intrigues avec rebondissements
- Thèmes plus profonds (amitié, courage, différence)
- Ironie légère et humour OK
{{/if}}

## RÈGLES GÉNÉRALES
- Contenu 100% adapté aux enfants
- Les conflits doivent être résolubles de manière positive
- Favoriser : amitié, courage, curiosité, gentillesse
- Si l'enfant est inclus comme personnage, utiliser son prénom: {{childProfile.firstName}}
{{#if childProfile.preferences.preferredHeroGender === 'same'}}
- Le héros principal doit être {{childProfile.gender === 'boy' ? 'un garçon' : childProfile.gender === 'girl' ? 'une fille' : 'neutre'}}
{{/if}}

## FORMAT DE SORTIE (JSON)
{
  "title": "Titre accrocheur",
  "mainCharacter": { 
    "name": "...", // Peut être {{childProfile.firstName}} si includeChildAsCharacter
    "description": "...",
    "personality": ["..."]
  },
  "supportingCharacters": [ ... ],
  "setting": { ... },
  "tone": "...",
  "themes": [ ... ],
  "plotSummary": "2-3 phrases décrivant l'arc narratif",
  "suggestedDuration": "5min",
  "vocabularyLevel": "{{vocabularyLevel}}",
  "childIncluded": true/false,
  "childCharacterName": "{{childProfile.firstName}}" // si inclus
}
```

### 7.2 System Prompt — Génération Script

```markdown
Tu es un scénariste audio professionnel pour histoires d'enfants.
Tu génères des scripts COMPLETS au format JSON avec toutes les 
directions audio nécessaires.

## PROFIL DE L'ENFANT
- Prénom: {{childProfile.firstName}}
- Âge: {{childProfile.age}} ans
- Niveau vocabulaire: {{vocabularyLevel}}
- Langue: {{childProfile.preferences.language}}

## ADAPTATION DU VOCABULAIRE ({{vocabularyLevel}})
{{#if vocabularyLevel === 'very_simple'}}
- Mots de 1-2 syllabes maximum
- Phrases de 5-8 mots
- Répétitions fréquentes ("Et puis... et puis...")
- Onomatopées encouragées ("Boum!", "Splash!")
{{else if vocabularyLevel === 'simple'}}
- Mots courants, éviter le jargon
- Phrases de 8-12 mots
- Connecteurs simples (mais, alors, parce que)
{{else if vocabularyLevel === 'medium'}}
- Vocabulaire varié
- Phrases jusqu'à 15 mots
- Descriptions plus riches
- Métaphores simples OK
{{else}}
- Vocabulaire riche
- Structures complexes OK
- Figures de style variées
{{/if}}

## STRUCTURE NARRATIVE
1. Accroche (10%) - Captiver immédiatement
2. Contexte (15%) - Présenter le monde et les personnages  
3. Problème (10%) - Introduire le défi
4. Aventure (40%) - Péripéties et progression
5. Climax (15%) - Moment fort
6. Résolution (10%) - Fin satisfaisante

## RÈGLES AUDIO
- Alterner narration et dialogues (ratio ~60/40)
- Dialogues courts (max 2 phrases par réplique)
- Indiquer l'émotion pour chaque dialogue
- Placer des effets sonores aux moments clés
- Prévoir des pauses pour la respiration narrative
{{#if childProfile.age <= 5}}
- Tempo plus lent, pauses plus longues
- Voix chaleureuse et rassurante pour la narration
{{/if}}

## FORMAT DE SORTIE
{
  "metadata": {
    "title": "...",
    "estimatedDuration": ..., // seconds
    "ageRange": [{{childProfile.age - 1}}, {{childProfile.age + 2}}],
    "vocabularyLevel": "{{vocabularyLevel}}",
    "language": "{{childProfile.preferences.language}}"
  },
  "segments": [
    {
      "id": "seg_001",
      "order": 1,
      "type": "narration",
      "content": {
        "text": "Il était une fois, dans une forêt enchantée...",
        "emotion": "warm"
      },
      "timing": {
        "pauseBefore": 500,
        "pauseAfter": 1000
      }
    },
    // ...
  ],
  "audioDirections": { ... }
}
```

---

## 8. Génération d'Assets Audio par IA

### 8.1 Stratégie Globale

Plutôt qu'une bibliothèque statique, on génère les assets audio à la demande via IA, ce qui permet une personnalisation maximale et évite les coûts de licence.

```typescript
interface AudioGenerationStrategy {
  soundEffects: 'elevenlabs_sfx';      // ElevenLabs Sound Effects API
  ambiances: 'elevenlabs_sfx';         // Loops générés
  music: 'suno' | 'udio';              // Génération musicale IA
  voices: 'elevenlabs_tts';            // Text-to-Speech
}
```

### 8.2 Effets Sonores (ElevenLabs Sound Effects)

**API Call :**
```typescript
interface SoundEffectRequest {
  prompt: string;           // Ex: "magical sparkle fairy dust"
  duration: number;         // Secondes (0.5 - 22s)
  promptInfluence: number;  // 0-1, plus haut = plus fidèle au prompt
}

// Exemple d'utilisation
const generateSFX = async (description: string): Promise<AudioBuffer> => {
  const response = await elevenLabs.soundEffects.generate({
    prompt: description,
    duration: 2,
    promptInfluence: 0.7
  });
  return response.audio;
};
```

**Mapping depuis le script :**
```typescript
// Le LLM génère des descriptions en langage naturel
interface ScriptSoundEffect {
  id: string;
  description: string;      // "porte en bois qui grince lentement"
  timing: SegmentTiming;
}

// Le système les traduit en prompts optimisés pour ElevenLabs
const sfxPromptOptimizer = {
  'porte qui grince': 'old wooden door creaking slowly, horror ambiance',
  'pas sur gravier': 'footsteps on gravel path, walking pace',
  'magie': 'magical sparkle sound, fairy dust, whimsical',
  // ... ou laisser le LLM générer directement des prompts optimisés
};
```

**Cache intelligent :**
```typescript
interface SFXCache {
  // Clé = hash du prompt normalisé
  // Valeur = URL du fichier audio généré
  cache: Map<string, CachedSFX>;
  
  // Réutiliser des SFX similaires
  findSimilar(prompt: string, threshold: number): CachedSFX | null;
}

interface CachedSFX {
  promptHash: string;
  originalPrompt: string;
  audioUrl: string;
  duration: number;
  generatedAt: Date;
  usageCount: number;
}
```

### 8.3 Musiques d'Ambiance (Suno API)

**Génération contextuelle :**
```typescript
interface MusicGenerationRequest {
  prompt: string;           // Description du mood
  style: string;            // Genre musical
  duration: number;         // Secondes
  instrumental: boolean;    // Toujours true pour nous
  bpm?: number;
}

// Exemples de prompts par mood
const musicPrompts: Record<StoryMood, string> = {
  adventure: 'orchestral adventure theme, heroic, inspiring, children movie soundtrack, instrumental',
  mystery: 'mysterious piano melody, subtle tension, curious, whimsical, instrumental',
  joyful: 'happy ukulele and light percussion, playful, cheerful, kids cartoon, instrumental',
  calm: 'gentle harp and soft strings, peaceful, bedtime story, lullaby style, instrumental',
  magical: 'enchanted forest theme, sparkling sounds, fantasy, wonder, instrumental',
  exciting: 'upbeat orchestral, building excitement, adventure climax, instrumental',
};

// Génération avec Suno
const generateMusic = async (mood: StoryMood, durationSec: number): Promise<string> => {
  const response = await suno.generate({
    prompt: musicPrompts[mood],
    duration: Math.min(durationSec, 120), // Max 2 min par génération
    instrumental: true,
  });
  
  // Si besoin de plus long, on loope intelligemment
  if (durationSec > 120) {
    return await createSeamlessLoop(response.audioUrl, durationSec);
  }
  
  return response.audioUrl;
};
```

**Transitions musicales :**
```typescript
// Gérer les changements de mood dans l'histoire
interface MusicTimeline {
  segments: MusicSegment[];
}

interface MusicSegment {
  mood: StoryMood;
  startTime: number;        // ms
  endTime: number;          // ms
  fadeIn: number;           // ms
  fadeOut: number;          // ms
  volume: number;           // 0-1
}

// Le mixage FFmpeg gère les crossfades entre segments
```

### 8.4 Ambiances de Fond (ElevenLabs + Loop)

```typescript
// Générer des ambiances loopables
const generateAmbiance = async (setting: Setting): Promise<string> => {
  const prompts: Record<AmbianceType, string> = {
    forest: 'forest ambiance, birds chirping, gentle wind through leaves, nature sounds',
    ocean: 'ocean waves gently crashing on shore, seagulls distant, peaceful beach',
    castle: 'medieval castle interior, distant echoes, torch crackling, stone walls',
    space: 'spaceship interior ambiance, soft engine hum, electronic beeps, sci-fi',
    city: 'city street ambiance, distant traffic, people walking, urban sounds',
    magical_realm: 'magical realm ambiance, sparkling sounds, ethereal whispers, fantasy',
    underwater: 'underwater ambiance, bubbles, muffled sounds, deep ocean',
  };
  
  // Générer 30s puis créer un loop seamless
  const audio = await elevenLabs.soundEffects.generate({
    prompt: prompts[setting.ambiance],
    duration: 30,
    promptInfluence: 0.6
  });
  
  return await createSeamlessLoop(audio, targetDuration);
};

// Création de loop seamless avec FFmpeg
const createSeamlessLoop = async (audioUrl: string, targetDuration: number): Promise<string> => {
  // Crossfade les extrémités pour un loop sans coupure
  // ffmpeg -i input.wav -filter_complex "acrossfade=d=2:c1=tri:c2=tri" looped.wav
};
```

### 8.5 Estimation des Coûts Audio IA

| Type | Service | Coût unitaire | Par histoire 5min |
|------|---------|---------------|-------------------|
| Voix (narration + dialogues) | ElevenLabs TTS | ~$0.30/min | ~$0.40 |
| Effets sonores (8-12 effets) | ElevenLabs SFX | ~$0.01/effet | ~$0.10 |
| Musique de fond | Suno | ~$0.05/génération | ~$0.10 |
| Ambiance | ElevenLabs SFX | ~$0.02/ambiance | ~$0.04 |
| **TOTAL** | | | **~$0.64** |

### 8.6 Optimisations & Cache (Upstash Redis)

```typescript
// packages/shared/src/services/audioCache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

interface AudioCacheStrategy {
  // Niveau 1 : Cache exact (même prompt)
  exactMatch: {
    ttl: 60 * 60 * 24 * 30, // 30 jours
    prefix: 'audio:exact:',
  };
  
  // Niveau 2 : Cache sémantique (prompts similaires)
  // Stocké en DB avec embeddings pour recherche vectorielle
  semanticMatch: {
    similarityThreshold: 0.85,
    embeddingModel: 'text-embedding-3-small',
  };
}

export const audioCache = {
  // Hash du prompt pour clé unique
  hashPrompt(prompt: string): string {
    return Bun.hash(prompt.toLowerCase().trim()).toString(16);
  },

  async get(prompt: string): Promise<CachedAudio | null> {
    const hash = this.hashPrompt(prompt);
    const cached = await redis.get<CachedAudio>(`audio:exact:${hash}`);
    return cached;
  },

  async set(prompt: string, audio: GeneratedAudio): Promise<void> {
    const hash = this.hashPrompt(prompt);
    await redis.set(
      `audio:exact:${hash}`,
      {
        url: audio.url,
        duration: audio.duration,
        prompt,
        createdAt: new Date().toISOString(),
      },
      { ex: 60 * 60 * 24 * 30 } // 30 jours
    );
    
    // Incrémenter le compteur d'usage
    await redis.incr(`audio:usage:${hash}`);
  },

  // Pour le cache sémantique, on utilise la DB avec pgvector
  async findSimilar(prompt: string, threshold: number): Promise<CachedAudio | null> {
    // Générer l'embedding du prompt
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: prompt,
    });
    
    // Recherche vectorielle dans la DB
    const similar = await db.execute(sql`
      SELECT url, duration, original_prompt, 
             1 - (prompt_embedding <=> ${embedding.data[0].embedding}::vector) as similarity
      FROM audio_assets
      WHERE 1 - (prompt_embedding <=> ${embedding.data[0].embedding}::vector) > ${threshold}
      ORDER BY similarity DESC
      LIMIT 1
    `);
    
    return similar[0] || null;
  },
};

// Réduire les coûts en réutilisant
const getSoundEffect = async (description: string): Promise<string> => {
  // 1. Check cache exact (Redis - très rapide)
  const cached = await audioCache.get(description);
  if (cached) {
    console.log(`[Cache HIT] Exact match for: ${description}`);
    return cached.url;
  }
  
  // 2. Check similarité sémantique (DB - plus lent mais plus flexible)
  const similar = await audioCache.findSimilar(description, 0.85);
  if (similar) {
    console.log(`[Cache HIT] Semantic match (${similar.similarity}): ${description}`);
    return similar.url;
  }
  
  // 3. Générer nouveau
  console.log(`[Cache MISS] Generating: ${description}`);
  const audio = await elevenLabsService.generateSFX({
    prompt: description,
    duration: 2,
  });
  
  // 4. Sauvegarder dans les deux caches
  await audioCache.set(description, audio);
  await saveToDbWithEmbedding(description, audio);
  
  return audio.url;
};
```

---

## 9. Fonctionnalités Futures (Post-MVP)

### 9.1 Histoires Interactives

```typescript
// Extension du modèle pour branches narratives
interface InteractiveStoryScript extends StoryScript {
  branches: StoryBranch[];
  decisionPoints: DecisionPoint[];
}

interface DecisionPoint {
  afterSegmentId: string;
  question: string;           // Question posée à l'enfant
  options: BranchOption[];
  timeout: number;            // ms avant choix par défaut
  defaultOptionId: string;
}

interface BranchOption {
  id: string;
  label: string;              // Texte du choix
  icon?: string;              // Illustration du choix
  leadsTo: string;            // branchId ou segmentId
}

interface StoryBranch {
  id: string;
  condition: string;          // optionId qui y mène
  segments: StorySegment[];
  mergesAt?: string;          // Retour au tronc commun
}
```

### 9.2 Personnalisation Avancée

- **Voice Cloning** : L'enfant enregistre sa voix → devient un personnage
- **Photo to Character** : Upload photo → génère description du personnage
- **Univers persistants** : Retrouver les mêmes personnages d'histoire en histoire
- **Mode série** : Histoires en épisodes avec continuité

### 9.3 Social & Partage

- Partage d'histoires entre familles
- Bibliothèque communautaire (modération IA + humaine)
- Classements des histoires populaires

---

## 10. Considérations Techniques

### 10.1 Performance & Coûts

| Étape | Temps estimé | Coût estimé | Service |
|-------|--------------|-------------|---------|
| LLM Enrichissement | 2-3s | ~$0.01 | OpenAI/Anthropic |
| LLM Script | 5-10s | ~$0.05 | OpenAI/Anthropic |
| ElevenLabs TTS (5min audio) | 30-60s | ~$0.40 | ElevenLabs |
| ElevenLabs SFX (~10 effets) | 20-30s | ~$0.10 | ElevenLabs |
| Suno Music (1 track) | 30-60s | ~$0.10 | Suno |
| Ambiance generation | 10-15s | ~$0.04 | ElevenLabs |
| FFmpeg Mixage | 10-30s | ~$0.001 | Scaleway Container |
| **TOTAL** | **~120s** | **~$0.70** | |

**Coûts infrastructure serverless (estimés) :**
| Service | Usage/mois | Coût estimé |
|---------|------------|-------------|
| Vercel (Next.js frontend) | 100k requests | Free tier |
| Scaleway Serverless Containers | 1k invocations, 1GB RAM | ~$5 |
| Supabase (PostgreSQL + Storage) | 500MB DB + 1GB Storage | Free tier |
| Upstash Redis | 10k commands/jour | Free tier |
| Upstash Workflow | 1k executions | ~$10 |
| **TOTAL infra** | | **~$15/mois** |

*Note: Avec le cache Redis, les coûts audio peuvent descendre à ~$0.45 après quelques générations.*

### 10.2 Mixage Audio avec fluent-ffmpeg

Le mixage audio s'exécute sur Scaleway Serverless Containers avec FFmpeg natif.

**Configuration Scaleway :**
- Timeout : jusqu'à 15 minutes (largement suffisant)
- RAM : 1GB recommandé pour le mixage
- Image Docker avec FFmpeg pré-installé

```dockerfile
# Dockerfile pour l'API
FROM oven/bun:1.0-alpine

# Installer FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

EXPOSE 3001
CMD ["bun", "run", "start"]
```

**Service de mixage avec fluent-ffmpeg :**
```typescript
// apps/api/src/services/audio/ffmpegMixer.ts
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlink, writeFile, readFile } from 'fs/promises';
import { randomUUID } from 'crypto';

interface MixingInput {
  voiceSegments: { segmentId: string; audioUrl: string; timing: SegmentTiming }[];
  sfxSegments: { segmentId: string; audioUrl: string; timing: SegmentTiming }[];
  musicTrack: { url: string; volume: number };
  ambianceTrack: { url: string; volume: number };
  script: StoryScript;
}

export async function mixStory(input: MixingInput): Promise<Buffer> {
  const workDir = join(tmpdir(), `mix-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  try {
    // 1. Télécharger tous les fichiers audio
    const downloads = await downloadAllAudio(input, workDir);

    // 2. Construire la timeline des voix avec pauses
    const voiceConcat = await createVoiceTimeline(downloads.voices, input.script, workDir);

    // 3. Mixer le tout
    const outputPath = join(workDir, 'final.mp3');
    
    await new Promise<void>((resolve, reject) => {
      let command = ffmpeg();

      // Input 1: Voix concaténées
      command = command.input(voiceConcat);

      // Input 2: Musique de fond
      command = command.input(downloads.music);

      // Input 3: Ambiance
      command = command.input(downloads.ambiance);

      // Ajouter les SFX avec leurs timings
      downloads.sfx.forEach(sfx => {
        command = command.input(sfx.path);
      });

      // Construire le filtre complexe
      const filterComplex = buildFilterComplex(input, downloads);

      command
        .complexFilter(filterComplex.filters, filterComplex.outputLabel)
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .audioFrequency(44100)
        .audioChannels(2)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    // 4. Lire le résultat
    const finalAudio = await readFile(outputPath);
    return finalAudio;

  } finally {
    // Cleanup
    await rm(workDir, { recursive: true, force: true });
  }
}

function buildFilterComplex(input: MixingInput, downloads: Downloads): FilterComplex {
  const filters: string[] = [];
  let inputIndex = 0;

  // Voix (input 0) - volume principal
  filters.push(`[0:a]volume=1.0[voice]`);
  inputIndex++;

  // Musique (input 1) - volume réduit + ducking
  filters.push(`[1:a]volume=${input.musicTrack.volume}[music_raw]`);
  // Sidechain compression : baisser la musique quand il y a de la voix
  filters.push(`[music_raw][voice]sidechaincompress=threshold=0.02:ratio=6:attack=50:release=500[music]`);
  inputIndex++;

  // Ambiance (input 2) - volume faible, loop si nécessaire
  filters.push(`[2:a]volume=${input.ambianceTrack.volume},aloop=loop=-1:size=2e9[ambiance_loop]`);
  inputIndex++;

  // SFX avec leurs délais
  const sfxLabels: string[] = [];
  downloads.sfx.forEach((sfx, i) => {
    const delay = sfx.timing.startMs;
    const label = `sfx${i}`;
    filters.push(`[${inputIndex}:a]adelay=${delay}|${delay},volume=0.8[${label}]`);
    sfxLabels.push(`[${label}]`);
    inputIndex++;
  });

  // Mix final
  const allInputs = `[voice][music][ambiance_loop]${sfxLabels.join('')}`;
  const inputCount = 3 + sfxLabels.length;
  filters.push(`${allInputs}amix=inputs=${inputCount}:duration=first:dropout_transition=2[premix]`);
  
  // Normalisation finale
  filters.push(`[premix]loudnorm=I=-16:LRA=11:TP=-1.5[final]`);

  return {
    filters: filters.join(';'),
    outputLabel: 'final',
  };
}

async function createVoiceTimeline(
  voices: VoiceDownload[], 
  script: StoryScript,
  workDir: string
): Promise<string> {
  // Créer un fichier de concat avec silences entre les segments
  const concatListPath = join(workDir, 'concat.txt');
  const silencePath = join(workDir, 'silence.mp3');

  // Générer des fichiers de silence de différentes durées
  const silences = new Map<number, string>();
  
  const lines: string[] = [];
  
  for (const voice of voices) {
    const segment = script.segments.find(s => s.id === voice.segmentId);
    if (!segment) continue;

    // Pause avant
    if (segment.timing.pauseBefore > 0) {
      const silencePath = await getOrCreateSilence(segment.timing.pauseBefore, workDir, silences);
      lines.push(`file '${silencePath}'`);
    }

    // Audio du segment
    lines.push(`file '${voice.path}'`);

    // Pause après
    if (segment.timing.pauseAfter > 0) {
      const silencePath = await getOrCreateSilence(segment.timing.pauseAfter, workDir, silences);
      lines.push(`file '${silencePath}'`);
    }
  }

  await writeFile(concatListPath, lines.join('\n'));

  // Concaténer
  const outputPath = join(workDir, 'voices_timeline.mp3');
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(concatListPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .audioCodec('libmp3lame')
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });

  return outputPath;
}

async function getOrCreateSilence(
  durationMs: number, 
  workDir: string, 
  cache: Map<number, string>
): Promise<string> {
  // Arrondir à 100ms pour réutiliser les fichiers
  const roundedMs = Math.round(durationMs / 100) * 100;
  
  if (cache.has(roundedMs)) {
    return cache.get(roundedMs)!;
  }

  const path = join(workDir, `silence_${roundedMs}ms.mp3`);
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input('anullsrc=r=44100:cl=stereo')
      .inputFormat('lavfi')
      .duration(roundedMs / 1000)
      .audioCodec('libmp3lame')
      .output(path)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });

  cache.set(roundedMs, path);
  return path;
}
```

**Avantages de cette approche :**
- ✅ FFmpeg natif, toutes les fonctionnalités (ducking, normalisation, etc.)
- ✅ fluent-ffmpeg = API propre et typée
- ✅ Scaleway Serverless = scale to zero, pay-per-use
- ✅ Timeout 15 min = largement suffisant pour mixer une histoire de 10-15 min
- ✅ 1GB RAM = confortable pour le traitement audio

### 10.3 Gestion d'Erreurs

```typescript
// Retry strategy par service
const retryConfig = {
  llm: { maxRetries: 3, backoff: 'exponential', maxDelay: 10000 },
  elevenLabs: { maxRetries: 2, backoff: 'linear', maxDelay: 5000 },
  ffmpeg: { maxRetries: 1 }, // Erreurs souvent non-récupérables
};

// Fallbacks
const fallbackStrategies = {
  llmFailure: 'useTemplateStory',      // Histoire pré-écrite
  elevenLabsFailure: 'useCachedVoice', // Voix similaire en cache
  ffmpegFailure: 'serveUnmixedAudio',  // Audio sans effets
};
```

---

## 11. Sécurité & Conformité

### 11.1 Protection des Mineurs

- **Filtrage contenu** : Double vérification LLM + règles métier
- **Pas de données personnelles** : Pas de stockage nom/âge réel
- **Modération proactive** : Détection prompts inappropriés
- **Logs auditables** : Historique des générations pour review

### 11.2 RGPD / COPPA

- Consentement parental requis pour compte
- Pas de tracking publicitaire
- Droit à l'effacement complet
- Données audio effaçables

### 11.3 Content Policy

```typescript
const contentPolicy = {
  prohibited: [
    'violence explicite',
    'thèmes adultes',
    'langage grossier', 
    'discrimination',
    'contenu effrayant excessif',
  ],
  moderated: [
    'conflits entre personnages',  // OK si résolution positive
    'personnages tristes',         // OK si arc vers le bonheur
    'petites peurs',               // OK si surmontées
  ],
  encouraged: [
    'amitié',
    'courage',
    'créativité',
    'diversité',
    'résolution de problèmes',
  ],
};
```

---

## 12. Roadmap

### Phase 1 — MVP (8 semaines)

| Semaine | Objectifs |
|---------|-----------|
| 1-2 | Setup Nx workspace, packages db (Drizzle + Supabase) + shared, Upstash (Redis + Workflow), Supabase Storage bucket, Dockerfile API |
| 3-4 | Intégration LLM (enrichissement + script), prompts engineering, tests unitaires |
| 5-6 | Intégration ElevenLabs (TTS + SFX) + Suno, pipeline fluent-ffmpeg complet |
| 7 | UI PWA (flow création, player audio), progress tracking SSE/polling |
| 8 | Tests e2e, déploiement Vercel (web) + Scaleway (API), PWA config |

**Commandes Nx utiles :**
```bash
# Lancer l'API en local
nx serve api

# Lancer le frontend
nx serve web

# Lancer les deux en parallèle
nx run-many -t serve -p api web

# Générer les migrations Drizzle
nx run db:generate

# Pousser les migrations vers Neon
nx run db:push

# Build production
nx run-many -t build

# Build Docker pour Scaleway
nx run api:docker-build

# Déployer
nx run web:deploy      # Vercel
nx run api:deploy      # Scaleway
```

**Services à configurer :**
```bash
# Variables d'environnement requises

# Upstash
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
UPSTASH_WORKFLOW_URL=
UPSTASH_WORKFLOW_TOKEN=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=              # Supabase PostgreSQL connection string

# AI Services
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
SUNO_API_KEY=

# Scaleway (pour déploiement)
SCW_ACCESS_KEY=
SCW_SECRET_KEY=
SCW_PROJECT_ID=
```

**Architecture de déploiement :**
```
┌─────────────────┐     ┌─────────────────────────────────┐
│  Vercel         │     │  Scaleway Serverless Containers │
│  (Next.js PWA)  │────▶│  (Elysia API + FFmpeg)          │
└─────────────────┘     └─────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
   ┌─────────────┐           ┌─────────────┐            ┌─────────────┐
   │ Supabase    │           │ Upstash     │            │ Supabase    │
   │ PostgreSQL  │           │ Redis +     │            │ Storage     │
   │             │           │ Workflow    │            │ (audio)     │
   └─────────────┘           └─────────────┘            └─────────────┘
```

### Phase 2 — Polish (4 semaines)

- Amélioration qualité audio (ducking avancé, compression multi-bande)
- Cache intelligent (exact Redis + sémantique pgvector)
- Onboarding utilisateur animé
- Analytics (Posthog ou Vercel Analytics)
- Optimisation cold starts Scaleway

### Phase 3 — Interactivité (6 semaines)

- Système de branches narratives
- Player interactif avec choix vocaux/touch
- Génération conditionnelle des branches
- Sauvegarde de progression

---

## 13. Questions Ouvertes (Post-MVP)

Ces sujets seront traités après le MVP :

1. **Monétisation** : Freemium vs Abonnement
2. **Authentification** : Magic link vs Social login
3. **Hébergement** : À définir selon les besoins de scaling
4. **Multi-langue** : FR d'abord, EN ensuite ?

---

## Annexes

### A. Références ElevenLabs

- [TTS API Documentation](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Sound Effects API](https://elevenlabs.io/docs/api-reference/sound-generation)
- Voices recommandées pour enfants : Rachel, Domi, Bella (expressives)
- Voices recommandées pour narration : Adam, Antoni (neutres)

### B. Références Suno/Udio

- [Suno API](https://suno.com/api) — Génération musicale instrumentale
- Tips: Toujours ajouter "instrumental" au prompt pour éviter les voix
- Durée max par génération : 2 minutes (looper si besoin)

### C. Références FFmpeg

```bash
# Exemple de commande de mixage avec ducking
ffmpeg -i voice.wav -i music.wav -i ambiance.wav -i sfx.wav \
  -filter_complex "
    [1:a]volume=0.25[music];
    [2:a]volume=0.15[amb];
    [3:a]adelay=5000|5000[sfx];
    [0:a][music]sidechaincompress=threshold=0.02:ratio=4:attack=50:release=300[ducked];
    [ducked][amb][sfx]amix=inputs=3:duration=first[out]
  " \
  -map "[out]" output.mp3

# Création de loop seamless
ffmpeg -i input.wav -filter_complex "
  [0:a]asplit=2[a][b];
  [a]atrim=0:28[main];
  [b]atrim=26:30,afade=t=out:st=0:d=2[tail];
  [b]atrim=0:4,afade=t=in:st=0:d=2[head];
  [tail][head]acrossfade=d=2[loop];
  [main][loop]concat=n=2:v=0:a=1
" looped.wav
```

### D. PWA Configuration

```json
// public/manifest.json
{
  "name": "Mio",
  "short_name": "Mio",
  "description": "Crée des histoires audio magiques",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

*Document vivant — Dernière mise à jour : Janvier 2026*
