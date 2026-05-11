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

---

## Diff voči reportu od cvičiaceho

Sekcia mimo NUE-54 scope-u: porovnanie bodov z reportu s tým, čo
reálne odovzdávame. Cieľom je, aby tím vedel, čo je hotové, čo je
**zámerne** odložené do M3, a čo sme **vôbec neadresovali** a treba
o tom rozhodnúť.

### Hotové v NUE-54

- Setup konvencií (`CLAUDE.md` ako single source of truth)
- Update `CLAUDE.md`
- ESLint pravidlá (5 pravidiel, viď vyššie)
- Data fetching infra — `apiClient` + TanStack Query (async/await,
  bez raw `fetch` v novom kóde)
- Service layer (Janko)
- DB: `tb_` prefix preč, `id/createdAt/updatedAt/deletedAt` na
  každej tabuľke (Janko)
- Route dekompozícia (Janko)
- Inline `style={{}}` zakázané ESLint pravidlom (`react/forbid-dom-props`)

### Infra hotová, staré stránky zatiaľ nie — odložené na M3

Všetko nižšie pokrýva transitional override v `frontend/eslint.config.js`
(`TODO(NUE-M3)`). Override sa zmaže keď M3 refactor migruje stránku.

- **Tailwind vs CSS mašuje** — 9 `.css` súborov stále existuje
  (`App.css`, `CustomerProfilePage.css`, `SchedulePage.css`,
  `CheckoutPage.css`, `stats.css`, 4× admin)
- **Inline `style={{}}`** v 7 súboroch (`CheckoutPage`,
  `AdminCalendarPage`, `MyProfilePage`, `HomePage`, `SchedulePage`,
  `AddScheduleDialog`, `AdminDashboardPage`)
- **Raw `fetch()`** v `HomePage`, `AddScheduleDialog`,
  `AdminCalendarPage`, `CheckoutPage`
- **`useEffect` na data fetching** vrátane `StaffStatisticsPage`
  (cvičiaci ho spomenul menom)
- **Veľké súbory bez dekompozície** — `AdminCalendarPage.tsx`
  1038 r., `AdminStaffPage.tsx` 866 r., `SchedulePage.tsx` 586 r.,
  `CheckoutPage.tsx` 545 r.
- **Mašup shadcn / non-shadcn** primitív
- **Naming notations** — napr. `CustomerProfilePage.tsx` žije v
  `components/` namiesto `pages/`

### Vôbec neadresované — treba rozhodnúť

1. **Kubb** — generátor TS klienta z OpenAPI. Máme
   `@elysiajs/swagger` na `/swagger`, takže OpenAPI doc už existuje.
   Návrh: **odložiť na M3/M4**, lebo dnes by sa generovalo proti
   meniacej sa Elysia schéme a získali by sme málo (apiClient máme
   napísaný ručne, je to ~80 riadkov). Zmysel to bude dávať keď
   BE prestane meniť tvar response-ov.
2. **Monorepository (npm/bun workspaces, shared FE↔BE)** —
   aktuálne sú `frontend/` a `backend/` dva samostatné balíky
   (jeden npm, druhý bun), bez workspaces, bez `shared/` priečinka.
   Kandidáti na zdieľanie: validation Zod schemas, error type
   names, permission enum (dnes žije len v FE
   `frontend/src/lib/permissions.ts`, BE má len stringy).
   Návrh: **odložiť za M3** — najprv chceme stabilizovať konvencie
   page-by-page, potom extrahovať `shared/`. Ak chceme ešte
   v M3, tak ako samostatný ticket pred page refactorom.
3. **File-based routing (TanStack)** — viď otvorenú otázku vyššie.
