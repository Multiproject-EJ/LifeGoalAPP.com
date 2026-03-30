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
        <h1 className="peacebetween-shell__title">Conflict Resolution</h1>
      </header>
      <main className="peacebetween-shell__main" role="main">
        <section className="peacebetween-shell__panel">{children}</section>
      </main>
    </div>
  );
}
