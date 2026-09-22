import type { NextConfig } from 'next';

/**
 * ARCH — Next.js configuration.
 *
 * Notes:
 * - `serverExternalPackages` keeps Prisma's driver adapter + `pg` out of the bundler so the
 *   WASM query compiler and the Postgres socket driver load from node_modules at runtime.
 * - `allowedDevOrigins` lets the dev server be reached through a tunnel/preview host
 *   (e.g. the sandbox preview domain) without Next.js blocking cross-origin dev requests.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
  allowedDevOrigins: ['*.e2b.app', '*.e2b.dev', '*.vercel.app', 'localhost', '127.0.0.1'],
  experimental: {
    // Server Actions are used for dashboard mutations; keep bodies small and validated.
    serverActions: { bodySizeLimit: '1mb' },
  },
};

export default nextConfig;
