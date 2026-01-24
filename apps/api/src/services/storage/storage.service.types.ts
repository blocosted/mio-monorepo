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
 * Input for upload operation
 */
export interface UploadInput {
  /** Bucket name */
  bucket: string;
  /** Path in the bucket */
  path: string;
  /** File buffer to upload */
  buffer: Buffer;
  /** Content type */
  contentType?: string;
  /** Whether to upsert */
  upsert?: boolean;
}

/**
 * Input for download operation
 */
export interface DownloadInput {
  /** Bucket name */
  bucket: string;
  /** Path in the bucket */
  path: string;
}

/**
 * Input for delete operation
 */
export interface DeleteInput {
  /** Bucket name */
  bucket: string;
  /** Path in the bucket */
  path: string;
}

