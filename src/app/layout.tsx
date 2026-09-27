import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-mono' });

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
