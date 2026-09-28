import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { AI_NAME } from '@/lib/brand';

/**
 * Auth shell.
 *
 * The brand panel used to carry two `blur-[130px]` colour orbs behind the headline — the single
 * loudest "generated dark SaaS" tell there is, and the reason the page read as a template. It now
 * carries structure instead: engineering graph paper, a top light bar, mono spec rows and an
 * oversized watermark of the mark. Depth comes from layering and hairlines, not from bloom.
 *
 * This is the surface a responder sees at 3am, so it is deliberately calm: no motion, no autoplay,
 * nothing to wait for. The form is the only thing that matters here.
 */

const highlights = [
  {
    title: 'Declare in seconds',
    body: 'Title first, everything else optional. The timeline, notifications and service status update themselves.',
  },
  {
    title: `${AI_NAME} on every incident`,
    body: 'Triage, summaries and verified fixes — generated on your server from your own history. No vendor, no key.',
  },
  {
    title: 'Status pages + audit trail',
    body: 'Customers read the page. Auditors read the log. Both are written in the same transaction, so they agree.',
  },
];

const SPEC = [
  ['deployment', 'self-hosted'],
  ['database', 'postgresql 16'],
  ['ai egress', 'none'],
  ['audit coverage', '100%'],
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen bg-ink-1000">
      {/* ---- Brand panel ---- */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden border-r border-white/[0.07] bg-ink-950 p-10 lg:flex">
        {/* Graph paper + vignette. Structured, and it ties the panel to the marketing surface. */}
        <div className="arch-grid-fine pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(105% 78% at 18% 6%, rgb(255 255 255 / 0.035), transparent 58%)' }}
          aria-hidden
        />
        {/* Top light bar — one sodium hairline, the only warm thing in the panel. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgb(59 130 246 / 0.55) 18%, rgb(255 255 255 / 0.1) 62%, transparent)' }}
          aria-hidden
        />
        {/* Oversized watermark of the wordmark, cropped by the panel. */}
        <p
          className="arch-display pointer-events-none absolute -bottom-[4.5rem] -left-2 select-none text-[15rem] font-semibold leading-[0.72] tracking-[-0.06em] text-white/[0.028]"
          aria-hidden
        >
          ARCH
        </p>

        <Link href="/" className="relative w-fit" aria-label="ARCH home" data-cursor>
          <Logo />
        </Link>

        <div className="relative space-y-8">
          <div>
            <p className="arch-mono flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-ash-500">
              <span className="block h-px w-8 bg-signal-500" aria-hidden />
              incident response, minus the chaos
            </p>
            <h2 className="arch-display mt-4 max-w-[16ch] text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.04em] text-bone">
              Where your team goes when the app breaks.
            </h2>
          </div>

          <ul className="max-w-md divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {highlights.map((item, index) => (
              <li key={item.title} className="group flex gap-4 py-4 transition-colors duration-300 hover:bg-white/[0.018]">
                <span className="arch-mono arch-tabular mt-0.5 shrink-0 text-[11px] font-bold tracking-[0.08em] text-ash-700 transition-colors duration-300 group-hover:text-signal-500">
                  0{index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-bone">{item.title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ash-500">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <dl className="arch-mono relative grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          {SPEC.map(([key, value]) => (
            <div key={key}>
              <dt className="text-[9px] uppercase tracking-[0.14em] text-ash-700">{key}</dt>
              <dd className="mt-0.5 text-[11px] font-medium text-ash-400">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ---- Form panel ---- */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="arch-grid-fine pointer-events-none absolute inset-0 opacity-25 lg:hidden" aria-hidden />

        <Link href="/" className="relative mb-8 lg:hidden" aria-label="ARCH home">
          <Logo />
        </Link>

        <div className="arch-panel layer-shadow relative w-full max-w-md animate-rise p-6 sm:p-8">{children}</div>

        <p className="arch-mono relative mt-6 text-center text-[10px] uppercase tracking-[0.14em] text-ash-700">
          rate-limited auth · sessions stay on this server
        </p>
      </div>
    </div>
  );
}
