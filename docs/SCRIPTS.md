# Scripts & commandes (référence)

Source of truth:
- `package.json` (scripts `bun run …`)
- `packages/scripts/project.json` (targets Nx `nx run …`)

## Scripts racine (Bun)

| Commande | Description |
|---|---|
| `bun run dev` | Lance API + Web en dev (Nx `run-many`) |
| `bun run dev:api` | Lance l’API en dev |
| `bun run dev:web` | Lance le frontend en dev |
| `bun run build` | Build monorepo (Nx `run-many -t build`) |
| `bun run test` | Lance les tests (`bun test`) |
| `bun run lint` | Lance le lint (Nx `run-many -t lint`) |
| `bun run format` | Formate le repo avec Prettier |
| `bun run format:check` | Vérifie le formatage Prettier |
| `bun run db:generate` | Génère des migrations Drizzle |
| `bun run db:push` | Push du schéma Drizzle (dev) |
| `bun run db:migrate` | Exécute les migrations |
| `bun run db:studio` | Ouvre Drizzle Studio |
| `bun run s3` | Proxy vers la CLI storage (`nx run scripts:s3 -- …`) |
| `bun run s3:setup` | Crée les buckets storage |
| `bun run s3:list` | Liste les buckets storage |

## CLI “scripts” (Nx)

Ces commandes sont particulièrement utiles pour le workflow de génération d’histoires.

### LLM CLI

```bash
nx run scripts:llm -- --help
```

Sous-commandes principales:
- `enrich-story`: enrichissement d’un prompt en `EnrichedConcept`
- `generate-script`: génération d’un `StoryScript` timeline + validation/retry

### Storage (S3 / Supabase Storage via protocole S3)

```bash
nx run scripts:s3 -- --help
```

Commandes principales:
- `setup`: crée tous les buckets définis en config
- `list`: liste les buckets existants
- `show <name>`: détail d’un bucket
- `delete <name> [-f]`: supprime un bucket (option `-f` pour forcer)

