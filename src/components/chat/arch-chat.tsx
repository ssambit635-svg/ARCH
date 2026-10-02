'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AI_NAME } from '@/lib/brand';
import { Dialog } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { IconBook, IconChat, IconCopy, IconDownload, IconIncident, IconMemory, IconPencil, IconPlus, IconRetry, IconSearch, IconServices, IconSpark, IconTrash } from '@/components/shell/icons';

/**
 * Chat with ARCH — the conversational surface.
 *
 * Behaves like the chat product everyone already knows: a recents list on the left (new chat,
 * rename, delete, search), the transcript in the middle, follow-up chips under each answer, and a
 * composer that sends on Enter. Copy, export and "Try again" are one click away, the newest answer
 * reveals itself instead of appearing fully formed, and the shortcuts are the familiar ones
 * (`⌘/Ctrl+Shift+O` new chat, `⌘/Ctrl+K` search). Everything is stored server-side, so reloading the
 * page or coming back tomorrow shows exactly the same conversation.
 *
 * Answers come from ARCH's native engine only — no vendor API, no local LLM, no hybrid mode.
 * Workspace claims cite the source the reader can click through to.
 */

type Citation = {
  source: 'incident' | 'runbook' | 'past_incident' | 'pattern' | 'service' | 'workspace' | 'playbook' | 'reference';
  label: string;
  detail?: string;
  href?: string;
  similarity?: number;
};

type Message = {
  id: string;
  role: 'USER' | 'ARCH';
  content: string;
  intent: string | null;
  confidence: string | null;
  citations: Citation[];
  suggestions: string[];
  model: string | null;
  latencyMs: number | null;
  feedbackRating: 'UP' | 'DOWN' | null;
  createdAt: string;
};

/** What ARCH actually remembers about the signed-in member (V9) — the panel shows the truth. */
type MemoryView = {
  hasFacts: boolean;
  userName: string | null;
  userRole: string | null;
  techStack: string[];
  notes: string[];
  summary: string;
  updatedAt: string | null;
  clearedAt: string | null;
  limits: { maxNotes: number; maxNoteChars: number; maxStack: number };
};

type Session = {
  id: string;
  title: string;
  titleSource: 'AUTO' | 'USER';
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  preview: string | null;
};

const SOURCE_LABEL: Record<Citation['source'], string> = {
  incident: 'Incident',
  runbook: 'Runbook',
  past_incident: 'Past incident',
  pattern: 'Pattern library',
  service: 'Service',
  workspace: 'Workspace',
  playbook: 'Playbook',
  reference: 'Tech pack',
};

const SOURCE_ICON: Record<Citation['source'], string> = {
  incident: '◆',
  runbook: '❖',
  past_incident: '↻',
  pattern: '◈',
  service: '▣',
  workspace: '▤',
  playbook: '✦',
  reference: '⌘',
};

const INTENT_LABEL: Record<string, string> = {
  open_incidents: 'open incidents',
  recent_incidents: 'history',
  incident_search: 'history search',
  explain_incident: 'incident detail',
  lessons: 'lessons',
  stats: 'numbers',
  services: 'services',
  team: 'team',
  runbook: 'knowledge base',
  advice: 'ops advice',
  greet: 'hello',
  thanks: 'thanks',
  smalltalk: 'small talk',
  identity: 'about me',
  help: 'capabilities',
  code_request: 'code (declined)',
  datetime: 'date & time',
  workflow_guide: 'getting started',
  tech_stack_advice: 'tech stack advice',
  memory_store: 'memory saved',
  memory_recall: 'memory',
  memory_clear: 'memory cleared',
  concept_explain: 'concept',
  tech_fact: 'tech knowledge',
  health_summary: 'system health',
  unknown: 'best effort',
};

// ---------------------------------------------------------------- markdown-lite

/** `**bold**` and `` `code` `` only — the engine's own output, rendered as React nodes (no HTML). */
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={`${keyPrefix}-b${index}`} className="arch-chat-strong">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code key={`${keyPrefix}-c${index}`} className="arch-chat-inline-code">
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = match.index + token.length;
    index += 1;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="arch-chat-rich-text">
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        if (/^[•\-*]\s/.test(trimmed)) {
          return (
            <div key={lineIndex} className="flex gap-2 pl-0.5">
              <span aria-hidden className="arch-chat-list-marker">•</span>
              <p className="flex-1">{inline(trimmed.replace(/^[•\-*]\s/, ''), `l${lineIndex}`)}</p>
            </div>
          );
        }
        if (/^\d+\.\s/.test(trimmed)) {
          const [number, ...rest] = trimmed.split(/\.\s/);
          return (
            <div key={lineIndex} className="flex gap-2 pl-0.5">
              <span aria-hidden className="arch-chat-list-marker tnum">{number}.</span>
              <p className="flex-1">{inline(rest.join('. '), `n${lineIndex}`)}</p>
            </div>
          );
        }
        return (
          <p key={lineIndex} className={trimmed.startsWith('**') && trimmed.endsWith('**') ? 'pt-1' : undefined}>
            {inline(trimmed, `p${lineIndex}`)}
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- reveal

/**
 * The newest answer arrives all at once (the engine is a retrieval pass, not a token stream), so it
 * is revealed over a few hundred milliseconds — the same "it is writing" feel, honestly produced.
 * Respects `prefers-reduced-motion`, and older messages render instantly on load.
 */
function RevealAnswer({ text, animate }: { text: string; animate: boolean }) {
  const [visible, setVisible] = useState(animate ? 0 : text.length);

  useEffect(() => {
    if (!animate) {
      setVisible(text.length);
      return;
    }
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVisible(text.length);
      return;
    }
    const duration = Math.min(900, Math.max(260, text.length * 2.2));
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      setVisible(Math.floor(progress * text.length));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, text]);

  return <RichText text={visible >= text.length ? text : text.slice(0, visible)} />;
}

// ---------------------------------------------------------------- helpers

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message ?? 'Something went wrong. Try again.');
  return payload.data as T;
}

/** Copy without a library, and without silently failing in an insecure context. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(area);
      return copied;
    } catch {
      return false;
    }
  }
}

/** The transcript as Markdown — what a user would paste into a postmortem or a handover doc. */
function toMarkdown(session: Session | null, messages: Message[]): string {
  const lines: string[] = [`# ${session?.title ?? 'Chat with ARCH'}`, ''];
  lines.push(`_Exported from ARCH on ${new Date().toISOString().slice(0, 10)} · ${messages.length} messages · answers grounded on this workspace._`, '');
  for (const message of messages) {
    lines.push(message.role === 'USER' ? '**You**' : `**${AI_NAME}**`, '', message.content, '');
    if (message.role === 'ARCH' && message.citations.length) {
      lines.push(`Sources: ${message.citations.map((citation) => citation.label).join(' · ')}`, '');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

function relativeTime(iso: string): string {
  const diffMinutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Group the recents list the way chat products do. */
function groupLabel(iso: string): string {
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (days < 1) return 'Today';
  if (days < 2) return 'Yesterday';
  if (days < 7) return 'Previous 7 days';
  if (days < 30) return 'Previous 30 days';
  return 'Older';
}

const EXAMPLES = [
  'What is open right now?',
  'What is the date today?',
  'What should I do in here?',
  'Have we seen a database timeout before?',
  'Which language should I use for microservices?',
  'Redis misses are spiking — what should I check?',
];

export function ArchChat({
  initialSessions,
  initialMemory,
  canChat,
  engineLabel,
  engineProvider,
  workspaceName,
  modelVersion,
  modelTrained,
  incidentsTracked,
  knowledgeChunks,
  servicesTracked,
}: {
  initialSessions: Session[];
  initialMemory: MemoryView;
  canChat: boolean;
  engineLabel: string;
  engineProvider: string;
  workspaceName: string;
  modelVersion: number | null;
  modelTrained: boolean;
  incidentsTracked: number;
  knowledgeChunks: number;
  servicesTracked: number;
}) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [activeId, setActiveId] = useState<string | null>(initialSessions[0]?.id ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Session | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  /** True while the last answer is being regenerated ("Try again"). */
  const [retrying, setRetrying] = useState(false);
  const [feedbackBusyId, setFeedbackBusyId] = useState<string | null>(null);
  /** The one message that should reveal itself; everything else renders instantly. */
  const [animateId, setAnimateId] = useState<string | null>(null);
  /** V9 memory panel: what ARCH remembers about this member, and the note being typed. */
  const [memory, setMemory] = useState<MemoryView>(initialMemory);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memoryNote, setMemoryNote] = useState('');
  const [memoryBusy, setMemoryBusy] = useState(false);
  const didInit = useRef(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions.find((session) => session.id === activeId) ?? null;

  // Open the most recent conversation once on mount, so returning users see where they left off.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const first = initialSessions[0];
    if (!first) return;
    let cancelled = false;
    setLoading(true);
    request<{ messages: Message[] }>(`/api/copilot/chat/sessions/${first.id}`)
      .then((data) => {
        if (!cancelled) setMessages(data.messages);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Mount-only: `initialSessions` is the server-rendered first page of the recents list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: messages.length > 2 ? 'smooth' : 'auto' });
  }, [messages, sending]);

  useEffect(() => {
    if (listOpen) searchRef.current?.focus({ preventScroll: true });
  }, [listOpen]);

  const openSession = useCallback(
    async (id: string) => {
      setActiveId(id);
      setListOpen(false);
      setError(null);
      setAnimateId(null);
      setLoading(true);
      try {
        const data = await request<{ messages: Message[] }>(`/api/copilot/chat/sessions/${id}`);
        setMessages(data.messages);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not open that chat.');
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const newChat = useCallback(async () => {
    setError(null);
    // Reuse the blank conversation instead of piling up empty "New chat" rows.
    const blank = sessions.find((session) => session.messageCount === 0 && session.titleSource === 'AUTO');
    if (blank) {
      setActiveId(blank.id);
      setMessages([]);
      setListOpen(false);
      inputRef.current?.focus();
      return;
    }
    try {
      const session = await request<Session>('/api/copilot/chat/sessions', { method: 'POST', body: JSON.stringify({}) });
      setSessions((previous) => [session, ...previous]);
      setActiveId(session.id);
      setMessages([]);
      setListOpen(false);
      inputRef.current?.focus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start a new chat.');
    }
  }, [sessions]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sending || !canChat) return;
      setSending(true);
      setError(null);
      setInput('');

      // Optimistic user bubble with a temporary id; replaced by the server row when it answers.
      const temporaryId = `pending-${Date.now()}`;
      setMessages((previous) => [
        ...previous,
        { id: temporaryId, role: 'USER', content, intent: null, confidence: null, citations: [], suggestions: [], model: null, latencyMs: null, feedbackRating: null, createdAt: new Date().toISOString() },
      ]);

      try {
        // A brand-new conversation is created on the first message — nothing empty is stored.
        let sessionId = activeId;
        if (!sessionId) {
          const session = await request<Session>('/api/copilot/chat/sessions', { method: 'POST', body: JSON.stringify({}) });
          sessionId = session.id;
          setSessions((previous) => [session, ...previous]);
          setActiveId(session.id);
        }
        const result = await request<{ session: Session; userMessage: Message; archMessage: Message; memoryCleared: boolean }>(
          `/api/copilot/chat/sessions/${sessionId}/messages`,
          { method: 'POST', body: JSON.stringify({ content }) },
        );
        if (result.memoryCleared) {
          toast('Memory cleared — ARCH no longer remembers anything about you.');
          setMemory((previous) => ({ ...previous, hasFacts: false, userName: null, userRole: null, techStack: [], notes: [], summary: 'Nothing saved yet' }));
        } else {
          // A turn can add facts ("remember that ..."), so the panel must not show a stale list.
          void refreshMemory();
        }
        setMessages((previous) => [...previous.filter((message) => message.id !== temporaryId), result.userMessage, result.archMessage]);
        setSessions((previous) => {
          const others = previous.filter((session) => session.id !== result.session.id);
          return [{ ...result.session, preview: result.session.preview ?? null }, ...others];
        });
        setAnimateId(result.archMessage.id);
      } catch (cause) {
        setMessages((previous) => previous.filter((message) => message.id !== temporaryId));
        setInput(content);
        setError(cause instanceof Error ? cause.message : 'ARCH could not answer that.');
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [activeId, canChat, sending],
  );

  /**
   * "Try again" — re-answer the last question against the workspace as it is right now. The server
   * rewrites the stored answer in place, so the transcript keeps its shape and we swap the row in.
   */
  const regenerate = useCallback(async () => {
    if (!activeId || !canChat || sending || retrying) return;
    setRetrying(true);
    setError(null);
    try {
      const result = await request<{ session: Session; archMessage: Message }>(
        `/api/copilot/chat/sessions/${activeId}/regenerate`,
        { method: 'POST' },
      );
      setMessages((previous) => previous.map((message) => (message.id === result.archMessage.id ? result.archMessage : message)));
      // A retry is not a new message: the conversation keeps its place in the recents list.
      setSessions((previous) => previous.map((session) => (session.id === result.session.id ? { ...result.session, preview: result.session.preview ?? null } : session)));
      setAnimateId(result.archMessage.id);
      toast('Answer regenerated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ARCH could not regenerate that answer.');
    } finally {
      setRetrying(false);
    }
  }, [activeId, canChat, sending, retrying]);

  const rateAnswer = useCallback(async (message: Message, rating: 'UP' | 'DOWN') => {
    if (!activeId || !canChat || sending || feedbackBusyId) return;
    const nextRating = message.feedbackRating === rating ? null : rating;
    setFeedbackBusyId(message.id);
    try {
      const result = await request<{ messageId: string; rating: 'UP' | 'DOWN' | null }>(
        `/api/copilot/chat/sessions/${activeId}/messages/${message.id}/feedback`,
        { method: 'PATCH', body: JSON.stringify({ rating: nextRating }) },
      );
      setMessages((previous) => previous.map((item) => item.id === message.id ? { ...item, feedbackRating: result.rating } : item));
      toast(result.rating ? 'Thanks — feedback saved.' : 'Feedback removed.');
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Could not save feedback.', 'error');
    } finally {
      setFeedbackBusyId(null);
    }
  }, [activeId, canChat, sending, feedbackBusyId]);

  const copyChat = useCallback(async () => {
    const copied = await copyText(toMarkdown(activeSession, messages));
    toast(copied ? 'Chat copied as Markdown.' : 'Copy failed — select the text instead.', copied ? 'success' : 'error');
  }, [activeSession, messages]);

  const exportChat = useCallback(() => {
    const markdown = toMarkdown(activeSession, messages);
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    const name = (activeSession?.title ?? 'arch-chat').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'arch-chat';
    link.href = url;
    link.download = `${name}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast('Chat exported as Markdown.');
  }, [activeSession, messages]);

  // The shortcuts every chat product has: new chat, search, close.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        void newChat();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setListOpen(true);
        searchRef.current?.focus();
        return;
      }
      if (event.key === 'Escape') {
        setListOpen(false);
        setContextOpen(false);
        setRenaming(null);
        setConfirmDelete(null);
        setConfirmClear(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [newChat]);

  // ---------------- V9 memory panel ----------------

  /** Re-read what ARCH remembers (after a turn that may have saved something). */
  const refreshMemory = useCallback(async () => {
    try {
      setMemory(await request<MemoryView>('/api/copilot/chat/memory'));
    } catch {
      // The panel is a convenience; a failed refresh must never break the conversation.
    }
  }, []);

  const saveMemoryNote = useCallback(async () => {
    const note = memoryNote.trim();
    if (note.length < 3 || memoryBusy) return;
    setMemoryBusy(true);
    try {
      setMemory(await request<MemoryView>('/api/copilot/chat/memory', { method: 'PATCH', body: JSON.stringify({ notes: { add: note } }) }));
      setMemoryNote('');
      toast('ARCH will remember that.');
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Could not save that.', 'error');
    } finally {
      setMemoryBusy(false);
    }
  }, [memoryNote, memoryBusy]);

  const forgetMemoryItem = useCallback(async (payload: { notes?: { remove: string }; clearStack?: boolean; userName?: null; userRole?: null }) => {
    if (memoryBusy) return;
    setMemoryBusy(true);
    try {
      setMemory(await request<MemoryView>('/api/copilot/chat/memory', { method: 'PATCH', body: JSON.stringify(payload) }));
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Could not update memory.', 'error');
    } finally {
      setMemoryBusy(false);
    }
  }, [memoryBusy]);

  const forgetEverything = useCallback(async () => {
    if (memoryBusy) return;
    setMemoryBusy(true);
    try {
      setMemory(await request<MemoryView>('/api/copilot/chat/memory', { method: 'DELETE' }));
      toast('Memory wiped. ARCH remembers nothing about you now.');
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Could not clear memory.', 'error');
    } finally {
      setMemoryBusy(false);
    }
  }, [memoryBusy]);

  const rename = useCallback(async () => {
    if (!renaming) return;
    const title = renaming.value.trim();
    if (!title) {
      setRenaming(null);
      return;
    }
    try {
      await request(`/api/copilot/chat/sessions/${renaming.id}`, { method: 'PATCH', body: JSON.stringify({ title }) });
      setSessions((previous) => previous.map((session) => (session.id === renaming.id ? { ...session, title, titleSource: 'USER' } : session)));
      toast('Chat renamed.');
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Could not rename that chat.', 'error');
    } finally {
      setRenaming(null);
    }
  }, [renaming]);

  const remove = useCallback(
    async (session: Session) => {
      try {
        await request(`/api/copilot/chat/sessions/${session.id}`, { method: 'DELETE' });
        setSessions((previous) => previous.filter((item) => item.id !== session.id));
        if (activeId === session.id) {
          setActiveId(null);
          setMessages([]);
        }
        toast('Chat deleted.');
      } catch (cause) {
        toast(cause instanceof Error ? cause.message : 'Could not delete that chat.', 'error');
      } finally {
        setConfirmDelete(null);
      }
    },
    [activeId],
  );

  const clearAll = useCallback(async () => {
    try {
      await request('/api/copilot/chat/sessions', { method: 'DELETE' });
      setSessions([]);
      setActiveId(null);
      setMessages([]);
      toast('All chats cleared.');
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Could not clear chats.', 'error');
    } finally {
      setConfirmClear(false);
    }
  }, []);

  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter((session) => session.title.toLowerCase().includes(query) || (session.preview ?? '').toLowerCase().includes(query));
  }, [filter, sessions]);

  const grouped = useMemo(() => {
    const groups: { label: string; items: Session[] }[] = [];
    for (const session of filtered) {
      const label = groupLabel(session.lastMessageAt);
      const current = groups[groups.length - 1];
      if (current?.label === label) current.items.push(session);
      else groups.push({ label, items: [session] });
    }
    return groups;
  }, [filtered]);

  const lastSuggestions = [...messages].reverse().find((message) => message.role === 'ARCH' && message.suggestions.length)?.suggestions ?? [];
  const hasWorkspaceContext = incidentsTracked + knowledgeChunks + servicesTracked > 0;
  const providerLabel = engineProvider === 'mock' ? 'Mock provider' : 'ARCH native engine';

  return (
    <div className="arch-ai-workspace">
      {/* Conversation history */}
      <aside className={`arch-chat-history${listOpen ? ' is-open' : ''}`} aria-label="Conversation history">
        <div className="arch-chat-history-header">
          <div className="arch-chat-history-heading">
            <p className="arch-chat-overline">ARCH AI</p>
            <h2>Conversations</h2>
          </div>
          <button
            type="button"
            onClick={() => void newChat()}
            disabled={!canChat}
            className="arch-chat-new-button"
          >
            <IconPlus className="size-4" />
            <span>New chat</span>
          </button>
          <button
            type="button"
            onClick={() => setListOpen(false)}
            className="arch-chat-close-history"
            aria-label="Close conversation history"
            title="Close conversation history"
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <label className="arch-chat-search">
          <IconSearch className="arch-chat-search-icon" />
          <input
            ref={searchRef}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
          />
          <span className="arch-chat-search-shortcut" aria-hidden>⌘K</span>
        </label>

        <div className="arch-chat-history-list">
          {grouped.length === 0 ? (
            <p className="arch-chat-history-empty" aria-live="polite">
              {sessions.length === 0 ? 'Your conversations will appear here.' : 'No conversations match that search.'}
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="arch-chat-history-group">
                <p className="arch-chat-history-group-label">{group.label}</p>
                <ul className="arch-chat-history-items">
                  {group.items.map((session) => {
                    const active = session.id === activeId;
                    const isRenaming = renaming?.id === session.id;
                    return (
                      <li key={session.id} className="arch-chat-history-row">
                        {isRenaming ? (
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              void rename();
                            }}
                          >
                            <input
                              autoFocus
                              value={renaming.value}
                              maxLength={60}
                              aria-label={`Rename ${session.title}`}
                              onChange={(event) => setRenaming({ id: session.id, value: event.target.value })}
                              onBlur={() => void rename()}
                              onKeyDown={(event) => {
                                if (event.key === 'Escape') setRenaming(null);
                              }}
                              className="arch-chat-rename-input"
                            />
                          </form>
                        ) : (
                          <div className={`arch-chat-session${active ? ' is-active' : ''}`}>
                            <button
                              type="button"
                              onClick={() => void openSession(session.id)}
                              className="arch-chat-session-open"
                              title={session.title}
                              aria-current={active ? 'page' : undefined}
                            >
                              <IconChat className="arch-chat-session-icon" />
                              <span className="arch-chat-session-copy">
                                <span className="arch-chat-session-title">{session.title}</span>
                                <span className="arch-chat-session-preview">{session.preview || relativeTime(session.lastMessageAt)}</span>
                              </span>
                            </button>
                            {canChat ? (
                              <span className="arch-chat-session-actions">
                                <button
                                  type="button"
                                  onClick={() => setRenaming({ id: session.id, value: session.title })}
                                  className="arch-chat-icon-button"
                                  aria-label={`Rename ${session.title}`}
                                  title="Rename conversation"
                                >
                                  <IconPencil className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(session)}
                                  className="arch-chat-icon-button is-danger"
                                  aria-label={`Delete ${session.title}`}
                                  title="Delete conversation"
                                >
                                  <IconTrash className="size-3.5" />
                                </button>
                              </span>
                            ) : null}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        {canChat && sessions.length > 0 ? (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="arch-chat-clear-button"
          >
            <IconTrash className="size-3.5" />
            <span>Clear all conversations</span>
            <span className="arch-chat-clear-count">{sessions.length}</span>
          </button>
        ) : null}
      </aside>

      {listOpen ? (
        <button
          type="button"
          className="arch-chat-history-scrim"
          onClick={() => setListOpen(false)}
          aria-label="Close conversation history"
        />
      ) : null}

      <section className="arch-chat-console" aria-label="Chat with ARCH">
        <header className="arch-chat-toolbar">
          <div className="arch-chat-toolbar-primary">
            <button
              type="button"
              onClick={() => {
                setContextOpen(false);
                setListOpen(true);
              }}
              className="arch-chat-mobile-history-button"
              aria-label="Open conversation history"
            >
              <IconChat className="size-4" />
              <span>Chats</span>
            </button>
            <div className="arch-chat-toolbar-title">
              <div className="arch-chat-toolbar-kicker">
                <span className="arch-chat-live-dot" aria-hidden />
                <span>AI workspace</span>
                <span className="arch-chat-toolbar-separator" aria-hidden>·</span>
                <span className="arch-chat-toolbar-workspace">{workspaceName}</span>
              </div>
              <h2 title={activeSession?.title ?? 'New conversation'}>{activeSession?.title ?? 'New conversation'}</h2>
            </div>
          </div>

          <div className="arch-chat-toolbar-actions">
            <span className="arch-chat-engine-badge" title={`${providerLabel} · ${engineLabel}`}>
              <span className="arch-chat-engine-mark" aria-hidden />
              <span>{AI_NAME}</span>
              <span className="arch-chat-engine-model">{engineLabel}</span>
            </span>
            <button
              type="button"
              onClick={() => setContextOpen((value) => !value)}
              className={`arch-chat-toolbar-button arch-chat-context-toggle${contextOpen ? ' is-active' : ''}`}
              aria-expanded={contextOpen}
              aria-label="Toggle workspace context"
              title="Workspace context"
            >
              <IconBook className="size-4" />
              <span>Context</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMemoryOpen(true);
                void refreshMemory();
              }}
              title="What ARCH remembers about you"
              aria-label="Open ARCH memory settings"
              className="arch-chat-toolbar-button"
            >
              <IconMemory className="size-4" />
              <span>Memory</span>
              {memory.hasFacts ? <span className="arch-chat-memory-indicator" aria-label="Memory has saved facts" /> : null}
            </button>
            {messages.length > 0 ? (
              <button type="button" onClick={() => void copyChat()} title="Copy this conversation as Markdown" aria-label="Copy conversation" className="arch-chat-toolbar-button arch-chat-toolbar-button--compact">
                <IconCopy className="size-4" />
                <span>Copy</span>
              </button>
            ) : null}
            {messages.length > 0 ? (
              <button type="button" onClick={exportChat} title="Download this conversation as a Markdown file" aria-label="Export conversation" className="arch-chat-toolbar-button arch-chat-toolbar-button--compact">
                <IconDownload className="size-4" />
                <span>Export</span>
              </button>
            ) : null}
            {activeSession && canChat ? (
              <button
                type="button"
                onClick={() => setRenaming({ id: activeSession.id, value: activeSession.title })}
                className="arch-chat-toolbar-button arch-chat-toolbar-button--compact"
                title="Rename conversation"
                aria-label="Rename conversation"
              >
                <IconPencil className="size-4" />
                <span>Rename</span>
              </button>
            ) : null}
          </div>
        </header>

        <div className="arch-chat-body">
          <main className="arch-chat-conversation">
            <div className="arch-chat-transcript" aria-label="Conversation messages">
              {messages.length === 0 && !loading ? (
                <div className="arch-chat-empty">
                  <div className="arch-chat-empty-brand">
                    <span className="arch-chat-empty-mark"><img src="/dragon-mark.webp" alt="" /></span>
                    <span className="arch-chat-empty-brand-copy">
                      <span>{AI_NAME}</span>
                      <span>Operations intelligence</span>
                    </span>
                  </div>
                  <p className="arch-chat-empty-eyebrow">Your workspace, in context</p>
                  <h1>What do you need to understand?</h1>
                  <p className="arch-chat-empty-description">
                    Ask about active incidents, earlier fixes, service health, or runbooks. ARCH grounds answers in this workspace and links to the records it uses.
                  </p>
                  <div className="arch-chat-empty-scope" aria-label="Available workspace records">
                    <span><IconIncident className="size-3.5" /> {incidentsTracked} incidents</span>
                    <span><IconBook className="size-3.5" /> {knowledgeChunks} knowledge records</span>
                    <span><IconServices className="size-3.5" /> {servicesTracked} services</span>
                  </div>
                  <p className="arch-chat-prompts-label">Try one of these</p>
                  <div className="arch-chat-prompt-grid">
                    {EXAMPLES.map((example) => (
                      <button
                        key={example}
                        type="button"
                        disabled={!canChat}
                        onClick={() => void send(example)}
                        className="arch-chat-prompt"
                      >
                        <span className="arch-chat-prompt-icon"><IconChat className="size-4" /></span>
                        <span>{example}</span>
                        <span className="arch-chat-prompt-arrow" aria-hidden>↗</span>
                      </button>
                    ))}
                  </div>
                  <p className="arch-chat-empty-footnote">English and Hindi / Hinglish are welcome. ARCH advises; it never changes production on its own.</p>
                </div>
              ) : null}

              {loading ? (
                <p className="arch-chat-loading" role="status" aria-live="polite">
                  <span className="arch-chat-loading-mark"><span /><span /><span /></span>
                  Opening conversation…
                </p>
              ) : null}

              <div className="arch-chat-thread">
                {messages.map((message, index) => {
                  const isLastAnswer = message.role === 'ARCH' && index === messages.length - 1;
                  return message.role === 'USER' ? (
                    <article key={message.id} className="arch-chat-message arch-chat-message--user">
                      <div className="arch-chat-message-meta">
                        <span>You</span>
                        <time dateTime={message.createdAt}>{relativeTime(message.createdAt)}</time>
                      </div>
                      <div className="arch-chat-user-bubble">{message.content}</div>
                    </article>
                  ) : (
                    <article key={message.id} className="arch-chat-message arch-chat-message--assistant">
                      <div className="arch-chat-assistant-heading">
                        <span className="arch-chat-assistant-avatar"><img src="/dragon-mark.webp" alt="" /></span>
                        <span className="arch-chat-assistant-name">{AI_NAME}</span>
                        <span className="arch-chat-assistant-label">Assistant</span>
                        <time dateTime={message.createdAt}>{relativeTime(message.createdAt)}</time>
                      </div>
                      <div className="arch-chat-answer">
                        <RevealAnswer text={message.content} animate={message.id === animateId} />
                      </div>

                      {message.citations.length ? (
                        <div className="arch-chat-sources-block">
                          <p className="arch-chat-detail-label">Sources used</p>
                          <ul className="arch-chat-source-list">
                            {message.citations.map((citation, citationIndex) => {
                              const source = (
                                <>
                                  <span className="arch-chat-source-icon" aria-hidden>{SOURCE_ICON[citation.source]}</span>
                                  <span className="arch-chat-source-copy">
                                    <span className="arch-chat-source-title">{citation.label}</span>
                                    <span className="arch-chat-source-type">{SOURCE_LABEL[citation.source]}</span>
                                  </span>
                                  {typeof citation.similarity === 'number' ? (
                                    <span className="arch-chat-source-match">{Math.round(citation.similarity * 100)}%</span>
                                  ) : null}
                                </>
                              );
                              return (
                                <li key={`${message.id}-c${citationIndex}`}>
                                  {citation.href ? (
                                    <a href={citation.href} className="arch-chat-source" title={citation.detail}>{source}</a>
                                  ) : (
                                    <span className="arch-chat-source" title={citation.detail}>{source}</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null}

                      {(message.intent || message.confidence || typeof message.latencyMs === 'number' || message.model) ? (
                        <div className="arch-chat-answer-meta">
                          {message.intent ? <span>{INTENT_LABEL[message.intent] ?? message.intent.replace(/_/g, ' ')}</span> : null}
                          {message.confidence ? <span>{message.confidence} confidence</span> : null}
                          {typeof message.latencyMs === 'number' ? <span>{message.latencyMs} ms</span> : null}
                          {message.model ? <span className="arch-mono">{message.model}</span> : null}
                        </div>
                      ) : null}

                      <div className="arch-chat-answer-actions">
                        <button
                          type="button"
                          onClick={async () => {
                            const copied = await copyText(message.content);
                            toast(copied ? 'Answer copied.' : 'Copy failed — select the text instead.', copied ? 'success' : 'error');
                          }}
                          className="arch-chat-message-action"
                          aria-label="Copy answer"
                        >
                          <IconCopy className="size-3.5" /> Copy
                        </button>
                        {canChat ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void rateAnswer(message, 'UP')}
                              disabled={sending || feedbackBusyId !== null}
                              aria-label="This answer was helpful"
                              aria-pressed={message.feedbackRating === 'UP'}
                              title="Rate this answer as helpful"
                              className={`arch-chat-message-action${message.feedbackRating === 'UP' ? ' is-selected' : ''}`}
                            >
                              ↑ Helpful
                            </button>
                            <button
                              type="button"
                              onClick={() => void rateAnswer(message, 'DOWN')}
                              disabled={sending || feedbackBusyId !== null}
                              aria-label="This answer was not helpful"
                              aria-pressed={message.feedbackRating === 'DOWN'}
                              title="Rate this answer as not helpful"
                              className={`arch-chat-message-action${message.feedbackRating === 'DOWN' ? ' is-selected' : ''}`}
                            >
                              ↓ Not helpful
                            </button>
                          </>
                        ) : null}
                        {isLastAnswer && canChat ? (
                          <button
                            type="button"
                            onClick={() => void regenerate()}
                            disabled={sending || retrying}
                            title="Ask the same question again using the current workspace data"
                            className="arch-chat-message-action"
                          >
                            <IconRetry className={`size-3.5${retrying ? ' animate-spin' : ''}`} />
                            {retrying ? 'Retrying…' : 'Try again'}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}

                {sending ? (
                  <div className="arch-chat-generating" role="status" aria-live="polite">
                    <span className="arch-chat-assistant-avatar"><img src="/dragon-mark.webp" alt="" /></span>
                    <span className="arch-chat-generating-card">
                      <span className="arch-chat-loading-mark"><span /><span /><span /></span>
                      Reading workspace context…
                    </span>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>
            </div>

            {error ? <div className="arch-chat-error" role="alert">{error}</div> : null}

            {lastSuggestions.length > 0 && !sending ? (
              <div className="arch-chat-followups" aria-label="Suggested follow-up questions">
                <span className="arch-chat-followups-label">Next</span>
                {lastSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={!canChat}
                    onClick={() => void send(suggestion)}
                    className="arch-chat-followup"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            <form
              className="arch-chat-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void send(input);
              }}
            >
              <div className="arch-chat-composer-frame">
                <textarea
                  ref={inputRef}
                  value={input}
                  rows={1}
                  maxLength={1200}
                  disabled={!canChat || sending}
                  onChange={(event) => {
                    setInput(event.target.value);
                    const element = event.target;
                    element.style.height = 'auto';
                    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void send(input);
                    }
                  }}
                  placeholder={canChat ? 'Ask about incidents, services, or runbooks…' : 'You need RESPONDER or above to chat with ARCH.'}
                  aria-label={`Message ${AI_NAME}`}
                  className="arch-chat-composer-input"
                />
                <div className="arch-chat-composer-footer">
                  <span className="arch-chat-composer-hint">
                    <span>{input.length}/1200</span>
                    <span>Enter to send <span aria-hidden>·</span> Shift + Enter for a new line</span>
                  </span>
                  <button
                    type="submit"
                    disabled={!canChat || sending || input.trim().length < 2}
                    className="arch-chat-send-button"
                    aria-label="Send message"
                  >
                    <span>Send</span>
                    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 8h9M8 3l5 5-5 5" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="arch-chat-disclaimer">Workspace answers cite their sources when available. ARCH advises — it does not apply changes or write code in this chat.</p>
            </form>
          </main>

          {contextOpen ? (
            <button
              type="button"
              className="arch-chat-context-scrim"
              onClick={() => setContextOpen(false)}
              aria-label="Close workspace context"
            />
          ) : null}

          <aside className={`arch-chat-context${contextOpen ? ' is-open' : ''}`} aria-label="Workspace context">
            <div className="arch-chat-context-header">
              <div>
                <p className="arch-chat-overline">Workspace</p>
                <h3>Context</h3>
              </div>
              <button
                type="button"
                className="arch-chat-close-context"
                onClick={() => setContextOpen(false)}
                aria-label="Close workspace context"
              >
                <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>

            <div className="arch-chat-context-content">
              <section className="arch-chat-context-workspace">
                <div className="arch-chat-context-workspace-mark"><img src="/dragon-mark.webp" alt="" /></div>
                <div className="arch-chat-context-workspace-copy">
                  <span>Current workspace</span>
                  <strong title={workspaceName}>{workspaceName}</strong>
                </div>
                <span className={`arch-chat-context-state${hasWorkspaceContext ? ' is-ready' : ''}`}>
                  <span aria-hidden />{hasWorkspaceContext ? 'Available' : 'Empty'}
                </span>
              </section>

              <section className="arch-chat-context-section" aria-labelledby="arch-context-data-title">
                <div className="arch-chat-context-section-heading">
                  <h4 id="arch-context-data-title">Available data</h4>
                  <span>IN SCOPE</span>
                </div>
                <dl className="arch-chat-context-stats">
                  <div><dt><IconIncident className="size-3.5" /> Incidents</dt><dd>{incidentsTracked}</dd></div>
                  <div><dt><IconBook className="size-3.5" /> Knowledge</dt><dd>{knowledgeChunks}</dd></div>
                  <div><dt><IconServices className="size-3.5" /> Services</dt><dd>{servicesTracked}</dd></div>
                </dl>
              </section>

              <section className="arch-chat-context-section arch-chat-model-card" aria-label="AI model details">
                <div className="arch-chat-context-section-heading">
                  <h4>Model</h4>
                  <span className="arch-chat-model-version">v{modelVersion ?? 1}</span>
                </div>
                <div className="arch-chat-model-name-row">
                  <span className="arch-chat-model-mark"><img src="/dragon-mark.webp" alt="" /></span>
                  <span>
                    <strong>{AI_NAME}</strong>
                    <small>{providerLabel}</small>
                  </span>
                </div>
                <div className="arch-chat-model-detail"><span>Engine</span><code>{engineLabel}</code></div>
                <div className="arch-chat-model-detail"><span>Workspace training</span><span>{modelTrained ? 'Available' : 'Base model'}</span></div>
              </section>

              <section className="arch-chat-context-section arch-chat-memory-card" aria-label="Personal memory">
                <div className="arch-chat-context-section-heading">
                  <h4>Personal memory</h4>
                  {memory.hasFacts ? <span className="arch-chat-memory-indicator" aria-label="Memory has saved facts" /> : null}
                </div>
                <p>{memory.hasFacts ? memory.summary : 'No personal context saved yet.'}</p>
                <button
                  type="button"
                  onClick={() => {
                    setMemoryOpen(true);
                    void refreshMemory();
                  }}
                  className="arch-chat-manage-memory"
                >
                  <IconMemory className="size-3.5" /> Manage memory <span aria-hidden>↗</span>
                </button>
              </section>

              <p className="arch-chat-context-note">Personal memory is private to your account. Verify important guidance before acting.</p>
            </div>
          </aside>
        </div>
      </section>

      <Dialog
        open={memoryOpen}
        onClose={() => setMemoryOpen(false)}
        title="What ARCH remembers about you"
        description="Only what you told it — never guessed, never shared with your team, and never used to train the model. Everything here is yours to delete."
        className="arch-dialog--chat"
      >
        <div className="arch-chat-memory-dialog">
          <div className="arch-chat-memory-summary">
            <p className="arch-chat-modal-eyebrow">Saved profile</p>
            <p className="arch-chat-memory-summary-text">{memory.summary}</p>
            <p className="arch-chat-memory-updated">
              {memory.clearedAt ? `Last cleared ${relativeTime(memory.clearedAt)} · ` : ''}
              {memory.updatedAt ? `Updated ${relativeTime(memory.updatedAt)}` : 'Nothing stored yet'}
            </p>
          </div>

          {memory.userName || memory.userRole || memory.techStack.length ? (
            <ul className="arch-chat-memory-list">
              {memory.userName ? (
                <li><span>Name: <strong>{memory.userName}</strong></span>
                  <button type="button" disabled={!canChat || memoryBusy} onClick={() => void forgetMemoryItem({ userName: null })}>Forget</button>
                </li>
              ) : null}
              {memory.userRole ? (
                <li><span>Role: <strong>{memory.userRole}</strong></span>
                  <button type="button" disabled={!canChat || memoryBusy} onClick={() => void forgetMemoryItem({ userRole: null })}>Forget</button>
                </li>
              ) : null}
              {memory.techStack.length ? (
                <li><span>Stack: <strong>{memory.techStack.join(', ')}</strong></span>
                  <button type="button" disabled={!canChat || memoryBusy} onClick={() => void forgetMemoryItem({ clearStack: true })}>Forget</button>
                </li>
              ) : null}
            </ul>
          ) : null}

          {memory.notes.length ? (
            <ul className="arch-chat-memory-list">
              {memory.notes.map((note) => (
                <li key={note}><span>{note}</span>
                  <button type="button" disabled={!canChat || memoryBusy} onClick={() => void forgetMemoryItem({ notes: { remove: note } })}>Forget</button>
                </li>
              ))}
            </ul>
          ) : null}

          <form
            className="arch-chat-memory-form"
            onSubmit={(event) => {
              event.preventDefault();
              void saveMemoryNote();
            }}
          >
            <input
              value={memoryNote}
              onChange={(event) => setMemoryNote(event.target.value)}
              maxLength={memory.limits.maxNoteChars}
              disabled={!canChat || memoryBusy}
              placeholder="Tell ARCH something to remember"
              aria-label="Add a memory"
              className="arch-chat-memory-input"
            />
            <button type="submit" disabled={!canChat || memoryBusy || memoryNote.trim().length < 3} className="arch-chat-memory-save">
              {memoryBusy ? 'Saving…' : 'Remember'}
            </button>
          </form>

          <div className="arch-chat-memory-footer">
            <p>Up to {memory.limits.maxNotes} notes. You can also say “remember that…” or “clear memory”.</p>
            <button
              type="button"
              disabled={!canChat || memoryBusy || (!memory.hasFacts && !memory.clearedAt)}
              onClick={() => void forgetEverything()}
              className="arch-chat-forget-all"
            >
              Forget everything
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this chat?"
        description="The whole conversation disappears from your chat list. This cannot be undone."
        className="arch-dialog--chat"
      >
        <div className="arch-chat-modal-actions">
          <button type="button" onClick={() => setConfirmDelete(null)} className="arch-chat-modal-cancel">Keep it</button>
          <button type="button" onClick={() => confirmDelete && void remove(confirmDelete)} className="arch-chat-modal-danger">Delete chat</button>
        </div>
      </Dialog>

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear all your chats?"
        description={`This deletes all ${sessions.length} of your conversations in this workspace. Incidents, audit entries and the model are untouched.`}
        className="arch-dialog--chat"
      >
        <div className="arch-chat-modal-actions">
          <button type="button" onClick={() => setConfirmClear(false)} className="arch-chat-modal-cancel">Cancel</button>
          <button type="button" onClick={() => void clearAll()} className="arch-chat-modal-danger">Delete everything</button>
        </div>
      </Dialog>
    </div>
  );
}
