/**
 * Storage Connection Factory (S3)
 *
 * Encapsulates Bun's S3 client for S3-compatible storage (Supabase).
 *
 * NOTE: Server-only module (Bun).
 */

import { S3Client as BunS3Client } from 'bun';

import { environment } from '../../constants/environment.constants';

/**
 * S3 configuration (explicit, so we don't rely on implicit env reading).
 */
export interface StorageS3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpoint: string;
  sessionToken?: string;
}

/**
 * Options for upload operation
 */
export interface StorageUploadOptions {
  /** Content type of the file (e.g., 'audio/mpeg') */
  contentType?: string;
  /** Whether to overwrite if the object already exists */
  upsert?: boolean;
}

/**
 * Storage client interface (consumed by services).
 *
 * NOTE: All JSON/Buffer conversion and S3 credential usage is encapsulated here.
 */
export interface IStorageClient {
  upload(bucket: string, path: string, file: Buffer, options?: StorageUploadOptions): Promise<void>;
  download(bucket: string, path: string): Promise<Buffer>;
  delete(bucket: string, path: string): Promise<void>;
  deleteMany(bucket: string, paths: string[]): Promise<void>;
  exists(bucket: string, path: string): Promise<boolean>;
}

export class StorageClient implements IStorageClient {
  private readonly s3: BunS3Client;

  constructor(config: StorageS3Config) {
    this.s3 = new BunS3Client({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      sessionToken: config.sessionToken,
      region: config.region,
      endpoint: config.endpoint
    });
  }

  async upload(bucket: string, path: string, file: Buffer, options: StorageUploadOptions = {}): Promise<void> {
    const { contentType = 'audio/mpeg', upsert = true } = options;

    if (!upsert) {
      const alreadyExists = await this.exists(bucket, path);
      if (alreadyExists) {
        throw new Error(`Storage object already exists: ${bucket}/${path}`);
      }
    }

    const s3File = this.s3.file(path, { bucket });
    await s3File.write(file, { type: contentType });
  }

  async download(bucket: string, path: string): Promise<Buffer> {
    const s3File = this.s3.file(path, { bucket });
    const arrayBuffer = await s3File.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(bucket: string, path: string): Promise<void> {
    const s3File = this.s3.file(path, { bucket });
    await s3File.delete();
  }

  async deleteMany(bucket: string, paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    // Bun's S3 API deletes one object at a time; we keep it simple and safe here.
    for (const p of paths) {
      await this.delete(bucket, p);
    }
  }

  async exists(bucket: string, path: string): Promise<boolean> {
    const s3File = this.s3.file(path, { bucket });
    return await s3File.exists();
  }
}

/**
 * Create a Storage client from environment variables
 */
export function storageConnectionFactory(): StorageClient {
  const accessKeyId = environment.S3_ACCESS_KEY_ID;
  const secretAccessKey = environment.S3_SECRET_ACCESS_KEY;
  const region = environment.S3_REGION;
  const endpoint = environment.S3_ENDPOINT;
  const sessionToken = environment.S3_SESSION_TOKEN;

  if (!accessKeyId) {
    throw new Error('S3_ACCESS_KEY_ID environment variable is not set');
  }
  if (!secretAccessKey) {
    throw new Error('S3_SECRET_ACCESS_KEY environment variable is not set');
  }
  if (!region) {
    throw new Error('S3_REGION environment variable is not set');
  }
  if (!endpoint) {
    throw new Error('S3_ENDPOINT environment variable is not set');
  }

  return new StorageClient({
    accessKeyId,
    secretAccessKey,
    region,
    endpoint,
    sessionToken
  });
}
