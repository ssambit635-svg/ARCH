import type { NextConfig } from 'next';

/**
 * ARCH — Next.js configuration.
 *
 * Notes:
 * - `serverExternalPackages` keeps Prisma's driver adapter + `pg` out of the bundler so the
 *   WASM query compiler and the Postgres socket driver load from node_modules at runtime.
 * - `allowedDevOrigins` lets the dev server be reached through a tunnel/preview host
 *   (e.g. the sandbox preview domain) without Next.js blocking cross-origin dev requests.
 * - Dev servers run in a memory-safe mode by default: extracting source maps for every lazily
 *   compiled route is what pushes a 4 GB container (sandbox, small CI box, laptop with a browser
 *   open) into the OOM killer after a few dozen routes. `ARCH_DEV_SOURCE_MAPS=true` trades that
 *   back for full-fidelity stack traces when you have the headroom.
 */
const devSourceMaps = process.env.ARCH_DEV_SOURCE_MAPS === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';
const memorySafeDev = isDevelopment && !devSourceMaps;
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Content-Security-Policy.
 *
 * The app loads no third-party scripts, styles, fonts, images or frames — every asset is
 * self-hosted (fontsource + local `public/`) and `next/image` is not used at all — so the policy
 * can be genuinely tight instead of the usual `default-src *` shrug.
 *
 * Two compromises are unavoidable without a nonce pipeline:
 *   - `script-src 'unsafe-inline'` — Next.js emits inline hydration/flight-data scripts on every
 *     page. Removing this needs a nonce threaded through the proxy, which is a follow-up, not a
 *     one-line change; until then this remains the one XSS backstop that is weaker than ideal.
 *   - `style-src 'unsafe-inline'` — components use inline `style={{}}` props.
 * Everything else is locked to 'self': no eval, no external origins, no plugins, no framing.
 */
function contentSecurityPolicy(): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // `'unsafe-eval'` is a development-only need (Turbopack's eval-based HMR/source maps).
    // It is deliberately absent from production, where no eval is used.
    'script-src': ["'self'", "'unsafe-inline'", ...(isProduction ? [] : ["'unsafe-eval'"])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    ...(!isDevelopment ? { 'frame-ancestors': ["'none'"] } : {}),
  };
  // Only over real TLS: `upgrade-insecure-requests` would otherwise break the http dev server.
  if (isProduction) directives['upgrade-insecure-requests'] = [];
  return Object.entries(directives)
    .map(([directive, values]) => (values.length ? `${directive} ${values.join(' ')}` : directive))
    .join('; ');
}

/**
 * Baseline security headers, applied to every response.
 *
 * `frame-ancestors 'none'` + `X-Frame-Options: DENY` kill clickjacking in production (omitted in
 * development so preview iframes can embed the dev server); `nosniff` stops MIME confusion; HSTS
 * is production-only so local http development is not permanently pinned to https by the browser.
 */
const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  ...(!isDevelopment ? [{ key: 'X-Frame-Options', value: 'DENY' }] : []),
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  ...(isProduction
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the development badge off the film and out of the customer-facing preview.
  devIndicators: false,
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
  allowedDevOrigins: ['*.e2b.app', '*.e2b.dev', '*.vercel.app', 'localhost', '127.0.0.1'],
  experimental: {
    // File-aware Code Assist accepts at most 5 MB of validated attachments; reject larger bodies.
    serverActions: { bodySizeLimit: '6mb' },
    ...(memorySafeDev
      ? {
          turbopackSourceMaps: false,
          turbopackInputSourceMaps: false,
          turbopackMemoryEviction: 'full' as const,
        }
      : {}),
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
