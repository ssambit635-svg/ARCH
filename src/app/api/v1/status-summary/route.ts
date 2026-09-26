import { handleRoute, ok } from '@/lib/api';
import { publicContext } from '@/lib/public-auth';
import { listStatusPages } from '@/server/services/statusPage.service';

export const GET = handleRoute(async (request) => {
  const { user, organization } = await publicContext(request, 'statuspage.read');
  const pages = await listStatusPages({ organizationId: organization.id, userId: user.id });
  return ok(pages.filter((page) => page.isPublished).map((page) => ({ name: page.name, slug: page.slug, url: `/status/${page.slug}` })));
});
