/**
 * @mio/shared
 *
 * Shared types, constants, and errors for Mio
 *
 * Note: Only primitive/shared types (enum-like literals) should live in `./types`.
 * Each layer (handlers/services/store) declares its own interfaces.
 */

// Constants (includes errors and HTTP types)
export * from './constants';
// Types (primitive/shared only)
export * from './types';
