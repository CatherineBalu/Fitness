# List of API endpoints

### Auth

- POST `/auth/check-email` — check if email is already registered
- POST `/auth/register` — create a new customer account
- POST `/auth/login` — verify credentials and log in
- GET `/auth/me` — return current user (requires auth cookie)

### Schedule

- GET `/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD` — list scheduled lectures in a date range

### Staff (admin)

- GET `/api/staff` — list all employees (Instructors + Reception)
- POST `/api/staff` — create new employee (body: `fullName`, `role`, `email`, `password`)
- DELETE `/api/staff/:id` — remove employee and underlying person
- GET `/api/staff/:id/lectures` — all scheduled lectures this employee teaches

### Lectures (admin)

- GET `/api/lectures/:id/members` — customers registered on a given schedule instance
