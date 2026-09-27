import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

/**
 * Self-hosted variable fonts (via @fontsource packages).
 *
 * `next/font/google` downloads from fonts.googleapis.com at build time, which breaks
 * offline / air-gapped environments — and ARCH is designed to run fully offline. The same
 * typefaces ship as woff2 files in node_modules, so builds never need the network.
 */
const inter = localFont({
  src: [
    { path: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', style: 'normal' },
    { path: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-italic.woff2', style: 'italic' },
  ],
  weight: '100 900',
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = localFont({
  src: [
    {
      path: '../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-italic.woff2',
      style: 'italic',
    },
  ],
  weight: '100 800',
  display: 'swap',
  variable: '--font-mono',
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
