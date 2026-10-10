'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { ORG_COOKIE, requireUser, resolveOrganization } from '@/lib/session';
import { requirePermission } from '@/lib/permissions';
import { isAppError } from '@/lib/errors';
import {
  incidentCreateSchema,
  incidentUpdateSchema,
  inviteMemberSchema,
  organizationUpdateSchema,
  projectCreateSchema,
  serviceCreateSchema,
  statusPageCreateSchema,
  statusPagePublishSchema,
  updateMemberRoleSchema,
  webhookEndpointCreateSchema,
  copilotApproveSchema,
  copilotGenerateSchema,
  codeReviewSchema,
  repoConnectionCreateSchema,
  repoInsightAskSchema,
  repoPinSchema,
  verifiedFixGenerateSchema,
  pullRequestCreateSchema,
  knowledgeSourceCreateSchema,
  knowledgeSourceFetchSchema,
} from '@/lib/validation';
import { createIncident, addIncidentComment, updateIncident } from '@/server/services/incident.service';
import { createProject, createService, updateService } from '@/server/services/project.service';
import { createStatusPage, setStatusPagePublished, updateStatusPage } from '@/server/services/statusPage.service';
import { createOrganization, changeMemberRole, inviteMember, removeMember, revokeInvitation, updateOrganization } from '@/server/services/organization.service';
import { createEndpoint, deleteEndpoint, rotateEndpointSecret, updateEndpoint } from '@/server/services/webhook.service';
import { approveSuggestion, dismissSuggestion, generateSuggestion } from '@/server/services/copilot.service';
import { reviewCode, type CodeReviewResult } from '@/server/services/codeAssist.service';
import { activateModelVersion, rollbackModel, trainModel } from '@/server/services/archModel.service';
import { createRepoConnection, pinRepoCommit, deactivateRepoConnection } from '@/server/services/repo.service';
import { askRepoInsight, type RepoInsightAnswer } from '@/server/services/repoInsight.service';
import { generateVerifiedFix, verifyFix, approveAndCreatePr } from '@/server/services/verifiedFix.service';
import { deleteKnowledgeSource, fetchKnowledgeUrl, ingestKnowledgeSource } from '@/server/services/knowledge.service';
import { revalidateOrganizationStatusPages } from '@/server/revalidate';
import { toFormObject } from './form-utils';

/**
 * Dashboard mutations.
 *
 * Every action follows the same path: session → resolve organization → parse with Zod → call the
 * service (which re-checks permissions) → revalidate the affected path. Authorization is never
 * decided here: this layer only decides which service to call.
 */

export type ActionResult =
  | { ok: true; message?: string; data?: unknown }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fieldErrorsFrom(issues: readonly { path: string | readonly PropertyKey[]; message: string }[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const key =
      (typeof issue.path === 'string' ? issue.path : issue.path.map((segment) => String(segment)).join('.')) || 'form';
    result[key] ??= issue.message;
  }
  return result;
}

function toFailure(error: unknown): ActionResult {
  if (isAppError(error)) {
    return { ok: false, error: error.message, ...(error.issues ? { fieldErrors: fieldErrorsFrom(error.issues) } : {}) };
  }
  console.error('[dashboard action] unhandled error', error instanceof Error ? error.name : 'unknown');
  return { ok: false, error: 'Something went wrong. Please try again.' };
}

async function context() {
  const user = await requireUser();
  const organization = await resolveOrganization(user.id);
  return { user, organization };
}

async function parse<S extends z.ZodType>(schema: S, formData: FormData): Promise<z.infer<S>> {
  return schema.parse(toFormObject(formData));
}

// ---------------------------------------------------------------- account & organization

export async function switchOrganizationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const organizationId = String(formData.get('organizationId') ?? '');
  const organization = await resolveOrganization(user.id, organizationId);
  const store = await cookies();
  store.set(ORG_COOKIE, organization.id, { httpOnly: true, sameSite: 'lax', path: '/' });
  revalidatePath('/dashboard', 'layout');
}

export async function createOrganizationAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const name = String(formData.get('name') ?? '').trim();
    if (name.length < 2) return { ok: false, error: 'Organization name is too short.', fieldErrors: { name: 'At least 2 characters.' } };

    const organization = await createOrganization({ userId: user.id, name });
    const store = await cookies();
    store.set(ORG_COOKIE, organization.id, { httpOnly: true, sameSite: 'lax', path: '/' });
    revalidatePath('/dashboard', 'layout');
    return { ok: true, message: `${organization.name} is ready.` };
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateOrganizationAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const input = await parse(organizationUpdateSchema, formData);
    await updateOrganization({ organizationId: organization.id, userId: user.id, name: input.name });
    revalidatePath('/dashboard/settings');
    return { ok: true, message: 'Organization updated.' };
  } catch (error) {
    return toFailure(error);
  }
}

// ---------------------------------------------------------------- members

export async function inviteMemberAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const input = await parse(inviteMemberSchema, formData);
    const result = await inviteMember({ organizationId: organization.id, actorId: user.id, email: input.email, role: input.role });
    revalidatePath('/dashboard/settings');

    // Only expose a raw link when the invitee needs to receive it manually. If email is queued,
    // keep the token out of the manager's browser response.
    return {
      ok: true,
      message: result.emailQueued
        ? `Invitation email queued for ${input.email}.`
        : `Invitation created. Share the one-time link with ${input.email}.`,
      ...(result.emailQueued ? {} : { data: { inviteUrl: result.inviteUrl } }),
    };
  } catch (error) {
    return toFailure(error);
  }
}

export async function revokeInvitationAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const invitationId = String(formData.get('invitationId') ?? '').trim();
    if (!invitationId) return { ok: false, error: 'Missing invitation id.' };

    await revokeInvitation({ organizationId: organization.id, actorId: user.id, invitationId });
    revalidatePath('/dashboard/settings');
    return { ok: true, message: 'Invitation revoked. Its link can no longer be used.' };
  } catch (error) {
    return toFailure(error);
  }
}

export async function changeMemberRoleAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const input = await parse(updateMemberRoleSchema, formData);
    const targetUserId = String(formData.get('userId') ?? '');
    if (!targetUserId) return { ok: false, error: 'Missing member id.' };

    await changeMemberRole({ organizationId: organization.id, actorId: user.id, targetUserId, role: input.role });
    revalidatePath('/dashboard/settings');
    return { ok: true, message: 'Role updated.' };
  } catch (error) {
    return toFailure(error);
  }
}

export async function removeMemberAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const targetUserId = String(formData.get('userId') ?? '');
    if (!targetUserId) return { ok: false, error: 'Missing member id.' };

    await removeMember({ organizationId: organization.id, actorId: user.id, targetUserId });
    revalidatePath('/dashboard/settings');
    return { ok: true, message: 'Member removed.' };
  } catch (error) {
    return toFailure(error);
  }
}

// ---------------------------------------------------------------- projects & services

export async function createProjectAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const input = await parse(projectCreateSchema, formData);
    const project = await createProject({
      organizationId: organization.id,
      userId: user.id,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
    });
    revalidatePath('/dashboard/projects');
    revalidatePath('/dashboard/incidents/new');
    return { ok: true, message: `${project.name} created.` };
  } catch (error) {
    return toFailure(error);
  }
}

export async function createServiceAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const input = await parse(serviceCreateSchema, formData);
    const service = await createService({
      organizationId: organization.id,
      userId: user.id,
      projectId: input.projectId,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      status: input.status,
      autoStatus: input.autoStatus,
    });
    revalidatePath('/dashboard/projects');
    return { ok: true, message: `${service.name} added.` };
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateServiceStatusAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const serviceId = String(formData.get('serviceId') ?? '');
    const status = String(formData.get('status') ?? '');
    const parsed = z.enum(['OPERATIONAL', 'DEGRADED', 'OUTAGE', 'MAINTENANCE']).safeParse(status);
    if (!serviceId || !parsed.success) return { ok: false, error: 'Pick a status.' };

    await updateService({
      organizationId: organization.id,
      userId: user.id,
      serviceId,
      status: parsed.data,
      // Manual status changes imply the operator is taking over from auto-derivation.
      autoStatus: false,
    });
    revalidatePath('/dashboard/projects');
    await revalidateOrganizationStatusPages(organization.id);
    return { ok: true, message: 'Service status updated.' };
  } catch (error) {
    return toFailure(error);
  }
}

export async function setServiceAutoStatusAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const serviceId = String(formData.get('serviceId') ?? '');
    const autoStatus = String(formData.get('autoStatus') ?? '') === 'true';
    if (!serviceId) return { ok: false, error: 'Missing service id.' };

    await updateService({ organizationId: organization.id, userId: user.id, serviceId, autoStatus });
    revalidatePath('/dashboard/projects');
    return { ok: true, message: autoStatus ? 'Deriving status from incidents again.' : 'Status pinned manually.' };
  } catch (error) {
    return toFailure(error);
  }
}

// ---------------------------------------------------------------- incidents

export async function createIncidentAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const input = await parse(incidentCreateSchema, formData);
    const incident = await createIncident({
      organizationId: organization.id,
      userId: user.id,
      source: 'DASHBOARD',
      input: {
        title: input.title,
        description: input.description ?? null,
        severity: input.severity,
        projectId: input.projectId,
        serviceId: input.serviceId ?? null,
        assignedToId: input.assignedToId ?? null,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/incidents');
    await revalidateOrganizationStatusPages(organization.id);
    return { ok: true, message: `Incident opened: ${incident?.title ?? input.title}`, data: { incidentId: incident?.id } };
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateIncidentAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const incidentId = String(formData.get('incidentId') ?? '');
    if (!incidentId) return { ok: false, error: 'Missing incident id.' };

    const raw = toFormObject(formData);
    const input = incidentUpdateSchema.parse(raw);

    await updateIncident({
      organizationId: organization.id,
      userId: user.id,
      incidentId,
      input: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.severity !== undefined ? { severity: input.severity } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
        ...(input.serviceId !== undefined ? { serviceId: input.serviceId } : {}),
        ...(input.message !== undefined ? { message: input.message } : {}),
      },
    });

    revalidatePath(`/dashboard/incidents/${incidentId}`);
    revalidatePath('/dashboard/incidents');
    revalidatePath('/dashboard');
    await revalidateOrganizationStatusPages(organization.id);
    return { ok: true, message: 'Incident updated.' };
  } catch (error) {
    return toFailure(error);
  }
}

export async function commentOnIncidentAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const incidentId = String(formData.get('incidentId') ?? '');
    const body = String(formData.get('body') ?? '').trim();
    if (!incidentId) return { ok: false, error: 'Missing incident id.' };
    if (body.length === 0) return { ok: false, error: 'Write something first.', fieldErrors: { body: 'Required.' } };

    await addIncidentComment({ organizationId: organization.id, userId: user.id, incidentId, body });
    revalidatePath(`/dashboard/incidents/${incidentId}`);
    return { ok: true, message: 'Comment added.' };
  } catch (error) {
    return toFailure(error);
  }
}

// ---------------------------------------------------------------- status pages

export async function createStatusPageAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const input = await parse(statusPageCreateSchema, formData);
    const page = await createStatusPage({
      organizationId: organization.id,
      userId: user.id,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      serviceIds: input.serviceIds,
    });
    revalidatePath('/dashboard/status');
    return { ok: true, message: `Status page created at /status/${page.slug}.` };
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateStatusPageAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const statusPageId = String(formData.get('statusPageId') ?? '');
    if (!statusPageId) return { ok: false, error: 'Missing status page id.' };

    const raw = toFormObject(formData);
    const serviceIds = Array.isArray(raw.serviceIds)
      ? raw.serviceIds
      : typeof raw.serviceIds === 'string' && raw.serviceIds.length > 0
        ? [raw.serviceIds]
        : [];

    await updateStatusPage({
      organizationId: organization.id,
      userId: user.id,
      statusPageId,
      ...(typeof raw.name === 'string' && raw.name.length > 0 ? { name: raw.name } : {}),
      ...(typeof raw.description === 'string' ? { description: raw.description } : {}),
      serviceIds,
    });

    revalidatePath('/dashboard/status');
    await revalidateOrganizationStatusPages(organization.id);
    return { ok: true, message: 'Status page updated.' };
  } catch (error) {
    return toFailure(error);
  }
}

export async function publishStatusPageAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const statusPageId = String(formData.get('statusPageId') ?? '');
    const input = statusPagePublishSchema.parse({ isPublished: String(formData.get('isPublished')) === 'true' });
    if (!statusPageId) return { ok: false, error: 'Missing status page id.' };

    const page = await setStatusPagePublished({
      organizationId: organization.id,
      userId: user.id,
      statusPageId,
      isPublished: input.isPublished,
    });

    revalidatePath('/dashboard/status');
    await revalidateOrganizationStatusPages(organization.id);
    return { ok: true, message: input.isPublished ? `Published at /status/${page?.slug}` : 'Status page unpublished.' };
  } catch (error) {
    return toFailure(error);
  }
}

// ---------------------------------------------------------------- webhooks

export async function createWebhookEndpointAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const input = await parse(webhookEndpointCreateSchema, formData);
    const result = await createEndpoint({
      organizationId: organization.id,
      userId: user.id,
      provider: input.provider,
      projectId: input.projectId,
      serviceId: input.serviceId ?? null,
      description: input.description ?? null,
    });

    revalidatePath('/dashboard/settings');
    return { ok: true, message: `Endpoint created. Signing secret (shown once): ${result.secret}`, data: { secret: result.secret, url: result.url } };
  } catch (error) {
    return toFailure(error);
  }
}

export async function rotateWebhookSecretAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const endpointId = String(formData.get('endpointId') ?? '');
    if (!endpointId) return { ok: false, error: 'Missing endpoint id.' };

    const result = await rotateEndpointSecret({ organizationId: organization.id, userId: user.id, endpointId });
    revalidatePath('/dashboard/settings');
    return { ok: true, message: `New signing secret (shown once): ${result.secret}`, data: { secret: result.secret } };
  } catch (error) {
    return toFailure(error);
  }
}

export async function toggleWebhookEndpointAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const endpointId = String(formData.get('endpointId') ?? '');
    const isActive = String(formData.get('isActive')) === 'true';
    if (!endpointId) return { ok: false, error: 'Missing endpoint id.' };

    await updateEndpoint({ organizationId: organization.id, userId: user.id, endpointId, isActive });
    revalidatePath('/dashboard/settings');
    return { ok: true, message: isActive ? 'Endpoint enabled.' : 'Endpoint disabled.' };
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteWebhookEndpointAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const endpointId = String(formData.get('endpointId') ?? '');
    if (!endpointId) return { ok: false, error: 'Missing endpoint id.' };

    await deleteEndpoint({ organizationId: organization.id, userId: user.id, endpointId });
    revalidatePath('/dashboard/settings');
    return { ok: true, message: 'Endpoint deleted.' };
  } catch (error) {
    return toFailure(error);
  }
}

// ---------------------------------------------------------------- ARCH Copilot (V2)

const COPILOT_LABELS = {
  SUMMARY: 'Summary',
  TRIAGE: 'Triage suggestion',
  STATUS_UPDATE: 'Status-update draft',
  POSTMORTEM: 'Postmortem draft',
  CODE_FIX: 'Code fix suggestion',
  VERIFIED_FIX: 'Verified fix suggestion',
} as const;

export async function generateCopilotDraftAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const input = await parse(copilotGenerateSchema, formData);
    await generateSuggestion({ organizationId: organization.id, userId: user.id, incidentId: input.incidentId, type: input.type, attachment: input.attachment });
    revalidatePath(`/dashboard/incidents/${input.incidentId}`);
    return { ok: true, message: `${COPILOT_LABELS[input.type]} drafted — review it below.` };
  } catch (error) {
    return toFailure(error);
  }
}

export async function approveCopilotDraftAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const suggestionId = String(formData.get('suggestionId') ?? '');
    if (!suggestionId) return { ok: false, error: 'Missing draft id.' };
    const input = await parse(copilotApproveSchema, formData);
    const suggestion = await approveSuggestion({ organizationId: organization.id, userId: user.id, suggestionId, text: input.text });
    if (suggestion) revalidatePath(`/dashboard/incidents/${suggestion.incidentId}`);
    await revalidateOrganizationStatusPages(organization.id);
    return { ok: true, message: suggestion?.type === 'TRIAGE' ? 'Triage applied.' : 'Posted to the timeline.' };
  } catch (error) {
    return toFailure(error);
  }
}

export async function dismissCopilotDraftAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const suggestionId = String(formData.get('suggestionId') ?? '');
    if (!suggestionId) return { ok: false, error: 'Missing draft id.' };
    const suggestion = await dismissSuggestion({ organizationId: organization.id, userId: user.id, suggestionId });
    if (suggestion) revalidatePath(`/dashboard/incidents/${suggestion.incidentId}`);
    return { ok: true, message: 'Draft dismissed.' };
  } catch (error) {
    return toFailure(error);
  }
}

// ---------------------------------------------------------------- ARCH Code Assist + ARCH Model (V3)

export type CodeReviewState = { ok: true; result: CodeReviewResult } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function reviewCodeAction(_state: CodeReviewState | undefined, formData: FormData): Promise<CodeReviewState> {
  try {
    const { user, organization } = await context();
    // Reject unauthorized requests before spending CPU on OCR; the service re-checks permission too.
    await requirePermission(organization.id, user.id, 'copilot.generate');
    // Read the code untrimmed: leading indentation matters (Python, YAML). Upload bytes are
    // bounded, type-checked and OCR'd locally before the service sees any extracted text.
    const input = codeReviewSchema.parse({
      code: String(formData.get('code') ?? '').replace(/\s+$/, ''),
      mode: formData.get('mode') || undefined,
      language: formData.get('language') || undefined,
    });
    const files = formData.getAll('attachments').filter((value): value is File => typeof value !== 'string' && value.size > 0);
    const result = await reviewCode({ organizationId: organization.id, userId: user.id, code: input.code, mode: input.mode, language: input.language, uploads: files });
    return { ok: true, result };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? 'Invalid input.' };
    const failure = toFailure(error);
    return failure.ok ? { ok: false, error: 'Something went wrong.' } : failure;
  }
}

export async function trainModelAction(_state: ActionResult | undefined, _formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    // V3: retraining is a background job — the click only queues it. The worker trains a
    // candidate, evaluates it against the active model and promotes it only if it wins.
    const job = await trainModel({ organizationId: organization.id, userId: user.id });
    revalidatePath('/dashboard/model');
    return {
      ok: true,
      message:
        job.status === 'PENDING' || job.status === 'RUNNING'
          ? 'Training queued — the worker will train, evaluate, and promote the new model only if it beats the current one. Refresh in a moment to see the result.'
          : 'Training queued.',
    };
  } catch (error) {
    return toFailure(error);
  }
}

export async function rollbackModelAction(_state: ActionResult | undefined, _formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const result = await rollbackModel({ organizationId: organization.id, userId: user.id });
    revalidatePath('/dashboard/model');
    return {
      ok: true,
      message: `Rolled back: v${result.version} is now serving (was v${result.previousVersion ?? '—'}). Recorded in the audit log.`,
    };
  } catch (error) {
    return toFailure(error);
  }
}

export async function activateModelVersionAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const versionId = String(formData.get('versionId') ?? '');
    const result = await activateModelVersion({ organizationId: organization.id, userId: user.id, versionId });
    revalidatePath('/dashboard/model');
    return { ok: true, message: `Version v${result.version} is now serving${result.previousVersion ? ` (was v${result.previousVersion})` : ''}. Recorded in the audit log.` };
  } catch (error) {
    return toFailure(error);
  }
}

// ---------------------------------------------------------------- V4 — Verified Fix Loop (GitHub repo connect + sandbox + PR)

export async function connectRepoAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const input = await parse(repoConnectionCreateSchema, formData);
    const connection = await createRepoConnection({
      organizationId: organization.id,
      userId: user.id,
      owner: input.owner,
      repo: input.repo,
      defaultBranch: input.defaultBranch,
      pinnedCommitSha: input.pinnedCommitSha ?? null,
    });
    revalidatePath('/dashboard/repos');
    revalidatePath('/dashboard/settings');
    return { ok: true, message: `Connected ${connection.fullName} @ ${connection.pinnedCommitSha ?? connection.defaultBranch}` };
  } catch (error) {
    return toFailure(error);
  }
}

export type RepoInsightState = { ok: true; result: RepoInsightAnswer } | { ok: false; error: string };

export async function askRepoInsightAction(_state: RepoInsightState | undefined, formData: FormData): Promise<RepoInsightState> {
  try {
    const { user, organization } = await context();
    const input = repoInsightAskSchema.parse({
      repoConnectionId: formData.get('repoConnectionId'),
      question: formData.get('question'),
    });
    const result = await askRepoInsight({
      organizationId: organization.id,
      userId: user.id,
      repoConnectionId: input.repoConnectionId,
      question: input.question,
    });
    return { ok: true, result };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? 'Invalid input.' };
    const failure = toFailure(error);
    return { ok: false, error: failure.ok ? 'Something went wrong.' : failure.error };
  }
}

export async function pinCommitAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const repoConnectionId = String(formData.get('repoConnectionId') ?? '');
    const input = await parse(repoPinSchema, formData);
    if (!repoConnectionId) return { ok: false, error: 'Missing repo connection id.' };
    const pinned = await pinRepoCommit({ organizationId: organization.id, userId: user.id, repoConnectionId, commitSha: input.commitSha });
    revalidatePath('/dashboard/repos');
    return { ok: true, message: `Pinned ${pinned.fullName} to ${pinned.pinnedCommitSha}` };
  } catch (error) {
    return toFailure(error);
  }
}

export async function deactivateRepoAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const repoConnectionId = String(formData.get('repoConnectionId') ?? '');
    if (!repoConnectionId) return { ok: false, error: 'Missing repo connection id.' };
    await deactivateRepoConnection({ organizationId: organization.id, userId: user.id, repoConnectionId });
    revalidatePath('/dashboard/repos');
    return { ok: true, message: 'Repository deactivated.' };
  } catch (error) {
    return toFailure(error);
  }
}

export async function generateVerifiedFixAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const incidentId = String(formData.get('incidentId') ?? '');
    if (!incidentId) return { ok: false, error: 'Missing incident id.' };
    const raw = toFormObject(formData);
    const input = verifiedFixGenerateSchema.parse({
      attachment: typeof raw.attachment === 'string' ? raw.attachment : undefined,
      repoConnectionId: typeof raw.repoConnectionId === 'string' && raw.repoConnectionId ? raw.repoConnectionId : undefined,
      commitSha: typeof raw.commitSha === 'string' && raw.commitSha ? raw.commitSha : undefined,
      testCommand: typeof raw.testCommand === 'string' && raw.testCommand ? raw.testCommand : undefined,
    });
    const result = await generateVerifiedFix({
      organizationId: organization.id,
      userId: user.id,
      incidentId,
      attachment: input.attachment ?? null,
      repoConnectionId: input.repoConnectionId ?? null,
      commitSha: input.commitSha ?? null,
      testCommand: input.testCommand ?? null,
    });
    revalidatePath(`/dashboard/incidents/${incidentId}`);
    return { ok: true, message: `Verified fix drafted${result.verification ? ` — verification ${result.verification.status}` : ''}. Review diff + evidence below.` };
  } catch (error) {
    return toFailure(error);
  }
}

export async function verifySuggestionAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const suggestionId = String(formData.get('suggestionId') ?? '');
    if (!suggestionId) return { ok: false, error: 'Missing suggestion id.' };
    const repoConnectionId = String(formData.get('repoConnectionId') ?? '') || null;
    const commitSha = String(formData.get('commitSha') ?? '') || null;
    const testCommand = String(formData.get('testCommand') ?? '') || null;
    const patch = String(formData.get('patch') ?? '').trim();
    if (!patch) return { ok: false, error: 'Patch is required.' };

    // Need incidentId — fetch suggestion via service? We'll require incidentId in form too
    const incidentId = String(formData.get('incidentId') ?? '');
    if (!incidentId) return { ok: false, error: 'Missing incident id.' };

    const verification = await verifyFix({
      organizationId: organization.id,
      userId: user.id,
      incidentId,
      suggestionId,
      repoConnectionId,
      commitSha,
      patch,
      testCommand,
    });
    revalidatePath(`/dashboard/incidents/${incidentId}`);
    return { ok: true, message: `Verification ${verification.status} — evidence bundle ready.` };
  } catch (error) {
    return toFailure(error);
  }
}

export async function approveVerificationAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const verificationId = String(formData.get('verificationId') ?? '');
    if (!verificationId) return { ok: false, error: 'Missing verification id.' };
    const title = String(formData.get('title') ?? '') || null;
    const body = String(formData.get('body') ?? '') || null;
    const pr = await approveAndCreatePr({ organizationId: organization.id, userId: user.id, verificationId, title, body });
    revalidatePath(`/dashboard/incidents/${pr.incidentId}`);
    revalidatePath('/dashboard/repos');
    // Tell the truth about which world we are in: an offline record is not a pull request.
    const githubLine = pr.externalUrl
      ? `PR opened: ${pr.branch} → ${pr.externalUrl}`
      : `No PR created — offline mode (GITHUB_TOKEN unset or GITHUB_MODE="mock"). Recorded branch ${pr.branch} and audited.`;
    return { ok: true, message: githubLine };
  } catch (error) {
    return toFailure(error);
  }
}

// ---------- V6 — knowledge base (RAG) ----------

/** Index a pasted runbook / doc / note. Chunked and embedded on this server. */
export async function ingestKnowledgeAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const body = await parse(knowledgeSourceCreateSchema, formData);
    const result = await ingestKnowledgeSource({
      organizationId: organization.id,
      userId: user.id,
      name: body.name,
      kind: body.kind,
      text: body.text,
    });
    revalidatePath('/dashboard/knowledge');
    return {
      ok: true,
      message: result.created
        ? `Indexed "${result.source.name}" into ${result.chunks} retrievable chunks. Copilot can now cite it.`
        : `"${result.source.name}" is already indexed — nothing changed.`,
    };
  } catch (error) {
    return toFailure(error);
  }
}

/** Fetch a public document and index it (SSRF-guarded; disabled when ARCH_OFFLINE_ONLY). */
export async function fetchKnowledgeAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const { user, organization } = await context();
    const body = await parse(knowledgeSourceFetchSchema, formData);
    const result = await fetchKnowledgeUrl({ organizationId: organization.id, userId: user.id, url: body.url, name: body.name });
    revalidatePath('/dashboard/knowledge');
    return { ok: true, message: `Fetched and indexed "${result.source.name}" into ${result.chunks} chunks.` };
  } catch (error) {
    return toFailure(error);
  }
}

/** Remove a source and its chunks (OWNER/ADMIN). */
export async function deleteKnowledgeAction(formData: FormData): Promise<void> {
  const { user, organization } = await context();
  const sourceId = String(formData.get('sourceId') ?? '');
  if (sourceId) await deleteKnowledgeSource({ organizationId: organization.id, userId: user.id, sourceId });
  revalidatePath('/dashboard/knowledge');
}
