/** A beforeinstallprompt event is single-use. Claim it synchronously before any await. */
export type AppInstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
export type AppInstallOutcome = 'accepted' | 'dismissed' | 'unavailable' | 'failed';

export function createInstallController() {
  let pending: AppInstallPrompt | null = null;
  let running = false;
  return {
    capture(prompt: AppInstallPrompt) { pending = prompt; },
    clear() { pending = null; },
    async install(): Promise<AppInstallOutcome> {
      if (running || !pending) return 'unavailable';
      const prompt = pending;
      pending = null;
      running = true;
      try {
        await prompt.prompt();
        return (await prompt.userChoice).outcome === 'accepted' ? 'accepted' : 'dismissed';
      } catch { return 'failed'; }
      finally { running = false; }
    },
  };
}
