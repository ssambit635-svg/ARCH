/**
 * ARCH advisory playbooks — the conversational problem-solving brain.
 *
 * When a responder (or anyone, really) describes a problem in plain words — "database slow hai,
 * kya karu?", "redis cache misses are spiking", "how do I reduce API latency" — ARCH answers with
 * a structured approach: what this usually is, what to check first, the fixes that usually work,
 * and how to prevent the next one.
 *
 * Deliberately NOT code: this is ops counsel — dashboards to look at, mitigations to apply,
 * knobs to turn — composed with the org's runbooks and its own incident history when available.
 * Every topic is deterministic keyword matching; no language model, no network, no cost.
 */

export type AdvisoryPlaybook = {
  id: string;
  label: string;
  /** Words (or patterns) that identify this problem in a free-form question. */
  match: RegExp;
  /** One line: what this problem usually turns out to be. */
  usuallyIs: string;
  /** First things to look at — ordered by how often they explain the problem. */
  checks: string[];
  /** Mitigations that usually work. Operational actions, never code changes. */
  fixes: string[];
  prevention: string[];
};

export const ADVISORY_PLAYBOOKS: AdvisoryPlaybook[] = [
  {
    id: 'database',
    label: 'Database slowness or overload',
    match: /\b(database|db|postgres|mysql|mongo(sql)?|sql|query|queries|connection pool|pool|deadlock|replication|slow quer)/i,
    usuallyIs: 'A saturated resource (connections, CPU, IO) or a query that stopped using its index — rarely the database server itself "being slow".',
    checks: [
      'Look at DB CPU, IO wait and connection count right now, and line them up with when the complaints started.',
      'Find the slowest queries in the last hour (pg_stat_statements / slow query log) — one bad query is the usual culprit.',
      'Check for lock waits and long transactions: an open transaction from a stuck deploy or job blocks everything behind it.',
      'Confirm the app pool size versus max_connections — a pool exhausted by slow queries looks identical to a DB outage.',
    ],
    fixes: [
      'Mitigate first: kill the long-running query/transaction, or temporarily raise the pool/connection limit to breathe.',
      'If it started with a deploy, roll back first and debug the query on the previous version.',
      'If it is read pressure, route reads to a replica or enable caching on the hottest endpoints while you fix the root cause.',
    ],
    prevention: [
      'Alert on pool saturation and p99 query time, not just DB CPU.',
      'Require the slow-query check in the deploy pipeline for services with heavy DB use.',
    ],
  },
  {
    id: 'cache',
    label: 'Cache problems (misses, stampede, evictions)',
    match: /\b(cache|redis|memcached|memcache|cache miss|stampede|evict|ttl|hit rate|hitratio)/i,
    usuallyIs: 'Either a cold cache after a restart/flush (hit rate collapsed) or a stampede — many workers recomputing the same expensive key at once.',
    checks: [
      'Compare hit rate now vs before the problem started — a drop to near zero means the cache got flushed or restarted.',
      'Look at eviction counts and memory: evictions rising means the working set no longer fits.',
      'Check whether one hot key is being recomputed (stampede) — many identical backend calls for the same object is the tell.',
    ],
    fixes: [
      'Warm the hot keys back up (pre-generate the top-N data) instead of waiting for organic traffic to refill the cache.',
      'Add jittered TTLs or a soft-expiry + background refresh so expiry does not synchronize into a thundering herd.',
      'If evictions are the issue, raise the cache memory limit or shorten TTLs on low-value data first.',
    ],
    prevention: [
      'Alert on hit-rate drop and eviction rate, not just cache availability.',
      'Always randomize TTLs (e.g. base ± 20%) for frequently-read keys.',
    ],
  },
  {
    id: 'latency',
    label: 'High latency / slow responses',
    match: /\b(slow|latency|response time|p9[059]|timeout(s)? hanging|sluggish|takes too long|speed|performance)/i,
    usuallyIs: 'A dependency is slow (DB, cache, upstream API) or concurrency is saturated — the service itself rarely gets slower without one of those moving.',
    checks: [
      'Split latency by dependency: DB time, cache time, upstream calls — find which segment grew.',
      'Check saturation: CPU throttling, thread/connection pool queue depth, GC pauses.',
      'Line up the latency step-change with deploys, config changes and traffic changes on the same timeline.',
    ],
    fixes: [
      'Reduce load on the slowest dependency: cache its responses, batch calls, or shed low-priority traffic.',
      'If a deploy correlates, roll it back first — latencies recover fastest that way.',
      'Raise timeouts/concurrency limits only as a bridge; that trades latency errors for queueing, it does not fix the cause.',
    ],
    prevention: [
      'Keep per-dependency latency dashboards; aggregate p99 hides which dependency moved.',
      'Load-test the top 3 endpoints before peak season, not during it.',
    ],
  },
  {
    id: 'errors',
    label: 'Error spike / 5xx / crashes',
    match: /\b(error(s)? rate|5\d\d|502|503|500s|exception|crash(ing)?|panic|failing|failure|stack trace|unhandled)/i,
    usuallyIs: 'A bad deploy, a config change, or an upstream dependency failing — the first error line in the logs almost always names it.',
    checks: [
      'Read the first error, not the thousandth — grab the earliest stack trace after the spike started and read its top frames.',
      'Diff the error signature before/after: same error as always = dependency or load; new error = your change.',
      'Check upstream health and recent deploys/config changes in the same window.',
    ],
    fixes: [
      'Roll back the most recent change first if one is in the window — verify with the error rate before debugging deeper.',
      'If the errors come from one endpoint or tenant, shed or rate-limit that slice to save the rest.',
      'Restart/redeploy only after capturing logs and a stack trace — a blind restart destroys the evidence.',
    ],
    prevention: [
      'Alert on error-signature novelty (new error type), not just error count.',
      'Keep release markers on the error dashboard so correlation is a glance.',
    ],
  },
  {
    id: 'queue',
    label: 'Queue backlog / stuck background jobs',
    match: /\b(queue|backlog|lag|kafka|rabbitmq|sqs|consumer|worker|job(s)? stuck|retry(ing)? storm|dead letter|dlq)/i,
    usuallyIs: 'Producers outpacing consumers (scale/ratio drift) or one poison message stopping the consumer loop.',
    checks: [
      'Compare produce rate vs consume rate now — the gap is your backlog growth rate.',
      'Look at the head of the queue: if it is not moving, you have a poison message or a crashed consumer, not volume.',
      'Check consumer error logs and DLQ depth; retries with backoff often quietly became a storm.',
    ],
    fixes: [
      'Scale consumers horizontally first — it is the safest immediate relief for pure volume.',
      'For a poison message: pause the consumer, park the message in the DLQ, resume.',
      'Tune retry backoff (exponential + jitter) if retries are amplifying the load.',
    ],
    prevention: [
      'Alert on oldest-message-age, not queue depth alone.',
      'Set a DLQ alarm and a weekly poison-message review.',
    ],
  },
  {
    id: 'disk',
    label: 'Disk / storage full',
    match: /\b(disk|storage|volume|inode|no space|disk full|space left|log(s)? filling)/i,
    usuallyIs: 'Logs or temp files growing unbounded, or a retention setting that never got set — the data itself is rarely the surprise.',
    checks: [
      'Find the biggest directory (du -xh /var | sort) — almost always logs, docker/containerd, or a temp dir.',
      'Check inode usage too — "disk full" with free space means inode exhaustion (many small files).',
      'Look for a log level that changed (debug logging left on after a troubleshooting session).',
    ],
    fixes: [
      'Free space safely: rotate/compress logs, clean temp and old container images — never delete live data files.',
      'If it is a database volume, expand the volume rather than deleting anything.',
      'Move verbose logging back to normal level once space is freed.',
    ],
    prevention: [
      'Alert at 75% disk, not 95% — disk-full incidents always happen at 3am.',
      'Set log rotation and retention on day one for every service.',
    ],
  },
  {
    id: 'memory',
    label: 'Memory exhaustion / OOM',
    match: /\b(oom|out of memory|memory leak|heap|gc pause|rss|killed|oomkilled|ram)/i,
    usuallyIs: 'A leak (memory climbs steadily until the kill) or an under-sized limit for the real working set (crashes at peak).',
    checks: [
      'Plot memory over hours: steady climb = leak; spike with traffic = capacity.',
      'Check which process/container got OOM-killed and its limit versus requested.',
      'Look at GC metrics — long/ frequent GC with high heap usage points at a leak.',
    ],
    fixes: [
      'Raise the memory limit as a bridge if capacity, and restart instances one at a time if a leak is draining them.',
      'For a leak correlated with a deploy, roll back — finding the leak line can take days, the rollback takes minutes.',
    ],
    prevention: [
      'Set memory requests AND limits; alert on RSS growth rate, not just absolute use.',
      'Add a soak test to the release checklist for stateful services.',
    ],
  },
  {
    id: 'network',
    label: 'Network / DNS / TLS connectivity',
    match: /\b(network|connection refused|unreachable|dns|resolve|tls|ssl|certificate|cert|handshake|packet loss|socket|connect timeout)/i,
    usuallyIs: 'DNS resolution failing, a certificate expiring/renewing badly, or a firewall/security-group change — "connection refused" is a reachability problem, not an app bug.',
    checks: [
      'From an affected host: resolve the name, then connect — separate DNS failure from TCP failure from TLS failure.',
      'Check certificate expiry and the last renewal (cert expiry incidents spike after automated renewals that break the chain).',
      'Review recent firewall, security-group, VPC or proxy changes.',
    ],
    fixes: [
      'DNS: switch to the IP/alternate name as a temporary pin while TTLs drain, fix the record, then remove the pin.',
      'TLS: serve the full chain, or reissue the cert; restart the terminator (LB/nginx) after replacing.',
      'Firewall/SG: re-open the path; verify from a host inside and outside the segment.',
    ],
    prevention: [
      'Alert on certificate expiry at 21 days and on DNS resolution from outside your VPC.',
      'Test dependency connectivity in the deploy smoke test.',
    ],
  },
  {
    id: 'auth',
    label: 'Authentication / login failures',
    match: /\b(login|sign in|signin|auth|authentication|oauth|token expired|401|403|permission denied|password|sso|session)/i,
    usuallyIs: 'A rotated/ expired secret (JWT secret, OAuth client, session key) or a clock-skew issue invalidating tokens — bulk login failures are almost always config, not user error.',
    checks: [
      'Are failures for ALL users or one tenant/IdP? All = your secret/endpoint; one = their config.',
      'Check secret rotation history and token expiry settings; compare server clocks (skew over 30-60s breaks token validation).',
      'Read the auth error verbatim — "signature invalid" and "token expired" have different fixes.',
    ],
    fixes: [
      'If a secret rotated badly, roll back to the previous secret (dual-accept old+new during transition if possible).',
      'Fix clock skew (NTP) if tokens validate intermittently.',
      'For one IdP/tenant failing, re-share metadata/redirect config with that admin rather than restarting anything.',
    ],
    prevention: [
      'Dual-accept old and new secrets for 24h during any rotation.',
      'Alert on login failure RATE by tenant — it detects rotation mistakes in minutes.',
    ],
  },
  {
    id: 'deploy',
    label: 'Something broke right after a change',
    match: /\b(after (the )?(deploy|release|update|upgrade|config change)|rollback|roll back|revert|new version|since the (deploy|release|update)|broke after)/i,
    usuallyIs: 'The change itself. The simplest hypothesis that fits the timeline is usually right: what you shipped is what broke.',
    checks: [
      'Confirm the timeline: did the symptom start within minutes of the change? (Check the deploy marker against the metric step-change.)',
      'Scope it: which services got the change, and do their error rates move together? Blast radius of the change equals who depends on it.',
      'Canary comparison: does the old version still run somewhere healthy? That is your control group.',
    ],
    fixes: [
      'Roll back first, debug second — a rollback is the fastest verified fix you have.',
      'If rollback is risky (migrations), forward-fix with a config flag or scale the old version back up.',
      'Freeze further deploys on the affected path until the metric recovers.',
    ],
    prevention: [
      'Keep deploys small and independently reversible; big-bang releases make the diagnosis window huge.',
      'Annotate deploys on the golden-signal dashboards so "broke after X" is a glance, not an investigation.',
    ],
  },
  {
    id: 'traffic',
    label: 'Traffic spike / overload',
    match: /\b(traffic|spike|surge|load spike|too many (requests|users)|overload|ddos|rate limit(ed)?|throttl|autoscal)/i,
    usuallyIs: 'Genuine demand (marketing event, incident-driven retries, bot traffic) exceeding the provisioned capacity — sometimes amplified by client retry storms.',
    checks: [
      'Is the traffic organic? Break it down by endpoint, tenant and user-agent — one noisy bot or a retry loop is common.',
      'Check autoscaling: did it trigger, and did the new instances actually pass health checks?',
      'Look at dependency saturation too — the DB usually falls over before your app does.',
    ],
    fixes: [
      'Scale out and, if needed, shed: rate-limit the noisiest source, enable queueing or a degraded mode for non-critical features.',
      'Enable/loosen caching on hot read endpoints immediately — it is the biggest lever per minute.',
      'If a retry storm, raise backoff/jitter on the client side you control and ask the partner to do the same.',
    ],
    prevention: [
      'Load-test before known peaks and keep a pre-approved "degrade gracefully" feature flag list.',
      'Alert on traffic shape change (per-endpoint anomaly), not just total RPS.',
    ],
  },
  {
    id: 'availability',
    label: 'Service down / unreachable',
    match: /\b(down|outage|unreachable|not (working|responding|loading)|cannot (reach|connect)|blackout|total(ly)? (down|broken)|website (down|not))/i,
    usuallyIs: 'One failing tier (LB, app, DB, DNS) taking the whole path with it — find the first tier that fails, everything behind it looks down too.',
    checks: [
      'Walk the request path top-down: DNS → LB → app → DB. The first red box is the incident.',
      'Check the status of every dependency in parallel — an upstream outage masquerades as "our site is down".',
      'Look at the last change to ANY tier in the path, not just the app.',
    ],
    fixes: [
      'Fail over: shift traffic to healthy region/replica/instance, or take the sick node out of the pool.',
      'If the LB/edge is healthy but apps are crashing, restart with a fresh config after capturing a dump/logs.',
      'Communicate early on the status page while you work — "down and silent" is the worst combination.',
    ],
    prevention: [
      'Synthetic checks from outside your network on the real user path.',
      'Keep a documented failover runbook and rehearse it twice a year.',
    ],
  },
];

export type AdvisoryMatch = {
  playbook: AdvisoryPlaybook;
  score: number;
};

/** Best-matching playbook for a free-form problem description (null when nothing matches). */
export function matchAdvisoryTopic(question: string): AdvisoryMatch | null {
  let best: AdvisoryMatch | null = null;
  for (const playbook of ADVISORY_PLAYBOOKS) {
    const hits = (question.match(new RegExp(playbook.match.source, 'gi')) ?? []).length;
    if (hits > 0 && (!best || hits > best.score)) best = { playbook, score: hits };
  }
  return best;
}

/** How-to phrasing: the user is asking for a solution/approach, not just describing state. */
export function wantsAdvice(question: string): boolean {
  return /\b(kya kar(u|un)?|kaise (solve|fix|thik|sahi|handle|deal|manage)|what (should|do) (i|we) do|how (do|can|should) (i|we)|solution|upay|samadhan|sulah|fix|resolve|solve|prevent|reduce|improve|best practice|tips|guide me|steps|advice|suggest(ion)?s?|kaise (theek|thik|solve)|handle kar|deal kar|sorted|sort out)\b/i.test(
    question,
  );
}
