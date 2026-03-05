import React, { useEffect } from 'react';

interface WorldHeroProps {
  children?: React.ReactNode;
}

/**
 * WorldHero — Layered hero component providing the atmospheric visual
 * foundation for the world-site landing page.
 *
 * Layer stack (bottom → top):
 *   1. Background  — full-bleed CSS gradient + <img> slot for world-bg-main.webp
 *   2. Atmosphere  — animated star/particle depth layer
 *   3. Glass panel — glassmorphic backdrop panel behind content
 *   4. Bottom glow — radial gradient glow at viewport bottom
 *   5. Content     — {children} rendered on top of all layers
 */
export function WorldHero({ children }: WorldHeroProps) {
  // Inject a <link rel="preload"> hint for the primary hero background.
  // This ensures the browser prioritises the image as soon as it knows about it.
  useEffect(() => {
    const existingPreload = document.head.querySelector(
      'link[rel="preload"][href="/world-assets/world-bg-main.webp"]',
    );
    if (existingPreload) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = '/world-assets/world-bg-main.webp';
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
         * The <img> will only render once the real asset exists on the CDN.
         * Until then the CSS gradient fallback is visible through the
         * transparent background of this element.
         */}
        <img
          className="world-hero__bg-img"
          src="/world-assets/world-bg-main.webp"
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          /* onError hides the broken-image icon; CSS gradient shows instead */
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Layer 2 — Atmosphere / depth (star field) */}
      <div className="world-hero__atmosphere" aria-hidden="true" />

      {/* Layer 3 — Glass panel behind main content area */}
      <div className="world-hero__glass-panel" aria-hidden="true" />

      {/* Layer 4 — Bottom glow */}
      <div className="world-hero__bottom-glow" aria-hidden="true" />

      {/* Layer 5 — Content slot */}
      <div className="world-hero__content">{children}</div>
    </div>
  );
}
