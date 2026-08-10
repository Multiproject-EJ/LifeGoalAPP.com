import {
  CARETAKER_ANIMATIONS,
  CARETAKER_EMOTIONS,
  CROWN_OF_TIDES_OUTFIT,
  createCaretakerMaster,
} from '../../dev/CaretakerThreeModel';
import { assert, assertEqual, type TestCase } from './testHarness';

export const caretakerThreeModelContractTests: TestCase[] = [
  {
    name: 'builds one reusable 17-bone caretaker master at both mobile LODs',
    run: () => {
      const low = createCaretakerMaster({ quality: 'low' });
      const high = createCaretakerMaster({ quality: 'high' });
      assertEqual(low.metrics.bones, 17, 'Low and High must share the same master rig');
      assertEqual(high.metrics.bones, 17, 'High must not add an island-specific skeleton');
      assert(
        high.metrics.triangles >= 25_000 && high.metrics.triangles <= 35_000,
        `High must stay inside the approved close-up triangle budget (received ${high.metrics.triangles})`,
      );
      assert(low.metrics.triangles < high.metrics.triangles, 'Low must remove geometry rather than only lowering renderer resolution');
      assert(low.metrics.triangles <= 2_500, `Low must stay inside the silhouette-first board triangle ceiling (received ${low.metrics.triangles})`);
      assert(low.metrics.meshes <= 24, `Low must use at most 24 semantic board pieces (received ${low.metrics.meshes})`);
      assert(low.metrics.materials <= 12, `Low must use at most 12 board materials (received ${low.metrics.materials})`);
      assertEqual(low.root.userData.caretakerLod, 'board', 'Low must identify itself as the purpose-built Board LOD');
      assertEqual(high.metrics.skinnedDrawCalls, 0, 'The rigid stylized hierarchy must remain below the two-skinned-call ceiling');
      assertEqual(high.root.name, 'CARETAKER_MASTER_ROOT', 'Master identity root must remain stable for scene integration');
      assert(high.outfitRoot.name.includes('ISLAND_005_CROWN_OF_TIDES'), 'Island 5 outfit must remain a named swappable module');
      assert(
        high.root.userData.sculptRuntime?.capeModule?.ownerSocket === 'CARETAKER_RIG_CHEST',
        'the action-ready cape module must expose its canonical chest socket to scene integration',
      );
      for (const side of ['LEFT', 'RIGHT'] as const) {
        const bootName = `CARETAKER_OUTFIT_${side}_BOOT`;
        const boot = high.root.getObjectByName(bootName);
        const logicalParts = boot?.userData.sculptRuntime?.logicalParts as string[] | undefined;
        assert(logicalParts?.includes(`${side.toLowerCase()}-leather-upper`) === true, `${side} boot must retain its sealed leather-upper module`);
        assert(logicalParts?.includes(`${side.toLowerCase()}-ankle-shaft`) === true, `${side} boot must retain one continuous gathered shaft`);
        assert(logicalParts?.includes(`${side.toLowerCase()}-welt`) === true, `${side} boot must retain its perimeter welt band`);
        assert(logicalParts?.includes(`${side.toLowerCase()}-sole-heel`) === true, `${side} boot must retain its low action-safe heel`);
      }
      assert(
        high.root.getObjectByName('CARETAKER_OUTFIT_LEFT_BOOT')?.parent?.name === 'CARETAKER_RIG_LEFT_FOOT'
          && high.root.getObjectByName('CARETAKER_OUTFIT_RIGHT_BOOT')?.parent?.name === 'CARETAKER_RIG_RIGHT_FOOT',
        'both reusable boots must remain attached to their canonical foot bones',
      );
      const cowl = high.root.getObjectByName('CARETAKER_MASTER_COWL_COLLAR');
      assert(
        cowl?.userData.sculptRuntime?.topology === 'continuous-open-annular-shell',
        'the face-framing collar must remain one continuous 360-degree cowl instead of two front plates',
      );
      assertEqual(
        cowl?.userData.sculptRuntime?.reviewAngles?.length,
        8,
        'the cowl contract must retain all eight turntable review angles',
      );
      assert(
        !(high.root.getObjectByName('CARETAKER_OUTFIT_LEFT_BOOT')?.userData.sculptRuntime?.logicalParts as string[] | undefined)
          ?.some((part) => part.includes('gem')),
        'the rejected invented boot gemstone must not return',
      );
      low.dispose();
      high.dispose();
    },
  },
  {
    name: 'keeps body animation and emissive emotion independent and reusable',
    run: () => {
      const model = createCaretakerMaster({ quality: 'high' });
      assertEqual(CARETAKER_ANIMATIONS.length, 7, 'M2 proof must retain all seven shared animation states');
      assertEqual(CARETAKER_EMOTIONS.length, 7, 'expression rig must retain all seven approved emotional states');
      model.setAnimation('walk', 1);
      model.setEmotion('curious');
      model.update(1.5, 1 / 30, false);
      assertEqual(model.animation, 'walk', 'body clip selection must remain independent');
      assertEqual(model.emotion, 'curious', 'eye acting must remain independently selectable');
      assert(model.eyeMaterial.emissiveIntensity > 0, 'emissive eyes must remain readable in the shadow face');
      model.setAnimation('point', 2);
      model.update(2.5, 1 / 30, false);
      assert(
        model.root.getObjectByName('CARETAKER_MASTER_RIGHT_HAND_POINT_FINGER')?.visible === true,
        'point must expose the dedicated guide finger on the free right-hand bone',
      );
      assert(
        model.root.getObjectByName('CARETAKER_RIG_LEFT_HAND')?.getObjectByName('CARETAKER_OUTFIT_STAFF') != null,
        'the staff must remain attached to the image-left grip hand rather than the gesture hand',
      );
      model.setAnimation('talk-gentle', 3);
      model.setEmotion('delighted');
      model.update(3.5, 1 / 30, false);
      assert(model.mouth.visible, 'talking or delight may enable the optional mouth glow without revealing a human face');
      model.setEmotion('surprised');
      model.update(3.7, 1 / 30, false);
      assert(model.surprisedMouth.visible, 'surprise must use a distinct readable O-mouth at phone size');
      assert(!model.mouth.visible, 'surprise must not reuse the delighted smile');
      model.setAnimation('celebrate', 4);
      model.update(5, 1 / 30, true);
      const reducedMotionHeight = model.rig.hips.position.y;
      model.update(8, 1 / 30, true);
      assertEqual(
        model.rig.hips.position.y,
        reducedMotionHeight,
        'reduced motion must freeze looping body phases at a readable authored pose',
      );
      model.dispose();
    },
  },
  {
    name: 'integrates a tiny board actor and lazy High encounter in the existing Island 5 renderer',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const flowSource = fsMod.readFileSync('src/features/gamification/level-worlds/inhabitants/components/IslandInhabitantFlow.tsx', 'utf8');
      assert(pilotSource.includes('const CARETAKER_BOARD_SCALE = 0.36'), 'board actor must stay at the approved small-topiary scale');
      assert(pilotSource.includes("createCaretakerMaster({ quality: 'low' })"), 'the always-on island actor must use the Board LOD');
      assert(pilotSource.includes("createCaretakerMaster({ quality: 'high' })"), 'the encounter must resolve to the approved High master');
      assert(pilotSource.includes('if (!encounterCaretaker)'), 'High must be lazy-created instead of remaining resident during board play');
      assert(pilotSource.includes('encounterCaretaker.dispose()'), 'High must release its geometry and materials when the encounter closes');
      assert(pilotSource.includes('ISLAND_5_CARETAKER_HIT_TARGET'), 'the tiny visual actor must retain a separate forgiving phone tap volume');
      assert(!pilotSource.includes('new THREE.WebGLRenderer({ canvas: caretaker'), 'caretaker encounter must not introduce a second renderer');
      assert(boardSource.includes('caretakerEncounterOpen={isIslandInhabitantFlowOpen}'), 'canonical UI flow state must drive the renderer LOD swap');
      assert(flowSource.includes('threeStage={threeStage}'), 'the existing top-level inhabitant flow must expose the transparent 3D stage');
      assert(!pilotSource.includes('persistIslandRunRuntimeStatePatch'), 'presentation-only caretaker integration must never write gameplay state');
    },
  },
  {
    name: 'walk cycle alternates one planted boot and one controlled swing boot',
    run: () => {
      const model = createCaretakerMaster({ quality: 'low' });
      const quarterCycle = Math.PI / (2 * 4.55);
      const threeQuarterCycle = (Math.PI * 3) / (2 * 4.55);
      model.setAnimation('walk', 0);
      model.update(quarterCycle, 1 / 60, false);
      const leftSwingHeight = model.rig.leftFoot.position.y;
      const rightPlantHeight = model.rig.rightFoot.position.y;
      const firstHipHeight = model.rig.hips.position.y;
      assert(leftSwingHeight > -0.25, 'left swing boot must clear the board during its authored half-cycle');
      assertEqual(rightPlantHeight, -0.31, 'opposite boot must remain planted instead of hovering with the swing boot');
      assert(firstHipHeight < 0.62, 'walk must not use the rejected floaty high-bounce pelvis');

      model.update(threeQuarterCycle, 1 / 60, false);
      assertEqual(model.rig.leftFoot.position.y, -0.31, 'left boot must return to its planted height on the opposite half-cycle');
      assert(model.rig.rightFoot.position.y > -0.25, 'right boot must take the next controlled swing');
      assert(
        Math.abs(model.rig.leftUpperLeg.rotation.x) <= 0.11
          && Math.abs(model.rig.rightUpperLeg.rotation.x) <= 0.11,
        'short caretaker stride must not balloon either boot toward the phone camera',
      );
      model.dispose();
    },
  },
  {
    name: 'animation changes start clips locally and support an explicit replay',
    run: () => {
      const model = createCaretakerMaster({ quality: 'low' });
      model.setAnimation('walk', 12);
      assertEqual(model.animationStartedAt, 12, 'walk phase must begin when the scene requests it, not at app boot time');
      model.setAnimation('walk', 18, true);
      assertEqual(model.animationStartedAt, 18, 'replaying the selected clip must reset its local animation clock');
      assertEqual(model.previousAnimation, 'walk', 'replay must retain the old pose briefly for a smooth same-clip transition');
      model.dispose();
    },
  },
  {
    name: 'documents Crown of Tides as an outfit module rather than permanent caretaker identity',
    run: () => {
      assertEqual(CROWN_OF_TIDES_OUTFIT.id, 'island-005-crown-of-tides', 'outfit manifest must remain island-scoped');
      assert(CROWN_OF_TIDES_OUTFIT.accessories.staff, 'Island 5 module must retain its tide staff');
      assert(CROWN_OF_TIDES_OUTFIT.accessories.cape, 'Island 5 module must retain its cape');
      assert(CROWN_OF_TIDES_OUTFIT.cloth !== CROWN_OF_TIDES_OUTFIT.eyeGlow, 'fabric and facial acting must not be one baked colour channel');
    },
  },
  {
    name: 'exposes an isolated phone-sized lab without adding gameplay authority',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const labSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/CaretakerCharacterLab.tsx', 'utf8');
      const labCss = fsMod.readFileSync('src/features/gamification/level-worlds/dev/CaretakerCharacterLab.css', 'utf8');
      const mainSource = fsMod.readFileSync('src/main.tsx', 'utf8');
      assert(mainSource.includes("const CARETAKER_CHARACTER_LAB_PATH = '/dev/caretaker-character-lab'"), 'lab must retain a deterministic developer route');
      assert(labSource.includes('createCaretakerMaster'), 'lab must render the same reusable model intended for Island 5');
      assert(labSource.includes('setSkeletonVisible'), 'lab must expose skeleton evidence');
      assert(labSource.includes('setWireframe'), 'lab must expose wireframe evidence');
      assert(labSource.includes('Reduced motion preview'), 'lab must expose reduced-motion evidence before board integration');
      assert(labSource.includes("'(prefers-reduced-motion: reduce)'"), 'lab must inherit the operating-system reduced-motion preference');
      assert(labSource.includes("get('reducedMotion')"), 'lab must expose deterministic reduced-motion evidence mode');
      assert(labSource.includes("get('phoneProof') === '1'"), 'lab must expose a deterministic exact-phone evidence mode');
      assert(labSource.includes("get('poseTime')"), 'lab must expose deterministic animation-phase evidence for clipping sweeps');
      assert(labSource.includes("proofPoseTime == null"), 'deterministic poseTime must initialize a paused proof rather than permanently disabling playback');
      assert(labSource.includes('Restart clip'), 'lab must expose explicit clip replay for animation quality review');
      assert(labSource.includes('press Play to inspect live motion'), 'frozen Gauntlet proofs must clearly explain how to return to live animation');
      assert(labCss.includes('width: 390px') && labCss.includes('height: 844px'), 'phone proof must stay locked to the production 390 by 844 viewport');
      assert(!labSource.includes('persistIslandRunRuntimeStatePatch'), 'character presentation must never become gameplay state authority');
    },
  },
];
