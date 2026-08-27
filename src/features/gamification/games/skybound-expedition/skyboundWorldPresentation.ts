import type { SkyboundLevelId } from '../../level-worlds/services/skyboundExpeditionFlight';

export type SkyboundWorldLandmarkKind =
  | 'academy_tower'
  | 'wind_turbine'
  | 'training_balloon'
  | 'lighthouse'
  | 'sea_stack'
  | 'coastal_arch'
  | 'mesa'
  | 'rock_arch'
  | 'thermal_column'
  | 'thunderhead'
  | 'lightning_beacon'
  | 'storm_spire'
  | 'aurora'
  | 'orbital_marker'
  | 'star_cluster';

export interface SkyboundWorldLandmark {
  id: string;
  kind: SkyboundWorldLandmarkKind;
  lateralX: number;
  altitude: number;
  distanceRatio: number;
  scale: number;
}

export interface SkyboundWorldPresentation {
  id: SkyboundLevelId;
  signature: string;
  surfaceColor: string;
  cliffColor: string;
  hazeColor: string;
  lowerDeckColor: string;
  lowerDeckOpacity: number;
  cloudColor: string;
  cloudOpacity: number;
  cloudCount: number;
  landmarks: readonly SkyboundWorldLandmark[];
}

const WORLDS: Record<SkyboundLevelId, SkyboundWorldPresentation> = {
  meadow: {
    id: 'meadow',
    signature: 'Academy towers, wind turbines, and striped practice balloons',
    surfaceColor: '#67ad50',
    cliffColor: '#6f604c',
    hazeColor: '#d6f7ff',
    lowerDeckColor: '#e6f8ff',
    lowerDeckOpacity: 0.62,
    cloudColor: '#f6fdff',
    cloudOpacity: 0.72,
    cloudCount: 26,
    landmarks: [
      { id:'meadow-campus',kind:'academy_tower',lateralX:-25,altitude:12,distanceRatio:.18,scale:1.15 },
      { id:'meadow-turbines',kind:'wind_turbine',lateralX:31,altitude:18,distanceRatio:.39,scale:1.2 },
      { id:'meadow-balloons',kind:'training_balloon',lateralX:-18,altitude:62,distanceRatio:.62,scale:1.1 },
      { id:'meadow-review-tower',kind:'academy_tower',lateralX:28,altitude:22,distanceRatio:.82,scale:.86 },
    ],
  },
  coast: {
    id: 'coast',
    signature: 'Ocean deck, lighthouse beacons, sea stacks, and coastal arch',
    surfaceColor: '#4d8067',
    cliffColor: '#596b72',
    hazeColor: '#c8f5ff',
    lowerDeckColor: '#1675a8',
    lowerDeckOpacity: 0.82,
    cloudColor: '#effcff',
    cloudOpacity: 0.58,
    cloudCount: 20,
    landmarks: [
      { id:'coast-lighthouse',kind:'lighthouse',lateralX:-32,altitude:5,distanceRatio:.2,scale:1.15 },
      { id:'coast-sea-stacks',kind:'sea_stack',lateralX:34,altitude:-2,distanceRatio:.4,scale:1.35 },
      { id:'coast-arch',kind:'coastal_arch',lateralX:-26,altitude:8,distanceRatio:.64,scale:1.45 },
      { id:'coast-beacon',kind:'lighthouse',lateralX:30,altitude:11,distanceRatio:.84,scale:.92 },
    ],
  },
  canyon: {
    id: 'canyon',
    signature: 'Red mesas, rock arches, and rising thermal columns',
    surfaceColor: '#ad623c',
    cliffColor: '#743c31',
    hazeColor: '#edaf78',
    lowerDeckColor: '#c66d43',
    lowerDeckOpacity: 0.38,
    cloudColor: '#ffd8b1',
    cloudOpacity: 0.32,
    cloudCount: 13,
    landmarks: [
      { id:'canyon-mesas',kind:'mesa',lateralX:34,altitude:8,distanceRatio:.18,scale:1.35 },
      { id:'canyon-first-thermal',kind:'thermal_column',lateralX:-22,altitude:18,distanceRatio:.36,scale:1.1 },
      { id:'canyon-rock-arch',kind:'rock_arch',lateralX:25,altitude:24,distanceRatio:.6,scale:1.5 },
      { id:'canyon-final-thermal',kind:'thermal_column',lateralX:-30,altitude:26,distanceRatio:.82,scale:1.3 },
    ],
  },
  storm: {
    id: 'storm',
    signature: 'Thunderheads, driving rain, lightning beacons, and range spires',
    surfaceColor: '#425a59',
    cliffColor: '#232b42',
    hazeColor: '#64779c',
    lowerDeckColor: '#29344d',
    lowerDeckOpacity: 0.66,
    cloudColor: '#59677e',
    cloudOpacity: 0.82,
    cloudCount: 38,
    landmarks: [
      { id:'storm-thunderhead',kind:'thunderhead',lateralX:-27,altitude:58,distanceRatio:.18,scale:1.6 },
      { id:'storm-beacon',kind:'lightning_beacon',lateralX:30,altitude:14,distanceRatio:.37,scale:1.15 },
      { id:'storm-spires',kind:'storm_spire',lateralX:-31,altitude:8,distanceRatio:.61,scale:1.45 },
      { id:'storm-final-thunderhead',kind:'thunderhead',lateralX:25,altitude:70,distanceRatio:.82,scale:1.8 },
    ],
  },
  stratosphere: {
    id: 'stratosphere',
    signature: 'Stars, aurora ribbons, and orbital navigation markers',
    surfaceColor: '#7699aa',
    cliffColor: '#445b72',
    hazeColor: '#193d70',
    lowerDeckColor: '#d9efff',
    lowerDeckOpacity: 0.48,
    cloudColor: '#dfefff',
    cloudOpacity: 0.28,
    cloudCount: 10,
    landmarks: [
      { id:'strato-stars',kind:'star_cluster',lateralX:-8,altitude:110,distanceRatio:.15,scale:1.4 },
      { id:'strato-aurora',kind:'aurora',lateralX:26,altitude:88,distanceRatio:.35,scale:1.5 },
      { id:'strato-orbital-marker',kind:'orbital_marker',lateralX:-25,altitude:92,distanceRatio:.6,scale:1.2 },
      { id:'strato-final-aurora',kind:'aurora',lateralX:-18,altitude:105,distanceRatio:.82,scale:1.8 },
    ],
  },
};

export function getSkyboundWorldPresentation(levelId: SkyboundLevelId): SkyboundWorldPresentation {
  return WORLDS[levelId];
}

