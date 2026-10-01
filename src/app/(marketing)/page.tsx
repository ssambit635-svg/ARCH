import { MarketingNav } from '@/components/marketing/nav';
import { Hero } from '@/components/marketing/hero';
import { Intelligence } from '@/components/marketing/intelligence';
import { Topology } from '@/components/marketing/topology';
import { Workspace } from '@/components/marketing/workspace';
import { Lifecycle } from '@/components/marketing/lifecycle';
import { Platform } from '@/components/marketing/platform';
import { Deploy } from '@/components/marketing/deploy';
import { Closing } from '@/components/marketing/closing';

export default function LandingPage() {
  return (
    <div className="mk">
      <a href="#main" className="mk-skip">
        Skip to content
      </a>
      <MarketingNav />
      <main id="main" className="relative z-10">
        <Hero />
        <Intelligence />
        <Workspace />
        <Lifecycle />
        <Topology />
        <Platform />
        <Deploy />
      </main>
      <Closing />
    </div>
  );
}
