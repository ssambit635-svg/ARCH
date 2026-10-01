import { LinkArrow } from './link-arrow';
import Link from 'next/link';
import { GITHUB_REPO_URL } from '@/lib/brand';
import { AmbientVideo } from './ambient-video';

export function Closing() {
  return (
    <>
      <section className="mk-section mk-closing" aria-labelledby="closing-title">
        <div className="mk-container mk-closing-grid">
          <div>
            <p className="mk-eyebrow">Less overhead. More headspace.</p>
            <h2 id="closing-title" className="mk-title">Give your team<br />a little more clarity.</h2>
            <p className="mk-description">A focused workspace for the moments that matter.</p>
            <div className="mk-actions">
              <Link href="/register" className="mk-button">Get started <LinkArrow direction="right" /></Link>
              <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="mk-text-link">Explore on GitHub <LinkArrow /></a>
            </div>
          </div>
          <div className="mk-dragon-stage" aria-hidden="true">
            <AmbientVideo
              src="/arch-dragon-reveal.mp4"
              poster="/arch-dragon-poster.jpg"
              defer
              playOnce
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        </div>
      </section>

      <footer className="mk-footer">
        <div className="mk-container mk-footer-row">
          <Link href="/" className="mk-brand" aria-label="ARCH home"><span>ARCH</span></Link>
          <p>© 2026 ARCH. All rights reserved.</p>
          <nav aria-label="Footer">
            <a href={`${GITHUB_REPO_URL}/tree/main/docs`}>Documentation</a>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">GitHub <LinkArrow /></a>
            <a href={`${GITHUB_REPO_URL}/blob/main/SECURITY.md`}>Security</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
