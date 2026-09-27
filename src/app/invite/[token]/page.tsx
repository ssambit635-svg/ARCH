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
    <main className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="arch-backdrop pointer-events-none fixed inset-0" aria-hidden />
      <div className="relative animate-rise rounded-2xl border border-white/[0.08] bg-abyss-850/80 p-6 shadow-[0_24px_80px_-24px_rgb(0_0_0/0.8)] backdrop-blur sm:p-8">
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
                      className="rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:from-indigo-400 hover:to-indigo-500"
                      href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                    >
                      Sign in
                    </Link>
                    <Link className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-slate-200 transition hover:bg-white/[0.08]" href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
                      Create account
                    </Link>
                  </div>
                </div>
              ) : user.email.toLowerCase() !== preview.email.toLowerCase() ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-3.5 py-2.5 text-sm text-amber-200">
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
