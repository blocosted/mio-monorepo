# Monorepo Structure

Mio uses a monorepo to share domain logic safely.

## Apps

- apps/web: Next.js frontend
- apps/api: Elysia backend

## Packages

- packages/shared: domain types & constants
- packages/db: database schema and migrations

## Rules

- apps depend on packages
- packages never depend on apps
