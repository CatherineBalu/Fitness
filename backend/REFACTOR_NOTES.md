# NUE-54 Refactor Notes

Documents the refactoring done on branch `xbreja/NUE-54`: what changed and why.

---

## Database (`src/db/schema.ts`)

- Tables renamed to drop the `TB_` prefix (e.g. `TB_employee_type` → `employee_type`).
- Columns renamed to drop the `ID_` prefix and `_fk` suffix (e.g. `ID_person_fk` → `person_id`).
- Every table now has `created_at`, `updated_at`, `deleted_at` (soft-delete).

---

## Routes — Service Layer Extraction

### What changed

Routes used to mix three responsibilities: HTTP plumbing (status codes, body parsing), business rules (membership checks, capacity limits), and raw DB queries. The refactor splits them.

**New layer: `src/services/`**

| File                      | Responsibility                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `errors.ts`               | Typed errors (`HttpError`, `NotFoundError`, `ConflictError`, `BadRequestError`, `ForbiddenError`, `UnauthorizedError`, `ValidationError`) + `handleRoute()` helper that maps thrown errors to HTTP responses |
| `customer.service.ts`     | Customer lookups (`findCustomerByClerkId`, `findCustomerByEmail`, `findCustomerByPersonId`), profile, registrations, spending, membership cancel                                                             |
| `subscription.service.ts` | `listSubscriptions`, `buySubscription`, **`isMembershipActive`** (single source of truth)                                                                                                                    |
| `auth.service.ts`         | `getProfile`                                                                                                                                                                                                 |
| `schedule.service.ts`     | `listSchedules`, `createReservation`, `cancelReservation`                                                                                                                                                    |
| `calendar.service.ts`     | Lecture/room/instructor lists, schedule CRUD, member management, attendance                                                                                                                                  |
| `staff.service.ts`        | Employee CRUD (with Clerk integration), specializations, lectures, exercise/employee types                                                                                                                   |
| `stats.service.ts`        | Admin overview, revenue, top lectures, occupancy, instructor stats                                                                                                                                           |

**Routes are now thin.** Each handler does only:

1. Extract `auth` / `params` / `body` / `query`.
2. Call the relevant service inside `handleRoute(set, ...)`.
3. Set `201` if it's a creation; otherwise `handleRoute` handles status from thrown errors.

### Why

#### 1. Duplicate "get customer by clerk ID" in 4 files

The same query was written four different ways:

- `routes/schedule.ts` had a local helper.
- `routes/auth.ts` did it inline.
- `routes/customer.ts` repeated the same query **3×** in one file.
- `routes/subscriptions.ts` duplicated it again.

Now: one function (`findCustomerByClerkId` / `getCustomerByClerkIdOrThrow`) used by every consumer. A schema change (like the `TB_` rename we just did) only touches one place.

#### 2. `isMembershipActive` had four diverging implementations

`schedule.ts`, `auth.ts`, `customer.ts`, `subscriptions.ts` each had their own copy — one used `Date` comparison, another used string comparison. Three different behaviors for the same business rule. Now it lives in `subscription.service.ts` and everyone calls the same function.

#### 3. Route handlers were too long and untestable

`routes/schedule.ts` POST `/schedule/:id/reservations` was 70 lines mixing HTTP validation, four DB lookups, and four business checks (existence, time window, members-only, capacity). It can't be unit-tested without booting Elysia.

After the refactor, `createReservation(clerkId, scheduleId)` in `schedule.service.ts` is a plain async function — it can be tested by calling it directly.

#### 4. Inconsistent error handling

Some handlers wrapped DB calls in `try/catch` and returned `{ error: ... }`; others let exceptions bubble. Status codes were set inline (`set.status = 404`) at every error point.

Services now `throw` typed errors. `handleRoute()` is the single place that maps them to HTTP responses:

```ts
NotFoundError    → 404
ConflictError    → 409
ForbiddenError   → 403
BadRequestError  → 400
UnauthorizedError→ 401
ValidationError  → 422 with field-level errors
unknown error    → 500 + log to console
```

#### 5. `staff.ts` was a 374-line file with 6 unrelated exports

It exported `staffRoutes`, `staffWriteRoutes`, `staffDeleteRoutes`, `lectureRoutes`, `exerciseTypeRoutes`, `employeeTypeRoutes` — six separately-mounted Elysia apps in one file. Same for `stats.ts` (admin + staff stats together).

Now:

```
routes/staff/
  index.ts                  ← re-exports
  staff.routes.ts           ← read/write/delete employees
  lecture.routes.ts
  exercise-type.routes.ts
  employee-type.routes.ts

routes/stats/
  index.ts
  admin.routes.ts
  staff.routes.ts
```

The barrel `index.ts` files preserve the existing imports in `src/index.ts`, so the wiring didn't have to change.

---

## Failing test after refactor

### `tests/subscriptions.test.ts`

**Test:** `POST /subscriptions/buy — logic > succeeds (201) with a valid-until date when all preconditions pass`

**Why it fails:** The refactor wraps the payment insert + customer subscription update in a `db.transaction(...)` for atomicity. Original code did the two writes separately.

The test's DB mock (`tests/subscriptions.test.ts:44-50`) only mocks `select`, `insert`, `update`. It does NOT mock `transaction`, so `db.transaction is not a function` at runtime in the test environment.

**The production code is correct** — atomic insert+update is the right behavior (otherwise an insert could succeed while the update fails, leaving an orphaned payment record).

**Fix options:**

1. Update the test mock to support `transaction(fn)` — call `fn` with the same chainable mock object.
2. Revert the transaction in `subscription.service.ts:buySubscription` (NOT recommended — loses atomicity).

Recommended: option 1.

---

## Pre-existing TS errors in tests (unrelated to refactor)

- `tests/customer.test.ts:58` — `Promise<{ sub, publicMetadata }>` not assignable to `Promise<never>` (mock typing issue).
- `tests/subscriptions.test.ts:61` — same.

These existed before the refactor and are independent of route/service split.

---

## Known issue: real Clerk users are not linked to seed staff

Endpoints like `/api/staff/me/lectures` return **404** when an authenticated admin/employee hits them. Reason: `seed.ts` inserts staff rows with placeholder `clerkId` values (`seed_instructor_1`, `seed_instructor_2`, ...). Real Clerk users have their own `clerkId`, so the lookup `employee → person where clerk_id = <real id>` finds nothing.

This is **not refactor-related** — same behaviour on Docker postgres or future Neon hosting. Will reproduce until one of the following is in place:

1. **Admin UI to assign roles** — promote an existing customer to staff/instructor from the app.
2. **Env-driven seed** — e.g. `SEED_ADMIN_EMAIL`, seed then upgrades the matching person to employee.
3. **Manual SQL** for now:
   ```sql
   INSERT INTO employee (person_id, employee_type_id, hire_date)
   SELECT p.id, et.id, CURRENT_DATE
   FROM person p, employee_type et
   WHERE p.email = '<your-email>' AND et.role_name = 'Instructor';
   ```

Pick the approach when this is prioritised; out of scope for NUE-54.
