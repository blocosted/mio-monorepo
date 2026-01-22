# Documentation Mio

**Dernière mise à jour:** 23 Janvier 2026
**Phase actuelle:** Phase 1 MVP Minimal ✅ Complète (100%)

Cette documentation couvre le workflow de génération d'histoires audio et les procédures de développement/exploitation.

---

## 📚 Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| **[STORY-GENERATION.md](STORY-GENERATION.md)** | Workflow enrichment → script → audio | Tous |
| **[SCRIPTS.md](SCRIPTS.md)** | Référence commandes CLI | Développeurs |
| **[ENV.md](ENV.md)** | Variables d'environnement | Développeurs + Ops |
| **[CONTRIB.md](CONTRIB.md)** | Guide contribution & dev local | Développeurs |
| **[RUNBOOK.md](RUNBOOK.md)** | Procédures production | Ops + Support |
| **[GLOSSARY.md](GLOSSARY.md)** | Terminologie projet | Tous |

---

## 🚀 Quick Start

### Pour Développer

```bash
# 1. Setup
bun install
cp env.template .env.local
# Remplir les clés API (voir ENV.md)

# 2. Database
bun run db:push

# 3. Storage
bun run s3:setup

# 4. Lancer
bun run dev
```

### Pour Tester le Workflow

```bash
# Enrichir un prompt
nx run scripts:llm -- enrich-story \
  --prompt "A dragon afraid of the dark" \
  --profile emilie

# Générer le script
nx run scripts:llm -- generate-script \
  --enrichInputFile .mio-data/<run-id>/input.json

# Pipeline complet (optionnel)
nx run scripts:pipeline -- full-story \
  --prompt "A dragon afraid of the dark" \
  --profile emilie
```

---

## 📖 Concepts Clés

### Workflow de Génération (9 Steps)

```
1. Enrichment      → Enrichit prompt + profil enfant
2. Script Gen      → Génère script narratif (timeline)
3. Voice Gen       → Synthèse vocale (TTS)
4. SFX Gen         → Effets sonores
5. Music Gen       → Musique de fond
6. Ambiance Gen    → Ambiance sonore
7. Mixing          → Mixage FFmpeg
8. Upload          → S3 final + cleanup
9. Finalization    → DB transaction
```

**Orchestration:** Upstash Workflow (QStash)
**Durée:** 5-30 minutes selon longueur

### Technologies

| Layer | Tech |
|-------|------|
| Monorepo | Nx + Bun |
| Frontend | Next.js 15 |
| Backend | Elysia |
| Database | Supabase PostgreSQL |
| Cache | Upstash Redis |
| Storage | Supabase S3 |
| Workflow | Upstash QStash |
| TTS/SFX | ElevenLabs |
| LLM | OpenAI / Anthropic |

---

## 🎯 État du Projet

**Phase 1 - MVP Minimal:** ✅ **100% Complète**

Backend production-ready:
- ✅ Workflow Upstash (9 steps)
- ✅ Progress tracking (Redis + DB)
- ✅ Job cancellation
- ✅ Library-first approach (audio)
- ✅ Endpoints API (polling + SSE)

**Prochaine étape:** Frontend Next.js (Phase 2)

Voir `../backlog.md` et `../roadmap.md` pour détails.

---

## 🔗 Ressources

- **Backlog:** `../backlog.md` (User Stories)
- **Roadmap:** `../roadmap.md` (Planning)
- **PRD:** `../story-app-prd.md` (Spec produit)
- **CLAUDE.md:** `../CLAUDE.md` (Contexte IA)

---

## 📝 Portée Documentation

### Inclus
- Workflow génération d'histoires
- Commandes CLI/Nx
- Variables d'environnement
- Procédures opérationnelles
- Guide contribution

### Exclu
- Architecture détaillée (voir code + CLAUDE.md)
- Documentation API (voir Swagger)
- Infrastructure Docker (voir packages/docker/)

