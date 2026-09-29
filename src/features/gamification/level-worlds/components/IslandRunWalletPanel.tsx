import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { fetchOwnedCosmetics, type OwnedCosmeticRow } from '../../../../services/themePurchases';
import { isPlayerPieceId, resolvePlayerPiece } from '../services/islandRunPlayerPieces';
import './IslandRunWalletPanel.css';

const NUMBER = new Intl.NumberFormat();
const format = (value: number) => NUMBER.format(Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)));

const COSMETIC_TYPE_LABEL: Record<string, string> = { theme: 'Theme', player_piece: 'Board piece' };

function describeCosmetic(row: OwnedCosmeticRow): { name: string; kind: string } {
  const kind = COSMETIC_TYPE_LABEL[row.cosmetic_type] ?? row.cosmetic_type.replace(/_/g, ' ');
  if (row.cosmetic_type === 'player_piece' && isPlayerPieceId(row.cosmetic_id)) {
    return { name: resolvePlayerPiece(row.cosmetic_id).name, kind };
  }
  const name = row.cosmetic_id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return { name, kind };
}

export interface IslandRunWalletPanelProps {
  userId: string;
  money: number;
  essence: number;
  dice: number;
  treasures: { unlocked: boolean; relics: number; relicTotal: number; invested: number };
  /** Where the panel grows from (the wallet in the top bar). */
  originRect: DOMRect | null;
  onClose: () => void;
  onGetMoney: () => void;
  onGetEssence: () => void;
}

/**
 * Top-bar wallet mini modal: Money, Essence, Dice, Treasure Island value and
 * real-money purchases. Viewport portal, fixed backdrop, scroll locked;
 * read-only (store buttons open the existing wallet stores).
 */
export function IslandRunWalletPanel({
  userId, money, essence, dice, treasures, originRect, onClose, onGetMoney, onGetEssence,
}: IslandRunWalletPanelProps) {
  const [purchases, setPurchases] = useState<{ status: 'loading' | 'ready' | 'error'; items: OwnedCosmeticRow[] }>({ status: 'loading', items: [] });
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  // Grow out of the wallet: point the transform origin at its centre.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || !originRect) return;
    // offset* ignores the entrance transform (the backdrop is the fixed offset parent).
    const x = originRect.left + originRect.width / 2 - panel.offsetLeft;
    const y = originRect.top + originRect.height / 2 - panel.offsetTop;
    panel.style.setProperty('--ir-wallet-origin', `${Math.round(x)}px ${Math.round(y)}px`);
  }, [originRect]);

  useEffect(() => lockPageScroll(['body', 'documentElement']), []);
  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    let cancelled = false;
    // A stalled connection must not leave the list "loading" forever.
    const timeout = window.setTimeout(() => {
      if (!cancelled) setPurchases((current) => (current.status === 'loading' ? { status: 'error', items: [] } : current));
    }, 8_000);
    void fetchOwnedCosmetics(userId).then(({ items, error }) => {
      if (cancelled) return;
      window.clearTimeout(timeout);
      setPurchases({ status: error ? 'error' : 'ready', items });
    });
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [userId]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="island-run-overlay-root ir-wallet-backdrop" role="presentation" onClick={onClose}>
      <section
        ref={panelRef}
        className="ir-wallet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ir-wallet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ir-wallet__header">
          <h2 id="ir-wallet-title">Wallet</h2>
          <button ref={closeRef} type="button" className="ir-wallet__close" aria-label="Close wallet" onClick={onClose}>✕</button>
        </header>

        <div className="ir-wallet__balances">
          <div className="ir-wallet__tile ir-wallet__tile--money">
            <span aria-hidden="true">💵</span><small>Money</small><strong>{format(money)}</strong>
          </div>
          <div className="ir-wallet__tile ir-wallet__tile--essence">
            <img src="/assets/spin-wheel/daily-momentum/prizes/prize-shards-orb-transparent.png" alt="" aria-hidden="true" />
            <small>Essence</small><strong>{format(essence)}</strong>
          </div>
          <div className="ir-wallet__tile ir-wallet__tile--dice">
            <span aria-hidden="true">🎲</span><small>Dice</small><strong>{format(dice)}</strong>
          </div>
        </div>

        <div className="ir-wallet__treasure">
          <span className="ir-wallet__treasure-icon" aria-hidden="true">🏛️</span>
          <span>
            <small>Treasure Island</small>
            {treasures.unlocked ? (
              <strong>{treasures.relics}/{treasures.relicTotal} relics · {format(treasures.invested)} invested</strong>
            ) : (
              <strong>Locked · opens after the Island 004 mission</strong>
            )}
          </span>
        </div>

        <div className="ir-wallet__actions">
          <button type="button" onClick={onGetMoney}>Get Money</button>
          <button type="button" onClick={onGetEssence}>Get Essence</button>
        </div>

        <section className="ir-wallet__purchases" aria-labelledby="ir-wallet-purchases-title">
          <h3 id="ir-wallet-purchases-title">Purchased</h3>
          {purchases.status === 'loading' ? <p className="ir-wallet__muted">Loading your purchases…</p>
            : purchases.status === 'error' ? <p className="ir-wallet__muted">Purchases could not load right now. Your items are safe.</p>
            : purchases.items.length === 0 ? <p className="ir-wallet__muted">Nothing purchased yet.</p>
            : (
              <ul>
                {purchases.items.map((row) => {
                  const item = describeCosmetic(row);
                  return (
                    <li key={`${row.cosmetic_type}:${row.cosmetic_id}`}>
                      <strong>{item.name}</strong>
                      <small>{item.kind}</small>
                    </li>
                  );
                })}
              </ul>
            )}
        </section>
      </section>
    </div>,
    document.body,
  );
}
