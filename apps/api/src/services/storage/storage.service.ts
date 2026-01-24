/**
 * Storage Service Implementation
 *
 * Handles file storage operations using S3-compatible storage (Supabase via Bun.S3Client).
 * Uses Inversify for dependency injection.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { IStorageClient } from '@mio/shared/server/connections/storage';
import { AppError, DiagnoseSeverity, ErrorCodes } from '@mio/shared';
import { environment } from '@mio/shared/constants/environment.constants';

import type { IStorageService, UploadOptions, UploadResult } from './storage.service.types';
import { BUCKETS, IocConnection } from '../../ioc/ioc.types';

/**
 * Storage Service
 *
 * Provides file storage operations (upload, download, delete)
 * using Supabase Storage as the backend.
 */
@injectable()
export class StorageService implements IStorageService {
  constructor(@inject(IocConnection.STORAGE) private readonly client: IStorageClient) {}

  /**
   * Upload a file to storage
   */
  async upload(file: Buffer, path: string, options: UploadOptions = {}): Promise<UploadResult> {
    const { contentType = 'audio/mpeg', upsert = true } = options;
    try {
      await this.client.upload(BUCKETS.AUDIO, path, file, {
        contentType,
        upsert
      });

      const publicUrl = this.getPublicUrl(path);

      return {
        url: publicUrl,
        path
      };
    } catch (error) {
      throw new AppError(ErrorCodes.StorageUploadFailed, {
        diagnoses: [
          {
            name: 'storage_error',
            message: error instanceof Error ? error.message : 'Unknown error',
            severity: DiagnoseSeverity.Error
          },
          {
            name: 'path',
            message: path,
            severity: DiagnoseSeverity.Info
          }
        ]
      });
    }
  }

  /**
   * Download a file from storage
   * Accepts either a relative path or a full URL (extracts path automatically)
   */
  async download(pathOrUrl: string): Promise<Buffer> {
    const path = this.extractPathFromUrl(pathOrUrl);
    try {
      return await this.client.download(BUCKETS.AUDIO, path);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (/not found|nosuchkey|404/i.test(message)) {
        throw new AppError(ErrorCodes.StorageFileNotFound, {
          diagnoses: [
            {
              name: 'path',
              message: path,
              severity: DiagnoseSeverity.Info
            }
          ]
        });
      }

      throw new AppError(ErrorCodes.StorageDownloadFailed, {
        diagnoses: [
          {
            name: 'storage_error',
            message,
            severity: DiagnoseSeverity.Error
          }
        ]
      });
    }
  }

  /**
   * Delete a file from storage
   */
  async delete(path: string): Promise<void> {
    try {
      await this.client.delete(BUCKETS.AUDIO, path);
    } catch (error) {
      throw new AppError(ErrorCodes.StorageDeleteFailed, {
        diagnoses: [
          {
            name: 'storage_error',
            message: error instanceof Error ? error.message : 'Unknown error',
            severity: DiagnoseSeverity.Error
          },
          {
            name: 'path',
            message: path,
            severity: DiagnoseSeverity.Info
          }
        ]
      });
    }
  }

  /**
   * Delete multiple files from storage
   */
  async deleteMany(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    try {
      await this.client.deleteMany(BUCKETS.AUDIO, paths);
    } catch (error) {
      throw new AppError(ErrorCodes.StorageDeleteFailed, {
        diagnoses: [
          {
            name: 'storage_error',
            message: error instanceof Error ? error.message : 'Unknown error',
            severity: DiagnoseSeverity.Error
          },
          {
            name: 'paths_count',
            message: `${paths.length} files`,
            severity: DiagnoseSeverity.Info
          }
        ]
      });
    }
  }

  /**
   * Get the public URL for a file
   */
  getPublicUrl(path: string): string {
    const supabaseUrl = environment.SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is not set');
    }

    const base = supabaseUrl.replace(/\/$/, '');
    const encodedPath = path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    // Public bucket URL format for Supabase Storage
    return `${base}/storage/v1/object/public/${BUCKETS.AUDIO}/${encodedPath}`;
  }

  /**
   * Extract relative path from a full URL or return path as-is if already relative
   * URL format: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
   */
  private extractPathFromUrl(pathOrUrl: string): string {
    // If it's not a URL, return as-is
    if (!pathOrUrl.startsWith('http://') && !pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }

    // Extract path from Supabase Storage URL
    // Format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    const urlPattern = /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/;
    const match = pathOrUrl.match(urlPattern);

    if (match?.[1]) {
      // Decode URL-encoded path segments
      return decodeURIComponent(match[1]);
    }

    // Fallback: return original (will likely fail, but provides better error message)
    return pathOrUrl;
  }

  /**
   * Check if a file exists in storage
   */
  async exists(path: string): Promise<boolean> {
    try {
      return await this.client.exists(BUCKETS.AUDIO, path);
    } catch {
      return false;
    }
  }
}
