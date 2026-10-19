import { MarketingMotion } from '@/components/marketing/gsap-reveal';
import { MarketingNav } from '@/components/marketing/nav';
import { Hero } from '@/components/marketing/hero';
import { ProofStrip } from '@/components/marketing/proof';
import { Pillars } from '@/components/marketing/pillars';
import { Workspace } from '@/components/marketing/workspace';
import { Workflow } from '@/components/marketing/workflow';
import { Engine } from '@/components/marketing/engine';
import { Control } from '@/components/marketing/control';
import { StatusProof } from '@/components/marketing/status-proof';
import { Deploy } from '@/components/marketing/deploy';
import { SiteFooter } from '@/components/marketing/footer';

/**
 * Section order is the argument:
 *   what it is → the constraints → what changes → the workspace → the workflow →
 *   the engine → who stays in control → the customer-facing outcome → how to run it → close.
 */
export default function LandingPage() {
  return (
    <MarketingMotion>
      <a href="#main" className="mk-skip">
        Skip to content
      </a>
      <MarketingNav />
      <main id="main" className="mk-main relative z-10" tabIndex={-1}>
        <Hero />
        <ProofStrip />
        <Pillars />
        <Workspace />
        <Workflow />
        <Engine />
        <Control />
        <StatusProof />
        <Deploy />
      </main>
      <SiteFooter />
    </MarketingMotion>
  );
}
