# Project Architecture Rules (Non-Obvious Only)

- **Public invite/reply flow is unauthenticated by design**: visitors at `/invite/[token]` and `/reply/[token]` have no Supabase session. All writes go through Route Handlers (`/api/invite/[token]/respond`, `/api/reply/[token]/respond`) that use `supabaseAdmin` (service role) to bypass RLS. Any new public flow must follow this same pattern.
- **Claude is used with forced tool-use** (`tool_choice: { type: "tool", name: "..." }`): the API routes always force a specific tool response rather than parsing free-text. New AI integrations should follow this pattern for structured output.
- **Contact enrichment is additive, never destructive**: the invite response handler merges new `personality_tags` into existing ones (Set union) and appends to `memo` — it never overwrites. This is a deliberate UX decision.
- **Supabase Realtime is enabled on `contacts` and `worry_invites` tables** (migrations 0006, 0007): components may subscribe to real-time changes; plan accordingly when modifying these tables.
- **`HomeContainer` manages all app state locally** (no global state library, no context): all worry/contact/recommendation state lives in `useState`/`useEffect` inside one component. Architectural changes need to account for this coupling.
- **No CI/CD pipeline is configured**: there is a `vercel.json` for Vercel deployments but no GitHub Actions or test gates. Deployments are manual pushes.
- **DB schema migrations must be sequential numbered files** in `supabase/migrations/` — next file would be `0008_*.sql`. There is no ORM; raw SQL only.
