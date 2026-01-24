/**
 * S3/Storage CLI Commands
 */

import { getSupabaseAdmin } from './client';
import { BUCKETS, type BucketConfig } from './config';

/**
 * List all buckets in Supabase Storage
 */
export async function listBuckets(): Promise<void> {
  const client = getSupabaseAdmin();
  const { data: buckets, error } = await client.storage.listBuckets();

  if (error) {
    throw new Error(`Failed to list buckets: ${error.message}`);
  }

  if (buckets.length === 0) {
    return;
  }

  for (const bucket of buckets) {
    const configuredBucket = BUCKETS.find((b) => b.name === bucket.name);
    const _status = configuredBucket ? '✅' : '⚠️ ';
    const _publicLabel = bucket.public ? '(public)' : '(private)';

    if (configuredBucket) {
    } else {
    }
  }

  // Show missing buckets
  const existingNames = new Set(buckets.map((b) => b.name));
  const missingBuckets = BUCKETS.filter((b) => !existingNames.has(b.name));

  if (missingBuckets.length > 0) {
    for (const _bucket of missingBuckets) {
    }
  }
}

/**
 * Create a single bucket
 */
async function createBucket(config: BucketConfig): Promise<boolean> {
  const client = getSupabaseAdmin();

  const { error } = await client.storage.createBucket(config.name, {
    public: config.public,
    allowedMimeTypes: config.allowedMimeTypes,
    fileSizeLimit: config.maxFileSize ?? undefined
  });

  if (error) {
    if (error.message.includes('already exists')) {
      return true;
    }
    console.error(`   ❌ Failed to create ${config.name}: ${error.message}`);
    return false;
  }
  return true;
}

/**
 * Setup all buckets defined in config
 */
export async function setupBuckets(): Promise<void> {
  let _successCount = 0;
  let failCount = 0;

  for (const bucketConfig of BUCKETS) {
    const success = await createBucket(bucketConfig);
    if (success) {
      _successCount++;
    } else {
      failCount++;
    }
  }
  if (failCount > 0) {
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

/**
 * Delete a bucket
 */
export async function deleteBucket(name: string, force = false): Promise<void> {
  const client = getSupabaseAdmin();

  if (force) {
    const { data: files, error: listError } = await client.storage.from(name).list();

    if (listError) {
      throw new Error(`Failed to list files: ${listError.message}`);
    }

    if (files && files.length > 0) {
      const paths = files.map((f) => f.name);
      const { error: deleteError } = await client.storage.from(name).remove(paths);

      if (deleteError) {
        throw new Error(`Failed to delete files: ${deleteError.message}`);
      }
    }
  }

  const { error } = await client.storage.deleteBucket(name);

  if (error) {
    throw new Error(`Failed to delete bucket: ${error.message}`);
  }
}

/**
 * Show bucket details
 */
export async function showBucket(name: string): Promise<void> {
  const client = getSupabaseAdmin();

  const { data: bucket, error } = await client.storage.getBucket(name);

  if (error) {
    throw new Error(`Failed to get bucket: ${error.message}`);
  }

  const configuredBucket = BUCKETS.find((b) => b.name === name);

  if (bucket.file_size_limit) {
  }

  if (bucket.allowed_mime_types && bucket.allowed_mime_types.length > 0) {
  }

  if (configuredBucket) {
  } else {
  }

  // List files
  const { data: files, error: listError } = await client.storage.from(name).list('', {
    limit: 10
  });

  if (!listError && files) {
    if (files.length === 0) {
    } else {
      for (const file of files) {
        const _size = file.metadata?.size ? `(${(file.metadata.size / 1024).toFixed(1)} KB)` : '';
      }
    }
  }
}
