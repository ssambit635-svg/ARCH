import type { ThinkerIntent, ThinkerSlots } from './intent';

export type ThinkerFile = { path: string; language: string; body: string };

export type ThinkerRisk = { severity: 'error' | 'warning' | 'info'; message: string; suggestion: string };

export type ThinkerDraft = {
  title: string;
  files: ThinkerFile[];
  place: string[];
  risks: ThinkerRisk[];
  stillYours: string[];
};

function fieldZod(slots: ThinkerSlots): string {
  return slots.fields
    .map((field) => {
      if (field.type === 'number') return `  ${field.name}: z.coerce.number(),`;
      if (field.type === 'boolean') return `  ${field.name}: z.boolean(),`;
      return `  ${field.name}: z.string().trim().min(1).max(200),`;
    })
    .join('\n');
}

function fieldPrisma(slots: ThinkerSlots): string {
  return slots.fields
    .map((field) => {
      if (field.type === 'number') return `  ${field.name} Int`;
      if (field.type === 'boolean') return `  ${field.name} Boolean @default(false)`;
      return `  ${field.name} String`;
    })
    .join('\n');
}

function crudRoute(slots: ThinkerSlots): ThinkerDraft {
  const { resourcePascal, resourcePlural, resourceCamel } = slots;
  return {
    title: `Small ${resourcePascal} list/create route (ARCH-shaped, not a full CRUD agent)`,
    files: [
      {
        path: `src/app/api/${resourcePlural}/route.ts`,
        language: 'typescript',
        body: `import { z } from 'zod';
import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';

const create${resourcePascal}Schema = z.object({
${fieldZod(slots)}
});

/** GET — list. POST — create. Tenant-scoped. Human still wires the repository. */
export const GET = handleRoute(async (request) => {
  const { organization } = await requireApiContext(request);
  void organization.id;
  return ok({ items: [] as Array<{ id: string }> });
});

export const POST = handleRoute(async (request) => {
  const { organization, user } = await requireApiContext(request);
  const input = create${resourcePascal}Schema.parse(await request.json());
  void user.id;
  void organization.id;
  return ok({ id: 'replace-me', ...input });
});
`,
      },
    ],
    place: [
      `Add the route under src/app/api/${resourcePlural}/route.ts (App Router).`,
      `Parse the body with a schema in src/lib/validation.ts, not inline forever.`,
      `Persist via a repository that always filters by organizationId — never a raw Prisma call from the route.`,
    ],
    risks: [
      {
        severity: 'error',
        message: 'This stub returns an empty list and echoes the POST body. Shipping it as-is leaks no data but does no work.',
        suggestion: 'Wire a tenant-scoped repository before exposing the route.',
      },
      {
        severity: 'warning',
        message: 'No RBAC check beyond requireApiContext. VIEWER may be able to POST if you copy this blindly.',
        suggestion: 'Call requirePermission(organization.id, user.id, …) for mutating methods.',
      },
      {
        severity: 'info',
        message: 'No pagination, idempotency or audit log.',
        suggestion: 'Match existing ARCH list routes: paginationSchema + writeAudit on create.',
      },
    ],
    stillYours: [
      'Repository + Prisma model',
      'Permission string',
      'Tests for tenancy (org A must not see org B)',
    ],
  };
}

function zodSchema(slots: ThinkerSlots): ThinkerDraft {
  return {
    title: `Zod input schema for ${slots.resourcePascal}`,
    files: [
      {
        path: 'src/lib/validation.ts (append)',
        language: 'typescript',
        body: `export const ${slots.resourceCamel}CreateSchema = z.object({
${fieldZod(slots)}
});

export const ${slots.resourceCamel}UpdateSchema = ${slots.resourceCamel}CreateSchema.partial();
`,
      },
    ],
    place: [
      'Keep every external input in src/lib/validation.ts so routes stay thin.',
      'Reuse this schema from the server action and the API route — do not fork copies.',
    ],
    risks: [
      {
        severity: 'warning',
        message: 'Field types were guessed from names. Email/url/slug need tighter refinements.',
        suggestion: 'Use z.email() / slug regex already used in this file for those fields.',
      },
    ],
    stillYours: ['Max lengths that match the Prisma columns', 'Refine rules for enums'],
  };
}

function prismaModel(slots: ThinkerSlots): ThinkerDraft {
  return {
    title: `Prisma model sketch for ${slots.resourcePascal}`,
    files: [
      {
        path: 'prisma/schema.prisma (append — do not apply blindly)',
        language: 'prisma',
        body: `model ${slots.resourcePascal} {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
${fieldPrisma(slots)}
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
}
`,
      },
    ],
    place: [
      'Add the reverse relation on Organization before migrate.',
      'Generate a SQL migration; never db push in production.',
    ],
    risks: [
      {
        severity: 'error',
        message: 'Missing organization relation on Organization will fail `prisma validate`.',
        suggestion: `Add \`${slots.resourcePlural} ${slots.resourcePascal}[]\` on Organization.`,
      },
      {
        severity: 'warning',
        message: 'No unique constraint. Duplicate rows are easy.',
        suggestion: 'If the resource has a slug, @@unique([organizationId, slug]).',
      },
    ],
    stillYours: ['Migration SQL', 'Repository with organizationId on every query'],
  };
}

function webhookHandler(slots: ThinkerSlots): ThinkerDraft {
  return {
    title: 'HMAC-verified webhook stub (inbound alert)',
    files: [
      {
        path: `src/app/api/webhooks/${slots.resourceCamel}/route.ts`,
        language: 'typescript',
        body: `import { createHmac, timingSafeEqual } from 'node:crypto';
import { handleRoute, ok } from '@/lib/api';
import { AppError } from '@/lib/errors';

function verified(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
  const given = Buffer.from(header);
  const expect = Buffer.from(digest);
  return given.length === expect.length && timingSafeEqual(given, expect);
}

/** POST — verify HMAC, then create an incident. Idempotency is still your job. */
export const POST = handleRoute(async (request) => {
  const raw = await request.text();
  const secret = process.env.WEBHOOK_SECRET ?? '';
  if (!secret || !verified(raw, request.headers.get('x-signature'), secret)) {
    throw AppError.unauthorized('Invalid webhook signature.');
  }
  JSON.parse(raw) as { title?: string };
  return ok({ accepted: true });
});
`,
      },
    ],
    place: [
      'Public route: do not use session auth; authenticate with HMAC only.',
      'Record delivery logs + an idempotency key so retries do not duplicate incidents.',
    ],
    risks: [
      {
        severity: 'error',
        message: 'WEBHOOK_SECRET empty → every request 401. Do not hard-code a secret in source.',
        suggestion: 'Load from env; reject startup if missing in production.',
      },
      {
        severity: 'warning',
        message: 'JSON.parse can throw on garbage bodies.',
        suggestion: 'Parse with Zod after signature checks succeed.',
      },
    ],
    stillYours: ['Idempotency store', 'Map payload → incident fields'],
  };
}

function statusMachine(): ThinkerDraft {
  return {
    title: 'Tiny status transition table (incident-shaped)',
    files: [
      {
        path: 'src/lib/status-machine.ts',
        language: 'typescript',
        body: `export const STATUSES = ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'] as const;
export type Status = (typeof STATUSES)[number];

const ALLOWED: Record<Status, Status[]> = {
  INVESTIGATING: ['IDENTIFIED', 'RESOLVED'],
  IDENTIFIED: ['MONITORING', 'INVESTIGATING'],
  MONITORING: ['RESOLVED', 'IDENTIFIED'],
  RESOLVED: ['INVESTIGATING'],
};

export function canTransition(from: Status, to: Status): boolean {
  return ALLOWED[from].includes(to);
}

export function assertTransition(from: Status, to: Status): void {
  if (from === to) return;
  if (!canTransition(from, to)) {
    throw new Error(\`Illegal status change \${from} → \${to}\`);
  }
}
`,
      },
    ],
    place: [
      'Call assertTransition inside the incident service, never only in the UI.',
      'Write a table-driven test for every from→to pair (allowed and rejected).',
    ],
    risks: [
      {
        severity: 'warning',
        message: 'UI-only guards are bypassed by the API.',
        suggestion: 'Keep the table in the service layer.',
      },
    ],
    stillYours: ['Audit event on each change', 'Who is allowed to reopen'],
  };
}

function unitTest(slots: ThinkerSlots): ThinkerDraft {
  return {
    title: `Vitest skeleton for ${slots.resourcePascal}`,
    files: [
      {
        path: `tests/${slots.resourceCamel}.test.ts`,
        language: 'typescript',
        body: `import { describe, expect, it } from 'vitest';

describe('${slots.resourcePascal}', () => {
  it('is a placeholder — replace with a real assertion', () => {
    expect(true).toBe(true);
  });

  it('does not leak another organization\\'s row (write this for real)', () => {
    expect.assertions(0);
  });
});
`,
      },
    ],
    place: ['Put tenant tests next to the repository, not only in the UI.'],
    risks: [
      {
        severity: 'info',
        message: 'Placeholder tests pass without proving behaviour.',
        suggestion: 'Delete the tautology test once a real case exists.',
      },
    ],
    stillYours: ['Fixtures for two orgs', 'Permission matrix'],
  };
}

function reactForm(slots: ThinkerSlots): ThinkerDraft {
  const inputs = slots.fields
    .map((field) => `      <label className="block text-sm">${field.name}
        <input name="${field.name}" className="mt-1 w-full rounded border px-2 py-1" />
      </label>`)
    .join('\n');
  return {
    title: `Small form for ${slots.resourcePascal} (not a generated app)`,
    files: [
      {
        path: `src/components/${slots.resourceCamel}-form.tsx`,
        language: 'tsx',
        body: `'use client';

export function ${slots.resourcePascal}Form({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="space-y-3">
${inputs}
      <button type="submit" className="rounded bg-slate-800 px-3 py-1.5 text-sm">Save</button>
    </form>
  );
}
`,
      },
    ],
    place: ['Validate on the server with the Zod schema; the form is not a security boundary.'],
    risks: [
      {
        severity: 'warning',
        message: 'No client or server validation in this stub.',
        suggestion: 'Reuse ${slots.resourceCamel}CreateSchema in the server action.',
      },
    ],
    stillYours: ['Server action', 'Error rendering from Zod issues'],
  };
}

function unknownStub(slots: ThinkerSlots): ThinkerDraft {
  return {
    title: 'No strong match — tiny function stub + checklist (not an agent run)',
    files: [
      {
        path: `src/lib/${slots.resourceCamel}.ts`,
        language: 'typescript',
        body: `/** ARCH Thinker stub. Replace the body; do not treat this as a feature. */
export function ${slots.resourceCamel}Placeholder(input: { ${slots.fields.map((f) => `${f.name}: ${f.type}`).join('; ')} }) {
  return input;
}
`,
      },
    ],
    place: [
      'Rephrase with one of: CRUD route, Zod schema, Prisma model, webhook, status machine, unit test, React form.',
      'ARCH Thinker supports those shapes only — it will not open a workspace or edit many files.',
    ],
    risks: [
      {
        severity: 'info',
        message: 'Vague request. A coding agent would guess a whole feature; Thinker refuses that.',
        suggestion: 'Name the artifact (route / schema / model / test) in the prompt.',
      },
    ],
    stillYours: ['The actual design', 'Which existing file to change'],
  };
}

export function draftFor(intent: ThinkerIntent, slots: ThinkerSlots): ThinkerDraft {
  switch (intent) {
    case 'crud_route':
      return crudRoute(slots);
    case 'zod_schema':
      return zodSchema(slots);
    case 'prisma_model':
      return prismaModel(slots);
    case 'webhook_handler':
      return webhookHandler(slots);
    case 'status_machine':
      return statusMachine();
    case 'unit_test':
      return unitTest(slots);
    case 'react_form':
      return reactForm(slots);
    default:
      return unknownStub(slots);
  }
}
