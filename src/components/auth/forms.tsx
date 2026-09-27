'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Field, FormError, FormSuccess, Input, PasswordInput, SubmitButton } from '@/components/ui/form';
import { githubLoginAction, loginAction, registerAction, type AuthFormState } from '@/app/(auth)/actions';

/** The official mark, inlined so the login page needs no asset pipeline or extra request. */
function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function LoginForm({
  callbackUrl,
  githubEnabled,
  oauthError,
  successMessage,
}: {
  callbackUrl: string;
  githubEnabled?: boolean;
  oauthError?: string;
  successMessage?: string;
}) {
  const [state, action] = useActionState<AuthFormState, FormData>(loginAction, undefined);

  return (
    <div className="space-y-4">
      <FormError message={oauthError} />
      <FormSuccess message={successMessage} />
      {githubEnabled ? (
        <>
          <form action={githubLoginAction}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <GitHubMark />
              Continue with GitHub
            </button>
          </form>
          <div className="flex items-center gap-3 text-xs text-slate-500" aria-hidden="true">
            <span className="h-px flex-1 bg-white/[0.08]" />
            or
            <span className="h-px flex-1 bg-white/[0.08]" />
          </div>
        </>
      ) : null}
      <form action={action} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <FormError message={state?.error} />
        <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
        </Field>
        <Field label="Password" htmlFor="password" error={state?.fieldErrors?.password}>
          <PasswordInput id="password" name="password" required autoComplete="current-password" />
        </Field>
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
        <p className="text-sm text-slate-400">
          No account yet?{' '}
          <Link className="text-indigo-400 hover:text-indigo-300" href="/register">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}

export function RegisterForm({ callbackUrl = '/dashboard' }: { callbackUrl?: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(registerAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <FormError message={state?.error} />
      <Field label="Work email" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
      </Field>
      <Field label="Your name" htmlFor="name" hint="Optional." error={state?.fieldErrors?.name}>
        <Input id="name" name="name" autoComplete="name" />
      </Field>
      <Field label="Organization" htmlFor="organizationName" hint="You become the OWNER of this organization." error={state?.fieldErrors?.organizationName}>
        <Input id="organizationName" name="organizationName" placeholder="Acme Inc" />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 10 characters." error={state?.fieldErrors?.password}>
        <PasswordInput id="password" name="password" required autoComplete="new-password" minLength={10} />
      </Field>
      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
      <p className="text-sm text-slate-400">
        Already registered?{' '}
        <Link className="text-indigo-400 hover:text-indigo-300" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
