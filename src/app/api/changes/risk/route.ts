import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { changeRiskQuerySchema } from '@/lib/validation';
import { changeRiskReport } from '@/server/services/changeRisk.service';

/**
 * V6 — which recent changes are most likely to cause an incident, and why. A ranking aid for
 * humans: it never blocks or rolls back anything by itself.
 */
export const GET = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  const url = new URL(request.url);
  const query = changeRiskQuerySchema.parse({
    serviceId: url.searchParams.get('serviceId') ?? undefined,
    take: url.searchParams.get('take') ?? undefined,
  });
  return ok(
    await changeRiskReport({
      organizationId: organization.id,
      userId: user.id,
      serviceId: query.serviceId,
      take: query.take,
    }),
  );
});
