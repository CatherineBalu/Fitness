# List of API endpoints

### Auth

- POST `/auth/check-email` — check if email is already registered
- POST `/auth/register` — create a new customer account
- POST `/auth/login` — verify credentials and log in
- GET `/auth/me` — return current user (requires auth cookie)

### Schedule

- GET `/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD` — list scheduled lectures in a date range

### Staff (admin)

- GET `/api/staff` — list all employees with their `specializations: string[]` (Instructors + Reception)
- POST `/api/staff` — create new employee (body: `fullName`, `role`, `email`, `password`)
- PATCH `/api/staff/:id` — update first/last name (DB + Clerk); for Instructor also replaces specializations
- DELETE `/api/staff/:id` — remove employee and underlying person
- GET `/api/staff/:id/lectures` — all scheduled lectures this employee teaches

### Lectures (admin)

- GET `/api/lectures/:id/members` — customers registered on a given schedule instance

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

- GET `/api/stats/staff/me` — for current instructor: monthly count, attendees, avg fill rate, 6-month trend, most popular lecture. Reception/other roles get `{ available: false }`.
