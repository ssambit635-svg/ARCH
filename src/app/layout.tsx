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
    default: 'ARCH — self-hosted incident response',
    template: '%s · ARCH',
  },
  description:
    'ARCH brings alert intake, on-call coordination, status updates and the audit trail into one self-hosted workspace for engineering teams.',
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
    title: 'ARCH — self-hosted incident response',
    description:
      'Alert intake, on-call coordination, status updates and audit history in one self-hosted workspace.',
    type: 'website',
    siteName: 'ARCH',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ARCH — self-hosted incident response',
    description: 'A single workspace for alert intake, on-call coordination, status updates and audit history.',
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
