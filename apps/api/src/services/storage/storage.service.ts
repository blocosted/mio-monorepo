/**
 * Storage Service Implementation
 *
 * Handles file storage operations using S3-compatible storage (Supabase via Bun.S3Client).
 * Uses Inversify for dependency injection.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { AppError, ErrorCodes, DiagnoseSeverity } from '@mio/shared';

import { IocConnection, BUCKETS } from '../../ioc';
import type { IStorageClient } from '@mio/shared/server/connections/storage';
import { environment } from '@mio/shared/constants/environment.constants';
import type { IStorageService, UploadResult, UploadOptions } from './storage.service.types';

/**
 * Storage Service
 *
 * Provides file storage operations (upload, download, delete)
 * using Supabase Storage as the backend.
 */
@injectable()
export class StorageService implements IStorageService {
    constructor(
        @inject(IocConnection.STORAGE) private readonly client: IStorageClient
    ) { }

    /**
     * Upload a file to storage
     */
    async upload(
        file: Buffer,
        path: string,
        options: UploadOptions = {}
    ): Promise<UploadResult> {
        const { contentType = 'audio/mpeg', upsert = true } = options;
        try {
            await this.client.upload(BUCKETS.AUDIO, path, file, {
                contentType,
                upsert,
            });

            const publicUrl = this.getPublicUrl(path);

            return {
                url: publicUrl,
                path,
            };
        } catch (error) {
            throw new AppError(ErrorCodes.StorageUploadFailed, {
                diagnoses: [
                    {
                        name: 'storage_error',
                        message: error instanceof Error ? error.message : 'Unknown error',
                        severity: DiagnoseSeverity.Error,
                    },
                    {
                        name: 'path',
                        message: path,
                        severity: DiagnoseSeverity.Info,
                    },
                ],
            });
        }
    }

    /**
     * Download a file from storage
     */
    async download(path: string): Promise<Buffer> {
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
                            severity: DiagnoseSeverity.Info,
                        },
                    ],
                });
            }

            throw new AppError(ErrorCodes.StorageDownloadFailed, {
                diagnoses: [
                    {
                        name: 'storage_error',
                        message,
                        severity: DiagnoseSeverity.Error,
                    },
                ],
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
                        severity: DiagnoseSeverity.Error,
                    },
                    {
                        name: 'path',
                        message: path,
                        severity: DiagnoseSeverity.Info,
                    },
                ],
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
                        severity: DiagnoseSeverity.Error,
                    },
                    {
                        name: 'paths_count',
                        message: `${paths.length} files`,
                        severity: DiagnoseSeverity.Info,
                    },
                ],
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
