CREATE TYPE "public"."job_source" AS ENUM('manual', 'url', 'search');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('saved', 'preparing', 'applied', 'interviewing', 'offer', 'rejected', 'archived');--> statement-breakpoint
CREATE TABLE "career_profiles" (
	"user_id" integer NOT NULL,
	"resume" text DEFAULT '' NOT NULL,
	"target_roles" text DEFAULT '' NOT NULL,
	"locations" text DEFAULT '' NOT NULL,
	"work_modes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"levels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"availability" text DEFAULT '' NOT NULL,
	"work_authorization" text DEFAULT '' NOT NULL,
	"languages" text DEFAULT '' NOT NULL,
	"salary" text DEFAULT '' NOT NULL,
	"preferences" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_profiles_user_id_pk" PRIMARY KEY("user_id")
);
--> statement-breakpoint
CREATE TABLE "job_analyses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "job_analyses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"posting_id" integer NOT NULL,
	"data" jsonb NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"researched" boolean DEFAULT false NOT NULL,
	"resume_hash" text NOT NULL,
	"dropped_rewrites" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_posting_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "job_posting_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"posting_id" integer NOT NULL,
	"status" "job_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_postings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "job_postings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"work_mode" text,
	"url" text,
	"description" text DEFAULT '' NOT NULL,
	"source" "job_source" NOT NULL,
	"status" "job_status" DEFAULT 'saved' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"company_slug" text,
	"search_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_searches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "job_searches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"criteria" jsonb NOT NULL,
	"results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"searches" integer DEFAULT 0 NOT NULL,
	"dropped" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mock_interviews" ADD COLUMN "job_posting_id" integer;--> statement-breakpoint
ALTER TABLE "career_profiles" ADD CONSTRAINT "career_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_analyses" ADD CONSTRAINT "job_analyses_posting_id_job_postings_id_fk" FOREIGN KEY ("posting_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_posting_events" ADD CONSTRAINT "job_posting_events_posting_id_job_postings_id_fk" FOREIGN KEY ("posting_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_search_id_job_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."job_searches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_searches" ADD CONSTRAINT "job_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_analyses_posting_idx" ON "job_analyses" USING btree ("posting_id","created_at");--> statement-breakpoint
CREATE INDEX "job_posting_events_posting_idx" ON "job_posting_events" USING btree ("posting_id");--> statement-breakpoint
CREATE INDEX "job_postings_user_status_idx" ON "job_postings" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "job_postings_user_url_idx" ON "job_postings" USING btree ("user_id","url");--> statement-breakpoint
CREATE INDEX "job_searches_user_idx" ON "job_searches" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "mock_interviews" ADD CONSTRAINT "mock_interviews_job_posting_id_job_postings_id_fk" FOREIGN KEY ("job_posting_id") REFERENCES "public"."job_postings"("id") ON DELETE set null ON UPDATE no action;