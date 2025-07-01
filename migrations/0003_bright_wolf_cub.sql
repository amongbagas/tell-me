CREATE TYPE "public"."participant_role" AS ENUM('speaker', 'listener');--> statement-breakpoint
CREATE TABLE "participant" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"uid" integer NOT NULL,
	"role" "participant_role" NOT NULL,
	"is_muted" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_room_uid" UNIQUE("room_id","uid")
);
