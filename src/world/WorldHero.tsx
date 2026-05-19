import React from 'react';

/** Static path for the primary hero background asset (eagerly preloaded). */
const HERO_BG_SRC = '/landing-page-assets/landingpage_top.webp';

interface WorldHeroProps {
  children?: React.ReactNode;
}

/**
 * WorldHero — Layered hero component providing the atmospheric visual
 * foundation for the world-site landing page.
 *
 * Layer stack (bottom → top):
 *   1. Background    — CSS gradient fallback + real landing top/bottom art
 *   2. Atmosphere    — subtle cloud/light depth layer (CSS)
 *   3. Content       — {children} rendered on top of all layers
 */
export function WorldHero({ children }: WorldHeroProps) {
  // Inject a <link rel="preload"> hint for the primary hero background as a
  // runtime fallback for any navigation that bypasses index.html's static hint.
  React.useEffect(() => {
    const existingPreload = document.head.querySelector(
      `link[rel="preload"][href="${HERO_BG_SRC}"]`,
    );
    if (existingPreload) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = HERO_BG_SRC;
    link.type = 'image/webp';
    document.head.appendChild(link);

    return () => {
      // Remove on unmount to keep head clean in SPA navigation scenarios.
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  return (
    <div className="world-hero">
      {/* Layer 1 — Top landing image with CSS gradient fallback */}
      <div className="world-hero__bg" aria-hidden="true">
        <img
          className="world-hero__bg-img"
          src={HERO_BG_SRC}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Layer 2 — Atmosphere / soft depth layer */}
      <div className="world-hero__atmosphere" aria-hidden="true" />

      {/* Layer 3 — Content slot */}
      <div className="world-hero__content">{children}</div>
    </div>
  );
}
