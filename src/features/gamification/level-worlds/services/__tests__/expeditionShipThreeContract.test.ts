import { createExpeditionShipThreeModel } from '../../dev/ExpeditionShipThreeModel';
import {
  EXPEDITION_SHIP_BOOSTER_DURATION_SECONDS,
  resolveExpeditionShipBoosterLevel,
} from '../../dev/useExpeditionShipBooster';
import { assert, assertEqual, type TestCase } from './testHarness';
import * as THREE from 'three';
import {createExpeditionOakCageGeometry} from '../../dev/ExpeditionShipOakCage';
import {HOLLOW_OAK} from '../../dev/ExpeditionShipHollowOak';
import {createBranchedOakWall} from '../../dev/ExpeditionShipBranchedOak';
import {SCULPTED_OAK_CIRCULATION} from '../../dev/ExpeditionShipSculptedOak';

export const expeditionShipThreeContractTests: TestCase[] = [
  {
    name: 'keeps the offline oak correction opt-in with coupled internal circulation and frozen exterior',
    run: () => {
      const c = SCULPTED_OAK_CIRCULATION;
      for (const quality of ['low','high'] as const) {
        const study = createExpeditionShipThreeModel(quality,{interiorStudy:'oak-sculpted'});
        const baseline = createExpeditionShipThreeModel(quality);
        try {
          const tree = study.root.getObjectByName('GREAT_TREE')!;
          const treads = tree.getObjectByName('great-tree-stair-treads') as THREE.InstancedMesh;
          assertEqual(treads.count,72,'reconciled internal stair has 72 physical treads');
          assertEqual(tree.userData.productionStatus,'unapproved-structural-study','offline authorship does not grant approval');
          assert(!baseline.root.getObjectByName('GREAT_TREE_CIRCULATION'),'default sanctuary is not replaced');
          assert(Math.abs(c.stairOuter-c.stairInner-.18)<1e-8,'nominal walking width stays .18');
          assert(c.roof-c.deckTop>.26,'roof and terrace levels remain frozen');
          const matrix=new THREE.Matrix4(),point=new THREE.Vector3();
          for(let i=0;i<treads.count;i++) {
            treads.getMatrixAt(i,matrix);
            for(let j=0;j<treads.geometry.attributes.position.count;j++) {
              point.fromBufferAttribute(treads.geometry.attributes.position,j).applyMatrix4(matrix);
              assert((point.x/c.innerX)**2+((point.z-c.centerZ)/c.innerZ)**2<1,'every tread fits the protected elliptical bore');
            }
          }
          assert(Math.abs(treads.userData.startY+treads.userData.rise*treads.count-c.deckTop)<1e-8,'stair reaches the actual crown deck');
          assert(study.metrics.triangles<=(quality==='low'?60000:90000),'offline mesh fits stored triangle contract');
          assert(study.metrics.meshCount<160&&study.metrics.materials<=36,'offline mesh fits mesh/material contract');
          for(const pose of ['docked','expedition','flight'] as const) {
            study.update({pose,timeSeconds:0,reducedMotion:true});baseline.update({pose,timeSeconds:0,reducedMotion:true});
            study.root.updateMatrixWorld(true);baseline.root.updateMatrixWorld(true);
            assert(study.root.getObjectByName('GREAT_TREE')===tree,'all modes retain one tree');
            for(const name of ['LEFT_OUTER_SHELL','RIGHT_OUTER_SHELL','CONTINUOUS_CONTROLLER_ROOF_CARAPACE','AFT_PRESSURE_HULL_COLLAR','CONTINUOUS_UNDERSIDE_KEEL_BRIDGE']) {
              const a=new THREE.Box3().setFromObject(baseline.root.getObjectByName(name)!);
              const b=new THREE.Box3().setFromObject(study.root.getObjectByName(name)!);
              assert(a.min.distanceTo(b.min)<1e-8&&a.max.distanceTo(b.max)<1e-8,`${name} remains unchanged`);
            }
          }
        } finally { study.dispose();baseline.dispose(); }
      }
    },
  },
  {
    name: 'encloses the new oak stairs inside a thick trunk below the frozen Haven roof',
    run: () => {
      for (const quality of ['low', 'high'] as const) {
        const model = createExpeditionShipThreeModel(quality, {interiorStudy: 'oak-branched'});
        const baseline = createExpeditionShipThreeModel(quality);
        const wall = createBranchedOakWall(quality === 'high');
        try {
          assert(model.metrics.triangles <= (quality === 'low' ? 60000 : 90000), 'hollow proof must respect whole-ship triangle budget');
          assert(model.metrics.meshCount < 160, 'hollow proof must respect whole-ship mesh budget');
          assert(HOLLOW_OAK.roof - HOLLOW_OAK.deckTop >= .26, 'crown needs headroom without raising glass roof');
          const tree = model.root.getObjectByName('GREAT_TREE')!;
          assertEqual(tree.userData.productionStatus, 'unapproved-structural-study', 'proof is not an approved tree');
          assert(!baseline.root.getObjectByName('GREAT_TREE_CIRCULATION'), 'default sanctuary remains unchanged');
          const treads = model.root.getObjectByName('great-tree-stair-treads') as THREE.InstancedMesh;
          assertEqual(treads.count, 64, 'sixty-four equal-rise internal treads');
          assert(Math.abs(treads.userData.startY + treads.userData.rise * treads.count - HOLLOW_OAK.deckTop) < 1e-7, 'stair reaches top crown');
          const matrix = new THREE.Matrix4(), vertex = new THREE.Vector3();
          for(let i=0;i<treads.count;i++) {
            treads.getMatrixAt(i,matrix);
            for(let j=0;j<treads.geometry.attributes.position.count;j++) {
              vertex.fromBufferAttribute(treads.geometry.attributes.position,j).applyMatrix4(matrix);
              assert(Math.hypot(vertex.x,vertex.z-HOLLOW_OAK.centerZ) <= HOLLOW_OAK.stairOuter+1e-6, 'all tread vertices stay inside bore');
            }
          }
          const edges = new Map<string, {count:number; winding:number}>();
          for(let i=0;i<wall.index!.count;i+=3) for(let j=0;j<3;j++) {
            const a=wall.index!.getX(i+j), b=wall.index!.getX(i+(j+1)%3), key=`${Math.min(a,b)}:${Math.max(a,b)}`;
            const edge=edges.get(key) ?? {count:0,winding:0}; edge.count++;edge.winding+=a<b?1:-1;edges.set(key,edge);
          }
          assert([...edges.values()].every(e=>e.count===2&&e.winding===0), 'bore and doorway form a consistently wound closed wall');
          for(const pose of ['docked','expedition','flight'] as const) {
            model.update({pose,timeSeconds:0,reducedMotion:true}); baseline.update({pose,timeSeconds:0,reducedMotion:true});
            model.root.updateMatrixWorld(true);baseline.root.updateMatrixWorld(true);
            assert(model.root.getObjectByName('GREAT_TREE')===tree,'pose retains one persistent tree');
            for(const name of ['LEFT_OUTER_SHELL','RIGHT_OUTER_SHELL','CONTINUOUS_CONTROLLER_ROOF_CARAPACE','AFT_PRESSURE_HULL_COLLAR','CONTINUOUS_UNDERSIDE_KEEL_BRIDGE']) {
              const a=new THREE.Box3().setFromObject(baseline.root.getObjectByName(name)!);
              const b=new THREE.Box3().setFromObject(model.root.getObjectByName(name)!);
              assert(a.min.distanceTo(b.min)<1e-8&&a.max.distanceTo(b.max)<1e-8,`${name} exterior stays frozen`);
            }
          }
        } finally {wall.dispose();model.dispose();baseline.dispose();}
      }
    },
  },
  {
    name: 'builds the second oak study as a closed connected surface in both quality tiers',
    run: () => {
      for (const high of [false, true]) {
        const geometry = createExpeditionOakCageGeometry(high);
        try {
          const index = geometry.index!;
          const edges = new Map<string, {count: number; winding: number}>();
          const neighbors = Array.from({length: geometry.attributes.position.count}, () => new Set<number>());
          for (let i = 0; i < index.count; i += 3) for (let j = 0; j < 3; j++) {
            const a = index.getX(i + j), b = index.getX(i + (j + 1) % 3);
            const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
            const edge = edges.get(key) ?? {count: 0, winding: 0};
            edge.count++; edge.winding += a < b ? 1 : -1; edges.set(key, edge);
            neighbors[a].add(b); neighbors[b].add(a);
          }
          assert([...edges.values()].every(edge => edge.count === 2 && edge.winding === 0), 'each edge must join exactly two consistently wound faces');
          const seen = new Set<number>(), pending = [0];
          while (pending.length) {
            const vertex = pending.pop()!;
            if (seen.has(vertex)) continue;
            seen.add(vertex); pending.push(...[...neighbors[vertex]].filter(n => !seen.has(n)));
          }
          assertEqual(seen.size, neighbors.length, 'all root and branch vertices must be connected');
          assert(Array.from(geometry.attributes.normal.array).every(Number.isFinite), 'surface normals must be finite');
          assert(index.count / 3 < 3000, 'the structural tree must stay below its 3k triangle allocation');
        } finally {geometry.dispose();}
      }
    },
  },
  {
    name: 'keeps the unapproved oak study opt-in and out of the garage baseline',
    run: () => {
      for (const interiorStudy of ['oak', 'oak-cage'] as const) {
      const baseline = createExpeditionShipThreeModel('low');
      const study = createExpeditionShipThreeModel('low', {interiorStudy});
      try {
        assert(!baseline.root.getObjectByName('GREAT_TREE_CIRCULATION'), 'default model must not adopt a failed study');
        const tree = study.root.getObjectByName('GREAT_TREE');
        assertEqual(tree?.userData.productionStatus, 'unapproved-structural-study', 'study must advertise its unapproved status');
        assert(study.root.getObjectByName('GREAT_TREE_CIRCULATION'), 'study should build actual circulation geometry');
        const treads = study.root.getObjectByName('great-tree-stair-treads') as THREE.InstancedMesh;
        assertEqual(treads.count, 30, 'stair should have thirty physical treads');
        assert(Math.abs(treads.userData.startY + treads.userData.rise * 30 - treads.userData.endY) < 1e-8, 'equal stair rise must reach the crown deck');
        for (const pose of ['docked', 'expedition', 'flight'] as const) {
          study.update({pose, timeSeconds: 0, reducedMotion: true});
          assert(study.root.getObjectByName('GREAT_TREE') === tree, 'pose changes must retain the same study tree');
        }
        for (const name of ['LEFT_OUTER_SHELL', 'RIGHT_OUTER_SHELL', 'CONTINUOUS_CONTROLLER_ROOF_CARAPACE', 'AFT_PRESSURE_HULL_COLLAR', 'CONTINUOUS_UNDERSIDE_KEEL_BRIDGE']) {
          baseline.update({pose: 'flight', timeSeconds: 0, reducedMotion: true});
          baseline.root.updateMatrixWorld(true);
          study.root.updateMatrixWorld(true);
          const original = baseline.root.getObjectByName(name)!;
          const candidate = study.root.getObjectByName(name)!;
          const a = new THREE.Box3().setFromObject(original);
          const b = new THREE.Box3().setFromObject(candidate);
          assert(a.min.distanceTo(b.min) < 1e-8 && a.max.distanceTo(b.max) < 1e-8, `${name} must be unchanged by interior work`);
        }
      } finally { baseline.dispose(); study.dispose(); }
      }
    },
  },
  {
    name: 'keeps the 150m walker ship inside geometry budgets with one persistent articulated hierarchy',
    run: () => {
      for (const quality of ['low', 'high'] as const) {
        const model = createExpeditionShipThreeModel(quality);
        assert(model.metrics.triangles > 15000, `${quality} ship should be actual 3D geometry`);
        const triangleBudget = quality === 'low' ? 60000 : 90000;
        assert(model.metrics.triangles <= triangleBudget, `${quality} ship should stay inside its Smooth/Ultra triangle budget`);
        assert(model.metrics.meshCount < 160, `${quality} blockout should keep a bounded mesh hierarchy before batching`);

        const runtime = model.root.userData.sculptRuntime as {
          scaleMetres?: {living?: {width?: number}; hypersonic?: {width?: number}};
          protectedSanctuary?: {node?: string; immutableLocalScale?: boolean; immutableLocalOrientation?: boolean};
          exteriorVolume?: {
            cycle?: string;
            frontShapeAuthority?: string;
            frontPlanformChanged?: boolean;
            sideSurfacing?: string;
            undersidePlanform?: string;
            pressureFrameContinuity?: string;
            components?: {
              shoulderShells?: string[];
              roofCarapace?: string;
              aftPressureHull?: string;
              undersideKeelBridge?: string;
            };
            loadPath?: string[];
            roofTowerIntegration?: string;
          };
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
          speedShell?: {
            node?: string;
            shapeAuthority?: string;
            designLanguage?: string;
            cycle?: string;
            topology?: string;
            constructionFamily?: string;
            exactControllerAtFullDeployment?: boolean;
            havenPresentationFrozen?: boolean;
            pressureDepth?: number;
            lowerArch?: string;
            components?: {
              continuousDarkBody?: string;
              whiteGripShells?: string[];
              cyanInset?: string;
              roofCap?: string;
              belly?: string;
              ventralPlate?: string;
              aftPressureCap?: string;
              retractedTransitionFairings?: string[];
            };
          };
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
        assertEqual(runtime.exteriorVolume?.cycle, '2026-08-30-slice1c-controller-pressure-frame', 'the bounded macro correction should remain traceable to its authorised continuation cycle');
        assertEqual(runtime.exteriorVolume?.frontShapeAuthority, 'src/assets/Blue_darkcontroller.webp', 'the literal controller should remain the front-planform authority');
        assertEqual(runtime.exteriorVolume?.frontPlanformChanged, false, 'the depth correction must not redesign the approved controller front');
        assertEqual(runtime.exteriorVolume?.components?.shoulderShells?.length, 2, 'both controller shoulders should carry real pressure depth');
        assertEqual(runtime.exteriorVolume?.components?.roofCarapace, 'CONTINUOUS_CONTROLLER_ROOF_CARAPACE', 'one continuous carapace should replace the stacked roof reading');
        assertEqual(runtime.exteriorVolume?.components?.aftPressureHull, 'AFT_PRESSURE_HULL_COLLAR', 'the rear glazing should terminate in a real pressure collar');
        assertEqual(runtime.exteriorVolume?.components?.undersideKeelBridge, 'CONTINUOUS_UNDERSIDE_KEEL_BRIDGE', 'the underside should expose one continuous grip-to-keel bridge');
        assert(runtime.exteriorVolume?.loadPath?.includes('tri-drive'), 'the corrected macro load path should terminate at the existing three-drive architecture');
        assertEqual(runtime.exteriorVolume?.roofTowerIntegration, 'recessed-into-continuous-controller-roof-carapace', 'power towers should sit in the roof silhouette rather than stack above it');
        assertEqual(runtime.exteriorVolume?.sideSurfacing, 'front-locked-rounded-aft-shoulder-pressure-loft', 'the side hull should retain the literal front plane while rounding its full pressure depth aft');
        assertEqual(runtime.exteriorVolume?.undersidePlanform, 'deep-cambered-overlapping-controller-keel-belly', 'the keel bridge should read as a cambered controller belly rather than a disconnected sill');
        assertEqual(runtime.exteriorVolume?.pressureFrameContinuity, 'shoulders-roof-aft-collar-belly-overlap', 'all five corrected macro parts should form one overlapping pressure frame');
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
        assertEqual(runtime.speedShell?.cycle, '2026-09-06-slice5c-compound-controller-shell', 'the literal closed hull should remain traceable to the compound-shell correction cycle');
        assertEqual(runtime.speedShell?.topology, 'one-persistent-literal-controller-wrapper-shell', 'Fast Space should close through one literal controller wrapper in the persistent scene graph');
        assertEqual(runtime.speedShell?.constructionFamily, 'authority-measured-compound-shell-controller', 'the user-approved compound-shell construction family should be explicit');
        assert(runtime.speedShell?.exactControllerAtFullDeployment, 'full Fast Space deployment should commit to the exact controller presentation');
        assert(runtime.speedShell?.havenPresentationFrozen, 'the Fast Space wrapper must not redesign Haven');
        assertEqual(runtime.speedShell?.pressureDepth, 2.1, 'the closed controller should use the approved shallow depth');
        assertEqual(runtime.speedShell?.lowerArch, 'unobstructed-negative-space', 'the controller lower arch must remain visually open');
        assertEqual(runtime.speedShell?.components?.continuousDarkBody, 'SPEED_CONTROLLER_GAME_SHELL_CORE', 'the dark controller body should be continuous');
        assertEqual(runtime.speedShell?.components?.whiteGripShells?.length, 2, 'the wrapper should contain two fitted white grip regions');
        assertEqual(runtime.speedShell?.components?.cyanInset, 'SPEED_CONTROLLER_GAME_SHELL_CORE-4', 'the cyan controller inset should be part of the wrapper');
        assertEqual(runtime.speedShell?.components?.retractedTransitionFairings?.length, 2, 'the previous fairings should remain as retracted transition mechanics');
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
        assert(names.has('FAST_SPACE_CONTINUOUS_ROOF_CAP'), `${quality} ship should expose the continuous Fast Space roof cap`);
        assert(names.has('FAST_SPACE_INTERLOCKED_BELLY'), `${quality} ship should expose the interlocked Fast Space underside`);
        assert(names.has('FAST_SPACE_VENTRAL_PRESSURE_PLATE'), `${quality} ship should expose the rounded Fast Space ventral pressure surface`);
        assert(names.has('FAST_SPACE_AFT_PRESSURE_CAP'), `${quality} ship should expose the finished Fast Space aft pressure cap`);
        assert(names.has('PORT_TRAVEL_GRIP_FAIRING'), `${quality} ship should expose the deep port Fast Space grip`);
        assert(names.has('STARBOARD_TRAVEL_GRIP_FAIRING'), `${quality} ship should expose the deep starboard Fast Space grip`);
        assert(names.has('CONTINUOUS_CONTROLLER_ROOF_CARAPACE'), `${quality} ship should carry one deep controller-derived roof carapace`);
        assert(names.has('AFT_PRESSURE_HULL_COLLAR'), `${quality} ship should finish the rear pressure hull around the existing glazing`);
        assert(names.has('CONTINUOUS_UNDERSIDE_KEEL_BRIDGE'), `${quality} ship should connect the grip masses, garage belly and central drive underneath`);
        model.root.updateMatrixWorld(true);
        const boundsOf = (name: string) => new THREE.Box3().setFromObject(model.root.getObjectByName(name)!);
        const hiddenMeshGeometryBoundsOf = (name: string) => {
          const mesh = model.root.getObjectByName(name) as THREE.Mesh;
          mesh.geometry.computeBoundingBox();
          return mesh.geometry.boundingBox!.clone();
        };
        const leftShellBounds = boundsOf('LEFT_OUTER_SHELL');
        const roofBounds = boundsOf('CONTINUOUS_CONTROLLER_ROOF_CARAPACE');
        const aftBounds = boundsOf('AFT_PRESSURE_HULL_COLLAR');
        const bellyBounds = boundsOf('CONTINUOUS_UNDERSIDE_KEEL_BRIDGE');
        const speedCoreBounds = hiddenMeshGeometryBoundsOf('SPEED_CONTROLLER_GAME_SHELL_CORE');
        const portFairingBounds = hiddenMeshGeometryBoundsOf('PORT_TRAVEL_GRIP_FAIRING');
        assert(leftShellBounds.max.z - leftShellBounds.min.z >= 3.75, `${quality} controller shoulder should carry substantial side-profile depth`);
        assert(roofBounds.max.z - roofBounds.min.z >= 3.9, `${quality} roof carapace should span the full pressure hull depth`);
        assert(aftBounds.max.z - aftBounds.min.z >= 1.05, `${quality} aft collar should be a pressure section rather than a thin rear ring`);
        assert(bellyBounds.max.z - bellyBounds.min.z >= 3.4, `${quality} underside bridge should run from the controller front into the aft hull`);
        assert(roofBounds.min.z <= aftBounds.max.z && roofBounds.max.z >= aftBounds.min.z, `${quality} roof and aft collar should physically overlap`);
        assert(bellyBounds.min.z <= aftBounds.max.z && bellyBounds.max.z >= aftBounds.min.z, `${quality} belly and aft collar should physically overlap`);
        assert(speedCoreBounds.max.x - speedCoreBounds.min.x >= 6.3, `${quality} literal wrapper should span the full controller width in one mesh`);
        assert(speedCoreBounds.max.y - speedCoreBounds.min.y >= 3.1, `${quality} literal wrapper should preserve the long controller grips and lower arch`);
        assert(speedCoreBounds.max.z - speedCoreBounds.min.z >= 2.15, `${quality} literal wrapper should remain genuinely volumetric`);
        assert(speedCoreBounds.max.z - speedCoreBounds.min.z <= 2.5, `${quality} literal wrapper should not become a fat spacecraft hull`);
        assertEqual(model.root.getObjectByName('FAST_SPACE_CONTINUOUS_ROOF_CAP')?.userData.volumeContract?.pressureDepth, 2.1, `${quality} Fast Space roof marker should resolve to the shallow wrapper depth`);
        assertEqual(model.root.getObjectByName('FAST_SPACE_INTERLOCKED_BELLY')?.userData.volumeContract?.pressureDepth, 2.1, `${quality} Fast Space belly marker should preserve the shallow controller contract`);
        assert(portFairingBounds.max.z - portFairingBounds.min.z >= 4.2, `${quality} Fast Space controller grips should have a substantial side profile`);
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
        const sanctuaryDimensions = {...sanctuary.userData.clearance?.localDimensions};
        const leftOuterShell = model.root.getObjectByName('LEFT_OUTER_SHELL')!;
        const rightOuterShell = model.root.getObjectByName('RIGHT_OUTER_SHELL')!;
        const leftPowerTower = model.root.getObjectByName('LEFT_POWER_TOWER')!;
        const rightPowerTower = model.root.getObjectByName('RIGHT_POWER_TOWER')!;
        assert((leftOuterShell.userData.volumeContract?.pressureDepth ?? 0) >= 2.6, `${quality} port shell should no longer be a thin extrusion`);
        assert((rightOuterShell.userData.volumeContract?.pressureDepth ?? 0) >= 2.6, `${quality} starboard shell should no longer be a thin extrusion`);
        assertEqual(leftOuterShell.userData.volumeContract?.preservedFrontEdge, 1.02, `${quality} port depth should grow aft without moving the front authority edge`);
        assertEqual(rightOuterShell.userData.volumeContract?.preservedFrontEdge, 1.02, `${quality} starboard depth should grow aft without moving the front authority edge`);
        assert(leftPowerTower.position.y <= 0.94 && rightPowerTower.position.y <= 0.94, `${quality} power towers should be recessed into the roof height`);
        assert(leftPowerTower.position.z <= -0.42 && rightPowerTower.position.z <= -0.42, `${quality} power towers should socket into the aft carapace`);
        const floorPov = model.root.getObjectByName('SANCTUARY_FLOOR_POV')!;
        const balconyPov = model.root.getObjectByName('UPPER_BALCONY_DOWN_POV')!;
        assert(floorPov.position.z < 0.62, 'garden-floor POV must sit behind the front gallery edge, inside the pressure envelope');
        assert(floorPov.position.y > -0.6, 'garden-floor POV must sit above the garden floor');
        assert(Math.abs(balconyPov.position.x) > 0.96, 'balcony POV must stand on the compact curved side gallery outside the open sanctuary void');
        assert(Math.abs(balconyPov.position.x) < 1.3, 'balcony POV must remain inside the pressure glazing instead of clipping into the outer shoulder');
        assert(balconyPov.position.y > 0.9, 'balcony POV must stand at human eye height above the upper deck');

        model.update({timeSeconds: 0, pose: 'docked', reducedMotion: true});
        assert(model.root.getObjectByName('LIVING_MODE_SIDE_TERRACES')?.visible, 'Haven should deploy both large luxury garden terraces');
        assert(!model.root.getObjectByName('AFT_PRESSURE_HULL_COLLAR')?.visible, 'Haven should not show the rejected added rear pressure collar');
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
        assert(model.root.getObjectByName('AFT_PRESSURE_HULL_COLLAR')?.visible, 'the mobile pressure collar may deploy only after leaving Haven');
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
        assert(model.root.getObjectByName('FAST_SPACE_CONTINUOUS_ROOF_CAP')?.visible, 'Fast Space should deploy one continuous roof cap');
        assert(model.root.getObjectByName('FAST_SPACE_INTERLOCKED_BELLY')?.visible, 'Fast Space should deploy one interlocked underside');
        assert(model.root.getObjectByName('FAST_SPACE_VENTRAL_PRESSURE_PLATE')?.visible, 'Fast Space should deploy one rounded ventral pressure surface');
        assert(model.root.getObjectByName('FAST_SPACE_AFT_PRESSURE_CAP')?.visible, 'Fast Space should deploy one finished aft pressure cap');
        assert(!model.root.getObjectByName('PORT_TRAVEL_GRIP_FAIRING')?.visible, 'Fast Space should retract the obsolete port fairing beneath the literal wrapper');
        assert(!model.root.getObjectByName('STARBOARD_TRAVEL_GRIP_FAIRING')?.visible, 'Fast Space should retract the obsolete starboard fairing beneath the literal wrapper');
        assert(!model.root.getObjectByName('GARDEN_ATRIUM')?.visible, 'Fast Space should seal the compact interior inside the controller shell');
        assert(!model.root.getObjectByName('POWER_TOWERS')?.visible, 'Fast Space should stow the towers beneath the smooth roof silhouette');
        assert(!model.root.getObjectByName('WINDOW_ARMOR_LEAF_UPPER')?.visible, 'Fast Space should bury the closed armor leaves beneath the final smooth skin');
        assert(!model.root.getObjectByName('WRAPAROUND_GLASS_ARMOR_SCALE_INSTANCES')?.visible, 'Fast Space should bury the glass armor scales beneath the final smooth skin');
        assert(!model.root.getObjectByName('WINDOW_ARMOR_SEAM_BACKSTOP')?.visible, 'Fast Space should bury the seam backstop beneath the final smooth skin');
        assert(!model.root.getObjectByName('PORT_GRIP_NACELLE_MASS')?.visible, 'Fast Space should hide transitional port chassis layers after the fairing locks');
        assert(!model.root.getObjectByName('LEFT_UNDERFRAME')?.visible, 'Fast Space should hide the transitional port underframe after the belly locks');
        assert(!fabricationDeck.visible, 'Fast Space should retract the fabrication floor from the controller lower arch');
        assert(!model.root.getObjectByName('GARAGE_BELLY')?.visible, 'Fast Space should retract the garage cassette from the controller lower arch');
        assert(!model.root.getObjectByName('LANDING_KEEL')?.visible, 'Fast Space should retract the landing keel from the controller lower arch');
        assert(model.root.getObjectByName('CENTRAL_KEEL_DRIVE')?.visible, 'Fast Space should preserve the visible centre drive after the garage and landing keel retract');
        const cruiseCentreDrive = model.root.getObjectByName('CENTRAL_KEEL_DRIVE')!;
        const centreDriveId = cruiseCentreDrive.uuid;
        assert(cruiseCentreDrive.position.y > -0.3 && cruiseCentreDrive.position.z < -1, 'Fast Space should dock the same centre drive behind the bridge, clear of the open controller arch');
        assertEqual(cruiseCentreDrive.rotation.x, Math.PI / 2, 'the centre drive must face rearward in cruise independently of throttle');
        assert(!model.root.getObjectByName('CONFORMAL_SHIELD_EMITTERS')?.visible, 'closed Fast Space should stow the shield tabs beneath its uninterrupted controller face');
        model.update({timeSeconds: 0, pose: 'flight', thrust: 0, hover: 0.72, reducedMotion: true});
        assertEqual(cruiseCentreDrive.rotation.x, Math.PI / 2, 'zero throttle must not turn the cruise drive down into the arch');
        assert(!model.root.getObjectByName('ENVIRONMENT_DOWNWASH_PREVIEW')?.visible, 'closed Fast Space should not display ground ripple rings even with residual hover input');
        assert(!model.root.getObjectByName('POWERED_GRIP_FRONT_LEG_LEFT')?.visible, 'Fast Space should fully stow the port landing leg inside the closed grip');
        assert(!model.root.getObjectByName('REAR_STABILIZER_LEG_RIGHT')?.visible, 'Fast Space should fully stow the aft landing stabilizer inside the closed belly');

        const livingSignal = model.update({timeSeconds: 1, pose: 'docked', walk: 0.6, stabilize: 0.8, hover: 0.2});
        assertEqual(cruiseCentreDrive.uuid, centreDriveId, 'the same persistent centre drive must return to Haven');
        assertEqual(cruiseCentreDrive.position.y, -1.38, 'Haven must keep its original centre drive height');
        assertEqual(cruiseCentreDrive.position.z, -0.1, 'Haven must keep its original centre drive depth');
        assert(model.root.getObjectByName('ENVIRONMENT_DOWNWASH_PREVIEW')?.visible, 'Haven must retain its ground downwash preview');
        assert(livingSignal.strength > 0, 'hover should emit a reusable environment signal');
        const flightSignal = model.update({timeSeconds: 2, pose: 'flight', thrust: 0.8, hover: 0});
        assertEqual(flightSignal.strength, 0, 'travel thrust should not masquerade as hover downwash');
        assert(sanctuary.scale.equals(sanctuaryScale), 'flight update must preserve sanctuary local scale');
        assert(sanctuary.quaternion.equals(sanctuaryRotation), 'flight update must preserve sanctuary local orientation');
        assertEqual(JSON.stringify(sanctuary.userData.clearance?.localDimensions), JSON.stringify(sanctuaryDimensions), 'macro exterior work must not change the inhabited sanctuary dimensions');
        model.dispose();
      }
    },
  },
  {
    name: 'keeps the circular Fast Space booster presentation-local with a forty-second slow-decay envelope',
    run: () => {
      assertEqual(EXPEDITION_SHIP_BOOSTER_DURATION_SECONDS, 40, 'the requested Booster should last forty seconds');
      assertEqual(resolveExpeditionShipBoosterLevel(-1), 0, 'negative presentation time should not create boost');
      assert(resolveExpeditionShipBoosterLevel(0.45) > 0.99, 'the visual booster should ignite quickly');
      assert(resolveExpeditionShipBoosterLevel(29.9) > 0.99, 'the visual booster should sustain through the first thirty seconds');
      const midTail = resolveExpeditionShipBoosterLevel(35);
      assert(midTail > 0.45 && midTail < 0.55, 'the final ten seconds should use a slow eased decay');
      assert(resolveExpeditionShipBoosterLevel(39) < midTail, 'the dying burn should continue decreasing near shutdown');
      assertEqual(resolveExpeditionShipBoosterLevel(40), 0, 'the visual booster should be fully off at forty seconds');
    },
  },
];
