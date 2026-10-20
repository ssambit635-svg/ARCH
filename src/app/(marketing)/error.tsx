'use client';

import { useEffect } from 'react';

/**
 * The public site is the one surface a visitor sees before they can sign in, so it must never
 * fail as a blank page. This boundary catches a client-side error in the marketing tree (a
 * failed hydration, a browser that cannot run the motion layer) and offers the content again
 * instead of leaving an empty document in the viewport.
 */
export default function MarketingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the message for the console; never render an internal error to a visitor.
    console.warn('[mk] the marketing page recovered from a client error.');
  }, []);

  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'grid',
        placeItems: 'center',
        padding: '48px 24px',
        background: '#f6f4ef',
        color: '#10131a',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 460 }}>
        <p style={{ margin: '0 0 10px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4f5561' }}>
          ARCH · Response
        </p>
        <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
          This page didn’t finish loading.
        </h1>
        <p style={{ margin: '14px 0 0', fontSize: 15, lineHeight: 1.6, color: '#4f5561' }}>
          The site itself is fine — something in this browser stopped the page from rendering.
          Reloading usually clears it.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{ height: 46, padding: '0 22px', border: 0, borderRadius: 999, background: '#10131a', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Reload the page
          </button>
          <a
            href="/login"
            style={{ height: 46, display: 'inline-flex', alignItems: 'center', padding: '0 22px', border: '1px solid #cfc7b8', borderRadius: 999, color: '#10131a', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
          >
            Open the console
          </a>
        </div>
      </div>
    </div>
  );
}
