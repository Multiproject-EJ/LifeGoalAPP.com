import { resolvePlayerPiece, type PlayerPieceId } from '../services/islandRunPlayerPieces';

/**
 * Small original SVG portraits of the player pieces (no image assets). Locked
 * pieces render as a quiet silhouette with a padlock.
 */
export function PlayerPieceIcon({ pieceId, locked = false }: { pieceId: PlayerPieceId; locked?: boolean }) {
  const piece = resolvePlayerPiece(pieceId);
  const accent = piece.accentColor;
  const gold = '#e7b95a';
  const shape = (() => {
    switch (piece.id) {
      case 'explorer_ship':
        return (
          <>
            <path d="M14 34 C14 24 22 21 32 21 C42 21 50 24 50 34 C50 40 46 44 41 44 L23 44 C18 44 14 40 14 34 Z" fill="#f3f6fa" />
            <path d="M14 34 C10 38 9 46 14 49 C18 51 22 47 23 44 Z M50 34 C54 38 55 46 50 49 C46 51 42 47 41 44 Z" fill="#dfe6ef" />
            <path d="M24 27 C24 19 40 19 40 27 Z" fill="#bfe9ff" opacity=".9" />
            <circle cx="32" cy="24" r="4" fill="#5fbf6f" />
            <circle cx="32" cy="46" r="2.5" fill={accent} />
          </>
        );
      case 'ancient_egg':
        return (
          <>
            <ellipse cx="32" cy="35" rx="14" ry="18" fill="#efe3c2" />
            <path d="M18.5 31 H45.5 M18 41 H46" stroke={gold} strokeWidth="2.4" />
            <path d="M32 32 L35 36 L32 40 L29 36 Z" fill={accent} />
          </>
        );
      case 'world_seed':
        return (
          <>
            <ellipse cx="32" cy="40" rx="12" ry="14" fill="#8a5a33" />
            <path d="M32 26 V54" stroke={gold} strokeWidth="2" />
            <path d="M32 27 C32 20 32 18 32 16" stroke="#4f8f45" strokeWidth="2.4" />
            <path d="M32 18 C26 12 20 15 20 18 C24 20 29 20 32 18 Z M32 18 C38 12 44 15 44 18 C40 20 35 20 32 18 Z" fill="#7fd07a" />
          </>
        );
      case 'living_compass':
        return (<><circle cx="32" cy="34" r="16" fill="none" stroke={gold} strokeWidth="3" /><path d="M32 20 L36 34 L32 48 L28 34 Z" fill={accent} /></>);
      case 'keepers_lantern':
        return (<><path d="M24 22 H40 L42 46 H22 Z" fill="#3b2a18" /><rect x="26" y="26" width="12" height="16" rx="3" fill={accent} /><path d="M26 22 C26 14 38 14 38 22" fill="none" stroke={gold} strokeWidth="2.4" /></>);
      case 'quest_journal':
        return (<><rect x="18" y="20" width="28" height="30" rx="3" fill="#6a4a8c" /><rect x="22" y="20" width="3" height="30" fill={gold} /><circle cx="35" cy="35" r="5" fill="none" stroke={gold} strokeWidth="2" /></>);
      case 'ancient_key':
        return (<><circle cx="24" cy="30" r="8" fill="none" stroke={gold} strokeWidth="3.4" /><path d="M31 32 L48 42 M42 38 L40 43 M46 41 L44 45" stroke={gold} strokeWidth="3.4" strokeLinecap="round" /></>);
      case 'fallen_star':
        return (<path d="M32 16 L36.5 29 L50 29 L39 37 L43 50 L32 42 L21 50 L25 37 L14 29 L27.5 29 Z" fill={accent} stroke={gold} strokeWidth="1.5" />);
      case 'oris_shell':
        return (<path d="M32 50 C18 50 14 38 20 30 C26 22 40 22 42 32 C44 40 34 42 32 36 C30 32 36 30 36 33" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" />);
      default:
        return (<><path d="M24 50 V28 C24 20 40 20 40 28 V50 Z" fill="#8a8494" /><circle cx="28.5" cy="32" r="2.4" fill={accent} /><circle cx="35.5" cy="32" r="2.4" fill={accent} /></>);
    }
  })();
  return (
    <svg className="player-piece-icon" viewBox="0 0 64 64" aria-hidden="true" data-locked={locked || undefined}>
      <circle cx="32" cy="34" r="27" fill={accent} opacity={locked ? 0.08 : 0.2} />
      <g opacity={locked ? 0.28 : 1} filter={locked ? 'grayscale(1)' : undefined}>{shape}</g>
      {locked ? (
        <g transform="translate(40 40)">
          <rect x="0" y="6" width="16" height="12" rx="3" fill="#d8dde6" />
          <path d="M3.5 6 V3.5 C3.5 -1.5 12.5 -1.5 12.5 3.5 V6" fill="none" stroke="#d8dde6" strokeWidth="2.4" />
        </g>
      ) : null}
    </svg>
  );
}
