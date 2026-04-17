CREATE TABLE "TB_employee_specialization" (
	"ID_employee_fk" uuid NOT NULL,
	"ID_exercise_type_fk" uuid NOT NULL,
	CONSTRAINT "TB_employee_specialization_ID_employee_fk_ID_exercise_type_fk_pk" PRIMARY KEY("ID_employee_fk","ID_exercise_type_fk")
);
--> statement-breakpoint
ALTER TABLE "TB_person" ALTER COLUMN "phone_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "TB_lecture" ADD COLUMN "for_members" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "TB_person" ADD COLUMN "clerk_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "TB_employee_specialization" ADD CONSTRAINT "TB_employee_specialization_ID_employee_fk_TB_employee_ID_employee_fk" FOREIGN KEY ("ID_employee_fk") REFERENCES "public"."TB_employee"("ID_employee") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TB_employee_specialization" ADD CONSTRAINT "TB_employee_specialization_ID_exercise_type_fk_TB_exercise_type_ID_exercise_type_fk" FOREIGN KEY ("ID_exercise_type_fk") REFERENCES "public"."TB_exercise_type"("ID_exercise_type") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TB_person" DROP COLUMN "password";--> statement-breakpoint
ALTER TABLE "TB_person" ADD CONSTRAINT "TB_person_clerk_id_unique" UNIQUE("clerk_id");