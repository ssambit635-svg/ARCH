import Link from 'next/link';
import type { Metadata } from 'next';
import { getInvitationPreview } from '@/server/services/organization.service';
import { currentUser } from '@/lib/session';
import { isAppError } from '@/lib/errors';
import { AcceptInvitationButton } from '@/components/auth/accept-invitation';

export const metadata: Metadata = { title: 'Invitation' };
export const dynamic = 'force-dynamic';

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [user, preview] = await Promise.all([
    currentUser(),
    getInvitationPreview(token).catch((error: unknown) => {
      if (isAppError(error)) return null;
      throw error;
    }),
  ]);

  const callbackUrl = `/invite/${token}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-semibold text-white">Organization invitation</h1>

        {!preview ? (
          <p className="mt-3 text-sm text-slate-300">This invitation link is not valid. Ask an administrator for a new one.</p>
        ) : preview.status !== 'PENDING' ? (
          <p className="mt-3 text-sm text-slate-300">
            This invitation is <span className="font-medium">{preview.status.toLowerCase()}</span>. Ask an administrator for a new one.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-slate-300">
              <span className="font-medium text-white">{preview.invitedBy ?? 'An administrator'}</span> invited{' '}
              <span className="font-medium text-white">{preview.email}</span> to join{' '}
              <span className="font-medium text-white">{preview.organization.name}</span> as <span className="font-medium text-white">{preview.role}</span>.
            </p>

            <div className="mt-6">
              {!user ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">Sign in (or create an account) with {preview.email} to accept.</p>
                  <div className="flex gap-3">
                    <Link
                      className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                      href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                    >
                      Sign in
                    </Link>
                    <Link className="rounded-lg border border-slate-700 px-3.5 py-2 text-sm text-slate-200 hover:bg-slate-800" href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
                      Create account
                    </Link>
                  </div>
                </div>
              ) : user.email.toLowerCase() !== preview.email.toLowerCase() ? (
                <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  You are signed in as {user.email}, but this invitation was sent to {preview.email}.
                </p>
              ) : (
                <AcceptInvitationButton token={token} />
              )}
            </div>
          </>
        )}

        <p className="mt-6 text-xs text-slate-500">
          <Link className="hover:text-slate-300" href="/">
            ← Back to arch
          </Link>
        </p>
      </div>
    </main>
  );
}
