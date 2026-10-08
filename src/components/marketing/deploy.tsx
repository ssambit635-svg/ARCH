'use client';

import { LinkArrow } from './link-arrow';
import { useEffect, useRef, useState } from 'react';
import { GITHUB_REPO_URL } from '@/lib/brand';
import { copyToClipboard } from '@/lib/copy-to-clipboard';
import { TechStackTiles } from './tech-stack';

const COMMANDS = [
  'git clone https://github.com/ssambit635-svg/ARCH.git',
  'cd ARCH && npm ci',
  'cp .env.example .env && chmod 600 .env',
  '# Set distinct AUTH_SECRET and AUTH_SECRET_WEBHOOK in .env',
  'npm run dev',
];

export function Deploy() {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetRef.current) clearTimeout(resetRef.current);
  }, []);

  const copyCommands = async () => {
    if (resetRef.current) clearTimeout(resetRef.current);
    const copied = await copyToClipboard(COMMANDS.join('\n'));
    setCopyState(copied ? 'copied' : 'error');
    resetRef.current = setTimeout(() => setCopyState('idle'), 3000);
  };

  return (
    <section id="deploy" className="mk-section" aria-labelledby="deploy-title">
      <div className="mk-container">
        <div className="mk-section-heading">
          <div>
            <p className="mk-eyebrow" data-mk-reveal>Run it your way</p>
            <h2 id="deploy-title" className="mk-title" data-mk-heading aria-label="Your infrastructure. Your pace.">Your infrastructure.<br /> Your pace.</h2>
            <p className="mk-description" data-mk-reveal>Start locally, then deploy with your own PostgreSQL database.</p>
          </div>
          <a href={`${GITHUB_REPO_URL}#quick-start`} className="mk-text-link" data-mk-reveal>Read the setup guide <LinkArrow /></a>
        </div>

        <div className="mk-deploy-grid">
          <div className="mk-terminal" data-mk-panel>
            <div className="mk-terminal-titlebar">
              <span className="mk-terminal-dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="mk-terminal-title">arch — setup — -zsh</span>
              <button type="button" onClick={copyCommands} className="mk-copy-button">{copyState === 'copied' ? 'Copied' : 'Copy'}</button>
            </div>
            {/* The command block scrolls sideways on small screens, so it must be reachable by keyboard. */}
            <pre className="mk-terminal-body" tabIndex={0} role="region" aria-label="Local development commands"><code>{COMMANDS.map((command, index) => {
              const isComment = command.startsWith('#');
              return (
                <span className="mk-terminal-line" key={command}>
                  {isComment ? (
                    <span className="mk-terminal-comment">{command}</span>
                  ) : (
                    <>
                      <span className="mk-terminal-prompt" aria-hidden="true">$ </span>
                      <span className="mk-terminal-command">{command}</span>
                    </>
                  )}
                  {index === COMMANDS.length - 1 ? (
                    <>
                      {'\n'}
                      <span className="mk-terminal-caret" aria-hidden="true">▋</span>
                    </>
                  ) : (
                    '\n'
                  )}
                </span>
              );
            })}</code></pre>
            <p className="mk-terminal-note">Node.js 20.19+ · PostgreSQL via Docker or the local embedded fallback</p>
            <span className="mk-sr-only" role="status">{copyState === 'copied' ? 'Commands copied to clipboard.' : copyState === 'error' ? 'Copy failed. Select and copy the commands manually.' : ''}</span>
            {copyState === 'error' && <p className="mk-copy-error">Couldn’t access your clipboard. You can select and copy the commands above.</p>}
          </div>

          <div className="mk-deploy-copy" data-mk-reveal>
            <h3>A straightforward starting point.</h3>
            <p>Generate two unique secrets with <code>openssl rand -base64 32</code> and update your local <code>.env</code>. The dev command prepares the database, applies migrations, and starts ARCH.</p>
            <p>No demo account is created automatically. Register your own workspace at <code>/register</code>.</p>
            <a href={`${GITHUB_REPO_URL}/blob/main/docs/engineering/OPERATIONS-RUNBOOK.md`} className="mk-muted-link">Production deployment notes <LinkArrow /></a>
          </div>
        </div>

        <div className="mk-stack">
          <p className="mk-eyebrow" data-mk-reveal>Built with tools you already know</p>
          <TechStackTiles />
        </div>
      </div>
    </section>
  );
}
