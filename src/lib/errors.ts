/**
 * Typed application errors. Services throw these; route handlers translate them into HTTP
 * responses (see lib/api.ts). Anything that is not an AppError is a bug and becomes a 500.
 */

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_FAILED: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export type FieldIssue = { path: string; message: string };

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  readonly issues?: FieldIssue[];

  constructor(code: ErrorCode, message: string, options: { details?: unknown; issues?: FieldIssue[] } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = options.details;
    this.issues = options.issues;
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError('BAD_REQUEST', message, { details });
  }

  static unauthorized(message = 'Authentication required.', details?: unknown): AppError {
    return new AppError('UNAUTHORIZED', message, { details });
  }

  static forbidden(message = 'You do not have permission to do that.', details?: unknown): AppError {
    return new AppError('FORBIDDEN', message, { details });
  }

  static notFound(message = 'Not found.', details?: unknown): AppError {
    return new AppError('NOT_FOUND', message, { details });
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError('CONFLICT', message, { details });
  }

  static validation(message = 'The submitted data is invalid.', issues?: FieldIssue[]): AppError {
    return new AppError('VALIDATION_FAILED', message, { issues });
  }

  static rateLimited(message = 'Too many requests.', details?: unknown): AppError {
    return new AppError('RATE_LIMITED', message, { details });
  }

  static internal(message = 'Something went wrong on our side.'): AppError {
    return new AppError('INTERNAL', message);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
