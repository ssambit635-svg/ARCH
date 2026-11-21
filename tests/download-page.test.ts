import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DownloadPage from '@/app/(marketing)/download/page';
import { Hero } from '@/components/marketing/hero';
import { MarketingNav } from '@/components/marketing/nav';
import { SiteFooter } from '@/components/marketing/footer';

const render = (component: () => React.ReactNode) => renderToStaticMarkup(h(component));

describe('public desktop app discovery', () => {
  it('exposes Download ARCH before login in desktop/mobile navigation, hero and footer', () => {
    const nav = render(MarketingNav);
    expect((nav.match(/href="\/download"/g) ?? []).length).toBe(2);
    for (const component of [Hero, SiteFooter]) expect(render(component)).toContain('href="/download"');
  });
  it('has real Windows/Linux action buttons and a browser fallback without fake binaries', () => {
    const html = render(DownloadPage);
    expect(html).toContain('Install for Windows');
    expect(html).toContain('Install for Linux');
    expect(html).toContain('role="status"');
    expect(html).toContain('Installation steps');
    expect(html).toContain('Continue in browser');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('No .exe or AppImage yet.');
    expect(html).toContain('browser-installed app (PWA)');
    expect(html).toContain('does not keep a free Render backend awake');
    expect(html).not.toMatch(/href="[^"]*\.(exe|AppImage|deb|rpm)"/);
  });
  it('keeps home links correct on a non-home route and supplies instructions without JavaScript', () => {
    const html = render(DownloadPage);
    expect(html).toContain('href="/"');
    expect(html).not.toContain('href="#product"');
    expect(html).toContain('<noscript>');
    expect(html).toContain('Firefox desktop');
  });
});
