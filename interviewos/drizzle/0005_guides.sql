CREATE TABLE "guide_categories" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 1000 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guide_reads" (
	"user_id" integer NOT NULL,
	"guide_id" integer NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_reads_user_id_guide_id_pk" PRIMARY KEY("user_id","guide_id")
);
--> statement-breakpoint
CREATE TABLE "guides" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guides_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text,
	"published_on" date,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"content" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guides_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "guide_reads" ADD CONSTRAINT "guide_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_reads" ADD CONSTRAINT "guide_reads_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guides_categories_idx" ON "guides" USING gin ("categories");