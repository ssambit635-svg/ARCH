import { created, handleRoute } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { fixVerificationCreateSchema } from '@/lib/validation';
import { verifyFix } from '@/server/services/verifiedFix.service';
import { aiSuggestionRepository } from '@/server/repositories/aiSuggestion.repository';
import { AppError } from '@/lib/errors';

type Context = { params: Promise<{ id: string }> };

/**
 * POST — Verify an existing CODE_FIX or VERIFIED_FIX suggestion in sandbox.
 * M3: Isolated sandbox me patch + tests chalao
 * Body: { repoConnectionId?, commitSha?, patch?, testCommand? } — patch optional if suggestion has it
 */
export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = await request.json().catch(() => ({}));

  // Allow both full schema and partial (patch from suggestion)
  let patch = body.patch as string | undefined;
  let repoConnectionId = body.repoConnectionId as string | undefined;
  let commitSha = body.commitSha as string | undefined;
  let testCommand = body.testCommand as string | undefined;

  if (!patch) {
    const suggestion = await aiSuggestionRepository.findById(organization.id, id);
    if (!suggestion) throw AppError.notFound('Suggestion not found.');
    const output = suggestion.output as { patch?: string };
    if (!output.patch) throw AppError.badRequest('Suggestion has no patch to verify.');
    patch = output.patch;
  }

  // Validate patch presence via schema (but allow missing suggestionId since it's in URL)
  const parsed = fixVerificationCreateSchema.parse({
    suggestionId: id,
    repoConnectionId,
    commitSha,
    patch,
    testCommand,
  });

  // Need incidentId from suggestion
  const suggestion = await aiSuggestionRepository.findById(organization.id, id);
  if (!suggestion) throw AppError.notFound('Suggestion not found.');

  const verification = await verifyFix({
    organizationId: organization.id,
    userId: user.id,
    incidentId: suggestion.incidentId,
    suggestionId: id,
    repoConnectionId: parsed.repoConnectionId ?? null,
    commitSha: parsed.commitSha ?? null,
    patch: parsed.patch,
    testCommand: parsed.testCommand ?? null,
  });

  return created(verification);
});
