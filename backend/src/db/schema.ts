import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  timestamp,
  date,
  boolean,
  primaryKey,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

// --- NUMERALS AND TYPES ---

export const employeeTypes = pgTable('employee_type', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleName: text('role_name').notNull().unique(),
  ...timestamps,
});

export const subscriptions = pgTable('subscription', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  price: numeric('price').notNull(),
  durationDays: integer('duration_days').notNull(),
  ...timestamps,
});

export const entryPackages = pgTable('entry_package', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  entryCount: integer('entry_count').notNull(),
  price: numeric('price').notNull(),
  ...timestamps,
});

export const exerciseTypes = pgTable('exercise_type', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  ...timestamps,
});

export const rooms = pgTable('room', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  capacity: integer('capacity').notNull(),
  ...timestamps,
});

// --- USERS ---

export const persons = pgTable('person', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  name: text('name').notNull(),
  surname: text('surname').notNull(),
  email: text('email').notNull().unique(),
  phoneNumber: text('phone_number'),
  ...timestamps,
});

export const employees = pgTable('employee', {
  id: uuid('id').primaryKey().defaultRandom(),
  personId: uuid('person_id')
    .notNull()
    .references(() => persons.id),
  employeeTypeId: uuid('employee_type_id')
    .notNull()
    .references(() => employeeTypes.id),
  hireDate: date('hire_date').notNull(),
  ...timestamps,
});

export const employeeSpecializations = pgTable(
  'employee_specialization',
  {
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),
    exerciseTypeId: uuid('exercise_type_id')
      .notNull()
      .references(() => exerciseTypes.id),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.employeeId, t.exerciseTypeId] })],
);

export const customers = pgTable('customer', {
  id: uuid('id').primaryKey().defaultRandom(),
  personId: uuid('person_id')
    .notNull()
    .references(() => persons.id),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  subscriptionValidUntil: date('subscription_valid_until'),
  entryBalance: integer('entry_balance').notNull().default(0),
  ...timestamps,
});

// --- LECTURES AND SCHEDULE ---

export const lectures = pgTable('lecture', {
  id: uuid('id').primaryKey().defaultRandom(),
  exerciseTypeId: uuid('exercise_type_id')
    .notNull()
    .references(() => exerciseTypes.id),
  lectureName: text('lecture_name').notNull(),
  description: text('description').notNull(),
  forMembers: boolean('for_members').default(false).notNull(),
  ...timestamps,
});

export const schedules = pgTable('schedule', {
  id: uuid('id').primaryKey().defaultRandom(),
  lectureId: uuid('lecture_id')
    .notNull()
    .references(() => lectures.id),
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.id),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  forMembers: boolean('for_members').default(false).notNull(),
  ...timestamps,
});

export const scheduleInstructors = pgTable(
  'schedule_instructor',
  {
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => schedules.id),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),
    isLead: boolean('is_lead').default(false).notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.scheduleId, t.employeeId] })],
);

// --- RESERVATION AND PAYMENT HISTORY ---

export const customerReservations = pgTable('customer_reservation', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  scheduleId: uuid('schedule_id')
    .notNull()
    .references(() => schedules.id),
  attended: boolean('attended').default(false).notNull(),
  reservationDate: timestamp('reservation_date', { withTimezone: true }).defaultNow().notNull(),
  reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
  ...timestamps,
});

export const paymentHistory = pgTable('payment_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  entryPackageId: uuid('entry_package_id').references(() => entryPackages.id),
  amount: numeric('amount').notNull(),
  paymentDate: timestamp('payment_date', { withTimezone: true }).defaultNow().notNull(),
  paymentMethod: text('payment_method').notNull(),
  ...timestamps,
});

export const qrTokens = pgTable('qr_token', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  // 'entry' consumes a credit on scan; 'membership' is a once-per-day access pass.
  kind: text('kind').notNull().default('entry'),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  ...timestamps,
});

export const entryLogs = pgTable('entry_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  staffId: uuid('staff_id')
    .notNull()
    .references(() => persons.id),
  qrTokenId: uuid('qr_token_id')
    .notNull()
    .references(() => qrTokens.id),
  scannedAt: timestamp('scanned_at', { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
});

// One row per purchased batch of entries. Source of truth for the entry balance;
// each batch expires independently, so we track remaining count + expiry per batch.
// customers.entryBalance is a denormalized cache of the live (non-expired) sum.
export const entryCredits = pgTable('entry_credit', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  entryPackageId: uuid('entry_package_id').references(() => entryPackages.id),
  remainingCount: integer('remaining_count').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ...timestamps,
});
