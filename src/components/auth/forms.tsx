'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { KeyboardEvent, ReactNode, Ref } from 'react';
import type { AuthFormState } from '@/app/(auth)/actions';
import { GITHUB_REPO_URL } from '@/lib/brand';
import { ArrowIcon, CheckIcon, EyeIcon, PlusIcon, SpinnerIcon, SunbeamMark } from './icons';

type CredentialsAction = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;

/** The official mark: no external asset or request is needed. */
function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function AuthAlert({
  message,
  tone,
  ref,
}: {
  message?: string | null;
  tone: 'error' | 'success';
  ref?: Ref<HTMLDivElement>;
}) {
  if (!message) return null;
  return (
    <div
      ref={ref}
      className={`auth-alert auth-alert--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
      tabIndex={-1}
    >
      <span className="auth-alert-symbol" aria-hidden="true">
        {tone === 'error' ? '!' : <CheckIcon />}
      </span>
      <span>{message}</span>
    </div>
  );
}

function AuthField({
  label,
  htmlFor,
  optional,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={htmlFor}>
        {label}
        {optional ? <span className="auth-label-meta">Optional</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="auth-field-hint" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="auth-field-error" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Keeps typed values in memory on a failed action; never stores them in browser storage. */
function AuthPasswordInput({
  error,
  newPassword = false,
}: {
  error?: string;
  newPassword?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [password, setPassword] = useState('');
  const ready = password.length >= 10;
  const description =
    [
      error ? 'password-error' : null,
      newPassword ? 'password-requirement' : null,
      capsLock ? 'password-caps-warning' : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  const checkCaps = (event: KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(event.getModifierState('CapsLock'));
  };

  return (
    <>
      <div className="auth-password-wrap">
        <input
          id="password"
          name="password"
          type={visible ? 'text' : 'password'}
          required
          autoComplete={newPassword ? 'new-password' : 'current-password'}
          minLength={newPassword ? 10 : undefined}
          maxLength={newPassword ? 200 : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={description}
          placeholder={newPassword ? 'Create a password' : 'Enter your password'}
          className="auth-input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={checkCaps}
          onKeyUp={checkCaps}
          onBlur={() => setCapsLock(false)}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          aria-controls="password"
          className="auth-password-toggle"
        >
          <EyeIcon visible={visible} />
        </button>
      </div>
      {capsLock ? (
        <p id="password-caps-warning" className="auth-caps-warning" role="status">
          Caps Lock is on.
        </p>
      ) : null}
      {newPassword ? (
        <div className="auth-password-meter">
          <span className="auth-password-meter-track" aria-hidden="true">
            <span
              className={`auth-password-meter-fill${ready ? ' is-ready' : ''}`}
              style={{ width: `${Math.min(100, password.length * 10)}%` }}
            />
          </span>
          <span
            id="password-requirement"
            className={`auth-password-meter-label${ready ? ' is-ready' : ''}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {ready ? 'Minimum length met' : 'At least 10 characters'}
          </span>
        </div>
      ) : null}
    </>
  );
}

function AuthSubmitButton({
  children,
  pendingLabel,
}: {
  children: ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="auth-submit-ink">
      <SunbeamMark />
      <span className="auth-submit-label" aria-live="polite">
        {pending ? pendingLabel : children}
      </span>
      {pending ? <SpinnerIcon /> : <ArrowIcon />}
    </button>
  );
}

function GithubSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="auth-oauth-button">
      {pending ? <SpinnerIcon /> : <GitHubMark />}
      <span aria-live="polite">{pending ? 'Connecting to GitHub…' : 'Continue with GitHub'}</span>
    </button>
  );
}

function authHref(path: '/login' | '/register', callbackUrl: string) {
  return callbackUrl !== '/dashboard'
    ? `${path}?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : path;
}

function AuthModeTabs({ mode, callbackUrl }: { mode: 'login' | 'register'; callbackUrl: string }) {
  return (
    <nav className="auth-mode-tabs" aria-label="Authentication mode">
      <Link
        href={authHref('/login', callbackUrl)}
        className="auth-mode-tab"
        aria-current={mode === 'login' ? 'page' : undefined}
      >
        Sign in
      </Link>
      <Link
        href={authHref('/register', callbackUrl)}
        className="auth-mode-tab"
        aria-current={mode === 'register' ? 'page' : undefined}
      >
        Create account
      </Link>
    </nav>
  );
}

function AuthHelp({ registration = false }: { registration?: boolean }) {
  return (
    <details className="auth-help">
      <summary>
        {registration ? 'Setting up your own instance?' : 'Trouble signing in?'}
        <PlusIcon />
      </summary>
      <div className="auth-help-body">
        <p>
          {registration
            ? 'Run npm run dev to start a local database and apply migrations. You can create a team now, or join one with an invitation later.'
            : 'Use the same sign-in method you used to create your account. For account access or password help, contact the administrator of your ARCH instance.'}
        </p>
        <a
          href={`${GITHUB_REPO_URL}/blob/main/docs/DEVELOPMENT.md`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Self-hosting guide <ArrowIcon />
        </a>
      </div>
    </details>
  );
}

/** Do not print callback paths: invitation URLs can contain private tokens. */
function CallbackNotice({ callbackUrl }: { callbackUrl: string }) {
  if (callbackUrl === '/dashboard') return null;
  return (
    <p className="auth-callback-notice">
      {callbackUrl.startsWith('/invite/')
        ? 'Joining a team? We’ll take you back to your invitation.'
        : 'We’ll take you back to where you left off after signing in.'}
    </p>
  );
}

function useErrorFocus(state: AuthFormState) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state?.error) ref.current?.focus();
  }, [state]);
  return ref;
}

export function LoginForm({
  callbackUrl,
  loginAction,
  githubAction,
  oauthError,
  successMessage,
}: {
  callbackUrl: string;
  loginAction: CredentialsAction;
  githubAction?: (formData: FormData) => Promise<void>;
  oauthError?: string;
  successMessage?: string;
}) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, undefined);
  const errorRef = useErrorFocus(state);
  const [email, setEmail] = useState('');

  return (
    <div>
      <AuthModeTabs mode="login" callbackUrl={callbackUrl} />
      <div className="auth-intro">
        <p className="auth-eyebrow">Your workspace awaits</p>
        <h1 className="auth-heading">
          Welcome back<span>.</span>
        </h1>
        <p className="auth-subheading">
          Sign in to ARCH. A little less noise, a little more clarity.
        </p>
        <CallbackNotice callbackUrl={callbackUrl} />
      </div>

      <div className="auth-form-stack">
        <AuthAlert message={oauthError} tone="error" />
        <AuthAlert message={successMessage} tone="success" />
        {githubAction ? (
          <>
            <form action={githubAction} aria-label="Sign in with GitHub">
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <GithubSubmitButton />
            </form>
            <div className="auth-divider" aria-hidden="true">
              or use your email
            </div>
          </>
        ) : null}

        <form
          action={action}
          className="auth-credentials"
          aria-label="Sign in with email"
          aria-busy={pending}
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <AuthAlert ref={errorRef} message={state?.error} tone="error" />
          <AuthField label="Email address" htmlFor="email" error={state?.fieldErrors?.email}>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="you@company.com"
              className="auth-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={state?.fieldErrors?.email ? true : undefined}
              aria-describedby={state?.fieldErrors?.email ? 'email-error' : undefined}
            />
          </AuthField>
          <AuthField label="Password" htmlFor="password" error={state?.fieldErrors?.password}>
            <AuthPasswordInput error={state?.fieldErrors?.password} />
          </AuthField>
          <AuthSubmitButton pendingLabel="Signing in…">Sign in to ARCH</AuthSubmitButton>
        </form>
      </div>

      <p className="auth-switch-row">
        New here?{' '}
        <Link href={authHref('/register', callbackUrl)} className="auth-switch-link">
          Create an account <ArrowIcon />
        </Link>
      </p>
      <AuthHelp />
    </div>
  );
}

export function RegisterForm({
  callbackUrl = '/dashboard',
  registerAction,
}: {
  callbackUrl?: string;
  registerAction: CredentialsAction;
}) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    registerAction,
    undefined,
  );
  const errorRef = useErrorFocus(state);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');

  return (
    <div>
      <AuthModeTabs mode="register" callbackUrl={callbackUrl} />
      <div className="auth-intro">
        <p className="auth-eyebrow">Make space for better on-call</p>
        <h1 className="auth-heading">
          Create your account<span>.</span>
        </h1>
        <p className="auth-subheading">Bring your team’s response into one shared workspace.</p>
        <CallbackNotice callbackUrl={callbackUrl} />
      </div>
      <form
        action={action}
        className="auth-form-stack"
        aria-label="Create an ARCH account"
        aria-busy={pending}
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <AuthAlert ref={errorRef} message={state?.error} tone="error" />
        <AuthField label="Email address" htmlFor="email" error={state?.fieldErrors?.email}>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={200}
            placeholder="you@company.com"
            className="auth-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={state?.fieldErrors?.email ? true : undefined}
            aria-describedby={state?.fieldErrors?.email ? 'email-error' : undefined}
          />
        </AuthField>
        <AuthField label="Your name" htmlFor="name" optional error={state?.fieldErrors?.name}>
          <input
            id="name"
            name="name"
            autoComplete="name"
            maxLength={80}
            placeholder="Alex Morgan"
            className="auth-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={state?.fieldErrors?.name ? true : undefined}
            aria-describedby={state?.fieldErrors?.name ? 'name-error' : undefined}
          />
        </AuthField>
        <AuthField
          label="Organization"
          htmlFor="organizationName"
          optional
          hint="Create a team now, or leave blank to join one later."
          error={state?.fieldErrors?.organizationName}
        >
          <input
            id="organizationName"
            name="organizationName"
            autoComplete="organization"
            minLength={2}
            maxLength={80}
            placeholder="Your team’s name"
            className="auth-input"
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
            aria-invalid={state?.fieldErrors?.organizationName ? true : undefined}
            aria-describedby={
              state?.fieldErrors?.organizationName
                ? 'organizationName-error'
                : 'organizationName-hint'
            }
          />
        </AuthField>
        <AuthField label="Password" htmlFor="password" error={state?.fieldErrors?.password}>
          <AuthPasswordInput error={state?.fieldErrors?.password} newPassword />
        </AuthField>
        <AuthSubmitButton pendingLabel="Creating account…">Create account</AuthSubmitButton>
      </form>
      <p className="auth-switch-row">
        Already have an account?{' '}
        <Link href={authHref('/login', callbackUrl)} className="auth-switch-link">
          Sign in <ArrowIcon />
        </Link>
      </p>
      <AuthHelp registration />
    </div>
  );
}
