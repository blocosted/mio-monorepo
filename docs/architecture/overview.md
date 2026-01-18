# Architecture Overview

Mio is a personalized audio story generator for children.
The system transforms a short textual prompt into a fully produced audio story
including narration, dialogues, music, and sound effects.

## High-level flow

1. User submits a story prompt from the web app
2. API validates input and creates a Story Job
3. Workflow orchestrates:
   - Story script generation (LLM)
   - Voice synthesis (TTS)
   - Music & SFX generation
   - Audio assembly (FFmpeg)
4. Final audio is stored and streamed to the client

## Key principles

- Deterministic workflows
- Strong separation of concerns
- Cost-aware design (LLM & TTS)
