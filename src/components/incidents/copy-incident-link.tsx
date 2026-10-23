'use client';

import { useState } from 'react';
import { copyToClipboard } from '@/lib/copy-to-clipboard';
import { IconCopy } from '@/components/shell/icons';
import { toast } from '@/components/ui/toast';

export function CopyIncidentLink({ incidentId }: { incidentId: string }) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="workspace-copy-incident-link"
      aria-label="Copy incident link"
      title={copied ? 'Incident link copied' : 'Copy incident link'}
      aria-disabled={pending}
      aria-busy={pending}
      onClick={async () => {
        if (pending) return;
        setPending(true);
        const href = new URL(
          `/dashboard/incidents/${encodeURIComponent(incidentId)}`,
          window.location.origin,
        ).href;
        const success = await copyToClipboard(href);
        setCopied(success);
        setPending(false);
        toast(
          success
            ? 'Incident link copied.'
            : 'Could not copy. You can copy the incident address from your browser.',
          success ? 'success' : 'error',
        );
      }}
    >
      {copied ? <span aria-hidden="true">✓</span> : <IconCopy className="size-4" />}
    </button>
  );
}
