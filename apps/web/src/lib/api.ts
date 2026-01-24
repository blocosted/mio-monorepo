/**
 * API client configuration
 *
 * Eden client will be configured in US-008
 * This file serves as the entry point for API communication
 */

import { publicEnvironment } from '@mio/shared/constants/public-environment.constants';

const API_URL = publicEnvironment.NEXT_PUBLIC_API_URL;

/**
 * Base fetch wrapper with error handling
 */
export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export { API_URL };
