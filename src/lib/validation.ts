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
