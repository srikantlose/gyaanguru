# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

GyaanGuru is a personalized learning-roadmap app for Indian learners, with roadmaps aligned to NSQF (National Skills Qualification Framework) levels. It is a single Next.js 16 (App Router, Turbopack) + React 19 app using Supabase for auth and data and Google Gemini for generation. It was scaffolded with v0, which is why logs carry a `[v0]` prefix.

The README describes a broader platform: blockchain certificates, Express/Flask backends, Sarvam AI, LangChain/LlamaIndex RAG and Trellis 3D. **None of that is in this repo.** Don't assume it exists.

**Next 16 differs from older Next.js.** The version-matched docs are in `node_modules/next/dist/docs/` (see `AGENTS.md`, which `next dev` regenerates). Check them before using Next APIs from memory.

## Commands

```bash
npm install          # npm only; package-lock.json is the lockfile
npm run dev          # next dev (Turbopack; output goes to .next/dev)
npm run build        # next build (fails on type errors)
npm run start        # next start
npm run typecheck    # tsc --noEmit
npm run lint         # eslint . (flat config in eslint.config.mjs; one file: npx eslint <path>)
```

- **No automated test suite.** Verify with `typecheck`, `lint`, `build` and a run of the app. See "Local end-to-end testing" below.
- **Lint baseline is 0 errors.**
  - `@typescript-eslint/no-explicit-any` is a warning because model and Supabase JSON payloads are loosely typed. Don't add new `any`s.
  - The React Compiler rules (`react-hooks/purity`, `react-hooks/set-state-in-effect`) are errors. Don't sync props to state in effects, and don't call `Math.random`/`Date.now` during render.
- **Building without a real `.env.local`:** the header creates a Supabase browser client during render, so set placeholder `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` values or prerendering fails.
- **`NEXT_PUBLIC_*` values are inlined at build time.** Rebuild after changing them.
- **Version constraints:**
  - TypeScript stays on 5.x: typescript-eslint doesn't support TS 7.
  - Don't go below Next 15.5: earlier 15.x releases have a React Server Components RCE.
  - `vaul` must stay ≥1.1 for React 19.
- **shadcn wrappers in `components/ui/`:**
  - Don't use `shadcn add --overwrite` blindly: it also rewrites `button.tsx` and `card.tsx`, which every page uses.
  - The registry files import `cn` from `"cn"`. Rewrite that to `@/lib/utils`.

## Environment variables (`.env.local`, template in `.env.example`)

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all Supabase clients |
| `GEMINI_API_KEY` | all AI routes, via `lib/gemini.ts` |
| `GEMINI_MODEL` | optional model override (default `gemini-3.6-flash`) |
| `GEMINI_BASE_URL` | optional proxy/gateway in front of the Gemini API; also used to point at a local stub for testing |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | `/api/jobs/search`. Optional: returns hardcoded `MOCK_JOBS` when unset |
| `YOUTUBE_API_KEY` | `/api/youtube`. Returns 501 when unset, and the lesson page shows a notice |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | optional sign-up email redirect; defaults to `${origin}/dashboard` |

## Architecture

### Auth model
- `proxy.ts` (Next 16's renamed middleware) calls `lib/supabase/middleware.ts`. It **only refreshes the Supabase session and never redirects.**
- Protection is done per page and per route:
  - Server component pages call `supabase.auth.getUser()` and `redirect("/auth/login")`.
  - API routes return `401`.
  - New protected pages and routes must repeat this check themselves.
- **Every API route requires login except:**
  - `/api/jobs/search`: `/jobs` is a public page.
  - `/api/nsqf/roadmap`: rule-based, with no external cost.
  - Keep the routes that spend Gemini or YouTube quota behind login.
- Which client to use:
  - `@/lib/supabase/server` (async `createClient()`, cookie-based) in server components and route handlers.
  - `@/lib/supabase/client` in `"use client"` components (e.g. `components/header.tsx`, `app/onboarding/page.tsx`).
- Queries filter by `user_id` explicitly even though RLS is enabled. Keep doing both.

### Data model (Supabase)
- **The schema lives in `scripts/schema.sql`.** It is a single idempotent file to run in the Supabase SQL editor, and it also upgrades databases built from the old migrations.
  - When the schema changes, edit this file in the same idempotent style (`add column if not exists`, drop-then-create policies).
  - The original `scripts/00x_*.sql` files were deleted in commit `282d493`. They are viewable via `git show 4e1fd08:scripts/<name>.sql`.
- **`profiles`**: `id` (= `auth.users.id`), `full_name`, `points`, `onboarded`, `onboarded_at`, `onboarding_data` (jsonb).
  - A trigger on `auth.users` creates the row on sign-up.
  - The user's current NSQF level is stored inside `onboarding_data.current_nsqf_level`, not in its own column.
- **`roadmaps`**: metadata columns plus `content` (jsonb), `nsqf_level`, `nsqf_description`.
  - `content` has the shape `{ title, description, modules: [{ id, title, topics: [{ id, title, description, estimatedHours }] }], nsqf? }`.
  - The dashboard, `RoadmapVisualization` and `VisualRoadmap` all assume this shape.
- **`progress`**: one row per completed topic, keyed by **`(user_id, roadmap_id, module_index, topic_index)`**.
  - Rows are keyed by array position, not by topic `id`. Reordering a roadmap's modules or topics would orphan progress rows.
  - Un-completing a topic deletes its row.
- **Points**: `/api/progress` gives ±5 per topic.
  - The change goes through the `adjust_points(delta)` SQL function, which is atomic, clamps at 0 and only touches the caller's row.
  - Points move only when the insert/delete actually changed a row (`ignoreDuplicates` + `.select()`), so repeated clicks don't double-award.
- `/api/onboarding` returns `412 SchemaNotMigrated` when the onboarding columns are missing.

### AI routes (Gemini)
- All Gemini calls go through `lib/gemini.ts`, built on the `@google/genai` SDK:
  - `generateText(contents, { systemInstruction, temperature, json })` handles single prompts and multi-turn `Content[]`.
  - `generateJson(prompt)` uses JSON response mode, then `extractJsonPayload` (a fenced block, else the outermost `{...}`). It throws `ModelOutputError` on non-JSON.
- **Every JSON route validates with zod before using the output:** `generate-roadmap`, `generate-quiz`, `generate-in-depth`, `nsqf/ai-roadmap`. Keep response shapes stable: client components read `response`, `text`, `content`, `quiz` and `roadmap` directly.
- `career-guidance` is multi-turn, with a system instruction. Its `rag` flag only changes the system prompt. **No retrieval happens anywhere.**

### NSQF logic
- **Supported level range:** the app assigns levels **3–6** only, defined once as `NSQF_MIN_LEVEL`, `NSQF_MAX_LEVEL` and `clampNsqfLevel()` in `lib/nsqf.ts`. Every route below uses them. Widening the range also requires adding rows to `data/*.json`.
- `lib/nsqf.ts`: static descriptors for levels 1–6, returned by `getNsqfMapping()`.
- `/api/generate-roadmap`: `computeNsqf()` is a heuristic based on experience and goal. The result is stored in `content.nsqf` and in the `nsqf_*` columns.
- `/api/nsqf/roadmap`:
  - Rule-based.
  - Reads `data/nsqf-reference.json`. `data/nsqf-reference-marketing.json` overrides it per level, so marketing roles win.
  - Builds a 3-step path that ends at L6.
- `/api/nsqf/ai-roadmap`: the zod-validated AI path (exactly 3 nodes). `/nsqf/demo` saves it via `/api/nsqf/save-roadmap` into `roadmaps`.
- `/api/nsqf/level`: reads and writes the user's current level. It is called by the NSQF ladder in `components/nsqf-roadmap.tsx`.

### Main user flow
1. `/generate` → `components/roadmap-generator.tsx` → `POST /api/generate-roadmap`, which generates the roadmap and inserts it into `roadmaps`.
2. `/roadmap/[id]`: the server component loads the roadmap and passes it to `components/roadmap-visualization.tsx`.
   - This is a large client component (~900 lines) and the hub of the learning UI.
   - It handles progress (`/api/progress`), in-depth notes (SWR → `/api/generate-in-depth`), the AI instructor (`/api/ai-instructor`), quizzes (`/api/generate-quiz`) and YouTube lectures.
   - `components/visual-roadmap.tsx` renders the same data with `@xyflow/react`. Custom nodes need `<Handle>`s with ids matching each edge's `sourceHandle`/`targetHandle`, or edges silently don't render.
3. `/dashboard` computes completion per roadmap from one `progress` query: rows ÷ topics in `content.modules`.
- **Onboarding and profile autosave:** triggered from edit handlers (`update`), never from an effect on the form state. An effect would also fire on mount and could overwrite saved answers with the empty form.

### Static or mock areas
- `/ai-mentor` is a hardcoded UI with static sample data and canned replies. It makes no API calls.
  - It is prerendered, so its initial render must be deterministic: no times, random values or locale formatting.
- `components/career-path-simulator.tsx` uses hardcoded India salary and outcome tables.
- `@vercel/analytics` requests `/_vercel/insights/script.js`, which 404s anywhere except on Vercel. That's expected.

## Local end-to-end testing
- Run local Supabase in Docker: `npx supabase init` and `npx supabase start` in a scratch directory. Excluding unneeded services with `-x` keeps it light.
- Apply `scripts/schema.sql` with `psql` against port 54322. Local auth has email confirmation off, so sign-up logs in immediately.
- Run the app with the local `NEXT_PUBLIC_SUPABASE_*` values. For AI features without a real key, point `GEMINI_BASE_URL` at a small HTTP stub that answers `POST /v1beta/models/{model}:generateContent` with `{ candidates: [{ content: { parts: [{ text }] } }] }`.

## Conventions
- **Import alias:** `@/*` maps to the repo root.
- **UI primitives:** shadcn/ui ("new-york" style, lucide icons) in `components/ui/`.
- **Styling:** Tailwind CSS v4 via `@tailwindcss/postcss`; there is no `tailwind.config`.
  - `app/globals.css` is the live stylesheet. `styles/globals.css` is an unused leftover.
- **Fonts:** `app/layout.tsx` binds the Baloo 2 font to the `--font-geist-sans` CSS variable. The variable name is misleading.
- **Async request APIs:** route `params`, `cookies()` and `headers()` are async (`const { id } = await params`).
