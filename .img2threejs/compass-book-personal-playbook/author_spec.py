#!/usr/bin/env python3
"""Author the Chapter VI Personal Playbook relief from the accepted goal image.

The output deliberately keeps the canonical DOM book outside the reconstruction:
this package owns only named presentation geometry and animation anchors.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
SPEC_PATH = HERE / "personal-playbook-sculpt-spec.json"
QUEST_SPEC = HERE.parent / "compass-book-quest-forge" / "quest-forge-sculpt-spec.json"
REFERENCE = HERE / "personal-playbook-relief-reference-final.png"


with SPEC_PATH.open() as handle:
    personal = json.load(handle)
with QUEST_SPEC.open() as handle:
    quest = json.load(handle)


def feature(feature_id: str, description: str, evidence: str = "personal-playbook-goal") -> dict:
    return {
        "id": feature_id,
        "placement": description,
        "size": "phone-readable macro/meso relief or disciplined repeated micro geometry",
        "orientation": "aligned to the local page-relief frame and source-image tangent",
        "materialEffect": "independent albedo, roughness, normal/height and AO response",
        "geometryEffect": "closed raised geometry when silhouette/contact changes; shallow relief only when it does not",
        "confidence": 0.94,
        "evidenceRefs": [evidence],
    }


component_template = quest["componentTree"][0]


def component(
    component_id: str,
    name: str,
    level: str,
    role: str,
    primitive: str,
    topology: str,
    topology_reason: str,
    parent: str | None,
    material: str,
    position: list[float],
    dimensions: list[float],
    features: list[tuple[str, str]],
    *,
    importance: float = 0.9,
    animation: dict | None = None,
    attachment: dict | None = None,
) -> dict:
    item = copy.deepcopy(component_template)
    item.update(
        {
            "id": component_id,
            "name": name,
            "level": level,
            "role": role,
            "importance": importance,
            "confidence": 0.94 if parent else 1.0,
            "primitive": primitive,
            "topologyClass": topology,
            "topologyRationale": topology_reason,
            "parent": parent,
            "material": material,
            "materialLayers": [material],
            "dimensions": {
                "width": dimensions[0],
                "height": dimensions[1],
                "depth": dimensions[2],
                "units": "page-relief-world",
                "confidence": 0.9,
            },
            "transform": {
                "position": position,
                "rotation": [0, 0, 0],
                "scale": [1, 1, 1],
            },
            "localFeatures": [feature(fid, text) for fid, text in features],
            "evidenceRefs": ["personal-playbook-goal"],
            "details": [],
            "fidelityTier": "blockout",
        }
    )
    edge = "chamfer" if topology in {"assembled-solid", "surface-relief"} else "rounded"
    item["geometryDescriptor"] = {
        "topologyIntent": f"closed {topology} with genuine off-axis depth and named part boundaries",
        "edgeTreatment": {"type": edge, "bevelRadius": 0.025, "segments": 3},
        "deformationStack": [],
        "uvStrategy": "generated procedural coordinates",
        "normalStrategy": "vertex normals from closed generated geometry",
    }
    item["surfaceDetail"] = {
        "macroRoughness": 0.12,
        "microRoughness": 0.07,
        "bumpAmplitude": 0.026,
        "normalPattern": f"{material}-independent-normal",
        "displacementPattern": "silhouette-changing relief stays in geometry",
        "occlusionPattern": "bezels, sockets, seams, collars and page contacts",
        "edgeWearPattern": "restrained contact polish with cavity-darkened patina",
        "notes": "Macro, meso and micro frequency bands remain separated under grazing light.",
    }
    item["actionProfile"]["animationRole"] = role
    item["actionProfile"]["pivot"] = {
        "mode": "center" if parent is None else "custom",
        "localPosition": [0, 0, 0],
        "axis": [0, 1, 0],
        "confidence": 0.94,
    }
    item["actionProfile"]["transformChannels"] = {
        "translate": False,
        "rotate": False,
        "scale": False,
        "bend": False,
        "twist": False,
        "detach": False,
        "visibility": True,
        "materialState": False,
    }
    if animation:
        item["actionProfile"]["transformChannels"].update(animation)
    item["actionProfile"]["sockets"] = [
        {
            "id": f"{component_id}-socket",
            "position": [0, 0, 0],
            "rotation": [0, 0, 0],
            "purpose": "stable presentation animation, child attachment and effect anchor",
        }
    ]
    item["actionProfile"]["collider"] = {
        "type": "box",
        "offset": [0, 0, 0],
        "scale": dimensions,
        "isTrigger": True,
        "notes": "Presentation-only pick volume; never a gameplay collider or state owner.",
    }
    item["actionProfile"]["destruction"] = {
        "breakable": False,
        "fractureGroup": parent or "personal-playbook-root",
        "seamRefs": [],
        "detachableFragments": [],
        "breakImpulse": 0,
        "debrisMaterial": material,
    }
    if parent is None:
        item["attachment"] = None
    else:
        item["attachment"] = attachment or {
            "parentId": parent,
            "parentSocket": f"{parent}-socket",
            "localStart": position,
            "localEnd": [position[0], position[1], position[2] + max(0.03, dimensions[2] * 0.5)],
            "baseRadius": max(0.025, min(dimensions[0], dimensions[1]) * 0.08),
            "endRadius": max(0.02, min(dimensions[0], dimensions[1]) * 0.06),
            "overlap": 0.04,
            "embedDepth": 0.035,
            "contactType": "embedded",
            "gapTolerance": 0.01,
            "evidenceRefs": ["personal-playbook-goal"],
        }
    color_recipes = {
        "indigo-field": ("rgba(17, 23, 43, 1.0)", "rgba(8, 12, 26, 1.0)", "fabric"),
        "aged-brass": ("rgba(154, 99, 39, 1.0)", "rgba(61, 39, 24, 1.0)", "metal"),
        "warm-gold": ("rgba(214, 160, 62, 1.0)", "rgba(105, 61, 24, 1.0)", "metal"),
        "violet-crystal": ("rgba(109, 53, 199, 1.0)", "rgba(35, 20, 82, 1.0)", "glass"),
        "teal-enamel": ("rgba(14, 131, 144, 1.0)", "rgba(7, 47, 65, 1.0)", "ceramic"),
        "obsidian-alloy": ("rgba(22, 24, 38, 1.0)", "rgba(6, 8, 16, 1.0)", "metal"),
        "earth-enamel": ("rgba(18, 79, 114, 1.0)", "rgba(7, 28, 52, 1.0)", "ceramic"),
        "cyan-emissive": ("rgba(24, 188, 239, 1.0)", "rgba(5, 59, 100, 1.0)", "glass"),
        "amber-emissive": ("rgba(255, 170, 32, 1.0)", "rgba(111, 45, 6, 1.0)", "glass"),
    }
    dominant, secondary, material_class = color_recipes[material]
    item["colorMaterialRecipe"] = {
        "dominantAlbedo": dominant,
        "secondaryAlbedo": secondary,
        "materialClass": material_class,
        "materialClassConfidence": 0.9,
        "colorGradient": {
            "type": "radial",
            "stops": [
                {"at": 0.0, "color": dominant},
                {"at": 1.0, "color": secondary},
            ],
        },
        "evidenceRefs": ["personal-playbook-goal"],
    }
    return item


assembled = "Discrete rigid part with countable closed faces, seam boundaries and real relief thickness."
relief = "Raised surface system changes the visible relief profile and therefore remains geometry, not a painted decal."
strand = "Long thin connector follows an explicit socket-to-socket path and requires tube topology rather than a box."
sculpt = "Continuously varying closed volume is described by a revolved or swept profile rather than a primitive box stack."
shell = "Thin curved shell follows the implied Earth/orbit body while retaining a closed rim and shallow depth."

components = [
    component("root", "Personal Playbook relief root", "macro", "root", "box", "assembled-solid", assembled, None, "indigo-field", [0, 0, 0], [1, 1, 1], [("page-bound-relief", "Whole presentation relief is registered to the left page and excludes DOM content.")], importance=1.0),
    component("relief-frame", "Double gilt relief frame", "macro", "static-frame", "extrude", "assembled-solid", assembled, "root", "aged-brass", [0, 0, 0.02], [7.4, 9.0, 0.22], [("relief-frame-bevel", "Double raised chamfer and reinforced corner blocks define the contact frame."), ("bezel-rivet-system", "Restrained frame and bezel rivets share one repeated attachment grammar.")], importance=1.0),
    component("rocket-assembly", "Central rocket assembly", "macro", "completion-ceremony-owner", "lathe", "continuous-sculpt", sculpt, "root", "warm-gold", [0.15, 0.4, 0.42], [1.75, 4.35, 0.75], [("rocket-singleton", "Exactly one central rocket dominates the relief without duplicating the system modules."), ("rocket-collar-seams", "Three raised hull and engine collar seams wrap the rocket body.")], importance=1.0, animation={"translate": True, "scale": True, "materialState": True}),
    component("flight-systems", "Seven flight-system cluster", "macro", "system-cluster", "torus", "assembled-solid", assembled, "root", "aged-brass", [0, 0.4, 0.2], [6.1, 6.2, 0.42], [("exact-seven-systems", "Exactly seven separately countable system bezels surround the rocket."), ("connector-collar-system", "Seven connector collars visibly ground the module-to-rocket harness.")], importance=1.0),
    component("horizon-assembly", "Earth and orbit horizon", "macro", "ambient-depth-owner", "lathe", "conforming-shell", shell, "root", "earth-enamel", [0, -2.8, 0.1], [5.8, 2.3, 0.28], [("earth-limb-emissive", "One blue emissive limb separates Earth from the indigo field."), ("orbit-horizon-rim", "One continuous raised horizon rim stays behind the rocket and lower modules.")], importance=0.92, animation={"materialState": True}),
    component("launch-window-assembly", "Seven-cell launch-window assembly", "macro", "progress-presentation-owner", "extrude", "assembled-solid", assembled, "root", "aged-brass", [0, -3.85, 0.28], [5.6, 0.7, 0.24], [("launch-window-cell-system", "One separate lower arc contains exactly seven amber launch cells."), ("launch-window-boundary", "The arc remains subordinate and cannot read as an eighth flight module.")], importance=0.96, animation={"materialState": True}),
    component("contact-field", "Indigo leather contact field", "meso", "surface-field", "extrude", "assembled-solid", assembled, "relief-frame", "indigo-field", [0, 0, 0.01], [7.0, 8.6, 0.12], [("leather-field-contact", "Recessed indigo field holds every raised system flush to the page.")]),
    component("rocket-nose", "Rocket nose cone", "meso", "rocket-part", "lathe", "continuous-sculpt", sculpt, "rocket-assembly", "warm-gold", [0.15, 2.05, 0.42], [0.78, 1.25, 0.62], [("nose-stepped-bevel", "Revolved nose has stepped collars and a blunt readable tip.")]),
    component("rocket-hull", "Rocket hull", "meso", "rocket-part", "lathe", "continuous-sculpt", sculpt, "rocket-assembly", "warm-gold", [0.15, 0.55, 0.42], [1.05, 2.3, 0.68], [("rocket-collar-seams", "Raised circumferential seams break the hull into readable sections.")]),
    component("rocket-core", "Violet rocket power core", "meso", "rocket-core", "capsule", "assembled-solid", assembled, "rocket-assembly", "violet-crystal", [0.15, 0.75, 0.79], [0.5, 1.35, 0.24], [("rocket-core-emissive", "Faceted violet core sits inside a gilt inset instead of on the hull surface.")], animation={"scale": True, "materialState": True}),
    component("rocket-fin-left", "Rocket left fin", "meso", "rocket-part", "extrude", "assembled-solid", assembled, "rocket-assembly", "warm-gold", [-0.58, -0.7, 0.4], [0.8, 1.3, 0.3], [("fin-chamfer-left", "Left swept fin is a closed tapered solid with a sharp outer silhouette.")]),
    component("rocket-fin-right", "Rocket right fin", "meso", "rocket-part", "extrude", "assembled-solid", assembled, "rocket-assembly", "warm-gold", [0.88, -0.7, 0.4], [0.8, 1.3, 0.3], [("fin-chamfer-right", "Right swept fin mirrors the left around the rocket axis.")]),
    component("engine-collar", "Rocket engine collar", "meso", "rocket-engine", "cylinder", "assembled-solid", assembled, "rocket-assembly", "obsidian-alloy", [0.15, -1.02, 0.48], [0.8, 0.45, 0.55], [("engine-collar-bands", "Stacked dark-and-gilt engine bands retain real radial depth.")]),
    component("exhaust-crystal", "Rocket exhaust crystal", "meso", "completion-emitter", "sphere", "continuous-sculpt", sculpt, "rocket-assembly", "violet-crystal", [0.15, -1.42, 0.58], [0.55, 0.55, 0.48], [("exhaust-facets", "One violet faceted exhaust crystal anchors completion light and particles.")], animation={"scale": True, "materialState": True}),
]


modules = [
    ("ignition", "Ignition coil and dome", [-1.55, 2.45, 0.42], "violet-crystal", "ignition-dome", "ignition-dome-gloss"),
    ("momentum", "Momentum star", [2.25, 2.45, 0.42], "warm-gold", "momentum-star", "momentum-star-bevel"),
    ("minimum-power", "Minimum power crescent cell", [2.65, 0.65, 0.42], "teal-enamel", "minimum-crescent", "minimum-cell-divider"),
    ("warning-radar", "Warning radar dial", [2.4, -1.45, 0.42], "earth-enamel", "warning-radar-grid", "warning-radar-grid"),
    ("environment-shield", "Environment shield", [0.15, -2.6, 0.42], "teal-enamel", "shield-hex-array", "shield-hex-cells"),
    ("recovery-route", "Recovery route twin loop", [-2.1, -1.45, 0.42], "aged-brass", "recovery-route-tubes", "recovery-route-ridges"),
    ("weekly-navigation", "Weekly navigation sextant", [-2.5, 0.55, 0.42], "warm-gold", "navigation-sextant", "navigation-sextant-ticks"),
]

for module_id, module_name, position, emblem_material, emblem_id, local_feature in modules:
    module_component_id = f"module-{module_id}"
    components.append(
        component(
            module_component_id,
            f"{module_name} bezel",
            "meso",
            "system-module",
            "cylinder",
            "assembled-solid",
            assembled,
            "flight-systems",
            "aged-brass",
            position,
            [1.35, 1.35, 0.42],
            [(f"{module_id}-bezel", f"Independent raised bezel and socket identify the {module_name.lower()} system.")],
            importance=0.96,
            animation={"scale": True, "materialState": True},
        )
    )
    components.append(
        component(
            emblem_id,
            f"{module_name} emblem",
            "meso",
            "system-emblem",
            "extrude" if module_id not in {"ignition", "warning-radar"} else "cylinder",
            "surface-relief",
            relief,
            module_component_id,
            emblem_material,
            [position[0], position[1], position[2] + 0.25],
            [0.9, 0.9, 0.18],
            [(local_feature, f"Identity geometry for {module_name.lower()} remains distinct from every other system.")],
            importance=0.96,
            animation={"rotate": module_id in {"momentum", "warning-radar"}, "materialState": True},
        )
    )

components.extend(
    [
        component("connector-harness", "Seven connector tube harness", "meso", "connector-network", "tube", "fiber-strand", strand, "flight-systems", "aged-brass", [0, 0.25, 0.32], [5.1, 5.0, 0.22], [("connector-continuity", "Seven curved tube paths run from system sockets into rocket collars without gaps.")], importance=0.98),
        component("connector-collars", "Seven connector socket collars", "micro", "surface-hardware", "cylinder", "surface-relief", relief, "connector-harness", "warm-gold", [0, 0.25, 0.5], [4.8, 4.7, 0.18], [("connector-collar-system", "Exactly seven paired collar endpoints overlap their parent tubes and module bezels.")], importance=0.98),
        component("earth-horizon", "Earth hemisphere relief", "meso", "ambient-shell", "lathe", "conforming-shell", shell, "horizon-assembly", "earth-enamel", [0, -2.9, 0.16], [5.7, 2.2, 0.3], [("earth-continent-relief", "Muted continent relief and ocean roughness remain subordinate to the blue limb.")]),
        component("orbit-rail", "Blue orbit limb rail", "meso", "ambient-emitter", "tube", "fiber-strand", strand, "horizon-assembly", "cyan-emissive", [0, -2.5, 0.36], [5.9, 0.35, 0.18], [("earth-limb-emissive", "Single cyan arc traces the Earth limb behind the rocket.")], animation={"materialState": True}),
        component("launch-window-arc", "Gilt launch-window arc", "meso", "progress-frame", "extrude", "assembled-solid", assembled, "launch-window-assembly", "aged-brass", [0, -3.83, 0.34], [5.5, 0.66, 0.2], [("launch-window-arc-bevel", "Curved segmented frame establishes one separate launch-window instrument.")]),
        component("launch-window-cells", "Seven amber launch cells", "micro", "progress-cells", "box", "surface-relief", relief, "launch-window-assembly", "amber-emissive", [0, -3.82, 0.52], [5.1, 0.38, 0.14], [("launch-window-cell-system", "Exactly seven inset amber cells animate visually but own no canonical progress value.")], animation={"materialState": True}),
        component("frame-fasteners", "Frame corner and rail fasteners", "micro", "surface-hardware", "sphere", "surface-relief", relief, "relief-frame", "warm-gold", [0, 0, 0.25], [7.0, 8.6, 0.12], [("bezel-rivet-system", "Instanced fasteners ground the frame and module hardware.")]),
        component("warning-radar-lines", "Warning radar rings and spokes", "micro", "surface-relief", "tube", "surface-relief", relief, "module-warning-radar", "warm-gold", [2.4, -1.45, 0.7], [0.9, 0.9, 0.08], [("warning-radar-grid", "Concentric rings and radial spokes make the warning dial legible at phone scale.")]),
        component("shield-hex-cells", "Shield hex cell relief", "micro", "surface-relief", "extrude", "surface-relief", relief, "module-environment-shield", "cyan-emissive", [0.15, -2.6, 0.72], [0.85, 0.8, 0.12], [("shield-hex-cells", "Seven cyan hex cells form one shield emblem, not seven system modules.")]),
        component("navigation-ticks", "Navigation sextant tick array", "micro", "surface-relief", "box", "surface-relief", relief, "module-weekly-navigation", "warm-gold", [-2.5, 0.55, 0.7], [1.0, 0.7, 0.08], [("navigation-sextant-ticks", "Repeated arc ticks and two sight arms define the weekly navigation instrument.")]),
        component("recovery-ridges", "Recovery route twin raised loops", "micro", "surface-relief", "tube", "fiber-strand", strand, "module-recovery-route", "aged-brass", [-2.1, -1.45, 0.72], [0.95, 0.65, 0.12], [("recovery-route-ridges", "Two touching continuous tubes form a single infinity-route emblem.")]),
    ]
)


material_sources = {
    "indigo-field": ("indigo-field", "Indigo leather field", "#11172B"),
    "aged-brass": ("aged-brass", "Aged brass structure", "#9A6327"),
    "warm-gold": ("gold-primary", "Warm polished gold", "#D6A03E"),
    "violet-crystal": ("violet-crystal", "Violet crystal and enamel", "#6D35C7"),
    "teal-enamel": ("teal-enamel", "Teal clear-coated enamel", "#0E8390"),
    "obsidian-alloy": ("vault-charcoal", "Obsidian rocket alloy", "#161826"),
    "earth-enamel": ("teal-enamel", "Earth ocean enamel", "#124F72"),
    "cyan-emissive": ("flame-amber", "Cyan orbit emission", "#18BCEF"),
    "amber-emissive": ("flame-amber", "Amber launch emission", "#FFAA20"),
}
quest_materials = {item["id"]: item for item in quest["materials"]}
materials = []
for new_id, (source_id, name, color) in material_sources.items():
    material = copy.deepcopy(quest_materials[source_id])
    material["id"] = new_id
    material["name"] = name
    material["baseColor"] = color
    material["color"] = color
    material["albedo"]["dominant"] = color
    material["textureResolution"] = 1024
    material["notes"] = "Reference-derived procedural relief material; all PBR channels remain independent."
    material.pop("referencePbr", None)
    material.pop("materialEvidence", None)
    material.pop("textureAnalysis", None)
    material["localOverrides"] = []
    if new_id == "indigo-field":
        material["localOverrides"].append({"id": "leather-grain", "region": "page contact field", "roughness": 0.78, "normalStrength": 0.34, "evidenceRefs": ["personal-playbook-goal"]})
    if new_id == "aged-brass":
        material["localOverrides"].append({"id": "brass-patina", "region": "bezel cavities and connector collars", "roughness": 0.62, "patinaColor": "#3E2A22", "evidenceRefs": ["personal-playbook-goal"]})
    if new_id == "violet-crystal":
        material["localOverrides"].extend([
            {"id": "ignition-dome-gloss", "region": "ignition glass dome", "roughness": 0.12, "clearcoat": 0.82, "evidenceRefs": ["personal-playbook-goal"]},
            {"id": "rocket-core-emissive", "region": "rocket core and exhaust", "roughness": 0.16, "emissive": "#6D35C7", "evidenceRefs": ["personal-playbook-goal"]},
        ])
    if new_id == "cyan-emissive":
        material["localOverrides"].append({"id": "earth-limb-emissive", "region": "single Earth orbit limb", "roughness": 0.2, "emissive": "#18BCEF", "evidenceRefs": ["personal-playbook-goal"]})
    materials.append(material)


repetitions = [
    {"id": "frame-fastener-layout", "parent": "relief-frame", "realization": "instanced-geometry", "buildsGeometry": True, "geometry": "corner and rail hemisphere fasteners", "instances": 12, "acceptance": "frame reads grounded without decorative clutter", "evidenceRefs": ["personal-playbook-goal"]},
    {"id": "module-bezel-rivet-layout", "parent": "flight-systems", "realization": "instanced-geometry", "buildsGeometry": True, "geometry": "four small rivets on each of seven module bezels", "instances": 28, "acceptance": "seven repeated bezel families remain countable", "evidenceRefs": ["personal-playbook-goal"]},
    {"id": "connector-collar-layout", "parent": "connector-harness", "realization": "instanced-geometry", "buildsGeometry": True, "geometry": "seven attached socket collar pairs", "instances": 14, "acceptance": "no connector root floats or terminates in air", "evidenceRefs": ["personal-playbook-goal"]},
    {"id": "radar-ring-spoke-layout", "parent": "warning-radar-lines", "realization": "instanced-geometry", "buildsGeometry": True, "geometry": "four concentric rings plus eight radial spokes", "instances": 12, "acceptance": "radar grammar remains readable without moire", "evidenceRefs": ["personal-playbook-goal"]},
    {"id": "shield-hex-layout", "parent": "shield-hex-cells", "realization": "instanced-geometry", "buildsGeometry": True, "geometry": "one centre plus six surrounding bevelled hex cells", "instances": 7, "acceptance": "one shield emblem with exactly seven cells", "evidenceRefs": ["personal-playbook-goal"]},
    {"id": "navigation-tick-layout", "parent": "navigation-ticks", "realization": "instanced-geometry", "buildsGeometry": True, "geometry": "nine arc ticks around the sextant", "instances": 9, "acceptance": "ticks follow the navigation arc and do not detach", "evidenceRefs": ["personal-playbook-goal"]},
    {"id": "launch-window-cell-layout", "parent": "launch-window-cells", "realization": "instanced-geometry", "buildsGeometry": True, "geometry": "seven inset amber cells on one curved rail", "instances": 7, "acceptance": "exactly seven cells, visually distinct from the seven modules", "evidenceRefs": ["personal-playbook-goal"]},
]


spec = copy.deepcopy(quest)
spec.update(
    {
        "targetName": personal["targetName"],
        "targetId": personal["targetId"],
        "sourceImage": str(REFERENCE),
        "referenceCamera": personal["referenceCamera"],
        "suitability": "conditional",
        "scores": {
            "object_isolation": 3,
            "silhouette_readability": 3,
            "depth_inference": 2,
            "primitive_decomposition": 3,
            "material_procedurality": 3,
            "occlusion_risk": 2,
            "interaction_fit": 3,
        },
        "preSpecAssessment": personal["preSpecAssessment"],
        "qualityContract": personal["qualityContract"],
        "qualityTargets": {
            **personal["qualityTargets"],
            "fpsTarget": 50,
            "reviewViewpoints": ["fixed-high", "fixed-low", "map-stripped", "orbit-left", "orbit-right", "neutral", "grazing", "reference-match"],
        },
        "componentTree": components,
        "materials": materials,
        "repetitionSystems": repetitions,
        "featureReviewTargets": [
            {"id": "exact-seven-flight-systems", "name": "Exactly seven separately readable flight-system modules", "tier": "critical", "passIds": ["blockout", "structural-pass", "form-refinement"], "minimumScore": 0.96, "mustPass": True, "componentRefs": [f"module-{m[0]}" for m in modules], "evidenceRefs": ["personal-playbook-goal"]},
            {"id": "single-rocket-hierarchy", "name": "One central rocket with nose, hull, core, fins, engine and exhaust", "tier": "critical", "passIds": ["blockout", "structural-pass", "interaction-pass"], "minimumScore": 0.9, "mustPass": True, "componentRefs": ["rocket-nose", "rocket-hull", "rocket-core", "rocket-fin-left", "rocket-fin-right", "engine-collar", "exhaust-crystal"], "evidenceRefs": ["personal-playbook-goal"]},
            {"id": "connector-attachment-integrity", "name": "Seven connector paths and collars remain physically attached", "tier": "critical", "passIds": ["structural-pass", "form-refinement"], "minimumScore": 0.9, "mustPass": True, "componentRefs": ["connector-harness", "connector-collars"], "evidenceRefs": ["personal-playbook-goal"]},
            {"id": "earth-horizon-depth", "name": "One Earth/orbit horizon remains behind the rocket", "tier": "critical", "passIds": ["blockout", "lighting-pass"], "minimumScore": 0.86, "mustPass": True, "componentRefs": ["earth-horizon", "orbit-rail"], "evidenceRefs": ["personal-playbook-goal"]},
            {"id": "separate-seven-cell-launch-arc", "name": "Exactly seven launch cells remain subordinate to the modules", "tier": "critical", "passIds": ["blockout", "form-refinement", "material-pass"], "minimumScore": 0.94, "mustPass": True, "componentRefs": ["launch-window-arc", "launch-window-cells"], "evidenceRefs": ["personal-playbook-goal"]},
            {"id": "independent-material-response", "name": "Leather, brass, gold, violet, teal, alloy, Earth and emissive responses stay separated", "tier": "important", "passIds": ["material-pass", "surface-pass", "lighting-pass"], "minimumScore": 0.8, "mustPass": False, "componentRefs": ["contact-field", "relief-frame", "rocket-core", "earth-horizon", "launch-window-cells"], "evidenceRefs": ["personal-playbook-goal"]},
        ],
        "lightingFromPhoto": [
            "Key light: warm 3800K broad source from upper-left/front-left, intensity 2.1, soft shadow radius tuned for page relief.",
            "Fill light: cool indigo hemisphere at intensity 0.48 preserves cavity detail without flattening bezel depth.",
            "Rim/environment light: restrained cyan back-right reflection separates rocket, connectors and Earth limb from the leather field.",
            "Exposure 1.02 with ACES filmic tone mapping, near-black indigo background, and soft page-contact shadow plus AO at every bezel/socket seam.",
        ],
        "performanceBudget": {
            "qualityPriority": "supported-iphone-reference-fidelity",
            "targetTriangles": 58000,
            "maxDrawCalls": 78,
            "textureSize": 1024,
            "fpsTarget": 50,
            "optimizationPolicy": "Instance repeated hardware/cells; reduce tessellation and micro rivets by quality tier while preserving the one-rocket/seven-module/seven-connector/seven-cell semantic counts.",
        },
        "viewEvidence": [
            {"id": "personal-playbook-goal", "view": "primary three-quarter", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"}, "observations": ["one central rocket", "seven circular system modules", "seven connector paths", "Earth horizon", "separate seven-cell lower arc"], "confidence": 0.97},
            {"id": "upper-systems", "view": "primary crop", "imageRegion": {"x": 0.2, "y": 0.1, "width": 0.65, "height": 0.42, "units": "normalized"}, "observations": ["ignition dome", "momentum star", "rocket nose and core", "minimum-power crescent"], "confidence": 0.96},
            {"id": "lower-systems", "view": "primary crop", "imageRegion": {"x": 0.2, "y": 0.42, "width": 0.64, "height": 0.38, "units": "normalized"}, "observations": ["recovery loops", "shield hexes", "radar grid", "Earth limb"], "confidence": 0.96},
            {"id": "launch-arc", "view": "primary crop", "imageRegion": {"x": 0.28, "y": 0.77, "width": 0.58, "height": 0.13, "units": "normalized"}, "observations": ["exactly seven amber cells in a separate curved frame"], "confidence": 0.99},
        ],
        "silhouette": {
            "boundingShape": "tall rounded-rectangle relief frame containing a radial seven-module cockpit around one vertical rocket",
            "aspectRatios": ["relief field about 0.82:1 width-to-height", "rocket about 0.39 of field height", "system bezels about 0.16 of field width"],
            "symmetry": "near bilateral composition around rocket axis with deliberate seven-node radial asymmetry",
            "dominantCurves": ["seven circular bezels", "curved connector harness", "Earth limb", "lower launch-window arc"],
            "negativeSpaces": ["leather wedges between modules", "clear separation between lower shield and launch arc", "rocket-fin cutouts"],
            "landmarks": ["ignition upper-left", "momentum upper-right", "rocket center", "Earth lower field", "seven-cell arc at base"],
        },
        "lookDevTargets": personal["lookDevTargets"],
        "localSpecSearch": personal["localSpecSearch"],
        "materialPipeline": None,
        "materialAnalysisHistory": [],
        "reviewHistory": [],
        "visualEvidence": [],
        "tier1Results": None,
        "sculptPipeline": personal["sculptPipeline"],
        "assumptions": [
            "The goal image is art direction, so hidden backs and exact depths are inferred shallow relief, not measured reconstruction.",
            "The existing Compass Book shell, page, spine, tabs and canonical right-side DOM remain outside this factory.",
            "Three.js nodes expose presentation anchors only and never own player answers, progress or Island Run state.",
        ],
        "risks": [
            "Seven modules, seven connector collars, seven shield cells and seven launch cells can visually collapse into one count unless hierarchy and scale stay distinct.",
            "Dense brass micro-detail can alias on supported iPhones; low tier must prune micro rivets without removing semantic modules.",
            "Single-image material extraction includes baked light and therefore requires neutral and grazing validation.",
        ],
        "proceduralStrategy": [
            "Build the frame, one rocket, seven system bezels, Earth horizon and separate launch arc in the first blockout.",
            "Use named groups for every module and rocket part; use instancing for repeated rivets, collars, ticks, hexes and launch cells.",
            "Use tube paths with explicit socket overlap for all connector and recovery-route geometry.",
            "Keep canonical labels and player data in DOM; drive visual state only through supplied presentation options.",
            "Extract independent PBR evidence for every important material before strict validation.",
        ],
    }
)

all_component_ids = [item["id"] for item in components]
for build_pass in spec["buildPasses"]:
    build_pass["componentRefs"] = all_component_ids

for detail in spec["preSpecAssessment"]["detailInventory"]["details"]:
    detail["realization"] = "mapped-to-authored-component-or-material"

spec["preSpecAssessment"]["sourceImage"] = str(REFERENCE)
spec["preSpecAssessment"]["unknownsToResolveBeforeImplementation"] = []

with SPEC_PATH.open("w") as handle:
    json.dump(spec, handle, indent=2)
    handle.write("\n")

print(f"AUTHORED {SPEC_PATH} components={len(components)} materials={len(materials)} repetitions={len(repetitions)}")
