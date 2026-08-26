"""Build Island 014's palace facade as a Blender-authored multipart mesh.

Run with:
  Blender --background --python scripts/blender/build-island014-palace-facade.py

The .blend/.glb files are production evidence. A compact mesh descriptor is
also exported for synchronous Three.js construction in the Island Run world
factory; the browser never depends on Blender at runtime.
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


REPO_ROOT = Path(__file__).resolve().parents[2]
BLENDER_OUT = REPO_ROOT / "work/island-visual-library/island-014-honeycomb-kingdom/blender"
RUNTIME_OUT = REPO_ROOT / "src/features/gamification/level-worlds/dev/assets/island14PalaceFacadeBlenderV1.json"
BLEND_PATH = BLENDER_OUT / "palace-front-facade-v001.blend"
GLB_PATH = BLENDER_OUT / "palace-front-facade-v001.glb"


MATERIALS = {
    "warmGold": (0.94, 0.50, 0.055, 1.0),
    "paleGold": (1.0, 0.80, 0.25, 1.0),
    "waxCream": (1.0, 0.80, 0.43, 1.0),
    "darkBronze": (0.075, 0.032, 0.012, 1.0),
    "royalPurple": (0.24, 0.035, 0.36, 1.0),
    "warmWindow": (1.0, 0.46, 0.025, 1.0),
    "honeyGlass": (1.0, 0.56, 0.02, 0.82),
}


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def create_materials() -> dict[str, bpy.types.Material]:
    result: dict[str, bpy.types.Material] = {}
    for key, rgba in MATERIALS.items():
        mat = bpy.data.materials.new(name=f"ISLAND_14_{key.upper()}")
        mat.diffuse_color = rgba
        mat.use_nodes = True
        principled = mat.node_tree.nodes.get("Principled BSDF")
        if principled:
            principled.inputs["Base Color"].default_value = rgba
            principled.inputs["Metallic"].default_value = 0.62 if key in {"warmGold", "paleGold"} else 0.08
            principled.inputs["Roughness"].default_value = 0.22 if key in {"warmGold", "paleGold", "honeyGlass"} else 0.38
        result[key] = mat
    return result


def mark_material(obj: bpy.types.Object, material_key: str, materials: dict[str, bpy.types.Material]) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(materials[material_key])
    obj["island14MaterialKey"] = material_key
    obj["island14FacadePart"] = True


def profile_prism(
    name: str,
    profile: list[tuple[float, float]],
    front_y: float,
    back_y: float,
    material_key: str,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    count = len(profile)
    vertices = [(x, front_y, z) for x, z in profile] + [(x, back_y, z) for x, z in profile]
    faces: list[list[int]] = [list(range(count)), list(range(count * 2 - 1, count - 1, -1))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append([index, nxt, count + nxt, count + index])
    mesh = bpy.data.meshes.new(f"{name}_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=False)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mark_material(obj, material_key, materials)
    return obj


def closed_ring_prism(
    name: str,
    outer: list[tuple[float, float]],
    inner: list[tuple[float, float]],
    front_y: float,
    back_y: float,
    material_key: str,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    if len(outer) != len(inner):
        raise ValueError(f"{name}: outer/inner loop lengths differ")
    count = len(outer)
    of = list(range(0, count))
    ob = list(range(count, count * 2))
    inf = list(range(count * 2, count * 3))
    inb = list(range(count * 3, count * 4))
    vertices = (
        [(x, front_y, z) for x, z in outer]
        + [(x, back_y, z) for x, z in outer]
        + [(x, front_y, z) for x, z in inner]
        + [(x, back_y, z) for x, z in inner]
    )
    faces: list[list[int]] = []
    for index in range(count):
        nxt = (index + 1) % count
        faces.extend([
            [of[index], of[nxt], inf[nxt], inf[index]],
            [ob[nxt], ob[index], inb[index], inb[nxt]],
            [of[index], ob[index], ob[nxt], of[nxt]],
            [inf[nxt], inb[nxt], inb[index], inf[index]],
        ])
    mesh = bpy.data.meshes.new(f"{name}_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=False)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mark_material(obj, material_key, materials)
    return obj


def polygon_points(radius: float, count: int, center_x: float, center_z: float, phase: float = math.pi / 2) -> list[tuple[float, float]]:
    return [
        (center_x + math.cos(phase + index * math.tau / count) * radius,
         center_z + math.sin(phase + index * math.tau / count) * radius)
        for index in range(count)
    ]


def add_box(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    material_key: str,
    materials: dict[str, bpy.types.Material],
    bevel: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mark_material(obj, material_key, materials)
    if bevel > 0:
        modifier = obj.modifiers.new(name="ISLAND_14_BEVEL", type="BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
        apply_modifier(obj, modifier)
    return obj


def add_cylinder(
    name: str,
    radius: float,
    depth: float,
    location: tuple[float, float, float],
    material_key: str,
    materials: dict[str, bpy.types.Material],
    vertices: int = 12,
    rotate_to_y: bool = False,
) -> bpy.types.Object:
    rotation = (math.pi / 2, 0.0, 0.0) if rotate_to_y else (0.0, 0.0, 0.0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    mark_material(obj, material_key, materials)
    return obj


def apply_modifier(obj: bpy.types.Object, modifier: bpy.types.Modifier) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)


def boolean_difference(shell: bpy.types.Object, cutter: bpy.types.Object) -> None:
    modifier = shell.modifiers.new(name=f"CUT_{cutter.name}", type="BOOLEAN")
    modifier.operation = "DIFFERENCE"
    modifier.solver = "EXACT"
    modifier.object = cutter
    apply_modifier(shell, modifier)
    bpy.data.objects.remove(cutter, do_unlink=True)


def join_matching(
    objects: list[bpy.types.Object],
    predicate,
    joined_name: str,
) -> list[bpy.types.Object]:
    matches = [obj for obj in objects if predicate(obj)]
    if len(matches) < 2:
        return objects
    material_keys = {obj.get("island14MaterialKey") for obj in matches}
    if len(material_keys) != 1:
        raise RuntimeError(f"Cannot join mixed material keys for {joined_name}: {material_keys}")
    nonmatches = [obj for obj in objects if obj not in matches]
    bpy.ops.object.select_all(action="DESELECT")
    active = matches[0]
    for obj in matches:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    active.name = joined_name
    active["island14MaterialKey"] = next(iter(material_keys))
    active["island14FacadePart"] = True
    return nonmatches + [active]


def add_hex_cutter(name: str, x: float, z: float, radius: float) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6,
        radius=radius,
        depth=0.74,
        location=(x, -1.29, z),
        rotation=(math.pi / 2, 0.0, 0.0),
    )
    cutter = bpy.context.object
    cutter.name = name
    return cutter


def build_facade(materials: dict[str, bpy.types.Material]) -> list[bpy.types.Object]:
    objects: list[bpy.types.Object] = []
    shell_profile = [
        (-1.27, 0.46), (1.27, 0.46), (1.27, 1.38),
        (1.10, 1.70), (0.88, 1.92), (0.72, 2.42),
        (0.0, 2.88), (-0.72, 2.42), (-0.88, 1.92),
        (-1.10, 1.70), (-1.27, 1.38),
    ]
    shell = profile_prism(
        "ISLAND_14_PALACE_FACADE_BLENDER_SHELL",
        shell_profile,
        -1.49,
        -1.09,
        "warmGold",
        materials,
    )

    door_outer = [
        (-0.59, 0.46), (0.59, 0.46), (0.59, 1.26),
        (0.43, 1.48), (0.0, 1.76), (-0.43, 1.48), (-0.59, 1.26),
    ]
    door_inner = [
        (-0.51, 0.48), (0.51, 0.48), (0.51, 1.22),
        (0.36, 1.41), (0.0, 1.65), (-0.36, 1.41), (-0.51, 1.22),
    ]
    door_cutter = profile_prism("ISLAND_14_DOOR_CUTTER", door_outer, -1.70, -0.94, "darkBronze", materials)
    boolean_difference(shell, door_cutter)

    bay_specs = [
        ("LOWER_LEFT", -0.86, 1.16, 0.29, 2),
        ("LOWER_RIGHT", 0.86, 1.16, 0.29, 2),
        ("UPPER_LEFT", -0.66, 1.72, 0.22, 3),
        ("UPPER_RIGHT", 0.66, 1.72, 0.22, 3),
    ]
    for label, x, z, radius, _stage in bay_specs:
        boolean_difference(shell, add_hex_cutter(f"ISLAND_14_{label}_CUTTER", x, z, radius))
    boolean_difference(shell, add_hex_cutter("ISLAND_14_ROSE_CUTTER", 0.0, 2.28, 0.41))

    bevel = shell.modifiers.new(name="ISLAND_14_SHELL_BEVEL", type="BEVEL")
    bevel.width = 0.035
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    apply_modifier(shell, bevel)
    objects.append(shell)

    # Deep door insert and its inner masonry liner live behind the cut shell.
    door = profile_prism(
        "ISLAND_14_PALACE_FACADE_BLENDER_ROYAL_DOOR",
        door_inner,
        -1.075,
        -1.015,
        "royalPurple",
        materials,
    )
    objects.append(door)
    door_ring = closed_ring_prism(
        "ISLAND_14_PALACE_FACADE_BLENDER_DOOR_REVEAL",
        door_outer,
        door_inner,
        -1.17,
        -1.10,
        "paleGold",
        materials,
    )
    objects.append(door_ring)
    objects.append(add_box(
        "ISLAND_14_PALACE_FACADE_BLENDER_DOOR_SEAM",
        (0.0, -1.085, 1.02),
        (0.035, 0.035, 0.82),
        "paleGold",
        materials,
        bevel=0.008,
    ))
    for side, x in (("LEFT", -0.15), ("RIGHT", 0.15)):
        objects.append(add_cylinder(
            f"ISLAND_14_PALACE_FACADE_BLENDER_DOOR_HANDLE_{side}",
            0.045,
            0.06,
            (x, -1.105, 1.01),
            "honeyGlass",
            materials,
            vertices=12,
            rotate_to_y=True,
        ))

    # Four recessed occupied cells: dark backplane, amber heart and gold liner,
    # all behind the shell face rather than attached to it.
    for label, x, z, radius, _stage in bay_specs:
        objects.append(add_cylinder(
            f"ISLAND_14_PALACE_FACADE_BLENDER_{label}_DARK_SOCKET",
            radius * 0.82,
            0.045,
            (x, -1.065, z),
            "darkBronze",
            materials,
            vertices=6,
            rotate_to_y=True,
        ))
        objects.append(add_cylinder(
            f"ISLAND_14_PALACE_FACADE_BLENDER_{label}_AMBER_CORE",
            radius * 0.48,
            0.05,
            (x, -1.095, z),
            "warmWindow",
            materials,
            vertices=6,
            rotate_to_y=True,
        ))
        objects.append(closed_ring_prism(
            f"ISLAND_14_PALACE_FACADE_BLENDER_{label}_INNER_LINER",
            polygon_points(radius * 0.84, 6, x, z),
            polygon_points(radius * 0.67, 6, x, z),
            -1.15,
            -1.105,
            "paleGold",
            materials,
        ))

    # The rose is a real cavity. Its radial structure is buried near the rear
    # plane, so obliques see recess depth instead of a forward-mounted disk.
    objects.append(add_cylinder(
        "ISLAND_14_PALACE_FACADE_BLENDER_ROSE_DARK_SOCKET",
        0.36,
        0.045,
        (0.0, -1.065, 2.28),
        "darkBronze",
        materials,
        vertices=12,
        rotate_to_y=True,
    ))
    objects.append(add_cylinder(
        "ISLAND_14_PALACE_FACADE_BLENDER_ROSE_PURPLE_CORE",
        0.30,
        0.05,
        (0.0, -1.095, 2.28),
        "royalPurple",
        materials,
        vertices=12,
        rotate_to_y=True,
    ))
    objects.append(closed_ring_prism(
        "ISLAND_14_PALACE_FACADE_BLENDER_ROSE_INNER_LINER",
        polygon_points(0.36, 12, 0.0, 2.28),
        polygon_points(0.31, 12, 0.0, 2.28),
        -1.15,
        -1.105,
        "paleGold",
        materials,
    ))
    for index in range(6):
        angle = index * math.pi / 3
        spoke = add_box(
            f"ISLAND_14_PALACE_FACADE_BLENDER_ROSE_SPOKE_{index + 1}",
            (math.cos(angle) * 0.15, -1.125, 2.28 + math.sin(angle) * 0.15),
            (0.29, 0.035, 0.035),
            "paleGold",
            materials,
            bevel=0.006,
        )
        spoke.rotation_euler[1] = -angle
        bpy.context.view_layer.objects.active = spoke
        spoke.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        spoke.select_set(False)
        objects.append(spoke)

    # Attached side buttresses are narrow and deep; they break silhouette
    # without recreating the retired giant planar wings.
    for side_name, side in (("LEFT", -1), ("RIGHT", 1)):
        buttress = add_box(
            f"ISLAND_14_PALACE_FACADE_BLENDER_{side_name}_BUTTRESS",
            (side * 1.29, -1.30, 1.25),
            (0.34, 0.46, 1.48),
            "waxCream",
            materials,
            bevel=0.055,
        )
        objects.append(buttress)
        bpy.ops.mesh.primitive_cone_add(
            vertices=6,
            radius1=0.24,
            radius2=0.09,
            depth=0.38,
            location=(side * 1.29, -1.30, 2.18),
        )
        cap = bpy.context.object
        cap.name = f"ISLAND_14_PALACE_FACADE_BLENDER_{side_name}_BUTTRESS_CAP"
        mark_material(cap, "warmGold", materials)
        objects.append(cap)
        banner = add_box(
            f"ISLAND_14_PALACE_FACADE_BLENDER_BANNER_{side_name}",
            (side * 1.08, -1.525, 1.62),
            (0.17, 0.055, 0.44),
            "royalPurple",
            materials,
            bevel=0.018,
        )
        objects.append(banner)
        objects.append(add_box(
            f"ISLAND_14_PALACE_FACADE_BLENDER_BANNER_{side_name}_ANCHOR",
            (side * 1.08, -1.53, 1.87),
            (0.27, 0.065, 0.055),
            "paleGold",
            materials,
            bevel=0.012,
        ))

    # A compact door bee sigil sits on the recessed door, not on the shell.
    objects.append(add_cylinder(
        "ISLAND_14_PALACE_FACADE_BLENDER_DOOR_BEE_BODY",
        0.07,
        0.045,
        (0.0, -1.115, 1.24),
        "paleGold",
        materials,
        vertices=12,
        rotate_to_y=True,
    ))
    for side_name, side in (("LEFT", -1), ("RIGHT", 1)):
        wing = add_box(
            f"ISLAND_14_PALACE_FACADE_BLENDER_DOOR_BEE_WING_{side_name}",
            (side * 0.085, -1.115, 1.27),
            (0.11, 0.035, 0.055),
            "paleGold",
            materials,
            bevel=0.018,
        )
        wing.rotation_euler[1] = side * 0.45
        bpy.context.view_layer.objects.active = wing
        wing.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        wing.select_set(False)
        objects.append(wing)

    return objects


def triangulated_descriptor(objects: list[bpy.types.Object]) -> dict:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    meshes = []
    total_triangles = 0
    for obj in objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
        mesh.calc_loop_triangles()
        normal_matrix = evaluated.matrix_world.to_3x3().inverted().transposed()
        positions: list[float] = []
        normals: list[float] = []
        indices: list[int] = []
        for triangle in mesh.loop_triangles:
            for vertex_index in triangle.vertices:
                world_position = evaluated.matrix_world @ mesh.vertices[vertex_index].co
                world_normal = (normal_matrix @ mesh.vertices[vertex_index].normal).normalized()
                # Blender +Z up / -Y front -> Three.js +Y up / +Z front.
                positions.extend((round(world_position.x, 6), round(world_position.z, 6), round(-world_position.y, 6)))
                normals.extend((round(world_normal.x, 6), round(world_normal.z, 6), round(-world_normal.y, 6)))
                indices.append(len(indices))
        triangle_count = len(indices) // 3
        total_triangles += triangle_count
        meshes.append({
            "name": obj.name,
            "materialKey": obj.get("island14MaterialKey", "warmGold"),
            "stage": 2 if "DOOR" in obj.name or "LOWER" in obj.name or "SHELL" in obj.name else 3,
            "positions": positions,
            "normals": normals,
            "indices": indices,
            "triangles": triangle_count,
        })
        evaluated.to_mesh_clear()
    return {
        "schemaVersion": 1,
        "generator": "Blender 5.2.0 LTS",
        "sourceScript": "scripts/blender/build-island014-palace-facade.py",
        "coordinateMap": "three(x,y,z)=blender(x,z,-y)",
        "partId": "palace-front-facade",
        "constructionFamily": "blender-boolean-recessed-honey-cathedral-facade",
        "meshCount": len(meshes),
        "triangleCount": total_triangles,
        "meshes": meshes,
    }


def main() -> None:
    BLENDER_OUT.mkdir(parents=True, exist_ok=True)
    RUNTIME_OUT.parent.mkdir(parents=True, exist_ok=True)
    clear_scene()
    bpy.context.scene.unit_settings.system = "METRIC"
    materials = create_materials()
    objects = build_facade(materials)
    join_rules = [
        (lambda obj: ("_LOWER_" in obj.name or "_UPPER_" in obj.name) and obj.name.endswith("_DARK_SOCKET"), "ISLAND_14_PALACE_FACADE_BLENDER_BAYS_DARK_SOCKETS"),
        (lambda obj: obj.name.endswith("_AMBER_CORE"), "ISLAND_14_PALACE_FACADE_BLENDER_BAYS_AMBER_CORES"),
        (lambda obj: "_ROSE_" not in obj.name and obj.name.endswith("_INNER_LINER"), "ISLAND_14_PALACE_FACADE_BLENDER_BAYS_INNER_LINERS"),
        (lambda obj: "ROSE_SPOKE_" in obj.name, "ISLAND_14_PALACE_FACADE_BLENDER_ROSE_SPOKES"),
        (lambda obj: obj.name.endswith("_BUTTRESS"), "ISLAND_14_PALACE_FACADE_BLENDER_SIDE_BUTTRESSES"),
        (lambda obj: obj.name.endswith("_BUTTRESS_CAP"), "ISLAND_14_PALACE_FACADE_BLENDER_SIDE_BUTTRESS_CAPS"),
        (lambda obj: "_BANNER_" in obj.name and not obj.name.endswith("_ANCHOR"), "ISLAND_14_PALACE_FACADE_BLENDER_BANNERS"),
        (lambda obj: "_BANNER_" in obj.name and obj.name.endswith("_ANCHOR"), "ISLAND_14_PALACE_FACADE_BLENDER_BANNER_ANCHORS"),
        (lambda obj: "DOOR_HANDLE_" in obj.name, "ISLAND_14_PALACE_FACADE_BLENDER_DOOR_HANDLES"),
        (lambda obj: "DOOR_BEE_" in obj.name, "ISLAND_14_PALACE_FACADE_BLENDER_DOOR_BEE_SIGIL"),
    ]
    for predicate, joined_name in join_rules:
        objects = join_matching(objects, predicate, joined_name)
    for obj in objects:
        if obj.type == "MESH":
            obj.data.validate(clean_customdata=False)
            obj.data.update()

    descriptor = triangulated_descriptor(objects)
    if descriptor["triangleCount"] > 20_000:
        raise RuntimeError(f"Triangle hard maximum exceeded: {descriptor['triangleCount']} > 20000")
    if descriptor["meshCount"] > 24:
        raise RuntimeError(f"Runtime mesh-part hard maximum exceeded: {descriptor['meshCount']} > 24")
    RUNTIME_OUT.write_text(json.dumps(descriptor, separators=(",", ":")) + "\n", encoding="utf-8")

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_yup=True,
    )
    print(json.dumps({
        "status": "ok",
        "blend": str(BLEND_PATH),
        "glb": str(GLB_PATH),
        "runtime": str(RUNTIME_OUT),
        "meshCount": descriptor["meshCount"],
        "triangleCount": descriptor["triangleCount"],
    }, indent=2))


if __name__ == "__main__":
    main()
