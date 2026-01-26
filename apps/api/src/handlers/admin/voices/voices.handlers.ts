/**
 * Voices Admin Handlers
 *
 * API endpoints for voice registry admin operations.
 */

import { Elysia } from 'elysia';

import type { VoiceAge, VoiceGender, VoiceUseCase } from '@mio/shared/types';

import { IocService } from '../../../ioc/ioc.types';
import { getInstance } from '../../../ioc/ioc.config';
import type { VoiceRegistryService } from '../../../services/narration/voice-registry.service';
import { VoiceFilterQuerySchema } from './voices.handlers.types';

export const voicesHandlers = new Elysia({ tags: ['admin'] }).get(
  '/voices',
  async ({ query }) => {
    const voiceService = getInstance<VoiceRegistryService>(IocService.VOICE_REGISTRY);

    const result = await voiceService.findPaginated(
      {
        gender: query.gender as VoiceGender | undefined,
        age: query.age as VoiceAge | undefined,
        language: query.language,
        useCase: query.useCase as VoiceUseCase | undefined,
        isHighQuality: query.isHighQuality,
        search: query.search
      },
      {
        cursor: query.cursor,
        limit: query.limit
      }
    );

    return {
      data: result.rows,
      nextCursor: result.nextCursor,
      prevCursor: null,
      hasMore: result.hasMore
    };
  },
  {
    query: VoiceFilterQuerySchema
  }
);
