from pathlib import Path
p=Path('src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts');s=p.read_text();(Path('.img2threejs/island-003-v2/keep-frozen-world')/'baseline-world.ts.txt').write_text(s)
s=s.replace("import { createFrostmoonSeafoodTrade }", "import { createIsland3FrozenWorld } from './Island3FrozenWorldThreeModel';\nimport { createFrostmoonSeafoodTrade }")
a=s.index('function createAuroraKeep(level:');b=s.index('\nexport function buildIsland3FrostmoonLandmark',a);k=s[a:b]
start=k.index("  const hall =");end=k.index("  const gatehouse =",start)
k=k[:start]+'''  const hall = createAuroraKeepPart('ISLAND_3_AURORA_KEEP_CENTRAL_GREAT_HALL_SHELL');
  // Stable funded lower course; later floors add vertically without rescaling it.
  const stoneHall = box(1.82, 1.14, 1.4, materials.frostRockDark);
  stoneHall.position.y = 0.96;
  hall.add(stoneHall);
  const sill = box(1.9, 0.13, 1.46, materials.timberDark);
  sill.position.y = 1.51;
  hall.add(sill);
  if (level >= 2) {
    const upper = createAuroraKeepPart('ISLAND_3_AURORA_KEEP_UPPER_HALL_PERMANENT_STOREY');
    const plasterHall = box(1.7, 1.48, 1.32, materials.paper);
    plasterHall.position.y = 2.22;
    upper.add(plasterHall);
    [-1, 1].forEach((side) => {
      const post = box(0.15, 1.55, 1.42, materials.timberDark);
      post.position.set(side * 0.79, 2.23, 0);
      upper.add(post);
      const rearWindow = new THREE.Group();
      addWindow(rearWindow, side * .4, 2.16, -.71, Math.PI, materials, .65);
      upper.add(rearWindow);
    });
    const topBeam = box(1.92, .14, 1.44, materials.timberDark);
    topBeam.position.y = 2.93;
    const centrePost = box(.11,1.48,.085,materials.timberDark);
    centrePost.position.set(0,2.22,-.71);
    upper.add(topBeam,centrePost);
    hall.add(upper);
  }
  group.add(hall);
  const roofBaseY = 2.94;
  const roofHeight = 1.04;
  if (level === 3) {
    const roof = createAuroraKeepPart('ISLAND_3_AURORA_KEEP_MAIN_SNOW_COPPER_GABLE_ROOF');
    addGableRoof(roof, 2.14, roofHeight, 1.7, roofBaseY, materials, quality);
    addAuroraKeepRoofRibs(roof, 2.14, roofHeight, 1.7, roofBaseY, materials, quality);
    group.add(roof);
  }

'''+k[end:]
k=k.replace('level === 1 ? 0.74 : 0.84','0.84').replace('level === 1 ? 0.38 : 0.44','0.44').replace('level === 1 ? 0.42 : 0.48','0.48').replace('level === 1 ? 0.86 : 0.98','0.98')
k=k.replace('galleryFloor.position.set(0, 1.32, 0.73)','galleryFloor.position.set(0, 1.64, 0.84)').replace('pane.position.set(x, 1.58, 0.765)','pane.position.set(x, 2.04, 0.88)').replace('box(0.2, 0.34, 0.06','box(0.2, 0.54, 0.06').replace('box(0.045, 0.45, 0.08','box(0.045, 0.68, 0.08').replace('mullion.position.set(x - 0.125, 1.57, 0.775)','mullion.position.set(x - 0.125, 2.02, 0.89)').replace('galleryTop.position.set(0, 1.82, 0.77)','galleryTop.position.set(0, 2.38, 0.89)').replace('brace.position.set(side * 0.64, 1.28, 0.77)','brace.position.set(side * 0.64, 1.49, 0.86)')
k=k.replace('level === 1 ? 0.86 : 1','1').replace('level === 3 ? 0.86 : 0.72','0.94').replace('level === 3 ? 0.94 : 0.8','1.02').replace('level === 3 ? 0.52 : 0.44','0.52').replace('level === 3 ? 1.18 : 1.08','1.26')
# Ring one is permanently funded on porch ridge from L2, ring two crowns high hall L3.
k=k.replace("roofBaseY + roofHeight + 0.33, -0.34", "1.79, 0.84").replace("roofBaseY + roofHeight + 0.26, 0.42, 0.82", "roofBaseY + roofHeight + 0.3, -0.22, 1")
k=k.replace('  return group;','  group.userData.representativeSlice = \'keep-dominant-additive-macro-v001\';\n  return group;')
s=s[:a]+k+s[b:]
# Taller stone turret walls; radius and original sockets remain fixed.
a=s.index('function addAuroraKeepTower(');b=s.index('function addAuroraKeepRoofRibs',a);part=s[a:b].replace('const height = 1.12 * scale','const height = 1.78 * scale');s=s[:a]+part+s[b:]
s=s.replace('oceanMaterial.roughness = 0.2;','oceanMaterial.roughness = 0.94;\n  oceanMaterial.transparent = false;\n  oceanMaterial.transmission = 0;\n  ocean.position.y = -2.9;').replace('oceanMaterial.opacity = 0.88;','oceanMaterial.opacity = 1;')
a=s.index('  addSnowShelf(root, 0, 0, 6.1');b=s.index('  const pathLanternCount',a)
s=s[:a]+'''  root.add(createIsland3FrozenWorld(materials, quality));
  const satellites: Array<[number, number]> = [[-4.36, -3.9], [4.36, -3.9], [-4.36, 3.9], [4.36, 3.9]];

'''+s[b:]
a=s.index('      pines.forEach((pine) =>');b=s.index('      frozenPools.forEach',a);s=s[:a]+s[b:]
p.write_text(s)
