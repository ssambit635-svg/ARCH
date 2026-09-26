import crypto from 'node:crypto';

/**
 * Secrets, hashes and HMAC verification.
 *
 * Rules this file exists to enforce:
 *  - secrets are generated with a CSPRNG and returned to the user exactly once;
 *  - the database keeps a SHA-256 *hash* for lookup/equality and an AES-256-GCM encrypted copy
 *    for verification (an HMAC can only be checked with the original key);
 *  - comparison is constant-time.
 */

type EncryptionVersion = 'v1' | 'v2';
const ENCRYPTION_VERSION: EncryptionVersion = 'v1';

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function generateSecret(prefix = 'whsec'): string {
  return `${prefix}_${randomToken(24)}`;
}

export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

function encryptionKey(keyMaterial: string, version: EncryptionVersion): Buffer {
  return crypto.createHash('sha256').update(`arch:secret:${version}:${keyMaterial}`).digest();
}

/**
 * AES-256-GCM with a random IV; output is `version.iv.tag.ciphertext` (base64url).
 * v1 (legacy) uses AUTH_SECRET; new webhook endpoint secrets use v2 + AUTH_SECRET_WEBHOOK.
 */
export function encryptSecret(plaintext: string, keyMaterial: string, version: EncryptionVersion = ENCRYPTION_VERSION): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(keyMaterial, version), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [version, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptSecret(payload: string, keyMaterial: string): string {
  const [version, ivPart, tagPart, dataPart] = payload.split('.');
  if ((version !== 'v1' && version !== 'v2') || !ivPart || !tagPart || !dataPart) {
    throw new Error('Unsupported encrypted secret format.');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(keyMaterial, version), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64url')), decipher.final()]).toString('utf8');
}

export type SignatureResult = { ok: true } | { ok: false; reason: 'malformed' | 'stale' | 'mismatch' };

/** The exact string a sender signs: `<unix-timestamp>.<raw-body>`. */
export function signingPayload(timestamp: string, rawBody: string): string {
  return `${timestamp}.${rawBody}`;
}

export function computeHmacSignature(secret: string, timestamp: string, rawBody: string): string {
  return crypto.createHmac('sha256', secret).update(signingPayload(timestamp, rawBody)).digest('hex');
}

/** HMAC over the raw body only — the scheme GitHub and Sentry send in `x-hub-signature-256`. */
export function computeBodyHmac(secret: string, rawBody: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

/**
 * Verify an `x-arch-signature: t=<unix>,v1=<hex>` header.
 * Order matters: malformed → stale (replay) → mismatch, and the HMAC is checked in constant time.
 */
export function verifyHmacSignature(options: {
  secret: string;
  rawBody: string;
  header: string | null;
  toleranceSeconds: number;
  now?: number;
}): SignatureResult {
  const { secret, rawBody, header, toleranceSeconds, now = Date.now() } = options;
  if (!header) return { ok: false, reason: 'malformed' };

  const parts = header.split(',').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split('=').map((piece) => piece?.trim());
    if (key && value) acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature || !/^\d+$/.test(timestamp) || !/^[0-9a-f]{64}$/i.test(signature)) {
    return { ok: false, reason: 'malformed' };
  }

  const ageSeconds = Math.abs(now / 1000 - Number(timestamp));
  if (ageSeconds > toleranceSeconds) return { ok: false, reason: 'stale' };

  const expected = computeHmacSignature(secret, timestamp, rawBody);
  if (!timingSafeEqualStrings(expected, signature.toLowerCase())) return { ok: false, reason: 'mismatch' };

  return { ok: true };
}
