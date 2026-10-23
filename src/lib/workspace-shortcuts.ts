/** Browser-independent shortcut rules. Never take a character shortcut away from text entry. */
type ShortcutTarget = {
  tagName?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
};
export type WorkspaceKeyEvent = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  keyCode?: number;
  defaultPrevented?: boolean;
  target?: EventTarget | ShortcutTarget | null;
};

export function isWorkspaceTextEntry(target: WorkspaceKeyEvent['target']): boolean {
  const element = target as ShortcutTarget | null | undefined;
  return Boolean(
    element?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName?.toUpperCase() ?? '') ||
      element?.closest?.(
        '[contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [data-workspace-shortcuts-disabled]',
      ),
  );
}

function unavailable(event: WorkspaceKeyEvent): boolean {
  return Boolean(
    event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229,
  );
}

export function isWorkspaceSearchShortcut(event: WorkspaceKeyEvent): boolean {
  return (
    !unavailable(event) &&
    !event.altKey &&
    !event.shiftKey &&
    Boolean(event.metaKey || event.ctrlKey) &&
    event.key.toLowerCase() === 'k'
  );
}

export function isPageSearchShortcut(event: WorkspaceKeyEvent): boolean {
  return (
    !unavailable(event) &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    event.key === '/' &&
    !isWorkspaceTextEntry(event.target)
  );
}

export function isShortcutHelpShortcut(event: WorkspaceKeyEvent): boolean {
  return (
    !unavailable(event) &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    event.key === '?' &&
    !isWorkspaceTextEntry(event.target)
  );
}

export function isTimelinePostShortcut(
  event: WorkspaceKeyEvent,
  pending: boolean,
  body: string,
): boolean {
  return (
    !unavailable(event) &&
    !event.altKey &&
    !event.shiftKey &&
    Boolean(event.metaKey || event.ctrlKey) &&
    event.key === 'Enter' &&
    !pending &&
    Boolean(body.trim())
  );
}

/** A page-specific action keeps its project/service context; do not compete with a generic one. */
export function showGlobalIncidentAction(pathname: string, allowed: boolean): boolean {
  const path = pathname.replace(/\/+$/, '');
  return (
    allowed &&
    path !== '/dashboard/incidents' &&
    path !== '/dashboard/incidents/new' &&
    !/^\/dashboard\/services\/[^/]+$/.test(path)
  );
}
