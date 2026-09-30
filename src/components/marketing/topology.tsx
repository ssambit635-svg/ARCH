'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Container } from './vui-primitives';

const RobotScene = dynamic(() => import('./robot-scene').then((m) => m.RobotScene), {
  ssr: false,
  loading: () => (
    <div className="robot-stage flex items-center justify-center text-sm text-zinc-400" role="status">
      Preparing the robot…
    </div>
  ),
});

/** Retain the section anchor so existing navigation/bookmarks still work. */
export function Topology() {
  const sectionRef = useRef<HTMLElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="topology"
      aria-labelledby="native-model-title"
      className="relative scroll-mt-20 overflow-hidden border-b border-[#182438] bg-[#04070e]"
    >
      <Container>
        <div className="md:border-x border-[#182438]">
          <div className="flex flex-col gap-5 border-b border-[#182438] px-5 py-10 md:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#182438] bg-[#070d19] px-3 py-1 font-mono text-[11px] text-[#3b8ef4]">
                ARCH NATIVE · V1
              </span>
              <h2
                id="native-model-title"
                className="text-3xl font-semibold tracking-tight leading-[1.16] py-0.5 text-white sm:text-4xl lg:text-5xl"
              >
                Small model. <span className="text-zinc-500">Useful by design.</span>
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
                A little help with incidents. A human still in charge.
                <br className="hidden sm:block" />
                Meet the robot, then meet the actual engine behind ARCH.
              </p>
            </div>
            <a
              href="#model-facts"
              className="w-fit rounded-lg px-2 py-2 font-mono text-xs text-[#3b8ef4] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-[#3b8ef4]"
            >
              What it can (and can’t) do <span aria-hidden>↘</span>
            </a>
          </div>

          <div className="grid divide-y divide-[#182438] lg:grid-cols-[1.15fr_1fr] lg:divide-x lg:divide-y-0">
            <div className="min-w-0 bg-[#060a14]">
              <div className="flex items-center justify-between gap-2 px-5 pt-6 font-mono text-[10px] tracking-widest text-zinc-500 md:px-8">
                <span>YOUR ON-CALL SIDEKICK</span>
                <span className="text-[#3b8ef4]">REAL-TIME 3D</span>
              </div>
              {nearViewport ? <RobotScene /> : <div className="robot-stage" aria-hidden />}
              <p className="border-t border-[#182438] px-5 py-4 text-center font-mono text-[10px] leading-relaxed text-zinc-500">
                A playful mascot, not a visualization of the model’s intelligence.
              </p>
            </div>

            <div id="model-facts" className="scroll-mt-24 px-5 py-8 md:px-8 lg:px-10">
              <p className="font-mono text-[10px] tracking-[0.18em] text-[#3b8ef4]">THE HONEST VERSION</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight leading-snug text-white">
                Practical assistance.
                <br />
                Not a general-purpose AI.
              </h3>
              <p className="mt-4 text-sm leading-7 text-zinc-400">
                ARCH V1’s native engine (<code className="text-xs text-zinc-300">arch-native-1</code>) uses
                small Naive Bayes classifiers, TF-IDF similarity search, rules and templates.
                It runs on your server’s CPU, without an external LLM API or AI API key.
              </p>
              <div className="my-6 flex flex-wrap gap-2 font-mono text-[10px] text-zinc-300">
                {['CPU-only inference', 'Per-organization model', 'Review before acting'].map((label) => (
                  <span
                    key={label}
                    className="rounded-md border border-[#182438] bg-[#070d19] px-2.5 py-1.5"
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div className="divide-y divide-[#182438] border-y border-[#182438]">
                <details className="group py-4" open>
                  <summary className="cursor-pointer text-sm font-medium text-zinc-200 focus-visible:outline-2 focus-visible:outline-[#3b8ef4]">
                    What it helps with
                  </summary>
                  <p className="mt-3 text-xs leading-6 text-zinc-400">
                    Suggesting incident category and severity, finding similar past incidents and runbooks,
                    and drafting summaries, status updates and postmortems from supplied context.
                    Code Assist offers heuristic checks and small template-based snippets—not an autonomous coding agent.
                  </p>
                </details>
                <details className="group py-4">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-200 focus-visible:outline-2 focus-visible:outline-[#3b8ef4]">
                    How it learns
                  </summary>
                  <p className="mt-3 text-xs leading-6 text-zinc-400">
                    Training uses your organization’s resolved incidents and explicit incident corrections,
                    alongside built-in examples and optional public corpora. Runbooks enrich retrieval.
                    Chat ratings are evaluation signals, not automatic fine-tuning.
                    Holdout metrics are available in the model dashboard; results depend on your data.
                  </p>
                </details>
                <details className="group py-4" open>
                  <summary className="cursor-pointer text-sm font-medium text-zinc-200 focus-visible:outline-2 focus-visible:outline-[#3b8ef4]">
                    Where it stops
                  </summary>
                  <p className="mt-3 text-xs leading-6 text-zinc-400">
                    This is not a GPT-class language model. Responses rely on retrieval, rules and templates,
                    and can be repetitive, incomplete or wrong. It cannot guarantee a root cause, fix every bug,
                    or replace an on-call engineer. Sparse incident history limits usefulness. Verify every suggestion.
                  </p>
                </details>
              </div>
              <p className="mt-5 text-[11px] leading-5 text-zinc-500">
                Native inference doesn’t call an AI vendor. Optional URL knowledge fetching and configured
                integrations can still use the network. No universal accuracy or latency claim is made here.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-5 text-xs font-medium">
                <Link
                  href="/dashboard/model"
                  className="rounded-lg bg-[#3b8ef4] px-4 py-2.5 font-semibold text-[#04070e] transition-colors hover:bg-[#64a8ff] focus-visible:outline-2 focus-visible:outline-[#3b8ef4] focus-visible:outline-offset-4"
                >
                  Inspect your model <span aria-hidden>↗</span>
                </Link>
                <a
                  href="https://github.com/ssambit635-svg/ARCH/blob/main/docs/engineering/ARCH-MODEL.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm text-zinc-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-[#3b8ef4]"
                >
                  Read the technical notes <span aria-hidden>↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
