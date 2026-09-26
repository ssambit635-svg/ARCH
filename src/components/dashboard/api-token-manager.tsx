'use client';

import { useState } from 'react';

type Token = { id: string; name: string; prefix: string; scopes: string[]; createdAt: string; lastUsedAt: string | null };

export function ApiTokenManager({ organizationId, initialTokens }: { organizationId: string; initialTokens: Token[] }) {
  const [tokens, setTokens] = useState(initialTokens);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const endpoint = `/api/v1/tokens?organizationId=${encodeURIComponent(organizationId)}`;

  async function create(form: FormData) {
    setBusy(true);
    setSecret(null);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.get('name'), scopes: [form.get('scope')] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? 'Could not create token.');
      setSecret(payload.data.token);
      setTokens((previous) => [{ ...payload.data, lastUsedAt: null }, ...previous]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create token.');
    } finally { setBusy(false); }
  }

  async function revoke(id: string) {
    if (!window.confirm('Revoke this token immediately?')) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/tokens/${encodeURIComponent(id)}?organizationId=${encodeURIComponent(organizationId)}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? 'Could not revoke token.');
      setTokens((previous) => previous.filter((token) => token.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not revoke token.');
    } finally { setBusy(false); }
  }

  return <div className="space-y-4">
    <form action={create} className="flex flex-wrap items-end gap-3">
      <label className="text-sm text-slate-200">Token name <input name="name" required maxLength={100} className="block rounded bg-slate-900 p-2 text-white" /></label>
      <label className="text-sm text-slate-200">Scope <select name="scope" className="block rounded bg-slate-900 p-2 text-white"><option value="READ">Read only</option><option value="READ_WRITE">Read and write</option></select></label>
      <button disabled={busy} className="rounded bg-cyan-700 px-4 py-2 text-white disabled:opacity-50">Create token</button>
    </form>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {secret && <div role="status" className="rounded border border-amber-600 p-3 text-amber-100">
      <p>Copy now: this token will not be shown again.</p>
      <code className="block break-all select-all">{secret}</code>
      <button className="mt-2 underline" onClick={() => setSecret(null)}>I have saved it — hide</button>
    </div>}
    {tokens.length === 0 ? <p className="text-slate-400">No active API tokens.</p> : <ul className="space-y-2">{tokens.map((token) => <li key={token.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-700 p-3 text-sm">
      <span>{token.name} · {token.prefix}… · {token.scopes.join(', ')} · last used {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : 'never'}</span>
      <button disabled={busy} onClick={() => revoke(token.id)} className="text-red-300 underline disabled:opacity-50">Revoke</button>
    </li>)}</ul>}
  </div>;
}
