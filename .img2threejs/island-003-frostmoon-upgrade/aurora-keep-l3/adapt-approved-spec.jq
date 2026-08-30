def ids: [
  "root",
  "raised-frost-stone-foundation",
  "central-great-hall-shell",
  "main-snow-copper-gable-roof",
  "front-gatehouse-and-heavy-door",
  "upper-watch-gallery-and-window-grid",
  "left-round-guard-tower",
  "right-round-guard-tower",
  "left-side-residential-wing",
  "right-side-residential-wing",
  "rear-service-wing-and-yard-door",
  "copper-conical-tower-roofs",
  "ridge-ring-beacon-system",
  "chimneys-caps-and-smoke-sockets",
  "dark-timber-buttress-and-trim-system",
  "warm-window-and-lantern-system",
  "snow-load-icicle-and-roof-seam-system",
  "rear-crates-firewood-tools-and-guard-rack"
];
def names: [
  "Aurora Keep L3",
  "Raised frost-stone foundation",
  "Central stone and timber great hall",
  "Main snow-capped copper gable roof",
  "Protected front gatehouse and heavy door",
  "Upper watch gallery and warm window grid",
  "Left round guard tower",
  "Right round guard tower",
  "Left residential wing",
  "Right residential wing",
  "Rear service wing and loading door",
  "Paired copper conical tower roofs",
  "Paired engineered brass ridge rings",
  "Chimneys, caps and smoke sockets",
  "Dark timber buttress and trim system",
  "Warm window and lantern system",
  "Snow load, icicles and roof seams",
  "Rear crates, firewood, tools and guard rack"
];
def parents: [
  null,
  "root",
  "raised-frost-stone-foundation",
  "central-great-hall-shell",
  "raised-frost-stone-foundation",
  "central-great-hall-shell",
  "raised-frost-stone-foundation",
  "raised-frost-stone-foundation",
  "raised-frost-stone-foundation",
  "raised-frost-stone-foundation",
  "raised-frost-stone-foundation",
  "raised-frost-stone-foundation",
  "main-snow-copper-gable-roof",
  "central-great-hall-shell",
  "central-great-hall-shell",
  "central-great-hall-shell",
  "main-snow-copper-gable-roof",
  "rear-service-wing-and-yard-door"
];
def mats: [
  "frost-stone", "frost-stone", "dark-timber", "raw-copper", "dark-timber", "dark-timber",
  "frost-stone", "frost-stone", "cream-plaster", "cream-plaster", "cream-plaster", "raw-copper",
  "brass", "frost-stone", "dark-timber", "amber-glow", "snow", "dark-timber"
];
def levels: [
  "macro", "macro", "macro", "macro", "macro", "meso", "macro", "macro", "macro", "macro",
  "macro", "macro", "meso", "meso", "meso", "meso", "meso", "meso"
];
def topology: [
  "assembled-solid", "assembled-solid", "assembled-solid", "conforming-shell", "assembled-solid",
  "assembled-solid", "assembled-solid", "assembled-solid", "assembled-solid", "assembled-solid",
  "assembled-solid", "conforming-shell", "assembled-solid", "assembled-solid", "surface-relief",
  "surface-relief", "surface-relief", "assembled-solid"
];
def features: [
  [], ["foundation-stone-courses"], ["gable-truss-system", "timber-grain-wear"],
  ["copper-roof-seams", "copper-edge-wear"], ["gate-door-hardware"], ["gallery-muntins"],
  ["tower-stone-joints"], ["tower-stone-joints"], ["wing-window-bays"], ["wing-window-bays"],
  ["rear-loading-door"], ["broken-snow-edges"], ["ridge-ring-supports"], ["capped-flues"],
  ["heavy-timber-braces"], ["window-emissive"], ["sparse-icicles", "broken-snow-edges"],
  ["crate-brass-straps", "split-log-stack", "guard-rack"]
];

.targetId = "island-003-aurora-keep-l3" |
.targetName = "Aurora Keep L3" |
.sourceImage = "docs/visual-references/island-003-frostmoon-upgrade/secondary-inferred/landmark-turnarounds/003-aurora-keep-turnaround-v001.png" |
.suitability = "pass" |
.preSpecAssessment = $assessment[0].preSpecAssessment |
.qualityContract = $assessment[0].qualityContract |
.qualityContract.minimumSpecDepth.reviewViewpoints = 5 |
.viewEvidence = [
  {"id":"full-object","view":"primary","imageRegion":{"x":0.0,"y":0.0,"width":1.0,"height":1.0,"units":"normalized"},"observations":["Complete approved five-view architectural sheet"],"confidence":0.98},
  {"id":"five-view-turnaround","view":"turnaround","imageRegion":{"x":0.0,"y":0.0,"width":1.0,"height":1.0,"units":"normalized"},"observations":["Front, side, rear and three-quarter construction hierarchy"],"confidence":0.98},
  {"id":"night-proof","view":"night-front","imageRegion":{"x":0.0,"y":0.0,"width":1.0,"height":1.0,"units":"normalized"},"observations":["Warm window and chimney ambience without northern lights"],"confidence":0.95},
  {"id":"front-crop","view":"front","imageRegion":{"x":0.0,"y":0.0,"width":1.0,"height":1.0,"units":"normalized"},"observations":["Deterministically admitted isolated front panel"],"confidence":0.98}
] |
.visualEvidence = [] |
.reviewHistory = [] |
.componentTree[0] as $rootTemplate |
.componentTree[1] as $partTemplate |
.componentTree = [range(0; ids|length) as $i |
  (if $i == 0 then $rootTemplate else $partTemplate end) |
  .id = ids[$i] |
  .name = names[$i] |
  .parent = parents[$i] |
  .level = levels[$i] |
  .topologyClass = topology[$i] |
  .topologyRationale = (if topology[$i] == "conforming-shell" then "A separately owned roof shell follows explicit wall collars, exposes its warm copper surface beneath snow and preserves a stable runtime pivot." else "A separately owned rigid architectural assembly with visible contacts, construction seams and a stable runtime pivot." end) |
  .material = mats[$i] |
  .materialLayers = [mats[$i]] |
  .localFeatures = features[$i] |
  .evidenceRefs = ["five-view-turnaround"] |
  .confidence = (if $i == 10 or $i == 17 then 0.86 else 0.98 end) |
  .actionProfile.animationRole = (if $i == 0 then "root" elif $i == 12 then "slow-rotating-signal" else "static-part" end) |
  .actionProfile.destruction.fractureGroup = ids[$i] |
  .actionProfile.destruction.debrisMaterial = mats[$i] |
  .attachment = (if $i == 0 then null else {"parentSocket":(parents[$i] + "-socket"),"localStart":[0,0,0],"localEnd":[0,0.1,0],"contactType":"overlap","overlap":0.04,"gapTolerance":0.01} end)
] |
.materials[4].id = "cream-plaster" |
.materials[4].name = "Warm cream plaster infill" |
.materials[4].baseColor = "#D7C9AE" |
.materials[4].color = "#D7C9AE" |
.materials[4].albedo.dominant = "#D7C9AE" |
.materials[4].albedo.secondary = ["#BFAF91", "#E5DAC5"] |
.materials[4].metalness = 0.0 |
.materials[4].roughness = 0.86 |
.materials[0].localOverrides += [{"id":"tower-stone-joints","componentRefs":["left-round-guard-tower","right-round-guard-tower","raised-frost-stone-foundation"],"roughness":0.96,"evidenceRefs":["five-view-turnaround"]}] |
.materials[1].localOverrides += [{"id":"timber-grain-wear","componentRefs":["central-great-hall-shell","dark-timber-buttress-and-trim-system"],"roughness":0.9,"evidenceRefs":["five-view-turnaround"]}] |
.materials[2].localOverrides += [{"id":"copper-edge-wear","componentRefs":["main-snow-copper-gable-roof","copper-conical-tower-roofs"],"roughness":0.3,"clearcoat":0.16,"evidenceRefs":["five-view-turnaround"]}] |
.materials[3].localOverrides += [{"id":"ridge-ring-supports","componentRefs":["ridge-ring-beacon-system"],"roughness":0.34,"evidenceRefs":["five-view-turnaround"]}] |
.materials[5].localOverrides += [{"id":"window-emissive","componentRefs":["upper-watch-gallery-and-window-grid","warm-window-and-lantern-system"],"emissive":"#FFB84F","emissiveIntensity":1.55,"evidenceRefs":["night-proof"]}] |
.repetitionSystems = [
  {"id":"paired-guard-towers","name":"Paired grounded round guard towers","componentRefs":["left-round-guard-tower","right-round-guard-tower"],"geometry":{"primitive":"cylinder-and-course-bands"},"instances":"two mirrored front shoulder sockets","buildsGeometry":true,"evidenceRefs":["five-view-turnaround"]},
  {"id":"paired-tower-roofs","name":"Paired copper conical tower roofs","componentRefs":["copper-conical-tower-roofs"],"geometry":{"primitive":"cone-and-snow-shell"},"instances":"two tower roof collars","buildsGeometry":true,"evidenceRefs":["five-view-turnaround"]},
  {"id":"gallery-window-grid","name":"Upper amber gallery window grid","componentRefs":["upper-watch-gallery-and-window-grid","warm-window-and-lantern-system"],"geometry":{"primitive":"box-and-muntin"},"instances":"phone-scale horizontal window rhythm","buildsGeometry":true,"evidenceRefs":["five-view-turnaround","night-proof"]},
  {"id":"paired-residential-wings","name":"Paired stepped residential wings","componentRefs":["left-side-residential-wing","right-side-residential-wing"],"geometry":{"primitive":"timber-frame-and-gable"},"instances":"two mirrored side sockets","buildsGeometry":true,"evidenceRefs":["five-view-turnaround"]},
  {"id":"paired-ridge-rings","name":"Paired engineered ridge rings","componentRefs":["ridge-ring-beacon-system"],"geometry":{"primitive":"torus-and-support-cradle"},"instances":"two longitudinal ridge sockets","buildsGeometry":true,"evidenceRefs":["five-view-turnaround"]},
  {"id":"distributed-roof-detail","name":"Roof seams, snow breaks and sparse icicles","componentRefs":["snow-load-icicle-and-roof-seam-system","main-snow-copper-gable-roof","copper-conical-tower-roofs"],"geometry":{"primitive":"beam-cone-and-snow-cap"},"instances":"quality-scaled deterministic roof-edge distribution","buildsGeometry":true,"evidenceRefs":["five-view-turnaround"]}
] |
.featureReviewTargets = [
  {"id":"keep-silhouette","name":"Tall civic hall, paired front towers and stepped wing silhouette","tier":"critical","passIds":["blockout","structural-pass"],"minimumScore":0.85,"mustPass":true,"componentRefs":["central-great-hall-shell","left-round-guard-tower","right-round-guard-tower","left-side-residential-wing","right-side-residential-wing"],"evidenceRefs":["five-view-turnaround"]},
  {"id":"gate-gallery-system","name":"Protected gatehouse below the inhabited upper watch gallery","tier":"critical","passIds":["structural-pass","form-refinement"],"minimumScore":0.85,"mustPass":true,"componentRefs":["front-gatehouse-and-heavy-door","upper-watch-gallery-and-window-grid"],"evidenceRefs":["five-view-turnaround"]},
  {"id":"copper-roof-system","name":"Warm copper gables and cones under neutral broken snow","tier":"critical","passIds":["form-refinement","material-pass"],"minimumScore":0.85,"mustPass":true,"componentRefs":["main-snow-copper-gable-roof","copper-conical-tower-roofs","snow-load-icicle-and-roof-seam-system"],"evidenceRefs":["five-view-turnaround"]},
  {"id":"ridge-ring-system","name":"Two supported engineered brass ridge rings without aurora magic","tier":"critical","passIds":["form-refinement","interaction-pass"],"minimumScore":0.85,"mustPass":true,"componentRefs":["ridge-ring-beacon-system"],"evidenceRefs":["five-view-turnaround"]},
  {"id":"night-habitation","name":"Warm gallery, wing, gate and rear-service lights","tier":"critical","passIds":["material-pass","lighting-pass"],"minimumScore":0.85,"mustPass":true,"componentRefs":["warm-window-and-lantern-system","upper-watch-gallery-and-window-grid"],"evidenceRefs":["night-proof"]},
  {"id":"rear-service-system","name":"Authored loading door, shipment crates, firewood, tools and guard rack","tier":"important","passIds":["form-refinement","interaction-pass"],"minimumScore":0.8,"mustPass":false,"componentRefs":["rear-service-wing-and-yard-door","rear-crates-firewood-tools-and-guard-rack"],"evidenceRefs":["five-view-turnaround"]}
] |
.buildPasses |= map(.componentRefs = ids) |
.lightingFromPhoto = [
  {"role":"key light","intent":"Existing Frostmoon daylight directional key reveals the stepped keep mass and warm copper without clipping snow."},
  {"role":"fill and environment light","intent":"Cool arctic hemisphere fill preserves charcoal stone, cream plaster and rear-service detail through day, blizzard, dusk and night."},
  {"role":"local emissive light","intent":"Amber windows, gate lanterns and fireplace/chimney cues create restrained cozy night focal light without aurora."},
  {"role":"exposure and tone mapping","intent":"Use the existing phase-safe filmic exposure so aged copper remains warm brown-orange and never shifts blue."},
  {"role":"contact shadow and background","intent":"Soft contact shadows ground towers, gatehouse, wings, rear crates, logs and tools on the existing snowy boss plinth."}
] |
.performanceBudget.targetTriangles = 90000 |
.performanceBudget.maxDrawCalls = 140 |
.assumptions += [
  "No blue roof metal, purple magic or northern lights belong to Aurora Keep.",
  "The ridge rings add presentation-only motion sockets and do not mutate gameplay state.",
  "The landmark remains within the frozen boss socket and route-clearance envelope."
]
