import { redirect } from 'next/navigation';

/**
 * `/dashboard/services` is a segment, not a page: services live under a project
 * (`/dashboard/projects`). Next.js requests this segment's RSC payload while
 * prefetching `/dashboard/services/[id]`, so without a route here the browser
 * logs a 404 on every service page. Redirect to the real destination instead.
 */
export default function ServicesSegmentPage() {
  redirect('/dashboard/projects');
}
