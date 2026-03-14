export type IslandBoardTheme = {
  id: 'lighthouse_day' | 'sunset_harbor' | 'moon_tide';
  label: string;
  sceneClass: 'scene-1' | 'scene-2' | 'scene-3';
  backgroundImage: string;
  depthMaskImage: string;
  pathOverlayImage?: string;
  tileThemeId: string;
  pathGlowStops: [string, string, string];
};

export const ISLAND_BOARD_THEMES: IslandBoardTheme[] = [
  {
    id: 'lighthouse_day',
    label: 'Lighthouse Day',
    sceneClass: 'scene-1',
    backgroundImage: '/assets/islands/backgrounds/bg_001.svg',
    depthMaskImage: '/assets/islands/depth/depth_mask_001.svg',
    pathOverlayImage: '/assets/islands/path/path_overlay_001.svg',
    tileThemeId: 'lighthouse_day',
    pathGlowStops: ['rgba(161, 236, 255, 0.28)', 'rgba(247, 218, 138, 0.42)', 'rgba(214, 174, 92, 0.65)'],
  },
  {
    id: 'sunset_harbor',
    label: 'Sunset Harbor',
    sceneClass: 'scene-2',
    backgroundImage: '/assets/islands/backgrounds/bg_002.svg',
    depthMaskImage: '/assets/islands/depth/depth_mask_002.svg',
    pathOverlayImage: '/assets/islands/path/path_overlay_002.svg',
    tileThemeId: 'sunset_harbor',
    pathGlowStops: ['rgba(168, 238, 255, 0.26)', 'rgba(255, 206, 134, 0.44)', 'rgba(252, 150, 108, 0.62)'],
  },
  {
    id: 'moon_tide',
    label: 'Moon Tide',
    sceneClass: 'scene-3',
    backgroundImage: '/assets/islands/backgrounds/bg_003.svg',
    depthMaskImage: '/assets/islands/depth/depth_mask_003.svg',
    pathOverlayImage: '/assets/islands/path/path_overlay_003.svg',
    tileThemeId: 'moon_tide',
    pathGlowStops: ['rgba(186, 220, 255, 0.24)', 'rgba(186, 174, 255, 0.38)', 'rgba(130, 158, 255, 0.60)'],
  },
];

export const DEFAULT_ISLAND_BOARD_THEME_ID: IslandBoardTheme['id'] = 'lighthouse_day';

export function getIslandBoardThemeById(id: IslandBoardTheme['id']): IslandBoardTheme {
  return ISLAND_BOARD_THEMES.find((theme) => theme.id === id)
    ?? ISLAND_BOARD_THEMES[0];
}

export function getIslandBoardThemeForIslandNumber(islandNumber: number): IslandBoardTheme {
  const safeIsland = Number.isFinite(islandNumber) ? Math.max(1, Math.floor(islandNumber)) : 1;
  const index = (safeIsland - 1) % ISLAND_BOARD_THEMES.length;
  return ISLAND_BOARD_THEMES[index] ?? ISLAND_BOARD_THEMES[0];
}
