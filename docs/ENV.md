# Variables d'Environnement (Référence)

**Dernière mise à jour:** 23 Janvier 2026
**Source of truth:** `env.template`

---

## Setup Initial

```bash
cp env.template .env.local
```

Remplir les variables requises selon votre environnement.

---

## Database (Supabase PostgreSQL)

### `DATABASE_URL` (requis)

Chaîne de connexion PostgreSQL complète.

**Format:**
```
postgresql://[user]:[password]@[host]:6543/[database]?sslmode=require
```

**Recommandation:** Utiliser le **Transaction Pooler** pour environnements serverless (port 6543).

**Où trouver:** Supabase Dashboard → Project Settings → Database → Connection String → Transaction Pooler

**Exemple:**
```
DATABASE_URL=postgresql://postgres.xyz:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require
```

---

## Supabase

### `SUPABASE_URL` (requis)

URL du projet Supabase.

**Où trouver:** Supabase Dashboard → Project Settings → API → Project URL

**Exemple:**
```
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
```

### `SUPABASE_SERVICE_ROLE_KEY` (requis)

Clé service role avec accès complet au projet.

**⚠️ ATTENTION:** Cette clé a un accès total. Ne jamais la committer ou l'exposer côté client.

**Où trouver:** Supabase Dashboard → Project Settings → API → service_role

**Utilisation:** CLI, scripts, backend server

**Exemple:**
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Redis (Upstash)

### `REDIS_URL` (recommandé)

URL Redis complète avec authentification.

**Format Local:**
```
redis://:password@localhost:6379
```

**Format Upstash (TLS):**
```
rediss://:password@<host>.upstash.io:6379
```

**⚠️ Production:** Utiliser **TLS** (`rediss://`) obligatoirement.

**Où trouver:** Upstash Console → Redis → Database → REST API → Connect (Bun)

**Exemple:**
```
REDIS_URL=rediss://:AbCdEf123456@us1-able-tiger-12345.upstash.io:6379
```

### Variables Alternatives (local/docker)

Si `REDIS_URL` n'est pas défini, le client Redis utilise:

- `REDIS_HOST` (défaut: `localhost`)
- `REDIS_PORT` (défaut: `6379`)
- `REDIS_PASSWORD`

---

## S3 Storage (Supabase Storage via protocole S3)

### Configuration S3

**Prérequis:** Activer le "S3 Protocol" dans Supabase Storage Settings.

### `S3_ENDPOINT` (requis)

Endpoint S3 de Supabase Storage.

**Format:**
```
https://<project-ref>.supabase.co/storage/v1/s3/storage
```

**Où trouver:** Supabase Dashboard → Storage → Settings → S3 Access

**Exemple:**
```
S3_ENDPOINT=https://abcdefghijklmnop.supabase.co/storage/v1/s3/storage
```

### `S3_REGION` (requis)

Région S3 (souvent `us-east-1` pour Supabase).

**Exemple:**
```
S3_REGION=us-east-1
```

### `S3_ACCESS_KEY_ID` (requis)

Access Key ID pour S3.

**Où trouver:** Supabase Dashboard → Storage → Settings → S3 Access → Create Access Key

**Exemple:**
```
S3_ACCESS_KEY_ID=abc123def456
```

### `S3_SECRET_ACCESS_KEY` (requis)

Secret Access Key pour S3.

**⚠️ ATTENTION:** Garder cette clé secrète.

**Exemple:**
```
S3_SECRET_ACCESS_KEY=AbCdEf123456789...
```

### `S3_SESSION_TOKEN` (optionnel)

Token de session (style AWS STS). Rarement nécessaire avec Supabase.

---

## Upstash Workflow (QStash)

### `UPSTASH_WORKFLOW_URL` (requis en production)

URL du workflow Upstash.

**Où trouver:** Upstash Console → QStash → Workflow

**Exemple:**
```
UPSTASH_WORKFLOW_URL=https://workflow.upstash.io
```

### `QSTASH_TOKEN` (requis en production)

Token d'authentification QStash.

**Où trouver:** Upstash Console → QStash → Credentials

**Exemple:**
```
QSTASH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### `QSTASH_CURRENT_SIGNING_KEY` (requis en production)

Clé de signature actuelle pour vérifier les requêtes QStash.

**Où trouver:** Upstash Console → QStash → Signing Keys

**Exemple:**
```
QSTASH_CURRENT_SIGNING_KEY=sig_abc123...
```

### `QSTASH_NEXT_SIGNING_KEY` (requis en production)

Clé de signature suivante (rotation).

**Exemple:**
```
QSTASH_NEXT_SIGNING_KEY=sig_def456...
```

---

## LLM Providers

### `OPENAI_API_KEY` (requis si provider=openai)

Clé API OpenAI.

**Où trouver:** OpenAI Dashboard → API Keys

**Exemple:**
```
OPENAI_API_KEY=sk-proj-abc123...
```

### `ANTHROPIC_API_KEY` (requis si provider=anthropic)

Clé API Anthropic (Claude).

**Où trouver:** Anthropic Console → API Keys

**Exemple:**
```
ANTHROPIC_API_KEY=sk-ant-api-abc123...
```

### `LLM_PROVIDER` (optionnel)

Provider LLM à utiliser par défaut.

**Valeurs:** `openai` | `anthropic`
**Défaut:** `openai`

**Exemple:**
```
LLM_PROVIDER=openai
```

---

## Audio Generation

### `ELEVENLABS_API_KEY` (requis)

Clé API ElevenLabs (TTS + SFX).

**Où trouver:** ElevenLabs Dashboard → Profile → API Keys

**Exemple:**
```
ELEVENLABS_API_KEY=sk_abc123...
```

### `SUNO_API_KEY` (optionnel)

Clé API Suno (génération musicale).

**Note:** Actuellement en placeholder, musique générée via ElevenLabs.

**Exemple:**
```
SUNO_API_KEY=suno_abc123...
```

---

## API Configuration

### `API_PORT` (optionnel)

Port de l'API Elysia.

**Défaut:** `3001`

**Exemple:**
```
API_PORT=3001
```

### `CORS_ORIGIN` (optionnel)

Origine autorisée pour CORS (URL du frontend).

**Défaut:** `http://localhost:3000`

**Exemple:**
```
CORS_ORIGIN=http://localhost:3000
```

### `NEXT_PUBLIC_API_URL` (requis pour frontend)

URL publique de l'API (utilisée par le frontend Next.js).

**Défaut:** `http://localhost:3001`
**Production:** `https://api.mio.example.com`

**Exemple:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Frontend Configuration

### `WEB_PORT` (optionnel)

Port de développement Next.js.

**Défaut:** `3000`

**Exemple:**
```
WEB_PORT=3000
```

---

## Logging (optionnel)

### `LOG_LEVEL` (optionnel)

Niveau de log.

**Valeurs:** `debug` | `info` | `warn` | `error`
**Défaut:** `info`

**Exemple:**
```
LOG_LEVEL=debug
```

### `LOG_ENABLED` (optionnel)

Active/désactive les logs.

**Valeurs:** `true` | `false`
**Défaut:** `true`

**Exemple:**
```
LOG_ENABLED=true
```

---

## Checklist Setup

### Développement Local

Minimum requis:
- ✅ `DATABASE_URL` (Supabase PostgreSQL)
- ✅ `REDIS_URL` (Upstash Redis ou Docker local)
- ✅ `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- ✅ `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY`
- ✅ `ELEVENLABS_API_KEY`

### Production

Tout le setup local +
- ✅ `UPSTASH_WORKFLOW_URL`
- ✅ `QSTASH_TOKEN`
- ✅ `QSTASH_CURRENT_SIGNING_KEY`
- ✅ `QSTASH_NEXT_SIGNING_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `NEXT_PUBLIC_API_URL` (URL publique)
- ✅ `REDIS_URL` avec TLS (`rediss://`)

---

## Sécurité

**⚠️ NE JAMAIS COMMITTER:**
- `.env.local`
- Clés API
- Secrets de production

**✅ BONNES PRATIQUES:**
- Utiliser `.env.local` pour le développement local
- Utiliser des variables d'environnement platform-specific en production (Vercel, Scaleway)
- Rotation régulière des clés API
- Utiliser TLS pour Redis/DB en production
