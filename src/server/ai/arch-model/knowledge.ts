import type { IncidentSeverity } from '@/generated/prisma/client';

/**
 * ARCH Model — built-in knowledge (original ARCH content, no third-party text).
 *
 * This is the "pre-training" every organization starts from before it has resolved incidents of
 * its own:
 *
 *   CATEGORIES          failure families with customer-safe impact wording and detection advice;
 *   PATTERNS            ~50 recurring production failure modes (symptoms → root cause → mitigation
 *                       → prevention), distilled from common SRE practice;
 *   SEVERITY_EXAMPLES   short labelled incident descriptions that teach the severity classifier
 *                       what LOW / MEDIUM / HIGH / CRITICAL usually look like.
 *
 * Every organization's model is then trained on its OWN resolved incidents on top of this, so the
 * suggestions drift toward how that team actually works. Nothing here is ever sent anywhere.
 */

export type CategoryId =
  | 'deploy'
  | 'config'
  | 'database'
  | 'capacity'
  | 'memory'
  | 'disk'
  | 'network'
  | 'dns'
  | 'certificate'
  | 'dependency'
  | 'cache'
  | 'queue'
  | 'auth'
  | 'security'
  | 'time'
  | 'hardware'
  | 'data'
  | 'kubernetes'
  | 'rate-limit'
  | 'frontend'
  | 'concurrency'
  | 'payments';

export type CategoryInfo = {
  id: CategoryId;
  label: string;
  /** Customer-facing wording for status updates ("Some customers may …"). Never internal. */
  customerImpact: string;
  /** Extra vocabulary that identifies the family — used as training text. */
  vocabulary: string;
  detection: string;
};

export const CATEGORIES: Record<CategoryId, CategoryInfo> = {
  deploy: {
    id: 'deploy',
    label: 'Bad deploy / release regression',
    customerImpact: 'Some customers may see errors or unexpected behaviour in recently changed features.',
    vocabulary: 'deploy deployment release rollout rollback roll back revert version build pipeline canary regression new version shipped merged hotfix',
    detection: 'Alert on error-rate and latency deltas per deploy (canary analysis) and annotate dashboards with release markers.',
  },
  config: {
    id: 'config',
    label: 'Configuration change',
    customerImpact: 'Some customers may be unable to reach parts of the service or may see errors.',
    vocabulary: 'config configuration setting flag feature flag toggle yaml terraform ansible parameter env variable typo misconfiguration change pushed globally',
    detection: 'Validate configuration semantically before rollout and track config changes as first-class deploys.',
  },
  database: {
    id: 'database',
    label: 'Database overload or failure',
    customerImpact: 'Some customers may see slow page loads, failed saves or errors.',
    vocabulary: 'database db postgres mysql mongo query slow query index lock deadlock replication replica primary failover connection pool connections exhausted vacuum migration schema table',
    detection: 'Alert on connection-pool saturation, replication lag, lock waits and slow-query rate.',
  },
  capacity: {
    id: 'capacity',
    label: 'Capacity / traffic overload',
    customerImpact: 'Some customers may experience slow responses or intermittent errors during peak traffic.',
    vocabulary: 'traffic spike surge load overload capacity autoscaling scale cpu saturated throttled queueing latency p99 thundering herd cascading failure retries storm',
    detection: 'Load-test beyond expected peaks and alert on saturation (CPU, threads, queue depth) before errors appear.',
  },
  memory: {
    id: 'memory',
    label: 'Memory exhaustion',
    customerImpact: 'Some customers may see intermittent errors or slow responses.',
    vocabulary: 'memory leak oom out of memory oomkilled heap garbage collection gc pause rss swap exit code 137 allocation',
    detection: 'Track memory growth per process over time and alert on sustained upward trends, not only hard limits.',
  },
  disk: {
    id: 'disk',
    label: 'Disk / storage exhaustion',
    customerImpact: 'Some customers may be unable to upload or save data.',
    vocabulary: 'disk full no space left enospc volume storage inode log rotation iops io wait filesystem ebs',
    detection: 'Alert on disk usage forecasts (time-to-full) and inode usage, and enforce log rotation.',
  },
  network: {
    id: 'network',
    label: 'Network / load balancer',
    customerImpact: 'Some customers may be unable to connect or may see timeouts.',
    vocabulary: 'network packet loss latency connectivity bgp route routing firewall load balancer lb vpc subnet peering switch router partition timeout connection reset ingress',
    detection: 'Probe critical paths from several regions and alert on packet loss and connection errors between tiers.',
  },
  dns: {
    id: 'dns',
    label: 'DNS resolution',
    customerImpact: 'Some customers may be unable to reach the service.',
    vocabulary: 'dns resolution resolve nxdomain servfail record ttl nameserver domain registrar zone coredns enotfound lookup',
    detection: 'Monitor resolution of your public and internal names from outside your network, and alert on domain expiry.',
  },
  certificate: {
    id: 'certificate',
    label: 'TLS certificate',
    customerImpact: 'Some customers may see security warnings or be unable to connect.',
    vocabulary: 'certificate cert tls ssl expired expiry x509 handshake chain renewal letsencrypt ca',
    detection: 'Alert 30, 14 and 3 days before any certificate expires and automate renewal.',
  },
  dependency: {
    id: 'dependency',
    label: 'Third-party / upstream dependency',
    customerImpact: 'Some features that rely on an external partner may be unavailable or slow.',
    vocabulary: 'third party vendor provider upstream downstream external api partner outage cloud provider region aws gcp azure stripe twilio sendgrid saas dependency',
    detection: 'Monitor each external dependency separately (latency, error rate) and subscribe to vendor status pages.',
  },
  cache: {
    id: 'cache',
    label: 'Cache failure',
    customerImpact: 'Some customers may see slower responses or outdated information.',
    vocabulary: 'cache redis memcached eviction hit rate miss stampede cold cache invalidation stale ttl',
    detection: 'Alert on cache hit-rate drops and eviction spikes; load-test with a cold cache.',
  },
  queue: {
    id: 'queue',
    label: 'Queue / background processing backlog',
    customerImpact: 'Some actions such as emails, notifications or exports may be delayed.',
    vocabulary: 'queue backlog consumer lag kafka rabbitmq sqs worker job cron delayed stuck processing dead letter partition offset',
    detection: 'Alert on queue age (oldest message) rather than only queue length.',
  },
  auth: {
    id: 'auth',
    label: 'Authentication / login',
    customerImpact: 'Some customers may be unable to sign in.',
    vocabulary: 'login log in sign in authentication auth sso saml oauth oidc token session password 401 403 identity provider mfa',
    detection: 'Run synthetic login checks every minute and alert on login success-rate drops.',
  },
  security: {
    id: 'security',
    label: 'Security incident',
    customerImpact: 'We are investigating a security-related issue and will share more information as soon as possible.',
    vocabulary: 'security breach attack ddos malicious leaked credentials exposed vulnerability exploit unauthorized intrusion compromised phishing ransomware abuse bot',
    detection: 'Alert on anomalous access patterns, secret-scanning hits and traffic from unusual sources.',
  },
  time: {
    id: 'time',
    label: 'Time / clock / scheduling',
    customerImpact: 'Some customers may see incorrect times or delayed scheduled actions.',
    vocabulary: 'time clock skew ntp leap second timezone daylight saving dst cron schedule expiry date year 2038 epoch',
    detection: 'Monitor clock drift on every host and test date-boundary behaviour (DST, month end, leap years).',
  },
  hardware: {
    id: 'hardware',
    label: 'Hardware / power / datacenter',
    customerImpact: 'Some customers may be unable to reach the service while we move traffic to healthy infrastructure.',
    vocabulary: 'hardware power outage datacenter data center cooling disk failure server failure host failure rack generator ups fiber cut availability zone',
    detection: 'Spread capacity across failure domains and regularly test failover to them.',
  },
  data: {
    id: 'data',
    label: 'Data integrity / data loss',
    customerImpact: 'Some customers may see missing or incorrect data while we restore it.',
    vocabulary: 'data loss corruption corrupted deleted wrong data inconsistent backup restore migration duplicate records integrity accidentally deleted',
    detection: 'Test restores regularly and add integrity checks (row counts, checksums) to migrations and batch jobs.',
  },
  kubernetes: {
    id: 'kubernetes',
    label: 'Kubernetes / orchestration',
    customerImpact: 'Some customers may see intermittent errors while services restart.',
    vocabulary: 'kubernetes k8s pod pods crashloopbackoff node eviction scheduler kubelet ingress helm container image pull liveness readiness probe hpa etcd namespace',
    detection: 'Alert on pod restart rate, pending pods and failing readiness probes per deployment.',
  },
  'rate-limit': {
    id: 'rate-limit',
    label: 'Rate limiting / quotas',
    customerImpact: 'Some customers may see requests rejected or slowed down.',
    vocabulary: 'rate limit throttle throttling 429 quota exceeded too many requests limit reached api limit',
    detection: 'Alert when any quota passes 80% and review limits before large launches.',
  },
  frontend: {
    id: 'frontend',
    label: 'Frontend / client',
    customerImpact: 'Some customers may see pages that do not load correctly.',
    vocabulary: 'frontend ui page blank white screen javascript js error browser css asset bundle cdn mobile app crash render',
    detection: 'Collect real-user monitoring and client-side error rates per release.',
  },
  concurrency: {
    id: 'concurrency',
    label: 'Race condition / conflicting operations',
    customerImpact: 'Some customers may see failed or duplicated operations.',
    vocabulary: 'race condition concurrent conflict lock contention duplicate double processing idempotency split brain two writers ordering',
    detection: 'Add idempotency keys and alert on duplicate-processing and lock-contention metrics.',
  },
  payments: {
    id: 'payments',
    label: 'Payments / checkout',
    customerImpact: 'Some customers may be unable to complete purchases or payments.',
    vocabulary: 'payment payments checkout billing charge card declined invoice subscription transaction refund stripe paypal gateway order',
    detection: 'Track checkout conversion and payment success rate in real time with synthetic purchases.',
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];

export type FailurePattern = {
  id: string;
  category: CategoryId;
  title: string;
  /** How it shows up during an incident — this is the main training text. */
  symptoms: string;
  rootCause: string;
  mitigation: string[];
  prevention: string[];
};

export const PATTERNS: FailurePattern[] = [
  // ---- deploy
  {
    id: 'deploy-regression',
    category: 'deploy',
    title: 'Regression shipped in a deploy',
    symptoms: 'Error rate or latency jumps within minutes of a deploy. 500 errors started right after the release of a new version. Rolled back and errors dropped.',
    rootCause: 'A code change in the latest release introduced a bug that tests did not catch.',
    mitigation: ['Roll back to the last known-good version.', 'Pause the deploy pipeline until the change is understood.'],
    prevention: ['Add a canary stage that compares error rate against the previous version before full rollout.', 'Add a regression test for the failing path.'],
  },
  {
    id: 'deploy-migration-incompatible',
    category: 'deploy',
    title: 'Deploy and schema migration out of order',
    symptoms: 'New version fails with column does not exist or unknown field errors. Old pods crash after migration ran. Mixed versions during rollout disagree about the schema.',
    rootCause: 'The database migration was not backward compatible with the version still running during the rollout.',
    mitigation: ['Roll back the application or apply a compatibility migration.', 'Stop the rollout so only one version serves traffic.'],
    prevention: ['Use expand/contract migrations: add columns first, remove them only after every version stops reading them.', 'Run migrations as a separate, reviewed step.'],
  },
  {
    id: 'deploy-partial-rollout',
    category: 'deploy',
    title: 'Partial or stuck rollout',
    symptoms: 'Only some servers or regions show errors. Deploy stuck halfway. Some instances run the old version and some the new one.',
    rootCause: 'The rollout stalled and left a mix of versions, or a subset of hosts received a broken artifact.',
    mitigation: ['Complete or reverse the rollout so every instance runs the same version.', 'Drain unhealthy instances from the load balancer.'],
    prevention: ['Make rollouts atomic per stage with automatic halt-and-rollback on health-check failure.'],
  },
  // ---- config
  {
    id: 'config-bad-push',
    category: 'config',
    title: 'Bad configuration pushed globally',
    symptoms: 'Everything broke at the same moment across all regions right after a configuration change. Typo in config. Feature flag enabled for everyone.',
    rootCause: 'An invalid or unintended configuration change was pushed to every environment at once without staged rollout.',
    mitigation: ['Revert the configuration change.', 'Freeze further config pushes until the change is reviewed.'],
    prevention: ['Validate configuration semantically before rollout.', 'Roll out configuration in stages like code, starting with a small percentage.'],
  },
  {
    id: 'config-feature-flag',
    category: 'config',
    title: 'Feature flag turned on unexpectedly',
    symptoms: 'Behaviour changed without a deploy. A feature flag or toggle was flipped. Errors only for users in the flag cohort.',
    rootCause: 'A feature flag enabled an unfinished or untested code path in production.',
    mitigation: ['Turn the flag off.', 'Audit who changed the flag and when.'],
    prevention: ['Require review and an audit trail for production flag changes.', 'Roll flags out by percentage with automatic rollback on error-rate increase.'],
  },
  {
    id: 'config-secret-rotation',
    category: 'config',
    title: 'Secret or credential rotated without updating consumers',
    symptoms: 'Sudden authentication failures between internal services. Invalid credentials, access denied, password authentication failed after a rotation.',
    rootCause: 'A secret was rotated but one or more services kept using the old value.',
    mitigation: ['Restore the previous secret or roll the new secret out to every consumer.', 'Restart services that cache credentials.'],
    prevention: ['Support two valid secrets during rotation (overlap window).', 'Inventory every consumer of a secret before rotating it.'],
  },
  // ---- database
  {
    id: 'db-connection-pool',
    category: 'database',
    title: 'Database connection pool exhausted',
    symptoms: 'Too many connections. Remaining connection slots are reserved. Connection pool exhausted, timeouts acquiring a connection. Database CPU pinned at 100 percent.',
    rootCause: 'More connections were opened than the database or pool allows, often from a traffic spike, a connection leak, or long-running queries holding connections.',
    mitigation: ['Kill idle or long-running sessions.', 'Reduce application concurrency or scale out read traffic to replicas.', 'Roll back a change that increased connection usage.'],
    prevention: ['Put a connection pooler (for example PgBouncer) in front of the database.', 'Alert at 80% pool utilisation.', 'Set statement timeouts.'],
  },
  {
    id: 'db-slow-query',
    category: 'database',
    title: 'Slow query or missing index',
    symptoms: 'A single query dominates database time. Sequential scan on a large table. Latency rose gradually as the table grew. Query plan changed.',
    rootCause: 'A query without a suitable index, or a changed query plan, made the database do far more work per request.',
    mitigation: ['Add the missing index (concurrently) or roll back the query change.', 'Temporarily disable the feature issuing the query.'],
    prevention: ['Review query plans for new queries in code review.', 'Track slow-query counts per release.'],
  },
  {
    id: 'db-locks',
    category: 'database',
    title: 'Lock contention or deadlock',
    symptoms: 'Deadlock detected. Queries waiting on locks. A migration or long transaction blocked writes. Lock wait timeout exceeded.',
    rootCause: 'A long-running transaction or schema change held locks that blocked normal traffic.',
    mitigation: ['Identify and terminate the blocking transaction.', 'Postpone the migration to a low-traffic window.'],
    prevention: ['Set lock_timeout for migrations.', 'Keep transactions short and avoid table-rewriting migrations on hot tables.'],
  },
  {
    id: 'db-replication-lag',
    category: 'database',
    title: 'Replication lag or failover problem',
    symptoms: 'Replica lag growing. Users see stale data after saving. Primary failover did not complete. Split brain between database nodes.',
    rootCause: 'Replicas fell behind the primary, or an automatic failover did not promote a healthy replica cleanly.',
    mitigation: ['Route reads that need fresh data to the primary.', 'Fence the old primary before promoting a replica.'],
    prevention: ['Alert on replication lag.', 'Practise failover regularly in a staging environment.'],
  },
  {
    id: 'db-storage-full',
    category: 'database',
    title: 'Database storage or transaction ID exhaustion',
    symptoms: 'Database refuses writes. Database volume out of space. Transaction wraparound warning. Table bloat, autovacuum behind, WAL growing.',
    rootCause: 'The database ran out of disk space or internal counters because growth and maintenance were not monitored.',
    mitigation: ['Add storage or free space (remove old WAL, logs, bloat).', 'Run the required maintenance (vacuum) with priority.'],
    prevention: ['Forecast storage growth and alert on time-to-full.', 'Monitor autovacuum progress and transaction ID age.'],
  },
  // ---- capacity
  {
    id: 'capacity-traffic-spike',
    category: 'capacity',
    title: 'Traffic spike beyond capacity',
    symptoms: 'Sudden surge in traffic from a launch, marketing campaign or viral event. CPU saturated, latency p99 climbing, requests queueing, autoscaling could not keep up.',
    rootCause: 'Incoming load exceeded provisioned capacity faster than autoscaling could react.',
    mitigation: ['Scale out manually and raise autoscaling limits.', 'Shed non-critical load or enable a waiting room.'],
    prevention: ['Load-test to at least 2x expected peak.', 'Pre-scale before planned launches and campaigns.'],
  },
  {
    id: 'capacity-retry-storm',
    category: 'capacity',
    title: 'Retry storm / cascading failure',
    symptoms: 'One slow dependency caused clients to retry aggressively, multiplying load until everything failed. Thundering herd after recovery. Cascading failure across services.',
    rootCause: 'Retries without backoff, jitter or budgets amplified a small failure into a system-wide overload.',
    mitigation: ['Temporarily disable retries or add rate limits at the edge.', 'Bring services back gradually rather than all at once.'],
    prevention: ['Use exponential backoff with jitter and retry budgets.', 'Add circuit breakers between services.'],
  },
  {
    id: 'capacity-autoscaling-limit',
    category: 'capacity',
    title: 'Autoscaling or quota limit reached',
    symptoms: 'New instances would not start even though hardware was available. Autoscaling group hit its maximum. Cloud quota exceeded when scaling out.',
    rootCause: 'A configured maximum or cloud quota prevented the system from adding capacity when it was needed.',
    mitigation: ['Raise the limit or quota and scale out.', 'Move load to another region or pool.'],
    prevention: ['Review autoscaling maximums and cloud quotas quarterly and before launches.'],
  },
  // ---- memory
  {
    id: 'memory-leak',
    category: 'memory',
    title: 'Memory leak leading to OOM kills',
    symptoms: 'Memory grows steadily until the process is OOMKilled. Exit code 137. JavaScript heap out of memory. Pods restart every few hours.',
    rootCause: 'The application retains memory it no longer needs (unbounded cache, listener leak, growing collection).',
    mitigation: ['Restart affected processes on a schedule as a stop-gap.', 'Roll back the release that introduced the leak.'],
    prevention: ['Bound in-memory caches.', 'Take heap snapshots in staging and alert on memory growth trends.'],
  },
  {
    id: 'memory-gc-pauses',
    category: 'memory',
    title: 'Long garbage-collection pauses',
    symptoms: 'Latency spikes every few minutes. Long GC pauses in the JVM or runtime. Heap almost full, stop-the-world collections.',
    rootCause: 'The heap is too small for the working set or allocation rate, causing frequent long collections.',
    mitigation: ['Increase heap size or scale out.', 'Reduce allocation in the hot path.'],
    prevention: ['Track GC pause time as a service-level indicator.'],
  },
  // ---- disk
  {
    id: 'disk-full-logs',
    category: 'disk',
    title: 'Disk filled up by logs or temp files',
    symptoms: 'No space left on device. ENOSPC. Writes failing. Log files grew without rotation. Temp directory full.',
    rootCause: 'Log output or temporary files grew without rotation or cleanup until the volume was full.',
    mitigation: ['Delete or compress old logs and temp files.', 'Expand the volume.'],
    prevention: ['Enforce log rotation and retention.', 'Alert on disk usage at 80% and on time-to-full.'],
  },
  // ---- network
  {
    id: 'network-lb-misconfig',
    category: 'network',
    title: 'Load balancer or ingress failure',
    symptoms: '502 bad gateway and 503 service unavailable from the load balancer. Health checks failing. Backends marked unhealthy. Ingress controller errors.',
    rootCause: 'The load balancer could not reach healthy backends because of failed health checks, a bad listener rule, or exhausted backend capacity.',
    mitigation: ['Fix or relax the failing health check.', 'Restore the previous load balancer configuration.', 'Add backend capacity.'],
    prevention: ['Test load balancer config changes in staging.', 'Alert on unhealthy backend count.'],
  },
  {
    id: 'network-partition',
    category: 'network',
    title: 'Network partition or packet loss',
    symptoms: 'Connection timeouts and connection reset between services. Packet loss between availability zones or datacenters. BGP route change. Cross-region link down.',
    rootCause: 'Network connectivity between components degraded or was lost.',
    mitigation: ['Fail traffic over to a healthy zone or region.', 'Escalate to the network or cloud provider.'],
    prevention: ['Design for zone failure and test failover.', 'Monitor inter-zone latency and loss.'],
  },
  {
    id: 'network-firewall',
    category: 'network',
    title: 'Firewall or security group change blocked traffic',
    symptoms: 'Connection refused or timeouts right after a firewall, security group or WAF rule change. Legitimate traffic blocked.',
    rootCause: 'A network access rule change blocked legitimate traffic.',
    mitigation: ['Revert the rule change.'],
    prevention: ['Manage firewall and WAF rules as code with review and drift detection.'],
  },
  // ---- dns
  {
    id: 'dns-record-change',
    category: 'dns',
    title: 'DNS record change or resolution failure',
    symptoms: 'Could not resolve host. NXDOMAIN or SERVFAIL. ENOTFOUND. Customers cannot reach the domain after a DNS change. Internal service discovery failing.',
    rootCause: 'A DNS record was changed, deleted or became unresolvable, or the resolver itself failed.',
    mitigation: ['Restore the previous DNS record.', 'Lower TTLs before planned changes; flush resolver caches where possible.'],
    prevention: ['Manage DNS as code with review.', 'Monitor resolution from outside the network.'],
  },
  {
    id: 'dns-domain-expiry',
    category: 'dns',
    title: 'Domain registration expired',
    symptoms: 'Entire domain stopped resolving. Registrar parked page shown. Domain expired.',
    rootCause: 'The domain registration lapsed because renewal failed or was not tracked.',
    mitigation: ['Renew the domain immediately with the registrar.'],
    prevention: ['Enable auto-renew and alert on domain expiry dates.'],
  },
  // ---- certificate
  {
    id: 'cert-expired',
    category: 'certificate',
    title: 'Expired TLS certificate',
    symptoms: 'Certificate has expired. x509 certificate errors. TLS handshake failures. Browsers show security warnings. Clients refuse to connect.',
    rootCause: 'A TLS certificate expired because renewal was manual or the automation silently failed.',
    mitigation: ['Issue and deploy a new certificate.', 'Restart services that cache certificates.'],
    prevention: ['Automate renewal and alert well before expiry.', 'Inventory every certificate including internal ones.'],
  },
  // ---- dependency
  {
    id: 'dependency-vendor-outage',
    category: 'dependency',
    title: 'Third-party provider outage',
    symptoms: 'Errors from an external API or vendor. Upstream provider status page reports an incident. Timeouts calling the payment, email or SMS provider.',
    rootCause: 'An external dependency was degraded or unavailable.',
    mitigation: ['Fail over to a secondary provider if available.', 'Degrade gracefully: queue work for later and show a friendly message.'],
    prevention: ['Add timeouts, circuit breakers and fallbacks around every external call.', 'Keep a secondary provider for critical dependencies.'],
  },
  {
    id: 'dependency-cloud-region',
    category: 'dependency',
    title: 'Cloud provider regional issue',
    symptoms: 'Multiple managed services failing in one cloud region. AWS, GCP or Azure region degraded. Cannot launch instances.',
    rootCause: 'The cloud provider experienced a regional service disruption.',
    mitigation: ['Fail over to another region if the architecture supports it.', 'Communicate proactively while waiting for the provider.'],
    prevention: ['Plan and rehearse multi-region failover for critical paths.'],
  },
  // ---- cache
  {
    id: 'cache-stampede',
    category: 'cache',
    title: 'Cache failure or stampede',
    symptoms: 'Redis or memcached down or flushed. Cache hit rate dropped to zero and the database was overwhelmed. Cold cache after restart.',
    rootCause: 'The cache stopped absorbing load, sending every request to the slower backing store.',
    mitigation: ['Restore the cache and warm it gradually.', 'Rate-limit expensive requests until hit rate recovers.'],
    prevention: ['Use request coalescing and staggered TTLs.', 'Make sure the database can survive a cold cache.'],
  },
  // ---- queue
  {
    id: 'queue-backlog',
    category: 'queue',
    title: 'Queue backlog / stuck consumers',
    symptoms: 'Messages piling up. Consumer lag growing. Background jobs, emails or notifications delayed. Workers stuck or crashed. Dead letter queue filling.',
    rootCause: 'Consumers stopped processing or processed slower than producers enqueued work.',
    mitigation: ['Restart or scale consumers.', 'Move poison messages to a dead-letter queue.'],
    prevention: ['Alert on oldest-message age.', 'Make consumers idempotent so they can be scaled and retried safely.'],
  },
  {
    id: 'queue-cron-failed',
    category: 'queue',
    title: 'Scheduled job failed or ran twice',
    symptoms: 'Nightly batch or cron job did not run. Report missing. Job ran twice and sent duplicate emails.',
    rootCause: 'A scheduled job failed silently or had no protection against concurrent runs.',
    mitigation: ['Re-run the job once, manually, after confirming it is idempotent.'],
    prevention: ['Add dead-man-switch monitoring for scheduled jobs.', 'Use locks so a job cannot run twice concurrently.'],
  },
  // ---- auth
  {
    id: 'auth-login-failures',
    category: 'auth',
    title: 'Users unable to log in',
    symptoms: 'Cannot log in. Login failing with 401 or 403. Session tokens rejected. Everyone logged out. Password reset not working.',
    rootCause: 'The authentication service, session store or token signing configuration failed or changed.',
    mitigation: ['Roll back recent auth changes.', 'Restore the session store or signing key.'],
    prevention: ['Run synthetic login checks.', 'Treat auth configuration changes as high-risk deploys.'],
  },
  {
    id: 'auth-idp-outage',
    category: 'auth',
    title: 'SSO / identity provider outage',
    symptoms: 'SSO, SAML or OAuth logins failing. Identity provider unreachable. Callback errors.',
    rootCause: 'The external identity provider was unavailable or its configuration (metadata, certificates) changed.',
    mitigation: ['Offer a fallback login method for administrators.', 'Update IdP metadata or certificates.'],
    prevention: ['Monitor the IdP separately and track its signing certificate expiry.'],
  },
  // ---- security
  {
    id: 'security-ddos',
    category: 'security',
    title: 'DDoS or abusive traffic',
    symptoms: 'Massive traffic from many IPs. Bot traffic. Layer 7 attack. Requests from unusual countries. Origin overloaded.',
    rootCause: 'A malicious or abusive traffic source overwhelmed the service.',
    mitigation: ['Enable DDoS protection and rate limiting at the edge.', 'Block offending networks.'],
    prevention: ['Keep edge rate limits and bot protection always on for public endpoints.'],
  },
  {
    id: 'security-leaked-credential',
    category: 'security',
    title: 'Leaked credential or unauthorized access',
    symptoms: 'Secret committed to a repository. Unauthorized access detected. Suspicious API usage with a valid key. Credentials exposed in logs.',
    rootCause: 'A credential was exposed and could be used by an unauthorized party.',
    mitigation: ['Revoke and rotate the credential immediately.', 'Review access logs for misuse.', 'Involve the security team and follow the breach process.'],
    prevention: ['Enable secret scanning on repositories.', 'Use short-lived credentials.'],
  },
  // ---- time
  {
    id: 'time-clock-skew',
    category: 'time',
    title: 'Clock skew or date boundary bug',
    symptoms: 'Tokens rejected as expired or not yet valid. Clock skew between hosts. Bug at midnight, month end, daylight saving time change or leap second.',
    rootCause: 'Hosts disagreed about the current time, or code mishandled a date boundary.',
    mitigation: ['Resync NTP on affected hosts.', 'Roll back or patch the date-handling code.'],
    prevention: ['Monitor clock drift.', 'Test date boundaries (DST, leap years, month end) explicitly.'],
  },
  // ---- hardware
  {
    id: 'hardware-power-datacenter',
    category: 'hardware',
    title: 'Power or datacenter failure',
    symptoms: 'An availability zone or datacenter lost power or cooling. Multiple hosts went offline at once. Hardware failure on a critical server.',
    rootCause: 'A physical failure took down a failure domain that the service depended on.',
    mitigation: ['Fail over to another zone or datacenter.', 'Rebuild capacity on healthy hardware.'],
    prevention: ['Run active capacity in at least two failure domains and rehearse losing one.'],
  },
  // ---- data
  {
    id: 'data-accidental-deletion',
    category: 'data',
    title: 'Accidental deletion or destructive command',
    symptoms: 'Data deleted by mistake. Wrong database targeted by a script. Table dropped. Customers report missing records.',
    rootCause: 'A destructive operation ran against production data without adequate safeguards.',
    mitigation: ['Stop writes that could overwrite recoverable data.', 'Restore from backup or point-in-time recovery.'],
    prevention: ['Require confirmation and least-privilege access for destructive operations.', 'Test backup restores regularly.'],
  },
  {
    id: 'data-bad-migration',
    category: 'data',
    title: 'Data corruption from a migration or batch job',
    symptoms: 'Incorrect values written. Duplicate records. Data inconsistent after a migration or backfill. Integrity check failures.',
    rootCause: 'A migration or batch job wrote incorrect data.',
    mitigation: ['Stop the job.', 'Identify affected rows and repair them from backups or audit logs.'],
    prevention: ['Dry-run data migrations and verify with row counts and checksums.'],
  },
  // ---- kubernetes
  {
    id: 'k8s-crashloop',
    category: 'kubernetes',
    title: 'Pods in CrashLoopBackOff',
    symptoms: 'Pods crashlooping. CrashLoopBackOff. Liveness probe failing and killing containers. Readiness probe failing, no endpoints available.',
    rootCause: 'Containers exit on startup (bad config, missing secret, failing dependency) or probes are too aggressive.',
    mitigation: ['Roll back the deployment.', 'Relax probe thresholds if they are killing healthy but slow pods.'],
    prevention: ['Separate liveness from readiness and give slow starters a startup probe.'],
  },
  {
    id: 'k8s-node-pressure',
    category: 'kubernetes',
    title: 'Node pressure, evictions or scheduling failure',
    symptoms: 'Pods evicted. Pods pending, insufficient CPU or memory. Node not ready. Cluster autoscaler not adding nodes. Image pull errors.',
    rootCause: 'The cluster ran out of schedulable resources or nodes became unhealthy.',
    mitigation: ['Add nodes or free resources.', 'Cordon and drain unhealthy nodes.'],
    prevention: ['Set requests and limits on every workload.', 'Alert on pending pods and node conditions.'],
  },
  {
    id: 'k8s-dns-ndots',
    category: 'kubernetes',
    title: 'Cluster DNS overload',
    symptoms: 'Intermittent DNS timeouts inside the cluster. CoreDNS overloaded. ndots causing extra lookups. conntrack table full.',
    rootCause: 'In-cluster DNS could not keep up with lookup volume.',
    mitigation: ['Scale CoreDNS.', 'Use fully qualified names for external hosts.'],
    prevention: ['Run node-local DNS caching and monitor DNS latency.'],
  },
  // ---- rate limit
  {
    id: 'ratelimit-upstream-429',
    category: 'rate-limit',
    title: 'Hitting an upstream rate limit',
    symptoms: '429 too many requests from an upstream API. Quota exceeded. Requests throttled. Batch job consumed the whole API quota.',
    rootCause: 'Request volume exceeded a rate limit or quota enforced by a provider or internal gateway.',
    mitigation: ['Throttle or pause the heaviest caller.', 'Request a temporary quota increase.'],
    prevention: ['Client-side rate limiting and backoff.', 'Separate quotas for batch and interactive traffic.'],
  },
  // ---- frontend
  {
    id: 'frontend-asset-cdn',
    category: 'frontend',
    title: 'Broken frontend bundle or CDN assets',
    symptoms: 'Blank white page. JavaScript error on load. Static assets 404 from the CDN. Mobile app crash on startup after release.',
    rootCause: 'A frontend release referenced assets that were missing, cached incorrectly, or contained a runtime error.',
    mitigation: ['Roll back the frontend release and purge the CDN cache.'],
    prevention: ['Keep previous asset versions available after deploys.', 'Monitor client-side errors per release.'],
  },
  // ---- concurrency
  {
    id: 'concurrency-race',
    category: 'concurrency',
    title: 'Race condition / duplicate processing',
    symptoms: 'Duplicate charges or duplicate orders. Two workers processed the same job. Race condition under load. Conflicting writes.',
    rootCause: 'Concurrent operations were not coordinated, so the same work ran twice or writes overwrote each other.',
    mitigation: ['Stop the duplicate processor and reconcile affected records.'],
    prevention: ['Use idempotency keys and database constraints.', 'Use row-level locks or optimistic concurrency for shared records.'],
  },
  // ---- payments
  {
    id: 'payments-checkout-failure',
    category: 'payments',
    title: 'Checkout or payment failures',
    symptoms: 'Checkout returning errors. Payments failing or declined at a higher rate. Payment gateway timeouts. Orders not completing.',
    rootCause: 'The checkout path or payment provider integration failed.',
    mitigation: ['Fail over to a backup payment provider if available.', 'Roll back recent checkout changes.'],
    prevention: ['Synthetic purchase checks.', 'Alert on payment success rate per provider.'],
  },
  {
    id: 'payments-webhook-backlog',
    category: 'payments',
    title: 'Payment webhooks delayed or failing',
    symptoms: 'Payment provider webhooks failing signature verification or timing out. Orders paid but not marked as paid. Subscription status out of sync.',
    rootCause: 'Webhook processing failed, so payment state in the application drifted from the provider.',
    mitigation: ['Fix the handler and replay failed webhooks from the provider dashboard.'],
    prevention: ['Process webhooks asynchronously and idempotently; reconcile against the provider daily.'],
  },
];

/**
 * Labelled examples for the severity classifier. Written to match the severity guide in
 * prompts.ts: CRITICAL = full outage or data loss for many customers; HIGH = major feature broken
 * or severe degradation; MEDIUM = partial degradation with a workaround; LOW = minor or cosmetic.
 */
export const SEVERITY_EXAMPLES: { severity: IncidentSeverity; text: string }[] = [
  { severity: 'CRITICAL', text: 'Complete outage, the site is down for all customers' },
  { severity: 'CRITICAL', text: 'All API requests returning 503, total service unavailable' },
  { severity: 'CRITICAL', text: 'Data loss: customer records deleted from production database' },
  { severity: 'CRITICAL', text: 'Security breach, customer data exposed publicly' },
  { severity: 'CRITICAL', text: 'Nobody can log in, authentication down for every user' },
  { severity: 'CRITICAL', text: 'Payments completely failing, no orders can be placed' },
  { severity: 'CRITICAL', text: 'Primary database down and failover did not work, application offline' },
  { severity: 'CRITICAL', text: 'Entire region unavailable, 100% of traffic failing' },
  { severity: 'CRITICAL', text: 'DNS for our main domain stopped resolving, customers cannot reach us at all' },
  { severity: 'CRITICAL', text: 'Credentials leaked and attacker has access to production' },
  { severity: 'CRITICAL', text: 'Major outage across every service after a bad global config push' },
  { severity: 'CRITICAL', text: 'Corrupted data being written for all tenants' },
  { severity: 'HIGH', text: 'Checkout error rate at 20 percent, many customers cannot pay' },
  { severity: 'HIGH', text: 'Elevated 5xx errors on the main API after the deploy' },
  { severity: 'HIGH', text: 'Severe latency, p99 above ten seconds for the dashboard' },
  { severity: 'HIGH', text: 'Login failing for a large share of users in Europe' },
  { severity: 'HIGH', text: 'Database connection pool exhausted, requests timing out' },
  { severity: 'HIGH', text: 'Notifications and emails not being sent for an hour' },
  { severity: 'HIGH', text: 'Mobile app crashing on launch for Android users' },
  { severity: 'HIGH', text: 'Search is broken and returns errors for everyone' },
  { severity: 'HIGH', text: 'Webhooks from payment provider failing, orders stuck in pending' },
  { severity: 'HIGH', text: 'Pods crashlooping, service degraded with frequent errors' },
  { severity: 'HIGH', text: 'Queue backlog growing fast, jobs delayed by hours' },
  { severity: 'HIGH', text: 'TLS certificate expired on the API endpoint, clients failing' },
  { severity: 'MEDIUM', text: 'Intermittent timeouts for some requests, retry works' },
  { severity: 'MEDIUM', text: 'Reports export is slow but eventually completes' },
  { severity: 'MEDIUM', text: 'One replica lagging, occasional stale reads' },
  { severity: 'MEDIUM', text: 'A small number of customers see errors on the settings page' },
  { severity: 'MEDIUM', text: 'Partial degradation of image uploads, workaround available' },
  { severity: 'MEDIUM', text: 'Background sync delayed by fifteen minutes' },
  { severity: 'MEDIUM', text: 'Elevated latency in one availability zone, traffic shifted' },
  { severity: 'MEDIUM', text: 'Some webhook deliveries retried more than usual' },
  { severity: 'MEDIUM', text: 'Analytics dashboard data delayed, core product unaffected' },
  { severity: 'MEDIUM', text: 'Cache hit rate dropped, responses slower than normal' },
  { severity: 'MEDIUM', text: 'Scheduled nightly job failed and needs a manual rerun' },
  { severity: 'MEDIUM', text: 'Degraded performance for a subset of API endpoints' },
  { severity: 'LOW', text: 'Typo on the pricing page' },
  { severity: 'LOW', text: 'Cosmetic layout issue in the footer on mobile' },
  { severity: 'LOW', text: 'Documentation link broken' },
  { severity: 'LOW', text: 'Minor visual glitch in dark mode' },
  { severity: 'LOW', text: 'Internal admin tool slow, no customer impact' },
  { severity: 'LOW', text: 'Staging environment unavailable, production fine' },
  { severity: 'LOW', text: 'A single customer reports a wrong timezone label' },
  { severity: 'LOW', text: 'Log noise from a deprecated warning, no impact' },
  { severity: 'LOW', text: 'Minor delay in a non-critical internal report' },
  { severity: 'LOW', text: 'Tooltip text truncated in the settings page' },
  { severity: 'LOW', text: 'Test alert fired by mistake, nothing broken' },
  { severity: 'LOW', text: 'Low disk warning on a non-production host' },
];
