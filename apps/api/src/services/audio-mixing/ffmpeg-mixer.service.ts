/**
 * FFmpeg Mixer Service Implementation
 *
 * Audio mixing service using fluent-ffmpeg to combine voice, music, ambiance, and SFX
 * tracks into a final normalized MP3 file.
 */

import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import ffmpeg from 'fluent-ffmpeg';
import { inject, injectable } from 'inversify';

import type { Logger } from '@mio/shared/server/logger';
import { AppError, DiagnoseSeverity, ErrorCodes } from '@mio/shared';

import type { IStorageService } from '../storage';
import type {
  AmbianceTrackInput,
  FFmpegVerifyResult,
  IFFmpegMixerService,
  MixStoryInput,
  MixStoryResult,
  MusicTrackInput,
  SfxTrackInput,
  VoiceTrackInput
} from './ffmpeg-mixer.service.types';
import { IocConnection, IocService } from '../../ioc/ioc.types';
import {
  DEFAULT_VOLUMES,
  DUCKING_DEFAULTS,
  FFMPEG_TIMEOUT_MS,
  FILTER_TEMPLATES,
  INTERMEDIATE_FILES,
  OUTPUT_FORMAT,
  PROBE_TIMEOUT_MS,
  SILENCE_GENERATION_TIMEOUT_MS,
  SILENCE_SETTINGS,
  TEMP_DIR_BASE,
  WORKDIR_PREFIX
} from './ffmpeg-mixer.service.constants';

/**
 * FFmpeg Mixer Service
 *
 * Orchestrates multi-track audio mixing with:
 * - Voice timeline creation with pauses
 * - Background music with sidechain compression (ducking)
 * - Looped ambiance tracks
 * - Timed SFX placement
 * - Loudness normalization (EBU R128)
 * - MP3 export with standard settings
 */
@injectable()
export class FFmpegMixerService implements IFFmpegMixerService {
  constructor(
    @inject(IocConnection.LOGGER) private readonly logger: Logger,
    @inject(IocService.STORAGE) private readonly storage: IStorageService
  ) {}

  /**
   * Mix all audio tracks into a final story audio file
   */
  async mixStory(input: MixStoryInput): Promise<MixStoryResult> {
    const { storyId, voice, music, ambiance, sfx, output } = input;
    const workdir = await this.createWorkdir(storyId);

    this.logger.info('Starting story mix', {
      storyId,
      workdir,
      voiceSegments: voice.segments.length,
      hasMusic: !!music,
      hasAmbiance: !!ambiance,
      sfxCount: sfx?.files.length ?? 0
    });

    try {
      // Step 1: Download all audio files to workdir
      const downloadedFiles = await this.downloadAudioFiles(input, workdir);

      // Step 2: Create voice timeline with pauses
      const voiceTimelinePath = await this.createVoiceTimeline(voice, downloadedFiles.voice, workdir);

      // Step 3: Get voice duration for reference
      const voiceDuration = await this.getAudioDuration(voiceTimelinePath);

      // Step 4: Mix all tracks together
      const mixedPath = await this.mixAllTracks(voiceTimelinePath, voiceDuration, downloadedFiles, { music, ambiance, sfx }, workdir);

      // Step 5: Apply loudness normalization
      const normalizedPath = await this.applyNormalization(mixedPath, workdir);

      // Step 6: Export final MP3
      const finalPath = await this.exportFinalMix(normalizedPath, workdir, output);

      // Step 7: Read final file into buffer
      const audioBuffer = await readFile(finalPath);
      const finalDuration = await this.getAudioDuration(finalPath);

      this.logger.info('Story mix complete', {
        storyId,
        duration: finalDuration,
        sizeBytes: audioBuffer.length
      });

      return {
        audio: audioBuffer,
        duration: finalDuration,
        format: {
          codec: OUTPUT_FORMAT.codec,
          bitrate: output?.bitrate ?? OUTPUT_FORMAT.bitrate,
          sampleRate: output?.sampleRate ?? OUTPUT_FORMAT.sampleRate,
          channels: output?.channels ?? OUTPUT_FORMAT.channels
        }
      };
    } finally {
      // Always cleanup workdir
      await this.cleanupWorkdir(workdir);
    }
  }

  /**
   * Generate a silence audio file of specified duration
   */
  async generateSilence(durationSeconds: number, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new AppError(ErrorCodes.FFmpegTimeout, {
            diagnoses: [
              {
                name: 'operation',
                message: 'generateSilence',
                severity: DiagnoseSeverity.Info
              },
              {
                name: 'duration',
                message: `${durationSeconds}s`,
                severity: DiagnoseSeverity.Info
              }
            ]
          })
        );
      }, SILENCE_GENERATION_TIMEOUT_MS);

      ffmpeg()
        .input('anullsrc=r=44100:cl=stereo')
        .inputFormat('lavfi')
        .duration(durationSeconds)
        .audioCodec('pcm_s16le')
        .audioChannels(SILENCE_SETTINGS.channels)
        .audioFrequency(SILENCE_SETTINGS.sampleRate)
        .output(outputPath)
        .on('end', () => {
          clearTimeout(timeout);
          resolve(outputPath);
        })
        .on('error', (err: Error) => {
          clearTimeout(timeout);
          reject(
            new AppError(ErrorCodes.FFmpegMixingFailed, {
              diagnoses: [
                {
                  name: 'operation',
                  message: 'generateSilence',
                  severity: DiagnoseSeverity.Info
                },
                {
                  name: 'error',
                  message: err.message,
                  severity: DiagnoseSeverity.Error
                }
              ]
            })
          );
        })
        .run();
    });
  }

  /**
   * Verify FFmpeg is installed and has required codecs
   */
  async verifyFFmpegInstalled(): Promise<FFmpegVerifyResult> {
    return new Promise((resolve, reject) => {
      ffmpeg.getAvailableFormats((err) => {
        if (err) {
          reject(
            new AppError(ErrorCodes.FFmpegNotFound, {
              diagnoses: [
                {
                  name: 'error',
                  message: err.message,
                  severity: DiagnoseSeverity.Error
                }
              ]
            })
          );
          return;
        }

        ffmpeg.getAvailableCodecs((codecErr, codecs) => {
          if (codecErr) {
            reject(
              new AppError(ErrorCodes.FFmpegNotFound, {
                diagnoses: [
                  {
                    name: 'error',
                    message: codecErr.message,
                    severity: DiagnoseSeverity.Error
                  }
                ]
              })
            );
            return;
          }

          const hasLibmp3lame = !!codecs['libmp3lame'];
          const hasAac = !!codecs['aac'];
          const hasPcm = !!codecs['pcm_s16le'];

          if (!hasLibmp3lame) {
            reject(
              new AppError(ErrorCodes.FFmpegMissingCodec, {
                diagnoses: [
                  {
                    name: 'codec',
                    message: 'libmp3lame',
                    severity: DiagnoseSeverity.Error
                  }
                ]
              })
            );
            return;
          }

          // Get version through ffprobe
          ffmpeg.ffprobe('', () => {
            // ffprobe on empty string will error but give us version info
            const version = 'ffmpeg available';
            resolve({
              version,
              codecs: {
                libmp3lame: hasLibmp3lame,
                aac: hasAac,
                pcm_s16le: hasPcm
              }
            });
          });
        });
      });
    });
  }

  /**
   * Clean up temporary work directory
   */
  async cleanupWorkdir(workdirPath: string): Promise<void> {
    try {
      await rm(workdirPath, { recursive: true, force: true });
      this.logger.debug('Cleaned up workdir', { workdirPath });
    } catch (error) {
      // Log but don't throw - cleanup failure shouldn't fail the operation
      this.logger.warn('Failed to cleanup workdir', {
        workdirPath,
        error: error instanceof Error ? error.message : 'Unknown'
      });
    }
  }

  /**
   * Create a temporary working directory for mixing
   */
  private async createWorkdir(storyId: string): Promise<string> {
    const workdir = join(TEMP_DIR_BASE, `${WORKDIR_PREFIX}-${storyId}-${randomUUID().slice(0, 8)}`);
    await mkdir(workdir, { recursive: true });
    return workdir;
  }

  /**
   * Download all audio files from S3 to the local workdir
   */
  private async downloadAudioFiles(
    input: MixStoryInput,
    workdir: string
  ): Promise<{
    voice: string[];
    music?: string;
    ambiance?: string;
    sfx: string[];
  }> {
    const { voice, music, ambiance, sfx } = input;

    // Download voice segments
    const voiceFiles = await Promise.all(
      voice.segments.map(async (segment, index) => {
        const localPath = join(workdir, `voice-${index}.mp3`);
        const buffer = await this.storage.download(segment.path);
        await writeFile(localPath, buffer);
        return localPath;
      })
    );

    // Download music if present
    let musicFile: string | undefined;
    if (music) {
      musicFile = join(workdir, 'music.mp3');
      const buffer = await this.storage.download(music.file.path);
      await writeFile(musicFile, buffer);
    }

    // Download ambiance if present
    let ambianceFile: string | undefined;
    if (ambiance) {
      ambianceFile = join(workdir, 'ambiance.mp3');
      const buffer = await this.storage.download(ambiance.file.path);
      await writeFile(ambianceFile, buffer);
    }

    // Download SFX files
    const sfxFiles = sfx
      ? await Promise.all(
          sfx.files.map(async (file, index) => {
            const localPath = join(workdir, `sfx-${index}.mp3`);
            const buffer = await this.storage.download(file.path);
            await writeFile(localPath, buffer);
            return localPath;
          })
        )
      : [];

    this.logger.debug('Downloaded audio files', {
      voiceCount: voiceFiles.length,
      hasMusic: !!musicFile,
      hasAmbiance: !!ambianceFile,
      sfxCount: sfxFiles.length
    });

    return {
      voice: voiceFiles,
      music: musicFile,
      ambiance: ambianceFile,
      sfx: sfxFiles
    };
  }

  /**
   * Create voice timeline by concatenating segments with pauses
   */
  private async createVoiceTimeline(voice: VoiceTrackInput, voiceFiles: string[], workdir: string): Promise<string> {
    const concatListPath = join(workdir, INTERMEDIATE_FILES.concatList);
    const outputPath = join(workdir, INTERMEDIATE_FILES.voiceTimeline);

    // Build concat file content with silence for pauses
    const concatEntries: string[] = [];

    for (let i = 0; i < voiceFiles.length; i++) {
      const voicePath = voiceFiles[i];
      if (voicePath) {
        concatEntries.push(`file '${voicePath}'`);
      }

      // Check if there's a pause after this segment
      const pauseDuration = voice.pauses.get(i);
      if (pauseDuration && pauseDuration > 0) {
        const silencePath = join(workdir, `silence-${i}.wav`);
        await this.generateSilence(pauseDuration, silencePath);
        concatEntries.push(`file '${silencePath}'`);
      }
    }

    // Write concat list file
    await writeFile(concatListPath, concatEntries.join('\n'));

    // Run FFmpeg concat
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new AppError(ErrorCodes.FFmpegTimeout, {
            diagnoses: [
              {
                name: 'operation',
                message: 'createVoiceTimeline',
                severity: DiagnoseSeverity.Info
              }
            ]
          })
        );
      }, FFMPEG_TIMEOUT_MS);

      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .audioCodec('pcm_s16le')
        .audioChannels(2)
        .audioFrequency(44100)
        .output(outputPath)
        .on('end', () => {
          clearTimeout(timeout);
          this.logger.debug('Voice timeline created', { outputPath });
          resolve(outputPath);
        })
        .on('error', (err: Error) => {
          clearTimeout(timeout);
          reject(
            new AppError(ErrorCodes.FFmpegMixingFailed, {
              diagnoses: [
                {
                  name: 'operation',
                  message: 'createVoiceTimeline',
                  severity: DiagnoseSeverity.Info
                },
                {
                  name: 'error',
                  message: err.message,
                  severity: DiagnoseSeverity.Error
                }
              ]
            })
          );
        })
        .run();
    });
  }

  /**
   * Mix all tracks together using complex filter graph
   */
  private async mixAllTracks(
    voiceTimelinePath: string,
    voiceDuration: number,
    downloadedFiles: { voice: string[]; music?: string; ambiance?: string; sfx: string[] },
    tracks: { music?: MusicTrackInput; ambiance?: AmbianceTrackInput; sfx?: SfxTrackInput },
    workdir: string
  ): Promise<string> {
    const outputPath = join(workdir, INTERMEDIATE_FILES.mixed);
    const { music, ambiance, sfx } = tracks;

    // If only voice track, just copy it
    if (!music && !ambiance && (!sfx || sfx.files.length === 0)) {
      return new Promise((resolve, reject) => {
        ffmpeg()
          .input(voiceTimelinePath)
          .audioCodec('pcm_s16le')
          .output(outputPath)
          .on('end', () => resolve(outputPath))
          .on('error', (err: Error) =>
            reject(
              new AppError(ErrorCodes.FFmpegMixingFailed, {
                diagnoses: [
                  {
                    name: 'operation',
                    message: 'copyVoice',
                    severity: DiagnoseSeverity.Info
                  },
                  {
                    name: 'error',
                    message: err.message,
                    severity: DiagnoseSeverity.Error
                  }
                ]
              })
            )
          )
          .run();
      });
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new AppError(ErrorCodes.FFmpegTimeout, {
            diagnoses: [
              {
                name: 'operation',
                message: 'mixAllTracks',
                severity: DiagnoseSeverity.Info
              }
            ]
          })
        );
      }, FFMPEG_TIMEOUT_MS);

      const command = ffmpeg();

      // Add voice input (always first - index 0)
      command.input(voiceTimelinePath);

      // Track inputs and build filter graph
      const filterParts: string[] = [];
      const mixInputs: string[] = [];
      let inputIndex = 1;

      // Check if we need sidechain (only when music has ducking enabled)
      const needsSidechain = music?.enableDucking ?? false;

      // Voice processing - only split if we need sidechain for ducking
      if (needsSidechain) {
        filterParts.push('[0:a]asplit=2[voice_main][voice_sc]');
        mixInputs.push('[voice_main]');
      } else {
        // Just use voice directly without splitting
        filterParts.push('[0:a]acopy[voice_main]');
        mixInputs.push('[voice_main]');
      }

      // Music track with ducking
      if (music && downloadedFiles.music) {
        command.input(downloadedFiles.music);
        const musicVolume = music.volume ?? DEFAULT_VOLUMES.music;

        if (music.enableDucking) {
          const d = { ...DUCKING_DEFAULTS, ...music.ducking };
          filterParts.push(
            `[${inputIndex}:a]${FILTER_TEMPLATES.volume(musicVolume)}[music_vol]`,
            `[music_vol][voice_sc]${FILTER_TEMPLATES.sidechainCompress(d.threshold, d.ratio, d.attackMs, d.releaseMs)}[music_ducked]`
          );
          mixInputs.push('[music_ducked]');
        } else {
          filterParts.push(`[${inputIndex}:a]${FILTER_TEMPLATES.volume(musicVolume)}[music_vol]`);
          mixInputs.push('[music_vol]');
        }
        inputIndex++;
      }

      // Ambiance track with loop
      if (ambiance && downloadedFiles.ambiance) {
        command.input(downloadedFiles.ambiance);
        const ambianceVolume = ambiance.volume ?? DEFAULT_VOLUMES.ambiance;

        if (ambiance.loop) {
          filterParts.push(`[${inputIndex}:a]${FILTER_TEMPLATES.aloop()},atrim=0:${voiceDuration},${FILTER_TEMPLATES.volume(ambianceVolume)}[ambiance_loop]`);
        } else {
          filterParts.push(`[${inputIndex}:a]${FILTER_TEMPLATES.volume(ambianceVolume)}[ambiance_loop]`);
        }
        mixInputs.push('[ambiance_loop]');
        inputIndex++;
      }

      // SFX tracks with timing
      if (sfx && sfx.files.length > 0 && downloadedFiles.sfx.length > 0) {
        const sfxVolume = sfx.volume ?? DEFAULT_VOLUMES.sfx;

        sfx.files.forEach((file, i) => {
          const sfxPath = downloadedFiles.sfx[i];
          if (sfxPath) {
            command.input(sfxPath);
            const delayMs = (file.startTime ?? 0) * 1000;
            const fileVolume = file.volume ?? sfxVolume;

            filterParts.push(`[${inputIndex}:a]${FILTER_TEMPLATES.adelay(delayMs)},${FILTER_TEMPLATES.volume(fileVolume)}[sfx_${i}]`);
            mixInputs.push(`[sfx_${i}]`);
            inputIndex++;
          }
        });
      }

      // Final mix
      const amixFilter = FILTER_TEMPLATES.amix(mixInputs.length);
      filterParts.push(`${mixInputs.join('')}${amixFilter}[mixed]`);

      const filterGraph = filterParts.join(';');
      this.logger.debug('Built filter graph', { filterGraph });

      command
        .complexFilter(filterGraph, 'mixed')
        .audioCodec('pcm_s16le')
        .audioChannels(2)
        .audioFrequency(44100)
        .output(outputPath)
        .on('end', () => {
          clearTimeout(timeout);
          this.logger.debug('All tracks mixed', { outputPath });
          resolve(outputPath);
        })
        .on('error', (err: Error) => {
          clearTimeout(timeout);
          reject(
            new AppError(ErrorCodes.FFmpegMixingFailed, {
              diagnoses: [
                {
                  name: 'operation',
                  message: 'mixAllTracks',
                  severity: DiagnoseSeverity.Info
                },
                {
                  name: 'error',
                  message: err.message,
                  severity: DiagnoseSeverity.Error
                },
                {
                  name: 'filterGraph',
                  message: filterGraph,
                  severity: DiagnoseSeverity.Info
                }
              ]
            })
          );
        })
        .run();
    });
  }

  /**
   * Apply EBU R128 loudness normalization
   */
  private async applyNormalization(inputPath: string, workdir: string): Promise<string> {
    const outputPath = join(workdir, INTERMEDIATE_FILES.normalized);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new AppError(ErrorCodes.FFmpegTimeout, {
            diagnoses: [
              {
                name: 'operation',
                message: 'applyNormalization',
                severity: DiagnoseSeverity.Info
              }
            ]
          })
        );
      }, FFMPEG_TIMEOUT_MS);

      ffmpeg()
        .input(inputPath)
        .audioFilters(FILTER_TEMPLATES.loudnorm())
        .audioCodec('pcm_s16le')
        .audioChannels(2)
        .audioFrequency(44100)
        .output(outputPath)
        .on('end', () => {
          clearTimeout(timeout);
          this.logger.debug('Normalization applied', { outputPath });
          resolve(outputPath);
        })
        .on('error', (err: Error) => {
          clearTimeout(timeout);
          reject(
            new AppError(ErrorCodes.FFmpegMixingFailed, {
              diagnoses: [
                {
                  name: 'operation',
                  message: 'applyNormalization',
                  severity: DiagnoseSeverity.Info
                },
                {
                  name: 'error',
                  message: err.message,
                  severity: DiagnoseSeverity.Error
                }
              ]
            })
          );
        })
        .run();
    });
  }

  /**
   * Export final mix as MP3
   */
  private async exportFinalMix(inputPath: string, workdir: string, outputConfig?: MixStoryInput['output']): Promise<string> {
    const outputPath = join(workdir, INTERMEDIATE_FILES.final);
    const bitrate = outputConfig?.bitrate ?? OUTPUT_FORMAT.bitrate;
    const sampleRate = outputConfig?.sampleRate ?? OUTPUT_FORMAT.sampleRate;
    const channels = outputConfig?.channels ?? OUTPUT_FORMAT.channels;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new AppError(ErrorCodes.FFmpegTimeout, {
            diagnoses: [
              {
                name: 'operation',
                message: 'exportFinalMix',
                severity: DiagnoseSeverity.Info
              }
            ]
          })
        );
      }, FFMPEG_TIMEOUT_MS);

      ffmpeg()
        .input(inputPath)
        .audioCodec(OUTPUT_FORMAT.codec)
        .audioBitrate(bitrate)
        .audioFrequency(sampleRate)
        .audioChannels(channels)
        .output(outputPath)
        .on('end', () => {
          clearTimeout(timeout);
          this.logger.debug('Final mix exported', {
            outputPath,
            bitrate,
            sampleRate,
            channels
          });
          resolve(outputPath);
        })
        .on('error', (err: Error) => {
          clearTimeout(timeout);
          reject(
            new AppError(ErrorCodes.FFmpegMixingFailed, {
              diagnoses: [
                {
                  name: 'operation',
                  message: 'exportFinalMix',
                  severity: DiagnoseSeverity.Info
                },
                {
                  name: 'error',
                  message: err.message,
                  severity: DiagnoseSeverity.Error
                }
              ]
            })
          );
        })
        .run();
    });
  }

  /**
   * Get audio duration using ffprobe
   */
  private async getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new AppError(ErrorCodes.FFmpegTimeout, {
            diagnoses: [
              {
                name: 'operation',
                message: 'getAudioDuration',
                severity: DiagnoseSeverity.Info
              },
              {
                name: 'filePath',
                message: filePath,
                severity: DiagnoseSeverity.Info
              }
            ]
          })
        );
      }, PROBE_TIMEOUT_MS);

      ffmpeg.ffprobe(filePath, (err, metadata) => {
        clearTimeout(timeout);
        if (err) {
          reject(
            new AppError(ErrorCodes.FFmpegInvalidInput, {
              diagnoses: [
                {
                  name: 'operation',
                  message: 'getAudioDuration',
                  severity: DiagnoseSeverity.Info
                },
                {
                  name: 'filePath',
                  message: filePath,
                  severity: DiagnoseSeverity.Info
                },
                {
                  name: 'error',
                  message: err.message,
                  severity: DiagnoseSeverity.Error
                }
              ]
            })
          );
          return;
        }

        const duration = metadata.format.duration ?? 0;
        resolve(duration);
      });
    });
  }
}
