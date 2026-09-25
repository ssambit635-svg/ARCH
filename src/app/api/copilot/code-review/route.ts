import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { codeReviewSchema } from '@/lib/validation';
import { reviewCode } from '@/server/services/codeAssist.service';

/**
 * POST — ARCH Code Assist. Body: { "code": string, "mode"?: "review" | "fix" | "explain", "language"?: string }.
 * Runs on this server only (ARCH model, or the local LLM in arch-hybrid mode). The code is not stored.
 * OWNER/ADMIN/RESPONDER; shares the per-organization Copilot rate limit.
 */
export const POST = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  const input = codeReviewSchema.parse(await request.json());
  const result = await reviewCode({ organizationId: organization.id, userId: user.id, code: input.code, mode: input.mode, language: input.language });
  return ok(result);
});
