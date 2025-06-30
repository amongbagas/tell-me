CREATE TYPE "public"."room_status" AS ENUM('waiting', 'active', 'closed');--> statement-breakpoint
ALTER TABLE "room" ADD COLUMN "status" "room_status" DEFAULT 'waiting' NOT NULL;