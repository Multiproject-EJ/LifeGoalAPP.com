type ScrollLockTarget = 'body' | 'documentElement';

interface TargetSnapshot {
  overflow: string;
}

interface LockState {
  count: number;
  snapshots: Map<ScrollLockTarget, TargetSnapshot>;
}

const state: LockState = {
  count: 0,
  snapshots: new Map(),
};

const getElement = (target: ScrollLockTarget): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  return target === 'body' ? document.body : document.documentElement;
};

export function lockPageScroll(targets: ScrollLockTarget[] = ['body']): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const uniqueTargets = Array.from(new Set(targets));
  state.count += 1;

  uniqueTargets.forEach((target) => {
    const element = getElement(target);
    if (!element) return;

    if (!state.snapshots.has(target)) {
      state.snapshots.set(target, { overflow: element.style.overflow });
      element.style.overflow = 'hidden';
      return;
    }

    element.style.overflow = 'hidden';
  });

  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.count = Math.max(0, state.count - 1);

    if (state.count > 0) {
      return;
    }

    state.snapshots.forEach((snapshot, target) => {
      const element = getElement(target);
      if (!element) return;
      element.style.overflow = snapshot.overflow;
    });
    state.snapshots.clear();
  };
}
