'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Field, FormError, Input, Select } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { OneTimeSecret } from '@/components/ui/one-time-secret';
import { formatDateTime } from '@/lib/format';
import { tokenDisplayMetadata, tokenScopeLabel, type TokenView } from '@/lib/token-view';

type Operation = 'create' | 'revoke' | 'refresh';
function responseError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = payload.error;
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    )
      return error.message;
  }
  return fallback;
}

export function ApiTokenManager({
  organizationId,
  initialTokens,
}: {
  organizationId: string;
  initialTokens: TokenView[];
}) {
  const [tokens, setTokens] = useState(initialTokens);
  const [secret, setSecret] = useState<{ id: string; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [operation, setOperation] = useState<Operation | null>(null);
  const [name, setName] = useState('');
  const [scope, setScope] = useState('READ');
  const busyRef = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const endpoint = `/api/v1/tokens?organizationId=${encodeURIComponent(organizationId)}`;
  const busy = operation !== null;
  const start = (next: Operation) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setOperation(next);
    setError(null);
    setNotice('');
    return true;
  };
  const finish = () => {
    busyRef.current = false;
    setOperation(null);
  };

  async function create(form: FormData) {
    if (secret || !start('create')) return;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('name') ?? '').trim(),
          scopes: [form.get('scope')],
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(responseError(payload, 'Could not create the token. Your inputs are still here.'));
        return;
      }
      const metadata = tokenDisplayMetadata(payload?.data);
      const raw = payload?.data?.token;
      if (!metadata || typeof raw !== 'string' || !raw) throw new Error('Unconfirmed response');
      setSecret({ id: metadata.id, value: raw });
      setTokens((previous) => [metadata, ...previous.filter((token) => token.id !== metadata.id)]);
      setName('');
      setScope('READ');
      setNotice('Token created. Copy its one-time value below.');
    } catch {
      setError(
        'Could not confirm token creation. Your inputs are still here. Refresh the token list before trying again; revoke an unusable newly created token rather than assuming the request failed.',
      );
    } finally {
      finish();
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Enter a name for the token.');
      return;
    }
    void create(new FormData(event.currentTarget));
  };

  async function refresh() {
    if (!start('refresh')) return;
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(responseError(payload, 'Could not refresh the token list.'));
        return;
      }
      if (!Array.isArray(payload?.data)) throw new Error('Invalid response');
      const next = payload.data.map(tokenDisplayMetadata);
      if (next.some((token: TokenView | null) => !token)) throw new Error('Invalid metadata');
      setTokens(next as TokenView[]);
      setNotice('Token list refreshed. Existing token values cannot be retrieved.');
    } catch {
      setError('Could not refresh the token list. The last loaded list is still shown.');
    } finally {
      finish();
    }
  }

  async function revoke(token: TokenView) {
    if (
      busyRef.current ||
      !window.confirm(`Revoke “${token.name}” immediately? Clients using it will lose access.`) ||
      !start('revoke')
    )
      return;
    try {
      const response = await fetch(
        `/api/v1/tokens/${encodeURIComponent(token.id)}?organizationId=${encodeURIComponent(organizationId)}`,
        { method: 'DELETE' },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(responseError(payload, 'Could not revoke the token.'));
        return;
      }
      setTokens((previous) => previous.filter((item) => item.id !== token.id));
      if (secret?.id === token.id) setSecret(null);
      setNotice('Token revoked.');
    } catch {
      setError(
        'Could not confirm revocation. Refresh the token list to check its state before trying again.',
      );
    } finally {
      finish();
    }
  }

  return (
    <div className="workspace-token-manager">
      <p className="workspace-muted text-sm">
        Give each client its own token. Read-only is the default; read and write is only for clients
        that need to change workspace data.
      </p>
      <form
        action={create}
        onSubmit={onSubmit}
        className="workspace-token-create"
        aria-label="Create an API token"
        aria-busy={busy}
      >
        <Field
          label="Token name"
          htmlFor="api-token-name"
          hint="Use a recognizable client or purpose."
        >
          <Input
            ref={nameRef}
            name="name"
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={busy || Boolean(secret)}
            autoComplete="off"
            placeholder="e.g. deployment-status-reader"
          />
        </Field>
        <Field label="Scope" htmlFor="api-token-scope">
          <Select
            name="scope"
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            disabled={busy || Boolean(secret)}
          >
            <option value="READ">Read only</option>
            <option value="READ_WRITE">Read and write</option>
          </Select>
        </Field>
        <Button type="submit" disabled={busy || Boolean(secret)} loading={operation === 'create'}>
          {operation === 'create' ? 'Creating…' : 'Create token'}
        </Button>
      </form>
      {error ? <FormError message={error} /> : null}
      <p className="workspace-token-notice" role="status">
        {notice}
      </p>
      {secret ? (
        <OneTimeSecret
          secret={secret.value}
          label="New API token"
          onDismiss={() => {
            setSecret(null);
            setNotice('Token created. The one-time value is now hidden.');
            requestAnimationFrame(() => nameRef.current?.focus());
          }}
        />
      ) : null}
      <div className="workspace-token-list-heading">
        <h3>
          Active tokens <span>{tokens.length}</span>
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void refresh()}
          aria-label={`${operation === 'refresh' ? 'Refreshing…' : 'Refresh list'} (API tokens)`}
        >
          {operation === 'refresh' ? 'Refreshing…' : 'Refresh list'}
        </Button>
      </div>
      {tokens.length === 0 ? (
        <p className="workspace-token-empty">
          No active tokens. Create one when you’re ready to connect a client.
        </p>
      ) : (
        <ul className="workspace-token-list">
          {tokens.map((token) => (
            <li key={token.id}>
              <div className="workspace-token-identity">
                <strong>{token.name}</strong>
                <code>{token.prefix}…</code>
                <p>
                  {tokenScopeLabel(token.scopes)} · created {formatDateTime(token.createdAt)}
                </p>
              </div>
              <div className="workspace-token-usage">
                <span>
                  Last used {token.lastUsedAt ? formatDateTime(token.lastUsedAt) : 'never'}
                </span>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={() => void revoke(token)}
                  aria-label={`Revoke token ${token.name}`}
                >
                  Revoke
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
