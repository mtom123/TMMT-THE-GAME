"""
TMMT — Blender Export Script (Pipeline Stage 4)
=================================================

Run inside Blender 4.2+ to:
  1. Validate mesh naming against AtelierLoader.js convention
  2. Apply all modifiers (decimate / mirror / subdivision)
  3. Shade smooth + recalculate normals
  4. Export .glb with EXT_meshopt_compression (< 2 MB target)

USAGE (Blender GUI):
  - Open your .blend file
  - File > Export > glTF 2.0 (.glb)
  - On the right panel, check "Apply Modifiers", "UVs", "Normals", "Tangents"
  - In Compression, select "Meshopt"
  - Click Export

USAGE (CLI / headless):
  blender --background input.blend --python blender_export.py -- --out output.glb

USAGE (Script editor inside Blender):
  Open this file in the Scripting workspace and click Run Script.
  A dialog appears to choose output path. Then it exports automatically.

NAMING CONVENTION (must match AtelierLoader.js):
  mesh_nylon_*    → Padded nylon shader
  mesh_denim_*    → Washed denim shader
  mesh_laser_*    → Laser-engraved cotton shader
  mesh_fur_*      → Eco-fur (Fur Shells, MUST be smooth-shaded)
  mesh_skin_*     → Mannequin body (PBR preserved)
  mesh_other_*    → Accessories (PBR preserved)

Any mesh NOT matching these prefixes will be SKIPPED at export with a warning.
"""

import bpy
import sys
import os
import re
import argparse
from pathlib import Path

# ----------------------------------------------------------------
# CONFIG
# ----------------------------------------------------------------

VALID_PREFIXES = ('mesh_nylon_', 'mesh_denim_', 'mesh_laser_', 'mesh_fur_', 'mesh_skin_', 'mesh_other_')
FUR_PREFIX = 'mesh_fur_'
MAX_EXPORT_SIZE_MB = 2.0  # warn if exceeded

# GLB export settings (Blender 4.2+ uses glTF 2.0 exporter)
EXPORT_SETTINGS = {
    'export_format': 'GLB',
    'use_selection': False,
    'export_apply': True,           # Apply modifiers on export
    'export_uv': True,
    'export_normals': True,
    'export_tangents': True,
    'export_materials': 'EXPORT',    # Keep PBR materials for skin/other
    'export_colors': False,
    'export_cameras': False,
    'export_lights': False,
    'export_yup': True,
    'export_skins': True,           # For skinned meshes if any
    'export_morph': False,
    'export_attributes': False,
    'export_mesh_extension': True,  # Enable EXT_meshopt_compression
    'export_image_format': 'AUTO',
}


# ----------------------------------------------------------------
# VALIDATION
# ----------------------------------------------------------------

def validate_naming():
    """
    Walk the scene and verify every MESH object has a name starting
    with one of the valid prefixes. Returns list of warnings.
    """
    warnings = []
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue
        name = obj.name
        if not name.startswith(VALID_PREFIXES):
            warnings.append(f"  ⚠ MESH '{name}' does not match naming convention. It will be SKIPPED by AtelierLoader.")
    return warnings


def get_material_type(mesh_name):
    """Return the material type from mesh name (e.g. 'nylon' from 'mesh_nylon_xxx')."""
    m = re.match(r'^mesh_([a-zA-Z0-9]+)_', mesh_name)
    return m.group(1) if m else None


# ----------------------------------------------------------------
# PREP — modifier apply + shade smooth + normal recalc
# ----------------------------------------------------------------

def prepare_meshes():
    """
    For every mesh in the scene:
      - Apply all modifiers (Decimate, Mirror, Subdivision, etc.)
      - Shade smooth
      - Recalculate normals (face outside)
    """
    print("\n=== PREPARING MESHES ===")
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue

        # Make it the active object
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

        # Apply all modifiers
        if obj.modifiers:
            print(f"  → Applying {len(obj.modifiers)} modifier(s) on '{obj.name}'")
            for mod in list(obj.modifiers):
                try:
                    bpy.ops.object.modifier_apply(modifier=mod.name)
                except Exception as e:
                    print(f"    ⚠ Could not apply modifier '{mod.name}' on '{obj.name}': {e}")

        # Shade smooth
        bpy.ops.object.shade_smooth()
        print(f"  ✓ Shade smooth on '{obj.name}'")

        # Recalculate normals (face outside = correct orientation)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        print(f"  ✓ Normals recalculated on '{obj.name}'")

        obj.select_set(False)


# ----------------------------------------------------------------
# EXPORT
# ----------------------------------------------------------------

def export_glb(output_path, verbose=True):
    """Export the whole scene to a single .glb file."""
    if verbose:
        print(f"\n=== EXPORTING TO {output_path} ===")

    output_path = os.path.abspath(output_path)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Use Blender's glTF exporter
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        **EXPORT_SETTINGS,
    )

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    if verbose:
        print(f"  ✓ Exported: {output_path}")
        print(f"  ✓ Size: {size_mb:.2f} MB")
        if size_mb > MAX_EXPORT_SIZE_MB:
            print(f"  ⚠ WARNING: File exceeds {MAX_EXPORT_SIZE_MB} MB target. Consider:")
            print(f"     - Decimating high-poly meshes")
            print(f"     - Reducing texture resolution")
            print(f"     - Running gltf-transform with --meshopt --texture-compress ktx2")
    return size_mb


# ----------------------------------------------------------------
# POST-PROCESS — call gltf-transform if available
# ----------------------------------------------------------------

def post_process_glb(glb_path):
    """
    Run gltf-transform on the exported GLB to:
      - Compress geometry with EXT_meshopt_compression
      - Compress textures with KTX2 (Basis Universal)
    Requires gltf-transform installed (npm i -g @gltf-transform/cli).
    Skips silently if not available.
    """
    try:
        import subprocess
        result = subprocess.run(
            ['gltf-transform', 'in', glb_path, glb_path + '.tmp',
             '--meshopt', '--texture-compress', 'ktx2'],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            os.replace(glb_path + '.tmp', glb_path)
            size_mb = os.path.getsize(glb_path) / (1024 * 1024)
            print(f"  ✓ Post-processed with gltf-transform. Final size: {size_mb:.2f} MB")
            return True
        else:
            print(f"  ⚠ gltf-transform failed (rc={result.returncode}). Keeping raw GLB.")
            print(f"    stderr: {result.stderr[:300]}")
            return False
    except FileNotFoundError:
        print("  ℹ gltf-transform not installed. Skipping post-processing.")
        print("    Install with: npm i -g @gltf-transform/cli")
        return False
    except Exception as e:
        print(f"  ⚠ Post-processing error: {e}")
        return False


# ----------------------------------------------------------------
# MAIN
# ----------------------------------------------------------------

def main(output_path=None):
    """Main pipeline: validate → prepare → export → post-process."""
    print("=" * 60)
    print("TMMT BLENDER EXPORT — Pipeline Stage 4")
    print("=" * 60)

    # 1. Validate naming
    print("\n[1/4] Validating mesh names...")
    warnings = validate_naming()
    mesh_count = sum(1 for o in bpy.data.objects if o.type == 'MESH')
    print(f"  Found {mesh_count} mesh objects.")
    if warnings:
        print(f"  ⚠ {len(warnings)} naming warning(s):")
        for w in warnings:
            print(w)
    else:
        print("  ✓ All meshes follow naming convention.")

    # 2. Prepare meshes
    print("\n[2/4] Preparing meshes (modifiers + smooth + normals)...")
    prepare_meshes()

    # 3. Export GLB
    if output_path is None:
        blend_path = bpy.data.filepath
        if blend_path:
            output_path = os.path.splitext(blend_path)[0] + '.glb'
        else:
            output_path = 'tmmt_look.glb'
    print(f"\n[3/4] Exporting GLB to {output_path}...")
    size_mb = export_glb(output_path)

    # 4. Post-process
    print("\n[4/4] Post-processing with gltf-transform...")
    post_process_glb(output_path)

    print("\n" + "=" * 60)
    print("DONE. Output ready for web/AtelierLoader.js")
    print("=" * 60)


# ----------------------------------------------------------------
# ENTRY POINTS
# ----------------------------------------------------------------

def _parse_cli_args():
    """Parse --out argument when running via `blender --python script -- --out X`."""
    argv = sys.argv
    if '--' in argv:
        argv = argv[argv.index('--') + 1:]
    else:
        return None
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=str, default=None, help='Output GLB path')
    args, _ = parser.parse_known_args(argv)
    return args.out


if __name__ == "__main__":
    # When run from Blender's Script editor, bpy is available and __name__ is "__main__"
    out = _parse_cli_args() if '--' in sys.argv else None
    main(output_path=out)
