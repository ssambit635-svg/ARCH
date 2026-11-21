'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
const AppContext = createContext<{
  prompt: InstallPrompt | null; installed: boolean; offline: boolean; update: boolean;
  install: () => Promise<void>;
}>({ prompt: null, installed: false, offline: false, update: false, install: async () => {} });

/** Public-asset-only worker. No registration in dev; failures never block web navigation. */
export function AppExperience({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [offline, setOffline] = useState(false);
  const [update, setUpdate] = useState(false);
  useEffect(() => {
    const display = window.matchMedia('(display-mode: standalone)');
    const syncDisplay = () => setInstalled(display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const syncNetwork = () => setOffline(!navigator.onLine);
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const installedEvent = () => { setInstalled(true); setPrompt(null); };
    syncDisplay(); syncNetwork();
    display.addEventListener('change', syncDisplay);
    window.addEventListener('online', syncNetwork);
    window.addEventListener('offline', syncNetwork);
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', installedEvent);
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let installing: ServiceWorker | null = null;
    const changed = () => { if (!disposed && installing?.state === 'installed' && navigator.serviceWorker.controller) setUpdate(true); };
    const found = () => { installing = registration?.installing ?? null; installing?.addEventListener('statechange', changed); };
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
        if (disposed) return;
        registration = reg;
        if (reg.waiting) setUpdate(true);
        reg.addEventListener('updatefound', found);
      }).catch(() => { /* Browser install UI remains available; the website must still work. */ });
    }
    return () => {
      disposed = true;
      display.removeEventListener('change', syncDisplay);
      window.removeEventListener('online', syncNetwork);
      window.removeEventListener('offline', syncNetwork);
      window.removeEventListener('beforeinstallprompt', capture);
      window.removeEventListener('appinstalled', installedEvent);
      registration?.removeEventListener('updatefound', found);
      installing?.removeEventListener('statechange', changed);
    };
  }, []);
  async function install() {
    if (!prompt) return;
    try { await prompt.prompt(); await prompt.userChoice; }
    catch { /* Use the browser menu if its prompt cannot open. */ }
    finally { setPrompt(null); }
  }
  return <AppContext.Provider value={{ prompt, installed, offline, update, install }}>{children}</AppContext.Provider>;
}

export function InstallApp() {
  const app = useContext(AppContext);
  return (
    <details className="workspace-install">
      <summary>{app.installed ? 'App options' : 'Install ARCH'}</summary>
      <div className="workspace-install-panel">
        <strong>{app.installed ? 'Your workspace, installed.' : 'A quieter home for your workspace.'}</strong>
        <p>Use ARCH in its own window with the same account and features.</p>
        {app.prompt && !app.installed ? <button type="button" onClick={() => void app.install()}>Install app</button> : null}
        {!app.installed ? <p>Chrome / Edge: browser menu → Install ARCH or Install this site as an app. iPhone / iPad: Safari → Share → Add to Home Screen. Options depend on your browser.</p> : null}
        <p>The opening screen can load offline after setup. Live incidents and sign-in still need a connection; installation does not remove server cold starts.</p>
        {app.update ? <p role="status">An app update is ready. Save your work, then close all ARCH tabs and app windows and reopen. No automatic reload.</p> : null}
      </div>
    </details>
  );
}

export function WorkspaceConnectionNotice() {
  const { offline } = useContext(AppContext);
  if (!offline) return null;
  return <div className="workspace-connection-notice" role="status">You appear to be offline. Live data may be outdated and changes cannot be sent. Keep this tab open to preserve unsent input.</div>;
}
