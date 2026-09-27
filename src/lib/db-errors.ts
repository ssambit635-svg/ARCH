import { randomUUID } from 'node:crypto';
import { isDatabaseUnavailableError, Prisma } from './db';

/**
 * Turning database failures into something a person can act on — without leaking anything.
 *
 * Prisma 7 runs queries through a driver adapter (`@prisma/adapter-pg`), and that changes the
 * shape of its errors: a unique violation no longer carries `meta.target`; the constraint name
 * lives in `meta.driverAdapterError.cause.constraint.index` instead, next to the raw PostgreSQL
 * SQLSTATE (`originalCode`). Everything here reads both shapes so callers never have to.
 */

export type DatabaseErrorKind =
  /** The server is unreachable or dropped the connection. */
  | 'unavailable'
  /** A table or column the app expects is missing: migrations were not applied (or are behind). */
  | 'schema_out_of_date'
  /** The DATABASE_URL role cannot read/write the app's tables. */
  | 'permission_denied'
  /** A unique index rejected the write (see `constraint`). */
  | 'unique_violation'
  /** Every pooled connection was busy for too long. */
  | 'pool_timeout';

export type DatabaseErrorInfo = {
  kind: DatabaseErrorKind | null;
  prismaCode?: string;
  sqlState?: string;
  modelName?: string;
  table?: string;
  column?: string;
  constraint?: string;
};

type AdapterCause = {
  originalCode?: unknown;
  code?: unknown;
  kind?: unknown;
  table?: unknown;
  column?: unknown;
  constraint?: { index?: unknown; fields?: unknown } | unknown;
};

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function adapterCause(error: unknown): AdapterCause | undefined {
  const meta = (error as { meta?: { driverAdapterError?: { cause?: AdapterCause } } } | null)?.meta;
  return meta?.driverAdapterError?.cause;
}

/**
 * Name of the unique constraint behind a P2002 (e.g. `users_email_key`), from either the classic
 * `meta.target` or the driver-adapter shape. Returns null for anything else.
 */
export function uniqueConstraintOf(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return null;
  const constraint = adapterCause(error)?.constraint as { index?: unknown; fields?: unknown } | undefined;
  const index = str(constraint?.index);
  if (index) return index;
  const target = error.meta?.target;
  if (typeof target === 'string') return target;
  if (Array.isArray(target)) return target.map(String).join(',');
  const fields = constraint?.fields;
  if (Array.isArray(fields)) return fields.map(String).join(',');
  return null;
}

/** Does this P2002 come from the given constraint, or from a unique index covering `field`? */
export function isUniqueViolationOn(error: unknown, constraint: string, field?: string): boolean {
  const name = uniqueConstraintOf(error);
  if (!name) return false;
  if (name === constraint) return true;
  return Boolean(field && name.split(',').map((part) => part.trim()).includes(field));
}

const SCHEMA_SQLSTATES = new Set(['42P01', '42703', '3F000']); // undefined table / column / schema
const PERMISSION_SQLSTATES = new Set(['42501']);

export function describeDatabaseError(error: unknown): DatabaseErrorInfo {
  const known = error instanceof Prisma.PrismaClientKnownRequestError ? error : null;
  const cause = adapterCause(error);
  const rawCode = (error as { code?: unknown } | null)?.code;
  const sqlState = str(cause?.originalCode) ?? str(cause?.code) ?? (!known && typeof rawCode === 'string' && /^[0-9A-Z]{5}$/.test(rawCode) ? rawCode : undefined);
  const info: DatabaseErrorInfo = {
    kind: null,
    prismaCode: known?.code,
    sqlState,
    modelName: str((known?.meta as { modelName?: unknown } | undefined)?.modelName),
    table: str(cause?.table) ?? str((known?.meta as { table?: unknown } | undefined)?.table),
    column: str(cause?.column) ?? str((known?.meta as { column?: unknown } | undefined)?.column),
    constraint: uniqueConstraintOf(error) ?? undefined,
  };

  if (isDatabaseUnavailableError(error)) info.kind = 'unavailable';
  else if (known?.code === 'P2021' || known?.code === 'P2022' || (sqlState && SCHEMA_SQLSTATES.has(sqlState))) info.kind = 'schema_out_of_date';
  else if (sqlState && PERMISSION_SQLSTATES.has(sqlState)) info.kind = 'permission_denied';
  else if (known?.code === 'P2002' || sqlState === '23505') info.kind = 'unique_violation';
  else if (known?.code === 'P2024') info.kind = 'pool_timeout';
  return info;
}

/**
 * Removes things that must never reach a log line: connection strings (they embed the DB
 * password), `password=...` pairs, bearer tokens and email addresses.
 */
export function redactErrorText(text: string): string {
  return text
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s'"`]+/gi, '[redacted-url]')
    .replace(/(password|passwd|pwd|secret|token|api[_-]?key)\s*[=:]\s*[^\s'"`,;]+/gi, '$1=[redacted]')
    .replace(/\bbearer\s+[a-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]');
}

/**
 * The one line of an error message worth logging. Prisma messages start with a code frame of the
 * calling source and end with the actual reason; everything else is usually one line anyway.
 */
function summaryLine(error: unknown): string | undefined {
  if (!(error instanceof Error) || !error.message) return undefined;
  const lines = error.message.split('\n').map((line) => line.trim()).filter(Boolean);
  const line = error instanceof Prisma.PrismaClientKnownRequestError ? lines.at(-1) : lines[0];
  return line ? redactErrorText(line).slice(0, 300) : undefined;
}

export type SafeErrorLog = DatabaseErrorInfo & { errorId: string; name: string; message?: string };

/**
 * A structured, secret-free description of an unexpected error, plus a short id that is also
 * shown to the user so a support request can be matched to the server log line.
 */
export function safeErrorLog(error: unknown): SafeErrorLog {
  return {
    errorId: randomUUID().replace(/-/g, '').slice(0, 10),
    name: error instanceof Error ? error.name : typeof error,
    message: summaryLine(error),
    ...describeDatabaseError(error),
  };
}
