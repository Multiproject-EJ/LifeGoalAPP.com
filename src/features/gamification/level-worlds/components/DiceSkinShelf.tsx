import { DICE_SKINS, isDiceSkinOwned, type DiceSkinId, type DiceSkinProgress } from '../services/islandRunDiceSkins';
import './board/diceSkins.css';
import './DiceSkinShelf.css';

/** The five pip face, reused as a small preview cube per skin. */
const PREVIEW_PIPS = ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'] as const;

function DiceSkinPreview({ skinId }: { skinId: DiceSkinId }) {
  return (
    <span className="dice-skin-shelf__preview board-dice-3d" data-dice-skin={skinId} aria-hidden="true">
      <span className="board-dice-3d__die dice-skin-shelf__cube">
        <span className="board-dice-3d__face board-dice-3d__face--1"><span className="board-dice-3d__dot board-dice-3d__dot--center" /></span>
        <span className="board-dice-3d__face board-dice-3d__face--2">
          <span className="board-dice-3d__dot board-dice-3d__dot--top-right" /><span className="board-dice-3d__dot board-dice-3d__dot--bottom-left" />
        </span>
        <span className="board-dice-3d__face board-dice-3d__face--3">
          <span className="board-dice-3d__dot board-dice-3d__dot--top-right" /><span className="board-dice-3d__dot board-dice-3d__dot--center" /><span className="board-dice-3d__dot board-dice-3d__dot--bottom-left" />
        </span>
        <span className="board-dice-3d__face board-dice-3d__face--5">
          {PREVIEW_PIPS.map((pip) => <span key={pip} className={`board-dice-3d__dot board-dice-3d__dot--${pip}`} />)}
        </span>
        <span className="board-dice-3d__face board-dice-3d__face--4" />
        <span className="board-dice-3d__face board-dice-3d__face--6" />
      </span>
    </span>
  );
}

export function DiceSkinShelf({
  progress, money, pendingSkinId, onChoose,
}: {
  progress: DiceSkinProgress;
  money: number;
  pendingSkinId: DiceSkinId | null;
  onChoose: (skinId: DiceSkinId, mode: 'buy' | 'equip') => void;
}) {
  return (
    <section className="dice-skin-shelf" aria-labelledby="dice-skin-shelf-title">
      <div className="island-run-supply-dock__subheading">
        <div>
          <span className="island-run-supply-dock__eyebrow">Earned currency</span>
          <h4 id="dice-skin-shelf-title">Dice collection</h4>
        </div>
        <span>{DICE_SKINS.filter((skin) => isDiceSkinOwned(progress, skin.id)).length}/{DICE_SKINS.length} owned</span>
      </div>
      <ul className="dice-skin-shelf__grid">
        {DICE_SKINS.map((skin) => {
          const owned = isDiceSkinOwned(progress, skin.id);
          const equipped = progress.selectedSkinId === skin.id;
          const affordable = money >= skin.price;
          const busy = pendingSkinId === skin.id;
          return (
            <li key={skin.id} className={`dice-skin-shelf__card${equipped ? ' dice-skin-shelf__card--equipped' : ''}`}>
              <DiceSkinPreview skinId={skin.id} />
              <strong>{skin.name}</strong>
              <small>{skin.tagline}</small>
              {equipped ? (
                <button type="button" className="dice-skin-shelf__btn dice-skin-shelf__btn--equipped" disabled>In use ✓</button>
              ) : owned ? (
                <button type="button" className="dice-skin-shelf__btn" disabled={Boolean(pendingSkinId)} onClick={() => onChoose(skin.id, 'equip')}>
                  {busy ? 'Equipping…' : 'Use'}
                </button>
              ) : (
                <button
                  type="button"
                  className="dice-skin-shelf__btn dice-skin-shelf__btn--buy"
                  disabled={!affordable || Boolean(pendingSkinId)}
                  onClick={() => onChoose(skin.id, 'buy')}
                  aria-label={`Buy ${skin.name} for ${skin.price.toLocaleString()} money`}
                >
                  {busy ? 'Buying…' : <>💰 {skin.price.toLocaleString()}</>}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
