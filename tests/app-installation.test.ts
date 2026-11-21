import { describe, expect, it, vi } from 'vitest';
import { createInstallController, type AppInstallPrompt } from '@/lib/app-installation';

function prompt(outcome: 'accepted' | 'dismissed' = 'accepted'): AppInstallPrompt {
  return Object.assign(new Event('beforeinstallprompt'), { prompt: vi.fn(async () => {}), userChoice: Promise.resolve({ outcome }) });
}

describe('single-use browser installation controller', () => {
  it('reports unavailable before a browser offers installation', async () => {
    expect(await createInstallController().install()).toBe('unavailable');
  });
  it.each(['accepted', 'dismissed'] as const)('preserves the browser result %s and consumes the prompt', async (outcome) => {
    const c = createInstallController(); const p = prompt(outcome); c.capture(p);
    expect(await c.install()).toBe(outcome); expect(await c.install()).toBe('unavailable'); expect(p.prompt).toHaveBeenCalledOnce();
  });
  it('claims the event synchronously so two same-tick clicks cannot show it twice', async () => {
    const c = createInstallController(); const p = prompt(); c.capture(p);
    const first = c.install(); const second = c.install();
    expect(await second).toBe('unavailable'); expect(await first).toBe('accepted'); expect(p.prompt).toHaveBeenCalledOnce();
  });
  it('reports a prompt exception without an unhandled rejection or retrying a spent event', async () => {
    const c = createInstallController(); const p = prompt(); vi.mocked(p.prompt).mockRejectedValue(new Error('blocked')); c.capture(p);
    expect(await c.install()).toBe('failed'); expect(await c.install()).toBe('unavailable');
  });
  it('clears a pending event when the app is installed elsewhere', async () => {
    const c = createInstallController(); const p = prompt(); c.capture(p); c.clear();
    expect(await c.install()).toBe('unavailable'); expect(p.prompt).not.toHaveBeenCalled();
  });
  it('uses the latest browser prompt rather than a superseded one', async () => {
    const c = createInstallController(); const old = prompt(); const fresh = prompt(); c.capture(old); c.capture(fresh);
    expect(await c.install()).toBe('accepted'); expect(old.prompt).not.toHaveBeenCalled(); expect(fresh.prompt).toHaveBeenCalledOnce();
  });
  it('keeps a newly captured event when an older prompt is still resolving', async () => {
    const c = createInstallController(); let resolve!: () => void;
    const old = prompt(); vi.mocked(old.prompt).mockImplementation(() => new Promise((done) => { resolve = done; }));
    c.capture(old); const first = c.install(); const fresh = prompt(); c.capture(fresh);
    expect(await c.install()).toBe('unavailable'); resolve(); await first;
    expect(await c.install()).toBe('accepted'); expect(fresh.prompt).toHaveBeenCalledOnce();
  });
});
