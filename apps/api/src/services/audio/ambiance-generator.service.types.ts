/**
 * Ambiance Generator Service Types
 *
 * Types for ambiance generation service.
 */

/**
 * Ambiance generation input
 */
export interface GenerateAmbianceInput {
    description: string;
    mood: string;
    intensity: number;
    duration: number;
}

/**
 * Ambiance generation result
 */
export interface GenerateAmbianceResult {
    audioBuffer: Buffer;
    duration: number;
}

/**
 * Ambiance Generator Service Interface
 */
export interface IAmbianceGeneratorService {
    /**
     * Generate ambiance audio from description
     */
    generateAmbiance(input: GenerateAmbianceInput): Promise<GenerateAmbianceResult>;
}
