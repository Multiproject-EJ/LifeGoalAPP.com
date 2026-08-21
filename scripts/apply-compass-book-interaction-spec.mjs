#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const specPath = resolve(process.argv[2] ?? '.img2threejs/compass-book-ikigai-map/ikigai-map-sculpt-spec.json');
const spec = JSON.parse(readFileSync(specPath, 'utf8'));

if (spec.targetId !== 'compass-book-chapter-iv-ikigai-map-relief') {
  throw new Error(`Unexpected sculpt target ${String(spec.targetId)}`);
}

const animatedRoles = new Map([
  ['root', 'presentation-root'],
  ['force-graph', 'chapter-completion-constellation'],
  ['curiosity-node', 'completion-cascade-node-1'],
  ['capability-node', 'completion-cascade-node-2'],
  ['contribution-node', 'completion-cascade-node-3'],
  ['viability-node', 'completion-cascade-node-4'],
  ['willingness-node', 'completion-cascade-node-5'],
  ['trial-system', 'completion-trial-pivot'],
  ['trial-rings', 'completion-ring-rotation'],
  ['trial-crystal', 'fragment-and-chapter-pulse'],
  ['candidate-paths', 'progressive-emissive-fill'],
  ['mirage-node', 'chapter-completion-recession'],
]);
const movable = new Set(animatedRoles.keys());
const materialState = new Set([
  'chart-field',
  'rail-system',
  'curiosity-node',
  'capability-node',
  'contribution-node',
  'viability-node',
  'willingness-node',
  'trial-crystal',
  'candidate-paths',
  'mirage-node',
]);
const colliderOverrides = new Map([
  ['root', { type: 'box', offset: [0, 0.25, 0], scale: [3.82, 0.72, 5.66] }],
  ['force-graph', { type: 'box', offset: [0, 0.26, 0], scale: [3.32, 0.48, 4.0] }],
  ['trial-system', { type: 'cylinder', offset: [0, 0.34, 0.06], scale: [0.98, 0.72, 0.98] }],
  ['trial-crystal', { type: 'sphere', offset: [0, 0.46, 0], scale: [0.42, 0.52, 0.42] }],
  ['candidate-paths', { type: 'box', offset: [0, 0.27, 0.55], scale: [2.7, 0.15, 1.8] }],
  ['mirage-node', { type: 'cylinder', offset: [0, 0.25, 0], scale: [0.64, 0.42, 0.64] }],
]);
const forceNodeIds = [
  'curiosity-node',
  'capability-node',
  'contribution-node',
  'viability-node',
  'willingness-node',
];
forceNodeIds.forEach((id) => colliderOverrides.set(
  id,
  { type: 'cylinder', offset: [0, 0.3, 0], scale: [0.72, 0.28, 0.72] },
));

const socketsFor = (id) => {
  if (id === 'root') return [{ id: 'page-surface', localPosition: [0, 0, 0], localRotation: [0, 0, 0] }];
  if (id === 'force-graph') {
    return [
      ['curiosity', [0, 0.28, -1.72]],
      ['capability', [1.34, 0.28, -0.48]],
      ['contribution', [0.88, 0.28, 1.28]],
      ['viability', [-0.88, 0.28, 1.28]],
      ['willingness', [-1.34, 0.28, -0.48]],
      ['trial', [0, 0.34, 0.06]],
    ].map(([socketId, localPosition]) => ({ id: socketId, localPosition, localRotation: [0, 0, 0] }));
  }
  if (id === 'trial-system') {
    return [{ id: 'hub-centre', localPosition: [0, 0.46, 0], localRotation: [0, 0, 0] }];
  }
  if (forceNodeIds.includes(id)) {
    return [{ id: 'insert-centre', localPosition: [0, 0.4, 0], localRotation: [0, 0, 0] }];
  }
  return [];
};

for (const component of spec.componentTree) {
  const id = component.id;
  const isMovable = movable.has(id);
  const collider = colliderOverrides.get(id) ?? {
    type: component.primitive === 'cylinder' ? 'cylinder' : 'box',
    offset: [0, 0, 0],
    scale: [1, 1, 1],
  };
  component.transform ??= {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  };
  component.actionProfile = {
    animationRole: animatedRoles.get(id) ?? 'static-relief-part',
    pivot: {
      mode: 'stable-component-origin',
      localPosition: [0, 0, 0],
      axis: [0, 1, 0],
      confidence: isMovable ? 0.98 : 0.92,
    },
    transformChannels: {
      translate: isMovable,
      rotate: isMovable,
      scale: isMovable,
      bend: false,
      twist: false,
      detach: false,
      visibility: true,
      materialState: materialState.has(id),
    },
    sockets: socketsFor(id),
    collider: {
      ...collider,
      isTrigger: true,
      notes: 'Presentation-only proxy; gameplay collision and progression remain outside the Compass Book UI.',
    },
    constraints: [
      'presentation-only',
      'no-gameplay-state-write',
      'return-to-authored-transform-after-ceremony',
    ],
    destruction: {
      breakable: false,
      fractureGroup: id === 'mirage-node' || component.parent === 'mirage-node'
        ? 'invalid-satellite'
        : id === 'chart-field' || component.parent === 'chart-field'
          ? 'chart-field'
          : 'valid-graph',
      seamRefs: [],
      detachableFragments: [],
      breakImpulse: 0,
      debrisMaterial: component.material ?? 'base',
    },
  };
}

spec.animationAnchors = [
  'root is the whole-relief presentation pivot and remains subordinate to the book hinge/page transform',
  'force-graph owns the five completion-cascade node pivots and the central Trial socket',
  'trial-crystal and trial-rings are independent animation anchors for fragment and chapter completion pulses',
  'candidate-paths exposes material-state animation for progressive path illumination without semantic state writes',
  'mirage-node is a separate pivot that may recede during completion while remaining visibly outside the valid graph',
];
spec.actionReadiness.defaultRigType = 'presentation-ceremony-rig';
spec.actionReadiness.implementedActions = {
  fragmentCompletion: [
    'pulse Trial crystal',
    'raise candidate-path emissive response',
  ],
  chapterCompletion: [
    'cascade five force-node pivots in canonical order',
    'pulse and rotate the Trial assembly',
    'fill all three candidate paths',
    'recede Mirage without deleting or reclassifying it',
  ],
  reducedMotion: [
    'keep pivots at authored transforms',
    'use restrained material-state emphasis only',
  ],
};
spec.actionReadiness.runtimeBinding = {
  method: 'CompassBookThreeModel.setCelebrationProgress',
  owner: 'CompassBookThreeShell presentation event',
  stateAuthority: 'canonical DOM/store; the model receives transient progress only',
};

writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
process.stdout.write(`Applied action profiles to ${spec.componentTree.length} components in ${specPath}\n`);
