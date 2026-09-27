import { createHash } from 'node:crypto';

/**
 * V7 — alert fingerprinting for incident correlation & dedup.
 *
 * The same failure pages in many shapes: "ALERT: Checkout latency spike (db-01)" at 10:04,
 * "checkout latency spike on db-02" at 10:19, a different UUID and timestamp each time. A
 * content fingerprint normalizes that noise away and hashes what actually identifies the failure:
 * source + service + the words that survive normalization.
 *
 * Deliberately conservative about what it throws away (the ingestion data is dirty):
 *   - UUIDs, commit shas, IPv4 addresses, durations and plain numbers are volatile → dropped,
 *     except 4xx/5xx codes which discriminate real failures ("500 error" ≠ "404 error").
 *   - Framing words ("alert", "fired", "incident", …) carry no signal → dropped.
 *   - Host ordinals ("-01"/"-02") are numbers → dropped, so replicas of one failure group together.
 *
 * The fingerprint is used two ways:
 *   1. Alert-storm suppression — an open incident with the same fingerprint absorbs repeat alerts
 *      instead of opening a new incident (only when the sender gave no explicit dedupeKey).
 *   2. Correlation — incidents sharing a fingerprint are shown as repeats of one signature, and
 *      the most recent resolved one contributes its root cause / fix ("same root cause").
 */

const NOISE_WORDS = new Set([
  'a', 'an', 'the', 'on', 'in', 'at', 'to', 'of', 'for', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'with', 'from', 'into', 'via', 'and', 'or', 'but', 'as', 'by', 'it', 'its', 'this',
  'that', 'these', 'those', 'so', 'too', 'very', 'just', 'now', 'here', 'there', 'ago', 'since',
  'last', 'next', 'every', 'per',
  'alert', 'alerts', 'alerting', 'alarm', 'warning', 'warn', 'notify', 'notification', 'event',
  'incident', 'issue', 'problem', 'fired', 'firing', 'triggered', 'detected', 'raised', 'opened',
  'monitor', 'monitoring', 'monitored', 'probe', 'check', 'status', 'ok', 'okay', 'resolved',
  'recovered', 'up', 'down',
  // Host-role words: "the same failure on another replica" must group together.
  'pod', 'pods', 'node', 'nodes', 'host', 'hosts', 'instance', 'instances', 'server', 'servers',
  'replica', 'replicas', 'shard', 'shards', 'container', 'containers', 'vm', 'zone', 'az',
]);

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const SHA_RE = /\b[0-9a-f]{7,40}\b/gi;
const IPV4_RE = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
const DURATION_RE = /\b\d+(?:\.\d+)?\s?(?:ms|s|m|h|d|sec|secs|second|seconds|min|mins|minute|minutes|hour|hours|day|days)\b/gi;
const NUMBER_RE = /\b\d+(?:\.\d+)?\b/g;

/** Lowercase, strip volatile tokens and framing words, collapse whitespace. */
export function normalizeAlertText(raw: string): string {
  let text = ` ${raw.toLowerCase()} `;
  text = text.replace(UUID_RE, ' ');
  text = text.replace(IPV4_RE, ' ');
  text = text.replace(DURATION_RE, ' ');
  text = text.replace(SHA_RE, ' ');
  // Keep 4xx/5xx codes — "500 errors" and "404 errors" are different failures.
  text = text.replace(NUMBER_RE, (match) => (/^[45]\d{2}$/.test(match) ? ` ${match} ` : ' '));
  text = text.replace(/[^a-z0-9\s]/g, ' ');
  const tokens = text
    .split(/\s+/)
    .map((token) => token.trim())
    // Surviving digit tokens are exactly the kept 4xx/5xx codes (NUMBER_RE dropped the rest).
    .filter((token) => token.length >= 2 && !NOISE_WORDS.has(token));
  return tokens.join(' ');
}

export type AlertIdentity = {
  /** Ingest source: provider name ("grafana", "sentry") or "DASHBOARD" / "API". */
  source: string;
  /** Service name or slug when known — part of the identity of the failure. */
  serviceKey?: string | null;
  title: string;
  description?: string | null;
};

/**
 * Deterministic content signature of an alert: sha256(source | service | normalized title) as a
 * 24-hex-char fingerprint. Generic titles ("ALERT", "Service check failed") fall back to the
 * description so two unrelated problems with a boilerplate title do not collide.
 */
export function alertFingerprint(input: AlertIdentity): string {
  let body = normalizeAlertText(input.title);
  const meaningful = body.split(' ').filter(Boolean);
  if (meaningful.length < 2 && input.description) {
    body = `${body} ${normalizeAlertText(input.description.slice(0, 400))}`.trim();
  }
  const material = [input.source.toLowerCase().trim(), (input.serviceKey ?? '').toLowerCase().trim(), body.slice(0, 160)].join('|');
  return createHash('sha256').update(material).digest('hex').slice(0, 24);
}
