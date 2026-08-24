import { createExpeditionShipThreeModel } from '../../dev/ExpeditionShipThreeModel';
import { assert, assertEqual, type TestCase } from './testHarness';

export const expeditionShipThreeContractTests: TestCase[] = [
  {
    name: 'keeps the 150m walker ship inside geometry budgets with one persistent articulated hierarchy',
    run: () => {
      for (const quality of ['low', 'high'] as const) {
        const model = createExpeditionShipThreeModel(quality);
        assert(model.metrics.triangles > 15000, `${quality} ship should be actual 3D geometry`);
        assert(model.metrics.triangles < 72000, `${quality} ship should stay inside the macro triangle budget`);
        assert(model.metrics.meshCount < 160, `${quality} blockout should keep a bounded mesh hierarchy before batching`);

        const runtime = model.root.userData.sculptRuntime as {
          scaleMetres?: {living?: {width?: number}; hypersonic?: {width?: number}};
          protectedSanctuary?: {node?: string; immutableLocalScale?: boolean; immutableLocalOrientation?: boolean};
          locomotion?: {
            legs?: number;
            gait?: string;
            poweredFrontLegs?: string[];
            rearStabilizers?: string[];
            primaryHoverLift?: string;
            stabilizedPayload?: string;
          };
          propulsion?: {layout?: string; primaryDrives?: string[]};
          protection?: {
            pressureWindow?: string;
            wraparoundGlass?: string;
            physicalArmor?: string[];
            armorScales?: string;
            seamProtection?: string;
            conformalEmitters?: string;
          };
          inhabitedInterior?: {
            node?: string;
            visualScale?: number;
            pressureEnvelopeDepth?: number;
            galleryDeckLevels?: number[];
            occupiedStoreys?: number;
            compactModuleScale?: number;
            dedicatedLowerDecks?: string[];
            openGardenVoid?: {width?: number; depth?: number};
            cameraClearanceRadius?: number;
            cameraAnchors?: string[];
            circulation?: string[];
            havenGlazing?: string;
            frontGalleryClosure?: string;
          };
          interiorProgram?: {
            order?: string[];
            fabrication?: {
              node?: string;
              retractable?: boolean;
              dedicatedFullWidthDeck?: boolean;
              includes?: string[];
              garageBays?: string[];
              floorSystems?: string[];
            };
            creatureHabitat?: {
              node?: string;
              dedicatedFullWidthDeck?: boolean;
              amenities?: string[];
              habitatZones?: string[];
              residenceScaleClasses?: string[];
              noCreaturesAuthoredYet?: boolean;
            };
            zenGarden?: {node?: string; features?: string[]};
            mixedUseRing?: {
              node?: string;
              apartments?: string;
              storeys?: number;
              compactModuleScale?: number;
              estimatedSuiteCount?: number;
              amenities?: string[];
              spatialZones?: string[];
            };
            crown?: {node?: string; steeringHouses?: string; administration?: string};
          };
          effectSockets?: string[];
          speedShell?: {node?: string; shapeAuthority?: string; designLanguage?: string};
        };
        assertEqual(runtime.scaleMetres?.living?.width, 150, 'living mode should use the approved 150m envelope');
        assertEqual(runtime.scaleMetres?.hypersonic?.width, 128, 'hypersonic mode should retain a plausible 128m occupied envelope');
        assertEqual(runtime.locomotion?.legs, 4, 'walker architecture should expose four articulated legs');
        assertEqual(runtime.locomotion?.gait, 'diagonal-four-beat-terrain-walk', 'walker gait should be explicit');
        assertEqual(runtime.locomotion?.poweredFrontLegs?.length, 2, 'both controller grips should own one powered front leg');
        assertEqual(runtime.locomotion?.rearStabilizers?.length, 2, 'two lighter rear stabilizers should complete the stance');
        assertEqual(runtime.locomotion?.primaryHoverLift, 'CENTRAL_KEEL_DRIVE', 'the centreline drive should carry primary hover balance');
        assertEqual(runtime.locomotion?.stabilizedPayload, 'STABILIZED_INHABITED_HULL', 'occupied decks should share a stabilized hull frame');
        assertEqual(runtime.protectedSanctuary?.node, 'SANCTUARY_CLEARANCE_VOLUME', 'the immutable occupied core should be explicit');
        assert(runtime.protectedSanctuary?.immutableLocalScale, 'travel modes must not shrink the sanctuary');
        assert(runtime.protectedSanctuary?.immutableLocalOrientation, 'travel modes must not rotate the sanctuary through the shell');
        assertEqual(runtime.propulsion?.layout, 'tri-drive', 'propulsion should expose exactly one keel and two grip drives');
        assertEqual(runtime.propulsion?.primaryDrives?.length, 3, 'the primary propulsion hierarchy should contain three drives');
        assertEqual(runtime.protection?.physicalArmor?.length, 4, 'the pressure window should have four attached armor leaves');
        assertEqual(runtime.protection?.wraparoundGlass, 'HAVEN_WRAPAROUND_GLASS_CORRIDOR', 'Haven glazing should continue around the sides, roof and rear');
        assertEqual(runtime.protection?.armorScales, 'WRAPAROUND_GLASS_ARMOR_SCALE_INSTANCES', 'travel mode should expose one sequenced micro-armor system');
        assertEqual(runtime.protection?.seamProtection, 'WINDOW_ARMOR_SEAM_BACKSTOP', 'travel armor should seal foliage-sized gaps behind the four leaves');
        assertEqual(runtime.inhabitedInterior?.node, 'INHABITED_INTERIOR_ARCHITECTURE', 'the traversable interior should be a named runtime volume');
        assertEqual(runtime.inhabitedInterior?.visualScale, 0.84, 'the inhabited core should be compacted inside the full-size outer shell');
        assertEqual(runtime.speedShell?.node, 'SPEED_CONTROLLER_GAME_SHELL_CORE', 'fast travel should replace the open centre with one smooth controller core');
        assertEqual(runtime.speedShell?.shapeAuthority, 'src/assets/Blue_darkcontroller.webp', 'the game controller artwork should be the literal speed-shell authority');
        assert((runtime.inhabitedInterior?.pressureEnvelopeDepth ?? 0) >= 2, 'the atrium should have real fore-aft depth rather than a shallow facade');
        assertEqual(runtime.inhabitedInterior?.galleryDeckLevels?.length, 6, 'the compact atrium perimeter should expose six occupied gallery storeys');
        assertEqual(runtime.inhabitedInterior?.occupiedStoreys, 6, 'runtime metadata should preserve the six-storey interior decision');
        assert((runtime.inhabitedInterior?.compactModuleScale ?? 1) <= 0.72, 'apartment and amenity modules should be compact enough for the added storeys');
        assertEqual(runtime.inhabitedInterior?.dedicatedLowerDecks?.length, 2, 'workshop and creature habitat should remain separate protected lower decks');
        assert((runtime.inhabitedInterior?.openGardenVoid?.width ?? 0) >= 2.48, 'gallery floors should preserve the protected sanctuary width');
        assert((runtime.inhabitedInterior?.openGardenVoid?.depth ?? 0) >= 1.46, 'gallery floors should preserve the protected sanctuary depth');
        assert((runtime.inhabitedInterior?.cameraClearanceRadius ?? 0) >= 0.18, 'interior POV anchors should reserve human-eye-height clearance');
        assertEqual(runtime.inhabitedInterior?.cameraAnchors?.length, 9, 'all inhabited program levels and both Haven terraces should expose true interior camera anchors');
        assertEqual(runtime.inhabitedInterior?.frontGalleryClosure, 'open', 'Haven galleries must not complete a circular wall in front of the tree');
        assert(runtime.inhabitedInterior?.circulation?.includes('interior-atrium-stair-flight-instances'), 'interior circulation should include a modeled stair flight');
        assertEqual(runtime.interiorProgram?.order?.length, 5, 'the vertical ship program should expose five ordered inhabited zones');
        assert(runtime.interiorProgram?.fabrication?.retractable, 'the lowest fabrication and garage level should retract for travel');
        assert(runtime.interiorProgram?.fabrication?.dedicatedFullWidthDeck, 'the workshop and garage should retain a dedicated full-width industrial floor');
        assert(runtime.interiorProgram?.fabrication?.includes?.includes('machine-workbench'), 'the fabrication deck should include a machine workbench');
        assertEqual(runtime.interiorProgram?.fabrication?.garageBays?.length, 3, 'the workshop should reserve three distinct vehicle and fabrication bay types');
        assert(runtime.interiorProgram?.fabrication?.floorSystems?.includes('magnetic-wheel-clamps'), 'the garage should expose vehicle-scale magnetic docking clamps');
        assert(runtime.interiorProgram?.fabrication?.floorSystems?.includes('overhead-handling-gantry'), 'the workshop should expose an overhead module-handling system');
        assert(runtime.interiorProgram?.creatureHabitat?.dedicatedFullWidthDeck, 'the premium creature habitat should retain its own full-width floor above the workshop');
        assert(runtime.interiorProgram?.creatureHabitat?.amenities?.includes('soft-nests'), 'the creature habitat should be a premium comfort environment');
        assertEqual(runtime.interiorProgram?.creatureHabitat?.habitatZones?.length, 6, 'the creature sanctuary should support six distinct future habitat behaviours');
        assert(runtime.interiorProgram?.creatureHabitat?.habitatZones?.includes('elevated-perch-grove'), 'the sanctuary should support climbing and perching creatures');
        assert(runtime.interiorProgram?.creatureHabitat?.habitatZones?.includes('amphibious-bathing-rill'), 'the sanctuary should support amphibious creatures');
        assertEqual(runtime.interiorProgram?.creatureHabitat?.residenceScaleClasses?.length, 3, 'creature residences should support small, medium and large occupants');
        assertEqual(runtime.interiorProgram?.creatureHabitat?.noCreaturesAuthoredYet, true, 'this pass should establish habitats without prematurely adding creatures');
        assert(runtime.interiorProgram?.zenGarden?.features?.includes('running-water'), 'the Zen garden should include running water');
        assert(runtime.interiorProgram?.mixedUseRing?.amenities?.includes('panoramic-restaurant'), 'the inhabited ring should reserve a real panoramic restaurant');
        assertEqual(runtime.interiorProgram?.mixedUseRing?.storeys, 6, 'apartments and amenities should occupy six compact perimeter storeys');
        assert((runtime.interiorProgram?.mixedUseRing?.estimatedSuiteCount ?? 0) >= 200, 'the compact ring should reserve hundreds of apartment suites');
        assertEqual(runtime.interiorProgram?.mixedUseRing?.spatialZones?.length, 9, 'the denser inhabited ring should establish nine non-overlapping facility zones');
        assertEqual(runtime.interiorProgram?.mixedUseRing?.apartments, 'many', 'the mixed-use ring should include many apartments');
        assert(runtime.interiorProgram?.mixedUseRing?.amenities?.includes('cinema'), 'the mixed-use ring should include a cinema');
        assert(runtime.interiorProgram?.mixedUseRing?.amenities?.includes('gym'), 'the mixed-use ring should include a gym');
        assertEqual(runtime.interiorProgram?.crown?.steeringHouses, 'two-forward-shoulder-three-floor-bridges', 'both forward shoulder bays should contain three-floor steering houses');
        assertEqual(runtime.interiorProgram?.crown?.administration, 'two-rear-shoulder-three-floor-suites', 'administration should occupy both rear shoulder bays');
        assert(runtime.effectSockets?.includes('walker-leg-trim-rockets'), 'leg trim rockets should be exposed as effect sockets');
        assert(runtime.effectSockets?.includes('port-grip-drive'), 'port grip drive should be exposed');
        assert(runtime.effectSockets?.includes('starboard-grip-drive'), 'starboard grip drive should be exposed');
        assert(runtime.effectSockets?.includes('central-keel-drive'), 'central keel drive should be exposed');

        const names = new Set<string>();
        model.root.traverse((object) => names.add(object.name));
        for (const legName of [
          'POWERED_GRIP_FRONT_LEG_LEFT',
          'POWERED_GRIP_FRONT_LEG_RIGHT',
          'REAR_STABILIZER_LEG_LEFT',
          'REAR_STABILIZER_LEG_RIGHT',
        ]) assert(names.has(legName), `${quality} ship should preserve ${legName}`);
        assert(names.has('SANCTUARY_CLEARANCE_VOLUME'), `${quality} ship should preserve the protected occupied volume`);
        assert(names.has('PERMANENT_PRESSURE_WINDOW'), `${quality} ship should preserve the fixed pressure glazing`);
        assert(names.has('HAVEN_WRAPAROUND_GLASS_CORRIDOR'), `${quality} ship should wrap Haven glass across the sides, roof and rear`);
        assert(names.has('RETRACTABLE_WINDOW_ARMOR'), `${quality} ship should preserve the attached window armor hierarchy`);
        assert(names.has('WRAPAROUND_GLASS_ARMOR_SCALE_INSTANCES'), `${quality} ship should protect the wraparound glazing with sequenced armor scales`);
        assert(!names.has('atrium-vertical-structure-instances'), `${quality} Haven should not restore the obstructive front mullion grid`);
        assert(names.has('WINDOW_ARMOR_SEAM_BACKSTOP'), `${quality} ship should preserve travel-mode seam protection`);
        assert(names.has('CONFORMAL_SHIELD_EMITTERS'), `${quality} ship should preserve the conformal field emitters`);
        assert(names.has('CENTRAL_KEEL_DRIVE'), `${quality} ship should preserve the centreline primary drive`);
        assert(names.has('STABILIZED_INHABITED_HULL'), `${quality} ship should preserve the inhabited stabilization frame`);
        assert(names.has('INHABITED_INTERIOR_ARCHITECTURE'), `${quality} ship should expose the continuous interior architecture`);
        assert(names.has('SPEED_CONTROLLER_GAME_SHELL_CORE'), `${quality} ship should expose the smooth game-controller speed shell`);
        assert(names.has('interior-open-room-portal-frame-instances'), `${quality} ship should use open room frames instead of solid facade boxes`);
        assert(names.has('interior-pressure-bulkhead-instances'), `${quality} ship should bound the traversable interior with real pressure bulkheads`);
        assert(names.has('interior-atrium-stair-flight-instances'), `${quality} ship should model vertical atrium circulation`);
        assert(names.has('interior-star-canopy-light-instances'), `${quality} ship should give the interior canopy a star field`);
        assert(names.has('SANCTUARY_FLOOR_POV'), `${quality} ship should expose the true garden-floor camera anchor`);
        assert(names.has('UPPER_BALCONY_DOWN_POV'), `${quality} ship should expose the true balcony-down camera anchor`);
        assert(names.has('UPPER_BALCONY_ACROSS_POV'), `${quality} ship should expose the true balcony-across camera anchor`);
        assert(names.has('DECK_00_RETRACTABLE_FABRICATION_AND_GARAGE'), `${quality} ship should expose the retractable fabrication and garage deck`);
        assert(names.has('fabrication-machine-and-workbench-instances'), `${quality} ship should populate the fabrication level with machine and workbench modules`);
        assert(names.has('DECK_01_PREMIUM_CREATURE_HABITAT'), `${quality} ship should expose the premium creature habitat`);
        assert(names.has('premium-creature-comfort-pod-instances'), `${quality} ship should populate the creature habitat with comfort pods`);
        assert(names.has('CREATURE_GREEN_BATHING_STREAM_AND_COVE'), `${quality} creature habitat should include its own modest bathing stream and social cove`);
        assert(names.has('DECK_02_ZEN_GARDEN_COMMONS'), `${quality} ship should expose the Zen garden commons`);
        assert(names.has('zen-garden-running-water-segment-instances'), `${quality} ship should route running water through the Zen garden`);
        assert(names.has('DECK_03_MIXED_USE_RESIDENTIAL_RING'), `${quality} ship should expose the apartment and amenity ring`);
        assert(names.has('apartment-cinema-gym-store-chill-suite-instances'), `${quality} ship should populate the mixed-use ring`);
        const roomPortals = model.root.getObjectByName('interior-open-room-portal-frame-instances')!;
        assertEqual(roomPortals.userData.program?.storeys, 6, `${quality} ship should instance room portals across all six storeys`);
        assert((roomPortals.userData.program?.compactResidentialDoorCount ?? 0) >= 100, `${quality} ship should visibly reserve more than one hundred compact room entries`);
        assert(names.has('CROWN_COMMAND_AND_ADMINISTRATION'), `${quality} ship should expose the command and administration crown`);
        assert(names.has('SEALED_THREE_LEVEL_STEERING_AND_ADMINISTRATION_SUITES'), `${quality} ship should expose three floors in each sealed shoulder suite`);
        assert(names.has('GREAT_TREE_CROWN_TERRACE_AND_PAVILION'), `${quality} ship should give the Great Tree a crown terrace and treehouse pavilion`);
        assert(names.has('tree-top-observatory-lounge-instances'), `${quality} ship should furnish the tree terrace with observatory lounges`);
        assert(names.has('haven-luxury-bar-seating-and-lantern-instances'), `${quality} ship should furnish the Haven terraces with bars, seating and lights`);
        assert(names.has('haven-luxury-terrace-plant-instances'), `${quality} ship should densely plant the Haven terraces`);
        assert(names.has('FABRICATION_DECK_POV'), `${quality} ship should expose an interior fabrication-deck camera`);
        assert(names.has('CREATURE_HABITAT_POV'), `${quality} ship should expose an interior creature-habitat camera`);
        const fabricationModules = model.root.getObjectByName('fabrication-machine-and-workbench-instances')!;
        const fabricationDeckProgram = model.root.getObjectByName('DECK_00_RETRACTABLE_FABRICATION_AND_GARAGE')!;
        const creatureDeckProgram = model.root.getObjectByName('DECK_01_PREMIUM_CREATURE_HABITAT')!;
        const creaturePods = model.root.getObjectByName('premium-creature-comfort-pod-instances')!;
        const creatureLandscape = model.root.getObjectByName('CREATURE_GREEN_BATHING_STREAM_AND_COVE')!;
        const keelServiceCore = model.root.getObjectByName('keel-column')!;
        const zenCommons = model.root.getObjectByName('DECK_02_ZEN_GARDEN_COMMONS')!;
        assert(fabricationModules.userData.program?.equipment?.includes('diagnostic-screen'), `${quality} workshop modules should include visible diagnostic stations`);
        assert(fabricationModules.userData.program?.equipment?.includes('robot-service-cradle'), `${quality} workshop modules should include robot service cradles`);
        assert(fabricationModules.userData.program?.equipment?.includes('curved-machine-bench'), `${quality} workshop stations should avoid repeating rectangular office desks`);
        assert(fabricationModules.userData.program?.equipment?.includes('articulated-robot-service-cradle'), `${quality} workshop stations should expose articulated machine-service anatomy`);
        assertEqual(fabricationDeckProgram.userData.program?.garageBays?.length, 3, `${quality} fabrication deck should retain vehicle, lift and clean-bench zones`);
        assert(fabricationDeckProgram.userData.program?.floorSystems?.includes('twin-service-trenches'), `${quality} garage floor should expose twin service trenches`);
        assertEqual(creatureDeckProgram.userData.program?.habitatZones?.length, 6, `${quality} creature deck should remain a six-zone multispecies sanctuary`);
        assertEqual(creatureDeckProgram.userData.program?.noCreaturesAuthoredYet, true, `${quality} sanctuary programming should remain unoccupied during this modeling pass`);
        assert(creaturePods.userData.program?.amenities?.includes('water-bowl'), `${quality} creature pods should include modeled water bowls`);
        assert(creaturePods.userData.program?.amenities?.includes('living-plant'), `${quality} creature pods should include living greenery`);
        assert(creaturePods.userData.program?.amenities?.includes('curved-privacy-cove'), `${quality} creature residences should use curved privacy coves rather than office-like slab backs`);
        assertEqual(creatureLandscape.userData.program?.role, 'multispecies-green-sanctuary-and-curved-social-cove', `${quality} creature landscape should expose the multispecies sanctuary programme`);
        assertEqual(creatureLandscape.userData.program?.habitatZones?.length, 6, `${quality} creature landscape should model six distinct habitat zones`);
        assertEqual(creatureLandscape.userData.program?.occupantsPresent, false, `${quality} habitat geometry should be authored without creature occupants yet`);
        assertEqual(creatureLandscape.userData.program?.fixedInsidePressureDeck, true, `${quality} creature bathing landscape should remain fixed inside the protected habitat`);
        assertEqual(creatureLandscape.userData.program?.pressureCeiling, 'integrated-warm-lit-ceiling-cassette', `${quality} creature habitat should remain a contained pressure room during inspection`);
        assertEqual(creatureLandscape.userData.program?.panoramicGardenGlass, true, `${quality} creature habitat should retain a protected panoramic Zen-garden overlook`);
        assertEqual(keelServiceCore.userData.program?.role, 'telescoping-engine-lift-service-core', `${quality} central column should read as an intentional engine and lift core`);
        assertEqual(keelServiceCore.userData.program?.retractsDownward, true, `${quality} engine and lift core should telescope downward away from the occupied sanctuary`);
        assert(zenCommons.position.y >= 0.2, `${quality} Zen commons should sit above the dedicated creature floor rather than flattening its headroom`);
        assert(names.has('STEERING_HOUSE_POV'), `${quality} ship should expose an interior steering-house camera`);
        assert(names.has('ADMINISTRATION_POV'), `${quality} ship should expose an interior administration camera`);
        assert(names.has('PANORAMIC_RESTAURANT_AND_KITCHEN'), `${quality} ship should reserve a panoramic restaurant zone`);
        assert(names.has('CINEMA_AND_MEDIA_LOUNGE'), `${quality} ship should reserve a cinema and media zone`);
        assert(names.has('TRANSFORMATION_WARNING_BEACON_INSTANCES'), `${quality} ship should expose transformation warning lights`);
        assert(names.has('LEFT_MAIN_ENGINE_THRUST'), `${quality} ship should preserve one left main engine`);
        assert(names.has('RIGHT_MAIN_ENGINE_THRUST'), `${quality} ship should preserve one right main engine`);
        assert(names.has('CENTRAL_KEEL_DRIVE_THRUST'), `${quality} ship should preserve one centreline main drive`);

        const sanctuary = model.root.getObjectByName('SANCTUARY_CLEARANCE_VOLUME')!;
        assert(sanctuary, 'sanctuary clearance node should be queryable');
        const sanctuaryScale = sanctuary.scale.clone();
        const sanctuaryRotation = sanctuary.quaternion.clone();
        const floorPov = model.root.getObjectByName('SANCTUARY_FLOOR_POV')!;
        const balconyPov = model.root.getObjectByName('UPPER_BALCONY_DOWN_POV')!;
        assert(floorPov.position.z < 0.62, 'garden-floor POV must sit behind the front gallery edge, inside the pressure envelope');
        assert(floorPov.position.y > -0.6, 'garden-floor POV must sit above the garden floor');
        assert(Math.abs(balconyPov.position.x) > 0.96, 'balcony POV must stand on the compact curved side gallery outside the open sanctuary void');
        assert(Math.abs(balconyPov.position.x) < 1.3, 'balcony POV must remain inside the pressure glazing instead of clipping into the outer shoulder');
        assert(balconyPov.position.y > 0.9, 'balcony POV must stand at human eye height above the upper deck');

        model.update({timeSeconds: 0, pose: 'docked', reducedMotion: true});
        assert(model.root.getObjectByName('LIVING_MODE_SIDE_TERRACES')?.visible, 'Haven should deploy both large luxury garden terraces');
        assertEqual(model.root.getObjectByName('LANDING_KEEL')?.position.y, 0, 'Haven should extend the service column downward without entering the habitat');
        model.update({timeSeconds: 0, pose: 'expedition', reducedMotion: true});
        const fabricationDeck = model.root.getObjectByName('DECK_00_RETRACTABLE_FABRICATION_AND_GARAGE')!;
        const expeditionFabricationZ = fabricationDeck.position.z;
        const expeditionFabricationHeight = fabricationDeck.scale.y;
        assert(!model.root.getObjectByName('SPEED_CONTROLLER_GAME_SHELL_CORE')?.visible, 'Walker should keep the speed shell parked');
        assert(!model.root.getObjectByName('WINDOW_ARMOR_LEAF_UPPER')?.visible, 'Walker should keep the sanctuary armor fully parked');
        assert(!model.root.getObjectByName('WRAPAROUND_GLASS_ARMOR_SCALE_INSTANCES')?.visible, 'Walker should keep the wraparound armor scales parked');
        assert(!model.root.getObjectByName('WINDOW_ARMOR_SEAM_BACKSTOP')?.visible, 'Walker should keep the seam backstop hidden');
        assert(!model.root.getObjectByName('LIVING_MODE_SIDE_TERRACES')?.visible, 'Walker should roll the Haven luxury terraces fully into the hull');
        assert(model.root.getObjectByName('PERMANENT_PRESSURE_WINDOW')?.visible, 'Walker should remain enclosed by transparent pressure glass');
        assert(model.root.getObjectByName('HAVEN_WRAPAROUND_GLASS_CORRIDOR')?.visible, 'Walker should keep its side, roof and rear pressure glass closed');
        assert((model.root.getObjectByName('LANDING_KEEL')?.position.y ?? 0) < 0, 'Walker should telescope the service column down into the belly rather than up through the tree');
        assert((model.root.getObjectByName('LANDING_KEEL')?.scale.y ?? 1) < 0.5, 'Walker should collapse the service column inside its lower cassette');
        assertEqual(model.root.getObjectByName('POWERED_GRIP_FRONT_LEG_LEFT')?.scale.y, 1, 'Walker should fully deploy the powered grip legs');

        model.update({timeSeconds: 0, pose: 'flight', poseProgress: 0.74, reducedMotion: true});
        assert(model.root.getObjectByName('TRANSFORMATION_WARNING_BEACON_INSTANCES')?.visible, 'mid-transition should pulse warning beacons');
        assert(!model.root.getObjectByName('SPEED_CONTROLLER_GAME_SHELL_CORE')?.visible, 'mid-transition should expose folding mechanics before the final speed skin locks');

        model.update({timeSeconds: 0, pose: 'flight', reducedMotion: true});
        assert(fabricationDeck.position.z < expeditionFabricationZ, 'Fast Space should retract the fabrication deck into the pressure hull');
        assertEqual(fabricationDeck.scale.y, expeditionFabricationHeight, 'Fast Space must preserve occupied workshop height while exterior service equipment retracts');
        assert(model.root.getObjectByName('SPEED_CONTROLLER_GAME_SHELL_CORE')?.visible, 'Fast Space should deploy the smooth game-controller speed shell');
        assert(!model.root.getObjectByName('GARDEN_ATRIUM')?.visible, 'Fast Space should seal the compact interior inside the controller shell');
        assert(model.root.getObjectByName('WINDOW_ARMOR_LEAF_UPPER')?.visible, 'Fast Space should close the physical armor leaves');
        assert(model.root.getObjectByName('WRAPAROUND_GLASS_ARMOR_SCALE_INSTANCES')?.visible, 'Fast Space should flow armor scales over the wraparound glass');
        assert(model.root.getObjectByName('WINDOW_ARMOR_SEAM_BACKSTOP')?.visible, 'Fast Space should seal the armor seams');

        const livingSignal = model.update({timeSeconds: 1, pose: 'docked', walk: 0.6, stabilize: 0.8, hover: 0.2});
        assert(livingSignal.strength > 0, 'hover should emit a reusable environment signal');
        const flightSignal = model.update({timeSeconds: 2, pose: 'flight', thrust: 0.8, hover: 0});
        assertEqual(flightSignal.strength, 0, 'travel thrust should not masquerade as hover downwash');
        assert(sanctuary.scale.equals(sanctuaryScale), 'flight update must preserve sanctuary local scale');
        assert(sanctuary.quaternion.equals(sanctuaryRotation), 'flight update must preserve sanctuary local orientation');
        model.dispose();
      }
    },
  },
];
