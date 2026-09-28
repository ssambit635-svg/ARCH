'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AI_NAME } from '@/lib/brand';
import { Dialog } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { IconChat, IconCopy, IconDownload, IconMemory, IconPencil, IconPlus, IconRetry, IconSearch, IconSpark, IconTrash } from '@/components/shell/icons';

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
        <strong key={`${keyPrefix}-b${index}`} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code key={`${keyPrefix}-c${index}`} className="arch-mono rounded bg-white/[0.07] px-1 py-0.5 text-[11.5px] text-violet-200">
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
    <div className="space-y-1.5">
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        if (/^[•\-*]\s/.test(trimmed)) {
          return (
            <div key={lineIndex} className="flex gap-2 pl-0.5">
              <span aria-hidden className="mt-[3px] text-indigo-400">
                •
              </span>
              <p className="flex-1">{inline(trimmed.replace(/^[•\-*]\s/, ''), `l${lineIndex}`)}</p>
            </div>
          );
        }
        if (/^\d+\.\s/.test(trimmed)) {
          const [number, ...rest] = trimmed.split(/\.\s/);
          return (
            <div key={lineIndex} className="flex gap-2 pl-0.5">
              <span aria-hidden className="mt-[1px] tabular-nums text-indigo-400">
                {number}.
              </span>
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
  workspaceName,
  modelVersion,
  incidentsTracked,
}: {
  initialSessions: Session[];
  initialMemory: MemoryView;
  canChat: boolean;
  engineLabel: string;
  workspaceName: string;
  modelVersion: number | null;
  incidentsTracked: number;
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

  return (
    <div className="relative flex h-[calc(100dvh-9.5rem)] min-h-[32rem] gap-4 overflow-hidden">
      {/* ---------------- recents ---------------- */}
      <aside
        className={`${
          listOpen ? 'absolute inset-y-0 left-0 z-30 w-[19rem] rounded-2xl border border-white/[0.07] bg-abyss-900/95 backdrop-blur-lg' : 'hidden'
        } shrink-0 flex-col border-white/[0.07] lg:relative lg:flex lg:w-[16.5rem] lg:rounded-2xl lg:border lg:bg-abyss-900/40`}
      >
        <div className="flex items-center gap-2 border-b border-white/[0.06] p-3">
          <button
            type="button"
            onClick={() => void newChat()}
            disabled={!canChat}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-3 py-2 text-[13px] font-semibold text-white transition hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-40"
          >
            <IconPlus className="size-4" /> New chat
          </button>
          <button
            type="button"
            onClick={() => setListOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-200 lg:hidden"
            aria-label="Close conversation list"
          >
            ✕
          </button>
        </div>

        <label className="relative m-3 mb-1 block">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
          <input
            ref={searchRef}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search chats  ⌘K"
            aria-label="Search chats"
            className="w-full rounded-lg border border-white/[0.07] bg-abyss-950/70 py-1.5 pl-8 pr-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none"
          />
        </label>

        <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-2">
          {grouped.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-slate-600">{sessions.length === 0 ? 'No chats yet.' : 'Nothing matches that search.'}</p>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="mb-2">
                <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{group.label}</p>
                <ul className="space-y-0.5">
                  {group.items.map((session) => {
                    const active = session.id === activeId;
                    const isRenaming = renaming?.id === session.id;
                    return (
                      <li key={session.id} className="group/item relative">
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
                              onChange={(event) => setRenaming({ id: session.id, value: event.target.value })}
                              onBlur={() => void rename()}
                              onKeyDown={(event) => {
                                if (event.key === 'Escape') setRenaming(null);
                              }}
                              className="w-full rounded-lg border border-violet-500/50 bg-abyss-950 px-2 py-1.5 text-[13px] text-white focus:outline-none"
                            />
                          </form>
                        ) : (
                          <div
                            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 ${
                              active ? 'bg-white/[0.07] ring-1 ring-inset ring-white/[0.08]' : 'hover:bg-white/[0.04]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => void openSession(session.id)}
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                              title={session.title}
                            >
                              <IconChat className={`size-3.5 shrink-0 ${active ? 'text-indigo-300' : 'text-slate-600'}`} />
                              <span className="min-w-0 flex-1">
                                <span className={`block truncate text-[13px] ${active ? 'text-white' : 'text-slate-300'}`}>{session.title}</span>
                                <span className="block truncate text-[11px] text-slate-600">{relativeTime(session.lastMessageAt)}</span>
                              </span>
                            </button>
                            {canChat ? (
                              <span className="flex shrink-0 items-center opacity-0 transition group-hover/item:opacity-100 focus-within:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => setRenaming({ id: session.id, value: session.title })}
                                  className="rounded p-1 text-slate-500 hover:bg-white/[0.08] hover:text-slate-200"
                                  aria-label={`Rename ${session.title}`}
                                  title="Rename"
                                >
                                  <IconPencil className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(session)}
                                  className="rounded p-1 text-slate-500 hover:bg-rose-500/15 hover:text-rose-300"
                                  aria-label={`Delete ${session.title}`}
                                  title="Delete"
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
            className="border-t border-white/[0.06] px-3 py-2.5 text-left text-[11px] text-slate-500 transition hover:text-rose-300"
          >
            Clear all chats ({sessions.length})
          </button>
        ) : null}
      </aside>

      {/* ---------------- transcript ---------------- */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-abyss-900/40">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setListOpen(true)}
              className="rounded-lg border border-white/[0.08] px-2 py-1 text-xs text-slate-300 hover:bg-white/[0.06] lg:hidden"
            >
              Chats
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-white">{activeSession?.title ?? 'New chat'}</h2>
              <p className="truncate text-[11px] text-slate-500">
                {workspaceName} · {incidentsTracked} incident{incidentsTracked === 1 ? '' : 's'} on record
                {modelVersion ? ` · model v${modelVersion}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMemoryOpen(true);
                void refreshMemory();
              }}
              title="What ARCH remembers about you"
              className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2 py-1 text-[11px] text-slate-300 transition hover:bg-white/[0.06]"
            >
              <IconMemory className="size-3.5" /> Memory
              {memory.hasFacts ? <span aria-hidden className="size-1.5 rounded-full bg-violet-400" /> : null}
            </button>
            {messages.length > 0 ? (
              <button
                type="button"
                onClick={() => void copyChat()}
                title="Copy this conversation as Markdown"
                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2 py-1 text-[11px] text-slate-300 transition hover:bg-white/[0.06]"
              >
                <IconCopy className="size-3.5" /> Copy
              </button>
            ) : null}
            {messages.length > 0 ? (
              <button
                type="button"
                onClick={exportChat}
                title="Download this conversation as a Markdown file"
                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2 py-1 text-[11px] text-slate-300 transition hover:bg-white/[0.06]"
              >
                <IconDownload className="size-3.5" /> Export
              </button>
            ) : null}
            {activeSession && canChat ? (
              <button
                type="button"
                onClick={() => setRenaming({ id: activeSession.id, value: activeSession.title })}
                className="rounded-lg border border-white/[0.08] px-2 py-1 text-[11px] text-slate-300 transition hover:bg-white/[0.06]"
              >
                Rename
              </button>
            ) : null}
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
              {AI_NAME} · {engineLabel}
            </span>
          </div>
        </header>

        <div className="scroll-thin flex-1 overflow-y-auto px-4 py-5">
          {messages.length === 0 && !loading ? (
            <div className="mx-auto max-w-2xl space-y-5 py-6">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-indigo-500/30 to-violet-500/20 text-violet-200 ring-1 ring-inset ring-violet-500/30">
                  <IconSpark className="size-4" />
                </span>
                <div className="space-y-1">
                  <p className="text-[15px] font-semibold text-white">
                    {activeSession ? 'This chat is empty — ask me anything.' : `Hello developer! I'm ${AI_NAME}.`}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-400">
                    I'm your operations copilot: I monitor active incidents, recall history & root causes, check runbooks,
                    guide tech decisions, and track conversation context. Chat with me in English or Hindi / Hinglish.
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    disabled={!canChat}
                    onClick={() => void send(example)}
                    className="rounded-xl border border-white/[0.08] bg-abyss-950/50 px-3.5 py-2.5 text-left text-[13px] text-slate-300 transition hover:border-violet-500/40 hover:text-white disabled:opacity-40"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {loading ? <p className="py-8 text-center text-xs text-slate-500">Loading conversation…</p> : null}

          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((message, index) => {
              const isLastAnswer = message.role === 'ARCH' && index === messages.length - 1;
              return message.role === 'USER' ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md border border-indigo-500/25 bg-indigo-500/15 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-indigo-50">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div key={message.id} className="space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-indigo-500/25 to-violet-500/15 text-violet-200 ring-1 ring-inset ring-violet-500/25">
                      <IconSpark className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="rounded-2xl rounded-tl-md border border-white/[0.07] bg-abyss-850/80 px-4 py-3 text-[13.5px] leading-relaxed text-slate-200">
                        <RevealAnswer text={message.content} animate={message.id === animateId} />
                      </div>

                      {message.citations.length ? (
                        <ul className="flex flex-wrap gap-1.5">
                          {message.citations.map((citation, index) => {
                            const body = (
                              <>
                                <span className="text-slate-500">
                                  {SOURCE_ICON[citation.source]} {SOURCE_LABEL[citation.source]}
                                </span>
                                <span className="text-slate-300"> · {citation.label}</span>
                                {typeof citation.similarity === 'number' ? (
                                  <span className="text-slate-600"> · {Math.round(citation.similarity * 100)}% match</span>
                                ) : null}
                              </>
                            );
                            return (
                              <li key={`${message.id}-c${index}`}>
                                {citation.href ? (
                                  <a
                                    href={citation.href}
                                    className="block rounded-lg border border-white/[0.08] bg-abyss-950/50 px-2.5 py-1 text-[11px] transition hover:border-violet-500/40 hover:text-white"
                                    title={citation.detail}
                                  >
                                    {body}
                                  </a>
                                ) : (
                                  <span className="block rounded-lg border border-white/[0.08] bg-abyss-950/50 px-2.5 py-1 text-[11px]" title={citation.detail}>
                                    {body}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-600">
                        {message.intent ? <span className="uppercase tracking-wide">{INTENT_LABEL[message.intent] ?? message.intent.replace(/_/g, ' ')}</span> : null}
                        {message.confidence ? <span>· {message.confidence} confidence</span> : null}
                        {typeof message.latencyMs === 'number' ? <span>· {message.latencyMs} ms</span> : null}
                        {message.model ? <span className="arch-mono">· {message.model}</span> : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            const copied = await copyText(message.content);
                            toast(copied ? 'Answer copied.' : 'Copy failed — select the text instead.', copied ? 'success' : 'error');
                          }}
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
                        >
                          <IconCopy className="size-3" /> Copy
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
                              className={`rounded-md px-1.5 py-0.5 text-[10.5px] transition disabled:opacity-40 ${message.feedbackRating === 'UP' ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-200'}`}
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
                              className={`rounded-md px-1.5 py-0.5 text-[10.5px] transition disabled:opacity-40 ${message.feedbackRating === 'DOWN' ? 'bg-rose-500/15 text-rose-300' : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-200'}`}
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
                            title="Ask the same question again — the workspace may have changed since"
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200 disabled:opacity-40"
                          >
                            <IconRetry className={`size-3 ${retrying ? 'animate-spin' : ''}`} /> {retrying ? 'Retrying…' : 'Try again'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {sending ? (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-indigo-500/25 to-violet-500/15 text-violet-200 ring-1 ring-inset ring-violet-500/25">
                  <IconSpark className="size-3.5" />
                </span>
                <p className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-white/[0.07] bg-abyss-850/80 px-4 py-3 text-xs text-violet-300">
                  <span className="flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-violet-400" />
                    <span className="size-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" />
                  </span>
                  Reading context and preparing an answer…
                </p>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </div>

        {error ? (
          <div className="mx-4 mb-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200" role="alert">
            {error}
          </div>
        ) : null}

        {lastSuggestions.length && !sending ? (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {lastSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={!canChat}
                onClick={() => void send(suggestion)}
                className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-violet-500/50 hover:text-violet-200 disabled:opacity-40"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="border-t border-white/[0.06] p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-abyss-950/70 p-2 focus-within:border-violet-500/50">
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
              placeholder={canChat ? `Ask ${AI_NAME} anything about this workspace…  (Enter to send, Shift+Enter for a new line)` : 'You need RESPONDER or above to chat with ARCH.'}
              className="max-h-[11rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13.5px] text-slate-200 placeholder:text-slate-600 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!canChat || sending || input.trim().length < 2}
              className="shrink-0 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-40"
            >
              Send
            </button>
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 px-1 text-[10.5px] text-slate-600">
            <span>Workspace claims use retrieved context and citations; general answers may come from local model knowledge. ARCH advises — it never changes anything on its own, and it does not write code.</span>
            <span className="text-slate-700">
              ⌘/Ctrl+Shift+O new chat · ⌘/Ctrl+K search · {AI_NAME} keeps the last 12 turns in context
            </span>
          </p>
        </form>
      </section>

      <Dialog
        open={memoryOpen}
        onClose={() => setMemoryOpen(false)}
        title="What ARCH remembers about you"
        description="Only what you told it — never guessed, never shared with your team, and never used to train the model. Everything here is yours to delete."
      >
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-white/[0.07] bg-abyss-950/50 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Saved</p>
            <p className="mt-0.5 text-[13px] text-slate-200">{memory.summary}</p>
            <p className="mt-1 text-[10.5px] text-slate-500">
              {memory.clearedAt ? `Last wiped ${relativeTime(memory.clearedAt)} · ` : ''}
              {memory.updatedAt ? `updated ${relativeTime(memory.updatedAt)}` : 'nothing stored yet'}
            </p>
          </div>

          {memory.userName || memory.userRole || memory.techStack.length ? (
            <ul className="space-y-1.5">
              {memory.userName ? (
                <li className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.07] px-3 py-2">
                  <span className="text-slate-300">Name: <span className="text-white">{memory.userName}</span></span>
                  <button type="button" disabled={!canChat || memoryBusy} onClick={() => void forgetMemoryItem({ userName: null })} className="text-[11px] text-slate-500 transition hover:text-rose-300 disabled:opacity-40">
                    Forget
                  </button>
                </li>
              ) : null}
              {memory.userRole ? (
                <li className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.07] px-3 py-2">
                  <span className="text-slate-300">Role: <span className="text-white">{memory.userRole}</span></span>
                  <button type="button" disabled={!canChat || memoryBusy} onClick={() => void forgetMemoryItem({ userRole: null })} className="text-[11px] text-slate-500 transition hover:text-rose-300 disabled:opacity-40">
                    Forget
                  </button>
                </li>
              ) : null}
              {memory.techStack.length ? (
                <li className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.07] px-3 py-2">
                  <span className="min-w-0 text-slate-300">Stack: <span className="text-white">{memory.techStack.join(', ')}</span></span>
                  <button type="button" disabled={!canChat || memoryBusy} onClick={() => void forgetMemoryItem({ clearStack: true })} className="shrink-0 text-[11px] text-slate-500 transition hover:text-rose-300 disabled:opacity-40">
                    Forget
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}

          {memory.notes.length ? (
            <ul className="space-y-1.5">
              {memory.notes.map((note) => (
                <li key={note} className="flex items-start justify-between gap-2 rounded-lg border border-white/[0.07] px-3 py-2">
                  <span className="min-w-0 text-slate-300">{note}</span>
                  <button type="button" disabled={!canChat || memoryBusy} onClick={() => void forgetMemoryItem({ notes: { remove: note } })} className="shrink-0 text-[11px] text-slate-500 transition hover:text-rose-300 disabled:opacity-40">
                    Forget
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <form
            className="flex items-center gap-2"
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
              placeholder="Tell ARCH something to remember (e.g. we deploy on Thursdays)"
              aria-label="Add a memory"
              className="flex-1 rounded-lg border border-white/[0.08] bg-abyss-950/70 px-3 py-2 text-[13px] text-slate-200 placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!canChat || memoryBusy || memoryNote.trim().length < 3}
              className="rounded-lg bg-gradient-to-b from-indigo-500 to-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-40"
            >
              Remember
            </button>
          </form>

          <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
            <p className="text-[10.5px] text-slate-600">
              Up to {memory.limits.maxNotes} notes. In chat you can also say &quot;remember that …&quot; or &quot;clear memory&quot;.
            </p>
            <button
              type="button"
              disabled={!canChat || memoryBusy || (!memory.hasFacts && !memory.clearedAt)}
              onClick={() => void forgetEverything()}
              className="shrink-0 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-40"
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
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmDelete(null)}
            className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.06]"
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={() => confirmDelete && void remove(confirmDelete)}
            className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
          >
            Delete chat
          </button>
        </div>
      </Dialog>

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear all your chats?"
        description={`This deletes all ${sessions.length} of your conversations in this workspace. Incidents, audit entries and the model are untouched.`}
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmClear(false)}
            className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void clearAll()}
            className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
          >
            Delete everything
          </button>
        </div>
      </Dialog>
    </div>
  );
}
