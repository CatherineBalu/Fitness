# CLAUDE.md

Fitness gym management web app (course project pb138). Roles: Admin, Staff, Customer. Lecture scheduling, membership, attendance, booking.

**Monorepo:** `frontend/` (React 19 + TypeScript + Vite, **npm**) ↔ `backend/` (Elysia on Bun, **bun**). Backend on `:3001`. DB: Postgres via Drizzle. Auth: Clerk session tokens; backend RBAC via `requirePermission(...)` middleware, permission enum in `frontend/src/lib/permissions.ts`. UI: Tailwind + shadcn/ui.

For commands, deps, env vars, CI config — read `package.json`, `.env.example`, `.gitlab-ci.yml`. Don't duplicate them here.

## Code Structure

- `backend/src/index.ts` — Elysia entry, mounts routes
- `frontend/src/main.tsx` — React root
- `frontend/src/router.tsx` — routes (migrating to file-based, see Conventions)

## Conventions

### File Naming

| Kind | Convention | Example |
|---|---|---|
| React component | `PascalCase.tsx` | `WeekGrid.tsx` |
| React hook | `useCamelCase.ts` | `useCalendarData.ts` |
| Util / helper | `camelCase.ts` | `apiClient.ts` |
| Backend service | `camelCase.service.ts` | `staff.service.ts` |
| Backend route | `camelCase.ts` (in `routes/`) | `staff.ts` |
| Types-only file | `camelCase.types.ts` | `staff.types.ts` |
| Test | `<file>.test.ts(x)` | `WeekGrid.test.tsx` |
| TanStack route file | `kebab-case.tsx` (matches URL) | `my-profile.tsx` |
| shadcn/ui | `kebab-case.tsx` (generated, do not edit) | `alert-dialog.tsx` |

File name matches default export. No `.css` files.

### Folder Structure — Frontend

- `routes/` — TanStack file-based routing
- `pages/` — page logic. Per-page folder (`HomePage/{HomePage.tsx, components/, hooks/}`) when page has sub-components or page-only hooks. Single file otherwise.
- `components/ui/` — shadcn (do not edit)
- `components/layout/` — Navbar, Footer
- `components/common/` — shared custom components
- `hooks/`, `lib/`, `layouts/` — shared

A component or hook used by 2+ pages moves out of the page folder to `components/common/` or `hooks/`.

### Folder Structure — Backend

- `routes/` — thin Elysia handlers, delegate to services
- `services/` — business logic + DB queries
- `db/` — schema, drizzle client, seeds
- `middleware/` — Clerk auth + RBAC guards
- `lib/` — validators, errors, helpers

### Service Layer

**Route handler:**
- Parses request; validates body/params/query via Zod schema (schema lives in the route file)
- Runs auth via `beforeHandle` middleware
- Calls one service function with validated input
- Returns the result; **no try/catch** (errors bubble to global `.onError`)
- Target: ≤ 15 lines per handler

**Service** (exported as object: `export const staffService = { list, getById, create }`):
- Drizzle queries, business rules, transactions
- Trusts input (already validated by route — type comes from `z.infer<typeof schema>`)
- Throws domain errors from `lib/errors.ts` (`NotFoundError`, `DomainValidationError`)
- **No HTTP knowledge** (no `set.status`, no Elysia types, no req/res)

Domain errors are caught in the global Elysia `.onError` in `index.ts` and mapped to HTTP status codes.

**No direct DB access from routes** — even trivial selects go through services. Only exception: health-check endpoints with no DB call.

### Validation — three independent layers, all required

1. **Frontend (UX):** `react-hook-form` + `zodResolver` in form components. Immediate user feedback. Never sufficient alone.
2. **Backend HTTP (security):** Zod schema bound to the Elysia route's `body`/`query`/`params`. Rejects malformed requests with 422 before the service runs. Lives in the route file.
3. **Service (business rules):** Domain-level checks (e.g. "lecture cannot start in the past", "user already has this plan"). Throws `DomainValidationError`. Lives in the service.

Service does **not** re-run Zod on already-validated input. Type safety from `z.infer` guarantees the shape.

### Database (Drizzle + Postgres)

- Schema in `backend/src/db/schema.ts`. **No `tb_` prefix** on table names (renamed in NUE-54).
- **Every table has** `id, createdAt, updatedAt, deletedAt`. Use the shared `timestamps` helper from `db/schema.ts` (don't redefine per-table).
- **Soft-delete everywhere.** All SELECT queries filter `isNull(table.deletedAt)` (or use the `notDeleted(table)` helper). DELETE endpoints → `UPDATE deletedAt = now()`, never physical delete.
- All DB access through service layer — no direct `db.select(...)` from routes.
- Schema change → run `bunx drizzle-kit push` then re-seed (see Definition of Done).

### Routing

TanStack file-based routing in `frontend/src/routes/`. Code-based `router.tsx` is being removed in NUE-54 (one-shot migration). File names are `kebab-case.tsx` and match the URL segment; dynamic params use `$param.tsx`; `__root.tsx` holds the root layout. Route guards (auth, permission) live in `lib/routeGuards.ts` and are wired via `beforeLoad`.

### TanStack Query

- Page-only hooks live in the page folder; shared hooks in `frontend/src/hooks/`.
- Query key factory per domain: `staffKeys = { all, lists(), list(filters), details(), detail(id) }`.
- `useQuery` for reads, `useMutation` for writes. Every mutation invalidates relevant keys in `onSuccess` and toasts via `sonner`.
- All HTTP goes through `apiClient` in `lib/apiClient.ts` — never raw `fetch` in components or hooks. `apiClient` injects the Clerk auth token and throws `ApiError` on non-2xx.
- Loading → shadcn `Skeleton`. Error → shadcn `Alert variant="destructive"`. Empty → `<EmptyState />` in `components/common/`.
- No optimistic updates by default.

`QueryClient` defaults: `staleTime: 60_000`, `retry: 1`, `refetchOnWindowFocus: false`.

### Imports

- Path alias `@/` → `src/` in both packages (configured in `tsconfig.json`).
- Cross-folder import → `@/...`. Same folder or immediate child/parent → relative (`./Foo`, `./hooks/useFoo`).
- Always `import type` for type-only imports (enforced via `@typescript-eslint/consistent-type-imports`).
- No barrel `index.ts` re-exports — import from the source file. (Exception: shadcn `components/ui/` keeps its existing per-file imports.)
- React components: `export default`. Services / hooks / utils / types / constants: named exports.
- Import order auto-sorted by ESLint (`import/order`): external → `@/` → relative → type, separated by blank lines.

### Async + errors

- `async/await` only — no `.then()` chains (ESLint: `promise/prefer-await-to-then`).
- No floating promises (ESLint: `@typescript-eslint/no-floating-promises`). Use `void` for intentional fire-and-forget.
- `try/catch` only at boundaries: Elysia `.onError` (BE), TanStack Query `onError` callbacks (FE), React Error Boundary (FE crashes). Internal code lets errors bubble.
- Backend: throw domain errors from `lib/errors.ts` (`NotFoundError`, `DomainValidationError`, `PermissionError`); global `.onError` maps to HTTP status codes.
- Frontend: never wrap API calls in `try/catch` inside event handlers — use `useMutation` with `onError` for toasts.
- Independent requests → `Promise.all`. Sequential `await` only when the second depends on the first.
- Use `useMutation`'s `isPending` to disable buttons during requests; do not manage your own loading state.

### Tests

- **Backend:** in `backend/tests/<routes|services>/<file>.test.ts`. Integration tests against real Postgres (never mock the DB — mock/prod divergence is exactly the bug we're avoiding). Mock external services (Stripe, email) and Clerk auth.
- **Frontend unit / component / hook tests:** **co-located** next to source as `<File>.test.ts(x)`. Mock API by `vi.mock('@/lib/apiClient')`.
- **E2E (Playwright):** in `tests-e2e/` at repo root, suffix `.spec.ts`. Cover critical user paths only (login, booking, checkout). Don't e2e-test rendering details.
- Use `test` (not `it`). One top-level `describe` per module/component.
- For TanStack Query in tests, wrap subjects in `QueryClientProvider` with a fresh `QueryClient({ defaultOptions: { queries: { retry: false } } })`.

## Frontend UI — Tailwind + shadcn/ui

- **Tailwind only.** No `.css` files except `index.css` (theme tokens). No inline `style={{...}}` (ESLint: `react/forbid-dom-props`).
- Use `cn()` from `@/lib/utils` for conditional / merged / forwarded classes. Static class strings stay plain.
- Class order auto-sorted by `prettier-plugin-tailwindcss`.
- shadcn for interactive primitives. Custom shared components live in `components/common/`, never `components/ui/`.
- Add shadcn: `npx shadcn add <component>`. After: `npm install` and delete `bun.lock` if it appeared.
- For variant components use `class-variance-authority` (`cva`) — same pattern as shadcn primitives.
- Custom wrapper components accept `className?: string` and forward it via `cn()`.
- Mobile-first: no prefix = mobile, `md:` / `lg:` for larger.
- Avoid arbitrary values (`w-[372px]`); add a token to `tailwind.config.ts` if used repeatedly.

### Theming + dark mode

- **Use theme tokens, never hardcoded colors.** ✅ `bg-background text-foreground border-border bg-muted text-muted-foreground bg-primary bg-card`. ❌ `bg-white bg-gray-200 text-black border-gray-300` — these break dark mode.
- Tokens are CSS variables in `frontend/src/index.css`: `:root` for light, `.dark` for dark.
- Tailwind: `darkMode: 'class'`, toggled by class on `<html>`.
- `ThemeProvider` (in `components/common/`) manages `light` / `dark` / `system`, syncs to `localStorage`, applies the class.
- `ThemeToggle` lives in the Navbar (`components/layout/`). Three options: light / dark / system.

## Git

Use `/branch` and `/commit` skills.

- Branch: `xlogin/EPIC-ID` (e.g. `xkolar8/NUE-21`)
- Commit: `EPIC-ID: <type>: <desc>` where type ∈ `add | fix | chore | refactor | test | docs | style`. Derive `EPIC-ID` from the current branch name.

## Definition of Done

- **Backend route added/changed:** 1 happy-path test + 1 error-path test (401/403/validation). Update `/ApiEndpoints.md` in the same commit.
- **DB schema change:** update `backend/src/db/seed.ts` and run `bunx drizzle-kit push` before re-seeding. `seed.ts` swallows errors silently if the schema is out of sync.
- **Frontend feature:** smoke-test the golden path in the browser; document steps in the PR description.
- **All local checks green before commit:** lint, format, tests, typecheck.

## Logging

- **Backend errors:** `console.error('[domain] message', context)` — bracketed domain (`[auth]`, `[stats]`, `[seed]`) for grep.
- **Backend startup:** `console.log` ok; never inside request handlers.
- **Frontend:** no `console.*` in committed code except unrecoverable `console.error`. User-visible feedback via `sonner` toasts (wired in `RootLayout`).
