from pathlib import Path
p=Path('src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts');s=p.read_text()
needle='function addAuroraKeepRoofRibs('
helper='''/** Pitched copper planes over a real timber/plaster gable end. Keeping the
 * front infill separate avoids the old solid copper triangular cap. */
function addAuroraKeepPitchedRoof(
  group: THREE.Group, width: number, height: number, depth: number, y: number,
  materials: Island3FrostmoonMaterials,
) {
  const infill = new THREE.Mesh(createGableGeometry(width * .91, height * .94, depth * .92), materials.paper);
  infill.position.y = y;
  group.add(infill);
  const angle = Math.atan2(height, width / 2);
  const slope = Math.hypot(width / 2, height);
  for (const side of [-1, 1]) {
    const plane = box(slope + .08, .075, depth + .1, materials.indigoLight);
    plane.position.set(side * width / 4, y + height / 2 + .04, 0);
    plane.rotation.z = -side * angle;
    const snow = box(slope * .72, .055, depth + .12, materials.snow);
    snow.position.set(side * width * .23, y + height * .58 + .09, 0);
    snow.rotation.z = -side * angle;
    const fascia = box(slope + .08, .11, .10, materials.timberDark);
    fascia.position.set(side * width / 4, y + height / 2 + .01, depth / 2 + .075);
    fascia.rotation.z = -side * angle;
    group.add(plane, snow, fascia);
  }
  const ridge = box(.1, .12, depth + .22, materials.brass);
  ridge.position.y = y + height + .065;
  const kingPost = box(.12, height, .10, materials.timberDark);
  kingPost.position.set(0, y + height / 2, depth / 2 + .025);
  group.add(ridge, kingPost);
}

'''
s=s.replace(needle,helper+needle)
a=s.index('function createAuroraKeep(level:');b=s.index('\nexport function buildIsland3FrostmoonLandmark',a);k=s[a:b]
k=k.replace('addGableRoof(roof, 2.14, roofHeight, 1.7, roofBaseY, materials, quality);','addAuroraKeepPitchedRoof(roof, 2.14, roofHeight, 1.7, roofBaseY, materials);')
k=k.replace('    group.add(gallery);','''    group.add(gallery);
    const galleryRoof = createAuroraKeepPart('ISLAND_3_AURORA_KEEP_INTERMEDIATE_GALLERY_GABLE');
    galleryRoof.position.z = .79;
    addAuroraKeepPitchedRoof(galleryRoof, 1.88, .70, .94, 2.38, materials);
    group.add(galleryRoof);''')
k=k.replace("'ISLAND_3_AURORA_KEEP_SIGNAL_RING_1', 1.79, 0.84", "'ISLAND_3_AURORA_KEEP_SIGNAL_RING_1', 3.38, 1.0")
k=k.replace('keep-dominant-additive-macro-v001','keep-dominant-additive-macro-v002')
s=s[:a]+k+s[b:]
s=s.replace("    // Aurora Keep remains a named explodable hierarchy. The other landmarks\n    // keep their compact material batches for phone draw-call control unless\n    // construction preview needs their authored parts intact.\n    if (!options.constructionPreview && definition.id !== 'boss') {", "    // Construction keeps every named funded part; ordinary static board models\n    // use material batches. Pilot can still fade the Keep's cloned materials.\n    if (!options.constructionPreview) {")
a=s.index("  const distantCount = quality === 'high' ? 7");b=s.index('  markShadows(root, quality',a)
s=s[:a]+'''  // The previous near-field alpine cones included a large brick-textured
  // foothill that read as a floating castle. The frozen sea now supplies the
  // grounded depth cues; distant crags will be authored against that horizon.

'''+s[b:]
p.write_text(s)
