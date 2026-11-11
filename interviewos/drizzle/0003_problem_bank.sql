CREATE TYPE "public"."bank_status" AS ENUM('planned', 'attempted', 'solved', 'solved_with_help');--> statement-breakpoint
CREATE TYPE "public"."bank_window" AS ENUM('30d', '3m', '6m', '6m_plus', 'all');--> statement-breakpoint
CREATE TABLE "bank_companies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bank_companies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"company_id" integer,
	CONSTRAINT "bank_companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bank_patterns" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bank_patterns_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"topic_slug" text,
	"source_url" text NOT NULL,
	CONSTRAINT "bank_patterns_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bank_problem_companies" (
	"problem_id" integer NOT NULL,
	"bank_company_id" integer NOT NULL,
	"window" "bank_window" NOT NULL,
	"frequency" real NOT NULL,
	CONSTRAINT "bank_problem_companies_problem_id_bank_company_id_window_pk" PRIMARY KEY("problem_id","bank_company_id","window")
);
--> statement-breakpoint
CREATE TABLE "bank_problem_patterns" (
	"problem_id" integer NOT NULL,
	"pattern_id" integer NOT NULL,
	CONSTRAINT "bank_problem_patterns_problem_id_pattern_id_pk" PRIMARY KEY("problem_id","pattern_id")
);
--> statement-breakpoint
CREATE TABLE "bank_problems" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bank_problems_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"difficulty" "difficulty",
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"internal_problem_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_problems_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bank_progress" (
	"user_id" integer NOT NULL,
	"problem_id" integer NOT NULL,
	"status" "bank_status" NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"solved_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_progress_user_id_problem_id_pk" PRIMARY KEY("user_id","problem_id")
);
--> statement-breakpoint
CREATE TABLE "bank_sources" (
	"key" text PRIMARY KEY NOT NULL,
	"repo_url" text NOT NULL,
	"commit" text,
	"commit_date" timestamp with time zone,
	"imported_at" timestamp with time zone NOT NULL,
	"stats" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_companies" ADD CONSTRAINT "bank_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_problem_companies" ADD CONSTRAINT "bank_problem_companies_problem_id_bank_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."bank_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_problem_companies" ADD CONSTRAINT "bank_problem_companies_bank_company_id_bank_companies_id_fk" FOREIGN KEY ("bank_company_id") REFERENCES "public"."bank_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_problem_patterns" ADD CONSTRAINT "bank_problem_patterns_problem_id_bank_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."bank_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_problem_patterns" ADD CONSTRAINT "bank_problem_patterns_pattern_id_bank_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."bank_patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_problems" ADD CONSTRAINT "bank_problems_internal_problem_id_coding_problems_id_fk" FOREIGN KEY ("internal_problem_id") REFERENCES "public"."coding_problems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_progress" ADD CONSTRAINT "bank_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_progress" ADD CONSTRAINT "bank_progress_problem_id_bank_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."bank_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_problem_companies_company_idx" ON "bank_problem_companies" USING btree ("bank_company_id","window","frequency");--> statement-breakpoint
CREATE INDEX "bank_problem_companies_window_idx" ON "bank_problem_companies" USING btree ("window","problem_id");--> statement-breakpoint
CREATE INDEX "bank_problem_patterns_pattern_idx" ON "bank_problem_patterns" USING btree ("pattern_id");--> statement-breakpoint
CREATE INDEX "bank_problems_tags_idx" ON "bank_problems" USING gin ("tags");