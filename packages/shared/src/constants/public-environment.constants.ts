/**
 * Public environment variables for the Web app (Next.js).
 *
 * IMPORTANT:
 * - Next.js replaces `process.env.NEXT_PUBLIC_*` at build time.
 * - Keep access STATIC (no dynamic indexing, no loops) for correct inlining.
 *
 * This file should be safe to import from client components.
 */
export const publicEnvironment = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
} as const;

export type PublicEnvironment = typeof publicEnvironment;
