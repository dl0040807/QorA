# Project Documentation Context (Non-Obvious Only)

- **No tests exist**: there is no test framework, no test files, and no `test` script in `package.json`. Do not suggest running tests.
- **`src/containers/` is not a standard Next.js convention**: it holds the monolithic client-side UI logic (`HomeContainer.tsx`), not Next.js layouts or route groups.
- **`src/apis/` is client→server fetch wrappers**, not a backend API layer — these call the internal `/api/*` Route Handlers.
- **`src/services/` is Supabase CRUD**, distinct from `src/apis/` which wraps Claude/AI calls via Route Handlers.
- **`src/styles/wds/` contains a full Wanted Design System token set** generated from Figma variables — this is a real design system with hundreds of CSS custom properties, not a simple theme file.
- **Two completely separate Supabase auth contexts**: logged-in users use the anon-key client; public invite/reply visitors (no session) are served via the service-role admin client in Route Handlers.
- **`supabase/migrations/` are forward-only**: there is no down-migration mechanism. Schema changes require new numbered migration files.
