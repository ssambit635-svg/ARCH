import { db } from '@/lib/db';
import { hash } from 'bcryptjs';
import { organizationRepository } from '@/server/repositories/organization.repository';
import { projectRepository } from '@/server/repositories/project.repository';
import { serviceRepository } from '@/server/repositories/service.repository';
import type { MembershipRole, IncidentSeverity } from '@/generated/prisma/client';

/** Wipe every table between tests — order matters because of foreign keys. */
export async function resetDatabase(): Promise<void> {
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE
      "arch_models", "ai_suggestions", "notifications", "audit_logs", "webhook_deliveries", "webhook_endpoints",
      "incident_events", "incidents", "status_page_services", "status_pages",
      "services", "projects", "invitations", "memberships", "sessions",
      "accounts", "verification_tokens", "organizations", "users"
    RESTART IDENTITY CASCADE
  `);
}

export async function createTestUser(email: string, name = email.split('@')[0]!) {
  return db.user.create({ data: { email, name, passwordHash: await hash('test-password-123', 8) } });
}

export async function createTestOrg(name: string, ownerId: string) {
  return organizationRepository.createWithOwner({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ownerId });
}

export async function addMember(organizationId: string, userId: string, role: MembershipRole) {
  return db.membership.create({ data: { organizationId, userId, role } });
}

export async function createTestProject(organizationId: string, name: string) {
  return projectRepository.create({ organizationId, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
}

export async function createTestService(projectId: string, name: string) {
  return serviceRepository.create({ projectId, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
}

export async function createTestIncident(params: {
  organizationId: string;
  projectId: string;
  serviceId?: string | null;
  createdById?: string | null;
  title?: string;
  severity?: IncidentSeverity;
}) {
  return db.incident.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId,
      serviceId: params.serviceId ?? null,
      createdById: params.createdById ?? null,
      title: params.title ?? 'Test incident',
      severity: params.severity ?? 'MEDIUM',
      status: 'INVESTIGATING',
    },
  });
}

/** A complete tenant: owner + organization + project + service. */
export async function createTenant(name: string, ownerEmail = `owner@${name.toLowerCase()}.test`) {
  const owner = await createTestUser(ownerEmail);
  const organization = await createTestOrg(name, owner.id);
  const project = await createTestProject(organization.id, `${name} platform`);
  const service = await createTestService(project.id, `${name} API`);
  return { owner, organization, project, service };
}

export { db };
