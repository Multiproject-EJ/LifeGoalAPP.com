type ScrollLockTarget = 'body' | 'documentElement' | 'root';
type StylePatch = Record<string, string>;

interface StyleSnapshot {
  count: number;
  originalValue: string;
}

const activeStyleLocks = new Map<string, StyleSnapshot>();

const getElement = (target: ScrollLockTarget): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  if (target === 'body') return document.body;
  if (target === 'documentElement') return document.documentElement;
  return document.getElementById('root');
};

const getLockKey = (target: ScrollLockTarget, property: string) => `${target}.${property}`;

const applyStylePatch = (target: ScrollLockTarget, styles: StylePatch) => {
  const element = getElement(target);
  if (!element) return [];

  return Object.entries(styles).map(([propertyName, value]) => {
    const property = propertyName;
    const lockKey = getLockKey(target, property);
    const existing = activeStyleLocks.get(lockKey);

    if (existing) {
      existing.count += 1;
    } else {
      const currentValue = String((element.style as unknown as Record<string, string>)[property] ?? '');
      activeStyleLocks.set(lockKey, { count: 1, originalValue: currentValue });
    }

    (element.style as unknown as Record<string, string>)[property] = value;

    return () => {
      const current = activeStyleLocks.get(lockKey);
      if (!current) return;

      current.count -= 1;
      if (current.count > 0) return;

      (element.style as unknown as Record<string, string>)[property] = current.originalValue;
      activeStyleLocks.delete(lockKey);
    };
  });
};

export function lockPageScroll(targets: ScrollLockTarget[] = ['body']): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const uniqueTargets = Array.from(new Set(targets));
  const releases = uniqueTargets.flatMap((target) => applyStylePatch(target, { overflow: 'hidden' }));

  let released = false;
  return () => {
    if (released) return;
    released = true;
    releases.slice().reverse().forEach((release) => release());
  };
}

export function lockFullscreenPageScroll(options: { bodyTop?: string; root?: boolean } = {}): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const releases = [
    ...applyStylePatch('body', {
      overflow: 'hidden',
      position: 'fixed',
      top: options.bodyTop ?? '0px',
      bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
      width: '100%',
      touchAction: 'none',
      overscrollBehaviorY: 'none',
      backgroundColor: '#000',
    }),
    ...applyStylePatch('documentElement', {
      overflow: 'hidden',
      overscrollBehaviorY: 'none',
      backgroundColor: '#000',
    }),
    ...(options.root ? applyStylePatch('root', { overflow: 'hidden', height: '100%' }) : []),
  ];

  let released = false;
  return () => {
    if (released) return;
    released = true;
    releases.slice().reverse().forEach((release) => release());
  };
}
