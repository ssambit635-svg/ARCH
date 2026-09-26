/**
 * Repo-scoring helpers for the developer scripts (no network, no model, no ARCH imports).
 *
 * `scripts/github/repo-debug.mjs` has to turn "checkout returns 502 after deploy" into a short,
 * honest reading list out of thousands of files. There is deliberately no LLM in that loop:
 *
 *   keywords()     symptom/issue text → the tokens worth matching (stop-words dropped, numbers
 *                  like "502" kept);
 *   scorePath()    how close a repository path is to those tokens — filename beats directory, so
 *                  `payments/checkout.ts` outranks `docs/checkout-explained.md` for "checkout";
 *   isSourceFile() keep real source, drop vendored/generated/lock/minified paths so the reading
 *                  list is code a human actually maintains.
 *
 * Pure functions so the ranking can be unit-tested without GitHub.
 */

/** Function words that carry no signal about *where* a bug lives. */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been', 'after', 'before', 'because', 'between', 'but',
  'by', 'can', 'could', 'did', 'do', 'does', 'during', 'each', 'for', 'from', 'had', 'has', 'have',
  'he', 'her', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'me', 'my', 'no',
  'not', 'of', 'on', 'or', 'our', 'out', 'over', 'she', 'since', 'so', 'some', 'than', 'that',
  'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'us', 'via', 'was', 'we', 'were', 'what', 'when', 'which', 'while', 'who',
  'why', 'will', 'with', 'would', 'you', 'your',
]);

/**
 * Tokenize free text into unique search keywords, in order.
 *
 * - lower-cases everything;
 * - splits compounds (`connection_pool`, `check-out`) so `pool` matches a path segment;
 * - keeps short numbers (`502`, `429`) — incident symptoms are often a status code;
 * - drops stop-words and single characters.
 */
export function keywords(text) {
  const seen = new Set();
  const words = [];
  for (const raw of String(text ?? '').toLowerCase().split(/[^a-z0-9]+/)) {
    if (!raw || seen.has(raw)) continue;
    if (raw.length < 3 && !/^\d{2,}$/.test(raw)) continue; // keep "502", drop "on"
    if (STOP_WORDS.has(raw)) continue;
    seen.add(raw);
    words.push(raw);
  }
  return words;
}

/** Split a path or file stem into lowercase tokens (`checkoutHandler` → `checkout`, `handler`). */
function pathTokens(segment) {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase → camel Case, before the lower-casing
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Score one repository path against the symptom keywords. Higher = "read this first".
 *
 *   filename stem *is* a keyword              +3   `checkout.ts` for "checkout"
 *   filename token/stem contains a keyword    +2   `checkout-retry.ts`, `checkoutHandler.ts`
 *   directory token equals a keyword          +1   `payments/…`
 *   directory contains a keyword              +0.5 `payment-retries/…`
 *
 * Returns 0 for an empty keyword list — the caller then ranks by path shape/size only.
 */
export function scorePath(filePath, words) {
  if (!words?.length) return 0;
  const original = String(filePath);
  const normalized = original.toLowerCase();
  const base = normalized.split('/').pop() ?? normalized;
  const stem = base.replace(/\.[^.]+$/, '');
  const dir = normalized.slice(0, normalized.length - base.length);
  // Tokens come from the original casing (camelCase splits), matching from the lowered copy.
  const baseTokens = pathTokens(original.slice(original.length - base.length).replace(/\.[^.]+$/, ''));
  const dirTokens = pathTokens(original.slice(0, original.length - base.length));

  let score = 0;
  for (const word of words) {
    if (stem === word) score += 3;
    else if (baseTokens.includes(word)) score += 2;
    else if (stem.includes(word)) score += 1.5;
    else if (dirTokens.includes(word)) score += 1;
    else if (dir.includes(word)) score += 0.5;
  }
  return score;
}

/** Directories that are vendored, generated or build output — never the bug you are hunting. */
const IGNORE_DIRS = new Set([
  'node_modules', 'vendor', 'vendors', 'third_party', 'thirdparty', 'bower_components',
  'dist', 'build', 'out', 'coverage', '__pycache__', '.venv', 'venv', '.git', '.hg', '.svn',
  '.next', '.nuxt', '.output', '.turbo', '.cache', '.parcel-cache', '.yarn', '.pnpm-store',
  '.svelte-kit', 'target', 'generated', 'gen', '.gradle', '.idea',
]);

/** Lockfiles and other pin-by-design artifacts (the *content* is generated, not written). */
const LOCK_FILES = new Set([
  'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
  'composer.lock', 'cargo.lock', 'gemfile.lock', 'poetry.lock', 'pipfile.lock', 'uv.lock',
  'go.sum', 'flake.lock', 'mix.lock', 'pubspec.lock', 'packages.lock.json',
]);

/** Source extensions worth reading — everything else (assets, data dumps) is noise. */
const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte',
  '.py', '.go', '.java', '.kt', '.scala', '.rb', '.php', '.cs', '.swift', '.m', '.mm',
  '.rs', '.c', '.cc', '.cpp', '.h', '.hpp', '.lua', '.ex', '.exs', '.hs', '.dart',
  '.sh', '.bash', '.zsh', '.ps1', '.sql', '.graphql', '.gql', '.proto', '.tf',
  '.yaml', '.yml', '.json', '.toml', '.ini', '.env',
]);

/** Extensionless files that are source by convention. */
const SOURCE_BASENAMES = new Set([
  'dockerfile', 'makefile', 'gemfile', 'rakefile', 'procfile', 'jenkinsfile', 'vagrantfile', 'justfile',
]);

/** Vendored/generated file patterns — even when they sit inside a normal source tree. */
const GENERATED_PATTERNS = [
  /\.min\.(js|css)$/,
  /\.(js|css)\.map$/,
  /\.d\.ts\.map$/,
  /\.pb\.(go|cc|h)$/, // protobuf outputs
  /_pb2(_grpc)?\.py$/,
  /\.generated\.[a-z0-9]+$/,
  /\.(g|designer)\.(cs|dart)$/,
  /\.(spec|test)\.snap$/,
  /\.snap$/,
  /\.bundle\.(js|css)$/,
];

/**
 * Should this tree entry be read as source? Filters out vendored/generated/lock paths and
 * keeps code + config the analyzer understands. Used on `git/trees` entries before scoring.
 */
export function isSourceFile(filePath) {
  const normalized = String(filePath).toLowerCase();
  const segments = normalized.split('/');
  const base = segments.pop() ?? normalized;

  // Hidden directories are tooling (.git, .github keeps workflows → allow it explicitly).
  for (const segment of segments) {
    if (IGNORE_DIRS.has(segment)) return false;
    if (segment.startsWith('.') && segment !== '.github') return false;
  }

  if (LOCK_FILES.has(base)) return false;
  if (GENERATED_PATTERNS.some((pattern) => pattern.test(base))) return false;

  const dot = base.lastIndexOf('.');
  const ext = dot > 0 ? base.slice(dot) : '';
  if (ext) return SOURCE_EXTENSIONS.has(ext);
  return SOURCE_BASENAMES.has(base);
}
