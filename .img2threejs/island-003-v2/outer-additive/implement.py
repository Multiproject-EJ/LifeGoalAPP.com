from pathlib import Path
p=Path('src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts')
s=p.read_text();start=s.index('function addSnowfeatherNestBay(');end=s.index('function createFrostfirePart(',start);part=s[start:end]
replacements={
 'side * (level === 1 ? 0.62 : 0.82), 0, level === 1 ? 0.04 : 0.62':'side * 0.82, 0, 0.62',
 'box(level === 1 ? 0.74 : 0.8, 0.22, level === 1 ? 0.7 : 0.76':'box(0.8, 0.22, 0.76',
 'SphereGeometry(level === 1 ? 0.19 : 0.24,':'SphereGeometry(0.24,',
 'egg.position.y = level === 1 ? 0.78 : 0.86':'egg.position.y = 0.86',
 'box(level === 3 ? 0.5 : 0.42,':'box(0.5,',
 'box(level === 3 ? 0.34 : 0.28,':'box(0.34,',
 'TorusGeometry(level === 3 ? 0.37 : 0.31, 0.055, 6, qualityArcSegments(level))':'TorusGeometry(0.37, 0.055, 6, 24)',
 'materials, level === 3 ? 0.72 : 0.58':'materials, 0.72',
 "createFrostfirePart('ISLAND_3_FROSTFIRE_CIRCULAR_FROST_STONE_FOUNDATION')":"createSnowfeatherPart('ISLAND_3_SNOWFEATHER_CIRCULAR_FROST_STONE_FOUNDATION')",
 'box(0.12, level === 1 ? 0.5 : 0.72, 1.54':'box(0.12, 0.72, 1.54',
 'side * 0.92, level === 1 ? 0.68 : 0.8, -0.02':'side * 0.92, 0.8, -0.02',
 'box(1.92, level === 1 ? 0.18 : 0.28, 0.14':'box(1.92, 0.28, 0.14',
 'rearBeam.position.set(0, level === 1 ? 0.49 : 0.56, -0.72)':'rearBeam.position.set(0, 0.56, -0.72)',
 'box(0.66, 0.12, 0.34, materials.frostRockDark)':'box(0.72, 0.1, 0.22, materials.frostRockDark)',
 'threshold.position.set(0, 0.45, 0.74)':'threshold.position.set(0, 0.43, 0.76)',
 '2.08, level === 3 ? 0.78 : 0.68, 1.58':'2.08, 0.78, 1.58',
 '(1 - progress) * (level === 3 ? 0.58 : 0.5)':'(1 - progress) * 0.58',
 'const postHeight = level === 1 ? 0.78 : level === 2 ? 1.08 : 1.3;':'const postHeight = 1.3;',
 'side * 0.25, level === 3 ? 1.78 : 1.46, frontZ':'side * 0.25, 1.78, frontZ',
 "const postCount = level === 1 ? 6 : level === 2 ? 10 : quality === 'low' ? 10 : 14;":"// Fixed final slots keep every funded post in place as the fence fills in.\n  const postCount = quality === 'low' ? 10 : 14;",
 'if (gateGap) {':'const fundedSlot = level === 3 || index % 2 === 0 || (level === 2 && index % 4 === 1);\n    if (gateGap || !fundedSlot) {',
 'box(0.12, level === 3 ? 0.66 : 0.52, 0.12':'box(0.12, 0.66, 0.12',
 'point.y + (level === 3 ? 0.36 : 0.29)':'point.y + 0.36',
 'setY(level === 3 ? 0.83 : 0.78)':'setY(0.83)',
 'level === 3 ? 0.035 : 0.03,':'0.035,',
 'level === 3 ? materials.timber : materials.timberDark,':'materials.timber,',
 'const width = level === 3 ? 0.66 : 0.52;':'const width = 0.66;',
 'const depth = level === 3 ? 0.4 : 0.28;':'const depth = 0.4;',
 'const height = level === 3 ? 1.24 : 1.08;':'const height = 1.24;',
 ': [[-1, 0], [1, 0]];':': [[-1, 1], [1, 1]];',
 'const targetXs = level === 1 ? [-0.72] : level === 2 ? [-0.94, -0.58] : [-1, -0.62];':'const targetXs = level === 1 ? [-1] : [-1, -0.62];',
 '0.065, 0.08, level === 1 ? 0.62 : 0.78':'0.065, 0.08, 0.78',
 'x, level === 1 ? 0.79 : 0.87, z':'x, 0.87, z',
 'x, level === 1 ? 0.98 : 1.08, z + 0.03':'x, 1.08, z + 0.03',
 'const width = level === 3 ? 0.9 : 0.72;':'const width = 0.9;',
 'const depth = level === 3 ? 0.72 : 0.58;':'const depth = 0.72;',
 'const postHeight = level === 3 ? 0.92 : 0.68;':'const postHeight = 0.92;',
 'width * 1.28, level === 3 ? 0.48 : 0.38,':'width * 1.28, 0.48,',
 'level === 1 ? materials.frostRock : materials.snowShadow':'materials.snowShadow',
 'cylinder(level === 3 ? 1.08 : 0.94, level === 3 ? 1.12 : 0.98,':'cylinder(1.08, 1.12,',
}
for before,after in replacements.items():
 assert before in part,before
 part=part.replace(before,after)
part=part.replace("function qualityArcSegments(level: 2 | 3) {\n  return level === 3 ? 24 : 16;\n}\n\n",'')
p.write_text(s[:start]+part+s[end:])
