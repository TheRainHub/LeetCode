CREATE TABLE "sd_boards" (
	"user_id" integer NOT NULL,
	"board_key" text NOT NULL,
	"data" jsonb NOT NULL,
	"components" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sd_boards_user_id_board_key_pk" PRIMARY KEY("user_id","board_key")
);
--> statement-breakpoint
ALTER TABLE "sd_boards" ADD CONSTRAINT "sd_boards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;