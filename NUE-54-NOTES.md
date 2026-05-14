# NUE-54 — Foundation MR for the M3 refactor

The goal of NUE-54 was not a new feature, but to **set up the conventions and
infra** so that M3 can be done page by page without everyone writing in a
different style. A lot of it was originally ad-hoc.

## Backend refactor

- Errors unified into `lib/errors.ts` — 5 types: `NotFoundError`,
  `DomainValidationError`, `PermissionError`, `UnauthorizedError`,
  `ConflictError`. The `handleRoute(...)` wrapper is gone; instead a global
  `.onError` in `index.ts` maps to HTTP status codes. Route handlers no longer
  need try/catch.
- Soft-delete enforced — every SELECT filters `isNull(deletedAt)`, DELETE
  endpoints do `UPDATE deletedAt = now()`. Helper `notDeleted(table)` in `lib/`.
- Drizzle schema: `tb_` prefix dropped from JS exports (`tbCustomer` →
  `customers`, etc.). DB column names unchanged.
- Route barrels (`routes/staff/index.ts`) removed, `.routes.ts` suffix dropped.

## Frontend infra

- `lib/apiClient.ts` — fetch wrapper with a Clerk auth token, throws `ApiError`
  on non-2xx. **No raw `fetch` in components / hooks.**
- TanStack Query — `QueryClientProvider` in `main.tsx`, defaults
  `staleTime: 60_000, retry: 1, refetchOnWindowFocus: false`. `useQuery` for
  reads, `useMutation` for writes. Loading → shadcn `Skeleton`, error →
  `Alert variant="destructive"`, empty → `<EmptyState />`.
- Dark mode — `ThemeProvider` + `ThemeToggle` in the Navbar, `darkMode: 'class'`
  in Tailwind, light/dark CSS tokens in `index.css`. **Use the tokens
  (`bg-background`, `text-foreground`, `bg-muted`...), not hardcoded colors
  (`bg-white`, `text-black`).** The old pages still have hardcoded colors — that
  gets fixed in M3.
- `@elysiajs/swagger` plugin → OpenAPI doc at `/swagger`.
- Path alias `@/` in the backend too.

## File-based routing (TanStack)

- Migrated from code-based `router.tsx` to TanStack **file-based routing**.
  Route tree lives in `frontend/src/routes/` (`__root.tsx` + one file per URL
  segment, `kebab-case.tsx`), `@tanstack/router-plugin` is wired into Vite and
  generates `src/routeTree.gen.ts` (committed). `router.tsx` is deleted; the
  router instance is created in `main.tsx`.
- Route guards extracted to `lib/routeGuards.ts` (`requireAuth`,
  `requirePermission`), wired via `beforeLoad`. Page components are unchanged —
  only re-wired into route files.

## ESLint

- Enforces 5 rules from CLAUDE.md: `consistent-type-imports`, `import-x/order`,
  `no-floating-promises`, `prefer-await-to-then`, `react/forbid-dom-props`
  (forbids `style={{}}`).
- We use the `eslint-plugin-import-x` fork — the original
  `eslint-plugin-import` is broken on ESLint 9/10.
- **Transitional override for `pages/**` + `CustomerProfilePage.tsx`** — 3 of
  these rules are disabled there, because the old pages use raw `fetch` +
  `.then()` + inline `style`. Marked with `TODO(NUE-M3)`. The M3 refactor
  migrates the pages and the override gets deleted (search `TODO(NUE-M3)` in the
  eslint config).

## CLAUDE.md as the source of truth

CLAUDE.md is now the single source of truth for conventions (file naming,
folder structure, service layer, 3-layer validation, async/errors,
Tailwind-only, etc.). Lint + Prettier + `prettier-plugin-tailwindcss` handle the
mechanical part. Architectural rules (route ≤ 15 lines, no DB in routes,
soft-delete filters, use of apiClient) are caught in code review.

## Status

- 114/114 BE tests green
- Lint + format + build OK on both sides

## What to decide before MR

1. **Dark mode `system` option** — we have 3 options (light/dark/system). I'm
   considering keeping only light/dark and using `system` as the default before
   the first click. **Deferred to M3** — it belongs with the Navbar/layout
   polish that happens as part of the refactor. Speak up if you disagree.

(File-based routing was an open question here — it's now resolved and done in
NUE-54, see the section above.)

## What to look at when reviewing the MR

- Whether functionality changed (tests + smoke test in the browser)
- Theme tokens vs. hardcoded colors (if you hit new code in `pages/` — flag it)
- That new code outside `pages/**` respects the ESLint rules without disable
  comments
- Whether CLAUDE.md matches what we actually do

---

## Diff vs. the report from the lecturer

A section outside the NUE-54 scope: comparing the points from the report with
what we are actually submitting. The goal is for the team to know what is done,
what is **intentionally** deferred to M3, and what we **haven't addressed at
all** and need to decide on.

### Done in NUE-54

- Convention setup (`CLAUDE.md` as the single source of truth)
- Update of `CLAUDE.md`
- ESLint rules (5 rules, see above)
- Data fetching infra — `apiClient` + TanStack Query (async/await, no raw
  `fetch` in new code)
- File-based routing migration (TanStack) + route guards in `lib/routeGuards.ts`
- Service layer (Janko)
- DB: `tb_` prefix dropped, `id/createdAt/updatedAt/deletedAt` on every table
  (Janko)
- Route decomposition (Janko)
- Inline `style={{}}` forbidden by an ESLint rule (`react/forbid-dom-props`)

### Infra done, old pages not yet — deferred to M3

Everything below is covered by the transitional override in
`frontend/eslint.config.js` (`TODO(NUE-M3)`). The override gets deleted when the
M3 refactor migrates the page.

- **Tailwind vs CSS mess** — 9 `.css` files still exist (`App.css`,
  `CustomerProfilePage.css`, `SchedulePage.css`, `CheckoutPage.css`,
  `stats.css`, 4× admin)
- **Inline `style={{}}`** in 7 files (`CheckoutPage`, `AdminCalendarPage`,
  `MyProfilePage`, `HomePage`, `SchedulePage`, `AddScheduleDialog`,
  `AdminDashboardPage`)
- **Raw `fetch()`** in `HomePage`, `AddScheduleDialog`, `AdminCalendarPage`,
  `CheckoutPage`
- **`useEffect` for data fetching** including `StaffStatisticsPage` (the
  lecturer mentioned it by name)
- **Large files without decomposition** — `AdminCalendarPage.tsx` 1038 lines,
  `AdminStaffPage.tsx` 866 lines, `SchedulePage.tsx` 586 lines,
  `CheckoutPage.tsx` 545 lines
- **Mix of shadcn / non-shadcn** primitives
- **Naming conventions** — e.g. `CustomerProfilePage.tsx` lives in
  `components/` instead of `pages/`

### Not addressed at all — needs a decision

1. **Kubb** — TS client generator from OpenAPI. We have `@elysiajs/swagger` at
   `/swagger`, so the OpenAPI doc already exists. Proposal: **defer to M3/M4**,
   because today it would generate against a changing Elysia schema and we'd
   gain little (the apiClient is written by hand, ~80 lines). It will make sense
   once the BE stops changing the shape of responses.
2. **Monorepository (npm/bun workspaces, shared FE↔BE)** — currently
   `frontend/` and `backend/` are two standalone packages (one npm, one bun),
   with no workspaces and no `shared/` folder. Candidates for sharing:
   validation Zod schemas, error type names, the permission enum (today it lives
   only in the FE `frontend/src/lib/permissions.ts`, the BE only has strings).
   Proposal: **defer past M3** — first we want to stabilize the conventions
   page-by-page, then extract `shared/`. If we want it still in M3, then as a
   separate ticket before the page refactor.
