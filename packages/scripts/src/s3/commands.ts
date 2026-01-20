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

    console.log('\n📦 Existing buckets:\n');

    if (buckets.length === 0) {
        console.log('   (no buckets found)\n');
        return;
    }

    for (const bucket of buckets) {
        const configuredBucket = BUCKETS.find((b) => b.name === bucket.name);
        const status = configuredBucket ? '✅' : '⚠️ ';
        const publicLabel = bucket.public ? '(public)' : '(private)';

        console.log(`   ${status} ${bucket.name} ${publicLabel}`);

        if (configuredBucket) {
            console.log(`      └─ ${configuredBucket.description}`);
        } else {
            console.log(`      └─ Not in config (may be orphaned)`);
        }
    }

    // Show missing buckets
    const existingNames = new Set(buckets.map((b) => b.name));
    const missingBuckets = BUCKETS.filter((b) => !existingNames.has(b.name));

    if (missingBuckets.length > 0) {
        console.log('\n❌ Missing buckets (run `setup` to create):\n');
        for (const bucket of missingBuckets) {
            console.log(`   - ${bucket.name}: ${bucket.description}`);
        }
    }

    console.log('');
}

/**
 * Create a single bucket
 */
async function createBucket(config: BucketConfig): Promise<boolean> {
    const client = getSupabaseAdmin();

    console.log(`   Creating bucket: ${config.name}...`);

    const { error } = await client.storage.createBucket(config.name, {
        public: config.public,
        allowedMimeTypes: config.allowedMimeTypes,
        fileSizeLimit: config.maxFileSize ?? undefined,
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log(`   ⏭️  Bucket ${config.name} already exists, skipping`);
            return true;
        }
        console.error(`   ❌ Failed to create ${config.name}: ${error.message}`);
        return false;
    }

    console.log(`   ✅ Created bucket: ${config.name}`);
    return true;
}

/**
 * Setup all buckets defined in config
 */
export async function setupBuckets(): Promise<void> {
    console.log('\n🚀 Setting up storage buckets...\n');

    let successCount = 0;
    let failCount = 0;

    for (const bucketConfig of BUCKETS) {
        const success = await createBucket(bucketConfig);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    if (failCount > 0) {
        console.log(`   ❌ Failed: ${failCount}`);
    }
    console.log('');

    if (failCount > 0) {
        process.exit(1);
    }
}

/**
 * Delete a bucket
 */
export async function deleteBucket(name: string, force = false): Promise<void> {
    const client = getSupabaseAdmin();

    console.log(`\n🗑️  Deleting bucket: ${name}...`);

    if (force) {
        // First, delete all files in the bucket
        console.log('   Emptying bucket first...');
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
            console.log(`   Deleted ${paths.length} files`);
        }
    }

    const { error } = await client.storage.deleteBucket(name);

    if (error) {
        throw new Error(`Failed to delete bucket: ${error.message}`);
    }

    console.log(`✅ Bucket ${name} deleted\n`);
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

    console.log(`\n📦 Bucket: ${bucket.name}\n`);
    console.log(`   ID:          ${bucket.id}`);
    console.log(`   Public:      ${bucket.public ? 'Yes' : 'No'}`);
    console.log(`   Created:     ${bucket.created_at}`);
    console.log(`   Updated:     ${bucket.updated_at}`);

    if (bucket.file_size_limit) {
        console.log(`   Size Limit:  ${(bucket.file_size_limit / 1024 / 1024).toFixed(2)} MB`);
    }

    if (bucket.allowed_mime_types && bucket.allowed_mime_types.length > 0) {
        console.log(`   MIME Types:  ${bucket.allowed_mime_types.join(', ')}`);
    }

    if (configuredBucket) {
        console.log(`\n   📋 Config:`);
        console.log(`      Description: ${configuredBucket.description}`);
    } else {
        console.log(`\n   ⚠️  This bucket is not defined in config.ts`);
    }

    // List files
    const { data: files, error: listError } = await client.storage.from(name).list('', {
        limit: 10,
    });

    if (!listError && files) {
        console.log(`\n   📁 Files (showing first 10):`);
        if (files.length === 0) {
            console.log('      (empty)');
        } else {
            for (const file of files) {
                const size = file.metadata?.size
                    ? `(${(file.metadata.size / 1024).toFixed(1)} KB)`
                    : '';
                console.log(`      - ${file.name} ${size}`);
            }
        }
    }

    console.log('');
}
