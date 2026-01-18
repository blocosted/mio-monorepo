import { Elysia } from 'elysia';
import { AppError, ErrorCodes, errorFromCode } from '@mio/shared';

/**
 * Centralized error handler plugin for Elysia
 */
export const errorHandler = new Elysia({ name: 'errorHandler' }).onError(
  ({ error, set }) => {
    // Handle AppError instances
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        error: error.message,
        code: error.code,
        name: error.name,
        diagnoses: error.diagnoses,
      };
    }

    // Handle Elysia validation errors (error is Error type here)
    if (error instanceof Error && error.name === 'ValidationError') {
      const validationError = errorFromCode(ErrorCodes.ValidationError);
      set.status = validationError.statusCode;
      return {
        error: validationError.message,
        code: validationError.code,
        name: validationError.name,
        details: error.message,
      };
    }

    // Handle unexpected errors
    console.error('Unexpected error:', error);
    const internalError = errorFromCode(ErrorCodes.InternalError);
    set.status = internalError.statusCode;
    return {
      error: internalError.message,
      code: internalError.code,
      name: internalError.name,
    };
  }
);

// Re-export error utilities for convenience
export { AppError, ErrorCodes, errorFromCode, errorMessage } from '@mio/shared';
