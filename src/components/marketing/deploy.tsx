'use client';

import { useState } from 'react';
import { Container, cn } from './vui-primitives';
import { GsapTextReveal, GsapFadeUp } from './gsap-reveal';

const COMMANDS = [
  'git clone https://github.com/ssambit635-svg/ARCH.git && cd ARCH',
  'cp .env.example .env && docker compose up -d',
  'npm ci && npm run db:migrate && npm run db:seed',
  'npm run dev   # → http://localhost:3000',
];

const PYTHON_SNIPPET = `from arch_client import ArchClient

client = ArchClient(
    base_url="https://arch.internal",
    webhook_secret="whsec_9f2c...8a10",  # HMAC-SHA256 signed
)

# Emit a fingerprinted alert from any Python worker or healthcheck
receipt = client.alerts.send(
    source="prometheus",
    service="checkout-api",
    severity="critical",
    title="Checkout p99 > 4.2s in eu-central-1",
    fingerprint="checkout-api:p99-latency:eu-central-1",
    labels={"region": "eu-central-1", "deploy": "v2.18.4"},
)
print(receipt.incident_id, receipt.deduplicated)`;

const CURL_SNIPPET = `BODY='{"source":"prometheus","service":"checkout-api","severity":"critical","title":"Checkout p99 > 4.2s"}'
SIG=$(printf "%s" "$BODY" | openssl dgst -sha256 -hmac "$AUTH_SECRET_WEBHOOK" -hex | awk '{print $2}')

curl -X POST https://arch.internal/api/webhooks/alerts \\
  -H "Content-Type: application/json" \\
  -H "X-Arch-Signature: sha256=$SIG" \\
  -d "$BODY"`;

export function Deploy() {
  const [copied, setCopied] = useState(false);
  const [sdkTab, setSdkTab] = useState<'python' | 'curl'>('python');

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(COMMANDS.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <section
      id="deploy"
      className="relative border-b border-[#222] bg-[#050608] overflow-hidden"
    >
      <Container>
        <div className="md:border-x border-[#222]">
          <div className="flex flex-col gap-4 border-b border-[#222] px-5 py-10 md:px-8 lg:px-10">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/90 px-3 py-1 font-mono text-[11px] font-medium text-zinc-300">
              <span className="size-1.5 rounded-full bg-[#3b8ef4]" />
              <span>SELF-HOSTED · DOCKER + POSTGRES</span>
            </div>
            <GsapTextReveal as="h2" className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight text-left">
              Deploy in Four Commands
            </GsapTextReveal>
            <p className="max-w-2xl font-mono text-xs sm:text-sm text-zinc-400 text-left leading-relaxed">
              Run on your VM or Kubernetes. Send alerts with the Python SDK or signed webhooks.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#222]">
            {/* Left 6 Columns: 4-Command Bootstrap + Runtime Specs */}
            <div className="lg:col-span-6 p-5 md:p-8 flex flex-col justify-between bg-[#08090c]">
              <div>
                <div className="flex items-center justify-between border-b border-[#222] pb-3 font-mono text-xs">
                  <span className="text-zinc-300">shell · quickstart</span>
                  <button
                    type="button"
                    onClick={copyAll}
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-mono text-[11px] text-zinc-200 transition-colors hover:border-[#3b8ef4] hover:text-[#3b8ef4] cursor-pointer"
                  >
                    {copied ? '✓ Copied' : 'Copy commands'}
                  </button>
                </div>

                <pre className="mt-4 space-y-2.5 overflow-x-auto rounded-xl border border-[#222] bg-[#050608] p-4 font-mono text-xs text-zinc-200">
                  {COMMANDS.map((line, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="select-none text-[#3b8ef4] tnum">$</span>
                      <code>{line}</code>
                    </div>
                  ))}
                </pre>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-xl border border-[#222] bg-[#0b0c10] p-3">
                  <div className="font-mono text-[10px] uppercase text-zinc-500">Runtime</div>
                  <div className="mt-1 font-mono text-xs font-semibold text-white">Node 22 LTS</div>
                </div>
                <div className="rounded-xl border border-[#222] bg-[#0b0c10] p-3">
                  <div className="font-mono text-[10px] uppercase text-zinc-500">Database</div>
                  <div className="mt-1 font-mono text-xs font-semibold text-white">Postgres 16</div>
                </div>
                <div className="rounded-xl border border-[#222] bg-[#0b0c10] p-3">
                  <div className="font-mono text-[10px] uppercase text-zinc-500">Auth</div>
                  <div className="mt-1 font-mono text-xs font-semibold text-white">PBKDF2 + JWT</div>
                </div>
                <div className="rounded-xl border border-[#222] bg-[#0b0c10] p-3">
                  <div className="font-mono text-[10px] uppercase text-zinc-500">License</div>
                  <div className="mt-1 font-mono text-xs font-semibold text-[#3b8ef4]">Self-Hosted</div>
                </div>
              </div>
            </div>

            {/* Right 6 Columns: Python SDK / HMAC Webhook Code Preview */}
            <div className="lg:col-span-6 p-5 md:p-8 flex flex-col justify-between bg-[#06070a]">
              <div>
                <div className="flex items-center justify-between border-b border-[#222] pb-3 font-mono text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSdkTab('python')}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer',
                        sdkTab === 'python'
                          ? 'bg-[#3b8ef4] text-white font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      )}
                    >
                      clients/python · arch_client
                    </button>
                    <button
                      type="button"
                      onClick={() => setSdkTab('curl')}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer',
                        sdkTab === 'curl'
                          ? 'bg-[#3b8ef4] text-white font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      )}
                    >
                      curl · HMAC-SHA256
                    </button>
                  </div>
                  <span className="text-[11px] text-zinc-500">pip install -e clients/python</span>
                </div>

                <pre className="mt-4 overflow-x-auto rounded-xl border border-[#222] bg-[#050608] p-4 font-mono text-[11.5px] leading-relaxed text-zinc-300">
                  <code>{sdkTab === 'python' ? PYTHON_SNIPPET : CURL_SNIPPET}</code>
                </pre>
              </div>

              <div className="mt-4 font-mono text-[11px] text-zinc-500 flex items-center justify-between">
                <span>Zero third-party agents required</span>
                <span className="text-zinc-300">100% tested in CI</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
