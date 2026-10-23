'use client';

import { useId, useState } from 'react';
import { copyToClipboard } from '@/lib/copy-to-clipboard';
import { Input } from './form';
import { Button } from './button';

/** Newly minted values only. No storage, logging, automatic copy, or re-fetch of existing keys. */
export function OneTimeSecret({
  secret,
  label,
  onDismiss,
}: {
  secret: string;
  label: string;
  onDismiss: () => void;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  return (
    <section className="workspace-secret-notice" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>{label}</h3>
      <p id={`${id}-hint`}>
        Copy and store this value now. It cannot be viewed again after you dismiss it or leave this
        page.
      </p>
      <Input
        id={id}
        aria-label={label}
        aria-describedby={`${id}-hint`}
        type={visible ? 'text' : 'password'}
        readOnly
        data-ui-sensitive="true"
        value={secret}
        autoComplete="off"
        spellCheck={false}
        className="arch-mono"
        onFocus={(event) => event.currentTarget.select()}
      />
      <div className="workspace-secret-actions">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-disabled={copying}
          aria-busy={copying}
          onClick={async () => {
            if (copying) return;
            setCopying(true);
            const success = await copyToClipboard(secret);
            setCopied(success);
            setCopyFailed(!success);
            setCopying(false);
          }}
        >
          {copying ? 'Copying…' : copied ? 'Copied' : 'Copy value'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? 'Hide value' : 'Show value'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          I’ve saved it
        </Button>
      </div>
      <p className="workspace-secret-copy-status" role="status">
        {copyFailed
          ? 'Clipboard access is unavailable. Choose Show value, select the value, and copy it manually.'
          : copied
            ? 'Copied. Store it securely before dismissing.'
            : ''}
      </p>
    </section>
  );
}
