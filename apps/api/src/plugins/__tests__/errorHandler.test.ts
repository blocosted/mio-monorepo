/**
 * errorHandler plugin tests
 *
 * Ensures AppError + unexpected errors are mapped to stable HTTP responses.
 */

import { describe, it, expect } from 'bun:test';
import { Elysia, t } from 'elysia';
import { treaty } from '@elysiajs/eden';

import { errorHandler } from '../errorHandler';
import { AppError, ErrorCodes } from '@mio/shared';

describe('errorHandler', () => {
  it('formats AppError', async () => {
    const app = new Elysia()
      .use(errorHandler)
      .get('/boom', () => {
        throw new AppError(ErrorCodes.NotFound, { name: 'Boom' });
      });

    const api = treaty(app);
    const res = await api.boom.get();

    expect(res.status).toBe(404);
    expect(res.error).not.toBeNull();
    // Eden wraps error payload as { status, value }
    expect(res.error?.value).toMatchObject({ code: ErrorCodes.NotFound, name: 'Boom' });
  });

  it('formats validation-like errors (error.name = ValidationError)', async () => {
    const app = new Elysia()
      .use(errorHandler)
      .post(
        '/validate',
        ({ body }) => body,
        {
          body: t.Object({ name: t.String({ minLength: 3 }) }),
        }
      );

    const api = treaty(app);
    const res = await api.validate.post({ name: 'x' });

    // The plugin maps this to our own ValidationError AppError payload
    expect(res.status).toBe(400);
    expect(res.error?.value).toMatchObject({ code: ErrorCodes.ValidationError });
  });

  it('formats unexpected errors', async () => {
    const app = new Elysia()
      .use(errorHandler)
      .get('/crash', () => {
        throw new Error('boom');
      });

    const api = treaty(app);
    const res = await api.crash.get();

    expect(res.status).toBe(500);
    expect(res.error?.value).toMatchObject({ code: ErrorCodes.InternalError });
  });
});

