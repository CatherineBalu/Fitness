# NUE-54 Refactor Notes — Failing Tests After Refactor

## 1 failing test after route → service layer refactor

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
