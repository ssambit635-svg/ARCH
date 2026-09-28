import type { CategoryId } from '../arch-model/knowledge';

/**
 * ARCH Code Assist — built-in analyzer (no model, no network).
 *
 * Two jobs, both deterministic and fast enough to run on every request:
 *
 *   analyzeStackTrace()  recognizes ~30 common production error signatures (connection refused,
 *                        OOM, pool exhaustion, expired certificate, null dereference …), explains
 *                        them in plain language and finds the first frame in YOUR code;
 *   analyzeCode()        reviews a snippet for reliability and security problems that commonly
 *                        cause incidents (no timeout on outbound calls, swallowed errors, SQL built
 *                        from strings, hard-coded secrets, unbounded retries …) and applies the
 *                        fixes that are safe to apply mechanically.
 *
 * These findings ARE the answer — they ground the native review engine too. Nothing leaves the
 * server: ARCH has no local-LLM or vendor adapter in this path (or anywhere else).
 */

export type CodeLanguage = 'typescript' | 'javascript' | 'python' | 'go' | 'java' | 'sql' | 'ruby' | 'php' | 'csharp' | 'shell' | 'yaml' | 'unknown';

export const CODE_LANGUAGES: CodeLanguage[] = ['typescript', 'javascript', 'python', 'go', 'java', 'sql', 'ruby', 'php', 'csharp', 'shell', 'yaml', 'unknown'];

export type FindingSeverity = 'error' | 'warning' | 'info';

export type CodeFinding = {
  rule: string;
  severity: FindingSeverity;
  line: number;
  message: string;
  suggestion: string;
  /** Incident family this problem usually leads to (links code review to the incident model). */
  category?: CategoryId;
};

export type StackFrame = { file: string; line: number; fn?: string };

export type ErrorDiagnosis = {
  id: string;
  title: string;
  explanation: string;
  fixes: string[];
  category: CategoryId;
  /** The matching line from the trace. */
  evidence: string;
};

export type CodeMetrics = { lines: number; codeLines: number; functions: number; maxNesting: number; longestFunction: number };

export type CodeAnalysis = {
  language: CodeLanguage;
  kind: 'code' | 'stack_trace' | 'mixed';
  findings: CodeFinding[];
  diagnoses: ErrorDiagnosis[];
  topFrame: StackFrame | null;
  /** Input with safe, mechanical fixes applied. Identical to the input when nothing applied. */
  improvedCode: string;
  appliedFixes: string[];
  metrics: CodeMetrics;
  summary: string;
};

export const MAX_CODE_CHARS = 20_000;

// ---------------------------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------------------------

const LANGUAGE_HINTS: [CodeLanguage, RegExp][] = [
  ['python', /^\s*(def |class \w+(\(.*\))?:|import \w+$|from [\w.]+ import |if __name__ ==|elif |except\b.*:|print\()/m],
  ['go', /^\s*(package \w+|func (\(\w+ \*?\w+\) )?\w+\(|import \(|:= |if err != nil)/m],
  ['java', /^\s*(public |private |protected )?(static )?(final )?(class|interface|enum) \w+|System\.out\.|@Override|import java\./m],
  ['csharp', /^\s*using System|namespace \w+|public (async )?Task|Console\.WriteLine/m],
  ['php', /<\?php|\$\w+\s*=|->\w+\(|echo\s/m],
  ['ruby', /^\s*(def \w+|end$|require ['"]|puts |\.each do \|)/m],
  ['sql', /^\s*(SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE (TABLE|INDEX)|ALTER TABLE|WITH \w+ AS)\b/im],
  ['typescript', /:\s*(string|number|boolean|unknown|any|void)\b|interface \w+ \{|type \w+ = |as const|<\w+>\(|import type /m],
  ['javascript', /\b(const|let|var) \w+\s*=|function \w*\(|=>|require\(|module\.exports|console\.log|async |await /m],
  ['shell', /^#!\/(usr\/)?bin\/(ba|z)?sh|^\s*(echo|export|sudo|apt-get|curl|chmod) /m],
  ['yaml', /^\s*[\w-]+:\s*(\S.*)?$\n^\s*[\w-]+:/m],
];

export function detectLanguage(code: string): CodeLanguage {
  for (const [language, pattern] of LANGUAGE_HINTS) if (pattern.test(code)) return language;
  return 'unknown';
}

const BRACE_LANGUAGES = new Set<CodeLanguage>(['typescript', 'javascript', 'go', 'java', 'csharp', 'php']);

// ---------------------------------------------------------------------------------------------
// Stack traces and error logs
// ---------------------------------------------------------------------------------------------

type Signature = { id: string; pattern: RegExp; title: string; explanation: string; fixes: string[]; category: CategoryId };

const SIGNATURES: Signature[] = [
  {
    id: 'null-deref-js',
    pattern: /TypeError: Cannot read propert(y|ies) of (undefined|null)|TypeError: (\w+) is (undefined|null)|undefined is not an object/i,
    title: 'Property read on undefined / null',
    explanation: 'Code accessed a field on a value that was undefined or null — usually missing data from an API/DB response or an unhandled empty state.',
    fixes: ['Guard the access with optional chaining (`obj?.field`) or an explicit check.', 'Validate the upstream response (e.g. with a schema) before using it.', 'Find why the value is missing: check the top frame below.'],
    category: 'deploy',
  },
  {
    id: 'not-a-function',
    pattern: /TypeError: [\w.$[\]'"]+ is not a function/i,
    title: 'Called something that is not a function',
    explanation: 'A value expected to be a function was something else — often a wrong import, a renamed method or a dependency version mismatch.',
    fixes: ['Check the import/export names at the top frame.', 'Compare installed dependency versions with the lockfile.'],
    category: 'deploy',
  },
  { id: 'npe-java', pattern: /java\.lang\.NullPointerException|NullReferenceException/, title: 'Null pointer dereference', explanation: 'A null reference was used as if it pointed to an object.', fixes: ['Add a null check or use Optional at the top frame.', 'Trace where the value should have been initialized.'], category: 'deploy' },
  { id: 'python-keyerror', pattern: /\bKeyError: /, title: 'Missing dictionary key', explanation: 'Code read a key that does not exist in a dict — often an unexpected payload shape.', fixes: ['Use `.get(key, default)` or validate the payload first.'], category: 'deploy' },
  { id: 'python-attr-none', pattern: /AttributeError: 'NoneType' object has no attribute/, title: 'Attribute access on None', explanation: 'A function returned None where an object was expected.', fixes: ['Check the return value before using it.', 'Handle the "not found" case explicitly.'], category: 'deploy' },
  { id: 'index-error', pattern: /IndexError: (list|tuple) index out of range|ArrayIndexOutOfBoundsException|index out of range/, title: 'Index out of range', explanation: 'Code read past the end of a list — typically an empty result that was assumed to have items.', fixes: ['Check length before indexing.', 'Handle empty results explicitly.'], category: 'deploy' },
  {
    id: 'econnrefused',
    pattern: /ECONNREFUSED|Connection refused|connect: connection refused/i,
    title: 'Connection refused',
    explanation: 'Nothing was listening at the target host/port — the dependency is down, restarting, or the address/port is wrong.',
    fixes: ['Check the dependency is running and healthy.', 'Verify host/port configuration for this environment.', 'Add retries with exponential backoff for startup races.'],
    category: 'dependency',
  },
  {
    id: 'etimedout',
    pattern: /ETIMEDOUT|ESOCKETTIMEDOUT|timed? ?out after|context deadline exceeded|Read timed out|TimeoutError|504 Gateway Time-?out/i,
    title: 'Timeout calling a dependency',
    explanation: 'A call did not complete within its deadline — the dependency is slow or overloaded, or the network path is degraded.',
    fixes: ['Set an explicit, short timeout on the call and fail fast.', 'Add a circuit breaker so a slow dependency cannot exhaust your workers.', 'Check the dependency latency dashboard.'],
    category: 'dependency',
  },
  { id: 'econnreset', pattern: /ECONNRESET|socket hang up|Connection reset by peer|broken pipe/i, title: 'Connection reset', explanation: 'The remote side closed the connection mid-request — often a load balancer idle timeout, a crash, or a keep-alive mismatch.', fixes: ['Align client keep-alive with the server/load-balancer idle timeout.', 'Retry idempotent requests once.'], category: 'network' },
  { id: 'enotfound', pattern: /ENOTFOUND|EAI_AGAIN|getaddrinfo|Name or service not known|no such host|UnknownHostException/i, title: 'DNS lookup failed', explanation: 'The hostname could not be resolved.', fixes: ['Check the hostname and DNS records.', 'Check the resolver / service discovery in this environment.'], category: 'dns' },
  { id: 'cert', pattern: /certificate has expired|CERT_HAS_EXPIRED|x509: certificate|SSLCertVerificationError|unable to verify the first certificate|self[- ]signed certificate|PKIX path building failed/i, title: 'TLS certificate problem', explanation: 'The TLS certificate is expired, untrusted, or does not match the hostname.', fixes: ['Renew or fix the certificate chain.', 'Never disable verification in production; add the correct CA instead.'], category: 'certificate' },
  { id: 'js-oom', pattern: /JavaScript heap out of memory|FATAL ERROR: .*Allocation failed/i, title: 'Node.js heap exhausted', explanation: 'The process ran out of V8 heap — a memory leak or a very large in-memory operation.', fixes: ['Stream large payloads instead of buffering.', 'Take a heap snapshot to find retained objects.', 'Raise --max-old-space-size only as a stop-gap.'], category: 'memory' },
  { id: 'oom', pattern: /OutOfMemoryError|MemoryError|OOMKilled|exit code 137|Killed process .* out of memory|Cannot allocate memory/i, title: 'Out of memory', explanation: 'The process exceeded its memory limit and was killed.', fixes: ['Check for unbounded caches/collections.', 'Right-size the memory limit based on observed peak usage.'], category: 'memory' },
  { id: 'stack-overflow', pattern: /Maximum call stack size exceeded|StackOverflowError|RecursionError: maximum recursion depth/i, title: 'Infinite or too-deep recursion', explanation: 'A function called itself (directly or indirectly) without terminating.', fixes: ['Check the recursion base case at the top frame.', 'Convert deep recursion to iteration.'], category: 'deploy' },
  {
    id: 'db-too-many-connections',
    pattern: /too many connections|remaining connection slots are reserved|connection pool (exhausted|timeout)|Timed out fetching a new connection|Cannot acquire connection|sorry, too many clients already/i,
    title: 'Database connection pool exhausted',
    explanation: 'All database connections are in use — a traffic spike, a connection leak, or slow queries holding connections.',
    fixes: ['Make sure every connection/transaction is released (use try/finally or a pool helper).', 'Put a pooler such as PgBouncer in front of the database.', 'Add statement timeouts so slow queries cannot hold connections forever.'],
    category: 'database',
  },
  { id: 'deadlock', pattern: /deadlock detected|Deadlock found when trying to get lock|Lock wait timeout exceeded/i, title: 'Database deadlock / lock timeout', explanation: 'Two transactions waited on each other, or one waited too long for a lock.', fixes: ['Access rows in a consistent order in every transaction.', 'Keep transactions short; move slow work outside them.'], category: 'database' },
  { id: 'unique-violation', pattern: /duplicate key value violates unique constraint|Duplicate entry .* for key|UniqueViolation|P2002/i, title: 'Unique constraint violation', explanation: 'An insert collided with an existing row — often a retry or race creating the same record twice.', fixes: ['Use an upsert or idempotency key.', 'Handle the conflict explicitly instead of failing the request.'], category: 'concurrency' },
  { id: 'relation-missing', pattern: /relation "[\w.]+" does not exist|column "[\w.]+" does not exist|no such table|Unknown column/i, title: 'Schema mismatch', explanation: 'The code expects a table/column that does not exist — a missing or out-of-order migration.', fixes: ['Run pending migrations before deploying the code that needs them.', 'Use expand/contract migrations.'], category: 'deploy' },
  { id: 'enospc', pattern: /ENOSPC|No space left on device|disk quota exceeded/i, title: 'Disk full', explanation: 'The volume has no free space (or inodes).', fixes: ['Free space and enable log rotation.', 'Alert on disk usage before it reaches 100%.'], category: 'disk' },
  { id: 'eacces', pattern: /EACCES|Permission denied|AccessDenied|403 Forbidden|UnauthorizedOperation/i, title: 'Permission denied', explanation: 'The process lacks permission for a file, port or cloud API.', fixes: ['Check IAM role / file ownership for this environment.', 'Grant the minimum permission required.'], category: 'config' },
  { id: 'rate-limit', pattern: /\b429\b|Too Many Requests|rate limit(ed)? exceeded|ThrottlingException|quota exceeded/i, title: 'Rate limited', explanation: 'A provider or gateway rejected requests for exceeding a rate limit or quota.', fixes: ['Add client-side rate limiting with exponential backoff + jitter.', 'Spread batch work over time or request a quota increase.'], category: 'rate-limit' },
  { id: 'http-5xx', pattern: /\b(502 Bad Gateway|503 Service Unavailable|500 Internal Server Error)\b/i, title: 'Upstream returned 5xx', explanation: 'A dependency or the load balancer returned a server error.', fixes: ['Check the upstream service health and recent deploys.', 'Retry idempotent calls with backoff; fail gracefully otherwise.'], category: 'network' },
  { id: 'module-not-found', pattern: /Cannot find module|ModuleNotFoundError|ImportError: cannot import|ClassNotFoundException|NoClassDefFoundError/i, title: 'Missing module / dependency', explanation: 'A dependency was not installed or bundled in this build.', fixes: ['Check the lockfile and build output include the module.', 'Pin the dependency version.'], category: 'deploy' },
  { id: 'crashloop', pattern: /CrashLoopBackOff|Back-off restarting failed container|ImagePullBackOff|ErrImagePull/i, title: 'Container keeps crashing / image pull failing', explanation: 'Kubernetes cannot keep the container running or cannot pull its image.', fixes: ['Read the previous container logs (`kubectl logs --previous`).', 'Check image tag, registry credentials and required secrets/config.'], category: 'kubernetes' },
  { id: 'unhandled-rejection', pattern: /UnhandledPromiseRejection|unhandledRejection|Uncaught \(in promise\)/i, title: 'Unhandled promise rejection', explanation: 'An async error was never caught; in recent Node versions this crashes the process.', fixes: ['Await the promise inside try/catch, or attach .catch().', 'Add a process-level handler that logs and exits cleanly.'], category: 'deploy' },
  { id: 'json-parse', pattern: /Unexpected token .* in JSON|JSONDecodeError|SyntaxError: JSON\.parse|Unexpected end of JSON input/i, title: 'Invalid JSON', explanation: 'A response or file was not valid JSON — often an HTML error page from a proxy, or a truncated body.', fixes: ['Check the status code and content-type before parsing.', 'Wrap parsing in try/catch and log a sample of the body (redacted).'], category: 'dependency' },
  { id: 'auth-401', pattern: /\b401\b|Unauthorized|invalid[_ ]token|jwt expired|TokenExpiredError|invalid signature/i, title: 'Authentication failed', explanation: 'Credentials or tokens were missing, expired or signed with a different key.', fixes: ['Check token expiry and clock skew.', 'Check the secret/key matches across services after rotations.'], category: 'auth' },
  { id: 'segfault', pattern: /Segmentation fault|SIGSEGV|core dumped/i, title: 'Native crash (segfault)', explanation: 'Native code accessed invalid memory — often a native dependency or ABI mismatch.', fixes: ['Rebuild native modules for this platform/runtime version.', 'Check recent upgrades of native dependencies.'], category: 'deploy' },
  { id: 'go-panic-nil', pattern: /panic: runtime error: invalid memory address or nil pointer dereference/, title: 'Go nil pointer dereference', explanation: 'A nil pointer/map/interface was dereferenced.', fixes: ['Check for nil before use; return errors instead of nil values.'], category: 'deploy' },
  // --- Additional signatures: Redis, Kafka, Postgres, file descriptors, disk, SSL, circuit, CPU ---
  {
    id: 'redis-oom',
    pattern: /OOM command not allowed when used memory|READONLY You can't write against a read only replica|ERR maxmemory|Redis.*connection lost|NOAUTH Authentication required/i,
    title: 'Redis failure (OOM / replica / auth)',
    explanation: 'Redis is rejecting writes — either it hit maxmemory, you hit a replica, or auth is failing.',
    fixes: ['Check Redis used_memory vs maxmemory; evict or add capacity.', 'Verify the app is pointed at the master (not a replica) and the AUTH creds are valid.', 'Add short timeouts to Redis calls; do not let a cache outage take down the request path.'],
    category: 'cache',
  },
  {
    id: 'kafka-rebalance',
    pattern: /(Rebalance in progress|Group coordinator .* unavailable|UNKNOWN_TOPIC_OR_PART|kafka.*TimeoutException|Not leader for partition|NetworkException.*kafka)/i,
    title: 'Kafka consumer/producer problem',
    explanation: 'Consumers are rebalancing, the coordinator is unavailable, or a partition leader moved — common during rolling restarts or broker overload.',
    fixes: ['Check broker health and under-replicated partitions.', 'Ensure consumer session/heartbeat timeouts are consistent across instances.', 'Pause consumption during rebalance and retry after a short backoff.'],
    category: 'queue',
  },
  {
    id: 'pg-lock',
    pattern: /canceling statement due to (statement timeout|lock timeout|user request)|deadlock detected|could not obtain lock on row|remaining connection slots|too many connections for role/i,
    title: 'Postgres lock/query/connection problem',
    explanation: 'A query waited too long for a lock, hit statement_timeout, deadlocked, or the pool is exhausted.',
    fixes: ['Find blocking queries with pg_stat_activity and terminate if safe.', 'Add statement_timeout to slow paths; avoid long-running transactions.', 'Check connection pool sizing; use a pooler if many clients connect.'],
    category: 'database',
  },
  {
    id: 'fd-exhausted',
    pattern: /too many open files|EMFILE|Too many open files|accept\(\) failed|file descriptor/i,
    title: 'File descriptor exhaustion',
    explanation: 'The process ran out of file descriptors — connection leaks (DB, HTTP) or unbounded files/sockets.',
    fixes: ['Check ulimit -n and raise if needed (stopgap).', 'Find the leak: every new connection/socket must be closed.', 'Add metrics for open fds and alert before the limit is hit.'],
    category: 'capacity',
  },
  {
    id: 'thread-exhausted',
    pattern: /unable to create new native thread|OutOfMemoryError: unable to create|thread starvation|all threads are busy|TaskQueueManager.*rejecting/i,
    title: 'Thread pool exhaustion',
    explanation: 'All worker threads are blocked — usually a slow downstream holding threads or an unbounded queue.',
    fixes: ['Check thread dumps for blocked threads and the dependency they are waiting on.', 'Bound the thread pool queue length and drop/reject under load instead of piling up.', 'Add timeouts on every outbound call so threads are released.'],
    category: 'capacity',
  },
  {
    id: 'ssl-handshake',
    pattern: /SSL_(handshake_error_version|error_syscall|rx_record_too_long)|handshake failure|tls: (bad certificate|unknown certificate authority|oversized record)|SSL peer shut down incorrectly|SSLV3_ALERT_CERTIFICATE/i,
    title: 'TLS handshake failure',
    explanation: 'The TLS handshake failed — protocol/cipher mismatch, bad cert, or an intermediary speaking plain HTTP to an HTTPS port.',
    fixes: ['Verify cert, chain, and SNI on both sides.', 'Confirm both ends support a common TLS version and cipher.', 'Check for load balancers that terminate TLS vs pass-through.'],
    category: 'certificate',
  },
  {
    id: 'cpu-throttling',
    pattern: /(Throttled|CPUThrottling|CFS|throttled? for \d+m?s|CPU usage \d{3,}%|iowait)/i,
    title: 'CPU saturation / throttling',
    explanation: 'The process is out of CPU time — either traffic > capacity or a hot loop. Container CPU limits may be throttling it.',
    fixes: ['Profile the hottest path (pprof/inspector/perf).', 'Raise CPU limits or scale horizontally.', 'Check for runaway loops, regex catastrophes, or synchronous CPU-heavy work on the request path.'],
    category: 'capacity',
  },
  {
    id: 'disk-io',
    pattern: /I\/O error|Input\/output error|no space left on device|read-only file system|EROFS|disk I\/O error|Operation not permitted/i,
    title: 'Disk / filesystem failure',
    explanation: 'The filesystem returned an I/O error, became read-only, or is full.',
    fixes: ['Check disk free space, inodes, and dmesg for disk errors.', 'Fail over to a healthy node; do not keep writing to a broken disk.', 'Verify mounts in /etc/fstab and that volumes are attached in read-write mode.'],
    category: 'disk',
  },
  {
    id: 'rate-limited-upstream',
    pattern: /429 Too Many Requests|throttled|RequestLimitExceeded|SlowDown|reduce your request rate|provisioned throughput exceeded/i,
    title: 'Upstream rate limiting / throttling',
    explanation: 'A third-party API or cloud service is throttling you.',
    fixes: ['Add client-side rate limiting, exponential backoff, and jitter.', 'Request a quota increase or spread load over a longer window.', 'Cache successful responses to reduce call volume.'],
    category: 'rate-limit',
  },
  {
    id: 'circuit-open',
    pattern: /circuit breaker is open|CircuitBreakerOpenException|breaker open|hystrix.*open/i,
    title: 'Circuit breaker open',
    explanation: 'The circuit breaker tripped because the downstream failure rate exceeded its threshold — calls are being failed fast on purpose.',
    fixes: ['Check the downstream service health.', 'Wait for the breaker half-open probe to succeed; do not hammer it while open.', 'Verify the failure threshold is sensible vs actual flakiness.'],
    category: 'dependency',
  },
  {
    id: 'queue-backlog',
    pattern: /(queue backlog|lag of \d+|ApproximateNumberOfMessages|consumer lag|replica lag|replication lag)\D*\d{3,}/i,
    title: 'Queue/replication backlog growing',
    explanation: 'Messages/replication entries are piling up faster than consumers/replicas can process them.',
    fixes: ['Scale consumers or speed up processing.', 'Check for poison messages that repeatedly fail and dead-letter them.', 'Monitor lag and alert before it causes stale reads or dropped messages.'],
    category: 'queue',
  },
  {
    id: 'startup-failure',
    pattern: /Address already in use|EADDRINUSE|port \d+ is already|bind: address already|Failed to bind/i,
    title: 'Port already in use (process cannot start/bind)',
    explanation: 'Another process is already listening on the port — orphaned process, stale container, or a second instance.',
    fixes: ['Find and stop the process holding the port (lsof -i :port / netstat).', 'Check for a crashed previous instance that did not release the socket (SO_REUSEADDR).'],
    category: 'config',
  },
  {
    id: 'image-pull',
    pattern: /(ImagePullBackOff|ErrImagePull|manifest unknown|unauthorized:|401 Unauthorized|denied:.*pull access)/i,
    title: 'Cannot pull container image',
    explanation: 'Kubernetes cannot start the pod because the image cannot be fetched — tag missing, registry auth bad, or registry down.',
    fixes: ['Verify the image tag exists in the registry.', 'Check imagePullSecrets / registry credentials.', 'Try a manual docker pull / crictl pull to see the actual error.'],
    category: 'kubernetes',
  },
  {
    id: 'python-import',
    pattern: /(ModuleNotFoundError|ImportError): (No module named|cannot import name)/,
    title: 'Python module missing / name not exported',
    explanation: 'The installed environment is missing a dependency, or the name being imported does not exist in the installed version.',
    fixes: ['Check requirements.txt / pyproject.toml pins and the installed version in the failing environment.', 'Reinstall deps; verify virtualenv activation.'],
    category: 'deploy',
  },
  {
    id: 'rbac-denied',
    pattern: /(AccessDenied|AccessDeniedException|403 Forbidden|not authorized to perform|is not authorized|ForbiddenException|PermissionDenied)/i,
    title: 'RBAC / IAM permission denied',
    explanation: 'The credentials the process is using lack a required IAM/RBAC permission.',
    fixes: ['Check the role attached to the service account/pod/instance.', 'Add the missing action, scoped to the required resource.', 'Ensure the role policy is attached (not just defined).'],
    category: 'auth',
  },
];

const FRAME_PATTERNS: RegExp[] = [
  /at (?:(?<fn>[\w$.<>\[\] ]+?) \()?(?<file>(?:\/|[A-Za-z]:\\|\.\/|webpack:|file:)[^():]+|[\w./-]+\.(?:js|ts|mjs|cjs|tsx|jsx)):(?<line>\d+)(?::\d+)?\)?/,
  /File "(?<file>[^"]+)", line (?<line>\d+)(?:, in (?<fn>\S+))?/,
  /at (?<fn>[\w$.]+)\((?<file>[\w$]+\.(?:java|kt|scala)):(?<line>\d+)\)/,
  /^\s*(?<file>[\w./-]+\.go):(?<line>\d+)/,
];

const VENDOR_FRAME = /node_modules|node:internal|internal\/|site-packages|dist-packages|\/usr\/lib|java\.base|sun\.|jdk\.|runtime\/|<anonymous>|\(native\)/;

export function looksLikeStackTrace(text: string): boolean {
  const frames = text.split('\n').filter((line) => FRAME_PATTERNS.some((pattern) => pattern.test(line))).length;
  return frames >= 2 || SIGNATURES.some((signature) => signature.pattern.test(text)) && /(Error|Exception|panic|Traceback|FATAL|fatal)/.test(text);
}

export function analyzeStackTrace(text: string): { diagnoses: ErrorDiagnosis[]; topFrame: StackFrame | null } {
  const diagnoses: ErrorDiagnosis[] = [];
  for (const signature of SIGNATURES) {
    const match = signature.pattern.exec(text);
    if (!match) continue;
    const evidenceLine = text.split('\n').find((line) => signature.pattern.test(line)) ?? match[0];
    diagnoses.push({
      id: signature.id,
      title: signature.title,
      explanation: signature.explanation,
      fixes: signature.fixes,
      category: signature.category,
      evidence: evidenceLine.trim().slice(0, 240),
    });
    if (diagnoses.length >= 4) break;
  }

  let topFrame: StackFrame | null = null;
  for (const line of text.split('\n')) {
    for (const pattern of FRAME_PATTERNS) {
      const match = pattern.exec(line);
      if (!match?.groups) continue;
      const frame: StackFrame = { file: match.groups.file!.trim(), line: Number(match.groups.line) };
      if (match.groups.fn) frame.fn = match.groups.fn.trim();
      if (!VENDOR_FRAME.test(frame.file)) {
        topFrame = frame;
        break;
      }
      topFrame ??= frame;
    }
    if (topFrame && !VENDOR_FRAME.test(topFrame.file)) break;
  }
  return { diagnoses, topFrame };
}

// ---------------------------------------------------------------------------------------------
// Code review rules
// ---------------------------------------------------------------------------------------------

/** Apply `transform` only to the parts of a line that are outside string literals and comments. */
function mapOutsideStrings(line: string, transform: (segment: string) => string, commentMarker = '//'): string {
  let out = '';
  let buffer = '';
  let quote: string | null = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (quote) {
      out += char;
      if (char === '\\') {
        out += line[index + 1] ?? '';
        index += 1;
      } else if (char === quote) quote = null;
      continue;
    }
    if (line.startsWith(commentMarker, index)) {
      out += transform(buffer) + line.slice(index);
      return out;
    }
    if (char === '"' || char === "'" || char === '`') {
      out += transform(buffer) + char;
      buffer = '';
      quote = char;
      continue;
    }
    buffer += char;
  }
  return out + transform(buffer);
}

/** The code part of a line (strings blanked, trailing comment removed) — used by the matchers. */
function codeOnly(line: string, commentMarker: string): string {
  let out = '';
  let quote: string | null = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) {
        quote = null;
        out += char;
      }
      continue;
    }
    if (line.startsWith(commentMarker, index)) break;
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      out += char;
      continue;
    }
    out += char;
  }
  return out;
}

type LineRule = {
  id: string;
  languages: CodeLanguage[] | 'all';
  severity: FindingSeverity;
  /** Tested against the line with string contents blanked out (unless `raw`). */
  test: RegExp;
  raw?: boolean;
  unless?: RegExp;
  message: string;
  suggestion: string;
  category?: CategoryId;
};

const JS: CodeLanguage[] = ['javascript', 'typescript'];

const LINE_RULES: LineRule[] = [
  { id: 'js-eval', languages: [...JS, 'python', 'php', 'ruby'], severity: 'error', test: /\b(eval|exec)\s*\(|new Function\s*\(/, message: 'Dynamic code execution (eval/exec/new Function).', suggestion: 'Remove dynamic evaluation; parse data explicitly (e.g. JSON.parse) or use a lookup table.', category: 'security' },
  { id: 'js-innerhtml', languages: JS, severity: 'warning', test: /\.(innerHTML|outerHTML)\s*=|dangerouslySetInnerHTML/, message: 'Raw HTML injection point (XSS risk).', suggestion: 'Use textContent / framework rendering, or sanitize with a vetted library before inserting HTML.', category: 'security' },
  { id: 'js-loose-equality', languages: JS, severity: 'info', test: /[^=!<>]==[^=]|!=[^=]/, unless: /[!=]=\s*(null|undefined)\b|\b(null|undefined)\s*[!=]=/, message: 'Loose equality (== / !=) coerces types.', suggestion: 'Use === / !== (auto-fixed).' },
  { id: 'js-var', languages: JS, severity: 'info', test: /^\s*var\s+\w/, message: '`var` is function-scoped and hoisted.', suggestion: 'Use `const` (or `let` if reassigned).' },
  { id: 'js-console-log', languages: JS, severity: 'info', test: /\bconsole\.(log|debug)\s*\(/, message: 'console.log left in code.', suggestion: 'Use the application logger with a level, or remove it.' },
  { id: 'js-ts-ignore', languages: ['typescript'], severity: 'warning', test: /@ts-ignore|@ts-nocheck/, raw: true, message: 'Type checking suppressed.', suggestion: 'Fix the type error, or use @ts-expect-error with a reason so it resurfaces when fixed.' },
  { id: 'ts-any', languages: ['typescript'], severity: 'info', test: /:\s*any\b|as any\b|<any>/, message: '`any` disables type checking for this value.', suggestion: 'Use `unknown` and narrow it, or a precise type.' },
  { id: 'js-fetch-no-timeout', languages: JS, severity: 'warning', test: /\bfetch\s*\(/, unless: /signal|AbortSignal|timeout/i, message: 'Outbound fetch() without a timeout — a slow dependency can hang requests and exhaust workers.', suggestion: 'Pass `{ signal: AbortSignal.timeout(10_000) }` (auto-fixed for simple calls).', category: 'dependency' },
  { id: 'js-axios-no-timeout', languages: JS, severity: 'warning', test: /\baxios\.(get|post|put|patch|delete|request)\s*\(/, unless: /timeout/, message: 'axios call without a timeout (axios has none by default).', suggestion: 'Create the client with `axios.create({ timeout: 10_000 })`.', category: 'dependency' },
  { id: 'js-then-no-catch', languages: JS, severity: 'warning', test: /\.then\s*\(/, unless: /\.catch\s*\(|await /, message: 'Promise chain without .catch() — a rejection becomes an unhandled error.', suggestion: 'Add .catch() or use await inside try/catch.' },
  { id: 'js-await-in-loop', languages: JS, severity: 'info', test: /^\s*for\s*\(.*\)\s*\{?\s*$|^\s*for\s*\(.*\bof\b/, message: 'Loop — if it awaits per item, calls run one at a time.', suggestion: 'If the calls are independent, use Promise.all with a concurrency limit.' },
  { id: 'js-sync-fs', languages: JS, severity: 'info', test: /\b(readFileSync|writeFileSync|execSync)\s*\(/, message: 'Synchronous I/O blocks the event loop.', suggestion: 'Use the async variant in request paths.' },
  { id: 'py-bare-except', languages: ['python'], severity: 'warning', test: /^\s*except\s*:/, message: 'Bare `except:` also catches KeyboardInterrupt/SystemExit.', suggestion: 'Catch `Exception` (auto-fixed) or, better, the specific error.' },
  { id: 'py-none-compare', languages: ['python'], severity: 'info', test: /[!=]=\s*None\b/, message: 'Comparison to None with == / !=.', suggestion: 'Use `is None` / `is not None` (auto-fixed).' },
  { id: 'py-mutable-default', languages: ['python'], severity: 'error', test: /def \w+\(.*=\s*(\[\]|\{\}|set\(\))/, message: 'Mutable default argument is shared between calls.', suggestion: 'Default to None and create the list/dict inside the function.' },
  { id: 'py-requests-no-timeout', languages: ['python'], severity: 'warning', test: /\brequests\.(get|post|put|patch|delete|head|request)\s*\(/, unless: /timeout\s*=/, message: 'requests call without timeout= — it can block forever.', suggestion: 'Pass `timeout=10` (auto-fixed for simple calls).', category: 'dependency' },
  { id: 'py-print', languages: ['python'], severity: 'info', test: /^\s*print\s*\(/, message: 'print() used for output.', suggestion: 'Use the logging module with a level.' },
  { id: 'py-shell-true', languages: ['python'], severity: 'error', test: /shell\s*=\s*True|os\.system\s*\(/, message: 'Shell command execution (injection risk).', suggestion: 'Use subprocess.run([...]) with an argument list and shell=False.', category: 'security' },
  { id: 'py-star-import', languages: ['python'], severity: 'info', test: /^\s*from\s+\S+\s+import\s+\*/, message: 'Wildcard import hides where names come from.', suggestion: 'Import the names you use explicitly.' },
  { id: 'go-ignored-error', languages: ['go'], severity: 'warning', test: /(^|[\s,(])_\s*(,\s*_\s*)?=\s*\w+[\w.]*\(|,\s*_\s*:?=\s*\w+[\w.]*\(/, message: 'Error return value discarded with `_`.', suggestion: 'Handle the error or explicitly document why it is safe to ignore.' },
  { id: 'go-http-default-client', languages: ['go'], severity: 'warning', test: /\bhttp\.(Get|Post|Head|PostForm)\s*\(|http\.DefaultClient/, message: 'Default http client has no timeout.', suggestion: 'Use `&http.Client{Timeout: 10 * time.Second}`.', category: 'dependency' },
  { id: 'go-panic', languages: ['go'], severity: 'info', test: /\bpanic\s*\(/, message: 'panic() in library/request code crashes the process.', suggestion: 'Return an error instead.' },
  { id: 'java-print-stack', languages: ['java'], severity: 'info', test: /\.printStackTrace\s*\(\s*\)|System\.out\.print/, message: 'Printing to stdout instead of logging.', suggestion: 'Use the logger (SLF4J etc.) with context.' },
  { id: 'java-string-eq', languages: ['java'], severity: 'error', test: /"\s*==\s*\w|\w\s*==\s*"/, message: 'String compared with == (reference equality).', suggestion: 'Use .equals() / Objects.equals().' },
  { id: 'sql-select-star', languages: 'all', severity: 'info', test: /\bSELECT\s+\*\s+FROM\b/i, raw: true, message: 'SELECT * fetches every column.', suggestion: 'Select only the columns you need (smaller payloads, stable contracts, index-only scans).', category: 'database' },
  { id: 'sql-delete-no-where', languages: ['sql'], severity: 'error', test: /^\s*(DELETE\s+FROM\s+\w+|UPDATE\s+\w+\s+SET\s+.+?)\s*;?\s*$/i, raw: true, unless: /\bWHERE\b/i, message: 'DELETE/UPDATE without WHERE affects every row.', suggestion: 'Add a WHERE clause; run destructive statements inside a transaction and check the row count.', category: 'data' },
  { id: 'todo', languages: 'all', severity: 'info', test: /\b(TODO|FIXME|HACK|XXX)\b/, raw: true, message: 'Unresolved TODO/FIXME.', suggestion: 'Track it as a ticket or resolve it before shipping.' },
  { id: 'disable-tls-verify', languages: 'all', severity: 'error', test: /rejectUnauthorized\s*:\s*false|verify\s*=\s*False|InsecureSkipVerify\s*:\s*true|NODE_TLS_REJECT_UNAUTHORIZED/, raw: true, message: 'TLS certificate verification disabled.', suggestion: 'Keep verification on; trust the correct CA instead.', category: 'security' },
];

const SQL_CONCAT = /(["'`])\s*(SELECT|INSERT|UPDATE|DELETE)\b[^"'`]*\1\s*\+|\b(SELECT|INSERT|UPDATE|DELETE)\b[^"'`\n]*(\$\{|["']\s*\+\s*\w|%s["']\s*%|["']\s*\.\s*format\(|\{\w+\})/i;
const SQL_FSTRING = /\bf["'](SELECT|INSERT|UPDATE|DELETE)\b[^"']*\{/i;

const SECRET_ASSIGNMENT = /\b([\w-]*?(?:password|passwd|secret|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|client[_-]?secret)[\w-]*)["']?\s*[:=]\s*(["'])([^"'\s]{8,})\2/i;
const SECRET_FORMATS = /\b(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[abposr]-[A-Za-z0-9-]{10,}|(?:AKIA|ASIA)[A-Z0-9]{16}|AIza[0-9A-Za-z_-]{35}|(?:sk|rk)_live_[A-Za-z0-9]{16,})\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/;

/**
 * Replace credentials in code with environment lookups / placeholders WITHOUT breaking syntax or
 * shifting line numbers — used before code is handed to any model, even a local one.
 */
export function scrubSecrets(code: string, languageHint?: CodeLanguage | null): string {
  const language = languageHint && languageHint !== 'unknown' ? languageHint : detectLanguage(code);
  return code
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g, (block) => block.replace(/[^\n]+/g, (line, offset) => (offset === 0 ? '[REDACTED_PRIVATE_KEY]' : '')))
    .split('\n')
    .map((line) => {
      let out = line;
      const secret = SECRET_ASSIGNMENT.exec(out);
      if (secret && !/process\.env|os\.environ|getenv|ENV\[/i.test(secret[3]!)) out = out.replace(`${secret[2]}${secret[3]}${secret[2]}`, envLookup(language, secret[1]!));
      return out
        .replace(new RegExp(SECRET_FORMATS.source.replace('|-----BEGIN [A-Z ]*PRIVATE KEY-----', ''), 'g'), '[REDACTED_KEY]')
        .replace(/\b([a-z][a-z0-9+.-]*:\/\/)[^\s:@/'"]+:[^\s@/'"]+@/gi, '$1[REDACTED]@')
        .replace(/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, '[REDACTED_JWT]');
    })
    .join('\n');
}

function envLookup(language: CodeLanguage, name: string): string {
  const key = name.replace(/[^A-Za-z0-9]+/g, '_').replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
  switch (language) {
    case 'python':
      return `os.environ["${key}"]`;
    case 'go':
      return `os.Getenv("${key}")`;
    case 'java':
      return `System.getenv("${key}")`;
    case 'csharp':
      return `Environment.GetEnvironmentVariable("${key}")`;
    case 'ruby':
      return `ENV["${key}"]`;
    case 'php':
      return `getenv('${key}')`;
    case 'javascript':
    case 'typescript':
      return `process.env.${key}`;
    default:
      return `"<set ${key} via environment>"`;
  }
}

function computeMetrics(lines: string[], language: CodeLanguage, commentMarker: string): { metrics: CodeMetrics; deepLines: number[]; longFunctions: { line: number; length: number }[] } {
  const codeLines = lines.filter((line) => line.trim() && !line.trim().startsWith(commentMarker)).length;
  const functionPattern =
    language === 'python'
      ? /^\s*(async\s+)?def\s+\w+/
      : language === 'go'
        ? /^\s*func\s/
        : /\bfunction\b|=>\s*\{|^\s*(public|private|protected|static|async|\w+)\s+[\w<>\[\]]+\s*\([^)]*\)\s*\{|^\s*(async\s+)?\w+\s*\([^)]*\)\s*\{/;
  const functions = lines.filter((line) => functionPattern.test(line) && !/^\s*(if|for|while|switch|catch)\b/.test(line)).length;

  const deepLines: number[] = [];
  const longFunctions: { line: number; length: number }[] = [];
  let maxNesting = 0;

  if (BRACE_LANGUAGES.has(language)) {
    let depth = 0;
    const stack: { line: number; depth: number; isFunction: boolean }[] = [];
    lines.forEach((raw, index) => {
      const line = codeOnly(raw, commentMarker);
      const isFunction = functionPattern.test(line) && !/^\s*(if|for|while|switch|catch)\b/.test(line);
      for (const char of line) {
        if (char === '{') {
          depth += 1;
          stack.push({ line: index + 1, depth, isFunction });
          if (depth > maxNesting) maxNesting = depth;
          if (depth === 6) deepLines.push(index + 1);
        } else if (char === '}') {
          const open = stack.pop();
          if (open?.isFunction && index + 1 - open.line > 60) longFunctions.push({ line: open.line, length: index + 1 - open.line });
          depth = Math.max(0, depth - 1);
        }
      }
    });
  } else if (language === 'python') {
    let open: { line: number; indent: number } | null = null;
    const close = (endIndex: number) => {
      if (open && endIndex - open.line > 60) longFunctions.push({ line: open.line, length: endIndex - open.line });
      open = null;
    };
    lines.forEach((line, index) => {
      if (!line.trim() || line.trim().startsWith('#')) return;
      const indent = Math.floor((line.match(/^\s*/)?.[0].replace(/\t/g, '    ').length ?? 0) / 4);
      if (indent > maxNesting) maxNesting = indent;
      if (indent === 5) deepLines.push(index + 1);
      const isDef = /^\s*(async\s+)?def\s/.test(line);
      if (open && indent <= (open as { indent: number }).indent) close(index);
      if (isDef && !open) open = { line: index + 1, indent };
    });
    close(lines.length);
  }

  const longestFunction = longFunctions.reduce((max, entry) => Math.max(max, entry.length), 0);
  return { metrics: { lines: lines.length, codeLines, functions, maxNesting, longestFunction }, deepLines, longFunctions };
}

export function analyzeCode(input: string, languageHint?: CodeLanguage | null): CodeAnalysis {
  const code = input.replace(/\r\n/g, '\n').slice(0, MAX_CODE_CHARS);
  const language = languageHint && languageHint !== 'unknown' ? languageHint : detectLanguage(code);
  const commentMarker = ['python', 'ruby', 'shell', 'yaml'].includes(language) ? '#' : language === 'sql' ? '--' : '//';
  const trace = looksLikeStackTrace(code) ? analyzeStackTrace(code) : { diagnoses: [], topFrame: null };
  const traceLines = code.split('\n').filter((line) => FRAME_PATTERNS.some((pattern) => pattern.test(line))).length;
  const lines = code.split('\n');
  const kind: CodeAnalysis['kind'] = trace.diagnoses.length || traceLines >= 2 ? (traceLines >= lines.length * 0.4 || language === 'unknown' ? 'stack_trace' : 'mixed') : 'code';

  const findings: CodeFinding[] = [];
  const applied = new Set<string>();
  const improved: string[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    const isComment = trimmed.startsWith(commentMarker) || trimmed.startsWith('*') || trimmed.startsWith('/*');
    const stripped = codeOnly(line, commentMarker);
    let fixed = line.replace(/[ \t]+$/, '');
    if (fixed !== line) applied.add('Removed trailing whitespace');

    if (kind !== 'stack_trace') {
      for (const rule of LINE_RULES) {
        if (rule.languages !== 'all' && !rule.languages.includes(language)) continue;
        if (isComment && rule.id !== 'todo') continue;
        const subject = rule.raw ? line : stripped;
        if (!rule.test.test(subject)) continue;
        if (rule.unless?.test(line)) continue;
        if (rule.id === 'js-await-in-loop') {
          const body = lines.slice(index, index + 8).join('\n');
          if (!/\bawait\b/.test(body)) continue;
        }
        findings.push({ rule: rule.id, severity: rule.severity, line: lineNumber, message: rule.message, suggestion: rule.suggestion, ...(rule.category ? { category: rule.category } : {}) });
      }

      if (!isComment && (SQL_CONCAT.test(line) || SQL_FSTRING.test(line))) {
        findings.push({ rule: 'sql-injection', severity: 'error', line: lineNumber, message: 'SQL built by string concatenation/interpolation (SQL injection risk).', suggestion: 'Use parameterized queries / placeholders provided by your driver or ORM.', category: 'security' });
      }

      const secret = SECRET_ASSIGNMENT.exec(line);
      if (secret && !/process\.env|os\.environ|getenv|ENV\[|example|changeme|placeholder|xxxx|<.*>/i.test(secret[3]!)) {
        findings.push({ rule: 'hardcoded-secret', severity: 'error', line: lineNumber, message: `Hard-coded credential in \`${secret[1]}\`.`, suggestion: 'Load it from the environment / a secret manager and rotate the exposed value (auto-fixed to an environment lookup).', category: 'security' });
        fixed = fixed.replace(`${secret[2]}${secret[3]}${secret[2]}`, envLookup(language, secret[1]!));
        applied.add('Replaced hard-coded secrets with environment lookups');
      } else if (SECRET_FORMATS.test(line)) {
        findings.push({ rule: 'hardcoded-secret', severity: 'error', line: lineNumber, message: 'Something that looks like a real API key / private key is embedded in the code.', suggestion: 'Remove it, rotate it now, and load it from a secret manager.', category: 'security' });
      }

      // ---- safe mechanical fixes
      if (!isComment && JS.includes(language)) {
        const next = mapOutsideStrings(fixed, (segment) =>
          /\b(null|undefined)\b/.test(segment) ? segment : segment.replace(/([^=!<>])==(?!=)/g, '$1===').replace(/!=(?!=)/g, '!=='),
        );
        if (next !== fixed) applied.add('Replaced == / != with === / !==');
        fixed = next;
        const withTimeout = fixed.replace(/\bfetch\(([^(),]+)\)/g, (whole, url: string) => (/signal|timeout/i.test(line) ? whole : `fetch(${url.trim()}, { signal: AbortSignal.timeout(10_000) })`));
        if (withTimeout !== fixed) applied.add('Added a 10s timeout to fetch() calls');
        fixed = withTimeout;
        const logged = mapOutsideStrings(fixed, (segment) =>
          segment.replace(/\bcatch\s*\((\w+)\)\s*\{\s*\}/g, 'catch ($1) { console.error($1); }').replace(/\bcatch\s*\{\s*\}/g, 'catch (error) { console.error(error); }'),
        );
        if (logged !== fixed) applied.add('Empty catch blocks now log the error');
        fixed = logged;
      }
      if (!isComment && language === 'python') {
        const next = mapOutsideStrings(fixed, (segment) => segment.replace(/==\s*None\b/g, 'is None').replace(/!=\s*None\b/g, 'is not None'), '#');
        if (next !== fixed) applied.add('Replaced == None with is None');
        fixed = next;
        if (/^\s*except\s*:/.test(fixed)) {
          fixed = fixed.replace(/except\s*:/, 'except Exception:');
          applied.add('Narrowed bare except: to except Exception:');
        }
        const withTimeout = fixed.replace(/\brequests\.(get|post|put|patch|delete|head)\(([^()]*)\)/g, (whole, method: string, args: string) =>
          /timeout\s*=/.test(args) || !args.trim() ? whole : `requests.${method}(${args.trim()}, timeout=10)`,
        );
        if (withTimeout !== fixed) applied.add('Added timeout=10 to requests calls');
        fixed = withTimeout;
      }
    }
    improved.push(fixed);
  });

  // Empty catch / swallowed errors span lines, so check them on the whole text.
  if (kind !== 'stack_trace') {
    const emptyCatch = /catch\s*(\([^)]*\))?\s*\{\s*\}|except[^:\n]*:\s*\n\s*pass\b|if err != nil \{\s*\}/g;
    // Strings and comments removed (line-preserving) so `"catch (e) {}"` in a string is not flagged.
    const codeText = lines.map((line) => codeOnly(line, commentMarker)).join('\n');
    let match: RegExpExecArray | null;
    while ((match = emptyCatch.exec(codeText))) {
      const lineNumber = codeText.slice(0, match.index).split('\n').length;
      findings.push({ rule: 'swallowed-error', severity: 'error', line: lineNumber, message: 'Error caught and silently ignored — failures become invisible during an incident.', suggestion: 'Log the error with context and either handle it or rethrow.' });
    }
    const retryLoop = /(while\s*\(\s*true\s*\)|while True:|for\s*\{\s*$)[\s\S]{0,400}?(retry|attempt|try)/i;
    if (retryLoop.test(code) && !/backoff|sleep|setTimeout|time\.Sleep|jitter/i.test(code)) {
      const lineNumber = code.slice(0, code.search(retryLoop)).split('\n').length;
      findings.push({ rule: 'retry-no-backoff', severity: 'warning', line: lineNumber, message: 'Unbounded retry loop without backoff — can turn a small failure into a retry storm.', suggestion: 'Cap attempts and use exponential backoff with jitter.', category: 'capacity' });
    }
  }

  const { metrics, deepLines, longFunctions } = computeMetrics(lines, language, commentMarker);
  if (kind !== 'stack_trace') {
    for (const line of deepLines.slice(0, 3)) {
      findings.push({ rule: 'deep-nesting', severity: 'warning', line, message: 'Deeply nested block (5+ levels) — hard to read and to test.', suggestion: 'Return early / extract helper functions.' });
    }
    for (const entry of longFunctions.slice(0, 3)) {
      findings.push({ rule: 'long-function', severity: 'info', line: entry.line, message: `Function is ~${entry.length} lines long.`, suggestion: 'Split it into smaller functions with one responsibility each.' });
    }
    const longLines = lines.map((line, index) => ({ line, index })).filter(({ line }) => line.length > 160);
    if (longLines.length) {
      findings.push({ rule: 'long-line', severity: 'info', line: longLines[0]!.index + 1, message: `${longLines.length} line(s) longer than 160 characters.`, suggestion: 'Wrap long lines for readability.' });
    }
  }

  // De-duplicate: keep at most 3 hits per rule so one noisy rule cannot drown the rest.
  const perRule = new Map<string, number>();
  const order: Record<FindingSeverity, number> = { error: 0, warning: 1, info: 2 };
  const deduped = findings
    .sort((a, b) => order[a.severity] - order[b.severity] || a.line - b.line)
    .filter((finding) => {
      const seen = perRule.get(finding.rule) ?? 0;
      perRule.set(finding.rule, seen + 1);
      return seen < 3;
    })
    .slice(0, 40);

  const counts = { error: deduped.filter((f) => f.severity === 'error').length, warning: deduped.filter((f) => f.severity === 'warning').length, info: deduped.filter((f) => f.severity === 'info').length };
  const summaryParts: string[] = [];
  if (trace.diagnoses.length) summaryParts.push(`Recognized ${trace.diagnoses.map((d) => d.title.toLowerCase()).join(', ')}.`);
  if (trace.topFrame) summaryParts.push(`First frame in your code: ${trace.topFrame.file}:${trace.topFrame.line}${trace.topFrame.fn ? ` (${trace.topFrame.fn})` : ''}.`);
  if (kind !== 'stack_trace') {
    summaryParts.push(
      deduped.length
        ? `${counts.error} error${counts.error === 1 ? '' : 's'}, ${counts.warning} warning${counts.warning === 1 ? '' : 's'}, ${counts.info} suggestion${counts.info === 1 ? '' : 's'} in ${metrics.codeLines} lines of ${language}.`
        : `No reliability or security problems found in ${metrics.codeLines} lines of ${language}.`,
    );
  }
  if (applied.size) summaryParts.push(`${applied.size} safe fix${applied.size === 1 ? '' : 'es'} applied automatically.`);

  return {
    language,
    kind,
    findings: deduped,
    diagnoses: trace.diagnoses,
    topFrame: trace.topFrame,
    improvedCode: improved.join('\n'),
    appliedFixes: [...applied],
    metrics,
    summary: summaryParts.join(' '),
  };
}
