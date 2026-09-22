'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Field, FormError, Input, SubmitButton } from '@/components/ui/form';
import { loginAction, registerAction, type AuthFormState } from '@/app/(auth)/actions';

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(loginAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <FormError message={state?.error} />
      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
      </Field>
      <Field label="Password" htmlFor="password" error={state?.fieldErrors?.password}>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </Field>
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      <p className="text-sm text-slate-400">
        No account yet?{' '}
        <Link className="text-indigo-400 hover:text-indigo-300" href="/register">
          Create one
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(registerAction, undefined);

  return (
    <form action={action} className="space-y-4">
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
        <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={10} />
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
