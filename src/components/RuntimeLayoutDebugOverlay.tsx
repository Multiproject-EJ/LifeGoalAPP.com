import { useEffect, useMemo, useState } from 'react';

type NodeStyles = Record<string, string>;

type Snapshot = {
  path: string;
  viewport: string;
  inner: string;
  visualViewport: string;
  rootChain: string;
  hasApp: boolean;
  hasWorkspace: boolean;
  hasMobileFrame: boolean;
  hasMobileHomeFrame: boolean;
  hasWorkspaceShell: boolean;
  hasWorldHero: boolean;
  hasWorldHome: boolean;
  htmlStyles: NodeStyles;
  bodyStyles: NodeStyles;
  rootStyles: NodeStyles;
  appStyles: NodeStyles;
  workspaceStyles: NodeStyles;
  shellStyles: NodeStyles;
};

const PICK = (style: CSSStyleDeclaration, keys: string[]): NodeStyles =>
  keys.reduce<NodeStyles>((acc, key) => {
    acc[key] = style.getPropertyValue(key) || '(empty)';
    return acc;
  }, {});

const EMPTY_STYLES: NodeStyles = {};

function captureSnapshot(): Snapshot {
  const html = document.documentElement;
  const body = document.body;
  const root = document.getElementById('root');
  const app = document.querySelector<HTMLElement>('.app');
  const workspace = document.querySelector<HTMLElement>('.app--workspace');
  const shell = document.querySelector<HTMLElement>('.workspace-shell');
  const worldHero = document.querySelector<HTMLElement>('.world-hero');
  const worldHome = document.querySelector<HTMLElement>('.world-home');

  const htmlStyle = getComputedStyle(html);
  const bodyStyle = getComputedStyle(body);
  const rootStyle = root ? getComputedStyle(root) : null;
  const appStyle = app ? getComputedStyle(app) : null;
  const workspaceStyle = workspace ? getComputedStyle(workspace) : null;
  const shellStyle = shell ? getComputedStyle(shell) : null;

  const visualViewport = window.visualViewport;
  const vvText = visualViewport
    ? `${Math.round(visualViewport.width)} × ${Math.round(visualViewport.height)}`
    : 'n/a';

  const appClassChain = app ? `.app(${app.className || '(no classes)'})` : '.app(missing)';
  const rootChain = [
    `html(${html.className || '(no classes)'})`,
    `body(${body.className || '(no classes)'})`,
    `#root(${root?.className || '(no classes)'})`,
    appClassChain,
  ].join(' -> ');

  return {
    path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    viewport: `${window.screen.width} × ${window.screen.height}`,
    inner: `${window.innerWidth} × ${window.innerHeight}`,
    visualViewport: vvText,
    rootChain,
    hasApp: Boolean(app),
    hasWorkspace: Boolean(workspace),
    hasMobileFrame: Boolean(app?.classList.contains('app--mobile-frame')),
    hasMobileHomeFrame: Boolean(app?.classList.contains('app--mobile-home-frame')),
    hasWorkspaceShell: Boolean(shell),
    hasWorldHero: Boolean(worldHero),
    hasWorldHome: Boolean(worldHome),
    htmlStyles: PICK(htmlStyle, ['background-color', 'margin', 'height', 'min-height']),
    bodyStyles: PICK(bodyStyle, ['background-color', 'margin', 'height', 'min-height']),
    rootStyles: rootStyle ? PICK(rootStyle, ['background-color', 'width', 'height', 'min-height']) : EMPTY_STYLES,
    appStyles: appStyle ? PICK(appStyle, ['width', 'height', 'min-height', 'margin', 'padding']) : EMPTY_STYLES,
    workspaceStyles: workspaceStyle
      ? PICK(workspaceStyle, ['width', 'height', 'padding', 'background-color'])
      : EMPTY_STYLES,
    shellStyles: shellStyle
      ? PICK(shellStyle, ['width', 'max-width', 'min-height', 'margin', 'padding', 'background-color'])
      : EMPTY_STYLES,
  };
}

export function RuntimeLayoutDebugOverlay() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('layout-debug-active');

    const update = () => setSnapshot(captureSnapshot());
    update();

    const intervalId = window.setInterval(update, 600);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);

    return () => {
      document.documentElement.classList.remove('layout-debug-active');
      window.clearInterval(intervalId);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);

  const body = useMemo(() => {
    if (!snapshot) return 'Collecting runtime layout snapshot…';
    return [
      `route: ${snapshot.path}`,
      `screen: ${snapshot.viewport}`,
      `inner: ${snapshot.inner}`,
      `visualViewport: ${snapshot.visualViewport}`,
      `rootChain: ${snapshot.rootChain}`,
      `has .app: ${String(snapshot.hasApp)}`,
      `has .app--workspace: ${String(snapshot.hasWorkspace)}`,
      `has .app--mobile-frame: ${String(snapshot.hasMobileFrame)}`,
      `has .app--mobile-home-frame: ${String(snapshot.hasMobileHomeFrame)}`,
      `has .workspace-shell: ${String(snapshot.hasWorkspaceShell)}`,
      `has .world-hero: ${String(snapshot.hasWorldHero)}`,
      `has .world-home: ${String(snapshot.hasWorldHome)}`,
      `html styles: ${JSON.stringify(snapshot.htmlStyles)}`,
      `body styles: ${JSON.stringify(snapshot.bodyStyles)}`,
      `#root styles: ${JSON.stringify(snapshot.rootStyles)}`,
      `.app styles: ${JSON.stringify(snapshot.appStyles)}`,
      `.app--workspace styles: ${JSON.stringify(snapshot.workspaceStyles)}`,
      `.workspace-shell styles: ${JSON.stringify(snapshot.shellStyles)}`,
    ].join('\n');
  }, [snapshot]);

  return (
    <aside
      style={{
        position: 'fixed',
        left: 'max(8px, env(safe-area-inset-left, 0px))',
        bottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
        zIndex: 2147483647,
        width: 'min(92vw, 420px)',
        maxHeight: collapsed ? '44px' : '45vh',
        overflow: 'auto',
        borderRadius: '10px',
        border: '2px solid #000',
        background: 'rgba(255, 255, 255, 0.96)',
        color: '#111',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '11px',
        lineHeight: 1.35,
        padding: '8px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        style={{
          display: 'block',
          width: '100%',
          marginBottom: collapsed ? 0 : 6,
          border: '1px solid #111',
          background: '#f3f4f6',
          color: '#111',
          borderRadius: 6,
          padding: '4px 6px',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Layout Debug {collapsed ? '▸' : '▾'}
      </button>
      {!collapsed ? body : null}
    </aside>
  );
}
