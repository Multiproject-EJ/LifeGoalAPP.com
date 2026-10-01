import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Only one Today pet may run at a time. The pet renders into document.body,
 * so every mounted Today tracker (including a hidden or not-yet-unmounted
 * one after the app resumes) would otherwise add its own pet. Each instance
 * registers an in-tree anchor; the first instance whose anchor is actually
 * displayed owns the pet.
 */
type Entry = { id: number; anchor: HTMLElement | null };

let nextId = 1;
let entries: Entry[] = [];
let ownerId: number | null = null;
const listeners = new Set<() => void>();
let recheckTimer = 0;

function isDisplayed(anchor: HTMLElement | null): boolean {
  return Boolean(anchor && anchor.isConnected && anchor.getClientRects().length > 0);
}

export function resolveTodayPetOwner(list: ReadonlyArray<{ id: number; displayed: boolean }>): number | null {
  return list.find((entry) => entry.displayed)?.id ?? null;
}

function recompute() {
  const next = resolveTodayPetOwner(entries.map((entry) => ({ id: entry.id, displayed: isDisplayed(entry.anchor) })));
  if (next !== ownerId) {
    ownerId = next;
    listeners.forEach((listener) => listener());
  }
  // A tracker can be hidden/shown by CSS without remounting: keep checking
  // while more than one instance exists.
  window.clearInterval(recheckTimer);
  recheckTimer = entries.length > 1 ? window.setInterval(recompute, 1000) : 0;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Returns an anchor ref for the tracker tree and whether this instance owns the pet. */
export function useTodayPetOwnership() {
  const idRef = useRef(0);
  if (idRef.current === 0) idRef.current = nextId++;
  const anchorRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const id = idRef.current;
    entries = [...entries, { id, anchor: anchorRef.current }];
    recompute();
    const onChange = () => recompute();
    document.addEventListener('visibilitychange', onChange);
    window.addEventListener('resize', onChange);
    return () => {
      entries = entries.filter((entry) => entry.id !== id);
      document.removeEventListener('visibilitychange', onChange);
      window.removeEventListener('resize', onChange);
      recompute();
    };
  }, []);
  const owns = useSyncExternalStore(subscribe, () => ownerId === idRef.current, () => false);
  return { anchorRef, owns };
}
