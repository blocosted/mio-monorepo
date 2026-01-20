import { treaty } from '@elysiajs/eden';

import type { MioApi } from '@mio/api';
import { DiagnoseSeverity, ErrorCodes, errorFromCode, type Diagnose } from '../../constants/error.constants';
import { publicEnvironment } from '../../constants/public-environment.constants';

import { MioApiStoriesClient } from './stories';
import { MioApiProfilesClient } from './profiles';

export type MioErrorResponse = {
    error: string;
    code: ErrorCodes;
    name: string;
    diagnoses?: Diagnose[];
    details?: string;
};

export const createApiClient = (apiUrl?: string) => {
    const url = apiUrl ?? publicEnvironment.NEXT_PUBLIC_API_URL;

    if (typeof url !== 'string' || !url) {
        throw new Error(`Invalid API URL: ${String(url)}. Expected a non-empty string.`);
    }

    return treaty<MioApi>(url, {
        fetch: {
            mode: 'cors',
            credentials: 'include',
        },
    });
};

export type MioTreatyClient = ReturnType<typeof createApiClient>;

function isMioErrorResponse(value: unknown): value is MioErrorResponse {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    return typeof v.error === 'string' && typeof v.code === 'string' && typeof v.name === 'string';
}

function normalizeTreatyErrorPayload(error: unknown): unknown {
    // Eden errors are often shaped like: { value: <json> }
    const wrapperValue = (error as { value?: unknown } | undefined)?.value;
    return wrapperValue !== undefined ? wrapperValue : error;
}

function throwFromTreatyError(error: unknown): never {
    // Eden/Elysia validation errors often come as:
    // - error: { status: 422, value: { type: 'validation', message: '...' } }
    // - or payload directly: { type: 'validation', message: '...' }
    const wrapper = error as { status?: unknown; value?: unknown } | undefined;
    const payload = normalizeTreatyErrorPayload(error) as unknown;

    const validationValue =
        wrapper && wrapper.status === 422 && wrapper.value && typeof wrapper.value === 'object'
            ? (wrapper.value as Record<string, unknown>)
            : payload && typeof payload === 'object'
              ? (payload as Record<string, unknown>)
              : null;

    if (validationValue?.type === 'validation') {
        throw errorFromCode(ErrorCodes.ValidationError, {
            name: 'ValidationError',
            diagnoses: [
                {
                    name: 'ValidationError',
                    message:
                        typeof validationValue.message === 'string'
                            ? validationValue.message
                            : 'Validation failed',
                    severity: DiagnoseSeverity.Error,
                },
            ],
        });
    }

    // Prefer Mio API error format: { error, code, name, diagnoses? }
    if (isMioErrorResponse(payload) && Object.values(ErrorCodes).includes(payload.code)) {
        throw errorFromCode(payload.code, { name: payload.name, diagnoses: payload.diagnoses });
    }

    // Compatibility: some APIs prefix fields with `$` (e.g. { $code, $message, $diagnoses })
    if (payload && typeof payload === 'object') {
        const v = payload as Record<string, unknown>;
        const code = (v.code ?? v.$code) as unknown;
        const name = (v.name ?? v.$name) as unknown;
        const diagnoses = (v.diagnoses ?? v.$diagnoses) as unknown;

        if (typeof code === 'string' && Object.values(ErrorCodes).includes(code as ErrorCodes)) {
            throw errorFromCode(code as ErrorCodes, {
                name: typeof name === 'string' ? name : undefined,
                diagnoses: (diagnoses as Diagnose[]) ?? undefined,
            });
        }
    }

    throw new Error('Unknown API error');
}

export class MioApiClient {
    public readonly api: MioTreatyClient;
    private _headers: Record<string, string> = {};

    public readonly stories: MioApiStoriesClient;
    public readonly profiles: MioApiProfilesClient;

    constructor(options?: { apiClient?: MioTreatyClient; apiUrl?: string }) {
        if (options?.apiClient) {
            this.api = options.apiClient;
        } else {
            this.api = createApiClient(options?.apiUrl);
        }

        this.stories = new MioApiStoriesClient(this);
        this.profiles = new MioApiProfilesClient(this);
    }

    public set headers(headers: Record<string, string>) {
        this._headers = headers;
    }

    public get headers(): Record<string, string> {
        return this._headers;
    }

    public throwFromTreatyError(error: unknown): never {
        return throwFromTreatyError(error);
    }
}

export * from './stories';
export * from './profiles';

