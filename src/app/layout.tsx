import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

/**
 * Fonts are self-hosted (OFL-1.1, see `src/app/fonts/*.txt`).
 *
 * `next/font/google` downloads from fonts.googleapis.com at build time, which breaks two things
 * ARCH cares about: an air-gapped / on-prem install cannot build, and a sandbox without egress
 * fails `next build` outright (dev mode then retried the download on every render). The three
 * variable fonts ship in this repository instead, so the build is network-free and every render
 * is local.
 *
 *   Space Grotesk — display. An engineered grotesque with a distinctive lowercase `g` and flat
 *                   terminals; it reads as instrumentation rather than as a startup wordmark.
 *   Inter         — body and UI. Neutral at small sizes, and its `cv*` alternates stay open.
 *   JetBrains Mono— every number, label, hash and log line. Tabular by design.
 *
 * Space Grotesk is vendored from `@fontsource-variable/space-grotesk` (kept as a dependency so
 * the provenance and the update path stay explicit) into `src/app/fonts/`.
 */
const spaceGrotesk = localFont({
  src: './fonts/space-grotesk-latin-wght-normal.woff2',
  weight: '300 700',
  display: 'swap',
  variable: '--font-space-grotesk',
  fallback: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

const inter = localFont({
  src: './fonts/inter-latin-wght-normal.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-inter',
  fallback: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

const jetbrainsMono = localFont({
  src: './fonts/jetbrains-mono-latin-wght-normal.woff2',
  weight: '100 800',
  display: 'swap',
  variable: '--font-jetbrains-mono',
  fallback: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
});

export const metadata: Metadata = {
  title: {
    default: 'ARCH — incident response for developer teams',
    template: '%s · ARCH',
  },
  description:
    'ARCH is where your team goes when your application breaks: ingest alerts, run the response, publish a status page, keep the audit trail — with ARCH V1.1, a native on-call engine compiled into the repository that runs on your own server.',
  applicationName: 'ARCH',
  keywords: [
    'incident response',
    'incident management',
    'status page',
    'on-call',
    'SLO',
    'postmortem',
    'observability',
    'self-hosted',
    'native AI',
  ],
  openGraph: {
    title: 'ARCH — incident response for developer teams',
    description:
      'Alert in, audit trail out. Self-hosted incident management with native on-call intelligence that never sends your incident data to a third party.',
    type: 'website',
    siteName: 'ARCH',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ARCH — incident response for developer teams',
    description: 'Alert in, audit trail out. Self-hosted, with native on-call intelligence.',
  },
};

export const viewport: Viewport = {
  themeColor: '#050607',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
