import type { NextRequest } from 'next/server';
import { clientIp, created, handleRoute, parseBody, readJson } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { registerSchema } from '@/lib/validation';
import { registerUser } from '@/server/services/auth.service';

/** POST /api/auth/register — create an account (and optionally its first organization). */
export const POST = handleRoute(async (request: NextRequest) => {
  enforceRateLimit(`register:${clientIp(request)}`, { limit: 10, windowMs: 10 * 60_000 });

  const body = parseBody(registerSchema, await readJson(request));
  const { user, organization } = await registerUser({
    email: body.email,
    password: body.password,
    name: body.name ?? null,
    organizationName: body.organizationName ?? null,
  });

  return created({
    user: { id: user.id, email: user.email, name: user.name },
    organization: organization ? { id: organization.id, name: organization.name, slug: organization.slug } : null,
  });
});
