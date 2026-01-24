/**
 * Repositories Module
 *
 * External API clients (formerly "providers") organized by domain.
 * Repositories are responsible for:
 * - API communication with external services
 * - Request/response handling
 * - Error translation to AppError
 */

export * from './audio';
export * from './llm';
