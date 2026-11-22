CREATE TYPE "public"."mentor_task_status" AS ENUM('open', 'done', 'skipped');--> statement-breakpoint
CREATE TABLE "mentor_messages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mentor_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"thread_id" integer NOT NULL,
	"seq" integer NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"api_content" jsonb NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mentor_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_tasks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mentor_tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"thread_id" integer,
	"title" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"ref" text,
	"due_on" date,
	"estimate_minutes" integer,
	"status" "mentor_task_status" DEFAULT 'open' NOT NULL,
	"user_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mentor_threads" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mentor_threads_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"system_prompt" text NOT NULL,
	"model" text NOT NULL,
	"context_hash" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mentor_messages" ADD CONSTRAINT "mentor_messages_thread_id_mentor_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."mentor_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_notes" ADD CONSTRAINT "mentor_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_tasks" ADD CONSTRAINT "mentor_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_tasks" ADD CONSTRAINT "mentor_tasks_thread_id_mentor_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."mentor_threads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_threads" ADD CONSTRAINT "mentor_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mentor_messages_thread_seq_idx" ON "mentor_messages" USING btree ("thread_id","seq");--> statement-breakpoint
CREATE INDEX "mentor_notes_user_idx" ON "mentor_notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mentor_tasks_user_status_idx" ON "mentor_tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "mentor_threads_user_idx" ON "mentor_threads" USING btree ("user_id","updated_at");