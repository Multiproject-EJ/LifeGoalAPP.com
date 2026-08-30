"""Build the seven individually authored Vault Island treasure assets."""

import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_vault_handcrafted_assets import (
    box,
    clear_scene,
    curve_tube,
    cylinder,
    export_asset,
    ico_gem,
    museum_materials,
    sphere,
    torus,
)


VERSION = "v001"
TREASURE_IDS = ("compass", "obelisk", "egg", "hourglass", "key", "medallion", "chalice")


def cone(name, location, radius_bottom, radius_top, depth, material, vertices=64, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    bevel = obj.modifiers.new("Handcrafted edge softening", "BEVEL")
    bevel.width = 0.018
    bevel.segments = 3
    obj["vaultHandcraftedAsset"] = True
    return obj


def begin(asset_id):
    clear_scene()
    mats = museum_materials()
    root = bpy.data.objects.new(f"vault-treasure-{asset_id}-handcrafted-blender-v001", None)
    bpy.context.collection.objects.link(root)
    root["treasureId"] = asset_id
    root["revealAnchor"] = "pedestal-top"
    root["museumGradeMaterials"] = True
    return mats, root


def finish_asset(asset_id, root):
    for obj in bpy.context.scene.objects:
        obj["vaultInteriorPart"] = obj.name
        if obj != root:
            obj["treasureId"] = asset_id
    export_asset(
        f"vault-treasure-{asset_id}",
        VERSION,
        root,
        production_subdir="treasures",
        production_name=f"{asset_id}.glb",
    )


def build_compass():
    mats, root = begin("compass")
    center = (0.0, 0.0, 0.68)
    torus("treasure-compass-sovereign-outer-gold-bezel", center, 0.54, 0.065, mats["gold"], rotation=(math.pi / 2, 0.0, 0.0), major_segments=96, minor_segments=16)
    torus("treasure-compass-chased-inner-gold-bezel", center, 0.43, 0.025, mats["antique_gold"], rotation=(math.pi / 2, 0.0, 0.0), major_segments=96)
    cylinder("treasure-compass-lapis-enamel-dial", (0.0, 0.035, 0.68), 0.45, 0.065, mats["lapis"], 96, rotation=(math.pi / 2, 0.0, 0.0), bevel_amount=0.012)
    for index in range(16):
        angle = index / 16 * math.pi * 2
        radius = 0.37
        material = mats["gold"] if index % 4 == 0 else mats["silver"]
        length = 0.14 if index % 4 == 0 else 0.075
        curve_tube(
            "treasure-compass-engraved-cardinal-ray",
            [(math.sin(angle) * (radius - length), -0.012, 0.68 + math.cos(angle) * (radius - length)), (math.sin(angle) * radius, -0.012, 0.68 + math.cos(angle) * radius)],
            0.014 if index % 4 == 0 else 0.008,
            material,
        )
    curve_tube("treasure-compass-ruby-north-needle", [(0.0, -0.055, 0.68), (0.0, -0.06, 1.02)], 0.038, mats["ruby"])
    curve_tube("treasure-compass-aquamarine-south-needle", [(0.0, -0.05, 0.68), (0.0, -0.055, 0.39)], 0.032, mats["cyan"])
    ico_gem("treasure-compass-central-sapphire-pivot", (0.0, -0.105, 0.68), (0.09, 0.045, 0.09), mats["sapphire"], 3)
    for angle, material in ((0, mats["ruby"]), (math.pi / 2, mats["cyan"]), (math.pi, mats["emerald"]), (math.pi * 1.5, mats["amethyst"])):
        ico_gem("treasure-compass-cardinal-jewel", (math.sin(angle) * 0.5, -0.04, 0.68 + math.cos(angle) * 0.5), (0.05, 0.035, 0.075), material, 2)
    torus("treasure-compass-royal-suspension-ring", (0.0, 0.0, 1.31), 0.16, 0.035, mats["gold"], rotation=(math.pi / 2, 0.0, 0.0), major_segments=48)
    finish_asset("compass", root)


def build_obelisk():
    mats, root = begin("obelisk")
    cylinder("treasure-obelisk-octagonal-gold-foot", (0.0, 0.0, 0.12), 0.42, 0.24, mats["gold"], 8, bevel_amount=0.03)
    cylinder("treasure-obelisk-lapis-stepped-base", (0.0, 0.0, 0.3), 0.34, 0.18, mats["lapis"], 8, bevel_amount=0.025)
    cone("treasure-obelisk-faceted-aquamarine-monolith", (0.0, 0.0, 0.95), 0.27, 0.19, 1.18, mats["cyan"], 8)
    cone("treasure-obelisk-diamond-pyramidion", (0.0, 0.0, 1.72), 0.23, 0.0, 0.42, mats["pearl"], 4, rotation=(0.0, 0.0, math.pi / 4))
    for corner in range(4):
        angle = corner / 4 * math.pi * 2 + math.pi / 4
        curve_tube(
            "treasure-obelisk-gold-corner-armature",
            [(math.cos(angle) * 0.24, math.sin(angle) * 0.24, 0.38), (math.cos(angle) * 0.2, math.sin(angle) * 0.2, 1.54)],
            0.026,
            mats["gold"],
        )
    for level, material in ((0.52, mats["ruby"]), (0.9, mats["emerald"]), (1.28, mats["amethyst"])):
        torus("treasure-obelisk-gem-set-gold-register", (0.0, 0.0, level), 0.235 - level * 0.025, 0.022, mats["gold"], major_segments=48)
        ico_gem("treasure-obelisk-register-jewel", (0.0, -0.25 + level * 0.025, level), (0.07, 0.04, 0.09), material, 2)
    ico_gem("treasure-obelisk-crowning-amethyst", (0.0, 0.0, 1.98), (0.095, 0.095, 0.14), mats["amethyst"], 3)
    finish_asset("obelisk", root)


def build_egg():
    mats, root = begin("egg")
    cylinder("treasure-egg-chased-gold-foot", (0.0, 0.0, 0.12), 0.36, 0.24, mats["antique_gold"], 32, bevel_amount=0.028)
    torus("treasure-egg-solid-gold-foot-rim", (0.0, 0.0, 0.25), 0.35, 0.04, mats["gold"], major_segments=72)
    sphere("treasure-egg-faberge-lapis-enamel-body", (0.0, 0.0, 0.83), (0.46, 0.38, 0.61), mats["lapis"], 72, 48)
    for level, radius in ((0.48, 0.39), (0.82, 0.46), (1.16, 0.35)):
        torus("treasure-egg-horizontal-solid-gold-filigree-band", (0.0, 0.0, level), radius, 0.026, mats["gold"], major_segments=72)
    for meridian in range(8):
        phi = meridian / 8 * math.pi * 2
        points = []
        for step in range(13):
            theta = -math.pi / 2 + step / 12 * math.pi
            radial = 0.46 * math.cos(theta)
            points.append((math.sin(phi) * radial, math.cos(phi) * radial * 0.82, 0.83 + math.sin(theta) * 0.61))
        curve_tube("treasure-egg-longitude-gold-filigree", points, 0.018, mats["gold"])
    for jewel_index in range(12):
        angle = jewel_index / 12 * math.pi * 2
        material = (mats["ruby"], mats["cyan"], mats["emerald"], mats["amethyst"])[jewel_index % 4]
        ico_gem("treasure-egg-equatorial-cabochon", (math.sin(angle) * 0.47, math.cos(angle) * 0.39, 0.82), (0.05, 0.035, 0.07), material, 2)
    ico_gem("treasure-egg-crowning-diamond", (0.0, 0.0, 1.5), (0.1, 0.1, 0.15), mats["pearl"], 3)
    finish_asset("egg", root)


def build_hourglass():
    mats, root = begin("hourglass")
    for z, radius in ((0.14, 0.48), (1.42, 0.48)):
        cylinder("treasure-hourglass-octagonal-gold-plate", (0.0, 0.0, z), radius, 0.18, mats["gold"], 8, bevel_amount=0.03)
        torus("treasure-hourglass-lapis-plate-inlay", (0.0, 0.0, z + (0.1 if z < 1 else -0.1)), 0.34, 0.04, mats["lapis"], major_segments=64)
    for post_index in range(4):
        angle = post_index / 4 * math.pi * 2 + math.pi / 4
        x, y = math.cos(angle) * 0.38, math.sin(angle) * 0.38
        cylinder("treasure-hourglass-fluted-solid-gold-column", (x, y, 0.78), 0.045, 1.18, mats["gold"], 20, bevel_amount=0.012)
        ico_gem("treasure-hourglass-column-set-jewel", (x, y, 0.78), (0.065, 0.065, 0.085), (mats["ruby"], mats["cyan"])[post_index % 2], 2)
    cone("treasure-hourglass-upper-crystal-bulb", (0.0, 0.0, 0.99), 0.25, 0.07, 0.55, mats["glass"], 64)
    cone("treasure-hourglass-lower-crystal-bulb", (0.0, 0.0, 0.57), 0.07, 0.25, 0.55, mats["glass"], 64)
    cone("treasure-hourglass-upper-ruby-sand", (0.0, -0.015, 0.98), 0.19, 0.025, 0.34, mats["ruby"], 48)
    cone("treasure-hourglass-lower-gold-sand", (0.0, -0.015, 0.48), 0.18, 0.02, 0.25, mats["gold"], 48)
    curve_tube("treasure-hourglass-falling-gold-sand", [(0.0, -0.02, 0.82), (0.0, -0.02, 0.69)], 0.018, mats["gold"])
    finish_asset("hourglass", root)


def build_key():
    mats, root = begin("key")
    torus("treasure-key-crown-bow-outer-gold-ring", (0.0, 0.0, 1.22), 0.34, 0.055, mats["gold"], rotation=(math.pi / 2, 0.0, 0.0), major_segments=72)
    torus("treasure-key-crown-bow-lapis-inlay", (0.0, -0.015, 1.22), 0.24, 0.035, mats["lapis"], rotation=(math.pi / 2, 0.0, 0.0), major_segments=64)
    for fleur_index in range(5):
        x = (fleur_index - 2) * 0.14
        height = 1.62 if fleur_index == 2 else 1.52 if fleur_index % 2 == 1 else 1.44
        curve_tube("treasure-key-crown-bow-gold-fleur", [(x * 0.75, -0.02, 1.38), (x, -0.02, height)], 0.03, mats["gold"])
        ico_gem("treasure-key-crown-bow-fleur-jewel", (x, -0.035, height), (0.05, 0.035, 0.07), (mats["ruby"], mats["cyan"], mats["amethyst"])[fleur_index % 3], 2)
    cylinder("treasure-key-substantial-gold-shaft", (0.0, 0.0, 0.62), 0.065, 0.94, mats["gold"], 24, bevel_amount=0.018)
    torus("treasure-key-shaft-chased-collar", (0.0, 0.0, 0.86), 0.11, 0.028, mats["antique_gold"], major_segments=40)
    box("treasure-key-royal-bit-main", (0.18, 0.0, 0.16), (0.46, 0.13, 0.16), mats["gold"], bevel_amount=0.025)
    box("treasure-key-royal-bit-upper-tooth", (0.31, 0.0, 0.31), (0.18, 0.13, 0.18), mats["gold"], bevel_amount=0.02)
    box("treasure-key-royal-bit-lower-tooth", (0.38, 0.0, 0.05), (0.18, 0.13, 0.13), mats["antique_gold"], bevel_amount=0.018)
    ico_gem("treasure-key-heart-amethyst", (0.0, -0.08, 1.22), (0.12, 0.055, 0.16), mats["amethyst"], 3)
    finish_asset("key", root)


def build_medallion():
    mats, root = begin("medallion")
    cylinder("treasure-medallion-solid-gold-sun-disc", (0.0, 0.03, 0.74), 0.5, 0.1, mats["gold"], 96, rotation=(math.pi / 2, 0.0, 0.0), bevel_amount=0.022)
    cylinder("treasure-medallion-lapis-enamel-face", (0.0, -0.035, 0.74), 0.42, 0.035, mats["lapis"], 96, rotation=(math.pi / 2, 0.0, 0.0), bevel_amount=0.01)
    torus("treasure-medallion-chased-gold-rim", (0.0, -0.045, 0.74), 0.47, 0.045, mats["gold"], rotation=(math.pi / 2, 0.0, 0.0), major_segments=96)
    for ray_index in range(16):
        angle = ray_index / 16 * math.pi * 2
        curve_tube("treasure-medallion-radiant-gold-sun-ray", [(math.sin(angle) * 0.16, -0.08, 0.74 + math.cos(angle) * 0.16), (math.sin(angle) * 0.36, -0.08, 0.74 + math.cos(angle) * 0.36)], 0.018 if ray_index % 2 == 0 else 0.011, mats["gold"])
    ico_gem("treasure-medallion-central-sovereign-ruby", (0.0, -0.12, 0.74), (0.16, 0.055, 0.2), mats["ruby"], 3)
    for jewel_index in range(8):
        angle = jewel_index / 8 * math.pi * 2
        ico_gem("treasure-medallion-orbit-jewel", (math.sin(angle) * 0.43, -0.09, 0.74 + math.cos(angle) * 0.43), (0.047, 0.032, 0.062), (mats["cyan"], mats["emerald"], mats["amethyst"], mats["pearl"])[jewel_index % 4], 2)
    torus("treasure-medallion-royal-chain-loop", (0.0, 0.0, 1.36), 0.16, 0.032, mats["gold"], rotation=(math.pi / 2, 0.0, 0.0), major_segments=48)
    finish_asset("medallion", root)


def build_chalice():
    mats, root = begin("chalice")
    cylinder("treasure-chalice-octagonal-solid-gold-foot", (0.0, 0.0, 0.12), 0.43, 0.22, mats["gold"], 8, bevel_amount=0.03)
    torus("treasure-chalice-lapis-foot-inlay", (0.0, 0.0, 0.24), 0.34, 0.04, mats["lapis"], major_segments=64)
    cylinder("treasure-chalice-jeweled-gold-stem", (0.0, 0.0, 0.56), 0.09, 0.66, mats["gold"], 24, bevel_amount=0.018)
    ico_gem("treasure-chalice-stem-amethyst-node", (0.0, 0.0, 0.6), (0.16, 0.16, 0.2), mats["amethyst"], 3)
    cone("treasure-chalice-lapis-enamel-cup", (0.0, 0.0, 1.02), 0.24, 0.47, 0.62, mats["lapis"], 72)
    torus("treasure-chalice-substantial-solid-gold-rim", (0.0, 0.0, 1.34), 0.47, 0.055, mats["gold"], major_segments=96, minor_segments=16)
    torus("treasure-chalice-inner-silver-lip", (0.0, 0.0, 1.35), 0.4, 0.022, mats["silver"], major_segments=80)
    for side in (-1, 1):
        curve_tube("treasure-chalice-royal-scroll-handle", [(side * 0.34, 0.0, 1.18), (side * 0.68, 0.0, 1.08), (side * 0.7, 0.0, 0.72), (side * 0.3, 0.0, 0.8)], 0.055, mats["gold"])
        ico_gem("treasure-chalice-handle-terminal-ruby", (side * 0.67, -0.035, 0.92), (0.07, 0.045, 0.1), mats["ruby"] if side < 0 else mats["cyan"], 2)
    for jewel_index in range(12):
        angle = jewel_index / 12 * math.pi * 2
        ico_gem("treasure-chalice-rim-set-jewel", (math.sin(angle) * 0.48, math.cos(angle) * 0.48, 1.34), (0.045, 0.035, 0.06), (mats["ruby"], mats["cyan"], mats["emerald"], mats["pearl"])[jewel_index % 4], 2)
    finish_asset("chalice", root)


BUILDERS = {
    "compass": build_compass,
    "obelisk": build_obelisk,
    "egg": build_egg,
    "hourglass": build_hourglass,
    "key": build_key,
    "medallion": build_medallion,
    "chalice": build_chalice,
}


def main():
    requested = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv and len(sys.argv) > sys.argv.index("--") + 1 else "all"
    targets = TREASURE_IDS if requested == "all" else (requested,)
    for target in targets:
        if target not in BUILDERS:
            raise ValueError(f"Unknown Vault treasure target: {target}")
        BUILDERS[target]()


if __name__ == "__main__":
    main()
