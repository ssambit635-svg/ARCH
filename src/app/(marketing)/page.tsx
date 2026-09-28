import type { Metadata } from 'next';
import { Nav } from '@/components/marketing/nav';
import { Hero } from '@/components/marketing/hero';
import { Lifecycle } from '@/components/marketing/lifecycle';
import { Intelligence } from '@/components/marketing/intelligence';
import { Topology } from '@/components/marketing/topology';
import { Platform } from '@/components/marketing/platform';
import { Proof } from '@/components/marketing/proof';
import { Deploy } from '@/components/marketing/deploy';
import { Integrations, Closing, Footer } from '@/components/marketing/closing';

export const metadata: Metadata = {
  title: 'ARCH — incident response for developer teams',
  description:
    'One alert lands and ARCH carries it the whole distance: incident opened, responder assigned, timeline running, status page published, audit trail sealed. Self-hosted, with a native on-call engine compiled into the repository that never sends your incident data to a third party.',
};

/**
 * ARCH — public story.
 *
 * The page is a server component. Every animated piece lives in its own client island under
 * `src/components/marketing/`, so the shell, the copy and the SEO surface ship as HTML and the
 * browser only pays for the motion it is actually going to use.
 *
 * Narrative order follows the product rather than a template:
 *   hero         — a live system mid-incident, the graph already showing the blast radius
 *   lifecycle    — the four moves ARCH makes, pinned and scrubbed
 *   intelligence — ARCH V1.1: one native engine, no vendor, human approval on everything
 *   topology     — the interactive dependency map, plus a real CC-BY Sketchfab model stage
 *   platform     — the dense capability grid, each card carrying a miniature of the real artefact
 *   proof        — the numbers, and the boundary: what ARCH is not
 *   deploy       — self-hosting, because that is the actual differentiator
 *   integrations — anything that can POST an HMAC-signed webhook
 *   closing      — the ask, and a footer dense enough to be a sitemap
 */
export default function MarketingHome() {
  return (
    <>
      <Nav />
      <main className="relative">
        <Hero />
        <Lifecycle />
        <Intelligence />
        <Topology />
        <Platform />
        <Proof />
        <Deploy />
        <Integrations />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
