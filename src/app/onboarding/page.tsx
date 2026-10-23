import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import { currentUser } from '@/lib/session';
import { listOrganizations } from '@/server/services/organization.service';
import { createFirstOrganizationAction } from './actions';
import { logoutAction } from '@/app/(auth)/actions';
import { WorkspaceTheme, ThemeToggle } from '@/components/shell/workspace-theme';
import { readWorkspaceTheme, WORKSPACE_THEME_COOKIE } from '@/components/shell/theme-preferences';
import { OnboardingForm } from '@/components/dashboard/onboarding-form';
import { WorkspaceChecklist } from '@/components/dashboard/workspace-overview';
import '@/components/shell/workspace.css';

export const metadata: Metadata = {
  title: 'Set up your workspace',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { colorScheme: 'light dark' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect('/login?callbackUrl=/onboarding');
  if ((await listOrganizations(user.id)).length) redirect('/dashboard');
  const store = await cookies();
  return (
    <WorkspaceTheme
      initialPreference={readWorkspaceTheme(store.get(WORKSPACE_THEME_COOKIE)?.value)}
      className="workspace-onboarding"
    >
      <a href="#workspace-main" className="workspace-skip-link">
        Skip to workspace setup
      </a>
      <header className="workspace-onboarding-header">
        <Link href="/" className="workspace-onboarding-brand" aria-label="ARCH home">
          ARCH<span>.</span>
        </Link>
        <ThemeToggle />
      </header>
      <main id="workspace-main" tabIndex={-1} className="workspace-onboarding-main">
        <section className="workspace-onboarding-form" aria-labelledby="onboarding-title">
          <span className="arch-page-eyebrow">Welcome to ARCH</span>
          <h1 id="onboarding-title">A place for your team to respond.</h1>
          <p>Create a workspace for your services, incidents, and shared response history.</p>
          <OnboardingForm action={createFirstOrganizationAction} />
          <div className="workspace-onboarding-help">
            <details>
              <summary>Joining an existing team?</summary>
              <p>
                Open the invitation link your teammate sent you. You do not need to create another
                workspace.
              </p>
              <p className="break-words">You’re signed in as {user.email}.</p>
              <form action={logoutAction}>
                <button type="submit">Use a different account</button>
              </form>
            </details>
          </div>
        </section>
        <aside className="workspace-onboarding-next" aria-labelledby="onboarding-next">
          <h2 id="onboarding-next">Start small. Be ready together.</h2>
          <p>Creating a workspace is just the first step. Nothing is published automatically.</p>
          <WorkspaceChecklist
            steps={[
              {
                title: 'Map your services',
                description: 'Group them into projects so your team knows what is affected.',
                complete: false,
              },
              {
                title: 'Bring the team together',
                description:
                  'Invite teammates and record the decisions you make during a response.',
                complete: false,
              },
              {
                title: 'Share customer updates',
                description: 'Optionally configure and publish a status page when you are ready.',
                complete: false,
              },
            ]}
          />
        </aside>
      </main>
    </WorkspaceTheme>
  );
}
