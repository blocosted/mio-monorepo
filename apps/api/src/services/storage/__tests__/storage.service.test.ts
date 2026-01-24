/**
 * StorageService unit tests (no network).
 */

import type { IStorageClient } from '@mio/shared/server/connections/storage';
import { ErrorCodes } from '@mio/shared';
import { loadEnvironmentFromValues, syncEnvironmentToProcessEnv } from '@mio/shared/constants/environment.constants';

import { StorageService } from '../storage.service';
import { describe, expect, it } from 'bun:test';

function setSupabaseUrl(url: string) {
  loadEnvironmentFromValues({ SUPABASE_URL: url }, { override: true });
  syncEnvironmentToProcessEnv();
}

describe('StorageService', () => {
  it('uploads and returns public url', async () => {
    setSupabaseUrl('https://example.supabase.co/');

    const client: IStorageClient = {
      upload: async () => undefined,
      download: async () => Buffer.from('x'),
      delete: async () => undefined,
      deleteMany: async () => undefined,
      exists: async () => true
    };

    const service = new StorageService(client);
    const res = await service.upload(Buffer.from('audio'), 'a folder/file name.mp3');

    expect(res.path).toBe('a folder/file name.mp3');
    expect(res.url).toBe('https://example.supabase.co/storage/v1/object/public/audio/a%20folder/file%20name.mp3');
  });

  it('maps upload errors to AppError(StorageUploadFailed)', async () => {
    setSupabaseUrl('https://example.supabase.co');

    const client: IStorageClient = {
      upload: async () => {
        throw new Error('nope');
      },
      download: async () => Buffer.from('x'),
      delete: async () => undefined,
      deleteMany: async () => undefined,
      exists: async () => true
    };

    const service = new StorageService(client);
    await expect(service.upload(Buffer.from('x'), 'file.mp3')).rejects.toMatchObject({
      code: ErrorCodes.StorageUploadFailed
    });
  });

  it('maps not found downloads to AppError(StorageFileNotFound)', async () => {
    const client: IStorageClient = {
      upload: async () => undefined,
      download: async () => {
        throw new Error('NoSuchKey');
      },
      delete: async () => undefined,
      deleteMany: async () => undefined,
      exists: async () => false
    };

    const service = new StorageService(client);
    await expect(service.download('missing.mp3')).rejects.toMatchObject({
      code: ErrorCodes.StorageFileNotFound
    });
  });

  it('maps other download errors to AppError(StorageDownloadFailed)', async () => {
    const client: IStorageClient = {
      upload: async () => undefined,
      download: async () => {
        throw new Error('timeout');
      },
      delete: async () => undefined,
      deleteMany: async () => undefined,
      exists: async () => false
    };

    const service = new StorageService(client);
    await expect(service.download('file.mp3')).rejects.toMatchObject({
      code: ErrorCodes.StorageDownloadFailed
    });
  });

  it('maps delete errors to AppError(StorageDeleteFailed)', async () => {
    const client: IStorageClient = {
      upload: async () => undefined,
      download: async () => Buffer.from('x'),
      delete: async () => {
        throw new Error('nope');
      },
      deleteMany: async () => undefined,
      exists: async () => true
    };

    const service = new StorageService(client);
    await expect(service.delete('file.mp3')).rejects.toMatchObject({
      code: ErrorCodes.StorageDeleteFailed
    });
  });

  it('deleteMany is a no-op for empty list', async () => {
    let called = false;
    const client: IStorageClient = {
      upload: async () => undefined,
      download: async () => Buffer.from('x'),
      delete: async () => undefined,
      deleteMany: async () => {
        called = true;
      },
      exists: async () => true
    };

    const service = new StorageService(client);
    await service.deleteMany([]);
    expect(called).toBe(false);
  });

  it('exists returns false on client error', async () => {
    const client: IStorageClient = {
      upload: async () => undefined,
      download: async () => Buffer.from('x'),
      delete: async () => undefined,
      deleteMany: async () => undefined,
      exists: async () => {
        throw new Error('boom');
      }
    };

    const service = new StorageService(client);
    expect(await service.exists('x')).toBe(false);
  });
});
