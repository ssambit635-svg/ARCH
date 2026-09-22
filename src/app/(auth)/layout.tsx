import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold text-white">
        <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-sm">A</span>
        ARCH
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">{children}</div>
      <p className="mt-6 text-xs text-slate-500">Incident management · status pages · audit trail</p>
    </div>
  );
}
