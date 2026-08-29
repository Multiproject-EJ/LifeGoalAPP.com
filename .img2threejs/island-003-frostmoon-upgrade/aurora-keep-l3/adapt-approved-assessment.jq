.preSpecAssessment.objectClass = {
  "primaryType": "stylized winter civic keep landmark",
  "primaryDomain": "object",
  "formLanguage": ["architectural", "hard-surface", "bilateral", "stepped-gable"],
  "structureKind": ["compound-object", "layered-shell", "paired-modules", "service-assembly"],
  "motionPotential": ["static-landmark", "hinged-door", "effect-emitter", "rotating-signal-rings"],
  "materialFamilies": ["frost-stone", "dark-timber", "cream-plaster", "aged-copper", "brass", "snow", "emissive-glass"],
  "notes": "Approved five-view goal sheet shows a tall civic great hall, two dominant round guard towers, protected gatehouse, inhabited wings, warm copper roofs, upper watch gallery, paired ridge rings and a functional rear service face."
} |
.preSpecAssessment.complexity.scores = {
  "silhouetteComplexity": 3,
  "componentCount": 3,
  "hierarchyDepth": 3,
  "repetitionDensity": 3,
  "materialLayerCount": 3,
  "localDetailDensity": 3,
  "occlusionRisk": 2,
  "actionReadinessNeed": 2
} |
.preSpecAssessment.complexity.estimatedCounts = {
  "macroComponents": 10,
  "mesoComponents": 7,
  "microFeatureGroups": 12,
  "materialLayers": 7,
  "repetitionSystems": 6
} |
.preSpecAssessment.complexity.reasoning = [
  "The identity depends on the relative hierarchy of a tall central hall, paired guard towers, projecting gatehouse, stepped side wings and authored rear service mass.",
  "Stone, dark timber, cream infill, weathered copper, brass, snow and amber emissive surfaces require independent responses rather than a shared brown material.",
  "The keep must remain explodable and clickable with stable door, window, smoke, ring-rotation and future fish-shipment sockets while adding no gameplay authority."
] |
.preSpecAssessment.unknownsToResolveBeforeImplementation = [] |
.preSpecAssessment.resolvedUnknowns = [
  "The interior and hidden roof joins remain intentionally inferred and do not alter the visible exterior hierarchy.",
  "The rear service layout is authored from the rear and three-quarter candidate panels, with exact prop positions compressed inside the frozen boss footprint.",
  "Ridge rings are restrained engineered signal instruments; they may rotate slowly and emit warm nodes but never create northern lights or purple magic."
] |
.preSpecAssessment.detailInventory = {
  "scanMethod": "component-zones",
  "targetMinDetails": 10,
  "note": "Identity details are mapped to named runtime components or material overrides.",
  "details": [
    {"id":"copper-roof-plate-seams","kind":"seam","mapsTo":{"ref":"copper-roof-seams"},"realization":"geometry"},
    {"id":"broken-snow-eaves","kind":"ridge","mapsTo":{"ref":"broken-snow-edges"},"realization":"geometry"},
    {"id":"tower-stone-courses","kind":"linework","mapsTo":{"ref":"tower-stone-joints"},"realization":"raised geometry"},
    {"id":"gallery-window-muntins","kind":"ridge","mapsTo":{"ref":"gallery-muntins"},"realization":"geometry"},
    {"id":"heavy-gable-truss","kind":"ridge","mapsTo":{"ref":"gable-truss-system"},"realization":"geometry"},
    {"id":"gate-door-hardware","kind":"fastener","mapsTo":{"ref":"gate-door-hardware"},"realization":"geometry"},
    {"id":"ridge-ring-brackets","kind":"fastener","mapsTo":{"ref":"ridge-ring-supports"},"realization":"geometry"},
    {"id":"warm-window-glow","kind":"emissive","mapsTo":{"ref":"window-emissive"},"realization":"emissive material and optional local lights"},
    {"id":"copper-worn-edges","kind":"gloss","mapsTo":{"ref":"copper-edge-wear"},"realization":"material override"},
    {"id":"timber-grain-wear","kind":"scratch","mapsTo":{"ref":"timber-grain-wear"},"realization":"procedural material response"},
    {"id":"sparse-eave-icicles","kind":"ridge","mapsTo":{"ref":"sparse-icicles"},"realization":"geometry"},
    {"id":"rear-shipment-crate-straps","kind":"fastener","mapsTo":{"ref":"crate-brass-straps"},"realization":"repeated geometry"}
  ]
} |
.qualityContract.definitionOfDone = [
  "At phone scale the keep reads as the approved civic winter fortress: a dominant central gable hall, two substantial round front towers, protected gatehouse, stepped inhabited wings, warm copper roof hierarchy and paired engineered ridge rings.",
  "Front, both three-quarters, side and rear captures show continuous construction, grounded attachments and an authored service elevation without blue roof metal, purple magic or northern lights.",
  "L1, L2 and L3 remain the same structure growing additively inside the canonical boss footprint."
] |
.qualityContract.minimumSpecDepth = {
  "macroComponents": 10,
  "mesoComponents": 7,
  "microFeatureGroups": 12,
  "materialLayers": 7,
  "repetitionSystems": 6,
  "reviewViewpoints": 6
} |
.qualityContract.featureGroups += [
  {
    "id":"civic-keep-hierarchy",
    "name":"Central hall, paired towers, gatehouse and stepped wings",
    "required":true,
    "qualityCriteria":["The central hall dominates without erasing the two front towers.","The gatehouse remains visibly lower than the gallery and all major masses overlap their foundation sockets."],
    "evidenceRefs":["five-view-turnaround"],
    "failureModes":["reads as a generic lodge","reads as six repeated turrets","flat or empty side and rear elevations"]
  },
  {
    "id":"warm-copper-roof-network",
    "name":"Warm copper roofs with neutral snow and construction seams",
    "required":true,
    "qualityCriteria":["Copper remains brown-orange beneath snow.","Every roof has a visible wall collar, ridge or eave construction line."],
    "evidenceRefs":["five-view-turnaround","night-proof"],
    "failureModes":["blue roof metal","snow hides the complete roof","floating roof shells"]
  },
  {
    "id":"ridge-ring-identity",
    "name":"Paired engineered brass ridge rings",
    "required":true,
    "qualityCriteria":["Two supported rings survive the gameplay camera.","Any movement remains slow and mechanical with warm nodes only."],
    "evidenceRefs":["five-view-turnaround"],
    "failureModes":["single faceted jewel","purple magic","northern-light effect","unsupported floating rings"]
  }
] |
.qualityContract.visualDeltaChecks = [
  "central-hall to guard-tower height and width delta",
  "gatehouse projection and upper-gallery negative-space delta",
  "side-wing and rear-service volume delta",
  "warm-copper to snow coverage and roughness delta",
  "paired ridge-ring scale and support delta",
  "front/rear authored-detail and attachment delta"
]
