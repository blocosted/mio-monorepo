/**
 * Audio Repositories Module
 *
 * Unified external audio API client for ElevenLabs TTS and Sound Effects.
 */

export * from './audio.repository';
// Backward-compatible aliases for legacy script imports
export { AudioRepository as SoundEffectsRepository, AudioRepository as VoicesRepository } from './audio.repository';
export * from './audio-repository.types';
