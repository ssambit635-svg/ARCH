import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { AI_NAME } from '@/lib/brand';

const highlights = [
  { title: 'Declare in seconds', body: 'Title first, everything else optional. The timeline, notifications and service status update themselves.' },
  { title: `${AI_NAME} on every incident`, body: 'Triage, summaries and verified fixes — generated on your server from your own history.' },
  { title: 'Status pages + audit trail', body: 'Customers read the page. Auditors read the log. Both are always in agreement.' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen">
      <div className="arch-backdrop pointer-events-none fixed inset-0" aria-hidden />

      {/* Brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden border-r border-white/[0.06] bg-abyss-900/60 p-10 lg:flex">
        <div
          className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-indigo-600/20 blur-[120px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-violet-600/15 blur-[130px]"
          aria-hidden
        />
        <Link href="/" className="relative w-fit" aria-label="ARCH home">
          <Logo />
        </Link>

        <div className="relative space-y-7">
          <div>
            <p className="arch-mono text-xs uppercase tracking-[0.2em] text-indigo-400">Incident response, minus the chaos</p>
            <h2 className="text-gradient mt-3 max-w-md text-4xl font-semibold leading-[1.1] tracking-tight">
              Where your team goes when the app breaks.
            </h2>
          </div>
          <ul className="max-w-md space-y-5">
            {highlights.map((item, index) => (
              <li key={item.title} className="flex gap-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-xs font-bold text-indigo-300">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-slate-400">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-600">Incident management · status pages · audit trail · on-prem ready</p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
        <Link href="/" className="mb-8 lg:hidden" aria-label="ARCH home">
          <Logo />
        </Link>
        <div className="w-full max-w-md animate-rise rounded-2xl border border-white/[0.08] bg-abyss-850/80 p-6 shadow-[0_24px_80px_-24px_rgb(0_0_0/0.8)] backdrop-blur sm:p-8">
          {children}
        </div>
        <p className="mt-6 text-xs text-slate-600">Protected by rate-limited auth · sessions stay on this server</p>
      </div>
    </div>
  );
}
