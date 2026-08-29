def ids: [
  "root",
  "circular-foundation",
  "octagonal-stone-and-timber-shell",
  "front-stair-and-archive-door",
  "exterior-reading-alcove",
  "radial-copper-roof",
  "frostfire-lantern-stack",
  "rear-furnace-and-flue",
  "dark-timber-buttress-system",
  "reading-window-system",
  "archive-shelves-and-books",
  "open-book-crest",
  "rear-document-chests",
  "rear-tools-and-logs",
  "roof-ribs-brackets-and-snow-seams",
  "brass-index-and-fastener-system"
];
def names: [
  "Frostfire Archive L3",
  "Circular frost-stone foundation",
  "Octagonal stone and timber shell",
  "Front stair and inset archive door",
  "Sheltered exterior reading alcove",
  "Low radial copper roof",
  "Open frostfire lantern stack",
  "Rear furnace and capped copper flue",
  "Eight dark-timber buttresses",
  "Paired amber reading windows",
  "Archive shelves, books and charts",
  "Hammered-copper open-book crest",
  "Rear document chests",
  "Rear snow tools and firewood",
  "Roof ribs, brackets, snow seams and icicles",
  "Brass index and fastener system"
];
def parents: [
  null,
  "root",
  "circular-foundation",
  "circular-foundation",
  "circular-foundation",
  "octagonal-stone-and-timber-shell",
  "radial-copper-roof",
  "octagonal-stone-and-timber-shell",
  "octagonal-stone-and-timber-shell",
  "octagonal-stone-and-timber-shell",
  "exterior-reading-alcove",
  "front-stair-and-archive-door",
  "circular-foundation",
  "circular-foundation",
  "radial-copper-roof",
  "octagonal-stone-and-timber-shell"
];
def mats: [
  "frost-stone", "frost-stone", "dark-timber", "dark-timber",
  "dark-timber", "raw-copper", "amber-glow", "raw-copper",
  "dark-timber", "amber-glow", "paper-and-books", "raw-copper",
  "dark-timber", "dark-timber", "snow", "brass"
];
def features: [
  [],
  ["stone-joint-snow"],
  ["longitudinal-timber-grain"],
  ["door-hardware"],
  ["shelf-index-plates"],
  ["roof-radial-ribs", "copper-worn-edges"],
  ["frostfire-emissive"],
  ["furnace-emissive", "capped-flue"],
  ["buttress-copper-brackets"],
  ["window-muntins"],
  ["varied-book-spines", "rolled-charts"],
  ["book-page-relief"],
  ["document-chest-straps"],
  ["rear-tool-hooks", "split-log-stack"],
  ["roof-icicles", "snow-seam-rhythm"],
  ["distributed-brass-fasteners"]
];

.targetId = "island-003-frostfire-archive-l3" |
.targetName = "Frostfire Archive L3" |
.sourceImage = "docs/visual-references/island-003-frostmoon-upgrade/secondary-inferred/landmark-goals/003-frostfire-archive-l3-goal-v001.png" |
.suitability = "pass" |
.preSpecAssessment = $assessment.preSpecAssessment |
.preSpecAssessment.unknownsToResolveBeforeImplementation = [] |
.preSpecAssessment.resolvedUnknowns = [
  "Hidden furnace ducting and shelf interiors remain intentionally inferred and do not alter the visible exterior hierarchy.",
  "Book titles, chart marks and exact fastener counts are represented as grouped phone-scale construction cues.",
  "Alcove and rear-service depth are compressed inside the frozen 3.7-world-unit envelope without removing their functional read."
] |
.qualityContract = $assessment.qualityContract |
.componentTree = (.componentTree | to_entries | map(
  .key as $i | .value |
  .id = ids[$i] |
  .name = names[$i] |
  .parent = parents[$i] |
  .level = (if $i <= 7 then "macro" else "meso" end) |
  .material = mats[$i] |
  .materialLayers = [mats[$i]] |
  .localFeatures = features[$i] |
  .evidenceRefs = ["full-object"] |
  .topologyRationale = (if $i == 5 then "A low conforming octagonal roof shell follows the wall perimeter and rises to a central curb." else "A separately owned rigid architectural assembly with visible contacts, construction seams and a stable runtime pivot." end) |
  .actionProfile.animationRole = (if $i == 0 then "root" else "static-part" end) |
  .actionProfile.destruction.fractureGroup = ids[$i] |
  .actionProfile.destruction.debrisMaterial = mats[$i] |
  .attachment = (if $i == 0 then null else {"parentSocket":"landmark-assembly-socket","localStart":[0,0,0],"localEnd":[0,0.1,0],"contactType":"overlap","overlap":0.04,"gapTolerance":0.01} end)
)) |
.materials[4].id = "paper-and-books" |
.materials[4].name = "Warm paper, book spines and charts" |
.materials[4].baseColor = "#D8C59A" |
.materials[4].metalness = 0.0 |
.materials[4].roughness = 0.82 |
.materials[0].localOverrides += [{"id":"stone-joint-snow","componentRefs":["circular-foundation"],"roughness":0.98,"evidenceRefs":["full-object"]}] |
.materials[1].localOverrides += [{"id":"longitudinal-timber-grain","componentRefs":["octagonal-stone-and-timber-shell","dark-timber-buttress-system"],"roughness":0.88,"evidenceRefs":["full-object"]}] |
.materials[2].localOverrides += [{"id":"copper-worn-edges","componentRefs":["radial-copper-roof","open-book-crest"],"roughness":0.28,"clearcoat":0.18,"evidenceRefs":["full-object"]}] |
.materials[5].localOverrides += [{"id":"furnace-emissive","componentRefs":["rear-furnace-and-flue"],"emissive":"#FF9C43","emissiveIntensity":1.6,"evidenceRefs":["full-object"]}] |
.repetitionSystems = [
  {"id":"eight-buttresses","name":"Eight grounded buttress modules","componentRefs":["dark-timber-buttress-system"],"geometry":{"primitive":"box-and-beam"},"instances":"eight deterministic octagonal corner angles","buildsGeometry":true,"evidenceRefs":["full-object"]},
  {"id":"eight-roof-ribs","name":"Eight radial copper roof ribs","componentRefs":["radial-copper-roof","roof-ribs-brackets-and-snow-seams"],"geometry":{"primitive":"endpoint-beam"},"instances":"eight deterministic eave-to-curb spans","buildsGeometry":true,"evidenceRefs":["full-object"]},
  {"id":"paired-reading-windows","name":"Paired amber reading windows","componentRefs":["reading-window-system"],"geometry":{"primitive":"box-and-muntin"},"instances":"two side-wall sockets","buildsGeometry":true,"evidenceRefs":["full-object"]},
  {"id":"archive-book-rhythm","name":"Varied shelf book and chart rhythm","componentRefs":["archive-shelves-and-books"],"geometry":{"primitive":"instanced-box"},"instances":"quality-scaled uneven rows with three muted spine palettes","buildsGeometry":true,"evidenceRefs":["full-object"]},
  {"id":"distributed-hardware","name":"Copper and brass construction hardware","componentRefs":["brass-index-and-fastener-system","front-stair-and-archive-door","rear-document-chests"],"geometry":{"primitive":"instanced-fastener"},"instances":"paired hinges, radial brackets, shelf tags and chest straps","buildsGeometry":true,"evidenceRefs":["full-object"]}
] |
.featureReviewTargets = [
  {"id":"archive-silhouette","name":"Squat octagonal archive and low radial roof silhouette","tier":"critical","passIds":["blockout","structural-pass"],"minimumScore":0.85,"mustPass":true,"componentRefs":["octagonal-stone-and-timber-shell","radial-copper-roof","frostfire-lantern-stack"],"evidenceRefs":["full-object"]},
  {"id":"book-entry-system","name":"Broad stair, inset door and open-book crest","tier":"critical","passIds":["structural-pass","form-refinement"],"minimumScore":0.85,"mustPass":true,"componentRefs":["front-stair-and-archive-door","open-book-crest"],"evidenceRefs":["full-object"]},
  {"id":"reading-alcove-system","name":"Sheltered public shelves, books and open reading desk","tier":"critical","passIds":["structural-pass","form-refinement"],"minimumScore":0.82,"mustPass":true,"componentRefs":["exterior-reading-alcove","archive-shelves-and-books"],"evidenceRefs":["full-object"]},
  {"id":"frostfire-and-warm-light","name":"Open frostfire stack, amber windows and furnace glow","tier":"critical","passIds":["material-pass","lighting-pass"],"minimumScore":0.85,"mustPass":true,"componentRefs":["frostfire-lantern-stack","reading-window-system","rear-furnace-and-flue"],"evidenceRefs":["full-object"]},
  {"id":"rear-service-system","name":"Authored furnace, flue, document chests, tools and logs","tier":"important","passIds":["form-refinement","interaction-pass"],"minimumScore":0.78,"mustPass":false,"componentRefs":["rear-furnace-and-flue","rear-document-chests","rear-tools-and-logs"],"evidenceRefs":["full-object"]}
] |
.buildPasses |= map(.componentRefs = ids) |
.lightingFromPhoto = [
  {"role":"key light","intent":"Existing Frostmoon daylight directional key reveals the octagonal shell and warm copper roof without clipping snow."},
  {"role":"fill and environment light","intent":"Cool arctic hemisphere fill preserves dark timber and rear-service detail across day, blizzard, dusk and night."},
  {"role":"local emissive light","intent":"Amber frostfire, windows, entry lanterns and rear furnace create restrained cozy night focal light without aurora."},
  {"role":"exposure and tone mapping","intent":"Use the existing phase-safe filmic exposure so aged copper remains warm brown-orange and never shifts to blue."},
  {"role":"contact shadow and background","intent":"Soft contact shadows ground buttress feet, stairs, alcove, chests, logs and tools against the existing snowy platform."}
] |
.assumptions += [
  "No blue roof metal, purple magic or northern lights belong to this landmark.",
  "The landmark adds presentation-ready sockets only and does not add gameplay state or direct React writes."
]
