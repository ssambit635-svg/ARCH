/* Bounded visible-page startup only: never a background host keep-alive. */
const status = document.getElementById('connection-status');
const retry = document.getElementById('retry');
let busy = false;
let generation = 0;
let activeRequest = null;
let activeDeadline = null;
let cancelPause = null;

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
}
function setBusy(value) {
  busy = value;
  retry.disabled = value;
  retry.textContent = value ? 'Connecting…' : 'Connect again';
  status.setAttribute('aria-busy', String(value));
}
function cancel(message) {
  generation++;
  activeRequest?.abort();
  activeRequest = null;
  clearTimeout(activeDeadline);
  activeDeadline = null;
  cancelPause?.();
  cancelPause = null;
  setBusy(false);
  status.textContent = message;
}
function pause() {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { cancelPause = null; resolve(); }, 5000);
    cancelPause = () => { clearTimeout(timer); resolve(); };
  });
}
async function connect() {
  if (busy) return;
  const current = ++generation;
  setBusy(true);
  try {
    for (let attempt = 1; attempt <= 6; attempt++) {
      if (current !== generation) return;
      if (!navigator.onLine) {
        status.textContent = 'You appear to be offline. Reconnect, then choose Connect again.';
        return;
      }
      if (document.hidden) {
        status.textContent = 'Connection paused. Choose Connect again when you are ready.';
        return;
      }
      status.textContent = `Connecting to your server (${attempt}/6). Free hosting may need about a minute to wake up.`;
      const controller = new AbortController();
      activeRequest = controller;
      const timeout = setTimeout(() => controller.abort(), 10000);
      activeDeadline = timeout;
      try {
        const response = await fetch('/api/health', {
          cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal,
        });
        // A proxy login/captive portal returning 200 HTML is not a healthy ARCH backend.
        const json = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase() === 'application/json';
        const health = response.ok && !response.redirected && json ? await response.json() : null;
        if (current !== generation || controller.signal.aborted || document.hidden || !navigator.onLine) return;
        if (health?.status === 'ok' && health?.checks?.database?.status === 'ok') {
          window.location.replace('/dashboard');
          return;
        }
      } catch { /* Do not expose backend/provider errors or claim live data was loaded. */ }
      finally {
        clearTimeout(timeout);
        if (activeDeadline === timeout) activeDeadline = null;
        if (activeRequest === controller) activeRequest = null;
      }
      if (current !== generation) return;
      if (attempt < 6) await pause();
    }
    if (current === generation) status.textContent = 'Your server is still unreachable. It may be waking up or experiencing a problem. Try again when ready.';
  } finally {
    // A cancelled request cannot reset the UI belonging to a newer manual retry.
    if (current === generation) setBusy(false);
  }
}
retry.addEventListener('click', () => { void connect(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancel('Connection paused. Choose Connect again when you are ready.');
});
window.addEventListener('offline', () => cancel('You appear to be offline. Reconnect, then choose Connect again.'));
window.addEventListener('pagehide', () => cancel('Connection paused. Reopen ARCH to connect.'));
void connect();
