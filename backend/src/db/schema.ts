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

// --- NUMERALS AND TYPES ---

export const tbEmployeeType = pgTable('TB_employee_type', {
  id: uuid('ID_employee_type').primaryKey().defaultRandom(),
  roleName: text('role_name').notNull().unique(),
});

export const tbSubscription = pgTable('TB_subscription', {
  id: uuid('ID_subscription').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  price: numeric('price').notNull(),
  durationDays: integer('duration_days').notNull(),
});

export const tbExerciseType = pgTable('TB_exercise_type', {
  id: uuid('ID_exercise_type').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
});

export const tbRoom = pgTable('TB_room', {
  id: uuid('ID_room').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  capacity: integer('capacity').notNull(),
});

// --- USERS ---

export const tbPerson = pgTable('TB_person', {
  id: uuid('ID_person').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(), // Managed by Clerk
  name: text('name').notNull(),
  surname: text('surname').notNull(),
  email: text('email').notNull().unique(),
  phoneNumber: text('phone_number'), // Optional now, often handled by Clerk depending on setup
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tbEmployee = pgTable('TB_employee', {
  id: uuid('ID_employee').primaryKey().defaultRandom(),
  personId: uuid('ID_person_fk')
    .notNull()
    .references(() => tbPerson.id),
  employeeTypeId: uuid('ID_employee_type_fk')
    .notNull()
    .references(() => tbEmployeeType.id),
  hireDate: date('hire_date').notNull(),
});

export const tbEmployeeSpecialization = pgTable(
  'TB_employee_specialization',
  {
    employeeId: uuid('ID_employee_fk')
      .notNull()
      .references(() => tbEmployee.id),
    exerciseTypeId: uuid('ID_exercise_type_fk')
      .notNull()
      .references(() => tbExerciseType.id),
  },
  (t) => [primaryKey({ columns: [t.employeeId, t.exerciseTypeId] })],
);

export const tbCustomer = pgTable('TB_customer', {
  id: uuid('ID_customer').primaryKey().defaultRandom(),
  personId: uuid('ID_person_fk')
    .notNull()
    .references(() => tbPerson.id),
  subscriptionId: uuid('ID_subscription_fk').references(() => tbSubscription.id),
  subscriptionValidUntil: date('subscription_valid_until'),
});

// --- LECTURES AND SCHEDULE ---

export const tbLecture = pgTable('TB_lecture', {
  id: uuid('ID_lecture').primaryKey().defaultRandom(),
  exerciseTypeId: uuid('ID_exercise_type_fk')
    .notNull()
    .references(() => tbExerciseType.id),
  lectureName: text('lecture_name').notNull(),
  description: text('description').notNull(),
  forMembers: boolean('for_members').default(false).notNull(), // Added membership requirement
});

export const tbSchedule = pgTable('TB_schedule', {
  id: uuid('ID_schedule').primaryKey().defaultRandom(),
  lectureId: uuid('ID_lecture_fk')
    .notNull()
    .references(() => tbLecture.id),
  roomId: uuid('ID_room_fk')
    .notNull()
    .references(() => tbRoom.id),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  forMembers: boolean('for_members').default(false).notNull(), // Added membership requirement
});

export const tbScheduleInstructor = pgTable(
  'TB_schedule_instructor',
  {
    scheduleId: uuid('ID_schedule_fk')
      .notNull()
      .references(() => tbSchedule.id),
    employeeId: uuid('ID_employee_fk')
      .notNull()
      .references(() => tbEmployee.id),
    isLead: boolean('is_lead').default(false).notNull(),
  },
  (t) => [primaryKey({ columns: [t.scheduleId, t.employeeId] })],
);

// --- RESERVATION AND PAYMENT HISTORY ---

export const tbCustomerReservation = pgTable(
  'customer_reservation',
  {
    customerId: uuid('customer_id')
      .notNull()
      .references(() => tbCustomer.id),
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => tbSchedule.id),
    attended: boolean('attended').default(false).notNull(), // Attendance column
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.customerId, table.scheduleId] }),
    };
  },
);

export const tbPaymentHistory = pgTable('TB_payment_history', {
  id: uuid('ID_payment').primaryKey().defaultRandom(),
  customerId: uuid('ID_customer_fk')
    .notNull()
    .references(() => tbCustomer.id),
  subscriptionId: uuid('ID_subscription_fk')
    .notNull()
    .references(() => tbSubscription.id),
  amount: numeric('amount').notNull(),
  paymentDate: timestamp('payment_date', { withTimezone: true }).defaultNow().notNull(),
  paymentMethod: text('payment_method').notNull(),
});
