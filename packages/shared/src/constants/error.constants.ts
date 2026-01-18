import { type HttpErrorStatusCode, HttpStatusCode } from './http.types';

const httpErrorStatusCodeToName = {
  400: 'BadRequest',
  403: 'Forbidden',
  401: 'Unauthorized',
  404: 'NotFound',
  409: 'Conflict',
  500: 'InternalServerError',
  413: 'PayloadTooLarge',
  429: 'TooManyRequests',
  402: 'PaymentRequired',
  412: 'PreconditionFailed',
  410: 'Gone'
} as const;

export enum DiagnoseSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info'
}
export const diagnoseSeverities = Object.values(DiagnoseSeverity);

export type Diagnose = {
  name: string;
  message: string;
  severity: DiagnoseSeverity;
};

export enum ErrorCodes {
  // common
  InternalError = 'InternalError',
  NotFound = 'NotFound',
  ValidationError = 'ValidationError',
  UnauthorizedError = 'UnauthorizedError',

  // storage
  StorageUploadFailed = 'StorageUploadFailed',
  StorageDownloadFailed = 'StorageDownloadFailed',
  StorageDeleteFailed = 'StorageDeleteFailed',
  StorageFileNotFound = 'StorageFileNotFound',
}

const errorDefinitions: {
  [key in ErrorCodes]: { code?: string; message: string; statusCode?: HttpErrorStatusCode; diagnoses?: Diagnose[] };
} = {
  // common
  [ErrorCodes.InternalError]: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  },
  [ErrorCodes.NotFound]: {
    code: 'NOT_FOUND',
    message: 'Not found'
  },
  [ErrorCodes.ValidationError]: {
    code: 'VALIDATION',
    message: 'Validation failed',
    statusCode: HttpStatusCode.BadRequest
  },
  [ErrorCodes.UnauthorizedError]: {
    message: 'Unauthorized',
    statusCode: HttpStatusCode.Unauthorized
  },

  // storage
  [ErrorCodes.StorageUploadFailed]: {
    code: 'STORAGE_UPLOAD_FAILED',
    message: 'Failed to upload file to storage'
  },
  [ErrorCodes.StorageDownloadFailed]: {
    code: 'STORAGE_DOWNLOAD_FAILED',
    message: 'Failed to download file from storage'
  },
  [ErrorCodes.StorageDeleteFailed]: {
    code: 'STORAGE_DELETE_FAILED',
    message: 'Failed to delete file from storage'
  },
  [ErrorCodes.StorageFileNotFound]: {
    code: 'STORAGE_FILE_NOT_FOUND',
    message: 'File not found in storage',
    statusCode: HttpStatusCode.NotFound
  },
} as const;

export class AppError extends Error {
  public readonly code: ErrorCodes;
  public readonly diagnoses: Diagnose[];

  constructor(code: ErrorCodes, options?: { name?: string; diagnoses?: Diagnose[]; error?: Error }) {
    super(errorDefinitions[code].message);
    this.code = code;
    this.name = options?.name ?? httpErrorStatusCodeToName[this.codeToHttpStatusCode()];
    this.diagnoses = options?.diagnoses ?? []; //[...(options?.diagnoses ?? []), ...(errorDefinitions[code].diagnoses ?? [])];
    if (options?.error) {
      this.stack = options.error.stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  public get statusCode(): HttpErrorStatusCode {
    return this.codeToHttpStatusCode();
  }

  private codeToHttpStatusCode(): HttpErrorStatusCode {
    const definition = errorDefinitions[this.code];
    return definition?.statusCode ?? HttpStatusCode.InternalServerError;
  }
}

export function errorMessage(code: ErrorCodes) {
  return errorDefinitions[code].message;
}

export function errorFromCode(code: ErrorCodes, options?: { name?: string; diagnoses?: Diagnose[]; error?: Error }) {
  return new AppError(code, options);
}
