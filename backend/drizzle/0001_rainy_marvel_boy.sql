CREATE TABLE "TB_customer" (
	"ID_customer" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ID_person_fk" uuid NOT NULL,
	"ID_subscription_fk" uuid,
	"subscription_valid_until" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TB_customer_reservation" (
	"ID_reservation" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ID_customer_fk" uuid NOT NULL,
	"ID_schedule_fk" uuid NOT NULL,
	"reservation_date" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TB_employee" (
	"ID_employee" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ID_person_fk" uuid NOT NULL,
	"ID_employee_type_fk" uuid NOT NULL,
	"hire_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TB_employee_type" (
	"ID_employee_type" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_name" text NOT NULL,
	CONSTRAINT "TB_employee_type_role_name_unique" UNIQUE("role_name")
);
--> statement-breakpoint
CREATE TABLE "TB_exercise_type" (
	"ID_exercise_type" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "TB_exercise_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "TB_lecture" (
	"ID_lecture" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ID_exercise_type_fk" uuid NOT NULL,
	"lecture_name" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TB_payment_history" (
	"ID_payment" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ID_customer_fk" uuid NOT NULL,
	"ID_subscription_fk" uuid NOT NULL,
	"amount" numeric NOT NULL,
	"payment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"payment_method" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TB_person" (
	"ID_person" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"surname" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"phone_number" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "TB_person_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "TB_room" (
	"ID_room" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"capacity" integer NOT NULL,
	CONSTRAINT "TB_room_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "TB_schedule" (
	"ID_schedule" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ID_lecture_fk" uuid NOT NULL,
	"ID_room_fk" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TB_schedule_instructor" (
	"ID_schedule_fk" uuid NOT NULL,
	"ID_employee_fk" uuid NOT NULL,
	"is_lead" boolean DEFAULT false NOT NULL,
	CONSTRAINT "TB_schedule_instructor_ID_schedule_fk_ID_employee_fk_pk" PRIMARY KEY("ID_schedule_fk","ID_employee_fk")
);
--> statement-breakpoint
CREATE TABLE "TB_subscription" (
	"ID_subscription" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"price" numeric NOT NULL,
	"duration_days" integer NOT NULL,
	CONSTRAINT "TB_subscription_name_unique" UNIQUE("name")
);
--> statement-breakpoint
DROP TABLE "test" CASCADE;--> statement-breakpoint
ALTER TABLE "TB_customer" ADD CONSTRAINT "TB_customer_ID_person_fk_TB_person_ID_person_fk" FOREIGN KEY ("ID_person_fk") REFERENCES "public"."TB_person"("ID_person") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TB_customer" ADD CONSTRAINT "TB_customer_ID_subscription_fk_TB_subscription_ID_subscription_fk" FOREIGN KEY ("ID_subscription_fk") REFERENCES "public"."TB_subscription"("ID_subscription") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TB_customer_reservation" ADD CONSTRAINT "TB_customer_reservation_ID_customer_fk_TB_customer_ID_customer_fk" FOREIGN KEY ("ID_customer_fk") REFERENCES "public"."TB_customer"("ID_customer") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TB_customer_reservation" ADD CONSTRAINT "TB_customer_reservation_ID_schedule_fk_TB_schedule_ID_schedule_fk" FOREIGN KEY ("ID_schedule_fk") REFERENCES "public"."TB_schedule"("ID_schedule") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TB_employee" ADD CONSTRAINT "TB_employee_ID_person_fk_TB_person_ID_person_fk" FOREIGN KEY ("ID_person_fk") REFERENCES "public"."TB_person"("ID_person") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TB_employee" ADD CONSTRAINT "TB_employee_ID_employee_type_fk_TB_employee_type_ID_employee_type_fk" FOREIGN KEY ("ID_employee_type_fk") REFERENCES "public"."TB_employee_type"("ID_employee_type") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TB_lecture" ADD CONSTRAINT "TB_lecture_ID_exercise_type_fk_TB_exercise_type_ID_exercise_type_fk" FOREIGN KEY ("ID_exercise_type_fk") REFERENCES "public"."TB_exercise_type"("ID_exercise_type") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TB_payment_history" ADD CONSTRAINT "TB_payment_history_ID_customer_fk_TB_customer_ID_customer_fk" FOREIGN KEY ("ID_customer_fk") REFERENCES "public"."TB_customer"("ID_customer") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TB_payment_history" ADD CONSTRAINT "TB_payment_history_ID_subscription_fk_TB_subscription_ID_subscription_fk" FOREIGN KEY ("ID_subscription_fk") REFERENCES "public"."TB_subscription"("ID_subscription") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TB_schedule" ADD CONSTRAINT "TB_schedule_ID_lecture_fk_TB_lecture_ID_lecture_fk" FOREIGN KEY ("ID_lecture_fk") REFERENCES "public"."TB_lecture"("ID_lecture") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TB_schedule" ADD CONSTRAINT "TB_schedule_ID_room_fk_TB_room_ID_room_fk" FOREIGN KEY ("ID_room_fk") REFERENCES "public"."TB_room"("ID_room") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TB_schedule_instructor" ADD CONSTRAINT "TB_schedule_instructor_ID_schedule_fk_TB_schedule_ID_schedule_fk" FOREIGN KEY ("ID_schedule_fk") REFERENCES "public"."TB_schedule"("ID_schedule") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TB_schedule_instructor" ADD CONSTRAINT "TB_schedule_instructor_ID_employee_fk_TB_employee_ID_employee_fk" FOREIGN KEY ("ID_employee_fk") REFERENCES "public"."TB_employee"("ID_employee") ON DELETE no action ON UPDATE no action;