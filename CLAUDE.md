# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

GyaanGuru is a personalized learning-roadmap app for Indian learners. Roadmaps can be built on real NSQF (National Skills Qualifications Framework) qualifications, and a placement test gives learners a tested level. It is a single Next.js 16 (App Router, Turbopack) + React 19 app using Supabase for auth and data and Google Gemini for generation. It was scaffolded with v0, which is why logs carry a `[v0]` prefix.

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
npm run refresh:qualifications   # re-read data/qualifications.json from nqr.gov.in (dry run; see "NSQF logic")
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
| `SUPABASE_SECRET_KEY` | **server only** (`lib/supabase/admin.ts`). Quizzes, recaps and points need it; without it the quiz routes return 503 and the lesson page says quizzes are off. Never prefix it with `NEXT_PUBLIC_` |
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
  - `/api/nsqf/roadmap`: rule-based, with no external cost. Its page, `/nsqf/demo`, is public too.
  - Keep the routes that spend Gemini or YouTube quota behind login.
- Which client to use:
  - `@/lib/supabase/server` (async `createClient()`, cookie-based) in server components and route handlers.
  - `@/lib/supabase/admin` (`createAdminClient()`, secret key, **bypasses RLS**, `server-only`): only in route handlers, after checking the user, for the quiz, recap, lesson-view and placement-test tables and the server-only award functions. Returns `null` when `SUPABASE_SECRET_KEY` is unset.
  - `@/lib/supabase/client` in `"use client"` components (e.g. `components/header.tsx`, `app/onboarding/page.tsx`).
- Queries filter by `user_id` explicitly even though RLS is enabled. Keep doing both.
- **Sign-up:** if Supabase returns a session (email confirmation off), the user goes straight to `/onboarding`; otherwise to `/auth/sign-up-success`.
- **Password reset:**
  - `/auth/forgot-password` calls `resetPasswordForEmail` with `redirectTo` set to `/auth/reset-password`.
  - That page waits for the browser client to read the link (PKCE code or hash) and then calls `updateUser({ password })`.
  - The redirect URL must be in Supabase **Auth → URL Configuration → Redirect URLs**.
  - Supabase's built-in mailer only delivers to the project team's addresses and has low hourly limits; real users need custom SMTP.

### Data model (Supabase)
- **The schema lives in `scripts/schema.sql`.** It is a single idempotent file to run in the Supabase SQL editor, and it also upgrades databases built from the old migrations.
  - When the schema changes, edit this file in the same idempotent style (`add column if not exists`, drop-then-create policies).
  - The original `scripts/00x_*.sql` files were deleted in commit `282d493`. They are viewable via `git show 4e1fd08:scripts/<name>.sql`.
- **`profiles`**: `id` (= `auth.users.id`), `full_name`, `points`, `onboarded`, `onboarded_at`, `onboarding_data` (jsonb).
  - A trigger on `auth.users` creates the row on sign-up.
  - The learner's **tested** NSQF level is not on `profiles`; it comes from `placement_tests` (see "NSQF logic"). `onboarding_data.current_nsqf_level` is a legacy self-set value, only ever shown as an estimate.
  - Signed-in users may only `update` `email`, `full_name`, `onboarded`, `onboarded_at` and `onboarding_data` (column grants). **`points` is written only by the SQL functions below.** A new profile column that users must edit needs adding to that grant.
- **`roadmaps`**: metadata columns plus `content` (jsonb), `nsqf_level`, `nsqf_description`.
  - `content` has the shape `{ title, description, modules: [{ id, title, unit?, topics: [{ id, title, description, estimatedHours }] }], nsqf?, qualification? }`.
    - `nsqf` is `{ level, description, source: "qualification" | "estimate" }`. Older roadmaps also carry a made-up `mapping`; nothing reads it now.
    - `qualification` is a snapshot `{ id, code, title, level, checkedOn }` of the real qualification the roadmap is built on, and `modules[i].unit` is the NOS code module i covers. Display code looks the qualification up in the catalogue by `id` and never trusts the snapshot's other fields (users can write `content`).
  - The dashboard, `RoadmapVisualization` and `VisualRoadmap` all assume this shape.
- **`progress`**: one row per completed topic, keyed by **`(user_id, roadmap_id, module_index, topic_index)`**.
  - Rows are keyed by array position, not by topic `id`. Reordering a roadmap's modules or topics would orphan progress rows.
  - Un-completing a topic deletes its row.
  - Users can only read it. Rows are written by `complete_topic()` / `uncomplete_topic()` (which check that the lesson exists in the roadmap's `content`) and by `award_lesson_quiz()` when a quiz is passed.
- `/api/onboarding` returns `412 SchemaNotMigrated` when the onboarding columns are missing. `/api/progress` and `/api/rewards` do the same when the points tables or functions are missing, and the placement routes when `placement_tests` is missing (checked before any Gemini call).

### Points and rewards
- **Points are for proof of learning, not ticks.** Ticking a lesson only tracks progress and pays nothing.
  - **+5** for passing a lesson's quiz, paid once per lesson.
  - The **roadmap bonus** `max(60, 8 × lessons)`, with lessons capped at 40, is paid once the roadmap is **verified**: every lesson quiz passed *and* a recap approved.
  - The Completion Certificate also needs a verified roadmap.
- **Quizzes are marked on the server** (`/api/quiz/start` → `/api/quiz/submit`, code in `lib/quiz.ts`):
  - The questions *and answers* are stored in `lesson_quizzes`. The browser only ever gets questions and options; answers and explanations come back after submitting.
  - Pass mark: 3 of 4 (`QUIZ_PASS_RATIO`).
  - Each quiz can be submitted once, within 60 minutes. A retry is a new quiz with fresh questions.
  - Rate limits: 5 starts per lesson per hour, 60 per day.
  - **Pacing:** `lesson_views` records when a lesson was first opened, from the notes fetch → `/api/lessons/view`. Its quiz unlocks 3 minutes later; `/api/quiz/start` returns **425** until then.
  - **Daily cap:** at most 15 lessons pay points per India day. A pass beyond that still ticks the lesson but pays 0 (`reason: "daily_limit"`), and passing again another day pays.
- **Recap** (`/api/recap`):
  - Only after every quiz is passed.
  - 80–1500 characters, 5 tries per roadmap per day.
  - Gemini (`checkRecap`) approves it only if it explains at least two specific things from the lessons in the learner's own words. The recap sits inside `<recap>` tags and the prompt tells the model to ignore instructions in it.
  - Approval calls `award_roadmap_bonus`.
  - The lesson view's "Bonus checklist" (`components/roadmap-verify.tsx`) shows quiz status per lesson and the recap form.
- **Trust boundary: the secret key.** `lesson_views`, `lesson_quizzes`, `roadmap_recaps` and `placement_tests` have RLS on with no policies, so learners can't read or write them; only the server's `createAdminClient()` (service_role) can. Without that, a learner could write themselves a "passed" quiz or a tested level.
- **SQL functions** (`scripts/schema.sql`):
  - For learners (`authenticated`, acting on `auth.uid()`):
    - `complete_topic` / `uncomplete_topic`: tick or untick only.
    - `redeem_reward(reward_id, target_id?)`: locks the profile row, checks the per-kind rules and the balance, then deducts. Concurrent redemptions can't overdraw.
    - `quiz_status(roadmap)`: passed lessons, plus whether the recap is approved and the bonus paid. Read by `GET /api/progress`.
    - `verified_roadmaps()`: certificate eligibility. Read by `loadLearner` and the roadmap page.
    - `placement_result()`: the caller's latest submitted placement test (`track`, `placed_level`, `target_level`, `band_scores`, `submitted_at`), or null.
  - Server only (`service_role`):
    - `award_lesson_quiz(user, roadmap, module, topic)`: requires a passed quiz row; ticks the lesson, pays +5 subject to the daily cap, then tries the bonus.
    - `award_roadmap_bonus(user, roadmap)`: pays once if `roadmap_verified`. It locks the roadmap row, so concurrent calls pay exactly once.
  - `adjust_points()` was removed: it let any signed-in user add any number of points.
- **`point_events` is the ledger.** Every points change has a row (`topic`, `roadmap_bonus`, `redeem`, `adjust`), and `profiles.points` always equals the sum. Award rows are unique on `(user_id, kind, ref)`, which is what makes awards idempotent. The schema backfills a `topic` row per existing `progress` row plus an `adjust` "opening balance" row, so older balances carry over.
- **`reward_catalog`** is seeded by the schema:
  - `kind = 'perk'` items work in the app (`perk` column):
    - `streak_freeze`: covers one missed day.
    - `certificate`: once per **verified** roadmap, unlocks `/certificate/[roadmapId]`, which is printable.
    - `sticker_pack`: once, adds draggable stickers on the dashboard.
  - `kind = 'demo'` items (the six vouchers and packs) take the points and log a `requested` redemption, but nothing is delivered. The UI says so.
  - `tone` is one of the pop colors.
- **`reward_redemptions`**: perks are `active`, demo items are `requested`. Partial unique indexes back up the one-certificate-per-roadmap and one-sticker-pack rules.
- **Read side:**
  - `lib/rewards.ts` (`loadRewards`, error text for each SQL exception, `roadmapBonus()` for display).
  - `lib/learner.ts` adds `pointsEarned`, `pointsSpent`, `roadmapsFinished` (finished now, or ever via a bonus row), `verifiedRoadmaps`, `freezesAvailable`, `stickerPack`, `certificates` and `rewards`.
- **Streaks:**
  - Days are keyed in **`Asia/Kolkata`**.
  - Activity comes from the first-tick time of each lesson, using its ledger row when there is one, so unticking doesn't erase history.
  - `computeStreak()` assigns each Streak Freeze, in purchase order, to the first missed day on or after the day it was bought. A frozen day bridges the streak but doesn't add to it.
- **Badges:** `lib/achievements.ts` (10 badges) uses `roadmapsFinished` and lifetime `pointsEarned`, so redeeming or unticking never takes a badge away. "Level Up" needs a **tested** level of 5+; an estimate never counts.
- **UI:**
  - `/rewards`: `components/rewards-client.tsx`. It redeems through a confirm dialog, then calls `router.refresh()`.
  - In the lesson view:
    - `toggleTopic` rolls back on failure and shows the error.
    - A passed quiz shows a "+5" pop and stars the lesson in the outline.
    - Ticking the last lesson prompts the bonus checklist; verification shows a "Roadmap verified" card.
  - The dashboard Points tile links to `/rewards`.
  - The header has a Rewards link.
- **Accepted gaps:**
  - Users can still insert their own `roadmaps` rows with any `content`, so a determined user could make an easy fake roadmap and pass its quizzes. The daily cap and the 40-lesson cap limit the damage. If rewards ever have real value, roadmap writes must move server-side too.
  - Quizzes can be passed by looking answers up. That's still more learning than a tick. The same goes for the placement test, which is why it's always labelled a practice test, not an NSQF assessment.
  - A user could write a `content.qualification.id` onto a roadmap they generated freely. It only changes what their own roadmap page and certificate say it "prepares for", and the certificate still says it isn't an NSQF qualification.

### AI routes (Gemini)
- All Gemini calls go through `lib/gemini.ts`, built on the `@google/genai` SDK:
  - `generateText(contents, { systemInstruction, temperature, json })` handles single prompts and multi-turn `Content[]`.
  - `generateJson(prompt, opts?)` uses JSON response mode, then `extractJsonPayload` (a fenced block, else the outermost `{...}`). It throws `ModelOutputError` on non-JSON.
- **Every JSON route validates with zod before using the output:** `generate-roadmap`, `quiz/start` (via `lib/quiz.ts`), `placement/start` (via `generatePlacementTest`), `recap`, `generate-in-depth`. Keep response shapes stable: client components read `response`, `text`, `content`, `quiz` and `roadmap` directly.
- **Resilience** (`generateText`):
  - Retries 429/5xx, then falls back through `GEMINI_FALLBACK_MODELS` (default `gemini-3.5-flash-lite, gemini-3.7-flash, gemini-3.8-flash, gemini-3.5-flash`).
  - A 404 (model not offered to this key; `gemini-2.5-flash` is closed to new users) or a used-up *daily* quota skips straight to the next model.
  - If every model fails, it throws `AIUnavailableError`, and every AI route maps that to **503 + `AI_BUSY_MESSAGE`**.
  - Client components show the server's `error` text (with "Try again" where it makes sense); never fail silently.
- **Free-tier keys** have small per-minute and per-day limits *per model*. Heavy testing exhausts them quickly. Use the stub (`GEMINI_BASE_URL`) for automated runs.
- **Learner-grounded AI:**
  - `lib/learner.ts`: `loadLearner()` returns one snapshot (profile, tested-or-estimated `level`, roadmaps with per-topic completion and linked qualification, hours, streak, last-7-days activity, goals, points and rewards). `describeLearner()` turns it into prompt context, marking demo rewards and estimated levels as such.
  - These use it: `/api/mentor` (AI Mentor chat), `/api/career-guidance` (when `rag` is true, it adds the snapshot, the official level descriptors and the qualification catalogue, and tells the model to recommend only listed qualifications by exact title), and the AI Mentor and Career Guidance pages.
- **Other AI routes:** `/api/resume-match` (score, strengths, gaps, courses) and `/api/career-compare` (two paths: roles, LPA ranges, demand, months to job-ready). Both are zod-validated. Their NSQF levels (1–8) are labelled "AI estimate" in the UI.
- **Badges:** `lib/achievements.ts` computes them from the snapshot. There's no badge table (see "Points and rewards").

### NSQF logic
The rule: **GyaanGuru never claims to award an NSQF level.** It shows a level the learner *tested* at, real qualifications to aim for, and how to take the official assessment. Everything else is labelled an estimate.
- **Supported level range:** the app assigns levels **3–6** only, defined once as `NSQF_MIN_LEVEL`, `NSQF_MAX_LEVEL` and `clampNsqfLevel()` in `lib/nsqf.ts`. The catalogue and placement test cover this band; widening it means adding qualifications and placement bands.
- **Official descriptors** (`lib/nsqf.ts`): the NCVET table for levels 1–8 (NSQF revised in 2023, with half levels), copied from https://nqr.gov.in/level-descriptors: five domains per level plus the typical entry education. `getNsqfDescriptor(level)` (a half level uses the level above, as the official table groups them) and `describeNsqfLevel(level)` for prompts.
- **Qualification catalogue** (`data/qualifications.json`, loaded and zod-checked by `lib/qualifications.ts`):
  - 31 real qualifications in 4 tracks (`software`, `data-ai`, `infra`, `marketing`), copied from their National Qualifications Register pages on `checkedOn`. Each has its NQR code, exact level (e.g. 4.5), awarding and certifying body, hours, approval dates, eligibility rows, units (NOS) and the qualification-file PDF.
  - Units carry `mandatory` and `core`; `core: false` marks employability skills, OJT, introductions and generic workplace-safety units, which roadmaps don't teach.
  - **Band:** `levelBand(level)` = the level rounded up (4.5 → 5), matching the official table's grouping.
  - **Expiry:** `isCurrent(q, today)` hides anything past `validTill`. Five of the marketing track's qualifications (Media & Entertainment) expire on 23 Feb 2027, which leaves that track with nothing at levels 4–6.
  - **Refreshing:** `scripts/refresh-qualifications.mjs` (`npm run refresh:qualifications`) re-reads every entry from its NQR page and reports changes, anything expiring within 120 days, and tracks with an empty level. `-- --write` rewrites the file and `checkedOn`; `--add <page id>:<track>` and `--remove nqr-<id>` edit the list; `--discover` lists current IT-ITeS and Media qualifications at levels 2.5–6 that aren't in the file. Never type catalogue values by hand.
  - Helpers: `ladder(track)`, `recommend(track, band)`, `guessTrack(text)` (whole-word keyword match), `suggestQualifications`, `rankQualifications`, `examplesByBand`, `coreUnits`, `formatLevel`, and the NQR / Skill India links.
- **Placement test** (`/placement` → `/api/placement/start` → `/api/placement/submit`; rules and marking in `lib/placement.ts`, generation in `lib/quiz.ts`):
  - 3 questions at each band 3–6 of one track (12 in all), each built on a real unit of a qualification at that band and pitched at the official descriptor. The prompt contains only catalogue data. zod rejects output without exactly 3 valid-unit questions per band (502). Options are shuffled on the server.
  - Stored with answers in `placement_tests` (server-only). The browser gets band, question and options only.
  - A band passes with 2 of 3. **Placed** = the highest band passed along with every band below it, else 3; **target** = placed + 1 (max 6), or 3 if band 3 failed.
  - 30 minutes to submit, one submit (409 after, 410 when expired), 3 starts per India day (429).
  - Onboarding's Finish goes to `/placement?welcome=1`, which can be skipped.
- **The learner's level** (`resolveLevel` in `lib/learner.ts`): `"tested"` from `placement_result()`, else `"estimated"` (a legacy `current_nsqf_level`, else the official entry level for their education via `estimateLevelFromEducation`, else their highest roadmap level). The dashboard, `/generate`, `/placement`, `/nsqf/demo` and Career Guidance all use it, and the UI always shows which kind it is.
- **Roadmaps on a qualification** (`/api/generate-roadmap`, body zod-validated, optional `qualificationId`):
  - Unknown or expired id → 400. The prompt asks for exactly one module per core unit, in order; a wrong count → 502. The server writes `modules[i].unit`, `content.qualification` and `nsqf_level = levelBand(level)`.
  - Without a qualification, `estimateNsqf()` (experience and goal) gives an estimated level, stored with `source: "estimate"`.
  - `/generate?qualification=<id>` preselects one; `components/qualification-picker.tsx` suggests matches for the topic during render.
  - Lesson quizzes on a linked roadmap add the unit's official title to the prompt (`lessonUnit()`, looked up in the catalogue by code).
- **Getting certified** (`components/certification-handoff.tsx`, `#get-certified` on the roadmap page): eligibility rows, the qualification file, Skill India Digital Hub courses and training centres, and the awarding body's assessment, plus an honest hours comparison. It asks the learner to verify the roadmap first until they have. The verified card and the bonus checklist link to it. The certificate page says "Prepares for" and that it isn't an NSQF qualification.
- **Paths** (`lib/nsqf-path.ts`, `buildPath`): one real qualification per band from the learner's level up to 6 in a track, with alternatives. Used by the public `/api/nsqf/roadmap`, the `/nsqf/demo` path planner (no AI) and the Career Guidance tracker (`components/nsqf-roadmap.tsx`).

### Main user flow
1. `/generate` → `components/roadmap-generator.tsx` → `POST /api/generate-roadmap`, which generates the roadmap, inserts it into `roadmaps`, and the form then navigates to `/roadmap/[id]`.
2. `/roadmap/[id]`: the server component loads the roadmap and passes it to `components/roadmap-visualization.tsx`.
   - This is a large client component (~900 lines) and the hub of the learning UI.
   - It handles progress (`/api/progress`), in-depth notes (SWR → `/api/generate-in-depth`), the AI instructor (`/api/ai-instructor`), server-marked quizzes (`/api/quiz/start` and `/api/quiz/submit`), the bonus checklist and YouTube lectures.
   - **YouTube lectures:** `videoQueries()` (`lib/video-query.ts`) builds up to 3 short queries (lesson + subject, lesson, module) with unit codes and filler stripped; `/api/youtube` tries them in order and stops once it has 3 videos. Don't send the whole roadmap + module + lesson title as one query: YouTube returns nothing for it.
   - `components/visual-roadmap.tsx` renders the same data with `@xyflow/react`. Custom nodes need `<Handle>`s with ids matching each edge's `sourceHandle`/`targetHandle`, or edges silently don't render.
3. `/dashboard` computes completion per roadmap from one `progress` query: rows ÷ topics in `content.modules`.
- **Onboarding and profile autosave:** triggered from edit handlers (`update`), never from an effect on the form state. An effect would also fire on mount and could overwrite saved answers with the empty form.

### Static or mock areas
- Jobs show built-in sample listings until `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` are set.
- The six `demo` rewards in `reward_catalog` deliver nothing; only the three `perk` items do something.
- The qualification catalogue is a static snapshot of the National Qualifications Register (see "NSQF logic"); it doesn't update itself.
- `@vercel/analytics` requests `/_vercel/insights/script.js`, which 404s anywhere except on Vercel. That's expected.
- `docs/study-guide/` (`index.html` plus two PNG diagrams) is a standalone snapshot of the project as of Nov 2026. It isn't built from the code, so update it by hand when features change.

## Local end-to-end testing
- Run local Supabase in Docker: `npx supabase init` and `npx supabase start` in a scratch directory. Excluding unneeded services with `-x` keeps it light.
- Apply `scripts/schema.sql` with `psql` against port 54322. Local auth has email confirmation off, so sign-up logs in immediately.
- Run the app with the local `NEXT_PUBLIC_SUPABASE_*` values. For AI features without a real key, point `GEMINI_BASE_URL` at a small HTTP stub that answers `POST /v1beta/models/{model}:generateContent` with `{ candidates: [{ content: { parts: [{ text }] } }] }`.

## UI and design system ("notebook brutalist")
- **Look:**
  - Notebook paper with ink outlines, hard offset shadows and flat bright fills.
  - Decorated with stickers, washi tape, stamps, highlighter strokes and handwritten notes.
  - Keep new UI in this language. Don't reintroduce soft blurred shadows, gradients or gradient text.
- **Palette** (`app/globals.css`):
  - `ink` (#15171e) for text, borders and shadows; `paper` background; deep-teal `primary` for links.
  - Pops `brand` (teal), `marigold`, `coral`, `lagoon`, `leaf` and `bubblegum` are bright fills meant for **ink text**. Never use white text on them; only `bg-ink` takes white text.
  - Each pop has a `-soft` tint and an `-ink` shade for colored text on light backgrounds.
  - Don't use raw Tailwind palette colors (`purple-600`, `gray-500`, ...).
  - The app is light-only, so don't add `dark:` variants.
- **Surfaces:**
  - Containers use `border-2 border-ink` with a hard shadow: `shadow-soft` (3px), `shadow-brut` (4px) or `shadow-lift` (6px). These are all solid ink offsets.
  - `.brut` / `.brut-interactive` give the border, shadow and press-on-click behavior.
  - A hard shadow without an ink border looks broken, so always pair them.
  - `--border` is a soft warm line for internal dividers only; `--input` and `--ring` are ink.
- **Primitives** (`components/ui/`):
  - Button variants: `default` (marigold), `outline` (white), `secondary` (teal), `pop` (ink with a marigold shadow), `destructive`, `ghost`, `link`. Filled buttons press into their shadow on click.
  - Cards, inputs, tabs, badges, dialogs and selects all carry ink borders.
- **Fonts** (`app/layout.tsx`):
  - Archivo (wide, via the `wdth` axis; `font-display`, applied to h1–h4). Posters use `uppercase` with `[font-stretch:120%]`.
  - Figtree for body text (`font-sans`).
  - Kalam for handwriting (`.hand`). It includes Devanagari, e.g. "ज्ञान"; the display font doesn't.
- **Notebook pieces:**
  - `components/doodles.tsx`:
    - `Sticker`, which can be dragged; double-click resets it.
    - `Tape` and `Stamp`.
    - `ScribbleUnderline`, `ScribbleCircle` and `ScribbleArrow`, which draw themselves in via `.draw` + `pathLength=1`.
    - `DoodleStar` and `HandNote`.
  - Utilities: `.marker` (highlighter) and `.ruled` (ruled lines).
  - Absolutely positioned SVGs need explicit width and height: replaced elements don't stretch to their insets.
- **Shared blocks:**
  - `PageHeader` (sticker eyebrow, title, optional handwritten `note`, taped "scrapbook" art card).
  - `SpotlightCard` (ink card with hover lift and glow; optional `tape` and `tilt`).
  - `SectionTitle`, `AuthShell`, `Marquee`, `Logo` and `SiteFooter`.
- **Home page:**
  - Poster hero with draggable stickers on a ruled, hole-punched page.
  - Skills ticker.
  - Sticky-note feature board.
  - Interactive NSQF staircase (`NsqfExplorer`).
  - "How it works" as a tickable to-do list.
  - Marigold call to action.
- **Illustrations:**
  - `components/illustrations.tsx` wraps every shape in an ink outline by default.
  - Shadows, text and translucent shapes opt out with `stroke="none"`.
  - Use theme colors only.
- **Motion:**
  - `InteractiveBackground`: ruled paper that turns into teal graph paper under the pointer.
  - `Parallax` (`parallax-1/2/3` layers).
  - `float*`, `march`, `draw`, `wiggle`, `marquee` and `spin-slow` animations.
  - All disabled under `prefers-reduced-motion`. Never compute random values or times during render (hydration mismatch; see `react-hooks/purity`).
- **Layout:**
  - The header collapses into a `Sheet` below `lg`; pages must not add their own sticky headers.
  - The content wrapper uses `overflow-x-clip`, so tilted and offset decorations can't cause sideways scroll.
  - Every page must fit 390px wide.
  - `roadmap-visualization` stacks its panels below `lg`.

## Conventions
- **Import alias:** `@/*` maps to the repo root.
- **UI primitives:** shadcn/ui ("new-york" style, lucide icons) in `components/ui/`. They were restyled for the notebook-brutalist look (see above).
- **Styling:** Tailwind CSS v4 via `@tailwindcss/postcss`; there is no `tailwind.config`.
  - `app/globals.css` is the live stylesheet. `styles/globals.css` is an unused leftover.
- **Async request APIs:** route `params`, `cookies()` and `headers()` are async (`const { id } = await params`).
