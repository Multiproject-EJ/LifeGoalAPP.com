import type { IslandChampionshipPresentation } from '../narrative/islandChampionshipPresentation';

import './IslandChampionshipBanner.css';

type IslandChampionshipBannerProps = {
  championship: IslandChampionshipPresentation;
  onOpenCeremony: () => void;
};

export function IslandChampionshipBanner({
  championship,
  onOpenCeremony,
}: IslandChampionshipBannerProps) {
  return (
    <section
      className={`island-championship-banner island-championship-banner--${championship.theme}`}
      aria-label={`${championship.title} opening ceremony`}
    >
      <img
        className="island-championship-banner__art"
        src={championship.artSrc}
        alt=""
      />
      <span className="island-championship-banner__veil" aria-hidden="true" />
      <span className="island-championship-banner__shimmer" aria-hidden="true" />
      <span className="island-championship-banner__orbit island-championship-banner__orbit--one" aria-hidden="true" />
      <span className="island-championship-banner__orbit island-championship-banner__orbit--two" aria-hidden="true" />
      <span className="island-championship-banner__spark island-championship-banner__spark--one" aria-hidden="true">✦</span>
      <span className="island-championship-banner__spark island-championship-banner__spark--two" aria-hidden="true">✧</span>
      <span className="island-championship-banner__spark island-championship-banner__spark--three" aria-hidden="true">✦</span>

      <div className="island-championship-banner__copy">
        <span className="island-championship-banner__eyebrow">
          <span className="island-championship-banner__live-dot" aria-hidden="true" />
          {championship.eyebrow}
        </span>
        <h3>{championship.title}</h3>
        <p>{championship.tagline}</p>
        <button
          type="button"
          className="island-championship-banner__ceremony-button"
          onClick={onOpenCeremony}
        >
          <span aria-hidden="true">✦</span>
          {championship.ceremonyCallout}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
