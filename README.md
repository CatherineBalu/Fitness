# FitnessXY

Fitness gym management web application built as the **PB138 course project**

FitnessXY lets a gym manage its members, lecture schedule, and on-site entries while letting customers browse classes, register, pay, and check in via QR code.

- **Repository**: <https://gitlab.fi.muni.cz/xkolar8/pb138-project>
- **Live deployment**: <https://fitnessxy.vercel.app/>

## Features

- Three roles with separate permissions: **Customer**, **Employee**, **Admin**
- **Lecture schedule** with categories, member-only classes
- **Reservations**: customers register / cancel from the schedule; manual member-add at reception
- **Memberships & entry packages** purchase flow with billing history
- **QR-based entry**: customers generate a short-lived QR token, staff scan it in-app to deduct credit
- **Attendance tracking** per lecture
- **Statistics dashboards**: revenue, occupancy, popular lectures (admin); personal teaching load (employee); personal statistics (customer)
- **Employee administration**: admin creates / edits / removes staff members, assigns specializations, sends temp passwords by email
- **Light / dark mode** with theme tokens

## Tech stack

**Frontend**

- React 19, TypeScript, Vite
- TanStack Router (file-based) + TanStack Query
- Tailwind CSS + shadcn/ui (Radix)
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
├── frontend/        React 19 + Vite app (pnpm)
├── backend/         Elysia + Bun API (bun)
├── tests-e2e/       Playwright end-to-end tests
├── Diagrams/        Software specs and PlantUML diagrams
├── ApiEndpoints.md  HTTP API reference
└── docker-compose.yml  Local Postgres container
```

For a deeper architectural overview (services / routes layering, soft-delete pattern, file naming conventions) see **`CLAUDE.md`** at the repo root.

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

## Database

- Schema in `backend/src/db/schema.ts`. Every table uses the shared `timestamps` helper (`id`, `createdAt`, `updatedAt`, `deletedAt`).
- Soft-delete is enforced everywhere — services filter `notDeleted(table)` and DELETE endpoints set `deletedAt = now()`.
- Apply schema changes with `bunx drizzle-kit push` from `backend/`.
- Seed local data with `bun run src/db/seed.ts` (wipes and re-creates).


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
