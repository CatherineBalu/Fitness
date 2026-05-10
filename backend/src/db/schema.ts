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

export const tbEmployeeType = pgTable('employee_type', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleName: text('role_name').notNull().unique(),
  ...timestamps,
});

export const tbSubscription = pgTable('subscription', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  price: numeric('price').notNull(),
  durationDays: integer('duration_days').notNull(),
  ...timestamps,
});

export const tbExerciseType = pgTable('exercise_type', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  ...timestamps,
});

export const tbRoom = pgTable('room', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  capacity: integer('capacity').notNull(),
  ...timestamps,
});

// --- USERS ---

export const tbPerson = pgTable('person', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  name: text('name').notNull(),
  surname: text('surname').notNull(),
  email: text('email').notNull().unique(),
  phoneNumber: text('phone_number'),
  ...timestamps,
});

export const tbEmployee = pgTable('employee', {
  id: uuid('id').primaryKey().defaultRandom(),
  personId: uuid('person_id')
    .notNull()
    .references(() => tbPerson.id),
  employeeTypeId: uuid('employee_type_id')
    .notNull()
    .references(() => tbEmployeeType.id),
  hireDate: date('hire_date').notNull(),
  ...timestamps,
});

export const tbEmployeeSpecialization = pgTable(
  'employee_specialization',
  {
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => tbEmployee.id),
    exerciseTypeId: uuid('exercise_type_id')
      .notNull()
      .references(() => tbExerciseType.id),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.employeeId, t.exerciseTypeId] })],
);

export const tbCustomer = pgTable('customer', {
  id: uuid('id').primaryKey().defaultRandom(),
  personId: uuid('person_id')
    .notNull()
    .references(() => tbPerson.id),
  subscriptionId: uuid('subscription_id').references(() => tbSubscription.id),
  subscriptionValidUntil: date('subscription_valid_until'),
  ...timestamps,
});

// --- LECTURES AND SCHEDULE ---

export const tbLecture = pgTable('lecture', {
  id: uuid('id').primaryKey().defaultRandom(),
  exerciseTypeId: uuid('exercise_type_id')
    .notNull()
    .references(() => tbExerciseType.id),
  lectureName: text('lecture_name').notNull(),
  description: text('description').notNull(),
  forMembers: boolean('for_members').default(false).notNull(),
  ...timestamps,
});

export const tbSchedule = pgTable('schedule', {
  id: uuid('id').primaryKey().defaultRandom(),
  lectureId: uuid('lecture_id')
    .notNull()
    .references(() => tbLecture.id),
  roomId: uuid('room_id')
    .notNull()
    .references(() => tbRoom.id),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  forMembers: boolean('for_members').default(false).notNull(),
  ...timestamps,
});

export const tbScheduleInstructor = pgTable(
  'schedule_instructor',
  {
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => tbSchedule.id),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => tbEmployee.id),
    isLead: boolean('is_lead').default(false).notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.scheduleId, t.employeeId] })],
);

// --- RESERVATION AND PAYMENT HISTORY ---

export const tbCustomerReservation = pgTable('customer_reservation', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => tbCustomer.id),
  scheduleId: uuid('schedule_id')
    .notNull()
    .references(() => tbSchedule.id),
  attended: boolean('attended').default(false).notNull(),
  reservationDate: timestamp('reservation_date', { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
});

export const tbPaymentHistory = pgTable('payment_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => tbCustomer.id),
  subscriptionId: uuid('subscription_id')
    .notNull()
    .references(() => tbSubscription.id),
  amount: numeric('amount').notNull(),
  paymentDate: timestamp('payment_date', { withTimezone: true }).defaultNow().notNull(),
  paymentMethod: text('payment_method').notNull(),
  ...timestamps,
});
