# Contribuer (workflow génération d’histoires)

Ce guide est centré sur l’itération des prompts et du workflow **enrichissement → script**.

## Prérequis

- Bun (v1.2+)
- Node.js (v20+ pour certains outils)

## Setup local

```bash
bun install
cp env.template .env.local
```

Renseigner au minimum:
- `OPENAI_API_KEY` (ou `ANTHROPIC_API_KEY`)
- `LLM_PROVIDER` (optionnel, défaut: `openai`)

## Boucle rapide: itérer sur le contenu généré

### 1) Enrichissement (prompt → concept)

```bash
nx run scripts:llm -- enrich-story --prompt "A child finds a mysterious door in a tree." --profile emilie
```

Pour inspecter les prompts sans appel LLM:

```bash
nx run scripts:llm -- enrich-story --prompt "..." --profile emilie --dryRun
```

### 2) Génération script (concept → timeline JSON)

Après un run `enrich-story`, récupérer `artifactsDir` puis exécuter:

```bash
nx run scripts:llm -- generate-script --enrichInputFile "<artifactsDir>/input.json" --provider openai --targetDurationMinutes 5
```

Avec réponses guidées:

```bash
nx run scripts:llm -- generate-script --enrichInputFile "<artifactsDir>/input.json" --answers '[{"questionId":"ending","value":"happy"}]' --provider openai --targetDurationMinutes 5
```

### 3) Lire les artifacts

Les runs sont stockés dans `.mio-data/` (par défaut) et contiennent:
- `input.json` / `prompts.json` / `output.json` / `meta.json`
- `error.json` en cas d’échec

## Où changer quoi (prompts & règles)

- **Prompts d’enrichissement**: `apps/api/src/services/llm/prompts/enrichment.prompts.ts`
- **Prompts de génération de script**: `apps/api/src/services/llm/prompts/scriptGeneration.prompts.ts`
- **Validation / retry / budget de durée**: `apps/api/src/services/llm/script-generation.service.ts`

## Tests

```bash
bun test
```

Pour les tests API uniquement:

```bash
nx test api
```

## Style & bonnes pratiques

- **Ne jamais committer** `.env.local` ni `.mio-data/`.
- Favoriser des changements de prompts **petits et isolés**, et valider via la CLI (`--dryRun` puis run réel).

