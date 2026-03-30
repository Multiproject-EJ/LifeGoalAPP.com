import type { ReactNode } from 'react';
import './peacebetween.css';

type PeaceBetweenShellProps = {
  children: ReactNode;
};

export function PeaceBetweenShell({ children }: PeaceBetweenShellProps) {
  return (
    <div className="peacebetween-shell" data-surface="peacebetween">
      <header className="peacebetween-shell__header" role="banner">
        <p className="peacebetween-shell__eyebrow">Peace Between</p>
        <h1 className="peacebetween-shell__title">A calmer way to repair hard conversations</h1>
        <p className="peacebetween-shell__subtitle">
          Slow things down, understand what matters, and choose one clear next step together.
        </p>
        <a className="peacebetween-shell__new-conversation-link" href="/conflict/new">
          Start a new conversation
        </a>
      </header>
      <main className="peacebetween-shell__main" role="main">
        <section className="peacebetween-shell__panel">{children}</section>
      </main>
    </div>
  );
}
