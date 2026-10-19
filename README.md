# Q or A — Anonymous Advice Community

Post a concern anonymously, let strangers answer it, and get an AI-written synthesis of the different perspectives. No login required.

**Live demo:** https://qor-a-pyn5.vercel.app

Built with Next.js, Supabase, the Claude API and IBM Bob for the AngelHack IBM Bob Hackathon.

## Features

- **Ask anonymously.** Write a concern with no account. Claude assigns a short topic category automatically.
- **Safety gate.** If a concern signals a crisis (such as self-harm), nothing is saved and the user sees support guidance instead.
- **Answer concerns you care about.** Describe the kind of concern you want to help with and the AI matches you to open concerns, each with a match score and a reason.
- **Random concern.** A spin-drum picks an open concern if you just want to help someone.
- **AI synthesis.** Once a concern has answers, Claude groups them into perspectives with percentages and writes a short summary.
- **Close the loop.** The asker can close a concern with a public resolution note.
- **Share.** Uses the Web Share API, with a clipboard fallback.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 and inline styles driven by CSS variables |
| Database | Supabase (PostgreSQL, Row Level Security, Anonymous Auth) |
| AI | Anthropic Claude (`claude-sonnet-5`) through tool use |
| Hosting | Vercel |

## Technical highlights

- **Schema-enforced AI output.** Every Claude call uses tool use with an `input_schema` and a forced `tool_choice`, instead of asking for JSON in free text. This removed a class of parse errors caused by unescaped quotes in generated text.
- **Two-step matching.** Claude first expands the answerer's preference into search keywords. The app then searches all open concerns, and Claude ranks the results with a score and a reason.
- **Cached synthesis.** Results are stored in `concern_synthesis_cache` and reused until the answer count changes. Cached entries are validated before use and regenerated if they are malformed.
- **Two Supabase clients.** `client.ts` uses the anon key and is safe for the browser. `admin.ts` uses the service-role key, is marked `server-only`, and is used only in route handlers.
- **Row Level Security.** Concerns and answers are publicly readable. Askers can only insert and update their own concerns, identified by an anonymous session.

## Getting started

### Prerequisites

- Node.js 20 or newer
- A [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com/settings/keys)

### 1. Install

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```bash
ANTHROPIC_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only, never prefix with NEXT_PUBLIC_
```

### 3. Set up the database

In the Supabase SQL Editor, run these migrations from `supabase/migrations/` in order:

1. `0008_renewal_schema.sql`: `concerns` and `answers` tables with RLS
2. `0009_concern_synthesis_cache.sql`: synthesis cache
3. `0010_concern_resolution.sql`: `resolution_note` column

Migrations `0001`–`0007` belong to an earlier version of the project and are not used by the current app.

### 4. (Optional) Seed demo data

```bash
node scripts/seed-mock-data.mjs
```

This inserts about 95 sample concerns and 9 sample answers. It also prints a `localStorage` snippet you can paste into the browser console to see the seeded "my concerns" on the Ask page.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Project structure

```
src/
  app/
    page.tsx                  Home
    ask/                      Ask a concern
    answer/                   Answer a concern
    concern/[id]/             Concern detail, synthesis, closing
    api/
      concerns/               Create and list concerns (AI categorization, safety gate)
      concerns/[id]/          Concern detail, synthesis, close
      answers/                Submit answers, AI matching, random concerns
  containers/                 Client-side logic for the Ask and Answer flows
  components/                 ShareButton, SpinDrum
  lib/supabase/               Browser and server Supabase clients, shared types
scripts/seed-mock-data.mjs    Demo data seeder
supabase/migrations/          SQL migrations
```

## Deployment

The app is deployed on Vercel. Add the four environment variables above to the Vercel project before deploying. Variables with a `NEXT_PUBLIC_` prefix are baked into the client bundle at build time, so set them before the build runs.
