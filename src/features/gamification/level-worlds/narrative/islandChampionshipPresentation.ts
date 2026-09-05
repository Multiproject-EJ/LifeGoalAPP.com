export type IslandChampionshipTier = 'host-cup' | 'circuit-cup' | 'major' | 'universal';

export type IslandChampionshipTheme =
  | 'lagoon'
  | 'golden'
  | 'sunrise'
  | 'lotus'
  | 'ember'
  | 'storm'
  | 'polar'
  | 'worlds'
  | 'enchanted'
  | 'heroes'
  | 'data'
  | 'synapse'
  | 'universal';

export type IslandChampionshipPresentation = {
  islandNumber: number;
  championshipId: string;
  tier: IslandChampionshipTier;
  theme: IslandChampionshipTheme;
  eyebrow: string;
  title: string;
  tagline: string;
  summary: string;
  hostIslandName: string;
  ceremonyCallout: string;
  artSrc: string;
  portraitArtSrc: string;
  artAlt: string;
  stages: readonly [string, string, string, string];
  manifestPath?: string;
};

const CUP_STAGES = ['Qualify', 'Quarterfinal', 'Semifinal', 'Final'] as const;
const HOST_CUP_STAGES = ['Welcome', 'Challenge', 'Showcase', 'Final'] as const;

const ISLAND_CHAMPIONSHIP_PRESENTATIONS: Record<number, IslandChampionshipPresentation> = {
  10: {
    islandNumber: 10,
    championshipId: 'lagoon-lantern',
    tier: 'host-cup',
    theme: 'lagoon',
    eyebrow: 'Host Cup · First Invitation',
    title: 'Lagoon Lantern Cup',
    tagline: 'One quiet lagoon. A sky full of welcome.',
    summary: 'Lagoon Haven opens the expedition’s first friendly host tournament. Learn the Cup rhythm before the Alliance creates its formal circuit.',
    hostIslandName: 'Lagoon Haven',
    ceremonyCallout: 'See the lanterns rise',
    artSrc: '/assets/story/championships/circuit-cups/lagoon-lantern/opening-ceremony-portrait.webp',
    portraitArtSrc: '/assets/story/championships/circuit-cups/lagoon-lantern/opening-ceremony-portrait.webp',
    artAlt: 'Shell lanterns forming a radiant manta ray above Lagoon Haven and its cheering builder robots.',
    stages: HOST_CUP_STAGES,
  },
  20: {
    islandNumber: 20,
    championshipId: 'blaze-trials',
    tier: 'host-cup',
    theme: 'ember',
    eyebrow: 'Host Cup · Second Invitation',
    title: 'Blaze Trials Cup',
    tagline: 'Face the heat. Hold your focus. Forge the final.',
    summary: 'Lava Labyrinth turns its Arena into a controlled trial of focus, resilience and adaptation before the Iron Skiff escape through the molten maze.',
    hostIslandName: 'Lava Labyrinth',
    ceremonyCallout: 'Launch the Iron Skiff',
    artSrc: '/assets/story/championships/circuit-cups/blaze-trials/opening-ceremony-portrait.webp',
    portraitArtSrc: '/assets/story/championships/circuit-cups/blaze-trials/opening-ceremony-portrait.webp',
    artAlt: 'The Blaze Trials opening ceremony above Lava Labyrinth’s volcanic Arena.',
    stages: HOST_CUP_STAGES,
  },
  30: {
    islandNumber: 30,
    championshipId: 'first-circuit',
    tier: 'major',
    theme: 'sunrise',
    eyebrow: 'Major · First Formal Circuit',
    title: 'First Circuit Championship',
    tagline: 'The ribbons are waiting for the sky.',
    summary: 'The friendly host Cups become an official diplomatic competition. For the first time, personal scores form brackets between island teams.',
    hostIslandName: 'Crown of Vines',
    ceremonyCallout: 'Watch the constellation ceremony',
    artSrc: '/assets/story/championships/first-circuit/opening-ceremony.webp',
    portraitArtSrc: '/assets/story/championships/first-circuit/opening-ceremony-portrait.webp',
    artAlt: 'Builder robots releasing ribbons that become living constellations above the First Circuit Arena.',
    stages: ['Delegations', 'Bracket', 'Semifinal', 'Grand Final'],
    manifestPath: '/storyline/championship-first-circuit/manifest.json',
  },
  40: {
    islandNumber: 40,
    championshipId: 'lotus-crown',
    tier: 'circuit-cup',
    theme: 'lotus',
    eyebrow: 'Circuit Cup · Living Garden',
    title: 'Lotus Crown Cup',
    tagline: 'The Arena grows around every brave choice.',
    summary: 'Lotus Lagoon hosts a living bracket where each round opens another part of the ceremonial garden.',
    hostIslandName: 'Lotus Lagoon',
    ceremonyCallout: 'Open the living Arena',
    artSrc: '/assets/story/championships/circuit-cups/lotus-crown/opening-ceremony-portrait.webp',
    portraitArtSrc: '/assets/story/championships/circuit-cups/lotus-crown/opening-ceremony-portrait.webp',
    artAlt: 'A giant lotus and constellation butterflies blooming above a living garden Arena.',
    stages: CUP_STAGES,
  },
  50: {
    islandNumber: 50,
    championshipId: 'emberglass',
    tier: 'circuit-cup',
    theme: 'ember',
    eyebrow: 'Circuit Cup · Forge Festival',
    title: 'Emberglass Cup',
    tagline: 'Pressure becomes light when the whole forge listens.',
    summary: 'Ashfall Ridge celebrates control rather than destruction: precise Arena performances turn resonant crystal sparks into a firebird of light.',
    hostIslandName: 'Ashfall Ridge',
    ceremonyCallout: 'Light the emberglass',
    artSrc: '/assets/story/championships/circuit-cups/emberglass/opening-ceremony-portrait.webp',
    portraitArtSrc: '/assets/story/championships/circuit-cups/emberglass/opening-ceremony-portrait.webp',
    artAlt: 'Forge robots creating a translucent emberglass firebird above a volcanic festival Arena.',
    stages: CUP_STAGES,
  },
  60: {
    islandNumber: 60,
    championshipId: 'festival-of-storms',
    tier: 'circuit-cup',
    theme: 'storm',
    eyebrow: 'Circuit Cup · Weather Orchestra',
    title: 'Festival of Storms Cup',
    tagline: 'Do not outrun the storm. Learn its rhythm.',
    summary: 'Rain, wind and lightning become instruments in a high-cloud Arena where every round asks for a different kind of timing.',
    hostIslandName: 'Festival of Storms',
    ceremonyCallout: 'Conduct the opening storm',
    artSrc: '/assets/story/championships/circuit-cups/festival-of-storms/opening-ceremony-portrait.webp',
    portraitArtSrc: '/assets/story/championships/circuit-cups/festival-of-storms/opening-ceremony-portrait.webp',
    artAlt: 'A friendly cloud dragon made from rain and lightning above a high-cloud Arena.',
    stages: CUP_STAGES,
  },
  70: {
    islandNumber: 70,
    championshipId: 'polar-crown',
    tier: 'circuit-cup',
    theme: 'polar',
    eyebrow: 'Circuit Cup · Worlds Qualifier',
    title: 'Polar Crown Cup',
    tagline: 'One last clear signal before every world arrives.',
    summary: 'The final Circuit Cup before the 120 Worlds Major tests calm, clarity and consistency beneath Polar Crown’s aurora.',
    hostIslandName: 'Polar Crown',
    ceremonyCallout: 'Ring the crystal bells',
    artSrc: '/assets/story/championships/circuit-cups/polar-crown/opening-ceremony-portrait.webp',
    portraitArtSrc: '/assets/story/championships/circuit-cups/polar-crown/opening-ceremony-portrait.webp',
    artAlt: 'Aurora light forming a crystal stag above an ice-palace Arena and skating builder robots.',
    stages: CUP_STAGES,
  },
  72: {
    islandNumber: 72,
    championshipId: '120-worlds',
    tier: 'major',
    theme: 'worlds',
    eyebrow: 'Major · 120 Delegations',
    title: 'The 120 Worlds Championship',
    tagline: 'Every world brings one impossible thing.',
    summary: 'All 120 cultures are represented in a curated programme shaped by your Arena preferences. One network connects every delegation.',
    hostIslandName: 'Equilibrium Isle',
    ceremonyCallout: 'Watch all 120 worlds arrive',
    artSrc: '/assets/story/championships/120-worlds/opening-ceremony.webp',
    portraitArtSrc: '/assets/story/championships/120-worlds/opening-ceremony-portrait.webp',
    artAlt: 'One hundred and twenty world gateways creating a translucent sky-whale above an ocean Arena.',
    stages: ['Arrival', 'World Groups', 'Semifinal', 'World Final'],
    manifestPath: '/storyline/championship-120-worlds/manifest.json',
  },
  80: {
    islandNumber: 80,
    championshipId: 'enchanted-shores',
    tier: 'circuit-cup',
    theme: 'enchanted',
    eyebrow: 'Circuit Cup · Storycraft',
    title: 'Enchanted Shores Cup',
    tagline: 'Every round writes a different ending.',
    summary: 'Enchanted Shores treats competition as collaborative storycraft, with each Arena discipline adding a new page to the sky.',
    hostIslandName: 'Enchanted Shores',
    ceremonyCallout: 'Turn the first page',
    artSrc: '/assets/story/championships/circuit-cups/enchanted-shores/opening-ceremony-portrait.webp',
    portraitArtSrc: '/assets/story/championships/circuit-cups/enchanted-shores/opening-ceremony-portrait.webp',
    artAlt: 'An enormous luminous storybook opening above a coastal fantasy Arena and friendly robots.',
    stages: CUP_STAGES,
  },
  90: {
    islandNumber: 90,
    championshipId: 'shrine-of-heroes',
    tier: 'circuit-cup',
    theme: 'heroes',
    eyebrow: 'Circuit Cup · Shared Courage',
    title: 'Shrine of Heroes Cup',
    tagline: 'No single hand carries the whole star.',
    summary: 'The Shrine honours explorers, makers and helpers. The tournament rewards adaptable play across several Arena disciplines.',
    hostIslandName: 'Shrine of Heroes',
    ceremonyCallout: 'Wake the hero constellations',
    artSrc: '/assets/story/championships/circuit-cups/shrine-of-heroes/opening-ceremony-portrait.webp',
    portraitArtSrc: '/assets/story/championships/circuit-cups/shrine-of-heroes/opening-ceremony-portrait.webp',
    artAlt: 'Many constellation hands holding one star above a peaceful mountain shrine Arena.',
    stages: CUP_STAGES,
  },
  100: {
    islandNumber: 100,
    championshipId: 'data-stream',
    tier: 'circuit-cup',
    theme: 'data',
    eyebrow: 'Circuit Cup · Neon Signal',
    title: 'Data Stream Cup',
    tagline: 'Fast signal. Clear choice. One brilliant flight.',
    summary: 'Data Stream Island converts every performance into an abstract ribbon of light, revealing patterns across the full bracket.',
    hostIslandName: 'Data Stream Island',
    ceremonyCallout: 'Start the signal flight',
    artSrc: '/assets/story/championships/circuit-cups/data-stream/opening-ceremony-portrait.webp',
    portraitArtSrc: '/assets/story/championships/circuit-cups/data-stream/opening-ceremony-portrait.webp',
    artAlt: 'Neon data ribbons forming a brilliant hummingbird above a futuristic Arena.',
    stages: CUP_STAGES,
  },
  110: {
    islandNumber: 110,
    championshipId: 'synapse',
    tier: 'circuit-cup',
    theme: 'synapse',
    eyebrow: 'Circuit Cup · Memory Garden',
    title: 'Synapse Cup',
    tagline: 'Every good choice lights another path.',
    summary: 'Synapse Isle closes the regular circuit calendar in a living network of memory-orbs, shared signals and changing strategy.',
    hostIslandName: 'Synapse Isle',
    ceremonyCallout: 'Grow the memory constellation',
    artSrc: '/assets/story/championships/circuit-cups/synapse/opening-ceremony-portrait.webp',
    portraitArtSrc: '/assets/story/championships/circuit-cups/synapse/opening-ceremony-portrait.webp',
    artAlt: 'A cosmic jellyfish blooming above a bioluminescent neural garden Arena.',
    stages: CUP_STAGES,
  },
  117: {
    islandNumber: 117,
    championshipId: 'universal-117',
    tier: 'universal',
    theme: 'universal',
    eyebrow: 'Universal Final · All Arenas Live',
    title: 'The Universal Championship',
    tagline: 'Tonight, 120 skies become one.',
    summary: 'Every Arena runs simultaneously. Scores, celebrations and route signals synchronize across the network—and reveal something no one expected.',
    hostIslandName: 'Astral Plains',
    ceremonyCallout: 'Begin the universal ceremony',
    artSrc: '/assets/story/championships/universal-117/opening-ceremony.webp',
    portraitArtSrc: '/assets/story/championships/universal-117/opening-ceremony-portrait.webp',
    artAlt: 'All 120 Arena windows opening into a cosmic flower above Astral Plains.',
    stages: ['All Arenas', 'World Relay', 'Universal Final', 'Celebration'],
    manifestPath: '/storyline/island-117-universal-championship/manifest.json',
  },
};

export const ISLAND_CHAMPIONSHIP_NUMBERS = Object.freeze(
  Object.keys(ISLAND_CHAMPIONSHIP_PRESENTATIONS).map(Number).sort((a, b) => a - b),
);

export function listIslandChampionshipPresentations(): IslandChampionshipPresentation[] {
  return ISLAND_CHAMPIONSHIP_NUMBERS.map((islandNumber) => ISLAND_CHAMPIONSHIP_PRESENTATIONS[islandNumber]);
}

export function getIslandChampionshipPresentation(
  islandNumber: number,
): IslandChampionshipPresentation | null {
  return ISLAND_CHAMPIONSHIP_PRESENTATIONS[Math.trunc(islandNumber)] ?? null;
}

export function getChampionshipOpeningSeenStorageKey(
  userId: string,
  cycleIndex: number,
  championshipId: string,
): string {
  return `island_run_championship_opening_v1_${userId}_${Math.max(0, Math.trunc(cycleIndex))}_${championshipId}`;
}
