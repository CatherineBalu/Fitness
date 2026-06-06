# List of API endpoints

### Auth

- POST `/auth/check-email` — check if email is already registered
- POST `/auth/register` — create a new customer account
- POST `/auth/login` — verify credentials and log in
- GET `/auth/me` — return current Clerk user (requires auth cookie)
- GET `/auth/profile` — return detailed profile of the current user (Person + Customer data)

### Schedule

#### Public / Customers (Requires Auth)
- GET `/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD` — list scheduled lectures in a date range (returns `isRegistered` status for current user)
- POST `/schedule/:id/reservations` — register current user for a lecture (requires `reservation:write`)
- DELETE `/schedule/:id/reservations` — cancel current user's reservation

#### Admin / Reception
- GET `/schedule/lectures` — list all lecture templates
- GET `/schedule/rooms` — list all rooms with capacity
- GET `/schedule/instructors` — list all employees available as instructors
- POST `/schedule` — create a new scheduled lecture (body: `{ lectureId, roomId, startTime, endTime, instructors: [{ employeeId, isLead }] }`)
- PATCH `/schedule/:id` — update room or time for a specific instance (body: `{ roomId?, startTime?, endTime? }` time format "HH:MM")
- GET `/schedule/:id/members` — list all members registered for a schedule (includes `attended` status)
- POST `/schedule/:id/members` — manually add a member by email (body: `{ email }`)
- DELETE `/schedule/:id/members/:personId` — remove a member from a lecture
- PATCH `/schedule/:id/attendance` — bulk update attendance status for members (body: `{ attendanceRecords: [{ personId, attended }] }`)
- GET `/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD` — list scheduled lectures in a date range
- POST `/schedule/:id/reservations` — register the current customer for a lecture (requires auth + `reservation:write` permission)
- DELETE `/schedule/:id/reservations` — cancel the current customer's reservation for a lecture

### Subscriptions

- GET `/subscriptions` — public list of subscription plans (cheapest first)
- POST `/subscriptions/buy` — authenticated customer purchases a plan, starting today (body: `{ subscriptionId, paymentMethod? }`)

### Entry packages

- GET `/entry-packages` — public list of entry packages sorted by price (e.g. Single Entry, 10-Entry Bundle)
- POST `/entry-packages/buy` — authenticated customer purchases an entry package; adds a credit batch (valid 180 days from purchase) and returns the recomputed live balance (body: `{ entryPackageId, paymentMethod? }`); returns `201 { success: true, entryBalance: N }`

### Entry (QR access)

Entries are tracked per purchased batch in `entry_credit` (each batch has its own `expiresAt`, valid 180 days from purchase). The live balance is the sum of non-expired batches; `customers.entryBalance` is a denormalized cache. Scans consume FIFO (soonest-expiring batch first).

- POST `/entry/token` — authenticated customer generates a short-lived QR token (5-minute TTL); requires a live (non-expired) balance > 0; returns `{ token, expiresAt }`
- POST `/entry/scan` — staff scans a QR token; requires `entry:scan` permission; atomically decrements the soonest-expiring credit batch (FIFO); logs the scan; returns `{ customerName, remainingBalance }` (body: `{ token }`)

### Customer (requires auth)

- GET `/api/customer/me` — current customer's profile and active membership details
- DELETE `/api/customer/membership` — cancel current customer's active membership
- GET `/api/customer/registrations` — all reservations (upcoming + past) with lecture name, time, room, and schedule ID
- GET `/api/customer/spending` — full payment history and total amount spent
- GET `/api/customer/entries` — live entry balance, active credit batches (`credits: [{ remainingCount, expiresAt }]`, soonest-expiring first), and last 20 entry log entries (with staff name and scan timestamp)

### Staff (admin)

- GET `/api/staff` — list all employees with their `specializations: string[]` (Instructors + Reception)
- POST `/api/staff` — create new employee; body: `{ firstName, lastName, email, role, specializations?: string[] }`; generates a temporary password, sends it to the employee via email; returns `201 { success: true }`
- PATCH `/api/staff/:id` — update first/last name (DB + Clerk); for Instructor also replaces specializations
- DELETE `/api/staff/:id` — remove employee and underlying person
- GET `/api/staff/:id/lectures` — all scheduled lectures this employee teaches

### Exercise types

- GET `/api/exercise-types` — list all exercise types (used for staff filter chips and specializations)

### Employee types

- GET `/api/employee-types` — list all employee roles (used for Add staff role dropdown)

### Stats (admin)

- GET `/api/stats/admin/overview` — KPI cards: active memberships, revenue this month, reservations this month, avg occupancy %
- GET `/api/stats/admin/revenue-monthly?months=12` — monthly revenue series for the last N months (1–36, default 12)
- GET `/api/stats/admin/revenue-by-subscription` — total revenue and payment count per subscription type
- GET `/api/stats/admin/top-lectures?limit=10` — lectures ranked by total reservations (1–50, default 10)
- GET `/api/stats/admin/occupancy` — per-lecture avg reservations, capacity, and occupancy %

### Stats (staff)

- GET `/api/stats/staff/me` — for current instructor: monthly count, attendees, avg fill rate, popular lecture. Reception/other roles get `{ available: false }`.