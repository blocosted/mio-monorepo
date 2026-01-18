# Mio

Application de génération d'histoires audio personnalisées pour enfants.

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.2+
- [Node.js](https://nodejs.org) v20+ (for some tools)
- [FFmpeg](https://ffmpeg.org) (for audio mixing)

### Installation

```bash
bun install
```

### Environment Configuration

1. Copy the environment template:
```bash
cp env.template .env.local
```

2. Fill in the required values in `.env.local`:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Supabase PostgreSQL connection string (use Transaction Pooler) | ✅ |
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `UPSTASH_REDIS_URL` | Upstash Redis REST URL | ✅ |
| `UPSTASH_REDIS_TOKEN` | Upstash Redis REST Token | ✅ |
| `OPENAI_API_KEY` | OpenAI API Key | ⭕ |
| `ANTHROPIC_API_KEY` | Anthropic API Key | ⭕ |
| `ELEVENLABS_API_KEY` | ElevenLabs API Key | ✅ |
| `SUNO_API_KEY` | Suno API Key | ⭕ |

⭕ = Required based on LLM_PROVIDER choice

### Database Setup

1. Create a project on [Supabase](https://supabase.com)
2. Get your database connection string from Project Settings > Database > Connection string
3. Use the **Transaction Pooler** connection string (port 6543) for serverless
4. Run migrations:

```bash
# Push schema to database (development)
bun run db:push

# Or generate and run migrations (production)
bun run db:generate
bun run db:migrate
```

### Storage Setup

Create the required storage buckets:

```bash
bun run s3:setup
```

This creates all buckets defined in `packages/scripts/src/s3/config.ts`.

### Development

```bash
# Run both API and Web in parallel
bun run dev

# Run only API
bun run dev:api

# Run only Web
bun run dev:web
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start API and Web in development mode |
| `bun run dev:api` | Start API server only |
| `bun run dev:web` | Start Next.js dev server only |
| `bun run build` | Build all packages |
| `bun run test` | Run all tests |
| `bun run lint` | Lint all packages |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:push` | Push schema to database |
| `bun run db:migrate` | Run migrations |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run s3:setup` | Create all storage buckets |
| `bun run s3:list` | List existing storage buckets |
| `bun run s3 -- show <name>` | Show bucket details |
| `bun run s3 -- delete <name>` | Delete a bucket |

## 📁 Project Structure

```
mio/
├── apps/
│   ├── api/          # Elysia API server
│   └── web/          # Next.js 15 PWA
├── packages/
│   ├── db/           # Drizzle ORM schemas & migrations
│   ├── scripts/      # CLI tools (s3, etc.)
│   ├── shared/       # Shared types, constants, utilities
│   └── test-utils/   # Test helpers & fixtures
├── CLAUDE.md         # AI assistant guidelines
└── README.md         # This file
```

## 🔗 Links

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Upstash Console](https://console.upstash.com)
- [ElevenLabs](https://elevenlabs.io)
- [OpenAI Platform](https://platform.openai.com)

## 📖 Documentation

See `CLAUDE.md` for detailed architecture and conventions.
