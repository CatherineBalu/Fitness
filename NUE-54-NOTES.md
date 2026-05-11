# NUE-54 — Foundation MR pre M3 refactor

Cieľom NUE-54 nebol nový feature, ale **nastaviť konvencie a infra** tak, aby
sa M3 dal robiť stránka po stránke bez toho, aby každý písal v inom štýle.
Veľa toho bolo pôvodne ad-hoc.

## Backend refactor

- Errors zjednotené do `lib/errors.ts` — 5 typov: `NotFoundError`,
  `DomainValidationError`, `PermissionError`, `UnauthorizedError`,
  `ConflictError`. `handleRoute(...)` wrapper preč, miesto neho globálny
  `.onError` v `index.ts` mapuje na HTTP status. Route handlery už nemusia
  robiť try/catch.
- Soft-delete enforced — každý SELECT filtruje `isNull(deletedAt)`, DELETE
  endpoint robí `UPDATE deletedAt = now()`. Helper `notDeleted(table)` v
  `lib/`.
- Drizzle schema: `tb_` prefix preč z JS exportov (`tbCustomer` →
  `customers`, atď.). DB názvy stĺpcov nezmenené.
- Route barrels (`routes/staff/index.ts`) zrušené, `.routes.ts` suffix
  odstránený.

## Frontend infra

- `lib/apiClient.ts` — fetch wrapper s Clerk auth tokenom, throw `ApiError`
  pri non-2xx. **Žiadny raw `fetch` v komponentoch / hookoch.**
- TanStack Query — `QueryClientProvider` v `main.tsx`, defaults
  `staleTime: 60_000, retry: 1, refetchOnWindowFocus: false`. `useQuery` pre
  čítanie, `useMutation` pre zápisy. Loading → shadcn `Skeleton`, error →
  `Alert variant="destructive"`, empty → `<EmptyState />`.
- Dark mode — `ThemeProvider` + `ThemeToggle` v Navbar, `darkMode: 'class'`
  v Tailwind, light/dark CSS tokeny v `index.css`. **Treba používať tokeny
  (`bg-background`, `text-foreground`, `bg-muted`...), nie hardcoded farby
  (`bg-white`, `text-black`).** Staré stránky zatiaľ hardcoded majú — to
  opravíme v M3.
- `@elysiajs/swagger` plugin → OpenAPI doc na `/swagger`.
- Path alias `@/` aj v backende.

## ESLint

- Vynucuje 5 pravidiel z CLAUDE.md: `consistent-type-imports`,
  `import-x/order`, `no-floating-promises`, `prefer-await-to-then`,
  `react/forbid-dom-props` (zakazuje `style={{}}`).
- Použili sme fork `eslint-plugin-import-x` — pôvodný `eslint-plugin-import`
  je rozbitý na ESLint 9/10.
- **Transitional override pre `pages/**` + `CustomerProfilePage.tsx`** — 3
  z týchto pravidiel sú tam vypnuté, lebo staré stránky používajú raw
  `fetch` + `.then()` + inline `style`. Marker `TODO(NUE-M3)`. M3 refactor
  migruje stránky a override sa zmaže (search `TODO(NUE-M3)` v eslint
  configu).

## CLAUDE.md ako zdroj pravdy

CLAUDE.md je teraz jediný zdroj pravdy pre konvencie (file naming, folder
structure, service layer, validácia v 3 vrstvách, async/errors,
Tailwind-only, atď.). Lint + Prettier + `prettier-plugin-tailwindcss` riešia
mechanickú časť. Architektúrne pravidlá (route ≤ 15 riadkov, no DB v
routes, soft-delete filtre, použitie apiClient) chytá code review.

## Status

- 114/114 BE testy zelené
- Lint + format + build na oboch stranách OK

## Čo treba rozhodnúť pred MR

1. **File-based routing migrácia (TanStack)** — máme zatiaľ `router.tsx`
   (code-based, 9 routes definovaných cez `createRoute(...)`). CLAUDE.md
   hovorí "migrating to file-based" — cieľ je `frontend/src/routes/__root.tsx`,
   `routes/admin/dashboard.tsx`, atď., plus `@tanstack/router-plugin` vo
   Vite. Page komponenty sa nemenia, len sa obalia v route súboroch.
   **Otázka pre tím: chceme to spraviť pred MR (jeden commit navyše), alebo
   to ide do M3?**

2. **Dark mode `system` option** — máme 3 možnosti (light/dark/system).
   Uvažujem, či ponechať len light/dark a `system` použiť ako default pred
   prvým klikom. **Odložené na M3** — patrí to k Navbar/layout polishu,
   ktorý sa stane v rámci refactoru. Spomenite, ak máte iný názor.

## Čo pri review MR pozerať

- Či sa nezmenila funkcionalita (testy + smoke test v prehliadači)
- Tokeny tém vs. hardcoded farby (ak narazíte v pages na nový kód —
  flagnite)
- Že nový kód mimo `pages/**` rešpektuje ESLint pravidlá bez disable
  komentárov
- CLAUDE.md či sedí s tým, čo skutočne robíme
