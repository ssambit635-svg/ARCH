import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import packageJson from '../../package.json';
import { Prisma } from './db';
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
  console.error('[api] unhandled error', error instanceof Error ? error.name : 'unknown');
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
