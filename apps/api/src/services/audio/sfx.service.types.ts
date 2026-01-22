/**
 * SFX Service Types
 *
 * Types for Sound Effects service.
 */

/**
 * SFX generation input
 */
export interface GenerateSfxInput {
    description: string;
    duration: number;
}

/**
 * SFX generation result
 */
export interface GenerateSfxResult {
    audioBuffer: Buffer;
    duration: number;
}

/**
 * SFX Service Interface
 */
export interface ISfxService {
    /**
     * Generate sound effect from description
     */
    generateSfx(input: GenerateSfxInput): Promise<GenerateSfxResult>;
}
