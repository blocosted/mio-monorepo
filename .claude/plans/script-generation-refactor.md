# Plan de Refactoring - Script Generation Service

## Contexte

Problèmes identifiés dans l'implémentation actuelle:
1. **Durée imprécise**: Le LLM génère des scripts 3x trop courts (106s vs 300s attendus)
2. **Structure séquentielle**: Impossible de superposer segments (SFX + voix, musique + narration)
3. **Couplage LLM**: Logique métier mélangée avec l'implémentation OpenAI
4. **Non-compatible ElevenLabs v3**: Pas d'audio tags, pas de text-to-dialogue

## Architecture Cible

### 1. Séparation des Responsabilités

```
┌─────────────────────────────────────────────────────────────────┐
│                    ScriptGenerationService                       │
│  (Logique métier: calcul durée, validation, orchestration)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ILLMProvider (Interface)                    │
│  enrichStory(), generateRawScript()                              │
└─────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ OpenAI   │  │ Claude   │  │  Grok    │  │ Mistral  │
   │ Provider │  │ Provider │  │ Provider │  │ Provider │
   └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### 2. Nouveau Schéma Timeline-Based

```typescript
// Tracks audio superposables
interface AudioTrack {
  id: string;
  type: 'voice' | 'sfx' | 'music' | 'ambiance';
  segments: TimelineSegment[];
}

// Segment avec position temporelle absolue
interface TimelineSegment {
  id: string;
  trackId: string;
  startTime: number;      // Position absolue en secondes
  duration: number;       // Durée en secondes
  content: SegmentContent;
}

// Contenu selon le type
type SegmentContent =
  | VoiceContent      // narration ou dialogue
  | SfxContent        // effet sonore
  | MusicContent      // changement de musique
  | AmbianceContent;  // ambiance de fond

interface VoiceContent {
  type: 'narration' | 'dialogue';
  text: string;
  characterName?: string;
  voiceId?: string;           // ElevenLabs voice ID
  audioTags?: string[];       // [laughs], [whispering], etc.
  emotion?: Emotion;
  // ElevenLabs voice settings
  voiceSettings?: {
    stability?: number;       // 0-1
    similarityBoost?: number; // 0-1
    style?: number;           // 0+
    speed?: number;           // playback speed
  };
}

interface SfxContent {
  type: 'sfx';
  description: string;        // Natural language pour ElevenLabs
  promptInfluence?: number;   // 0-1, default 0.3
  loop?: boolean;
}

interface MusicContent {
  type: 'music';
  mood: string;
  fadeIn?: number;
  fadeOut?: number;
}

// Script complet avec timeline
interface StoryScript {
  metadata: {
    title: string;
    targetDuration: number;      // Durée cible en secondes
    actualDuration: number;      // Durée calculée
    vocabularyLevel: VocabularyLevel;
    language: Language;
    wordCount: number;           // Nombre total de mots
  };
  characters: CharacterVoiceMap[];
  tracks: AudioTrack[];
}

interface CharacterVoiceMap {
  characterName: string;
  voiceId?: string;
  voiceDescription: string;
}
```

### 3. Calcul Précis de la Durée

```typescript
// Constantes de calcul
const WORDS_PER_MINUTE = 150;        // Vitesse de lecture standard
const WORDS_PER_SECOND = 2.5;        // 150/60
const PAUSE_BETWEEN_SEGMENTS = 0.5;  // Pause naturelle
const MUSIC_FADE_DURATION = 2;       // Fondu musique
const AVG_SFX_DURATION = 3;          // Durée moyenne effet sonore

interface DurationBudget {
  totalSeconds: number;
  voiceSeconds: number;      // 70-75% du temps
  sfxSeconds: number;        // 10-15%
  musicTransitions: number;  // 5%
  pausesSeconds: number;     // 10%
}

function calculateDurationBudget(targetMinutes: number): DurationBudget {
  const total = targetMinutes * 60;
  return {
    totalSeconds: total,
    voiceSeconds: total * 0.72,      // ~216s pour 5min
    sfxSeconds: total * 0.12,        // ~36s
    musicTransitions: total * 0.06,  // ~18s
    pausesSeconds: total * 0.10,     // ~30s
  };
}

function calculateTargetWordCount(voiceSeconds: number): number {
  return Math.round(voiceSeconds * WORDS_PER_SECOND);
}

// Pour 5 minutes:
// - Voice budget: 216s
// - Target words: 540 mots
// - Segments narration/dialogue: ~540 mots répartis
```

### 4. Prompt Engineering Amélioré

Le prompt doit spécifier:
1. **Nombre exact de mots** à générer (pas un nombre de segments)
2. **Structure 3 actes** avec allocation de mots par acte
3. **Audio tags ElevenLabs** pour les émotions
4. **Timeline** avec positions temporelles

```
## Word Budget (STRICT)
Total voice content: exactly 540 words (+/- 10%)
- Act 1 (Setup): ~110 words (20%)
- Act 2 (Confrontation): ~320 words (60%)
- Act 3 (Resolution): ~110 words (20%)

## Audio Tags (ElevenLabs v3)
Use square bracket tags for emotional delivery:
- Emotions: [excited], [nervous], [calm], [sad]
- Reactions: [laughs], [sighs], [gasps], [whispers]
- Delivery: [slowly], [urgently], [softly]

Example: "[nervous] I... I'm not sure about this. [gulps] But let's try."
```

### 5. Validation et Retry

```typescript
interface ValidationResult {
  isValid: boolean;
  wordCount: number;
  estimatedDuration: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// Critères de validation
const VALIDATION_RULES = {
  wordCountTolerance: 0.15,     // ±15% du target
  minNarrationSegments: 8,
  minDialogueSegments: 6,
  minSfxSegments: 4,
  maxConsecutiveSameType: 3,
};

// Retry avec feedback
async function generateWithRetry(
  input: GenerateScriptInput,
  maxAttempts: number = 3
): Promise<StoryScript> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const script = await llmProvider.generateRawScript(input);
    const validation = validateScript(script, input.targetDuration);

    if (validation.isValid) {
      return script;
    }

    // Feedback pour retry
    input.feedback = buildFeedback(validation);
  }
  throw new Error('Script generation failed after max attempts');
}
```

## Plan d'Implémentation

### Phase 1: Nouveau Schéma (packages/shared)
- [ ] Créer `StoryScript` interface
- [ ] Créer `AudioTrack`, `TimelineSegment` interfaces
- [ ] Créer `VoiceContent`, `SfxContent`, `MusicContent` types
- [ ] Ajouter `CharacterVoiceMap` pour mapping voix ElevenLabs
- [ ] Mettre à jour exports

### Phase 2: Abstraction LLM Provider (apps/api/services/llm)
- [ ] Créer `ILLMProvider` interface (prompts in, JSON out)
- [ ] Créer `OpenAIProvider` implémentation
- [ ] Créer `ClaudeProvider` implémentation (stub)
- [ ] Créer `LLMProviderFactory` pour instanciation

### Phase 3: Service Métier (apps/api/services/llm)
- [ ] Créer `ScriptGenerationService` (logique métier)
- [ ] Implémenter `DurationCalculator` helper
- [ ] Implémenter `ScriptValidator` avec rules
- [ ] Implémenter retry logic avec feedback

### Phase 4: Prompts Refactor
- [ ] Réécrire prompt avec word budget
- [ ] Ajouter documentation audio tags ElevenLabs
- [ ] Ajouter exemples timeline
- [ ] Ajouter critères de validation explicites

### Phase 5: Tests et CLI
- [ ] Écrire tests unitaires pour calculator
- [ ] Écrire tests unitaires pour validator
- [ ] Mettre à jour tests d'intégration
- [ ] Mettre à jour CLI pour nouveau format
- [ ] Test E2E avec appel LLM réel

## Migration

Le schéma `StoryScript` existant sera conservé comme `StoryScriptV1` pour compatibilité. Un mapper convertira `StoryScript` vers `V1` si nécessaire pour les API existantes.

## Estimation

- Phase 1: Types et schémas
- Phase 2: Abstraction providers
- Phase 3: Service métier
- Phase 4: Prompts
- Phase 5: Tests

Total: Refactoring significatif mais modulaire.
