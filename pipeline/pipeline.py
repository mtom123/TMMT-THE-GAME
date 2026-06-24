"""
TMMT — Pipeline Orchestrator
=============================

End-to-end pipeline: foto reali → gamified → mesh 3D → ready for web

COSA FA
-------
Dato un outfit ID (es. "01"):
  Stage 1 — Preprocess:       raw/01/*.jpg → processed/01/*.png (1024x1024, EXIF stripped)
  Stage 2 — Gamify:           processed/01/*.png → gamified/01/*.png (cel-shaded via HF Space)
  Stage 3 — Image to 3D:      gamified/01/*.png → mesh/01/*.glb (via Hunyuan3D-2 HF Space)

I capi originali che Tommy carica vanno in:
  /home/z/my-project/upload/   (qualsiasi nome .jpg)

Poi Tommy mi dice "processa outfit 01" e io:
  1. Copio le foto da upload/ a pipeline/01_capture/raw/01/
  2. Le rinomino standard: 01-front.jpg, 01-side.jpg, 01-back.jpg, 01-detail.jpg
  3. Lancio la pipeline

COME USARLO
-----------
  python pipeline.py --outfit 01                          # full pipeline
  python pipeline.py --outfit 01 --stage preprocess       # solo stage 1
  python pipeline.py --outfit 01 --stage gamify           # solo stage 2
  python pipeline.py --outfit 01 --stage mesh             # solo stage 3
  python pipeline.py --outfit 01 --stage gamify --model flux-kontext
  python pipeline.py --outfit 01 --stage gamify --model instantstyle
  python pipeline.py --outfit 01 --stage gamify --model bagel
  python pipeline.py --outfit 01 --stage gamify --model animeganv2

FILE LAYOUT
-----------
pipeline/
├── 01_capture/
│   ├── raw/01/                    ← Tommy mette foto qui (raw originale)
│   │   ├── 01-front.jpg
│   │   ├── 01-side.jpg
│   │   ├── 01-back.jpg
│   │   └── 01-detail.jpg
│   └── processed/01/              ← auto-generato (1024x1024 PNG)
│       ├── 01-front.png
│       ├── 01-side.png
│       ├── 01-back.png
│       └── 01-detail.png
├── 02_gamify/
│   ├── style_references/          ← reference JSR/Messenger per InstantStyle
│   ├── out/01/                    ← auto-generato (immagini gamified)
│   │   ├── 01-front-gamified.png
│   │   ├── 01-side-gamified.png
│   │   ├── 01-back-gamified.png
│   │   └── 01-detail-gamified.png
│   └── out/tests/                 ← A/B test (per confronto modelli)
└── 03_image_to_3d/
    └── out/outfit-01/raw/         ← auto-generato (mesh GLB)
        ├── 01-front-gamified.glb
        ├── 01-side-gamified.glb
        ├── 01-back-gamified.glb
        └── 01-detail-gamified.glb
"""
import os
import sys
import time
import shutil
import argparse
import subprocess
from pathlib import Path
from PIL import Image, ImageOps

# ----------------------------------------------------------------
# CONFIG
# ----------------------------------------------------------------
REPO_ROOT = Path("/home/z/my-project/tmmt-repo")
UPLOAD_DIR = Path("/home/z/my-project/upload")

CAPTURE_RAW = REPO_ROOT / "pipeline/01_capture/raw"
CAPTURE_PROCESSED = REPO_ROOT / "pipeline/01_capture/processed"
GAMIFY_OUT = REPO_ROOT / "pipeline/02_gamify/out"
MESH_OUT = REPO_ROOT / "pipeline/03_image_to_3d/out"

# Standard views we expect per outfit
STANDARD_VIEWS = ['front', 'side', 'back', 'detail']

# HF Spaces
HUNYUAN_SPACE = "tencent/Hunyuan3D-2"
GAMIFY_SPACES = {
    'flux-kontext': 'black-forest-labs/FLUX.1-Kontext-Dev',
    'instantstyle': 'InstantX/InstantStyle',
    'bagel': 'ByteDance-Seed/BAGEL',
    'animeganv2': 'akhaliq/AnimeGANv2',
}


# ----------------------------------------------------------------
# HELPERS
# ----------------------------------------------------------------
def log(msg, level="INFO"):
    print(f"[{level}] {msg}")


def ensure_dirs(outfit_id):
    """Create all needed directories for an outfit."""
    for d in [
        CAPTURE_RAW / outfit_id,
        CAPTURE_PROCESSED / outfit_id,
        GAMIFY_OUT / f"outfit-{outfit_id}",
        MESH_OUT / f"outfit-{outfit_id}/raw",
    ]:
        d.mkdir(parents=True, exist_ok=True)


def wait_for_gpu_quota(seconds=60):
    """Be nice to free HF Spaces."""
    log(f"Pausing {seconds}s to respect HF ZeroGPU quota...")
    time.sleep(seconds)


# ----------------------------------------------------------------
# STAGE 0 — INGEST: copy from upload/ to raw/01/
# ----------------------------------------------------------------
def ingest_uploads(outfit_id, files=None):
    """
    Copy photos from /home/z/my-project/upload/ to pipeline/01_capture/raw/<outfit>/

    If files not specified, auto-detect by mtime (newest 4 jpgs).
    Naming convention for output: <outfit>-<view>.jpg
    """
    log(f"=== STAGE 0: INGEST ===")
    ensure_dirs(outfit_id)

    if not files:
        # Auto-detect: all jpgs in upload dir, sorted by name
        all_jpgs = sorted(UPLOAD_DIR.glob("*.jpg")) + sorted(UPLOAD_DIR.glob("*.JPG"))
        # Filter out non-outfit files (like attachments from previous sessions)
        all_jpgs = [f for f in all_jpgs if f.name.startswith("IMG_") or f.name.startswith("outfit")]
        if not all_jpgs:
            log(f"No photos found in {UPLOAD_DIR}", "ERROR")
            return False
        files = all_jpgs[:4]  # take first 4

    if len(files) < 4:
        log(f"Warning: expected 4 photos, found {len(files)}", "WARN")

    # Map files to standard views in order
    for i, (file, view) in enumerate(zip(files, STANDARD_VIEWS)):
        dst = CAPTURE_RAW / outfit_id / f"{outfit_id}-{view}.jpg"
        shutil.copy2(file, dst)
        log(f"  ✓ {file.name} → {dst.name}")

    log(f"Stage 0 done. {len(files)} photos ingested.")
    return True


# ----------------------------------------------------------------
# STAGE 1 — PREPROCESS: resize, center-crop, EXIF strip
# ----------------------------------------------------------------
def preprocess(outfit_id, target_size=1024):
    """Resize photos to target_size×target_size PNG."""
    log(f"=== STAGE 1: PREPROCESS ===")
    in_dir = CAPTURE_RAW / outfit_id
    out_dir = CAPTURE_PROCESSED / outfit_id
    out_dir.mkdir(parents=True, exist_ok=True)

    if not in_dir.exists():
        log(f"Input dir not found: {in_dir}", "ERROR")
        return False

    processed = 0
    for jpg in sorted(in_dir.glob("*.jpg")):
        png_out = out_dir / (jpg.stem + ".png")
        try:
            img = Image.open(jpg)
            img = ImageOps.exif_transpose(img)  # auto-orient
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Center-crop to square
            w, h = img.size
            side = min(w, h)
            left = (w - side) // 2
            top = (h - side) // 2
            img = img.crop((left, top, left + side, top + side))
            img = img.resize((target_size, target_size), Image.LANCZOS)
            img.save(png_out, 'PNG', optimize=True)
            log(f"  ✓ {jpg.name} → {png_out.name} ({png_out.stat().st_size // 1024}KB)")
            processed += 1
        except Exception as e:
            log(f"  ✗ {jpg.name}: {e}", "ERROR")

    log(f"Stage 1 done. {processed} photos preprocessed.")
    return processed > 0


# ----------------------------------------------------------------
# STAGE 2 — GAMIFY: photo → cel-shaded via HF Space
# ----------------------------------------------------------------
def gamify(outfit_id, model='flux-kontext', custom_prompt=None):
    """Apply cel-shaded style to each photo via selected HF Space."""
    log(f"=== STAGE 2: GAMIFY (model: {model}) ===")

    from gradio_client import Client, handle_file

    in_dir = CAPTURE_PROCESSED / outfit_id
    out_dir = GAMIFY_OUT / f"outfit-{outfit_id}"
    out_dir.mkdir(parents=True, exist_ok=True)

    if not in_dir.exists():
        log(f"Input dir not found: {in_dir}", "ERROR")
        return False

    # Default prompts per model
    prompts = {
        'flux-kontext': custom_prompt or "Redraw this photo as a cel-shaded anime fashion illustration in the style of Jet Set Radio. Hard black outlines on edges, flat 2-tone shading, vibrant saturated colors, slight grunge texture. Keep the garment design identical.",
        'bagel': custom_prompt or "Redraw this photo as a cel-shaded anime game character in Jet Set Radio style. Hard black outlines, flat 2-tone shading, vibrant colors. Keep the garment design exactly the same.",
    }

    space_id = GAMIFY_SPACES[model]
    log(f"Connecting to {space_id}...")
    try:
        client = Client(space_id, verbose=False)
    except Exception as e:
        log(f"Failed to connect: {e}", "ERROR")
        return False

    success = 0
    failed = 0

    for png in sorted(in_dir.glob("*.png")):
        log(f"\n  → Gamifying: {png.name}")
        out_path = out_dir / png.name.replace(".png", "-gamified.png")

        try:
            if model == 'flux-kontext':
                result = client.predict(
                    input_image=handle_file(str(png)),
                    prompt=prompts['flux-kontext'],
                    seed=42, randomize_seed=True,
                    guidance_scale=2.5, steps=28,
                    api_name="/infer"
                )
                img_path = result[0] if isinstance(result, (list, tuple)) else result
                if isinstance(img_path, str) and os.path.exists(img_path):
                    shutil.copy2(img_path, out_path)
                    log(f"    ✓ Saved: {out_path.name} ({out_path.stat().st_size // 1024}KB)")
                    success += 1
                else:
                    log(f"    ✗ Unexpected result: {result}", "ERROR")
                    failed += 1

            elif model == 'instantstyle':
                ref_path = str(REPO_ROOT / "pipeline/02_gamify/style_references/game-messsenger-abeto.jpg")
                result = client.predict(
                    image_pil=handle_file(ref_path),
                    input_image=handle_file(str(png)),
                    prompt="a fashion model wearing the garment, cel-shaded anime style, masterpiece, best quality",
                    n_prompt="text, watermark, lowres, low quality, deformed, blurry, photorealistic",
                    scale=1.0, control_scale=0.5, guidance_scale=5.0,
                    num_samples=1, num_inference_steps=20, seed=42,
                    target="Load only style blocks",
                    neg_content_prompt="", neg_content_scale=0.5,
                    api_name="/create_image"
                )
                if isinstance(result, (list, tuple)) and len(result) > 0:
                    img_path = result[0][0] if isinstance(result[0], (list, tuple)) else result[0]
                    if isinstance(img_path, str) and os.path.exists(img_path):
                        shutil.copy2(img_path, out_path)
                        log(f"    ✓ Saved: {out_path.name}")
                        success += 1
                    else:
                        log(f"    ✗ Unexpected result", "ERROR")
                        failed += 1

            elif model == 'bagel':
                result = client.predict(
                    image=handle_file(str(png)),
                    prompt=prompts['bagel'],
                    show_thinking=False,
                    cfg_text_scale=4.0, cfg_img_scale=2.5,
                    cfg_interval=0.0, timestep_shift=3.0, num_timesteps=50,
                    cfg_renorm_min=0.0, cfg_renorm_type="text_channel",
                    max_think_token_n=1024, do_sample=False,
                    text_temperature=0.3, seed=42,
                    api_name="/edit_image"
                )
                img_path = result[0] if isinstance(result, (list, tuple)) else result
                if isinstance(img_path, str) and os.path.exists(img_path):
                    shutil.copy2(img_path, out_path)
                    log(f"    ✓ Saved: {out_path.name}")
                    success += 1
                else:
                    log(f"    ✗ Unexpected result", "ERROR")
                    failed += 1

            elif model == 'animeganv2':
                for ver in ['Version 1', 'Version 2']:
                    result = client.predict(
                        img=handle_file(str(png)),
                        ver=ver,
                        api_name="/inference"
                    )
                    if isinstance(result, dict):
                        path = result.get('path')
                        if path and os.path.exists(path):
                            out_v = out_dir / png.name.replace(".png", f"-{ver.lower().replace(' ','')}.png")
                            shutil.copy2(path, out_v)
                            log(f"    ✓ Saved: {out_v.name}")
                success += 1

        except Exception as e:
            log(f"    ✗ Error: {type(e).__name__}: {e}", "ERROR")
            failed += 1
            if "quota" in str(e).lower() or "GPU" in str(e):
                log(f"    ⚠ GPU quota exceeded. Wait 5 min and retry.", "WARN")
                break

        # Be nice between calls
        wait_for_gpu_quota(20)

    log(f"\nStage 2 done. ✓ {success} success, ✗ {failed} failed")
    return success > 0


# ----------------------------------------------------------------
# STAGE 3 — IMAGE TO 3D: gamified png → mesh GLB
# ----------------------------------------------------------------
def image_to_3d(outfit_id, use_gamified=True):
    """Convert gamified PNGs to GLB meshes via Hunyuan3D-2."""
    log(f"=== STAGE 3: IMAGE TO 3D ===")

    from gradio_client import Client, handle_file

    # Source: gamified if available, else processed
    src_dir = GAMIFY_OUT / f"outfit-{outfit_id}" if use_gamified else CAPTURE_PROCESSED / outfit_id
    if not src_dir.exists() or not list(src_dir.glob("*.png")):
        log(f"Source dir empty/missing: {src_dir}, falling back to processed", "WARN")
        src_dir = CAPTURE_PROCESSED / outfit_id

    out_dir = MESH_OUT / f"outfit-{outfit_id}/raw"
    out_dir.mkdir(parents=True, exist_ok=True)

    log(f"Connecting to {HUNYUAN_SPACE}...")
    try:
        client = Client(HUNYUAN_SPACE, verbose=False)
    except Exception as e:
        log(f"Failed to connect: {e}", "ERROR")
        return False

    # Find all PNGs to process
    pngs = sorted(src_dir.glob("*.png"))
    # For AnimeGANv2 we have 2 versions per view, keep only the v2 (or first found per view)
    seen_views = set()
    filtered_pngs = []
    for p in pngs:
        # Extract base view name (e.g. "01-front" from "01-front-version2.png")
        base = p.stem
        for suffix in ['-version1', '-version2', '-gamified']:
            if base.endswith(suffix):
                base = base[:-len(suffix)]
                break
        if base not in seen_views:
            seen_views.add(base)
            filtered_pngs.append(p)
    pngs = filtered_pngs

    log(f"Found {len(pngs)} image(s) to convert:")
    for p in pngs:
        log(f"  - {p.name}")

    success = 0
    failed = 0

    for png in pngs:
        log(f"\n  → Converting: {png.name}")
        out_path = out_dir / (png.stem + ".glb")

        try:
            result = client.predict(
                caption=None,
                image=handle_file(str(png)),
                mv_image_front=None, mv_image_back=None,
                mv_image_left=None, mv_image_right=None,
                steps=30, guidance_scale=5.0, seed=1234,
                octree_resolution=256, check_box_rembg=True,
                num_chunks=8000, randomize_seed=True,
                api_name="/shape_generation"
            )

            # Extract mesh path from result[0] dict
            mesh_path = None
            if isinstance(result, (list, tuple)) and len(result) > 0:
                first = result[0]
                if isinstance(first, dict) and 'value' in first:
                    mesh_path = first['value']
                elif isinstance(first, str):
                    mesh_path = first

            if mesh_path and os.path.exists(mesh_path):
                shutil.copy2(mesh_path, out_path)
                log(f"    ✓ Saved: {out_path.name} ({out_path.stat().st_size // 1024}KB)")
                success += 1
            else:
                log(f"    ✗ Mesh not found in result", "ERROR")
                failed += 1

        except Exception as e:
            log(f"    ✗ Error: {type(e).__name__}: {e}", "ERROR")
            failed += 1
            if "quota" in str(e).lower() or "GPU" in str(e):
                log(f"    ⚠ GPU quota exceeded. Wait 5 min and retry.", "WARN")
                break

        wait_for_gpu_quota(60)

    log(f"\nStage 3 done. ✓ {success} success, ✗ {failed} failed")
    return success > 0


# ----------------------------------------------------------------
# MAIN
# ----------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="TMMT Pipeline Orchestrator")
    parser.add_argument('--outfit', type=str, required=True,
                        help='Outfit ID (e.g. "01", "02", ..., "12")')
    parser.add_argument('--stage', type=str, default='all',
                        choices=['all', 'ingest', 'preprocess', 'gamify', 'mesh'],
                        help='Which stage to run (default: all)')
    parser.add_argument('--model', type=str, default='flux-kontext',
                        choices=['flux-kontext', 'instantstyle', 'bagel', 'animeganv2'],
                        help='Gamify model to use (default: flux-kontext)')
    parser.add_argument('--prompt', type=str, default=None,
                        help='Custom prompt for gamify stage')
    parser.add_argument('--use-processed-for-mesh', action='store_true',
                        help='Use processed (real) photos instead of gamified for mesh stage')
    args = parser.parse_args()

    print("=" * 60)
    print(f"TMMT PIPELINE — outfit {args.outfit}")
    print(f"Stage: {args.stage} | Model: {args.model}")
    print("=" * 60)

    if args.stage in ['all', 'ingest']:
        if not ingest_uploads(args.outfit):
            sys.exit(1)

    if args.stage in ['all', 'preprocess']:
        if not preprocess(args.outfit):
            sys.exit(1)

    if args.stage in ['all', 'gamify']:
        if not gamify(args.outfit, model=args.model, custom_prompt=args.prompt):
            log("Gamify stage failed, continuing to mesh with processed photos", "WARN")

    if args.stage in ['all', 'mesh']:
        use_gam = not args.use_processed_for_mesh
        if not image_to_3d(args.outfit, use_gamified=use_gam):
            sys.exit(1)

    print("\n" + "=" * 60)
    print(f"PIPELINE COMPLETE — outfit {args.outfit}")
    print("=" * 60)
    print(f"\nOutput paths:")
    print(f"  Processed photos: {CAPTURE_PROCESSED / args.outfit}")
    print(f"  Gamified photos:  {GAMIFY_OUT / f'outfit-{args.outfit}'}")
    print(f"  Mesh GLBs:        {MESH_OUT / f'outfit-{args.outfit}' / 'raw'}")
    print(f"\nNext: ask Claude to import meshes in Blender (stadio 4)")


if __name__ == "__main__":
    main()
