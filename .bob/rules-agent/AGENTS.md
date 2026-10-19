# Project Coding Rules (Non-Obvious Only)

- **Never import `supabaseAdmin`** from `@/lib/supabase/admin` in any Client Component or file that might be bundled client-side — the `server-only` package at the top of that file will throw a build error.
- **Supabase reads need explicit typing**: the client has no `Database<>` generic. Use `.returns<T>()` on select queries; do not expect TypeScript to infer row types from the client itself.
- **Claude tool-use `required` is advisory**: always filter Claude's `recommendations` array against the real contact IDs before any DB insert (see pattern in `src/app/api/analyze/route.ts` lines 153–161).
- **Next.js 16 route handler params are async**: `params` in `({ params }: { params: Promise<{ token: string }> })` must be `await`-ed before use — synchronous destructuring will silently return undefined.
- **Tailwind v4 syntax**: use `@import "tailwindcss"` not `@tailwind base/components/utilities` directives. The `@theme inline` block in `globals.css` is how CSS variables are mapped to Tailwind tokens.
- **WDS tokens are read-only**: files in `src/styles/wds/` are generated from Figma. Edit design values in Figma, not in these files.
- **Kakao SDK is browser-only**: `src/utils/kakao.ts` guards with `typeof window === "undefined"` — never call share functions from Server Components or Route Handlers.
- **Korean string literals are intentional**: all user-facing text, API prompts, and error messages are in Korean. Do not translate or replace with English.
- **`HomeContainer.tsx` is intentionally large** (~2300 lines): it is a single-file client component holding all home-page state. Do not extract into smaller files without explicit instruction.
