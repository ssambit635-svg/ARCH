import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

/**
 * Fonts are self-hosted (OFL-1.1, see `src/app/fonts/*.txt`).
 *
 * `next/font/google` downloads from fonts.googleapis.com at build time, which breaks two things
 * ARCH cares about: an air-gapped / on-prem install cannot build, and a sandbox without egress
 * fails `next build` outright (dev mode then retried the download on every render). The same two
 * variable fonts (Inter, JetBrains Mono) ship in this repository instead, so the build is
 * network-free and every render is local.
 */
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
    default: 'ARCH — incident management for developer teams',
    template: '%s · ARCH',
  },
  description:
    'ARCH is where your team goes when your application breaks: ingest alerts, run the response, publish a status page, keep the audit trail — with ARCH V1.1, the native on-call intelligence.',
  applicationName: 'ARCH',
};

export const viewport: Viewport = {
  themeColor: '#04060d',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
