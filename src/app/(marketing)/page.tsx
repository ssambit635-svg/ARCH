import { MarketingMotion } from '@/components/marketing/gsap-reveal';
import { MarketingNav } from '@/components/marketing/nav';
import { ParallaxStory } from '@/components/marketing/parallax-story';
import { Hero } from '@/components/marketing/hero';
import { Intelligence } from '@/components/marketing/intelligence';
import { Topology } from '@/components/marketing/topology';
import { Workspace } from '@/components/marketing/workspace';
import { Lifecycle } from '@/components/marketing/lifecycle';
import { Platform } from '@/components/marketing/platform';
import { Deploy } from '@/components/marketing/deploy';
import { SiteFooter } from '@/components/marketing/footer';

export default function LandingPage() {
  return (
    <MarketingMotion>
      <a href="#main" className="mk-skip">
        Skip to content
      </a>
      <MarketingNav />
      <main id="main" className="mk-main relative z-10" tabIndex={-1}>
        <Hero />
        <ParallaxStory />
        <Intelligence />
        <Workspace />
        <Lifecycle />
        <Topology />
        <Platform />
        <Deploy />
      </main>
      <SiteFooter />
    </MarketingMotion>
  );
}
