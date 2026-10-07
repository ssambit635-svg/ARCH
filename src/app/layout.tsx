import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

/**
 * Fonts are self-hosted (OFL-1.1, see `src/app/fonts/*.txt`) per the Vengeance UI design system:
 *   Orbitron      — geometric display typeface used across Vengeance UI headings and wordmarks.
 *   Inter         — primary UI and body typeface.
 *   Geist Mono    — developer monospace for subheadings, metadata, labels, CLI and code blocks.
 *   Space Grotesk — secondary geometric display fallback.
 *   Michroma     — futuristic, angular footer wordmark (SIL Open Font License).
 */
const orbitron = localFont({
  src: './fonts/orbitron-latin-wght-normal.woff2',
  weight: '400 900',
  display: 'swap',
  variable: '--font-orbitron',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

// Michroma (SIL Open Font License) gives the footer wordmark a sharper, Azonix-like sci-fi cut.
const michroma = localFont({
  src: './fonts/michroma-latin-400-normal.woff2',
  weight: '400',
  display: 'swap',
  preload: false,
  variable: '--font-michroma',
  fallback: ['Orbitron', 'ui-sans-serif', 'system-ui', 'sans-serif'],
});

const inter = localFont({
  src: './fonts/inter-latin-wght-normal.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-inter',
  fallback: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

const geistMono = localFont({
  src: './fonts/geist-mono-latin-wght-normal.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-geist-mono',
  fallback: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
});

const spaceGrotesk = localFont({
  src: './fonts/space-grotesk-latin-wght-normal.woff2',
  preload: false,
  weight: '300 700',
  display: 'swap',
  variable: '--font-space-grotesk',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

const jetbrainsMono = localFont({
  src: './fonts/jetbrains-mono-latin-wght-normal.woff2',
  preload: false,
  weight: '100 800',
  display: 'swap',
  variable: '--font-jetbrains-mono',
  fallback: ['ui-monospace', 'monospace'],
});

export const metadata: Metadata = {
  title: {
    default: 'ARCH — Clarity when things break',
    template: '%s | ARCH',
  },
  description:
    'A focused response workspace for engineering teams. Alerts, context, and human-reviewed assistance on your own infrastructure.',
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
    title: 'ARCH — Clarity when things break',
    description:
      'Bring alerts, context, and your team together in one focused, self-hosted workspace.',
    type: 'website',
    siteName: 'ARCH',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ARCH — Clarity when things break',
    description: 'Bring alerts, context, and your team together in one focused, self-hosted workspace.',
  },
};

export const viewport: Viewport = {
  themeColor: '#050608',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${orbitron.variable} ${michroma.variable} ${inter.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col bg-[#050608] text-[#f4f4f5] antialiased selection:bg-[#c7c7c7] selection:text-[#050608]">
        {children}
      </body>
    </html>
  );
}
