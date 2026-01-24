/**
 * FFmpeg Mixer Service Types
 *
 * Types for audio mixing service.
 */

/**
 * Audio track for mixing
 */
export interface AudioTrack {
  id: string;
  url: string;
  startTime: number;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
}

/**
 * Mix configuration
 */
export interface MixStoryInput {
  voiceTracks: AudioTrack[];
  sfxTracks: AudioTrack[];
  musicTracks: AudioTrack[];
  ambianceTracks: AudioTrack[];
  outputFormat?: 'mp3' | 'wav';
  bitrate?: string;
}

/**
 * Mix result
 */
export interface MixStoryResult {
  buffer: Buffer;
  duration: number;
}

/**
 * FFmpeg Mixer Service Interface
 */
export interface IFFmpegMixerService {
  /**
   * Mix multiple audio tracks into a single output
   */
  mixStory(input: MixStoryInput): Promise<MixStoryResult>;
}
