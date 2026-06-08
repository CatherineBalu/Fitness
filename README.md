# FitnessXY

Fitness gym management web application built as the **PB138 course project**, academic year **2025/2026, podzimní semester** (Faculty of Informatics, Masaryk University).

FitnessXY lets a gym manage its members, lecture schedule, and on-site entries while letting customers browse classes, register, pay, and check in via QR code.

- **Repository**: <https://gitlab.fi.muni.cz/xkolar8/pb138-project>
- **Live frontend**: <https://pb138-frontend.vercel.app>
- **Live backend**: <https://pb138-production.up.railway.app>

## Features

- Three roles with separate permissions: **Customer**, **Staff (instructor / reception)**, **Admin**
- Weekly **lecture schedule** with categories, member-only classes, and instructor cards
- **Reservations**: customers register / cancel from the schedule; manual member-add at reception
- **Memberships & entry packages**: subscription plans and prepaid entry credits, purchase flow with billing history
- **QR-based on-site entry**: customers generate a short-lived QR token, staff scan it in-app to deduct credit / record an attendance
- **Attendance tracking** per lecture
- **Statistics dashboards**: revenue, occupancy, popular lectures (admin); personal teaching load (instructor)
- **Staff administration**: admin creates / edits / removes staff members, assigns specializations, sends temp passwords by email
- **Light / dark mode** with theme tokens
- **Public marketing site** with hero, pricing, and instructor carousel

## Tech stack

**Frontend**

- React 19, TypeScript, Vite
- TanStack Router (file-based) + TanStack Query
- Tailwind CSS + shadcn/ui (Radix), `class-variance-authority`
- Clerk for auth, sonner for toasts, recharts for charts, react-hook-form + Zod
- html5-qrcode (scan) + react-qr-code (display)
- Vitest for component / hook tests

**Backend**

- Bun runtime + Elysia HTTP framework
- Drizzle ORM + PostgreSQL
- Clerk Backend SDK for identity, Nodemailer for transactional email
- Zod schemas on every route boundary
- Bun's built-in test runner for unit + integration tests

**Tooling**

- Playwright for end-to-end tests (repo root)
- Docker Compose for local Postgres
- GitLab CI for lint, format check, and tests

## Roles

| Role                                | Where it comes from                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| **Customer**                        | Created automatically on first Clerk sign-up (JIT provisioning)                   |
| **Staff** (instructor or reception) | Created by an admin in-app or set via `role: "employee"` in Clerk public metadata |
| **Admin**                           | Set via `role: "admin"` in Clerk public metadata                                  |

After changing a role in Clerk the user must sign out and back in for the change to take effect.

## Project structure

```
.
├── frontend/        React 19 + Vite app (npm)
├── backend/         Elysia + Bun API (bun)
├── tests-e2e/       Playwright end-to-end tests
├── Diagrams/        Software specs and PlantUML diagrams
├── ApiEndpoints.md  HTTP API reference
└── docker-compose.yml  Local Postgres container
```

For a deeper architectural overview (services / routes layering, soft-delete pattern, file naming conventions) see **`CLAUDE.md`** at the repo root.

The HTTP API surface is documented in **`ApiEndpoints.md`**.

## Prerequisites

- **Bun** ≥ 1.3 (backend runtime + package manager for `backend/`)
- **Node.js** ≥ 20 (frontend toolchain + package manager for `frontend/`)
- **Docker** + Docker Compose (local Postgres)
- A **Clerk** application (free tier is fine) — used for authentication
- A Gmail account with an **app password** if you want to send emails locally

## Local setup

```bash
# 1. Clone
git clone https://gitlab.fi.muni.cz/xkolar8/pb138-project.git
cd pb138-project

# 2. Start Postgres
docker compose up -d

# 3. Backend env + install + schema + seed
cp backend/.env.example backend/.env       # fill CLERK_SECRET_KEY, optionally GMAIL_*
cd backend
bun install
bunx drizzle-kit push                      # create tables in the local DB
bun run src/db/seed.ts                     # seed demo data
bun run dev                                # http://localhost:3001

# 4. Frontend env + install + dev server (in a second terminal)
cp frontend/.env.example frontend/.env     # fill VITE_CLERK_PUBLISHABLE_KEY
cd frontend
npm install
npm run dev                                # http://localhost:5173
```

Open <http://localhost:5173>. Sign up to create a customer account, or use the demo credentials below.

## Environment variables

Copy each `.env.example` to `.env` and fill in the values.

### `backend/.env`

| Variable                           | Purpose                                                               |
| ---------------------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`                     | Postgres connection string                                            |
| `CLERK_SECRET_KEY`                 | Clerk backend secret                                                  |
| `FRONTEND_URL`                     | Origin allowed by CORS                                                |
| `SEED_TEST_CLERK_ID`               | Optional override for the seeded E2E test customer                    |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | SMTP credentials for transactional email                              |
| `GYM_TIMEZONE`                     | IANA TZ used for daily entry boundaries (defaults to `Europe/Prague`) |

### `frontend/.env`

| Variable                     | Purpose                                                   |
| ---------------------------- | --------------------------------------------------------- |
| `VITE_API_URL`               | Base URL of the backend (`http://localhost:3001` locally) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key                                     |

### `.env` (repo root, for E2E)

| Variable            | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| `E2E_TEST_EMAIL`    | Email of the seeded customer Playwright signs in as |
| `E2E_TEST_PASSWORD` | Its password                                        |

## Available scripts

### `frontend/`

| Script                                  | What it does                                         |
| --------------------------------------- | ---------------------------------------------------- |
| `npm run dev`                           | Vite dev server at <http://localhost:5173>           |
| `npm run build`                         | Type-check (`tsc -b`) and produce a production build |
| `npm run preview`                       | Preview the built bundle                             |
| `npm run lint`                          | ESLint                                               |
| `npm run format:check` / `format:write` | Prettier                                             |
| `npm test`                              | Vitest                                               |

### `backend/`

| Script                                  | What it does                                     |
| --------------------------------------- | ------------------------------------------------ |
| `bun run dev`                           | Elysia with `--watch` on <http://localhost:3001> |
| `bun test`                              | Run Bun test suite (`NODE_ENV=test`)             |
| `bun run lint`                          | ESLint                                           |
| `bun run format:check` / `format:write` | Prettier                                         |

### Repo root (E2E)

| Script                    | What it does                      |
| ------------------------- | --------------------------------- |
| `npm run test:e2e`        | Run all Playwright specs          |
| `npm run test:e2e:ui`     | Run Playwright with the UI runner |
| `npm run test:e2e:report` | Open the last HTML report         |

## Database

- Schema in `backend/src/db/schema.ts`. Every table uses the shared `timestamps` helper (`id`, `createdAt`, `updatedAt`, `deletedAt`).
- Soft-delete is enforced everywhere — services filter `notDeleted(table)` and DELETE endpoints set `deletedAt = now()`.
- Apply schema changes with `bunx drizzle-kit push` from `backend/`.
- Seed local data with `bun run src/db/seed.ts` (wipes and re-creates).

## Testing

| Layer                      | Tool       | Where                   |
| -------------------------- | ---------- | ----------------------- |
| Backend unit + integration | `bun test` | `backend/tests/`        |
| Frontend component / hook  | Vitest     | co-located `*.test.tsx` |
| End-to-end                 | Playwright | `tests-e2e/`            |

Backend integration tests run against a **real Postgres** (no DB mocks).

## Deployment

| Component | Provider                       | Trigger                                                      |
| --------- | ------------------------------ | ------------------------------------------------------------ |
| Frontend  | **Vercel**                     | Auto-deploy on push (`vercel --prod` for manual)             |
| Backend   | **Railway**                    | `cd backend && railway up` (no auto-deploy from GitLab)      |
| Database  | **Neon** (serverless Postgres) | Schema push: `DATABASE_URL=<neon-url> bunx drizzle-kit push` |

## CI/CD

GitLab CI (`.gitlab-ci.yml`) runs **lint + format check + tests** on every merge request and every push to `devel` or `main`. Frontend jobs use `node:20-alpine`; backend jobs use `oven/bun:latest`.

## Demo account

A pre-seeded customer is available on the live frontend for evaluation:

| Field    | Value                          |
| -------- | ------------------------------ |
| Name     | Johann Theodard                |
| Email    | `theodard.fitnessxy@gmail.com` |
| Password | `pb138goat`                    |

To explore the Staff or Admin surface, ask a project author for a role-bump in the Clerk dashboard.

## Authors

- Filip Kolař (xkolar8, 550419)
- Katarína Balušeskulová (xbaluse1, 550261)
- Ján Breja (xbreja, 564227)
- Štefan Murín (xmurin3, 564267)
