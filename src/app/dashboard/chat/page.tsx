import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { roleHasPermission } from '@/lib/permissions';
import { copilotConfig } from '@/server/ai/provider';
import { chatCorpusSummary, getChatMemory, listChatSessions } from '@/server/services/archChat.service';
import { Alert } from '@/components/ui';
import { ArchChat } from '@/components/chat/arch-chat';

export const metadata: Metadata = { title: 'Chat' };
export const dynamic = 'force-dynamic';

/**
 * Chat with ARCH — the conversational surface of ARCH's own model.
 *
 * A real chat: conversations are stored, listed, renamed and deleted like any other AI product,
 * and every answer is grounded on this workspace (incidents, history, runbooks, the trained model)
 * with citations the reader can click through.
 */
export default async function ChatPage() {
  const { user, organization } = await requireDashboardContext();
  const canChat = roleHasPermission(organization.role, 'copilot.generate');
  const config = copilotConfig();

  const [sessions, corpus, memory] = await Promise.all([
    listChatSessions({ organizationId: organization.id, userId: user.id }).catch(() => []),
    chatCorpusSummary({ organizationId: organization.id, userId: user.id }).catch(() => null),
    // V9: the facts ARCH actually saved for this member — the Memory panel opens on real data,
    // not an empty list that fills in a second later.
    getChatMemory({ organizationId: organization.id, userId: user.id }).catch(() => null),
  ]);

  return (
    <div className="animate-rise space-y-4">
      {!canChat ? (
        <Alert tone="info">
          Your role ({organization.role}) can read chats but not start one. RESPONDER or above can send messages; everyone who can
          read incidents can read their own conversations.
        </Alert>
      ) : null}
      {!config.enabled ? <Alert tone="error">Chat is unavailable: {config.reason}</Alert> : null}
      {corpus && corpus.incidents === 0 && corpus.knowledgeChunks === 0 ? (
        <Alert tone="info">
          This workspace has no incidents or knowledge sources yet, so ARCH has nothing to ground answers on. Declare an incident
          (or send an alert to a webhook endpoint) and ask again — the model learns from your own history, it does not invent it.
        </Alert>
      ) : null}
      <ArchChat
        initialSessions={sessions}
        initialMemory={
          memory ?? {
            hasFacts: false,
            userName: null,
            userRole: null,
            techStack: [],
            notes: [],
            summary: 'Nothing saved yet',
            updatedAt: null,
            clearedAt: null,
            limits: { maxNotes: 25, maxNoteChars: 240, maxStack: 12 },
          }
        }
        canChat={canChat && config.enabled}
        engineLabel={config.model}
        workspaceName={organization.name}
        modelVersion={corpus?.modelVersion ?? null}
        incidentsTracked={corpus?.incidents ?? 0}
      />
    </div>
  );
}
