/**
 * Music Generator Service Types
 *
 * Types for music generation service.
 */

/**
 * Music generation input
 */
export interface GenerateMusicInput {
    description: string;
    mood: string;
    duration: number;
}

/**
 * Music generation result
 */
export interface GenerateMusicResult {
    audioBuffer: Buffer;
    duration: number;
}

/**
 * Music Generator Service Interface
 */
export interface IMusicGeneratorService {
    /**
     * Generate music from description
     */
    generateMusic(input: GenerateMusicInput): Promise<GenerateMusicResult>;
}
