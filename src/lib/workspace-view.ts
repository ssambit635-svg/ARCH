import type { ServiceStatus } from '@/generated/prisma/client';

export type PublishedStatusPage = { slug: string; name: string } | null;

/** Organization slugs and status-page slugs are independent. Never construct a public URL from the former. */
export function statusPageDestination(page: PublishedStatusPage) {
  return page
    ? {
        href: `/status/${encodeURIComponent(page.slug)}`,
        label: 'Public status page',
        public: true,
      }
    : { href: '/dashboard/status', label: 'Set up status page', public: false };
}

/** Describe only configured workspace data; absence of incidents is not proof of service health. */
export function workspaceHealth(openIncidents: number, services: { status: ServiceStatus }[]) {
  const impacted = services.filter(
    (service) => service.status === 'DEGRADED' || service.status === 'OUTAGE',
  ).length;
  const maintenance = services.filter((service) => service.status === 'MAINTENANCE').length;
  if (openIncidents > 0)
    return {
      tone: 'danger' as const,
      title: `${openIncidents} open incident${openIncidents === 1 ? '' : 's'}`,
      description: `${impacted} service${impacted === 1 ? '' : 's'} marked degraded or outage. Review the response queue below.`,
    };
  if (impacted > 0)
    return {
      tone: 'warning' as const,
      title: `${impacted} service${impacted === 1 ? '' : 's'} need${impacted === 1 ? 's' : ''} attention`,
      description:
        'No open incidents, but these services are marked degraded or outage. Check pinned statuses.',
    };
  if (services.length === 0)
    return {
      tone: 'neutral' as const,
      title: 'No services configured yet',
      description:
        'Add a project and its services to give your team a shared view of their status.',
    };
  return {
    tone: maintenance > 0 ? ('info' as const) : ('success' as const),
    title: 'No open incidents',
    description:
      maintenance > 0
        ? `${maintenance} service${maintenance === 1 ? '' : 's'} in maintenance. Other tracked services are marked operational.`
        : 'Your tracked services are marked operational. This reflects recorded statuses, not independent monitoring.',
  };
}
