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
const memorySafeDev = process.env.NODE_ENV === 'development' && !devSourceMaps;

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
};

export default nextConfig;
