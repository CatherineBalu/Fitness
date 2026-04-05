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
bun run dev          # Start dev server (hot reload) on http://localhost:3000
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

## TypeScript

Both packages use `"strict": true`. Backend tsconfig targets Bun types (`@types/bun`).

## CI Pipeline

Both packages run lint, format check, and tests automatically. Ensure `bun run lint`, `bun run format:check`, and `bun test` all pass before pushing backend changes; same for frontend with `npm run`.
