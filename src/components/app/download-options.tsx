'use client';

import { useState } from 'react';
import { useAppInstallation } from './app-experience';

const platforms = [
  { id: 'windows', name: 'Windows', browser: 'Microsoft Edge or Google Chrome', steps: 'Open this page in Edge or Chrome. In the browser menu, choose Apps → Install this site as an app, or Install ARCH. Menu wording varies by browser version.' },
  { id: 'linux', name: 'Linux', browser: 'Google Chrome or a Chromium-based browser with app installation', steps: 'Open this page in Chrome or a supported Chromium browser. Open the browser menu and choose Cast, save and share → Install page as app, or Install ARCH. Your desktop integration depends on the browser and Linux distribution.' },
] as const;

export function DownloadOptions() {
  const app = useAppInstallation();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  async function install(platform: (typeof platforms)[number]) {
    if (app.installed) { setNotice('You are already using ARCH in an installed app window. Open your workspace to continue.'); return; }
    if (busy) return;
    if (app.prompt) {
      setBusy(true);
      try {
        const outcome = await app.install();
        setNotice(outcome === 'accepted'
          ? 'Installation accepted. Launch ARCH from your app menu when your browser finishes.'
          : outcome === 'dismissed'
            ? 'Installation cancelled. ARCH was not installed by this prompt. You can still use it in your browser.'
            : platform.steps);
      } finally { setBusy(false); }
    } else {
      setNotice(platform.steps);
    }
  }
  return <>
    <div className="download-platforms">
      {platforms.map((platform) => <section key={platform.id} className="download-card" aria-labelledby={`${platform.id}-title`}>
        <span className="download-platform-mark" aria-hidden="true">{platform.id === 'windows' ? <svg viewBox="0 0 32 32" fill="currentColor"><path d="M3 5l11-1.5V15H3zm13-1.8L29 1.5V15H16zM3 17h11v11.5L3 27zm13 0h13v13.5L16 28.8z" /></svg> : <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="26" height="22" rx="4"/><path d="m8 12 5 4-5 4m9 0h7"/></svg>}</span>
        <h2 id={`${platform.id}-title`}>ARCH for {platform.name}</h2>
        <p>{platform.browser}</p>
        <button type="button" disabled={busy} aria-busy={busy} onClick={() => void install(platform)}>{busy ? 'Opening install prompt…' : app.installed ? 'Already in app window' : `Install for ${platform.name}`} <span aria-hidden="true">↗</span></button>
        <span className="download-method">Browser-installed app · no native installer</span>
        <details><summary>Installation steps</summary><p>{platform.steps}</p></details>
      </section>)}
    </div>
    <p className="download-notice" role="status" aria-live="polite">{notice ?? 'Choose your platform. A supported browser will offer installation; if no prompt is available, we’ll show the exact browser-menu steps.'}</p>
  </>;
}
