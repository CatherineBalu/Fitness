# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fitness gym management web application (course project pb138). Supports multiple user roles (Admin, Staff, Customer) with lecture scheduling, membership management, attendance tracking, and booking.

**Authors:** Filip Kolař, Katarina Balušeskulová, Ján Breja, Štefan Murín

## Architecture

**Monorepo** with two independent packages:

- `frontend/` — React 19 SPA (TypeScript + Vite), package manager: **npm**
- `backend/` — REST API (TypeScript + Elysia framework on Bun runtime), package manager: **bun**

The frontend communicates with the backend via HTTP. The backend runs on port 3000.

### Key Tech

| Layer | Stack |
|-------|-------|
| Frontend | React 19, TypeScript, Vite, Vitest |
| Backend | Bun runtime, Elysia framework |
| Linting | ESLint + typescript-eslint (both) |
| Formatting | Prettier (both; frontend: 80 chars, backend: 100 chars) |
| CI | GitLab CI (`.gitlab-ci.yml`), stages: `lint_and_format` → `test` |

## Commands

### Backend (`cd backend`)

```bash
bun run dev          # Start dev server (hot reload) on http://localhost:3001
bun test             # Run all tests
bun test <file>      # Run a single test file
bun run lint         # ESLint
bun run format:check # Prettier check
bun run format:write # Prettier auto-fix
```

### Frontend (`cd frontend`)

```bash
npm run dev          # Start Vite dev server (HMR)
npm run build        # TypeScript check + production build
npm run preview      # Preview production build locally
npm run test         # Run Vitest unit tests
npm run test -- <file> # Run a single test file
npm run lint         # ESLint
npm run format:check # Prettier check
npm run format:write # Prettier auto-fix
```

## Code Structure

- `backend/src/index.ts` — Elysia server entry point
- `backend/tests/` — Bun test files
- `frontend/src/main.tsx` — React root render
- `frontend/src/App.tsx` — Main App component
- `frontend/tests/` — Vitest test files
- `Diagrams/SotfwareReqSpecf.md` — Full requirements spec (25 use cases, 10 NFRs)
- `Diagrams/UseCaseDiagram.puml` — PlantUML use case diagram

## Frontend UI — shadcn/UI Strategy

The frontend uses **shadcn/ui** for all interactive, data-driven UI. It is already fully configured (`components.json`, Radix UI, Tailwind CSS, `lucide-react` are all installed).

- Add components with: `npx shadcn add <component>`
- The current `App.tsx` landing page uses custom CSS — that's fine to keep as-is
- For anything behind login (dashboard, calendar, booking, forms), **use shadcn components** rather than building from scratch

The app's core feature is a **lecture registration calendar**. Key components by feature:

| Feature | Components |
|---|---|
| Calendar / lecture registration | `Calendar`, `Dialog` |
| Schedule / lecture list | `Table`, `Card` |
| Auth forms | `Form`, `Input`, `Label`, `Button` |
| Role-based navigation | `NavigationMenu`, `DropdownMenu`, `Avatar` |
| Notifications | `Toast`, `Alert` |
| Filters / date pickers | `Popover`, `Select` |
| Membership management | `Badge`, `Tabs` |

## Git Conventions

### Branch Naming

Format: `xlogin/EPIC-ID`

Examples: `xkolar8/NUE-21`, `jbreja/NUE-14`

Use the `/branch` slash command to create branches interactively — it will ask for your xlogin and Jira epic and run the git command for you.

### Commit Messages

Format: `EPIC-ID: <type>: <short description>`

Where `EPIC-ID` comes from the current branch name (e.g. `NUE-21`), and `<type>` is one of:

| Type | When to use |
|------|-------------|
| `add` | New feature or file |
| `fix` | Bug fix |
| `chore` | Maintenance, config, deps |
| `refactor` | Code restructure, no behaviour change |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `style` | Formatting, CSS changes |

Examples:
```
NUE-21: add: login button component
NUE-14: fix: calendar not rendering on mobile
NUE-7: chore: update dependencies
```

Always derive the epic prefix from the current branch name — never hardcode it.

### Pre-commit Checks

Before every commit, run ESLint and Prettier check on the affected package(s):

- **Frontend:** `npm run lint` and `npm run format:check` (from `frontend/`)
- **Backend:** `bun run lint` and `bun run format:check` (from `backend/`)

If issues are found, ask the user for permission before auto-fixing with `format:write`. Do not commit if lint errors remain unfixed. Use the `/commit` skill to handle this automatically.

## TypeScript

Both packages use `"strict": true`. Backend tsconfig targets Bun types (`@types/bun`).

## CI Pipeline

Both packages run lint, format check, and tests automatically. Ensure `bun run lint`, `bun run format:check`, and `bun test` all pass before pushing backend changes; same for frontend with `npm run`.
