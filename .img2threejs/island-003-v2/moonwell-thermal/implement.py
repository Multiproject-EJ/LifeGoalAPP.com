from pathlib import Path
p=Path('src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts');s=p.read_text();Path('.img2threejs/island-003-v2/moonwell-thermal/baseline-world.ts.txt').write_text(s)
a=s.index('function addMoonwellArch(');b=s.index('function createMoonwellObservatory',a);k=s[a:b]
k=k.replace('new THREE.Vector3(0, height, 0)', 'new THREE.Vector3(0, 2 * height - 0.53, 0)').replace('new THREE.Vector3(0, height + 0.025, 0)', 'new THREE.Vector3(0, 2 * (height + 0.025) - 0.55, 0)')
k=k.replace('  const rib = new THREE.Mesh(', '  if (!cladInCopper) {\n  const rib = new THREE.Mesh(').replace('  if (!cladInCopper) return;', '  return;\n  }')
s=s[:a]+k+s[b:]
a=s.index('function createMoonwellObservatory');b=s.index('function createFrostfirePart',a);k=s[a:b]
k=k.replace("representativeSlice: 'moonwell-basin-rib-armillary-axis-v001'", "representativeSlice: 'moonwell-additive-frozen-thermal-v002'")
k=k.replace('  basin.add(basinBase, basinCurb, copperRim);', "  copperRim.material = materials.indigoLight.clone();\n  copperRim.material.emissive.setHex(0xff8d37);\n  copperRim.material.emissiveIntensity = 0;\n  copperRim.userData.moonwellThermalRole = 'heater';\n  basin.add(basinBase, basinCurb, copperRim);")
start=k.index("  const water = createMoonwellPart(");end=k.index("  const entry =",start)
k=k[:start]+'''  const water = createMoonwellPart('ISLAND_3_MOONWELL_ICE_WATER_AND_MOON_DISC');
  const liquidMaterial = new THREE.MeshPhysicalMaterial({ color: 0x6793aa, roughness: .24, metalness: .08 });
  const iceWater = cylinder(.63, .63, .035, liquidMaterial, segmentsFor(quality));
  iceWater.name = 'ISLAND_3_MOONWELL_ICE_WATER';
  iceWater.position.y = .65;
  iceWater.userData.moonwellThermalRole = 'water';
  iceWater.visible = false;
  water.add(iceWater);
  const iceMaterial = new THREE.MeshStandardMaterial({ color: 0xdcecf2, roughness: .76 });
  // Overlapping opaque sectors fully seal the basin at rest. Each owns a local
  // pivot so thaw can reveal water between retreating pieces, without gameplay.
  for (let index = 0; index < 6; index++) {
    const angle = index / 6 * Math.PI * 2;
    const geometry = new THREE.CylinderGeometry(.635, .635, .045, quality === 'low' ? 3 : 6, 1, false, angle, Math.PI / 3 + .006);
    const pivot = new THREE.Vector3(Math.sin(angle + Math.PI / 6) * .22, 0, Math.cos(angle + Math.PI / 6) * .22);
    geometry.translate(-pivot.x, 0, -pivot.z);
    const ice = new THREE.Mesh(geometry, iceMaterial);
    ice.name = `ISLAND_3_MOONWELL_FROZEN_SECTOR_${index + 1}`;
    ice.position.set(pivot.x, .683, pivot.z);
    ice.userData.moonwellThermalRole = 'ice';
    water.add(ice);
  }
  const moonDisc = cylinder(.3, .3, .018, materials.snow, segmentsFor(quality));
  moonDisc.name = 'ISLAND_3_MOONWELL_MOON_DISC';
  moonDisc.position.set(.05, .714, -.04);
  moonDisc.userData.moonwellThermalRole = 'ice';
  water.add(moonDisc);
  if (level === 3) {
    const bubbleMaterial = new THREE.MeshPhysicalMaterial({ color: 0xb5fff0, roughness: .15, transparent: true, opacity: .4, depthWrite: false });
    const steamMaterial = new THREE.MeshBasicMaterial({ color: 0xebf7f8, transparent: true, opacity: .15, depthWrite: false });
    for (let index = 0; index < 5; index++) {
      const angle = index * 2.39996;
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(.024 + index % 2 * .009, 6, 4), bubbleMaterial);
      bubble.name = `ISLAND_3_MOONWELL_THERMAL_BUBBLE_${index + 1}`;
      bubble.position.set(Math.cos(angle) * (.16 + index % 3 * .1), .681, Math.sin(angle) * .34);
      bubble.userData.moonwellThermalRole = 'bubble'; bubble.visible = false; water.add(bubble);
    }
    for (let index = 0; index < 3; index++) {
      const steam = new THREE.Mesh(new THREE.SphereGeometry(.07 + index * .012, 7, 5), steamMaterial);
      steam.name = `ISLAND_3_MOONWELL_THERMAL_STEAM_${index + 1}`;
      steam.position.set((index - 1) * .2, .72, index % 2 ? -.14 : .12);
      steam.scale.set(1.2, .65, 1);
      steam.userData.moonwellThermalRole = 'steam'; steam.visible = false; water.add(steam);
    }
  }
  group.add(water);

'''+k[end:]
k=k.replace('const ribAngles = level === 2 ? [0, Math.PI / 2] : [0, Math.PI / 3, Math.PI * 2 / 3]', 'const ribAngles = level === 2 ? [0, Math.PI / 3] : [0, Math.PI / 3, Math.PI * 2 / 3]').replace('angle, level === 3 ? 2.18 : 1.82','angle, 2.18')
start=k.index('      cladding.children.filter(');end=k.index('      group.add(cladding);',start);k=k[:start]+k[end:]
k=k.replace('level === 3 ? 0.58 : 0.48','0.58').replace('level === 3 ? 0.74 : 0.69','0.74').replace('level === 3 ? 0.34 : 0.28','0.34').replace('level === 3 ? 0.76 : 0.71','0.76')
k=k.replace('    group.add(axis);', "    addHearthguardBeam(axis, axisStart, new THREE.Vector3(0, .71, 0), .035, materials.brass, 'ISLAND_3_MOONWELL_LOWER_BEARING_SUPPORT');\n    addHearthguardBeam(axis, axisEnd, new THREE.Vector3(0, 2.13, 0), .035, materials.brass, 'ISLAND_3_MOONWELL_CROWN_BEARING_SUPPORT');\n    group.add(axis);")
s=s[:a]+k+s[b:]
s=s.replace('compactStaticGeometry(building, `ISLAND3_FROSTMOON_${definition.id.toUpperCase()}_L${resolved}`);', 'compactStaticGeometry(building, `ISLAND3_FROSTMOON_${definition.id.toUpperCase()}_L${resolved}`,\n        (mesh) => !mesh.userData.moonwellThermalRole);')
p.write_text(s)
