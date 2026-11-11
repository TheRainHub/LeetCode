CREATE TABLE "sd_attempts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sd_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"question_slug" text NOT NULL,
	"rubric_checks" jsonb NOT NULL,
	"score" real NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"graded_by" "graded_by" NOT NULL,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sd_drafts" (
	"user_id" integer NOT NULL,
	"question_slug" text NOT NULL,
	"sections" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sd_drafts_user_id_question_slug_pk" PRIMARY KEY("user_id","question_slug")
);
--> statement-breakpoint
ALTER TABLE "mock_interviews" ADD COLUMN "sd_question_slug" text;--> statement-breakpoint
ALTER TABLE "sd_attempts" ADD CONSTRAINT "sd_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sd_drafts" ADD CONSTRAINT "sd_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sd_attempts_user_question_idx" ON "sd_attempts" USING btree ("user_id","question_slug");