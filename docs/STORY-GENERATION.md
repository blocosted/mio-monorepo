# Workflow de génération d’histoires

Ce document décrit le workflow “LLM-first” utilisé aujourd’hui pour passer de:

**(1) prompt initial** → **(2) concept enrichi** → **(3) script audio (timeline)** → **(4) validation + retry**

## 1) Enrichissement (prompt → concept)

### Entrées

- **Prompt**: une idée courte.
- **Profil**: un profil minimal de l’enfant (âge, prénom, langue, thèmes à inclure/éviter).

### Sortie

- **`EnrichedConcept`**: titre, personnages, décor, tonalité, thèmes, synopsis.

### Commande (CLI)

La CLI LLM est disponible via Nx:

```bash
nx run scripts:llm -- enrich-story --prompt "A child finds a mysterious door in a tree." --profile emilie
```

Options utiles:
- `--all`: lance l’enrichissement pour tous les profils de test.
- `--save=false`: n’écrit pas les artifacts sur disque.
- `--storeDir .mio-data`: répertoire des artifacts (par défaut).
- `--dryRun`: affiche les prompts et le payload sans appeler le provider.
- `--envFile <path>`: charge un fichier `.env` spécifique.

### Artifacts (débogage)

Quand `--save=true`, la commande écrit une exécution dans `.mio-data/` (gitignored), incluant:
- `input.json`
- `prompts.json`
- `output.json`
- `meta.json`

Le chemin exact est affiché dans la sortie JSON (`artifactsDir`).

## 2) Génération de script (concept → script audio timeline)

### Objectif

Générer un script audio “premium” avec:
- **contrôle de durée** par budget de mots,
- **structure narrative 3 actes**,
- **pistes audio** (voix, SFX, musique),
- **compatibilité tags audio** (ex: `[whispering]`, `[laughs]`).

### Entrées

- `EnrichedConcept` (issu de l’enrichissement)
- Profil (pour langue + vocabulaire)
- **Guided answers** (optionnel) sous forme JSON:
  - exemple: `[{"questionId":"ending","value":"happy"}]`
- `targetDurationMinutes` (ex: 5)

### Sortie

Un JSON **`StoryScript`** contenant:
- `metadata` (durée cible, langue, niveau vocabulaire, wordCount, etc.)
- `tracks` (voice/sfx/music/ambiance)
- `characters` (descriptions de voix)

### Commande (CLI)

La commande exige **soit** un fichier issu d’un run `enrich-story`, **soit** un input “generate-script”:

```bash
nx run scripts:llm -- generate-script --enrichInputFile "<path>/input.json" --provider openai --targetDurationMinutes 5
```

Avec des réponses guidées:

```bash
nx run scripts:llm -- generate-script --enrichInputFile "<path>/input.json" --answers '[{"questionId":"ending","value":"happy"}]' --provider openai --targetDurationMinutes 5
```

Notes:
- `--enrichInputFile` peut pointer sur `input.json` **ou** `output.json` d’un run `enrich-story`.
- `--provider` vaut `openai` ou `anthropic`.
- `--dryRun` permet d’inspecter le `systemPrompt` / `userPrompt` et les contraintes calculées.

## 3) Contrainte de durée (budget de mots)

Le système vise une vitesse de lecture d’environ **150 mots/min** (≈ 2.5 mots/seconde) pour la voix.

- Durée cible (ex: 5 min) → budget de secondes
- Budget “voice” → **target word count**
- Le prompt applique une **inflation** selon le provider (ex: OpenAI sous-génère souvent)

## 4) Validation & retry

La génération de script est validée automatiquement, notamment sur:
- **word count** (trop court = erreur bloquante)
- minimum de segments narration/dialogue/SFX
- cohérence de timeline (pas d’overlap sur la piste voix)

Si la validation échoue, le système génère un feedback (en anglais) et retente (jusqu’à 3 tentatives).

## 5) Itération sur la qualité (où agir)

Pour améliorer la qualité de sortie:
- **prompts**:
  - `apps/api/src/services/llm/prompts/enrichment.prompts.ts`
  - `apps/api/src/services/llm/prompts/scriptGeneration.prompts.ts`
- **validation / règles**:
  - `apps/api/src/services/llm/script-generation.service.ts`
- **fixtures de profils** (local CLI):
  - `packages/scripts/src/llm/enrich-story.ts`
  - `packages/scripts/src/llm/generate-script.ts`

