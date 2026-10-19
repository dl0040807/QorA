# Gogo Renewal Plan

**Goal:** Transform the existing "contact recommender" app into an anonymous community concern-sharing platform for the IBM Bob hackathon (Theme 2: Transform an Existing App). The core shift: instead of recommending which contact to ask, anonymous strangers answer concerns and AI synthesises all responses into a percentage breakdown + summary.

**Scope:** Full architectural overhaul — new DB schema, new user flows, new AI prompts, removal of all Kakao/contact-profile code, replacement with Web Share API. Existing Next.js/Supabase/Anthropic infrastructure is retained.

**Confirmed decisions:**
- Categories: free text input by asker; AI auto-classifies on submission
- No push notification when synthesis is ready; asker revisits their private URL
- Asker accesses their concern result via a unique URL (`/concern/[id]`) only — no local-storage fallback

---

## Sub-Task 1 — Remove Legacy Code

**Status:** [x] done

**Intent:** Delete all code tied to the old concept (contacts, Kakao, personality quizzes, invite links) so the new build starts from a clean slate without dead imports.

**Expected Outcomes:**
- No references to Kakao SDK remain in the codebase
- No contact-management UI or logic remains
- No invite/reply token flows remain
- The app still compiles (removed imports cleaned up)

**Todo List:**
1. Delete `src/utils/kakao.ts`
2. Delete `src/constants/inviteQuestions.ts`
3. Delete `src/app/api/analyze-screenshot/` directory
4. Delete `src/app/api/analyze-personality-text/` directory
5. Delete `src/app/api/invite/` directory
6. Delete `src/app/api/reply/` directory
7. Delete `src/app/invite/` directory
8. Delete `src/app/reply/` directory
9. Delete `src/services/recommend/` directory
10. Delete `src/apis/analyze.ts`
11. Delete `src/components/common/StatusScreen.tsx` (re-evaluate — may be reusable; keep if generic enough)
12. Replace `src/containers/HomeContainer.tsx` with an empty stub that just renders `null` (will be rebuilt in Sub-Task 3)
13. Remove `NEXT_PUBLIC_KAKAO_JS_KEY` from `.env.local.example`
14. Verify `npm run build` passes (or at least `npm run lint` shows no broken imports)

**Relevant Context:**
- `src/utils/kakao.ts` — all 5 exported functions are Kakao-only; no reusable utilities inside
- `src/constants/inviteQuestions.ts` — only used by invite quiz flow
- `src/app/api/analyze/route.ts` is NOT deleted here; it will be repurposed in Sub-Task 4
- `src/lib/supabase/client.ts`, `admin.ts`, `types.ts` — keep untouched

---

## Sub-Task 2 — New Database Schema

**Status:** [x] done

**Intent:** Replace the contact/worry/recommendation schema with two new tables — `concerns` and `answers` — and configure RLS so anonymous visitors can insert answers but only the concern owner can read synthesis results.

**Expected Outcomes:**
- New migration file `supabase/migrations/0008_renewal_schema.sql` creates `concerns` and `answers`
- Old tables (`contacts`, `worries`, `recommendations`, `roleplay_simulations`, `contact_invites`, `worry_invites`) are either dropped or left untouched (leave — forward-only migrations, just add new)
- `src/lib/supabase/types.ts` updated with new TypeScript interfaces

**Todo List:**
1. Create `supabase/migrations/0008_renewal_schema.sql` with:
   - `concerns` table: `id uuid PK`, `content text NOT NULL`, `category text` (AI-assigned), `status text DEFAULT 'open' CHECK (status IN ('open','closed'))`, `asker_session_id uuid NOT NULL`, `created_at timestamptz DEFAULT now()`
   - `answers` table: `id uuid PK`, `concern_id uuid FK→concerns.id ON DELETE CASCADE`, `answer_text text NOT NULL`, `answerer_light_profile jsonb DEFAULT '{}'` (나이대/직업/mbti — all optional), `answerer_session_id uuid`, `created_at timestamptz DEFAULT now()`
   - RLS on `concerns`: SELECT allowed for everyone (public), INSERT only for own `asker_session_id`
   - RLS on `answers`: SELECT allowed for concern owner (join check) or for reading synthesis, INSERT allowed for anyone (anonymous answerers)
2. Update `src/lib/supabase/types.ts` — add `Concern`, `Answer` interfaces; keep old interfaces for migration safety (do not remove)
3. Confirm that `supabaseAdmin` (service role) is still the right client for server-side answer writes (anonymous visitors have no auth session)

**Relevant Context:**
- Existing migrations are forward-only — do not modify 0001–0007
- `src/lib/supabase/admin.ts` uses service role + `server-only` — reuse for answer submission route
- Anonymous auth (Supabase Anonymous Auth) is already active for askers; answerers do NOT need a session
- The `asker_session_id` is the Supabase anon user UUID stored in `src/lib/supabase/client.ts`

---

## Sub-Task 3 — Role Selection + Asker Flow UI

**Status:** [x] done

**Intent:** Build the question-asker's entire journey: role selection screen → concern input → share link → result page showing AI synthesis.

**Expected Outcomes:**
- Landing page (`/`) shows two large cards: "고민 있어요" (asker) and "답변할게요" (answerer)
- Asker flow: text input + free-text category hint → submit → receive `concern.id` → navigate to `/concern/[id]` which shows pending state until ≥3 answers exist, then shows synthesis result
- Web Share API button on `/concern/[id]` (and clipboard copy fallback)
- `/concern/[id]` is publicly accessible (anyone with link can answer via the answerer flow)

**Todo List:**
1. Rewrite `src/app/page.tsx` — role selection screen with two buttons/cards
2. Create `src/app/concern/[id]/page.tsx` — concern result/share page (Server Component for initial data fetch, Client Component for polling/status)
3. Create `src/containers/AskerContainer.tsx` — encapsulates asker state machine:
   - Step `"input"`: textarea (max 500 chars) + optional free-text category hint
   - Step `"submitting"`: loading
   - Step `"shared"`: shows private URL + Web Share API button + clipboard copy fallback
4. Create `src/components/ShareButton.tsx` — wraps `navigator.share` with `navigator.clipboard.writeText` fallback
5. Create `src/app/api/concerns/route.ts` (POST) — receives `{content, categoryHint}`, calls Claude to classify category (free text → fixed label), inserts into `concerns`, returns `{id, category}`
6. The concern result page (`/concern/[id]`) shows:
   - Concern content
   - Answer count + "waiting for more answers" if < 3
   - AI synthesis block (percentage breakdown + summary) if ≥ 3 answers
   - Share button to collect more answers
7. Add `src/app/api/concerns/[id]/synthesis/route.ts` (GET) — fetches all answers for a concern, calls Claude synthesis if ≥ 3 answers, returns `{percentages: [...], summary: string}` (does NOT cache to DB in MVP)

**Relevant Context:**
- `navigator.share` is browser-only — must be called from a Client Component with `"use client"`
- Web Share API is not supported on all desktops; always render clipboard fallback button alongside it
- Asker session ID comes from `supabase.auth.getUser()` on the client (already set up in `src/lib/supabase/client.ts`)
- The share URL is simply `window.location.origin + "/concern/" + id` — the answerer opens this link
- No realtime subscription needed (asker manually refreshes or navigates back to their link)

---

## Sub-Task 4 — Answerer Flow UI

**Status:** [x] done

**Intent:** Build the answerer's journey: they either arrive at a concern share link OR use the main "답변할게요" entry point; they optionally describe the type of concern they want to answer; AI recommends matching open concerns; they pick one, fill in optional profile, write and submit their answer.

**Expected Outcomes:**
- Answerer entry via `/` role selection → `src/app/answer/page.tsx` preference input → AI-matched concern list
- Answerer entry via shared concern link (`/concern/[id]`) → skip matching, go directly to that concern's answer form
- Light profile form: 나이대 (선택), 직업 (선택), MBTI (선택) — all optional dropdowns/text
- Answer submitted anonymously (no session required from answerer)

**Todo List:**
1. Create `src/app/answer/page.tsx` — answerer entry page with preference text input
2. Create `src/containers/AnswererContainer.tsx` — state machine:
   - Step `"preference"`: free text "어떤 고민에 답해주고 싶으세요?"
   - Step `"matching"`: loading while Claude ranks open concerns
   - Step `"pick"`: list of recommended open concerns with relevance scores
   - Step `"compose"`: selected concern displayed + light profile fields + answer textarea
   - Step `"done"`: thank-you screen
3. Create `src/app/api/answers/match/route.ts` (POST) — receives `{preferenceText}`, fetches all `status='open'` concerns, sends to Claude for ranked matching (reuse the forced tool-use pattern from the existing `analyze/route.ts`), returns ranked `[{concern_id, score, reason}]`
4. Create `src/app/api/answers/route.ts` (POST) — receives `{concern_id, answer_text, answerer_light_profile}`, inserts into `answers` via `supabaseAdmin` (no auth session for answerer), returns `{id}`
5. When an answerer arrives at `/concern/[id]` directly, show a "답변하기" button that links to the compose step pre-filled with that concern
6. After submitting, increment answer count; if count reaches 3 update `concerns.status` to `'open'` still (synthesis is on-demand, not triggered by count)

**Relevant Context:**
- Use `supabaseAdmin` for answer inserts — answerers have no Supabase session
- The matching AI prompt should reuse the forced `tool_choice` pattern from `src/app/api/analyze/route.ts` (tool name `"rank_concerns"`)
- Light profile is `jsonb` in `answers.answerer_light_profile` — send as a plain object, no schema enforcement needed
- The answerer's `answerer_session_id` can be left null (MVP — no need to track repeat answerers)

---

## Sub-Task 5 — AI Prompts (Category + Matching + Synthesis)

**Status:** [x] done

**Intent:** Write and tune three Claude prompts — concern classification, answerer-concern matching, and multi-answer synthesis — to produce high-quality, structured outputs using forced tool-use.

**Expected Outcomes:**
- `POST /api/concerns` correctly classifies free-text category hints into one of a fixed set of labels
- `POST /api/answers/match` returns ranked concerns with relevance scores and brief reasons
- `GET /api/concerns/[id]/synthesis` returns a percentage breakdown (perspective labels + %) and a Korean summary paragraph

**Todo List:**
1. **Category classification prompt** (in `src/app/api/concerns/route.ts`):
   - Tool: `classify_concern` with `{category: string}` — output one of: 연애, 진로, 인간관계, 직장, 가족, 건강, 기타
   - Input: concern content + optional user category hint
   - Edge case: if content suggests crisis/self-harm, return `{category: "위기"}` and the route returns a 200 with a professional help notice (no concern is saved)

2. **Matching prompt** (in `src/app/api/answers/match/route.ts`):
   - Tool: `rank_concerns` with `{rankings: [{concern_id, score, reason}]}`
   - Input: answerer's preference text + list of open concerns (id, content, category, answer_count)
   - Return top 5 max; score 0–100
   - If fewer than 5 open concerns exist, return all of them

3. **Synthesis prompt** (in `src/app/api/concerns/[id]/synthesis/route.ts`):
   - Tool: `synthesise_answers` with `{perspectives: [{label, percentage, example_quote}], summary: string}`
   - Input: concern content + all answer texts + answerer light profiles
   - Must produce 2–5 perspectives that sum to 100%
   - Summary: 2–3 Korean sentences, neutral tone, no direct advice
   - If any answer contains abusive/inappropriate content, exclude it silently

4. Test all three prompts manually with sample data before wiring to UI

**Relevant Context:**
- All three routes must use `tool_choice: { type: "tool", name: "..." }` and validate the tool_use block exists in response (see pattern in `src/app/api/analyze/route.ts` lines 99–145)
- Model: `claude-sonnet-5` (already in use in the codebase)
- Korean output required for all user-facing text in prompts
- Crisis detection in classification is a safety requirement (see `gogo-renewal.md` Section 9)

---

## Sub-Task 6 — Web Share API Integration

**Status:** [x] done

**Intent:** Replace all Kakao share calls with Web Share API and a clipboard copy fallback. This is the only sharing mechanism for the hackathon submission.

**Expected Outcomes:**
- `src/components/ShareButton.tsx` component works on mobile (Web Share sheet) and desktop (clipboard copy)
- No Kakao SDK, no Kakao developer key, no `NEXT_PUBLIC_KAKAO_JS_KEY` anywhere
- Share URL format: `https://{origin}/concern/{id}`
- Share text: brief Korean invitation sentence

**Todo List:**
1. Create `src/components/ShareButton.tsx`:
   - Props: `url: string`, `title: string`, `text: string`
   - Primary action: `navigator.share({ title, text, url })` — only rendered if `typeof navigator !== "undefined" && navigator.share`
   - Fallback: clipboard copy button (`navigator.clipboard.writeText(url)`) always visible
   - Show "복사됨!" toast on successful copy
2. Use `ShareButton` in the asker's concern page (`/concern/[id]`) and in the "shared" step of `AskerContainer`
3. Remove `NEXT_PUBLIC_KAKAO_JS_KEY` from `.env.local.example` (done in Sub-Task 1, verify here)
4. Update `AGENTS.md` — remove Kakao SDK notes, add Web Share API note

**Relevant Context:**
- `navigator.share` must be called from a user gesture (button click) — cannot be triggered programmatically on load
- Web Share API is only available in secure contexts (HTTPS) — Vercel deployments satisfy this; local `next dev` on http://localhost also satisfies it in most browsers
- No SDK loading, no developer account needed — this is entirely browser-native

---

## Sub-Task 7 — Cleanup, README, and Hackathon Documentation

**Status:** [ ] pending

**Intent:** Satisfy hackathon Theme 2 requirements: document what was analysed and what changed, write a clear README, remove all dead env vars, and prepare the repo for submission.

**Expected Outcomes:**
- `README.md` describes the new app, how to run it, and what was transformed
- `.env.local.example` reflects only the variables that are still needed
- No dead code, no console.logs, no TODO comments left in submitted files
- `AGENTS.md` updated to reflect new architecture

**Todo List:**
1. Rewrite `README.md`:
   - App description (new concept)
   - Setup instructions (env vars, Supabase migration, `npm run dev`)
   - What changed from the original Gogo (brief before/after table — mirrors `gogo-renewal.md` Section 2)
   - IBM Bob hackathon context (Theme 2)
2. Update `.env.local.example` — remove `NEXT_PUBLIC_KAKAO_JS_KEY`, keep the other four
3. Update `AGENTS.md` — reflect new architecture (concerns/answers tables, new API routes, no Kakao)
4. Run `npm run lint` and fix any remaining warnings
5. Run `npm run build` and confirm clean build
6. Final check: no imports of deleted files, no Kakao references in any file

**Relevant Context:**
- Hackathon submission is GitHub repo + README (per `gogo-renewal.md` Section 8)
- Theme 2 requirement: document the original code analysis — can reference `gogo-renewal.md` in README
- `vercel.json` is already present — no changes needed for deployment

---

## Dependency Order

```
Sub-Task 1 (Remove Legacy)
    ↓
Sub-Task 2 (New Schema)
    ↓
Sub-Task 5 (AI Prompts) ←── can be drafted in parallel with 3 and 4
Sub-Task 3 (Asker Flow)
Sub-Task 4 (Answerer Flow)
    ↓
Sub-Task 6 (Web Share)
    ↓
Sub-Task 7 (Docs + Cleanup)
```
