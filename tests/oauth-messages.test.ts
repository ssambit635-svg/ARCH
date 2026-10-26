import { describe, expect, it } from 'vitest';
import { oauthErrorMessage } from '@/lib/oauth-messages';
import { oauthProviderSetupHint, OAUTH_PROVIDER_ENV } from '@/lib/oauth';

/**
 * The messages a person sees after a provider sign-in did not work.
 *
 * They are the difference between "the feature is broken" and "here is what to set", so they
 * have to name the provider and the environment variables when the instance is the problem.
 */
describe('provider error messages', () => {
  it('says nothing when nothing went wrong', () => {
    expect(oauthErrorMessage(undefined, 'google')).toBeUndefined();
    expect(oauthErrorMessage('', 'google')).toBeUndefined();
  });

  it('names the environment variables an unconfigured instance needs', () => {
    const message = oauthErrorMessage('provider_not_configured', 'google');
    expect(message).toContain('Google');
    expect(message).toContain('AUTH_GOOGLE_ID');
    expect(message).toContain('AUTH_GOOGLE_SECRET');
    expect(message).toContain('restart');
    expect(oauthErrorMessage('provider_not_configured', 'github')).toContain('AUTH_GITHUB_ID');
  });

  it('explains an email that is already in use, without saying whether it exists', () => {
    const message = oauthErrorMessage('OAuthAccountNotLinked', 'google');
    expect(message).toContain('An ARCH account already uses that email address');
    expect(message).toContain('Google');
  });

  it('falls back to a useful sentence for an unknown code', () => {
    const message = oauthErrorMessage('something_new', 'google');
    expect(message).toContain('Sign-in failed');
    expect(message).not.toContain('undefined');
  });

  it('keeps the setup hint in step with the registry', () => {
    expect(OAUTH_PROVIDER_ENV.google).toEqual(['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET']);
    expect(OAUTH_PROVIDER_ENV.github).toEqual(['AUTH_GITHUB_ID', 'AUTH_GITHUB_SECRET']);
    expect(oauthProviderSetupHint('google')).toContain('AUTH_GOOGLE_ID');
    expect(oauthProviderSetupHint('github')).toContain('AUTH_GITHUB_SECRET');
  });
});
