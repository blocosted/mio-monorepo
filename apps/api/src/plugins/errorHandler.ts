import { Elysia, ValidationError } from 'elysia';
import { AppError, ErrorCodes, errorFromCode } from '@mio/shared';
import { container, getInstance } from '../ioc';
import { IocInfrastructure } from '../ioc/ioc.types';
import type { Logger } from '@mio/shared/server/logger';

/**
 * Centralized error handler plugin for Elysia
 */
export const errorHandler = (app: Elysia) =>
  app.onError(({ error, set }) => {
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

    // Handle Elysia validation errors
    if (error instanceof ValidationError) {
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
    // Logger resolution must never crash error handling.
    let logger: Logger | null = null;
    try {
      logger = getInstance<Logger>(IocInfrastructure.LOGGER);
    } catch {
      logger = null;
    }

    if (logger) {
      logger.withError(error as Error).error('Unexpected error');
    }

    const internalError = errorFromCode(ErrorCodes.InternalError);
    set.status = internalError.statusCode;
    return {
      error: internalError.message,
      code: internalError.code,
      name: internalError.name,
    };
  });

// Re-export error utilities for convenience
export { AppError, ErrorCodes, errorFromCode, errorMessage } from '@mio/shared';
