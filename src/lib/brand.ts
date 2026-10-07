/**
 * Brand constants — the single source of truth for product + AI naming.
 *
 * ARCH is the product. ARCH V1.1 is the native on-call intelligence that lives
 * inside it (triage, summaries, verified fixes, Ask ARCH). UI copy should import
 * AI_NAME instead of hard-coding the version, so the next release is a one-line change.
 */
export const PRODUCT_NAME = 'ARCH';

/**
 * The release the marketing surface advertises. Keep it equal to package.json's version —
 * `tests/marketing-minimal.test.ts` fails if the two drift apart, because the landing page tells
 * visitors which release they are looking at.
 */
export const PRODUCT_VERSION = '0.3.0';
export const AI_NAME = 'ARCH V1.1';
export const AI_SHORT = 'V1.1';

/**
 * The product's public GitHub repository (`owner/name`). The landing page links to it and reads its
 * live star count from it, so there is exactly one place to change if the repository ever moves.
 */
export const GITHUB_REPO = 'ssambit635-svg/ARCH';
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO}`;
