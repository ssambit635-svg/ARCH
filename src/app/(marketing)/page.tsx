import type { Metadata } from 'next';
import { Nav } from '@/components/marketing/nav';
import { Hero } from '@/components/marketing/hero';
import { IncidentPreview } from '@/components/marketing/incident-preview';
import { Lifecycle } from '@/components/marketing/lifecycle';
import { Intelligence } from '@/components/marketing/intelligence';
import { Topology } from '@/components/marketing/topology';
import { Platform } from '@/components/marketing/platform';
import { Proof } from '@/components/marketing/proof';
import { Deploy } from '@/components/marketing/deploy';
import { Integrations, Closing, Footer } from '@/components/marketing/closing';

export const metadata: Metadata = {
  title: 'Self-hosted incident response',
  description: 'ARCH brings alert intake, on-call coordination, status updates and the audit trail into one self-hosted workspace for engineering teams.',
};

/**
 * The sample workspace band.
 *
 * The hero makes a claim; this is the evidence. It is the same interactive component the console
 * is built from — a real incident, a real timeline, a real acknowledge action — running on sample
 * data, so a visitor can poke at the product before creating an account. It sits directly under
 * the hero on purpose: promise, then proof, then the story.
 */
function SampleWorkspace() {
  return (
    <section id="workspace" className="relative border-t border-white/[0.055] bg-ink-1000 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div>
            <p className="arch-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-signal-400">
              The workspace
            </p>
            <h2 className="arch-display mt-3.5 max-w-[26ch] text-[clamp(1.65rem,3vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-bone">
              A live incident, running inside this page.
            </h2>
          </div>
          <p className="max-w-[42ch] text-[14px] leading-[1.7] text-ash-400">
            Switch between the overview, the timeline and the affected services, then acknowledge
            it. Sample data — nothing here touches a real deployment.
          </p>
        </div>

        <div className="arch-hero-stage mx-auto mt-10 w-full max-w-[1140px] sm:mt-12">
          <IncidentPreview />
        </div>
      </div>
    </section>
  );
}

/**
 * ARCH — public story.
 *
 * The page is a server component. Every animated piece lives in its own client island under
 * `src/components/marketing/`, so the shell, the copy and the SEO surface ship as HTML and the
 * browser only pays for the motion it is actually going to use.
 * Narrative order follows the product rather than a template:
 *   hero         — the logotype at display scale, and the core you can turn over
 *   workspace    — a live sample incident, to poke at before signing up
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
        <SampleWorkspace />
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
