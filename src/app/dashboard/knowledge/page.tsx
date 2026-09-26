import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { roleHasPermission } from '@/lib/permissions';
import { env } from '@/lib/env';
import { listKnowledgeSources } from '@/server/services/knowledge.service';
import { Card, CardBody, CardHeader, PageHeader } from '@/components/ui';
import { AddKnowledgeForm, FetchKnowledgeForm, KnowledgeSourceList, type KnowledgeSourceView } from '@/components/dashboard/knowledge';

export const metadata: Metadata = { title: 'Knowledge' };
export const dynamic = 'force-dynamic';

/**
 * V6 — the organization's knowledge base.
 *
 * This is where RAG lives: documents are chunked and embedded on this server by ARCH's own
 * embedding space, and Copilot drafts cite the passages they were grounded in. There is no external
 * vector database and no embedding API — the "external database" is your own Postgres, and the
 * embeddings are produced in-process.
 */
export default async function KnowledgePage() {
  const { user, organization } = await requireDashboardContext();

  const canManage = roleHasPermission(organization.role, 'knowledge.manage');
  const canDelete = roleHasPermission(organization.role, 'knowledge.delete');
  const sources = await listKnowledgeSources({ organizationId: organization.id, userId: user.id });

  const views: KnowledgeSourceView[] = sources.map((source) => ({
    id: source.id,
    name: source.name,
    kind: source.kind,
    status: source.status,
    sourceUrl: source.sourceUrl,
    chunkCount: source.chunkCount,
    tokenCount: source.tokenCount,
    error: source.error,
    createdAt: source.createdAt,
  }));

  const totalChunks = views.reduce((sum, source) => sum + source.chunkCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge"
        description="Runbooks and docs ARCH can cite. Everything is embedded on your server — incident data and code never leave it."
      />

      <Card>
        <CardHeader
          title="Indexed documents"
          description={`${views.length} source${views.length === 1 ? '' : 's'} · ${totalChunks} retrievable chunk${totalChunks === 1 ? '' : 's'}`}
        />
        <CardBody className="space-y-4">
          <KnowledgeSourceList sources={views} canDelete={canDelete} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Add knowledge" description="A runbook is only useful if the on-call engineer can add it at 3am." />
        <CardBody className="space-y-4">
          <AddKnowledgeForm canManage={canManage} />
          <FetchKnowledgeForm enabled={!env.ARCH_OFFLINE_ONLY} canManage={canManage} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="How it is used" />
        <CardBody className="space-y-2 text-sm text-slate-400">
          <p>
            When a responder asks Copilot for a summary, triage, status update, postmortem or code fix, ARCH
            retrieves the most relevant passages from this page and cites them by name in the draft — and
            marks them as hypotheses when they are not confirmed by your timeline.
          </p>
          <p>
            Retrieval is hybrid: dense similarity over ARCH's own embeddings catches a runbook that describes
            the same failure in different words, and keyword matching keeps exact error codes and service
            names findable.
          </p>
          <p className="text-xs text-slate-500">
            Removing a document removes its chunks immediately — there is nothing left to retrieve.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
