'use client';

import { useState } from 'react';
import {
  setCharacterShortcuts,
  useCharacterShortcuts,
} from '@/components/ui/workspace-keyboard-preferences';
import { Dialog } from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { ShortcutKeys } from '@/components/ui/workspace-shortcut';

export function ShortcutGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const characterShortcuts = useCharacterShortcuts();
  const [persisted, setPersisted] = useState(true);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="Move around without leaving the keyboard. Character shortcuts never interrupt text entry."
    >
      <label className="workspace-character-shortcuts-setting">
        <input
          type="checkbox"
          checked={characterShortcuts}
          aria-labelledby="workspace-character-shortcuts-label"
          aria-describedby="workspace-character-shortcuts-hint"
          onChange={(event) => setPersisted(setCharacterShortcuts(event.target.checked))}
        />
        <span>
          <span id="workspace-character-shortcuts-label">Enable / and ? character shortcuts</span>
          <small id="workspace-character-shortcuts-hint">
            Turn these off for voice input. Modifier shortcuts such as Ctrl/⌘ K still work.
          </small>
        </span>
      </label>
      {!persisted ? (
        <p className="workspace-shortcut-note" role="status">
          Browser storage is unavailable. This preference lasts until this page is reloaded.
        </p>
      ) : null}
      <dl className="workspace-shortcut-guide">
        <div>
          <dt>Search workspace</dt>
          <dd>
            <ShortcutKeys decorative={false} letter="K" />
          </dd>
        </div>
        <div>
          <dt>
            Show or hide sidebar <span>Desktop, outside text fields</span>
          </dt>
          <dd>
            <ShortcutKeys decorative={false} letter="B" />
          </dd>
        </div>
        <div>
          <dt>
            Search this page{' '}
            <span>
              {characterShortcuts
                ? 'Where a search field shows the / hint'
                : 'Character shortcuts are turned off'}
            </span>
          </dt>
          <dd>
            <Kbd>/</Kbd>
          </dd>
        </div>
        <div>
          <dt>
            Post a timeline update <span>From the incident composer</span>
          </dt>
          <dd>
            <ShortcutKeys decorative={false} letter="Enter" />
          </dd>
        </div>
        <div>
          <dt>Move through menu or search results</dt>
          <dd>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd>
          </dd>
        </div>
        <div>
          <dt>Close a dialog or menu</dt>
          <dd>
            <Kbd>Esc</Kbd>
          </dd>
        </div>
        <div>
          <dt>
            Show these shortcuts
            {!characterShortcuts ? <span>Character shortcuts are turned off</span> : null}
          </dt>
          <dd>
            <Kbd>?</Kbd>
          </dd>
        </div>
      </dl>
      <p className="workspace-shortcut-note">
        Use Tab and Shift+Tab to move between controls. ARCH never applies an incident change just
        because you opened a menu or search result.
      </p>
    </Dialog>
  );
}
