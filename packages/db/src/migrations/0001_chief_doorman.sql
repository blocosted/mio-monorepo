CREATE TABLE "elevenlabs_voices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voice_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"labels" jsonb,
	"description" text,
	"preview_url" text,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "elevenlabs_voices_voice_id_unique" UNIQUE("voice_id")
);
