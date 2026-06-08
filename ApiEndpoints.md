# List of API endpoints

### Auth

- POST `/auth/check-email` — check if email is already registered
- POST `/auth/register` — create a new customer account
- POST `/auth/login` — verify credentials and log in
- GET `/auth/me` — return current Clerk user (requires auth cookie)
- GET `/auth/profile` — return detailed profile of the current user (Person + Customer data)

### Schedule

#### Public / Customers (Requires Auth)
- GET `/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD` — list scheduled lectures in a date range (returns `isRegistered` status for current user). Each instructor entry includes `{ name, isLead, phoneNumber, email }` (email pulled from Clerk).
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

### Customer (requires auth)

- GET `/api/customer/me` — current customer's profile and active membership details
- DELETE `/api/customer/membership` — cancel current customer's active membership
- GET `/api/customer/registrations` — all reservations (upcoming + past) with lecture name, time, room, schedule ID, and `instructors: { name, phoneNumber, email, isLead }[]` (email pulled from Clerk)
- GET `/api/customer/spending` — full payment history and total amount spent

### Instructors (public)

- GET `/api/instructors` — public list of all instructors for the marketing carousel; returns `{ id, firstName, lastName, phoneNumber, email, specializations: string[] }[]`. No auth required. Email is fetched per-request from Clerk.

### Staff (admin)

- GET `/api/staff` — list all employees with their `phoneNumber` and `specializations: string[]` (Instructors + Reception)
- POST `/api/staff` — create new employee; body: `{ firstName, lastName, email, phoneNumber, role, specializations?: string[] }` (phoneNumber required); generates a temporary password, sends it to the employee via email; returns `201 { success: true }`
- PATCH `/api/staff/:id` — update first/last name and phone number (DB + Clerk name); body: `{ firstName, lastName, phoneNumber, specializations?: string[] }`; for Instructor also replaces specializations
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