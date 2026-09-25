import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { fixVerificationRepository } from '@/server/repositories/fixVerification.repository';
import { AppError } from '@/lib/errors';

type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute<Context>(async (_request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(_request);
  const verification = await fixVerificationRepository.findById(organization.id, id);
  if (!verification) throw AppError.notFound('Verification not found.');
  return ok(verification);
});
