import { CATEGORY_IDS, type CategoryId } from '../../src/server/ai/arch-model/knowledge';
import type { ArchModelRuntime } from '../../src/server/ai/arch-model/runtime';

/**
 * ARCH Model — golden evaluation set.
 *
 * Hand-written incidents, one or two per failure family, phrased the way an engineer writes a title
 * on a call rather than the way the pattern library is worded — so the model has to generalise.
 * Both `npm run model:eval` and `tests/arch-eval.test.ts` use this same set, so the number the
 * developer sees locally is the number CI asserts on.
 */
export type GoldenItem = { text: string; category: CategoryId };

export const GOLDEN: GoldenItem[] = [
  { text: 'Checkout returning 502s right after the payments-api deploy; rolled back', category: 'deploy' },
  { text: 'Error rate jumped the moment we shipped the new release of the API gateway', category: 'deploy' },
  { text: 'Bad config push turned on debug logging and broke the feature flag evaluation', category: 'config' },
  { text: 'Secret rotation left the service with an expired API key', category: 'config' },
  { text: 'Primary database CPU pinned at 100%, too many connections, requests timing out', category: 'database' },
  { text: 'Replication lag grew to 40 minutes on the read replica', category: 'database' },
  { text: 'Traffic spike tripled the request rate and the connection pool was exhausted', category: 'capacity' },
  { text: 'Retry storm after the upstream timeout saturated the service', category: 'capacity' },
  { text: 'Worker containers were killed for using too much memory, heap kept growing', category: 'memory' },
  { text: 'Long GC pauses made latency spike every few minutes', category: 'memory' },
  { text: 'Disk filled up with application logs and writes started failing', category: 'disk' },
  { text: 'Load balancer health check misconfiguration sent traffic to dead nodes', category: 'network' },
  { text: 'Network partition split the cluster into two halves', category: 'network' },
  { text: 'DNS record change pointed the API at the wrong address', category: 'dns' },
  { text: 'The TLS certificate on the public API endpoint expired', category: 'certificate' },
  { text: 'Our payment processor had an outage and checkout failed for everyone', category: 'dependency' },
  { text: 'A cloud region outage took down the primary availability zone', category: 'dependency' },
  { text: 'Cache stampede after the Redis node restart hammered the database', category: 'cache' },
  { text: 'Kafka consumer backlog grew to 4 million messages and events were delayed', category: 'queue' },
  { text: 'The nightly cron job failed silently and no reports were generated', category: 'queue' },
  { text: 'Users cannot log in, SSO callback failing with a 500', category: 'auth' },
  { text: 'Identity provider outage blocked every login attempt', category: 'auth' },
  { text: 'Volumetric DDoS attack saturated the edge and legitimate traffic was dropped', category: 'security' },
  { text: 'A leaked credential was found in a public repository and rotated', category: 'security' },
  { text: 'Clock skew between nodes made signed tokens appear expired', category: 'time' },
  { text: 'Power failure in the datacenter took out a whole rack', category: 'hardware' },
  { text: 'An engineer accidentally deleted a production table', category: 'data' },
  { text: 'A schema migration corrupted rows in the orders table', category: 'data' },
  { text: 'Pods stuck in CrashLoopBackOff after the helm upgrade', category: 'kubernetes' },
  { text: 'Node pressure evicted pods because of memory limits', category: 'kubernetes' },
  { text: 'Upstream started returning 429 and we hit the rate limit', category: 'rate-limit' },
  { text: 'JavaScript assets failed to load from the CDN and the page was blank', category: 'frontend' },
  { text: 'Race condition in the checkout flow double-charged some customers', category: 'concurrency' },
  { text: 'Payments webhook backlog delayed order confirmations', category: 'payments' },
];

/** Severity ordering checks — the label a responder would have chosen, not an average. */
export const SEVERITY_GOLDEN: { text: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' }[] = [
  { text: 'Total outage: every request fails, checkout is down and we are losing revenue', severity: 'CRITICAL' },
  { text: 'Complete service outage, no traffic can be served', severity: 'CRITICAL' },
  { text: 'Elevated error rate on checkout affecting about a third of requests', severity: 'HIGH' },
  { text: 'A typo on the pricing page in the marketing footer', severity: 'LOW' },
];

export type EvalResult = { correct: number; total: number; accuracy: number; misses: string[] };

/** Score a runtime against the golden set. Pure — no database, no network. */
export function evaluate(model: ArchModelRuntime): EvalResult {
  const misses: string[] = [];
  let correct = 0;
  for (const item of GOLDEN) {
    const predicted = model.classifyCategory(item.text).category;
    if (predicted === item.category) correct += 1;
    else misses.push(`${item.category} → ${predicted}: ${item.text}`);
  }
  return { correct, total: GOLDEN.length, accuracy: correct / GOLDEN.length, misses };
}

/** True when the golden set still covers every family — guards against a silent shrink. */
export function goldenCoversEveryCategory(): boolean {
  return new Set(GOLDEN.map((item) => item.category)).size === CATEGORY_IDS.length;
}
