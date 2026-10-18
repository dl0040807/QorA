<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript 5** (strict mode)
- **Tailwind CSS v4** — imported via `@import "tailwindcss"` in globals.css, NOT `@tailwind` directives
- **Supabase** (JS SDK v2) · **Anthropic Claude SDK** (`claude-sonnet-5` model in production)
- No test framework — there are no tests in this project

## Commands

```bash
npm run dev      # local dev server
npm run build    # production build
npm run lint     # eslint (no --fix flag in scripts)
```

No test command exists. There is no testing framework configured.

## Architecture

- `src/app/` — Next.js App Router pages and API routes
- `src/containers/` — Heavy client-side logic lives here (`AskerContainer.tsx`, `AnswererContainer.tsx`)
- `src/components/` — Shared UI components (`ShareButton.tsx`, `SpinDrum.tsx`)
- `src/lib/supabase/` — Two clients: `client.ts` (anon, browser-safe) and `admin.ts` (service role, server-only)
- `src/styles/wds/` — Design-system CSS tokens generated from Figma; do not hand-edit
- `supabase/migrations/` — Forward-only SQL migrations (no rollback mechanism)

## Critical Patterns

**Two Supabase clients — never mix them:**
- `supabase` from `@/lib/supabase/client` — anon key, safe for Client Components and Server Components alike
- `supabaseAdmin` from `@/lib/supabase/admin` — service role, bypasses RLS; import `server-only` is at the top of the file, so it hard-errors if imported in client code. Use only in Route Handlers and Server Components for the public invite/reply flow (unauthenticated visitors)

**Supabase typing:** The client is **not** typed with the `Database<>` generic due to schema-shape conflicts. Use `.returns<T>()` at the call site for reads; inserts pass plain objects. Shared domain types live in `src/lib/supabase/types.ts`.

**Claude tool-use responses:** Claude's `required` fields are hints, not guarantees — always validate tool output before DB insert.

**Route handler dynamic params** (Next.js 16): `params` is a `Promise<{...}>` — always `await params` before destructuring.

**Sharing:** Uses the Web Share API (`navigator.share`) with a clipboard copy fallback — no Kakao SDK. See `src/components/ShareButton.tsx`.

## Environment Variables (required)

```
ANTHROPIC_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # server-only; never prefix with NEXT_PUBLIC_
```

## Code Style

- Path alias `@/` maps to `src/`
- UI styling uses inline `React.CSSProperties` objects throughout — mixing with Tailwind utilities is intentional
- WDS design tokens (CSS variables from `src/styles/wds/fig-tokens.css`) are used directly in inline styles, e.g. `var(--ink)`, `var(--border)`
- Korean string literals throughout UI and API prompts — do not translate to English
