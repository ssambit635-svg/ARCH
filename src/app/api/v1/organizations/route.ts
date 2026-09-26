import { handleRoute, ok } from '@/lib/api';
import { publicContext } from '@/lib/public-auth';

/** Bearer credentials can only discover their own organization. */
export const GET = handleRoute(async (request) => {
  const { organization } = await publicContext(request, 'org.read');
  return ok([{ id: organization.id, name: organization.name, slug: organization.slug }]);
});
