import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import packageJson from '../../package.json';
import { Prisma, isDatabaseUnavailableError } from './db';
import { describeDatabaseError, safeErrorLog } from './db-errors';
import { env } from './env';
import { AppError, isAppError, type FieldIssue } from './errors';

/**
 * Route-handler plumbing: one response shape, one error translation table, one place that
 * decides what a caller sees. Handlers stay boring: parse → authorize → call a service → return.
 */

export type ApiFailure = {
  error: { code: string; message: string; issues?: FieldIssue[]; details?: unknown };
};

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

/** 202 — the request was accepted and the work continues in the background (V3 training jobs). */
export function accepted<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 202 });
}

export function fail(error: unknown): NextResponse {
  if (isAppError(error)) {
    const body: ApiFailure = {
      error: { code: error.code, message: error.message, ...(error.issues ? { issues: error.issues } : {}), ...(error.details ? { details: error.details } : {}) },
    };
    const headers: Record<string, string> = {};
    if (error.code === 'RATE_LIMITED') {
      const retryAfter = (error.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds;
      if (retryAfter) headers['Retry-After'] = String(retryAfter);
    }
    return NextResponse.json(body, { status: error.status, headers });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'The submitted data is invalid.', issues: zodIssues(error) } },
      { status: 422 },
    );
  }

  // A dead database is not "a bug on our side": self-hosted installs and preview containers both
  // hit this, and the caller deserves to know the one thing they can act on.
  if (isDatabaseUnavailableError(error)) {
    return NextResponse.json(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'The database is unreachable. If you run ARCH yourself, start PostgreSQL and try again.' } },
      { status: 503 },
    );
  }

  const database = describeDatabaseError(error);
  if (database.kind === 'schema_out_of_date') {
    console.error('[api] database schema is missing or out of date', JSON.stringify(safeErrorLog(error)));
    return NextResponse.json(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'The database schema is missing or out of date. If you run ARCH yourself, run npm run db:migrate and try again.' } },
      { status: 503 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: { code: 'CONFLICT', message: 'That value is already taken.' } }, { status: 409 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, { status: 404 });
    }
    if (error.code === 'P2003') {
      return NextResponse.json({ error: { code: 'CONFLICT', message: 'Related record does not exist.' } }, { status: 409 });
    }
  }

  // Error strings from drivers/providers can include connection URLs, headers or tokens.
  // Keep those out of public responses even in development.
  console.error('[api] unhandled error', JSON.stringify(safeErrorLog(error)));
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Something went wrong on our side.' } },
    { status: 500 },
  );
}

export function zodIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

export function parseBody<S extends z.ZodType>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw AppError.validation('The submitted data is invalid.', zodIssues(result.error));
  }
  return result.data;
}

export function parseQuery<S extends z.ZodType>(schema: S, searchParams: URLSearchParams): z.infer<S> {
  const raw: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    raw[key] = values.length > 1 ? values : (values[0] as string);
  }
  return parseBody(schema, raw);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw AppError.badRequest('Request body must be valid JSON.');
  }
}

/**
 * Cap for request bodies on unauthenticated endpoints.
 *
 * Without this, `request.text()` / `request.json()` buffer whatever the client sends into
 * memory before any validation or rate limit runs — a single request with a multi-gigabyte
 * chunked body is enough to take the process down. 2 MB is generous for a webhook payload.
 */
export const MAX_UNAUTHENTICATED_BODY_BYTES = 2 * 1024 * 1024;

/**
 * Read a request body as text, refusing anything over `maxBytes`.
 *
 * The `content-length` header is checked first (cheap rejection), but it is attacker-supplied,
 * so the stream itself is also counted: an absent or lying header cannot buy unlimited memory.
 */
export async function readTextLimited(request: Request, maxBytes = MAX_UNAUTHENTICATED_BODY_BYTES): Promise<string> {
  const declared = request.headers.get('content-length');
  if (declared !== null) {
    const length = Number(declared);
    if (Number.isFinite(length) && length > maxBytes) {
      throw AppError.payloadTooLarge('Request body is too large.', { maxBytes });
    }
  }

  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw AppError.payloadTooLarge('Request body is too large.', { maxBytes });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

/** Like `readJson`, but an empty body is `{}` (for endpoints whose body is optional). */
export async function readOptionalJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw AppError.badRequest('Request body must be valid JSON.');
  }
}

/** Wrap a handler so every thrown error becomes a well-formed response. */
export function handleRoute<C = unknown>(handler: (request: NextRequest, context: C) => Promise<NextResponse>) {
  return async (request: NextRequest, context: C): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return fail(error);
    }
  };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** Kept in lockstep with package.json so /api/health cannot drift behind a release. */
export const APP_VERSION = packageJson.version;
export const appUrl = env.APP_URL;
