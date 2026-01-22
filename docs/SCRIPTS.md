# Scripts & Commandes (Référence)

**Dernière mise à jour:** 23 Janvier 2026
**Source of truth:** `package.json` + `nx.json` + scripts CLI

---

## Scripts Racine (Bun)

Définis dans `package.json`, exécutables via `bun run <script>`:

| Commande | Description |
|----------|-------------|
| `dev` | Lance API + Web en dev (Nx `run-many -t serve -p api web`) |
| `dev:api` | Lance uniquement l'API Elysia (port 3001) |
| `dev:web` | Lance uniquement le frontend Next.js (port 3000) |
| `build` | Build complet du monorepo (Nx `run-many -t build`) |
| `test` | Lance tous les tests avec `bun test` |
| `start` | Lance Docker Compose (services infra) |
| `lint` | Lint complet du monorepo (Nx `run-many -t lint`) |
| `format` | Formate tout le code avec Prettier |
| `format:check` | Vérifie le formatage sans modifier |
| `db:generate` | Génère les migrations Drizzle depuis le schéma |
| `db:push` | Push le schéma Drizzle vers la DB (dev only) |
| `db:migrate` | Exécute les migrations Drizzle |
| `db:studio` | Ouvre Drizzle Studio (GUI DB) |
| `s3` | Proxy vers la CLI S3 (ex: `bun run s3 -- setup`) |
| `s3:setup` | Crée tous les buckets S3 (via Supabase Storage) |
| `s3:list` | Liste les buckets S3 existants |

---

## CLI Scripts (Nx)

Ces commandes sont utiles pour le développement et le débogage.

### LLM CLI

**Commande:**
```bash
nx run scripts:llm -- <subcommand> [options]
```

**Sous-commandes:**

#### `enrich-story`
Enrichit un prompt initial en `EnrichedConcept` (personnages, décor, tonalité).

**Options:**
- `--prompt <text>`: Prompt initial (requis si pas `--all`)
- `--profile <name>`: Profil enfant (ex: `emilie`, `lucas`)
- `--all`: Lance pour tous les profils de test
- `--save <bool>`: Sauvegarde les artifacts (défaut: `true`)
- `--storeDir <path>`: Répertoire artifacts (défaut: `.mio-data`)
- `--dryRun`: Affiche les prompts sans appel LLM
- `--envFile <path>`: Charge un fichier `.env` spécifique

**Exemple:**
```bash
nx run scripts:llm -- enrich-story \
  --prompt "A dragon afraid of the dark" \
  --profile emilie \
  --dryRun
```

#### `generate-script`
Génère un `StoryScript` (timeline audio) depuis un concept enrichi.

**Options:**
- `--enrichInputFile <path>`: Fichier input ou output d'un run `enrich-story` (requis)
- `--provider <name>`: Provider LLM (`openai` ou `anthropic`)
- `--targetDurationMinutes <n>`: Durée cible en minutes (défaut: `5`)
- `--answers <json>`: Réponses guidées (ex: `[{"questionId":"ending","value":"happy"}]`)
- `--dryRun`: Affiche les prompts et contraintes sans appel LLM
- `--save <bool>`: Sauvegarde les artifacts (défaut: `true`)

**Exemple:**
```bash
nx run scripts:llm -- generate-script \
  --enrichInputFile .mio-data/enrich-story-20260123-123456/input.json \
  --provider openai \
  --targetDurationMinutes 5
```

---

### TTS CLI

**Commande:**
```bash
nx run scripts:tts -- <subcommand> [options]
```

**Sous-commandes:**

#### `generate-speech`
Génère un fichier audio MP3 depuis un texte avec ElevenLabs.

**Options:**
- `--text <text>`: Texte à synthétiser (requis)
- `--voiceId <id>`: ID voix ElevenLabs (requis)
- `--output <path>`: Chemin fichier sortie (défaut: `output.mp3`)

**Exemple:**
```bash
nx run scripts:tts -- generate-speech \
  --text "Hello, this is a test." \
  --voiceId "21m00Tcm4TlvDq8ikWAM" \
  --output test.mp3
```

#### `generate-from-script`
Génère toutes les pistes vocales depuis un `StoryScript`.

**Options:**
- `--scriptFile <path>`: Fichier script JSON (requis)
- `--outputDir <path>`: Répertoire de sortie (défaut: `output/`)

**Exemple:**
```bash
nx run scripts:tts -- generate-from-script \
  --scriptFile .mio-data/generate-script-20260123-123456/output.json \
  --outputDir audio/voices/
```

#### `test-emotions`
Teste toutes les émotions ElevenLabs avec une voix donnée.

**Options:**
- `--voiceId <id>`: ID voix ElevenLabs (requis)
- `--outputDir <path>`: Répertoire de sortie (défaut: `emotions-test/`)

---

### SFX CLI

**Commande:**
```bash
nx run scripts:sfx -- <subcommand> [options]
```

**Sous-commandes:**

#### `generate`
Génère un effet sonore avec ElevenLabs SFX.

**Options:**
- `--description <text>`: Description du SFX (requis)
- `--duration <n>`: Durée en secondes (défaut: `3`)
- `--output <path>`: Fichier sortie (défaut: `sfx.mp3`)

**Exemple:**
```bash
nx run scripts:sfx -- generate \
  --description "Door creaking open slowly" \
  --duration 2 \
  --output door-creak.mp3
```

#### `generate-from-script`
Génère tous les SFX depuis un `StoryScript`.

**Options:**
- `--scriptFile <path>`: Fichier script JSON (requis)
- `--outputDir <path>`: Répertoire de sortie (défaut: `output/sfx/`)

---

### Music CLI

**Commande:**
```bash
nx run scripts:music -- <subcommand> [options]
```

**Sous-commandes:**

#### `generate`
Génère une piste musicale.

**Options:**
- `--description <text>`: Description musicale (requis)
- `--mood <mood>`: Mood (ex: `adventurous`, `mysterious`)
- `--duration <n>`: Durée en secondes (défaut: `30`)
- `--output <path>`: Fichier sortie (défaut: `music.mp3`)

**Exemple:**
```bash
nx run scripts:music -- generate \
  --description "Epic adventure music" \
  --mood adventurous \
  --duration 60 \
  --output adventure-theme.mp3
```

#### `generate-from-script`
Génère toutes les pistes musicales depuis un `StoryScript`.

**Options:**
- `--scriptFile <path>`: Fichier script JSON (requis)
- `--outputDir <path>`: Répertoire de sortie (défaut: `output/music/`)

---

### Ambiance CLI

**Commande:**
```bash
nx run scripts:ambiance -- <subcommand> [options]
```

**Sous-commandes:**

#### `generate`
Génère une ambiance sonore.

**Options:**
- `--description <text>`: Description ambiance (requis)
- `--duration <n>`: Durée en secondes (défaut: `30`)
- `--output <path>`: Fichier sortie (défaut: `ambiance.mp3`)

**Exemple:**
```bash
nx run scripts:ambiance -- generate \
  --description "Forest with birds chirping" \
  --duration 120 \
  --output forest-ambiance.mp3
```

#### `generate-from-script`
Génère les ambiances depuis un `StoryScript`.

---

### Pipeline Full Story

**Commande:**
```bash
nx run scripts:pipeline -- full-story [options]
```

Exécute le pipeline complet: enrichment → script → voices → sfx → music → ambiance → mixing.

**Options:**
- `--prompt <text>`: Prompt initial (requis)
- `--profile <name>`: Profil enfant (requis)
- `--targetDurationMinutes <n>`: Durée cible (défaut: `5`)
- `--outputDir <path>`: Répertoire de sortie (défaut: `output/`)

**Exemple:**
```bash
nx run scripts:pipeline -- full-story \
  --prompt "A dragon afraid of the dark" \
  --profile emilie \
  --targetDurationMinutes 5 \
  --outputDir stories/dragon/
```

---

### Storage S3 CLI

**Commande:**
```bash
nx run scripts:s3 -- <subcommand> [options]
```

**Sous-commandes:**

#### `setup`
Crée tous les buckets S3 définis dans la config.

**Exemple:**
```bash
nx run scripts:s3 -- setup
```

#### `list`
Liste tous les buckets S3 existants.

**Exemple:**
```bash
nx run scripts:s3 -- list
```

#### `show <name>`
Affiche les détails d'un bucket spécifique.

**Exemple:**
```bash
nx run scripts:s3 -- show stories
```

#### `delete <name> [-f]`
Supprime un bucket (avec `-f` pour forcer).

**Exemple:**
```bash
nx run scripts:s3 -- delete test-bucket -f
```

---

## Workflows de Développement

### Test Local Rapide

1. **Enrichir un prompt:**
   ```bash
   nx run scripts:llm -- enrich-story --prompt "A mysterious door" --profile emilie
   ```

2. **Générer le script:**
   ```bash
   nx run scripts:llm -- generate-script \
     --enrichInputFile .mio-data/<run-id>/input.json \
     --provider openai
   ```

3. **Générer l'audio (optionnel):**
   ```bash
   nx run scripts:pipeline -- full-story \
     --prompt "A mysterious door" \
     --profile emilie
   ```

### Itération sur les Prompts

1. **Dry run pour inspecter:**
   ```bash
   nx run scripts:llm -- generate-script \
     --enrichInputFile .mio-data/<run-id>/input.json \
     --dryRun
   ```

2. **Modifier les prompts** dans `apps/api/src/services/llm/prompts/`

3. **Tester à nouveau:**
   ```bash
   nx run scripts:llm -- generate-script \
     --enrichInputFile .mio-data/<run-id>/input.json
   ```

---

## Notes

- **Artifacts:** Les runs CLI créent des artifacts dans `.mio-data/` (gitignored)
- **Logs:** Utiliser `LOG_LEVEL=debug` pour plus de détails
- **Providers:** OpenAI (défaut) ou Anthropic via `--provider` ou `LLM_PROVIDER`
