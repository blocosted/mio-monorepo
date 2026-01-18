/**
 * Storage Service Types
 */

/**
 * Result of an upload operation
 */
export interface UploadResult {
    /** Public URL of the uploaded file */
    url: string;
    /** Path of the file in storage */
    path: string;
}

/**
 * Options for upload operation
 */
export interface UploadOptions {
    /** Content type of the file (e.g., 'audio/mpeg') */
    contentType?: string;
    /** Whether to upsert (overwrite if exists) */
    upsert?: boolean;
}

/**
 * Storage Service Interface
 */
export interface IStorageService {
    /**
     * Upload a file to storage
     * @param file - File buffer to upload
     * @param path - Path in the bucket (e.g., 'stories/123/final.mp3')
     * @param options - Upload options
     * @returns Upload result with URL and path
     */
    upload(file: Buffer, path: string, options?: UploadOptions): Promise<UploadResult>;

    /**
     * Download a file from storage
     * @param path - Path of the file to download
     * @returns File contents as Buffer
     */
    download(path: string): Promise<Buffer>;

    /**
     * Delete a file from storage
     * @param path - Path of the file to delete
     */
    delete(path: string): Promise<void>;

    /**
     * Delete multiple files from storage
     * @param paths - Paths of the files to delete
     */
    deleteMany(paths: string[]): Promise<void>;

    /**
     * Get the public URL for a file
     * @param path - Path of the file
     * @returns Public URL
     */
    getPublicUrl(path: string): string;

    /**
     * Check if a file exists in storage
     * @param path - Path of the file
     * @returns True if file exists
     */
    exists(path: string): Promise<boolean>;
}
