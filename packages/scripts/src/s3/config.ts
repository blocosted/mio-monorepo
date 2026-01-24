/**
 * S3/Storage Bucket Configuration
 *
 * Define all buckets and their policies here.
 * This is the source of truth for storage infrastructure.
 */

export interface BucketPolicy {
  /** Policy name */
  name: string;
  /** SQL definition for the policy */
  definition: string;
}

export interface BucketConfig {
  /** Bucket name */
  name: string;
  /** Whether the bucket is public (allows anonymous reads) */
  public: boolean;
  /** Allowed MIME types (empty = all allowed) */
  allowedMimeTypes?: string[];
  /** Max file size in bytes (null = no limit) */
  maxFileSize?: number | null;
  /** Description of the bucket's purpose */
  description: string;
}

/**
 * All buckets required by the application
 */
export const BUCKETS: BucketConfig[] = [
  {
    name: 'audio',
    public: true,
    allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg'],
    maxFileSize: null, // Use Supabase default limit
    description: 'Audio files for generated stories (final mixes, voice clips, SFX)'
  }
];

/**
 * Get bucket config by name
 */
export function getBucketConfig(name: string): BucketConfig | undefined {
  return BUCKETS.find((b) => b.name === name);
}
