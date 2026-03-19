import React, { useEffect } from 'react';
import { LazyImage } from './LazyImage.tsx';

/** Static path for the primary hero background asset (eagerly preloaded). */
const HERO_BG_SRC = '/landing-page-assets/world-bg-main.webp';

interface WorldHeroProps {
  children?: React.ReactNode;
}

/**
 * WorldHero — Layered hero component providing the atmospheric visual
 * foundation for the world-site landing page.
 *
 * Layer stack (bottom → top):
 *   1. Background    — full-bleed CSS gradient + world-bg-main.webp (eager)
 *   2. Blur depth    — world-bg-blur.webp blurred overlay (lazy)
 *   3. Atmosphere    — animated star/particle depth layer (CSS)
 *   4. Glass panel   — panel-glass-xl.webp glassmorphic backdrop (lazy)
 *   5. Bottom glow   — fx-bottom-glow.webp + CSS radial glow (lazy)
 *   6. Content       — {children} rendered on top of all layers
 */
export function WorldHero({ children }: WorldHeroProps) {
  // Inject a <link rel="preload"> hint for the primary hero background as a
  // runtime fallback for any navigation that bypasses index.html's static hint.
  useEffect(() => {
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
      {/* Layer 1 — Background image with CSS gradient fallback */}
      <div className="world-hero__bg" aria-hidden="true">
        {/*
         * Loaded eagerly (preloaded in index.html). The CSS gradient behind
         * this element acts as fallback if the asset is unavailable.
         */}
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

      {/* Layer 2 — Blur depth overlay (lazy) */}
      <div className="world-hero__blur-layer" aria-hidden="true">
        <LazyImage
          src="/landing-page-assets/world-bg-blur.webp"
          alt=""
          className="world-hero__blur-img"
        />
      </div>

      {/* Layer 3 — Atmosphere / star-field depth layer (CSS) */}
      <div className="world-hero__atmosphere" aria-hidden="true" />

      {/* Layer 4 — Glass panel behind main content area (image + CSS fallback) */}
      <div className="world-hero__glass-panel" aria-hidden="true">
        <LazyImage
          src="/landing-page-assets/panel-glass-xl.webp"
          alt=""
          className="world-hero__panel-img"
        />
      </div>

      {/* Layer 5 — Bottom glow (image + CSS radial gradient fallback) */}
      <div className="world-hero__bottom-glow" aria-hidden="true">
        <LazyImage
          src="/landing-page-assets/fx-bottom-glow.webp"
          alt=""
          className="world-hero__glow-img"
        />
      </div>

      {/* Layer 6 — Content slot */}
      <div className="world-hero__content">{children}</div>
    </div>
  );
}
