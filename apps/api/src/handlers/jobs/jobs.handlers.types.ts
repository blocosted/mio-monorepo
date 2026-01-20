import { t } from 'elysia';

export const JobIdParamsSchema = t.Object({
  id: t.String({ format: 'uuid' }),
});

