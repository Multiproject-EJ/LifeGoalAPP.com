export type IslandChampionshipPresentation = {
  islandNumber: 30 | 72 | 117;
  championshipId: 'first-circuit' | '120-worlds' | 'universal-117';
  theme: 'sunrise' | 'worlds' | 'universal';
  eyebrow: string;
  title: string;
  tagline: string;
  ceremonyCallout: string;
  artSrc: string;
  manifestPath: string;
};

const ISLAND_CHAMPIONSHIP_PRESENTATIONS: Record<number, IslandChampionshipPresentation> = {
  30: {
    islandNumber: 30,
    championshipId: 'first-circuit',
    theme: 'sunrise',
    eyebrow: 'Super Level · First Circuit',
    title: 'First Circuit Championship',
    tagline: 'The ribbons are waiting for the sky.',
    ceremonyCallout: 'Watch the constellation ceremony',
    artSrc: '/assets/story/championships/first-circuit/opening-ceremony.webp',
    manifestPath: '/storyline/championship-first-circuit/manifest.json',
  },
  72: {
    islandNumber: 72,
    championshipId: '120-worlds',
    theme: 'worlds',
    eyebrow: 'Super Level · 120 Delegations',
    title: 'The 120 Worlds Championship',
    tagline: 'Every world brings one impossible thing.',
    ceremonyCallout: 'Watch all 120 worlds arrive',
    artSrc: '/assets/story/championships/120-worlds/opening-ceremony.webp',
    manifestPath: '/storyline/championship-120-worlds/manifest.json',
  },
  117: {
    islandNumber: 117,
    championshipId: 'universal-117',
    theme: 'universal',
    eyebrow: 'Super Level · All Arenas Live',
    title: 'The Universal Championship',
    tagline: 'Tonight, 120 skies become one.',
    ceremonyCallout: 'Begin the universal ceremony',
    artSrc: '/assets/story/championships/universal-117/opening-ceremony.webp',
    manifestPath: '/storyline/island-117-universal-championship/manifest.json',
  },
};

export function getIslandChampionshipPresentation(
  islandNumber: number,
): IslandChampionshipPresentation | null {
  return ISLAND_CHAMPIONSHIP_PRESENTATIONS[Math.trunc(islandNumber)] ?? null;
}
