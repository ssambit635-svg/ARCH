'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { createInstallController, type AppInstallPrompt as InstallPrompt, type AppInstallOutcome } from '@/lib/app-installation';

const AppContext = createContext<{
  prompt: InstallPrompt | null; installed: boolean; offline: boolean; update: boolean;
  install: () => Promise<AppInstallOutcome>;
}>({ prompt: null, installed: false, offline: false, update: false, install: async () => 'unavailable' });

/** Public-asset-only worker. No registration in dev; failures never block web navigation. */
export function AppExperience({ children }: { children: ReactNode }) {
  const controller = useRef(createInstallController());
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [offline, setOffline] = useState(false);
  const [update, setUpdate] = useState(false);
  useEffect(() => {
    const display = window.matchMedia('(display-mode: standalone)');
    const syncDisplay = () => setInstalled(display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const syncNetwork = () => setOffline(!navigator.onLine);
    const capture = (event: Event) => { event.preventDefault(); controller.current.capture(event as InstallPrompt); setPrompt(event as InstallPrompt); };
    const installedEvent = () => { controller.current.clear(); setInstalled(true); setPrompt(null); };
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
    const found = () => {
      installing?.removeEventListener('statechange', changed);
      installing = registration?.installing ?? null;
      installing?.addEventListener('statechange', changed);
      changed();
    };
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
        if (disposed) return;
        registration = reg;
        if (reg.waiting) setUpdate(true);
        reg.addEventListener('updatefound', found);
        found();
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
  async function install(): Promise<AppInstallOutcome> {
    // Clear rendered availability immediately; controller also guards same-tick duplicate clicks.
    setPrompt(null);
    return controller.current.install();
  }

  return <AppContext.Provider value={{ prompt, installed, offline, update, install }}>{children}</AppContext.Provider>;
}

export function useAppInstallation() {
  return useContext(AppContext);
}

export function InstallApp() {
  const app = useContext(AppContext);
  return (
    <details className="workspace-install">
      <summary>{app.installed ? 'App options' : 'Install ARCH'}</summary>
      <div className="workspace-install-panel">
        <strong>{app.installed ? 'Your workspace, installed.' : 'A quieter home for your workspace.'}</strong>
        <p>Use ARCH in its own window with the same account and features.</p>
        <a href="/download">Windows &amp; Linux installation →</a>
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
