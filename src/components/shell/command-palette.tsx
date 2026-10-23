'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SeverityBadge } from '@/components/ui';
import { Dialog } from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';

import {
  fullIncidentSearchHref,
  PALETTE_GROUPS,
  workspaceSearchResults,
} from '@/lib/workspace-search';
export type { PaletteEntry } from '@/lib/workspace-search';
import type { PaletteEntry } from '@/lib/workspace-search';

export function CommandPalette({
  open,
  onClose,
  entries,
}: {
  open: boolean;
  onClose: () => void;
  entries: PaletteEntry[];
}) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const router = useRouter();
  const results = useMemo(() => workspaceSearchResults(entries, query), [query, entries]);
  const selectedIndex = Math.min(index, Math.max(0, results.length - 1));
  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
    }
  }, [open]);
  useEffect(() => {
    if (open)
      document.getElementById(`${listId}-${selectedIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, selectedIndex, listId, query]);
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  const groups = PALETTE_GROUPS;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Search workspace"
      description="Jump to recent incidents, services, or any workspace page."
      wide
      position="top"
      initialFocusRef={inputRef}
      className="workspace-command-dialog"
    >
      <input
        ref={inputRef}
        role="combobox"
        aria-label="Search workspace"
        aria-expanded={true}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={results.length ? `${listId}-${selectedIndex}` : undefined}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (results.length)
              setIndex(
                (selectedIndex + (event.key === 'ArrowDown' ? 1 : -1) + results.length) %
                  results.length,
              );
          } else if (event.key === 'Enter' && !event.repeat) {
            event.preventDefault();
            const hit = results[selectedIndex];
            if (hit) go(hit.href);
            else if (query.trim()) go(fullIncidentSearchHref(query));
          }
        }}
        placeholder="Search recent incidents, services, and pages…"
        maxLength={200}
        className="workspace-command-input"
        autoComplete="off"
        spellCheck={false}
      />
      <div
        id={listId}
        role="listbox"
        aria-label="Search results"
        className="workspace-command-results scroll-thin"
      >
        {groups.map((group) => {
          const items = results.filter((entry) => entry.kind === group.kind);
          if (!items.length) return null;
          return (
            <div key={group.kind} role="group" aria-label={group.title}>
              <p className="workspace-command-group" aria-hidden="true">
                {group.title}
              </p>
              {items.map((entry) => {
                const flatIndex = results.indexOf(entry);
                const selected = flatIndex === selectedIndex;
                return (
                  <button
                    key={`${entry.kind}-${entry.href}`}
                    id={`${listId}-${flatIndex}`}
                    role="option"
                    aria-selected={selected}
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => go(entry.href)}
                    onMouseEnter={() => setIndex(flatIndex)}
                    className={`workspace-command-option${selected ? ' is-selected' : ''}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{entry.label}</span>
                      <span className="workspace-muted block truncate text-xs">{entry.hint}</span>
                    </span>
                    {entry.kind === 'incident' ? <SeverityBadge severity={entry.severity} /> : null}
                    {selected ? <span aria-hidden="true">↵</span> : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      {!results.length ? (
        <p className="workspace-search-empty" role="status">
          No matches. Try a different incident title, service, or page name.
        </p>
      ) : null}
      {query.trim() ? (
        <div className="workspace-command-full-search">
          <button type="button" onClick={() => go(fullIncidentSearchHref(query))}>
            Search full incident history <span aria-hidden="true">→</span>
          </button>
          <p>Searches titles and descriptions across the incident list.</p>
        </div>
      ) : null}
      <div className="workspace-command-help">
        <span>
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate
        </span>
        <span>
          <Kbd>↵</Kbd> open
        </span>
        <span>
          <Kbd>esc</Kbd> close
        </span>
        <span className="sr-only" aria-live="polite">
          {results.length} result{results.length === 1 ? '' : 's'}
        </span>
      </div>
    </Dialog>
  );
}
