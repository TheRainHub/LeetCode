CREATE TYPE "public"."application_stage" AS ENUM('applied', 'screening', 'technical', 'final', 'offer', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."attempt_outcome" AS ENUM('passed', 'partial', 'failed', 'not_run');--> statement-breakpoint
CREATE TYPE "public"."card_source" AS ENUM('lesson', 'interview', 'manual');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."event_kind" AS ENUM('university', 'interview', 'unavailable', 'other');--> statement-breakpoint
CREATE TYPE "public"."execution_mode" AS ENUM('browser', 'local', 'none');--> statement-breakpoint
CREATE TYPE "public"."exercise_kind" AS ENUM('mcq', 'explain');--> statement-breakpoint
CREATE TYPE "public"."graded_by" AS ENUM('auto', 'self', 'ai');--> statement-breakpoint
CREATE TYPE "public"."independence" AS ENUM('independent', 'with_hints', 'with_solution');--> statement-breakpoint
CREATE TYPE "public"."interview_status" AS ENUM('in_progress', 'evaluating', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."interview_type" AS ENUM('algorithms', 'core_cs', 'backend', 'fullstack', 'system_design', 'behavioral', 'ai_engineering');--> statement-breakpoint
CREATE TYPE "public"."lab_status" AS ENUM('in_progress', 'verified');--> statement-breakpoint
CREATE TYPE "public"."lesson_depth" AS ENUM('full', 'concise');--> statement-breakpoint
CREATE TYPE "public"."message_kind" AS ENUM('normal', 'hint_request', 'opening');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."review_grade" AS ENUM('again', 'hard', 'good', 'easy');--> statement-breakpoint
CREATE TYPE "public"."task_kind" AS ENUM('lesson', 'problem', 'review', 'lab', 'mock', 'experience', 'custom');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'done', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."topic_status" AS ENUM('not_started', 'learning', 'practicing', 'needs_review', 'interview_ready');--> statement-breakpoint
CREATE TABLE "application_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "application_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"application_id" integer NOT NULL,
	"stage" "application_stage" NOT NULL,
	"occurred_on" date NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "applications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"role" text NOT NULL,
	"stage" "application_stage" NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "calendar_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"kind" "event_kind" NOT NULL,
	"title" text NOT NULL,
	"date" date NOT NULL,
	"light_days_before" integer DEFAULT 0 NOT NULL,
	"company_id" integer,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_drafts" (
	"user_id" integer NOT NULL,
	"problem_id" integer NOT NULL,
	"language" text NOT NULL,
	"code" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "code_drafts_user_id_problem_id_language_pk" PRIMARY KEY("user_id","problem_id","language")
);
--> statement-breakpoint
CREATE TABLE "coding_attempts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "coding_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"problem_id" integer NOT NULL,
	"language" text NOT NULL,
	"code" text NOT NULL,
	"outcome" "attempt_outcome" NOT NULL,
	"execution_mode" "execution_mode" NOT NULL,
	"tests_passed" integer DEFAULT 0 NOT NULL,
	"tests_total" integer DEFAULT 0 NOT NULL,
	"test_results" jsonb NOT NULL,
	"duration_seconds" integer NOT NULL,
	"hints_used" integer DEFAULT 0 NOT NULL,
	"viewed_solution" boolean DEFAULT false NOT NULL,
	"independence" "independence" NOT NULL,
	"claimed_time" text NOT NULL,
	"claimed_space" text NOT NULL,
	"time_correct" boolean,
	"space_correct" boolean,
	"reflection" text DEFAULT '' NOT NULL,
	"confidence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coding_problems" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "coding_problems_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"order" integer NOT NULL,
	"pattern" text NOT NULL,
	"summary" text NOT NULL,
	"statement" text NOT NULL,
	"constraints" jsonb NOT NULL,
	"examples" jsonb NOT NULL,
	"hints" jsonb NOT NULL,
	"approach" text NOT NULL,
	"solution_code" jsonb NOT NULL,
	"edge_cases" jsonb NOT NULL,
	"expected_time" text NOT NULL,
	"expected_space" text NOT NULL,
	"complexity_notes" text NOT NULL,
	"common_mistakes" jsonb NOT NULL,
	"signature" jsonb NOT NULL,
	"comparator" text NOT NULL,
	"starter_code" jsonb NOT NULL,
	"tests" jsonb NOT NULL,
	"external_links" jsonb NOT NULL,
	CONSTRAINT "coding_problems_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "companies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"order" integer NOT NULL,
	"overview" text NOT NULL,
	"tech_stack" jsonb NOT NULL,
	"prep_notes" text NOT NULL,
	"source_note" text NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "company_checklist_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "company_checklist_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"text" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_focus_topics" (
	"company_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	"weight" integer NOT NULL,
	CONSTRAINT "company_focus_topics_company_id_topic_id_pk" PRIMARY KEY("company_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "company_notes" (
	"user_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"notes" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_notes_user_id_company_id_pk" PRIMARY KEY("user_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "company_problems" (
	"company_id" integer NOT NULL,
	"problem_id" integer NOT NULL,
	CONSTRAINT "company_problems_company_id_problem_id_pk" PRIMARY KEY("company_id","problem_id")
);
--> statement-breakpoint
CREATE TABLE "custom_test_cases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "custom_test_cases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"problem_id" integer NOT NULL,
	"name" text NOT NULL,
	"args" jsonb NOT NULL,
	"expected" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_attempts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "exercise_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"selected_option" integer,
	"response_text" text,
	"rubric_checks" jsonb,
	"score" real NOT NULL,
	"is_correct" boolean NOT NULL,
	"interview_mode" boolean DEFAULT false NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"graded_by" "graded_by" NOT NULL,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "exercises_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lesson_id" integer NOT NULL,
	"slug" text NOT NULL,
	"kind" "exercise_kind" NOT NULL,
	"order" integer NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb,
	"correct_option" integer,
	"explanation" text,
	"rubric" jsonb,
	"model_answer" text,
	CONSTRAINT "exercises_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "experience_practice" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "experience_practice_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"project_id" integer,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"self_score" integer NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_evaluations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "interview_evaluations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"interview_id" integer NOT NULL,
	"overall_score" integer NOT NULL,
	"summary" text NOT NULL,
	"dimensions" jsonb NOT NULL,
	"strengths" jsonb NOT NULL,
	"weaknesses" jsonb NOT NULL,
	"mistakes" jsonb NOT NULL,
	"model_answer" text NOT NULL,
	"recommended_topics" jsonb NOT NULL,
	"follow_up_exercises" jsonb NOT NULL,
	"srs_suggestions" jsonb NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interview_evaluations_interview_id_unique" UNIQUE("interview_id")
);
--> statement-breakpoint
CREATE TABLE "interview_messages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "interview_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"interview_id" integer NOT NULL,
	"seq" integer NOT NULL,
	"role" "message_role" NOT NULL,
	"kind" "message_kind" DEFAULT 'normal' NOT NULL,
	"content" text NOT NULL,
	"api_content" jsonb NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_presets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "interview_presets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"company_id" integer NOT NULL,
	"title" text NOT NULL,
	"type" "interview_type" NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"duration_minutes" integer NOT NULL,
	"language" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_topics" (
	"interview_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	"score" real NOT NULL,
	CONSTRAINT "interview_topics_interview_id_topic_id_pk" PRIMARY KEY("interview_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "lab_attempts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lab_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"lab_id" integer NOT NULL,
	"status" "lab_status" DEFAULT 'in_progress' NOT NULL,
	"step_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reflections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"minutes_spent" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_topics" (
	"lab_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	CONSTRAINT "lab_topics_lab_id_topic_id_pk" PRIMARY KEY("lab_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "learning_paths" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "learning_paths_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"area" text NOT NULL,
	"description" text NOT NULL,
	"order" integer NOT NULL,
	CONSTRAINT "learning_paths_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "lesson_prerequisites" (
	"lesson_id" integer NOT NULL,
	"prerequisite_id" integer NOT NULL,
	CONSTRAINT "lesson_prerequisites_lesson_id_prerequisite_id_pk" PRIMARY KEY("lesson_id","prerequisite_id")
);
--> statement-breakpoint
CREATE TABLE "lesson_problems" (
	"lesson_id" integer NOT NULL,
	"problem_id" integer NOT NULL,
	CONSTRAINT "lesson_problems_lesson_id_problem_id_pk" PRIMARY KEY("lesson_id","problem_id")
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"user_id" integer NOT NULL,
	"lesson_id" integer NOT NULL,
	"read_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"confidence" integer,
	"notes" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lessons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"module_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"order" integer NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"depth" "lesson_depth" NOT NULL,
	"objectives" jsonb NOT NULL,
	"explanation" text NOT NULL,
	"worked_examples" text NOT NULL,
	"misconceptions" text NOT NULL,
	"practical_exercises" text NOT NULL,
	"interview_questions" jsonb NOT NULL,
	"self_assessment" jsonb NOT NULL,
	"completion_criteria" jsonb NOT NULL,
	"readings" jsonb NOT NULL,
	"search_text" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "mock_interviews" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mock_interviews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"company_id" integer,
	"type" "interview_type" NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"duration_minutes" integer NOT NULL,
	"language" text NOT NULL,
	"status" "interview_status" DEFAULT 'in_progress' NOT NULL,
	"model" text NOT NULL,
	"system_prompt" text NOT NULL,
	"hints_requested" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "modules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"path_id" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"order" integer NOT NULL,
	CONSTRAINT "modules_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "personal_projects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "personal_projects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"organization" text NOT NULL,
	"period" text DEFAULT '' NOT NULL,
	"tech_stack" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"problem" text DEFAULT '' NOT NULL,
	"context" text DEFAULT '' NOT NULL,
	"responsibility" text DEFAULT '' NOT NULL,
	"architecture" text DEFAULT '' NOT NULL,
	"decisions" text DEFAULT '' NOT NULL,
	"tradeoffs" text DEFAULT '' NOT NULL,
	"challenges" text DEFAULT '' NOT NULL,
	"result" text DEFAULT '' NOT NULL,
	"lessons_learned" text DEFAULT '' NOT NULL,
	"needs_review" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practical_labs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "practical_labs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"area" text NOT NULL,
	"order" integer NOT NULL,
	"summary" text NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"objectives" jsonb NOT NULL,
	"prerequisites" jsonb NOT NULL,
	"tools" jsonb NOT NULL,
	"deliverables" jsonb NOT NULL,
	"steps" jsonb NOT NULL,
	"failure_scenarios" jsonb NOT NULL,
	"reflection_questions" jsonb NOT NULL,
	CONSTRAINT "practical_labs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "problem_notes" (
	"user_id" integer NOT NULL,
	"problem_id" integer NOT NULL,
	"notes" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "problem_notes_user_id_problem_id_pk" PRIMARY KEY("user_id","problem_id")
);
--> statement-breakpoint
CREATE TABLE "problem_tags" (
	"problem_id" integer NOT NULL,
	"tag" text NOT NULL,
	CONSTRAINT "problem_tags_problem_id_tag_pk" PRIMARY KEY("problem_id","tag")
);
--> statement-breakpoint
CREATE TABLE "problem_topics" (
	"problem_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	CONSTRAINT "problem_topics_problem_id_topic_id_pk" PRIMARY KEY("problem_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "review_cards" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "review_cards_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"topic_id" integer,
	"prompt" text NOT NULL,
	"answer" text NOT NULL,
	"source" "card_source" NOT NULL,
	"source_ref" text,
	"suspended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "review_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"schedule_id" integer NOT NULL,
	"grade" "review_grade" NOT NULL,
	"interval_before" integer NOT NULL,
	"interval_after" integer NOT NULL,
	"elapsed_seconds" integer DEFAULT 0 NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_schedules" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "review_schedules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"card_id" integer,
	"problem_id" integer,
	"ease" real DEFAULT 2.5 NOT NULL,
	"interval_days" integer DEFAULT 0 NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"due_on" date NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_schedules_one_target" CHECK (("review_schedules"."card_id" IS NOT NULL AND "review_schedules"."problem_id" IS NULL) OR ("review_schedules"."card_id" IS NULL AND "review_schedules"."problem_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "star_stories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "star_stories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"project_id" integer,
	"title" text NOT NULL,
	"competency" text NOT NULL,
	"situation" text DEFAULT '' NOT NULL,
	"task" text DEFAULT '' NOT NULL,
	"action" text DEFAULT '' NOT NULL,
	"result" text DEFAULT '' NOT NULL,
	"reflection" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_plans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "study_plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"template_key" text NOT NULL,
	"start_date" date NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "study_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"plan_id" integer NOT NULL,
	"order" integer NOT NULL,
	"title" text NOT NULL,
	"focus" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_tasks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "study_tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"session_id" integer NOT NULL,
	"order" integer NOT NULL,
	"kind" "task_kind" NOT NULL,
	"title" text NOT NULL,
	"ref_slug" text,
	"estimated_minutes" integer NOT NULL,
	"scheduled_date" date NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"over_capacity" boolean DEFAULT false NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"times_moved" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "time_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"seconds" integer NOT NULL,
	"kind" text NOT NULL,
	"ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_progress" (
	"user_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	"status" "topic_status" DEFAULT 'not_started' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"confidence" integer,
	"read_at" timestamp with time zone,
	"recognized_at" timestamp with time zone,
	"implemented_at" timestamp with time zone,
	"explained_at" timestamp with time zone,
	"lab_verified_at" timestamp with time zone,
	"last_practiced_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"incorrect" integer DEFAULT 0 NOT NULL,
	"hints_used" integer DEFAULT 0 NOT NULL,
	"avg_solve_seconds" integer,
	"next_review_on" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_progress_user_id_topic_id_pk" PRIMARY KEY("user_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "topics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"area" text NOT NULL,
	"summary" text NOT NULL,
	"practice_kind" text NOT NULL,
	CONSTRAINT "topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'Europe/Prague' NOT NULL,
	"daily_budget_minutes" integer DEFAULT 90 NOT NULL,
	"rest_weekdays" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"prioritize_university" boolean DEFAULT true NOT NULL,
	"preferred_language" text DEFAULT 'java' NOT NULL,
	"interviewer_profile" text DEFAULT '' NOT NULL,
	"last_rescheduled_on" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_objectives" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "weekly_objectives_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"week_start" date NOT NULL,
	"text" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_drafts" ADD CONSTRAINT "code_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_drafts" ADD CONSTRAINT "code_drafts_problem_id_coding_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."coding_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coding_attempts" ADD CONSTRAINT "coding_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coding_attempts" ADD CONSTRAINT "coding_attempts_problem_id_coding_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."coding_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_checklist_items" ADD CONSTRAINT "company_checklist_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_checklist_items" ADD CONSTRAINT "company_checklist_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_focus_topics" ADD CONSTRAINT "company_focus_topics_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_focus_topics" ADD CONSTRAINT "company_focus_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_notes" ADD CONSTRAINT "company_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_notes" ADD CONSTRAINT "company_notes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_problems" ADD CONSTRAINT "company_problems_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_problems" ADD CONSTRAINT "company_problems_problem_id_coding_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."coding_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_test_cases" ADD CONSTRAINT "custom_test_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_test_cases" ADD CONSTRAINT "custom_test_cases_problem_id_coding_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."coding_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD CONSTRAINT "exercise_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD CONSTRAINT "exercise_attempts_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_practice" ADD CONSTRAINT "experience_practice_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_practice" ADD CONSTRAINT "experience_practice_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."personal_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_evaluations" ADD CONSTRAINT "interview_evaluations_interview_id_mock_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."mock_interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_messages" ADD CONSTRAINT "interview_messages_interview_id_mock_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."mock_interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_presets" ADD CONSTRAINT "interview_presets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_topics" ADD CONSTRAINT "interview_topics_interview_id_mock_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."mock_interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_topics" ADD CONSTRAINT "interview_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_attempts" ADD CONSTRAINT "lab_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_attempts" ADD CONSTRAINT "lab_attempts_lab_id_practical_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."practical_labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_topics" ADD CONSTRAINT "lab_topics_lab_id_practical_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."practical_labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_topics" ADD CONSTRAINT "lab_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_prerequisites" ADD CONSTRAINT "lesson_prerequisites_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_prerequisites" ADD CONSTRAINT "lesson_prerequisites_prerequisite_id_lessons_id_fk" FOREIGN KEY ("prerequisite_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_problems" ADD CONSTRAINT "lesson_problems_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_problems" ADD CONSTRAINT "lesson_problems_problem_id_coding_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."coding_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_interviews" ADD CONSTRAINT "mock_interviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_interviews" ADD CONSTRAINT "mock_interviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_path_id_learning_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."learning_paths"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_projects" ADD CONSTRAINT "personal_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_notes" ADD CONSTRAINT "problem_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_notes" ADD CONSTRAINT "problem_notes_problem_id_coding_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."coding_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_tags" ADD CONSTRAINT "problem_tags_problem_id_coding_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."coding_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_topics" ADD CONSTRAINT "problem_topics_problem_id_coding_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."coding_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_topics" ADD CONSTRAINT "problem_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_cards" ADD CONSTRAINT "review_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_cards" ADD CONSTRAINT "review_cards_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_schedule_id_review_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."review_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_schedules" ADD CONSTRAINT "review_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_schedules" ADD CONSTRAINT "review_schedules_card_id_review_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."review_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_schedules" ADD CONSTRAINT "review_schedules_problem_id_coding_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."coding_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "star_stories" ADD CONSTRAINT "star_stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "star_stories" ADD CONSTRAINT "star_stories_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."personal_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_plan_id_study_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."study_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_tasks" ADD CONSTRAINT "study_tasks_session_id_study_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."study_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_objectives" ADD CONSTRAINT "weekly_objectives_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_events_app_idx" ON "application_events" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "applications_user_company_idx" ON "applications" USING btree ("user_id","company_id");--> statement-breakpoint
CREATE INDEX "calendar_events_user_date_idx" ON "calendar_events" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "coding_attempts_user_problem_idx" ON "coding_attempts" USING btree ("user_id","problem_id");--> statement-breakpoint
CREATE INDEX "checklist_company_idx" ON "company_checklist_items" USING btree ("user_id","company_id");--> statement-breakpoint
CREATE INDEX "custom_tests_problem_idx" ON "custom_test_cases" USING btree ("user_id","problem_id");--> statement-breakpoint
CREATE INDEX "exercise_attempts_user_idx" ON "exercise_attempts" USING btree ("user_id","exercise_id");--> statement-breakpoint
CREATE INDEX "exercises_lesson_idx" ON "exercises" USING btree ("lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "interview_messages_seq_idx" ON "interview_messages" USING btree ("interview_id","seq");--> statement-breakpoint
CREATE INDEX "lab_attempts_user_idx" ON "lab_attempts" USING btree ("user_id","lab_id");--> statement-breakpoint
CREATE INDEX "lessons_module_idx" ON "lessons" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "lessons_topic_idx" ON "lessons" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "mock_interviews_user_idx" ON "mock_interviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "modules_path_idx" ON "modules" USING btree ("path_id");--> statement-breakpoint
CREATE INDEX "review_cards_user_topic_idx" ON "review_cards" USING btree ("user_id","topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_cards_source_ref_idx" ON "review_cards" USING btree ("user_id","source_ref");--> statement-breakpoint
CREATE INDEX "review_logs_schedule_idx" ON "review_logs" USING btree ("schedule_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_schedules_card_idx" ON "review_schedules" USING btree ("user_id","card_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_schedules_problem_idx" ON "review_schedules" USING btree ("user_id","problem_id");--> statement-breakpoint
CREATE INDEX "review_schedules_due_idx" ON "review_schedules" USING btree ("user_id","due_on");--> statement-breakpoint
CREATE INDEX "study_sessions_plan_idx" ON "study_sessions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "study_tasks_date_idx" ON "study_tasks" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "study_tasks_session_idx" ON "study_tasks" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "time_entries_user_date_idx" ON "time_entries" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "weekly_objectives_user_week_idx" ON "weekly_objectives" USING btree ("user_id","week_start");