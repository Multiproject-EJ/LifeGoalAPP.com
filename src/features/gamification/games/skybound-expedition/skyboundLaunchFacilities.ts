import type { SkyboundAircraftId } from '../../level-worlds/services/skyboundPilotAcademy';

export type SkyboundLaunchFacilityKind = 'slingshot' | 'runway' | 'boost_runway' | 'storm_catapult' | 'magnetic_rail';

export interface SkyboundLaunchFacilityPresentation {
  id: string;
  kind: SkyboundLaunchFacilityKind;
  name: string;
  instruction: string;
  deckColor: string;
  edgeColor: string;
  energyColor: string;
  deckWidth: number;
  deckLength: number;
  visualCues: readonly [string, string, string];
}

const FACILITIES: Record<SkyboundAircraftId, SkyboundLaunchFacilityPresentation> = {
  toy_glider: {
    id: 'cadet-sling-yard',
    kind: 'slingshot',
    name: 'CADET SLING YARD',
    instruction: 'Pull against both bands and release through the training lane',
    deckColor: '#46684c',
    edgeColor: '#f2c552',
    energyColor: '#50efff',
    deckWidth: 8,
    deckLength: 24,
    visualCues: ['timber sling arms', 'live cyan tension bands', 'striped grass launch lane'],
  },
  prop_trainer: {
    id: 'coastal-short-field',
    kind: 'runway',
    name: 'COASTAL SHORT FIELD',
    instruction: 'Build prop wash, hold the centreline, then rotate',
    deckColor: '#52616a',
    edgeColor: '#f4f0d8',
    energyColor: '#68dfff',
    deckWidth: 10,
    deckLength: 38,
    visualCues: ['white runway dashes', 'blue edge lamps', 'windsock and open hangar'],
  },
  jet_trainer: {
    id: 'vortex-boost-strip',
    kind: 'boost_runway',
    name: 'VORTEX BOOST STRIP',
    instruction: 'Charge the launch sled and stay level over the blast wall',
    deckColor: '#3c3738',
    edgeColor: '#ffbf62',
    energyColor: '#66edff',
    deckWidth: 11,
    deckLength: 42,
    visualCues: ['twin boost rails', 'amber blast deflectors', 'turbine charge pylons'],
  },
  storm_interceptor: {
    id: 'tempest-carrier-catapult',
    kind: 'storm_catapult',
    name: 'TEMPEST CARRIER DECK',
    instruction: 'Hold against the catapult, then launch between lightning beacons',
    deckColor: '#242d42',
    edgeColor: '#c6d6ef',
    energyColor: '#b88cff',
    deckWidth: 14,
    deckLength: 46,
    visualCues: ['armoured carrier deck', 'violet catapult shuttle', 'storm arrestor coils'],
  },
  goldwing_fighter: {
    id: 'goldwing-magnetic-vault',
    kind: 'magnetic_rail',
    name: 'GOLDWING MAGNETIC VAULT',
    instruction: 'Synchronize the magnetic arches and release on the gold pulse',
    deckColor: '#15243d',
    edgeColor: '#ffe276',
    energyColor: '#ffe36d',
    deckWidth: 12,
    deckLength: 50,
    visualCues: ['gold magnetic arches', 'luminous launch spine', 'orbital afterburner cradle'],
  },
};

export function getSkyboundLaunchFacility(aircraftId: SkyboundAircraftId): SkyboundLaunchFacilityPresentation {
  return FACILITIES[aircraftId];
}
