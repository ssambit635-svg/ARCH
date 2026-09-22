import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ARCH — incident management for developer teams',
    template: '%s · ARCH',
  },
  description:
    'ARCH is where your team goes when your application breaks: ingest alerts, run the response, publish a status page, keep the audit trail.',
  applicationName: 'ARCH',
};

export const viewport: Viewport = {
  themeColor: '#020617',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
