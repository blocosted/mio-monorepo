/**
 * Stories Handlers Validation Tests
 *
 * Ensures TypeBox validation rejects invalid inputs.
 */

import { describe, it, expect } from 'bun:test';

import { treaty } from '@elysiajs/eden';

import { createApiApp } from '../../../api.server';
import { MioApiClient } from '@mio/shared/clients/mio';
import { ErrorCodes } from '@mio/shared';

describe('storiesHandlers validation', () => {
  it('rejects prompt too short', async () => {
    const app = createApiApp();
    const testApiClient = treaty(app);
    const mio = new MioApiClient({ apiClient: testApiClient });

    await expect(
      mio.stories.createStory({
        childProfileId: '00000000-0000-0000-0000-000000000000',
        prompt: 'hi',
      })
    ).rejects.toMatchObject({ code: ErrorCodes.ValidationError });
  });

  it('rejects prompt too long', async () => {
    const app = createApiApp();
    const testApiClient = treaty(app);
    const mio = new MioApiClient({ apiClient: testApiClient });
    const longPrompt = 'a'.repeat(501);

    await expect(
      mio.stories.createStory({
        childProfileId: '00000000-0000-0000-0000-000000000000',
        prompt: longPrompt,
      })
    ).rejects.toMatchObject({ code: ErrorCodes.ValidationError });
  });
});

