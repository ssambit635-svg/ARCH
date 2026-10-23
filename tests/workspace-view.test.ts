import { describe, expect, it } from 'vitest';
import { readWorkspaceTheme, serializeWorkspaceTheme } from '@/components/shell/theme-preferences';
import { statusPageDestination, workspaceHealth } from '@/lib/workspace-view';
import { timelineMetadataSummary } from '@/lib/timeline-summary';
import { runWorkspaceAction } from '@/lib/workspace-action';

describe('workspace appearance preference', () => {
  it.each(['light', 'dark', 'system'] as const)(
    'accepts %s without treating it as an identity preference',
    (value) => {
      expect(readWorkspaceTheme(value)).toBe(value);
    },
  );
  it.each([undefined, null, '', 'DARK', 'dark; Secure', {}, ['dark']])(
    'defaults invalid preference %j to the device appearance',
    (value) => {
      expect(readWorkspaceTheme(value)).toBe('system');
    },
  );
  it('persists a non-sensitive, same-site display cookie for one year', () => {
    expect(serializeWorkspaceTheme('dark')).toBe(
      'arch-theme=dark; Path=/; Max-Age=31536000; SameSite=Lax',
    );
    expect(serializeWorkspaceTheme('light', true)).toBe(
      'arch-theme=light; Path=/; Max-Age=31536000; SameSite=Lax; Secure',
    );
  });
});

describe('honest workspace health', () => {
  it('does not equate an empty workspace with healthy monitored systems', () => {
    const health = workspaceHealth(0, []);
    expect(health).toMatchObject({ tone: 'neutral', title: 'No services configured yet' });
    expect(health.description).not.toMatch(/operational|all clear|uptime|on call/i);
  });
  it('leads with an open incident even if it is not linked to a service', () => {
    expect(workspaceHealth(1, [])).toMatchObject({ tone: 'danger', title: '1 open incident' });
    expect(workspaceHealth(2, [{ status: 'OUTAGE' }]).title).toBe('2 open incidents');
  });
  it('does not hide a manually pinned outage when there are no open incidents', () => {
    expect(
      workspaceHealth(0, [{ status: 'OUTAGE' }, { status: 'DEGRADED' }, { status: 'OPERATIONAL' }]),
    ).toMatchObject({ tone: 'warning', title: '2 services need attention' });
  });
  it('distinguishes maintenance from operational status', () => {
    expect(workspaceHealth(0, [{ status: 'MAINTENANCE' }])).toMatchObject({
      tone: 'info',
      title: 'No open incidents',
    });
    expect(workspaceHealth(0, [{ status: 'MAINTENANCE' }]).description).toContain('maintenance');
  });
  it('limits the clear state to recorded service data rather than monitoring guarantees', () => {
    const health = workspaceHealth(0, [{ status: 'OPERATIONAL' }]);
    expect(health.tone).toBe('success');
    expect(health.title).toBe('No open incidents');
    expect(health.description).toContain('not independent monitoring');
  });
});

describe('public status shortcuts', () => {
  it('links the published page slug, which need not match its organization', () => {
    expect(statusPageDestination({ name: 'Customer status', slug: 'customer-status' })).toEqual({
      href: '/status/customer-status',
      label: 'Public status page',
      public: true,
    });
  });
  it('links to setup when no published page exists', () => {
    expect(statusPageDestination(null)).toEqual({
      href: '/dashboard/status',
      label: 'Set up status page',
      public: false,
    });
  });
  it('encodes the complete slug as a path segment', () => {
    expect(statusPageDestination({ name: 'A', slug: 'a/b?c#d' }).href).toBe(
      '/status/a%2Fb%3Fc%23d',
    );
  });
});

describe('readable incident event context', () => {
  it('resolves assignments to member names rather than opaque IDs', () => {
    expect(
      timelineMetadataSummary({ from: null, to: 'user-123' }, 'ASSIGNED', { 'user-123': 'Ada' }),
    ).toBe('Unassigned → Ada');
  });
  it('handles removed teammates, unassignment, and inherited property names safely', () => {
    expect(timelineMetadataSummary({ from: 'former-id', to: null }, 'ASSIGNED')).toBe(
      'Former member → Unassigned',
    );
    expect(timelineMetadataSummary({ from: 'toString', to: 'constructor' }, 'ASSIGNED')).toBe(
      'Former member → Former member',
    );
  });
  it('uses plain-language lifecycle and severity labels', () => {
    expect(
      timelineMetadataSummary({ from: 'IDENTIFIED', to: 'MONITORING' }, 'STATUS_CHANGED'),
    ).toBe('Identified → Monitoring');
    expect(timelineMetadataSummary({ from: 'LOW', to: 'HIGH' }, 'SEVERITY_CHANGED')).toBe(
      'Low → High',
    );
  });
  it('does not dump arbitrary metadata or service IDs into a response timeline', () => {
    expect(timelineMetadataSummary({ serviceId: 'secret-looking-id' }, 'LINKED')).toBe(
      'Service link updated',
    );
    expect(timelineMetadataSummary({ from: 'raw-id', to: 'another-id' }, 'COMMENT')).toBeNull();
    expect(timelineMetadataSummary(null, 'CREATED')).toBeNull();
  });
});

describe('workspace mutation transport failures', () => {
  it('returns successful and validated failure results unchanged', async () => {
    const success = { ok: true as const, data: { incidentId: 'i-1' } };
    const failure = {
      ok: false as const,
      error: 'Check the title.',
      fieldErrors: { title: 'Required.' },
    };
    expect(await runWorkspaceAction(async () => success, 'Unconfirmed.')).toBe(success);
    expect(await runWorkspaceAction(async () => failure, 'Unconfirmed.')).toBe(failure);
  });
  it('returns a draft-preserving message without exposing exception details or retrying a possible write', async () => {
    let calls = 0;
    const result = await runWorkspaceAction(async () => {
      calls++;
      throw new TypeError('private server or transport details');
    }, 'Could not confirm this update. Check the timeline before trying again.');
    expect(calls).toBe(1);
    expect(result).toEqual({
      ok: false,
      error: 'Could not confirm this update. Check the timeline before trying again.',
    });
    expect(JSON.stringify(result)).not.toContain('private');
  });
  it.each(['NEXT_REDIRECT;replace;/dashboard;303;', 'NEXT_HTTP_ERROR_FALLBACK;404'])(
    'preserves framework control flow %s',
    async (digest) => {
      const error = Object.assign(new Error('Framework control flow'), { digest });
      await expect(
        runWorkspaceAction(async () => {
          throw error;
        }, 'Unconfirmed.'),
      ).rejects.toBe(error);
    },
  );
});
