import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import type { ServiceStatus } from '@/generated/prisma/client';
import { projectRepository } from '../repositories/project.repository';
import { serviceRepository } from '../repositories/service.repository';
import { uniqueProjectSlug, uniqueServiceSlug } from './slug.service';

/**
 * Projects and services (the catalog ARCH monitors).
 * Reads require `project.read`, writes require `project.manage` — both scoped to the caller's
 * organization by the repository layer as well.
 */

export async function listProjects(params: { organizationId: string; userId: string; q?: string }) {
  await requirePermission(params.organizationId, params.userId, 'project.read');
  return projectRepository.list(params.organizationId, { q: params.q });
}

export async function getProject(params: { organizationId: string; userId: string; projectId: string }) {
  await requirePermission(params.organizationId, params.userId, 'project.read');
  const project = await projectRepository.findById(params.organizationId, params.projectId);
  if (!project) throw AppError.notFound('Project not found.');
  return project;
}

export async function createProject(params: {
  organizationId: string;
  userId: string;
  name: string;
  slug?: string;
  description?: string | null;
}) {
  await requirePermission(params.organizationId, params.userId, 'project.manage');

  return db.$transaction(async (tx) => {
    const slug = params.slug ?? (await uniqueProjectSlug(params.organizationId, params.name, tx));
    const existing = await projectRepository.findBySlug(params.organizationId, slug, tx);
    if (existing) throw AppError.conflict('That slug is already used by another project.');

    const project = await projectRepository.create(
      { organizationId: params.organizationId, name: params.name, slug, description: params.description ?? null },
      tx,
    );

    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'project.create',
        entityType: 'project',
        entityId: project.id,
        metadata: { name: project.name, slug: project.slug },
      },
      tx,
    );
    return project;
  });
}

export async function updateProject(params: {
  organizationId: string;
  userId: string;
  projectId: string;
  name?: string;
  description?: string | null;
}) {
  await requirePermission(params.organizationId, params.userId, 'project.manage');
  const existing = await projectRepository.findById(params.organizationId, params.projectId);
  if (!existing) throw AppError.notFound('Project not found.');

  return db.$transaction(async (tx) => {
    await projectRepository.update(
      params.organizationId,
      params.projectId,
      { ...(params.name ? { name: params.name } : {}), ...(params.description !== undefined ? { description: params.description } : {}) },
      tx,
    );
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'project.update',
        entityType: 'project',
        entityId: params.projectId,
        metadata: { name: params.name ?? existing.name },
      },
      tx,
    );
    return projectRepository.findById(params.organizationId, params.projectId, tx);
  });
}

export async function deleteProject(params: { organizationId: string; userId: string; projectId: string }) {
  await requirePermission(params.organizationId, params.userId, 'project.manage');
  const existing = await projectRepository.findById(params.organizationId, params.projectId);
  if (!existing) throw AppError.notFound('Project not found.');

  return db.$transaction(async (tx) => {
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'project.delete',
        entityType: 'project',
        entityId: params.projectId,
        metadata: { name: existing.name },
      },
      tx,
    );
    await projectRepository.remove(params.organizationId, params.projectId, tx);
    return { id: params.projectId };
  });
}

export async function listServices(params: { organizationId: string; userId: string; projectId?: string }) {
  await requirePermission(params.organizationId, params.userId, 'project.read');
  return serviceRepository.list(params.organizationId, { projectId: params.projectId });
}

export async function createService(params: {
  organizationId: string;
  userId: string;
  projectId: string;
  name: string;
  slug?: string;
  description?: string | null;
  status?: ServiceStatus;
  autoStatus?: boolean;
}) {
  await requirePermission(params.organizationId, params.userId, 'project.manage');
  const project = await projectRepository.findById(params.organizationId, params.projectId);
  if (!project) throw AppError.notFound('Project not found.');

  return db.$transaction(async (tx) => {
    const slug = params.slug ?? (await uniqueServiceSlug(params.projectId, params.name, tx));
    const service = await serviceRepository.create(
      {
        projectId: params.projectId,
        name: params.name,
        slug,
        description: params.description ?? null,
        status: params.status ?? 'OPERATIONAL',
        autoStatus: params.autoStatus ?? true,
      },
      tx,
    );

    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'service.create',
        entityType: 'service',
        entityId: service.id,
        metadata: { name: service.name, projectId: params.projectId },
      },
      tx,
    );
    return service;
  });
}

export async function updateService(params: {
  organizationId: string;
  userId: string;
  serviceId: string;
  name?: string;
  description?: string | null;
  status?: ServiceStatus;
  autoStatus?: boolean;
}) {
  await requirePermission(params.organizationId, params.userId, 'project.manage');
  const existing = await serviceRepository.findById(params.organizationId, params.serviceId);
  if (!existing) throw AppError.notFound('Service not found.');

  return db.$transaction(async (tx) => {
    const service = await serviceRepository.update(
      params.serviceId,
      {
        ...(params.name ? { name: params.name } : {}),
        ...(params.description !== undefined ? { description: params.description } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.autoStatus !== undefined ? { autoStatus: params.autoStatus } : {}),
      },
      tx,
    );

    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'service.update',
        entityType: 'service',
        entityId: params.serviceId,
        metadata: {
          status: params.status ?? existing.status,
          statusChanged: Boolean(params.status && params.status !== existing.status),
        },
      },
      tx,
    );
    return service;
  });
}

export async function deleteService(params: { organizationId: string; userId: string; serviceId: string }) {
  await requirePermission(params.organizationId, params.userId, 'project.manage');
  const existing = await serviceRepository.findById(params.organizationId, params.serviceId);
  if (!existing) throw AppError.notFound('Service not found.');

  return db.$transaction(async (tx) => {
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'service.delete',
        entityType: 'service',
        entityId: params.serviceId,
        metadata: { name: existing.name },
      },
      tx,
    );
    await serviceRepository.remove(existing.projectId, params.serviceId, tx);
    return { id: params.serviceId };
  });
}
