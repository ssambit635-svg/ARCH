import { z } from 'zod';

/**
 * Every external input in ARCH is parsed here before it reaches a service.
 *
 * These schemas are also the API documentation: the shapes below are exactly what the route
 * handlers accept, and `docs/engineering/ARCHITECTURE.md` refers to them.
 */

export const incidentSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const incidentStatuses = ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'] as const;
export const serviceStatuses = ['OPERATIONAL', 'DEGRADED', 'OUTAGE', 'MAINTENANCE'] as const;
export const membershipRoles = ['OWNER', 'ADMIN', 'RESPONDER', 'VIEWER'] as const;
export const invitableRoles = ['ADMIN', 'RESPONDER', 'VIEWER'] as const;

const slug = z
  .string()
  .trim()
  .min(2, 'Slug must be at least 2 characters.')
  .max(60, 'Slug must be at most 60 characters.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens.');

const id = z.string().trim().min(1).max(64);
const shortText = (max: number) => z.string().trim().min(1, 'This field is required.').max(max);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// ---------- Auth ----------

export const registerSchema = z.object({
  email: z.email('Enter a valid email address.').max(200),
  name: z.string().trim().max(80).optional(),
  password: z
    .string()
    .min(10, 'Use at least 10 characters.')
    .max(200, 'That password is too long.'),
  organizationName: z.string().trim().min(2).max(80).optional(),
});

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

// ---------- Organizations & members ----------

export const organizationCreateSchema = z.object({
  name: z.string().trim().min(2, 'Organization name is too short.').max(80),
  slug: slug.optional(),
});

export const organizationUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const inviteMemberSchema = z.object({
  email: z.email('Enter a valid email address.').max(200),
  role: z.enum(invitableRoles).default('RESPONDER'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(membershipRoles),
});

// ---------- Projects & services ----------

export const projectCreateSchema = z.object({
  name: shortText(80),
  slug: slug.optional(),
  description: z.string().trim().max(500).optional(),
});

export const projectUpdateSchema = z.object({
  name: shortText(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export const serviceCreateSchema = z.object({
  projectId: id,
  name: shortText(80),
  slug: slug.optional(),
  description: z.string().trim().max(500).optional(),
  status: z.enum(serviceStatuses).default('OPERATIONAL'),
  autoStatus: z.boolean().default(true),
});

export const serviceUpdateSchema = z.object({
  name: shortText(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  status: z.enum(serviceStatuses).optional(),
  autoStatus: z.boolean().optional(),
});

// ---------- Incidents ----------

export const incidentCreateSchema = z.object({
  title: shortText(200),
  description: z.string().trim().max(5000).optional(),
  severity: z.enum(incidentSeverities).default('MEDIUM'),
  projectId: id,
  serviceId: id.optional(),
  assignedToId: id.optional(),
  /// ISO timestamp or unix seconds; defaults to "now".
  startedAt: z.union([z.string(), z.number()]).optional(),
});

export const incidentUpdateSchema = z
  .object({
    title: shortText(200).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    severity: z.enum(incidentSeverities).optional(),
    status: z.enum(incidentStatuses).optional(),
    assignedToId: id.nullable().optional(),
    serviceId: id.nullable().optional(),
    projectId: id.optional(),
    message: z.string().trim().max(2000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });

export const incidentEventCreateSchema = z.object({
  body: shortText(5000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const incidentListQuerySchema = paginationSchema.extend({
  status: z.enum(incidentStatuses).optional(),
  severity: z.enum(incidentSeverities).optional(),
  projectId: id.optional(),
  serviceId: id.optional(),
  assignedToId: id.optional(),
  q: z.string().trim().max(200).optional(),
  open: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
});

// ---------- Status pages ----------

export const statusPageCreateSchema = z.object({
  name: shortText(80),
  slug: slug.optional(),
  description: z.string().trim().max(500).optional(),
  serviceIds: z.array(id).max(100).optional(),
});

export const statusPageUpdateSchema = z.object({
  name: shortText(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  serviceIds: z.array(id).max(100).optional(),
});

export const statusPagePublishSchema = z.object({
  isPublished: z.boolean(),
});

// ---------- Webhooks ----------

export const webhookEndpointCreateSchema = z.object({
  provider: slug,
  projectId: id,
  serviceId: id.optional(),
  description: z.string().trim().max(200).optional(),
});

export const webhookEndpointUpdateSchema = z.object({
  description: z.string().trim().max(200).nullable().optional(),
  isActive: z.boolean().optional(),
  projectId: id.optional(),
  serviceId: id.nullable().optional(),
});

/**
 * Normalized inbound webhook payload.
 *
 * Providers differ wildly; the endpoint maps provider-specific fields onto this shape before
 * anything is persisted (see server/services/webhook.service.ts). Everything is optional except
 * the title so a minimal `{"title": "..."}` heartbeat still opens an incident.
 */
export const webhookIngestSchema = z.object({
  title: shortText(200),
  description: z.string().trim().max(5000).optional(),
  severity: z.enum(incidentSeverities).default('MEDIUM'),
  status: z.enum(incidentStatuses).default('INVESTIGATING'),
  serviceId: id.optional(),
  serviceSlug: slug.optional(),
  event: z.string().trim().max(120).optional(),
  dedupeKey: z.string().trim().max(200).optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ---------- ARCH Copilot (V2) ----------

export const aiSuggestionTypes = ['SUMMARY', 'TRIAGE', 'STATUS_UPDATE', 'POSTMORTEM', 'CODE_FIX', 'VERIFIED_FIX'] as const;
export const aiSuggestionStatuses = ['PENDING', 'APPROVED', 'DISMISSED'] as const;

export const fixVerificationStatuses = ['PENDING', 'RUNNING', 'PASSED', 'FAILED', 'TIMEOUT', 'UNSAFE', 'ERROR'] as const;
export const pullRequestStatuses = ['CREATED', 'OPEN', 'MERGED', 'CLOSED'] as const;

export const copilotSuggestionListQuerySchema = z.object({
  status: z.enum(aiSuggestionStatuses).optional(),
});

export const copilotGenerateSchema = z.object({
  incidentId: id,
  type: z.enum(aiSuggestionTypes),
  /** CODE_FIX only: a stack trace, log excerpt or code snippet pasted by the responder. */
  attachment: z.string().max(20_000).optional(),
});

export const copilotCodeFixSchema = z.object({
  attachment: z.string().max(20_000).optional(),
});

// ---------- ARCH Code Assist + ARCH Model (V3) ----------

export const codeLanguages = ['typescript', 'javascript', 'python', 'go', 'java', 'sql', 'ruby', 'php', 'csharp', 'shell', 'yaml', 'unknown'] as const;

export const codeReviewSchema = z.object({
  code: z.string().min(1, 'Paste some code or a stack trace.').max(20_000, 'Snippets are limited to 20,000 characters.'),
  mode: z.enum(['review', 'fix', 'explain']).default('review'),
  language: z
    .union([z.enum(codeLanguages), z.literal('auto'), z.literal('')])
    .optional()
    .transform((value) => (value && value !== 'auto' ? value : null)),
});

export const copilotApproveSchema = z.object({
  /** Reviewer-edited text for summary / status update / postmortem drafts. */
  text: z.string().trim().max(10_000).optional(),
});

// ---------- V4 — Verified Fix Loop (GitHub repo connect + sandbox + PR) ----------

const githubOwner = z
  .string()
  .trim()
  .min(1, 'GitHub owner is required.')
  .max(100, 'Owner too long.')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Owner may contain letters, numbers, dash, dot and underscore.');

const githubRepo = z
  .string()
  .trim()
  .min(1, 'Repository name is required.')
  .max(100, 'Repo name too long.')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Repo name may contain letters, numbers, dash, dot and underscore.');

const commitSha = z
  .string()
  .trim()
  .min(7, 'Commit SHA must be at least 7 characters.')
  .max(40, 'Commit SHA must be at most 40 characters.')
  .regex(/^[a-f0-9]+$/i, 'Commit SHA must be hex.');

export const repoConnectionCreateSchema = z.object({
  owner: githubOwner,
  repo: githubRepo,
  // No `.default('main')`: a hard 'main' would (a) be stored blindly for repos whose default is
  // master/develop and (b) in real mode make GitHub return 404 for a branch that never existed.
  // Omit it and ARCH asks GitHub for the repository's actual default branch.
  defaultBranch: z.string().trim().min(1).max(100).optional(),
  pinnedCommitSha: commitSha.optional(),
});

export const repoConnectionUpdateSchema = z.object({
  defaultBranch: z.string().trim().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const repoPinSchema = z.object({
  commitSha: commitSha,
});

export const verifiedFixGenerateSchema = z.object({
  attachment: z.string().max(20_000).optional(),
  repoConnectionId: id.optional(),
  commitSha: commitSha.optional(),
  testCommand: z.string().trim().max(200).optional(),
});

export const fixVerificationCreateSchema = z.object({
  suggestionId: id,
  repoConnectionId: id.optional(),
  commitSha: commitSha.optional(),
  patch: z.string().min(1).max(50_000),
  testCommand: z.string().trim().max(200).optional(),
});

export const pullRequestCreateSchema = z.object({
  verificationId: id,
  title: shortText(200).optional(),
  body: z.string().trim().max(5000).optional(),
});

export const repoConnectionListQuerySchema = z.object({
  organizationId: id.optional(),
  includeInactive: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => v === true || v === 'true')
    .optional(),
});

/** GET /api/github needs no body; POST may probe a specific repo + commit. */
export const githubCheckSchema = z.object({
  owner: githubOwner.optional(),
  repo: githubRepo.optional(),
  defaultBranch: z.string().trim().min(1).max(100).optional(),
  commitSha: commitSha.optional(),
  /** Skip the network entirely and only report what .env says. */
  configOnly: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
});

// ---------- V6: dependency intelligence + SLO guardian ----------
export const dependencyCreateSchema = z.object({ fromServiceId: id, toServiceId: id, relationship: z.string().trim().min(2).max(40).default('DEPENDS_ON'), criticality: z.coerce.number().int().min(1).max(5).default(3) });
export const changeCreateSchema = z.object({ serviceId: id.optional(), projectId: id.optional(), title: shortText(200), type: z.string().trim().max(40).default('DEPLOYMENT'), commitSha: z.string().trim().max(100).optional(), author: z.string().trim().max(120).optional(), occurredAt: z.union([z.string(), z.number()]).optional(), source: z.string().trim().max(40).default('MANUAL') }).refine(v => v.serviceId || v.projectId, { message: 'A service or project is required.' });
export const sloUpsertSchema = z.object({ serviceId: id, targetPercent: z.coerce.number().min(90).max(99.999), windowDays: z.coerce.number().int().min(1).max(365), burnAlertPercent: z.coerce.number().min(1).max(1000).default(50), enabled: z.boolean().default(true) });
