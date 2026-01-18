/**
 * Storage Service Implementation
 *
 * Handles file storage operations using Supabase Storage.
 * Uses Inversify for dependency injection.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError, ErrorCodes, DiagnoseSeverity } from '@mio/shared';

import { TYPES } from '../../container/types';
import type { StorageConfig } from '../../container/container';
import type { IStorageService, UploadResult, UploadOptions } from './storage.service.types';

/**
 * Storage Service
 *
 * Provides file storage operations (upload, download, delete)
 * using Supabase Storage as the backend.
 */
@injectable()
export class StorageService implements IStorageService {
    private readonly storage: ReturnType<SupabaseClient['storage']['from']>;

    constructor(
        @inject(TYPES.SupabaseClient) private readonly client: SupabaseClient,
        @inject(TYPES.StorageConfig) private readonly config: StorageConfig
    ) {
        this.storage = this.client.storage.from(this.config.defaultBucket);
    }

    /**
     * Upload a file to storage
     */
    async upload(
        file: Buffer,
        path: string,
        options: UploadOptions = {}
    ): Promise<UploadResult> {
        const { contentType = 'audio/mpeg', upsert = true } = options;

        const { data, error } = await this.storage.upload(path, file, {
            contentType,
            upsert,
        });

        if (error) {
            throw new AppError(ErrorCodes.StorageUploadFailed, {
                diagnoses: [
                    {
                        name: 'storage_error',
                        message: error.message,
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

        const publicUrl = this.getPublicUrl(path);

        return {
            url: publicUrl,
            path: data.path,
        };
    }

    /**
     * Download a file from storage
     */
    async download(path: string): Promise<Buffer> {
        const { data, error } = await this.storage.download(path);

        if (error) {
            if (error.message.includes('not found') || error.message.includes('404')) {
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
                        message: error.message,
                        severity: DiagnoseSeverity.Error,
                    },
                ],
            });
        }

        const arrayBuffer = await data.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }

    /**
     * Delete a file from storage
     */
    async delete(path: string): Promise<void> {
        const { error } = await this.storage.remove([path]);

        if (error) {
            throw new AppError(ErrorCodes.StorageDeleteFailed, {
                diagnoses: [
                    {
                        name: 'storage_error',
                        message: error.message,
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

        const { error } = await this.storage.remove(paths);

        if (error) {
            throw new AppError(ErrorCodes.StorageDeleteFailed, {
                diagnoses: [
                    {
                        name: 'storage_error',
                        message: error.message,
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
        const { data } = this.storage.getPublicUrl(path);
        return data.publicUrl;
    }

    /**
     * Check if a file exists in storage
     */
    async exists(path: string): Promise<boolean> {
        const dirPath = path.split('/').slice(0, -1).join('/');
        const fileName = path.split('/').pop();

        const { data, error } = await this.storage.list(dirPath, {
            limit: 100,
            search: fileName,
        });

        if (error) {
            return false;
        }

        return data.some((file) => file.name === fileName);
    }
}
