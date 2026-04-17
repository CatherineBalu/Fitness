# Schema change proposal — trainer specializations

## Problem

Currently `tb_employee_type` only has two generic values: `Instructor` and `Reception`. This makes it impossible to filter staff by the type of lecture they teach (Yoga / Pilates / Spinning / …). Additionally, `Pilates` and `Spinning` are missing from `tb_exercise_type` — the seeded "Spin Class" is currently just a lecture name under the `Cardio` type.

## Proposed changes

### 1. Expand `tb_exercise_type`

Add two more entries to the seed:

- `Pilates`
- `Spinning`

Final list: `Yoga`, `Power`, `Cardio`, `Jumping fitness`, `Pilates`, `Spinning`.

### 2. New table — `tb_employee_specialization`

A many-to-many join between employees and exercise types. Only instructors get rows here; receptionists have none.

| Column                | Type | Notes                                   |
|-----------------------|------|-----------------------------------------|
| `ID_employee_fk`      | UUID | FK → `tb_employee.id`                   |
| `ID_exercise_type_fk` | UUID | FK → `tb_exercise_type.id`              |

Primary key: composite `(ID_employee_fk, ID_exercise_type_fk)`.

### 3. Keep `tb_employee_type` as is

Values stay `Instructor` / `Reception`. A future `Admin` role can be added here later.

### 4. Seed updates

Assign specializations to existing seeded trainers (example assignment based on current seed structure):

- Sarah Miller → `Yoga`
- Mike Johnson → `Power`
- Jana Novak → `Cardio`, `Spinning`
- Lucia Fernandez → `Jumping fitness`
- Tom Kral → `Power`, `Pilates` (multi-specialization example)

Receptionist remains without specializations.

## Why this model

- **Multi-specialization** — a trainer who teaches both Yoga and Pilates is realistic. A single `specialization_id` column on `tb_employee` would block that.
- **Exercise type stays single source of truth** — the same values that categorize lectures also categorize trainers, so the admin UI filter is consistent with the schedule filter.
- **Reception is cleanly separated** — no NULLs, no "not applicable" special values.

## Impact on application code

These backend changes follow the schema work (not part of DB team scope, listed here for shared context):

- `GET /api/staff` — response adds `specializations: string[]`
- `POST /api/staff` — body adds optional `specializations: string[]` (required for Instructor, ignored for Reception)
- New `GET /api/employee-types` — role dropdown source
- New `GET /api/exercise-types` — specializations/filter source

Frontend (`AdminStaffPage`) will:

- Render filter chips from exercise types + `Reception`
- Show per-specialization badges on each staff row
- Use a `Select` for role and multi-select for specializations in the Add dialog

## Migration steps (for whoever owns the DB)

```bash
cd backend
# 1. After tb_employee_specialization is added to schema.ts:
bunx drizzle-kit generate
# 2. Apply the migration:
bunx drizzle-kit migrate
# 3. Reseed with new exercise types + specializations:
bun run src/db/seed.ts
```
