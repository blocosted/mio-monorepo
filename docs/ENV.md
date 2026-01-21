# Variables d’environnement (référence)

Source of truth: `env.template` (à copier en `.env.local`).

```bash
cp env.template .env.local
```

## Base de données (Supabase PostgreSQL)

- **`DATABASE_URL`**: chaîne de connexion PostgreSQL (recommandé: pooler transaction, port 6543).
  - **Format**: `postgresql://[user]:[password]@[host]:6543/[database]?sslmode=require`

## Supabase

- **`SUPABASE_URL`**: URL du projet Supabase (Project Settings → API).
- **`SUPABASE_SERVICE_ROLE_KEY`**: clé service role (⚠️ accès total, à garder secrète).

## Redis

- **`REDIS_URL`**: URL Redis (recommandé).
  - **Local**: `redis://:password@localhost:6379`
  - **TLS / hosted**: `rediss://:password@<host>:6379`

Alternatives (principalement local / tests):
- **`REDIS_HOST`**
- **`REDIS_PORT`**
- **`REDIS_PASSWORD`**

## Storage S3 (Supabase Storage via protocole S3)

- **`S3_ENDPOINT`**: endpoint S3 Supabase (ex: `https://<project-ref>.supabase.co/storage/v1/s3/storage`)
- **`S3_REGION`**
- **`S3_ACCESS_KEY_ID`**
- **`S3_SECRET_ACCESS_KEY`**
- **`S3_SESSION_TOKEN`** (optionnel)

## Providers LLM

Clés (selon provider):
- **`OPENAI_API_KEY`**: requis si `LLM_PROVIDER=openai` ou si la CLI utilise OpenAI.
- **`ANTHROPIC_API_KEY`**: requis si `LLM_PROVIDER=anthropic` ou si la CLI utilise Anthropic.

Sélecteur:
- **`LLM_PROVIDER`**: `openai` ou `anthropic` (défaut: `openai`).

## Génération audio (clés)

- **`ELEVENLABS_API_KEY`**: clé ElevenLabs (TTS/SFX).
- **`SUNO_API_KEY`**: clé Suno (musique, optionnel selon usage).

## API

- **`API_PORT`**: port API (défaut: `3001`).
- **`CORS_ORIGIN`**: origine frontend autorisée (défaut: `http://localhost:3000`).

## Frontend (Next.js)

- **`NEXT_PUBLIC_API_URL`**: URL publique de l’API (défaut: `http://localhost:3001`).
- **`WEB_PORT`**: port dev frontend (défaut: `3000`).

## Notes

- **CLI LLM**: pour tester localement `enrich-story` / `generate-script`, les variables indispensables sont au minimum `OPENAI_API_KEY` (ou `ANTHROPIC_API_KEY`) + éventuellement `LLM_PROVIDER`.
- Le code supporte aussi des variables “log” (`LOG_ENABLED`, `LOG_LEVEL`) même si elles ne sont pas listées dans `env.template` aujourd’hui.

