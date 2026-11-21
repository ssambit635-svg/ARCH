import type { Metadata } from 'next';
import Link from 'next/link';
import { DownloadOptions } from '@/components/app/download-options';
import './download.css';

export const metadata: Metadata = {
  title: 'Download ARCH for Windows & Linux',
  description: 'Install ARCH as a browser-powered desktop app on Windows or Linux. The same workspace, in its own window. No native installer required.',
};

export default function DownloadPage() {
  return <div className="mk download-page">
    <header className="download-header"><Link href="/" className="download-brand" aria-label="ARCH home"><img src="/app/icon-192.png" width="36" height="36" alt="" />ARCH</Link><nav aria-label="Download navigation"><Link href="/">Back to website</Link><Link href="/login">Log in</Link></nav></header>
    <main id="top" className="download-main">
      <div className="download-intro"><p className="download-eyebrow">Your workspace. Your desktop.</p><h1>Download ARCH.<br /><span>Less browser. More focus.</span></h1><p>Keep incident response in its own window. Install on Windows or Linux, and use the same account and workspace you use on the web.</p><span className="download-badge">Available now · browser-installed app (PWA)</span></div>
      <DownloadOptions />
      <section className="download-expectations" aria-labelledby="download-details"><div><h2 id="download-details">Same ARCH. A quieter place to work.</h2><p>An app icon, a separate window, and the same features. Your existing browser workspace stays available.</p><Link href="/dashboard">Continue in browser →</Link></div><ul><li><strong>No .exe or AppImage yet.</strong> These buttons install the web app through your browser; they do not download a native binary.</li><li><strong>Online workspace.</strong> The opening screen can be cached after setup. Live incidents, sign-in, and saving changes still need your server.</li><li><strong>Cold starts still apply.</strong> Installation does not keep a free Render backend awake or eliminate its startup delay.</li><li><strong>Other devices.</strong> On iPhone/iPad, use Safari → Share → Add to Home Screen. Android Chrome offers Install app in its menu. Firefox desktop may not offer standalone installation.</li></ul></section>
      <noscript><p>JavaScript is disabled. Use the Installation steps under your platform and your browser’s install menu.</p></noscript>
    </main><footer className="download-footer"><Link href="/">ARCH</Link><span>Same account. Same workspace. No paid download.</span></footer>
  </div>;
}
