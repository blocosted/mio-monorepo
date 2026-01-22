# Runbook - Mio (Production)

**Dernière mise à jour:** 23 Janvier 2026

Ce runbook couvre les procédures d'exploitation pour le workflow de génération d'histoires en production.

---

## Vue d'Ensemble Architecture

### Services

| Service | Provider | Statut |
|---------|----------|--------|
| **API** | Scaleway | ✅ Production-ready |
| **Frontend** | Vercel | ⏸️ En cours |
| **Database** | Supabase PostgreSQL | ✅ Production |
| **Redis** | Upstash | ✅ Production |
| **Storage** | Supabase S3 | ✅ Production |
| **Workflow** | Upstash QStash | ✅ Production |
| **LLM** | OpenAI / Anthropic | ✅ Production |
| **TTS/SFX** | ElevenLabs | ✅ Production |

### Workflow de Génération (9 Steps)

```
1. Enrichment      → Enrichit le prompt avec profil enfant
2. Script Gen      → Génère le script narratif
3. Voice Gen       → Génère les pistes vocales (5 parallel max)
4. SFX Gen         → Génère les effets sonores
5. Music Gen       → Génère la musique de fond
6. Ambiance Gen    → Génère l'ambiance sonore
7. Mixing          → Mixe toutes les pistes avec FFmpeg
8. Upload          → Upload final (temp → final) + cleanup
9. Finalization    → Transaction DB (story + job)
```

**Durée typique:** 5-30 minutes (dépend de la longueur)

---

## Vérifications Pré-Déploiement

### 1. Variables d'Environnement

**Production requise:**
- ✅ `DATABASE_URL` (Supabase pooler TLS)
- ✅ `REDIS_URL` (Upstash TLS `rediss://`)
- ✅ `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- ✅ `UPSTASH_WORKFLOW_URL`
- ✅ `QSTASH_TOKEN`
- ✅ `QSTASH_CURRENT_SIGNING_KEY`
- ✅ `QSTASH_NEXT_SIGNING_KEY`
- ✅ `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY`
- ✅ `ELEVENLABS_API_KEY`
- ✅ `NEXT_PUBLIC_API_URL` (URL publique API)

Voir `docs/ENV.md` pour la liste complète.

### 2. Build & Tests

```bash
# Build
bun run build

# Tests
bun test

# Lint
bun run lint
```

### 3. Database Migrations

```bash
# Générer migrations
bun run db:generate

# Appliquer migrations (staging first)
bun run db:migrate
```

### 4. Storage Setup

```bash
# Créer buckets S3 (si nouveau projet)
bun run s3:setup

# Vérifier
bun run s3:list
```

---

## Smoke Test Post-Déploiement

### Test End-to-End Minimal

**Objectif:** Valider le workflow complet enrichment → script → audio.

#### 1. Via API HTTP

```bash
# 1. Créer un profil enfant
curl -X POST https://api.mio.example.com/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Emma",
    "age": 7,
    "gender": "girl",
    "preferences": {
      "favoriteThemes": ["animals", "nature"],
      "avoidThemes": ["scary"],
      "includeChildAsCharacter": true,
      "preferredHeroGender": "same",
      "preferredStoryDuration": "5min",
      "language": "fr"
    }
  }'

# 2. Créer une histoire
curl -X POST https://api.mio.example.com/stories \
  -H "Content-Type: application/json" \
  -d '{
    "childProfileId": "<profile-id>",
    "initialPrompt": "A mysterious door in a tree"
  }'

# 3. Lancer la génération
curl -X POST https://api.mio.example.com/stories/<story-id>/generate \
  -H "Content-Type: application/json" \
  -d '{
    "targetDurationMinutes": 5
  }'

# 4. Suivre la progression (SSE)
curl -N https://api.mio.example.com/jobs/<job-id>/stream

# 5. Vérifier le statut final
curl https://api.mio.example.com/jobs/<job-id>
```

#### 2. Via CLI (Local)

```bash
# Pipeline complet
nx run scripts:pipeline -- full-story \
  --prompt "A mysterious door in a tree" \
  --profile emilie \
  --targetDurationMinutes 5 \
  --outputDir output/smoke-test/
```

### Critères de Succès

- ✅ Job status = `completed`
- ✅ Progression = 100%
- ✅ `finalAudioUrl` défini
- ✅ Durée audio proche de la cible
- ✅ Fichier audio accessible et lisible
- ✅ Story status = `ready`

---

## Monitoring

### Métriques Clés

#### Performance

| Métrique | Cible | Alerte |
|----------|-------|--------|
| Temps Step 3 (Voice) | < 10min | > 15min |
| Temps Step 7 (Mixing) | < 2min | > 5min |
| Temps Total Workflow | < 20min | > 30min |
| Job Success Rate | > 95% | < 90% |

#### Coûts

| Service | Coût/Histoire (estimé) |
|---------|------------------------|
| OpenAI (GPT-4) | ~$0.15 |
| ElevenLabs (TTS) | ~$0.25 |
| Total | ~$0.40 |

**Optimisation:** Library-first approach réduit les coûts ElevenLabs (~30% économie).

#### Erreurs Fréquentes

- **LLM Timeout:** > 5% des appels
- **Voice Gen Failures:** > 2% des segments
- **Mixing Failures:** < 1%
- **S3 Upload Failures:** < 0.5%

### Logs

**Niveaux:**
- `info`: Opérations normales
- `warn`: Dégradation non-bloquante
- `error`: Échecs bloquants

**Recherche logs:**
```bash
# Logs d'un job spécifique
grep "jobId: <job-id>" /var/log/api/app.log

# Échecs step 3 (voice)
grep "Failed to generate voice segment" /var/log/api/app.log

# Workflow completions
grep "Workflow completed successfully" /var/log/api/app.log
```

---

## Incidents Fréquents & Résolution

### 1. Workflow Timeout (Step 3 - Voice)

**Symptômes:**
- Job bloqué à 30-55%
- Logs: "Timeout exceeded for step voice-generation"

**Causes:**
- Trop de segments vocaux (> 50)
- Rate limiting ElevenLabs
- Concurrency mal configurée

**Actions:**
1. Vérifier config `VOICE_GENERATION_CONCURRENCY` (défaut: 5)
2. Augmenter timeout step 3 si nécessaire
3. Vérifier quotas ElevenLabs
4. Retry le job via API DELETE puis POST

**Prévention:**
- Limiter durée cible à 10min max
- Monitorer quotas ElevenLabs
- Précharger bibliothèque audio

### 2. LLM Response Invalide (JSON)

**Symptômes:**
- Step 1 ou 2 échoue
- Logs: "Failed to parse LLM response as JSON"

**Causes:**
- Provider renvoie du texte avant/après JSON
- Température trop élevée
- Modèle saturé

**Actions:**
1. Vérifier response raw dans logs
2. Ajuster parsing (strip markdown code blocks)
3. Réduire température (OpenAI: 0.7 → 0.5)
4. Retry avec backoff

**Prévention:**
- Tests réguliers avec `--dryRun`
- Parser robuste (strip ```json blocks)
- Fallback provider

### 3. Script Word Count Trop Bas

**Symptômes:**
- Validation script échoue
- Logs: "Word count too low (got 450, expected 750)"

**Causes:**
- Prompt insuffisant
- Inflation budget inadéquate
- Provider sous-génère

**Actions:**
1. Vérifier budget calculé dans logs
2. Ajuster inflation (OpenAI: 1.5x → 1.8x)
3. Renforcer prompt "CRITICAL WARNING"
4. Retry avec `targetDurationMinutes` réduit

**Prévention:**
- Calibrer inflation par provider
- Ajouter validation progressive
- Alertes sur word count moyen

### 4. FFmpeg Out of Memory (Step 7)

**Symptômes:**
- Step 7 (mixing) échoue
- Logs: "FFmpeg killed (OOM)"

**Causes:**
- Histoire trop longue (> 15min)
- Trop de pistes simultanées
- Limite RAM serverless (1GB)

**Actions:**
1. Vérifier nombre de pistes (voice + sfx + music + ambiance)
2. Réduire qualité audio temporairement
3. Optimiser ffmpeg command (streaming)
4. Upgrader instance serverless si possible

**Prévention:**
- Limiter durée max à 10min
- Compression pistes avant mixage
- Tests charge avec histoires longues

### 5. S3 Upload Failure (Step 8)

**Symptômes:**
- Step 8 échoue
- Logs: "Failed to upload final audio to S3"

**Causes:**
- Credentials invalides
- Bucket manquant
- Network timeout

**Actions:**
1. Vérifier credentials S3
2. Vérifier bucket existe (`bun run s3:list`)
3. Retry upload (rollback automatique)
4. Vérifier permissions bucket

**Prévention:**
- Health check S3 au démarrage
- Retry automatique avec backoff
- Monitoring uploads S3

### 6. Redis Connection Lost

**Symptômes:**
- Progress tracking ne fonctionne pas
- Logs: "Redis connection timeout"

**Causes:**
- Upstash Redis down
- Credentials invalides
- Network issues

**Actions:**
1. Vérifier Upstash status page
2. Vérifier `REDIS_URL` (TLS `rediss://`)
3. Fallback sur DB pour progress
4. Restart API service

**Prévention:**
- Monitoring Redis health
- Fallback automatique DB
- Uptime monitoring Upstash

---

## Procédures Maintenance

### Rotation Clés API

#### ElevenLabs

1. Créer nouvelle clé dans dashboard
2. Mettre à jour `ELEVENLABS_API_KEY` (env)
3. Redéployer API
4. Tester génération voix
5. Supprimer ancienne clé

#### OpenAI

1. Créer nouvelle clé dans dashboard
2. Mettre à jour `OPENAI_API_KEY` (env)
3. Redéployer API
4. Tester enrichment + script
5. Révoquer ancienne clé

### Cleanup Storage

```bash
# Lister fichiers temporaires (> 7 jours)
aws s3 ls s3://mio-stories/temp/ --recursive \
  | awk '$1 < "2026-01-16"' \
  | awk '{print $4}'

# Supprimer
aws s3 rm s3://mio-stories/temp/ --recursive \
  --exclude "*" \
  --include "*/temp/*"
```

### Database Maintenance

```sql
-- Cleanup jobs complétés (> 30 jours)
DELETE FROM generation_jobs
WHERE status = 'completed'
  AND updated_at < NOW() - INTERVAL '30 days';

-- Cleanup stories brouillons (> 7 jours)
DELETE FROM stories
WHERE status = 'draft'
  AND created_at < NOW() - INTERVAL '7 days';

-- Vacuum
VACUUM ANALYZE generation_jobs;
VACUUM ANALYZE stories;
```

---

## Rollback Procedures

### Rollback Déploiement API

```bash
# 1. Identifier dernière version stable
git log --oneline | head -10

# 2. Rollback code
git checkout <commit-hash>

# 3. Rebuild
bun run build

# 4. Redéployer
# (dépend de la plateforme: Scaleway, Railway, etc.)

# 5. Smoke test
curl https://api.mio.example.com/health
```

### Rollback Migrations DB

```bash
# 1. Identifier migration à rollback
ls packages/db/src/migrations/

# 2. Rollback manuel (Drizzle ne supporte pas rollback auto)
# Écrire SQL inverse dans psql

# 3. Vérifier
bun run db:studio
```

### Rollback Prompts LLM

```bash
# 1. Identifier commit avant changement
git log -- apps/api/src/services/llm/prompts/

# 2. Checkout fichier spécifique
git checkout <commit-hash> -- apps/api/src/services/llm/prompts/scriptGeneration.prompts.ts

# 3. Commit & redéployer
git commit -m "revert: rollback script generation prompts"
git push

# 4. Tester
nx run scripts:llm -- generate-script \
  --enrichInputFile .mio-data/<run-id>/input.json
```

---

## Scaling & Performance

### Horizontal Scaling

**API:**
- Load balancer (Traefik / Nginx)
- Instances API multiples (Scaleway)
- Session sticky si nécessaire

**Workflow:**
- Upstash QStash gère automatiquement
- Pas de scaling manuel requis

### Rate Limits

| Service | Limite | Action si dépassé |
|---------|--------|-------------------|
| OpenAI | 10k TPM | Upgrade tier ou fallback Anthropic |
| ElevenLabs | 100 req/min | Increase concurrency limit ou upgrade plan |
| Upstash QStash | Selon plan | Upgrade plan |

### Optimisations

**Voice Generation (Step 3):**
- Library-first approach (~30% réduction appels)
- Batch processing segments similaires
- Cache Redis 30 jours

**Mixing (Step 7):**
- Compression pistes avant mixage
- Streaming output si possible
- Cleanup temp files immédiat

---

## Alertes Recommandées

### Critiques (PagerDuty)

- ✅ API down (> 5min)
- ✅ DB connection lost
- ✅ Redis down (> 10min)
- ✅ Job success rate < 80%
- ✅ Workflow timeout rate > 10%

### Warnings (Slack)

- ⚠️ LLM response errors > 5%
- ⚠️ Voice gen failures > 2%
- ⚠️ Coût/jour > budget
- ⚠️ Storage usage > 80%

### Informations (Dashboard)

- ℹ️ Jobs completed/day
- ℹ️ Average workflow duration
- ℹ️ Library hit rate
- ℹ️ Cost per story

---

## Contacts & Escalation

### Support Providers

| Provider | Support | Urgence |
|----------|---------|---------|
| Supabase | Dashboard → Support | Non-urgent |
| Upstash | support@upstash.com | < 24h |
| ElevenLabs | Dashboard → Support | < 48h |
| OpenAI | help.openai.com | < 24h |

### Escalation

1. **Incident mineur:** Tenter résolution (ce runbook)
2. **Incident majeur:** Contacter tech lead + monitorer
3. **Incident critique:** Rollback + escalation équipe

---

## Checklist Go-Live

Avant mise en production:

- [ ] Smoke test complet réussi
- [ ] Monitoring configuré
- [ ] Alertes configurées
- [ ] Backups DB automatiques
- [ ] Rate limits vérifiés
- [ ] Coûts estimés validés
- [ ] Runbook validé par l'équipe
- [ ] Plan rollback testé
- [ ] Support contacts à jour
