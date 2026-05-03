# Finalization Plan

Roadmap for bringing the project from "working skeleton" to "final submission". The DB hosting milestone is the **dividing point**: some work can (and should) start immediately in parallel, other work must wait for hosting to exist.

Generated 2026-04-24 based on a repo audit. Re-check items against current state before executing — some may already be done by the time you read this.

## Current state (snapshot)

- Architecture: monorepo, React 19 + TS + Vite FE, Bun + Elysia BE, Drizzle + PostgreSQL, Clerk auth, shadcn/ui, TanStack Router.
- Features present: admin dashboard/calendar/staff/stats, customer schedule, staff statistics, role-based routing, Clerk auth wired on FE + BE with metadata roles.
- Tests: BE has 4 (`auth`, `reservations`, `stats`, sample). FE has only `sampleTest.test.ts`.
- CI: GitLab CI with lint + format + test stages.
- Assessment: solid mid-stage working skeleton, ~1–2 weeks of focused polish remaining for a 4-person team.

## The DB hosting boundary

Why DB hosting is the dividing point:
- Some tasks depend on a real remote DB URL, SSL, and a real deployment target (migrations, prod env vars, SSL in `Pool`).
- Many other tasks are **entirely independent** of where the DB runs — waiting on them compresses all polish into the last week before deadline, which is risky.

**Strategy: don't block on DB. Work the independent tracks in parallel now, switch DB-dependent tasks on the moment hosting is ready, keep final polish for the last week.**

---

## Track A — Before DB hosting (start now, in parallel)

These can all be worked concurrently by different team members. None of them depends on remote DB existing.

### A1. Documentation & onboarding (quick wins, ~half day total)

- [ ] **Expand `README.md`** — currently only project name + authors. Add:
  - Local setup steps (FE, BE, DB via `docker-compose`)
  - Required env vars (both packages)
  - How to run tests, lint, format
  - Tech stack summary
  - Link to `ApiEndpoints.md`, `Diagrams/SotfwareReqSpecf.md`, `CLAUDE.md`
- [ ] **Add `backend/.env.example`** — placeholders for `DATABASE_URL`, `CLERK_SECRET_KEY`, `FRONTEND_URL`. Do NOT commit real values.
- [ ] **Add `frontend/.env.example`** — placeholders for any `VITE_*` vars (Clerk publishable key etc.). Audit what frontend reads from env.
- [ ] **Audit `ApiEndpoints.md`** — 44 lines as of audit. Cross-check every route in `backend/src/routes/` is listed with request/response shape.
- [ ] **Fix port mismatch** — `backend/src/index.ts` listens on `3001`, `CLAUDE.md` says 3000. Decide on one, update the other (port 3001 is what actually runs).

### A2. Backend quality (centralised refactors, ~1 day)

- [ ] **Central `onError` handler in `backend/src/index.ts`** — normalize all errors to `{ error: { code, message } }`. Removes inconsistent response shapes across routes.
- [ ] **Validation pass on BE routes** — add `t.Object` body/query schemas to every POST/PATCH route in `auth.ts`, `schedule.ts`, `staff.ts`, `stats.ts`. Currently only `schedule.ts` (query) and 2 routes in `staff.ts` have it. Rest returns 500 on bad input instead of 400.
- [ ] **Wrap `staff.ts` DELETE/PATCH in `db.transaction`** — reviewer flagged this (see memory). Fix on a separate branch, not in devel directly.

### A3. Frontend quality & UX (biggest track, ~2–4 days)

- [ ] **Decide on form library** — `react-hook-form` + `zod` + shadcn `Form` component, OR stay with `useState`. **Decide early, before writing more forms.** Switching later is expensive.
- [ ] **Add a React error boundary** — wrap `RootLayout` or router outlet so one component crash doesn't white-screen the whole app.
- [ ] **Loading / empty / error states audit** — go through every fetch in the app:
  - What renders while loading? (skeleton, spinner)
  - What renders on empty list? (empty state with CTA, not blank)
  - What renders on fetch error? (error message + retry button, not broken UI)
- [ ] **Forms UX polish** —
  - Inline field-level error messages (not just toast)
  - Disabled submit button during pending request
  - Success toast via `sonner` on mutation
  - Confirm modals on destructive actions (delete staff, delete lecture)
- [ ] **Staff public/staff view toggle** — add to `RootLayout` mirroring the admin toggle (tracked in memory, agreed 2026-04-21).
- [ ] **Add FE tests** — at least 2–3 component/integration tests for main flows (schedule view, role-based navigation, one form). Currently only `sampleTest.test.ts`.

### A4. Replace mock data & finalise milestone work (ongoing)

- [ ] **Replace mock data on `AdminDashboardPage.tsx`** with real API once calendar BE is ready (M3, tracked in memory).
- [ ] **Wire handlers on `AdminCalendarPage.tsx`** after calendar BE lands.
- [ ] **Complete NUE-50 merge** — MR already created + pipeline green, awaiting merge.

### A5. Backend polish ideas (if time permits, not blocking)

- [ ] **Clerk webhooks endpoint** — handle `user.deleted` / `user.updated` to sync DB. Currently users are created lazily on first request (NUE-50) but deletions leave orphan rows.
- [ ] **Rate limiting** on app endpoints (Elysia plugin).
- [ ] **Strict CORS whitelist** review (already reads `FRONTEND_URL`, just verify no wildcard fallback reaches prod).

---

## Track B — DB hosting transition (execute the moment hosting exists)

These are the tasks that literally can't be done until a real hosted Postgres URL exists. Batch them into one focused session once hosting is ready — typically half a day of work.

- [ ] **Convert `backend/drizzle.config.json` → `drizzle.config.ts`** reading `process.env.DATABASE_URL`. Currently hardcoded to `localhost:5432`. Without this fix, `drizzle-kit push` always targets local DB regardless of env.
- [ ] **Add SSL to `Pool` in `backend/src/db/db.ts`** — most hosted Postgres (Neon, Supabase, Railway, RDS) requires SSL. Either add `ssl: { rejectUnauthorized: false }` for prod, or rely on `?sslmode=require` in the URL.
- [ ] **Switch migration workflow from `push` to `generate` + `migrate`** — dev uses `bunx drizzle-kit push`, which is fine locally. For prod, generate SQL migrations (`drizzle-kit generate`), commit them, and apply via `drizzle-kit migrate` on deploy. **Do this before real data lands in hosted DB, not after.**
- [ ] **Guard `seed.ts` against prod** — add a check that refuses to run if `NODE_ENV === 'production'` or if `DATABASE_URL` doesn't match a dev pattern. Currently nothing stops someone from accidentally wiping prod data.
- [ ] **Set production env vars in hosting dashboard** — `DATABASE_URL` (prod), `CLERK_SECRET_KEY` (prod key, not dev), `FRONTEND_URL` (real domain — wrong value silently breaks CORS).
- [ ] **Backend Dockerfile** — if the chosen host expects one (most Bun-friendly hosts do). Current `docker-compose.yml` covers only local DB.
- [ ] **Production build smoke test** — run `npm run build` + `npm run preview` in FE end-to-end, and confirm backend has a real production start script (not just `dev` with hot reload).

---

## Track C — Final polish sprint (last week before submission)

Do this only after Tracks A and B are largely done. Not a place for new features or refactors — this is the "walk through the whole app once like a user and a reviewer would" pass.

- [ ] **Manual smoke test** of every user flow (customer booking, staff attendance, admin creates lecture, admin manages staff, stats) — document in `/Diagrams/SotfwareReqSpecf.md` use-case-by-use-case.
- [ ] **Evaluator walkthrough rehearsal** — clone the repo into a clean directory, follow README from scratch, confirm it runs. If it doesn't, README is wrong.
- [ ] **Update `ApiEndpoints.md`** one last time for any changes from Track A/B.
- [ ] **Final CI run green** on both FE and BE (lint + format + test + build).
- [ ] **Clean up branches** — delete merged feature branches; leave only `main`, `devel` (or whatever prod branch), and in-flight work.

---

## What is explicitly NOT in this plan

These are tracked in memory as "future work ideas" but should not be attempted before submission unless a team member has extra time:

- Fitness-specific features: check-in flow, cancellation policy enforcement, waiver/health disclaimer, GDPR right-to-delete, staff invitation flow.
- Security enterprise features: 2FA required for admin, audit log table, device management.
- Membership status layer as a first-class business domain.

Revisit after submission if the project continues.

---

## How to use this document

- **Planning meetings:** open this file, decide which items a team member owns for the next sprint.
- **Individual work:** check off items as they merge to devel. Don't delete, just check — it preserves the audit trail.
- **Before starting a ticket:** re-read the relevant section to avoid duplicating work someone else did.
- **Before merging to main:** verify Track C items are green.
