import { describe, expect, it } from 'vitest';
import { classifyThinkerRequest } from '@/server/ai/thinker/intent';
import { buildThinkerOutput } from '@/server/ai/thinker/draft';
import { parseCodeReview } from '@/server/ai/schemas';

describe('ARCH Thinker (native scaffold)', () => {
  it('classifies a CRUD route request and names the resource', () => {
    const request = classifyThinkerRequest('bhai CRUD API route for alerts with name and severity');
    expect(request.intent).toBe('crud_route');
    expect(request.slots.resourcePascal).toBe('Alerts');
    expect(request.slots.fields.map((field) => field.name)).toEqual(expect.arrayContaining(['name', 'severity']));
  });

  it('classifies prisma / zod / webhook / status machine', () => {
    expect(classifyThinkerRequest('add a prisma model for ticket with title').intent).toBe('prisma_model');
    expect(classifyThinkerRequest('zod validation schema for invite').intent).toBe('zod_schema');
    expect(classifyThinkerRequest('hmac webhook handler for sentry').intent).toBe('webhook_handler');
    expect(classifyThinkerRequest('incident status transition state machine').intent).toBe('status_machine');
  });

  it('does not pretend to be a coding agent on unknown prompts', () => {
    const request = classifyThinkerRequest('rewrite the whole billing system and invent a parser');
    expect(request.intent).toBe('unknown');
    const output = buildThinkerOutput('rewrite the whole billing system and invent a parser');
    expect(output.explanation).toMatch(/not vibe-coding/i);
    expect(output.findings.length).toBeGreaterThan(0);
  });

  it('returns JSON that matches the Code Assist contract', () => {
    const output = buildThinkerOutput('Next.js API route CRUD for users with email and name');
    const parsed = parseCodeReview(JSON.stringify(output));
    expect(parsed.improvedCode).toMatch(/export const GET/);
    expect(parsed.improvedCode).toMatch(/requireApiContext/);
    expect(parsed.explanation).toMatch(/Where this belongs/);
    expect(parsed.findings.some((finding) => finding.severity === 'error' || finding.severity === 'warning')).toBe(true);
  });

  it('webhook stub verifies HMAC and does not hard-code a secret', () => {
    const output = buildThinkerOutput('inbound webhook hmac signature verify');
    expect(output.improvedCode).toMatch(/timingSafeEqual/);
    expect(output.improvedCode).not.toMatch(/sk_live|whsec_/);
  });
});
