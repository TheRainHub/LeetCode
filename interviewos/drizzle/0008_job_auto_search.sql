CREATE TABLE "job_auto_searches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "job_auto_searches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"criteria" jsonb NOT NULL,
	"interval_days" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"last_run_at" timestamp with time zone,
	"running_since" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_searches" ADD COLUMN "auto_search_id" integer;--> statement-breakpoint
ALTER TABLE "job_searches" ADD COLUMN "skipped_seen" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_searches" ADD COLUMN "viewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_auto_searches" ADD CONSTRAINT "job_auto_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_auto_searches_due_idx" ON "job_auto_searches" USING btree ("user_id","next_run_at");--> statement-breakpoint
ALTER TABLE "job_searches" ADD CONSTRAINT "job_searches_auto_search_id_job_auto_searches_id_fk" FOREIGN KEY ("auto_search_id") REFERENCES "public"."job_auto_searches"("id") ON DELETE set null ON UPDATE no action;