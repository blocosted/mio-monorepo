CREATE TABLE "audio_library_ambiance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_key" text NOT NULL,
	"environment" text NOT NULL,
	"sub_environment" text,
	"time_of_day" text DEFAULT 'any',
	"weather" text DEFAULT 'any',
	"mood" text,
	"prompt" text NOT NULL,
	"prompt_influence" real NOT NULL,
	"s3_url" text NOT NULL,
	"source_duration_seconds" real NOT NULL,
	"format" text DEFAULT 'mp3' NOT NULL,
	"is_loopable" boolean DEFAULT true,
	"tags" text[],
	"story_universes" text[],
	"usage_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "audio_library_ambiance_canonical_key_unique" UNIQUE("canonical_key")
);
--> statement-breakpoint
CREATE TABLE "audio_library_music" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_key" text NOT NULL,
	"mood" text NOT NULL,
	"intensity" text DEFAULT 'medium',
	"tempo" text DEFAULT 'medium',
	"variation_index" integer DEFAULT 0,
	"prompt" text NOT NULL,
	"prompt_influence" real NOT NULL,
	"s3_url" text NOT NULL,
	"source_duration_seconds" real NOT NULL,
	"format" text DEFAULT 'mp3' NOT NULL,
	"is_loopable" boolean DEFAULT true,
	"tags" text[],
	"story_universes" text[],
	"usage_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "audio_library_music_canonical_key_unique" UNIQUE("canonical_key")
);
--> statement-breakpoint
CREATE TABLE "audio_library_sfx" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_key" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text NOT NULL,
	"environment" text,
	"intensity" text DEFAULT 'medium',
	"prompt" text NOT NULL,
	"prompt_influence" real NOT NULL,
	"s3_url" text NOT NULL,
	"duration_seconds" real NOT NULL,
	"format" text DEFAULT 'mp3' NOT NULL,
	"tags" text[],
	"story_universes" text[],
	"usage_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "audio_library_sfx_canonical_key_unique" UNIQUE("canonical_key")
);
--> statement-breakpoint
ALTER TABLE "elevenlabs_voices" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "elevenlabs_voices" ADD COLUMN "age" text;--> statement-breakpoint
ALTER TABLE "elevenlabs_voices" ADD COLUMN "accent" text;--> statement-breakpoint
ALTER TABLE "elevenlabs_voices" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "elevenlabs_voices" ADD COLUMN "locale" text;--> statement-breakpoint
ALTER TABLE "elevenlabs_voices" ADD COLUMN "use_case" text;--> statement-breakpoint
ALTER TABLE "elevenlabs_voices" ADD COLUMN "is_high_quality" boolean DEFAULT false;--> statement-breakpoint
CREATE INDEX "idx_ambiance_environment" ON "audio_library_ambiance" USING btree ("environment");--> statement-breakpoint
CREATE INDEX "idx_ambiance_time_of_day" ON "audio_library_ambiance" USING btree ("time_of_day");--> statement-breakpoint
CREATE INDEX "idx_ambiance_weather" ON "audio_library_ambiance" USING btree ("weather");--> statement-breakpoint
CREATE INDEX "idx_ambiance_mood" ON "audio_library_ambiance" USING btree ("mood");--> statement-breakpoint
CREATE INDEX "idx_ambiance_tags" ON "audio_library_ambiance" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_ambiance_universes" ON "audio_library_ambiance" USING gin ("story_universes");--> statement-breakpoint
CREATE INDEX "idx_music_mood" ON "audio_library_music" USING btree ("mood");--> statement-breakpoint
CREATE INDEX "idx_music_intensity" ON "audio_library_music" USING btree ("intensity");--> statement-breakpoint
CREATE INDEX "idx_music_tempo" ON "audio_library_music" USING btree ("tempo");--> statement-breakpoint
CREATE INDEX "idx_music_tags" ON "audio_library_music" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_music_universes" ON "audio_library_music" USING gin ("story_universes");--> statement-breakpoint
CREATE INDEX "idx_sfx_category" ON "audio_library_sfx" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_sfx_subcategory" ON "audio_library_sfx" USING btree ("subcategory");--> statement-breakpoint
CREATE INDEX "idx_sfx_environment" ON "audio_library_sfx" USING btree ("environment");--> statement-breakpoint
CREATE INDEX "idx_sfx_intensity" ON "audio_library_sfx" USING btree ("intensity");--> statement-breakpoint
CREATE INDEX "idx_sfx_tags" ON "audio_library_sfx" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_sfx_universes" ON "audio_library_sfx" USING gin ("story_universes");--> statement-breakpoint
CREATE INDEX "idx_voices_gender" ON "elevenlabs_voices" USING btree ("gender");--> statement-breakpoint
CREATE INDEX "idx_voices_age" ON "elevenlabs_voices" USING btree ("age");--> statement-breakpoint
CREATE INDEX "idx_voices_language" ON "elevenlabs_voices" USING btree ("language");--> statement-breakpoint
CREATE INDEX "idx_voices_use_case" ON "elevenlabs_voices" USING btree ("use_case");