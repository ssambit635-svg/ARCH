/* Bounded startup retries only while this page is visible; never a background keep-alive. */
const status = document.getElementById('connection-status');
const retry = document.getElementById('retry');
let busy = false;
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
}
async function connect() {
  if (busy) return;
  busy = true;
  retry.disabled = true;
  try {
    for (let attempt = 1; attempt <= 6; attempt++) {
      if (!navigator.onLine) {
        status.textContent = 'You appear to be offline. Reconnect, then choose Connect again.';
        return;
      }
      if (document.hidden) { status.textContent = 'Connection paused. Choose Connect again when you are ready.'; return; }
      status.textContent = `Connecting to your server (${attempt}/6). Free hosting may need about a minute to wake up.`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch('/api/health', { cache: 'no-store', credentials: 'omit', signal: controller.signal });
        if (response.ok && !response.redirected) { window.location.replace('/dashboard'); return; }
      } catch { /* Offer bounded retries, never claim the user's data is loaded. */ }
      finally { clearTimeout(timeout); }
      if (attempt < 6) await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    status.textContent = 'Your server is still unreachable. It may be waking up or experiencing a problem. Try again when ready.';
  } finally { busy = false; retry.disabled = false; }
}
retry.addEventListener('click', () => { void connect(); });
void connect();
