/**
 * TTS Service Types
 *
 * Types for Text-to-Speech service.
 */

/**
 * Voice generation input
 */
export interface GenerateVoiceInput {
    text: string;
    voiceId: string;
    stability?: number;
    similarityBoost?: number;
}

/**
 * Voice generation result
 */
export interface GenerateVoiceResult {
    audioBuffer: Buffer;
    duration: number;
}

/**
 * TTS Service Interface
 */
export interface ITTSService {
    /**
     * Generate voice audio from text
     */
    generateVoice(input: GenerateVoiceInput): Promise<GenerateVoiceResult>;
}
