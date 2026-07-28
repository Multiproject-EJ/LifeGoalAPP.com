import React, { useEffect } from 'react';

/** Static path for the primary hero background asset (eagerly preloaded). */
const HERO_BG_SRC = '/landing-page-assets/landingpage_top.webp';
const HERO_DARK_BG_SRC = '/assets/themes/first-light/auth-background.webp';

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
  useEffect(() => {
    const createdLinks = [HERO_BG_SRC, HERO_DARK_BG_SRC].flatMap((href) => {
      const existingPreload = document.head.querySelector(
        `link[rel="preload"][href="${href}"]`,
      );
      if (existingPreload) return [];

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = href;
      link.type = 'image/webp';
      document.head.appendChild(link);
      return [link];
    });

    return () => {
      createdLinks.forEach((link) => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      });
    };
  }, []);

  return (
    <div className="world-hero">
      {/* Layer 1 — Top landing image with CSS gradient fallback */}
      <div className="world-hero__bg" aria-hidden="true">
        <img
          className="world-hero__bg-img world-hero__bg-img--light"
          src={HERO_BG_SRC}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <img
          className="world-hero__bg-img world-hero__bg-img--dark"
          src={HERO_DARK_BG_SRC}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <span className="world-hero__theme-seam" />
      </div>

      {/* Layer 2 — Atmosphere / soft depth layer */}
      <div className="world-hero__atmosphere" aria-hidden="true" />

      {/* Layer 3 — Content slot */}
      <div className="world-hero__content">{children}</div>
    </div>
  );
}
