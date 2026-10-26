import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import AuthLayout, { metadata, viewport } from '@/app/(auth)/layout';
import { AuthShowcase } from '@/components/auth/auth-showcase';
import { LoginForm, RegisterForm } from '@/components/auth/forms';
import { AI_NAME, GITHUB_REPO_URL, PRODUCT_VERSION } from '@/lib/brand';

// Actions are passed by the server pages, not imported by the form UI. No Auth.js/request mocks
// or database mutations are needed to render and test the complete public authentication surface.
const credentialsAction = async () => undefined;
const oauthAction = async () => {};
const cancelLinkAction = async () => {};
const source = (path: string) => readFileSync(path, 'utf8');
const css = source('src/components/auth/auth.css');
const tokensFrom = (block: string) =>
  Object.fromEntries(
    [...block.matchAll(/(--[\w-]+): (#[\da-f]{6})/gi)].map((match) => [match[1]!, match[2]!]),
  );
const authTokens = tokensFrom(/\.auth-surface \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '');

function luminance(hex: string) {
  return [0, 2, 4]
    .map((offset) => {
      const channel = parseInt(hex.slice(offset + 1, offset + 3), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    })
    .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index]!, 0);
}
function contrast(fg: string, bg: string) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('public authentication surface', () => {
  it('matches the landing page chrome without loading marketing motion or console styling', () => {
    const html = renderToStaticMarkup(
      createElement(AuthLayout, { children: createElement('h1', null, 'Test form') }),
    );
    expect(viewport).toEqual({ themeColor: '#f6f4ef', colorScheme: 'light' });
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(html).toContain('/marketing/hero-dawn.jpg');
    expect(html).toContain(`Early access · v${PRODUCT_VERSION}`);
    expect(html).toContain('href="#auth-content"');
    expect(html).toContain('id="auth-content"');
    expect(html).toContain('Back to overview');
    expect(html).not.toMatch(/status\/arch|auth\.arch\.dev|SHA-256|99\.98%/);
    for (const image of html.matchAll(/<img\b[^>]*>/g)) {
      expect(image[0]).toContain('alt=""');
      expect(image[0]).toContain('aria-hidden="true"');
    }
    expect(source('src/app/(auth)/layout.tsx')).not.toMatch(
      /marketing\/landing.css|gsap|SmoothScroll/,
    );
    expect(source('src/components/auth/forms.tsx')).not.toContain('components/ui/form');
  });

  it('links to real documentation and legal policies, not placeholder routes', () => {
    const html = renderToStaticMarkup(createElement(AuthLayout, { children: 'Form' }));
    for (const path of [
      'docs/legal/PRIVACY-POLICY.md',
      'docs/legal/TERMS-OF-SERVICE.md',
      'SECURITY.md',
    ]) {
      expect(existsSync(path)).toBe(true);
      expect(html).toContain(`${GITHUB_REPO_URL}/blob/main/${path}`);
    }
    for (const link of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
      expect(link[0]).toContain('rel="noopener noreferrer"');
    }
  });

  it('renders a labelled login form with password-manager and visibility-toggle affordances', () => {
    const html = renderToStaticMarkup(
      createElement(LoginForm, { callbackUrl: '/dashboard', loginAction: credentialsAction }),
    );
    expect(html).toContain('Welcome back');
    expect(html).toContain('aria-label="Sign in with email"');
    expect(html).toContain('for="email"');
    expect(html).toContain('name="email"');
    expect(html).toContain('type="email"');
    expect(html).toContain('autoComplete="email"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('aria-label="Show password"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-controls="password"');
    expect(html).toContain('auth-submit-ink');
    expect(html).toContain('auth-submit-dots');
    expect(html).toContain('Trouble signing in?');
    // Do not advertise a recovery route or an identity provider that does not exist.
    expect(html).not.toContain('Continue with GitHub');
    expect(html).not.toContain('/forgot-password');
  });

  it('only displays a provider when the page supplies its configured server action', () => {
    const html = renderToStaticMarkup(
      createElement(LoginForm, {
        callbackUrl: '/dashboard',
        loginAction: credentialsAction,
        oauthAction,
        oauthProviders: ['github'],
        oauthError: 'OAuth failed.',
        successMessage: 'Account created.',
      }),
    );
    expect(html).toContain('aria-label="Sign in with GitHub"');
    expect(html).toContain('Continue with GitHub');
    expect(html).toContain('OAuth failed.');
    expect(html).toContain('role="alert"');
    expect(html).toContain('Account created.');
    expect(html).toContain('role="status"');
    expect(html.match(/<form\b/g)).toHaveLength(2);
    expect(source('src/app/(auth)/login/page.tsx')).toContain(
      'oauthAction={oauthProviders.length > 0 ? oauthSignInAction : undefined}',
    );
  });

  it('offers every configured provider and explains a pending account link', () => {
    const html = renderToStaticMarkup(
      createElement(LoginForm, {
        callbackUrl: '/dashboard',
        loginAction: credentialsAction,
        oauthAction,
        oauthProviders: ['google', 'github'],
        linkProvider: 'google',
        cancelLinkAction,
      }),
    );
    expect(html).toContain('aria-label="Sign in with Google"');
    expect(html).toContain('aria-label="Sign in with GitHub"');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('Continue with GitHub');
    expect(html).toContain('we will link your Google account');
    expect(html).toContain('Skip for now');
    // One form per provider plus the credentials form plus the skip form.
    expect(html.match(/<form\b/g)).toHaveLength(4);
    expect(html).toContain('name="provider" value="google"');
    expect(html).toContain('name="provider" value="github"');
  });

  it.each(['login', 'register'] as const)(
    'preserves invitation callbacks across %s mode switches, without printing private URLs in the copy',
    (mode) => {
      const callbackUrl = '/invite/private-token?next=team';
      const html =
        mode === 'login'
          ? renderToStaticMarkup(
              createElement(LoginForm, { callbackUrl, loginAction: credentialsAction }),
            )
          : renderToStaticMarkup(
              createElement(RegisterForm, { callbackUrl, registerAction: credentialsAction }),
            );
      expect(html).toContain('name="callbackUrl"');
      expect(html).toContain('value="/invite/private-token?next=team"');
      for (const path of ['/login', '/register'])
        expect(html).toContain(
          `href="${path}?callbackUrl=%2Finvite%2Fprivate-token%3Fnext%3Dteam"`,
        );
      expect(html.match(/aria-current="page"/g)).toHaveLength(1);
      const notice = /class="auth-callback-notice"[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1];
      expect(notice).toContain('invitation');
      expect(notice).not.toContain('private-token');
    },
  );

  it('keeps optional signup fields honest and describes the password requirement, not a strength guarantee', () => {
    const html = renderToStaticMarkup(
      createElement(RegisterForm, { registerAction: credentialsAction }),
    );
    expect(html).toContain('Create your account');
    expect(html).toContain('autoComplete="new-password"');
    expect(html).toContain('minLength="10"');
    expect(html).toContain('maxLength="200"');
    expect(html).toContain('At least 10 characters');
    expect(html).toContain('aria-describedby="password-requirement"');
    expect(html).toContain('aria-describedby="organizationName-hint"');
    expect(html).toContain('autoComplete="organization"');
    for (const name of ['name', 'organizationName']) {
      const tag = new RegExp(`<input[^>]*name="${name}"[^>]*>`).exec(html)?.[0];
      expect(tag).toBeTruthy();
      expect(tag).not.toContain('required');
    }
    expect(html).not.toMatch(/Workspace slug|\/status\/|strong password|strength/i);
  });

  it('offers the configured providers on the sign-up screen too', () => {
    const html = renderToStaticMarkup(
      createElement(RegisterForm, {
        registerAction: credentialsAction,
        oauthAction,
        oauthProviders: ['google', 'github'],
      }),
    );
    expect(html).toContain('aria-label="Sign up with Google"');
    expect(html).toContain('aria-label="Sign up with GitHub"');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('or use your email');
    expect(html).toContain('aria-label="Create an ARCH account"');
  });

  it('shows one explicitly illustrative four-state preview with a roving tab stop', () => {
    const html = renderToStaticMarkup(createElement(AuthShowcase));
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tabpanel"');
    const tabs = [...html.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map((match) => match[0]);
    expect(tabs).toHaveLength(4);
    expect(tabs.filter((tag) => tag.includes('tabindex="0"'))).toHaveLength(1);
    expect(tabs.filter((tag) => tag.includes('tabindex="-1"'))).toHaveLength(3);
    for (const state of ['Investigating', 'Identified', 'Monitoring', 'Resolved'])
      expect(html).toContain(state);
    expect(html).toContain('aria-labelledby="auth-stage-tab-monitoring"');
    expect(html).toContain('illustrative data, not a live incident feed');
    expect(html).toContain(AI_NAME);
    expect(html).toContain('For your team to review. Always.');
    expect(html).not.toMatch(/confidence|SHA-256|guarantees|100%/i);
  });

  it('uses the landing palette instead of a second brand palette', () => {
    const landing = tokensFrom(
      /\.mk-light \.mk \{([^}]+)\}/.exec(source('src/components/marketing/landing.css'))?.[1] ?? '',
    );
    for (const name of [
      'bg',
      'bg-soft',
      'surface',
      'surface-2',
      'hover',
      'fg',
      'muted',
      'subtle',
      'line',
      'line-strong',
      'accent',
      'accent-strong',
      'sunbeam',
      'focus',
      'positive',
      'negative',
    ]) {
      expect(authTokens[`--auth-${name}`], name).toBe(landing[`--mk-${name}`]);
    }
    expect(css).not.toContain('#3b8ef4');
    expect(css).not.toMatch(/next\/font\/google|radial-gradient/);
  });

  it('keeps light and dark text, field boundaries and feedback at accessible contrast', () => {
    for (const fg of ['fg', 'muted', 'subtle']) {
      for (const bg of ['bg', 'bg-soft', 'surface', 'surface-2', 'hover']) {
        expect(
          contrast(authTokens[`--auth-${fg}`]!, authTokens[`--auth-${bg}`]!),
          `${fg} on ${bg}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
    for (const fg of ['win-fg', 'win-muted', 'win-subtle', 'win-accent']) {
      for (const bg of ['win-bg', 'win-surface']) {
        expect(
          contrast(authTokens[`--auth-${fg}`]!, authTokens[`--auth-${bg}`]!),
          `${fg} on ${bg}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
    for (const tone of ['positive', 'negative'])
      expect(
        contrast(authTokens[`--auth-${tone}`]!, authTokens[`--auth-${tone}-soft`]!),
      ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(authTokens['--auth-control-line']!, authTokens['--auth-surface-2']!),
    ).toBeGreaterThanOrEqual(3);
    expect(css).toMatch(/\.auth-input::placeholder \{\s*color: var\(--auth-subtle\)/);
  });

  it('keeps controls visible, hides the secondary preview on small screens, and respects reduced motion', () => {
    expect(css).toContain(':focus-visible');
    expect(css).toMatch(/\.auth-surface \.auth-showcase \{\s*display: none;/);
    expect(css).toMatch(/\.auth-surface \.auth-input \{\s*font-size: 16px;/);
    expect(css).toContain('prefers-reduced-motion: reduce');
    const formSource = source('src/components/auth/forms.tsx');
    expect(formSource).toContain('aria-busy={pending}');
    expect(formSource).toContain('disabled={pending}');
    expect(formSource).toContain('ref.current?.focus()');
    expect(formSource).toContain('aria-describedby=');
    expect(formSource).not.toMatch(/localStorage|sessionStorage/);
  });
});
