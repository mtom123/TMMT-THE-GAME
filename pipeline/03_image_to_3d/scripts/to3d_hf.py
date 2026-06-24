"""
TMMT — Image-to-3D via Hunyuan3D-2 HF Space
============================================

Uses the official Tencent Hunyuan3D-2 Space on Hugging Face:
  https://huggingface.co/spaces/tencent/Hunyuan3D-2

Strada A (zero installazione) dal piano di Claude (IMAGE_TO_3D.md).

INPUT  : pipeline/03_image_to_3d/in/_processed/<outfit>_<NN>-<view>.png
OUTPUT : pipeline/03_image_to_3d/out/<outfit>/raw/<outfit>_<NN>-<view>.glb

Uses /shape_generation endpoint (returns white_mesh.glb — geometry only,
no texture. Per TMMT non serve texture: lo shader NPR è procedurale).

Usage:
  python to3d_hf.py                         # process all outfits
  python to3d_hf.py --outfit 01             # process only outfit 01
  python to3d_hf.py --view 01-front         # process only one view
  python to3d_hf.py --dry-run               # just list, don't call API
"""
import os
import sys
import time
import shutil
import argparse
from pathlib import Path

from gradio_client import Client, handle_file

# ----------------------------------------------------------------
# CONFIG
# ----------------------------------------------------------------
SPACE_ID = "tencent/Hunyuan3D-2"
IN_DIR = Path("/home/z/my-project/tmmt-repo/pipeline/03_image_to_3d/in/_processed")
OUT_BASE = Path("/home/z/my-project/tmmt-repo/pipeline/03_image_to_3d/out")


def connect_to_space():
    """Connect to the Hunyuan3D-2 HF Space."""
    print(f"🔌 Connecting to {SPACE_ID}...")
    try:
        client = Client(SPACE_ID, verbose=False)
        print(f"✓ Connected.")
        return client
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return None


def process_image(client, image_path: Path, out_path: Path, retry: int = 0) -> bool:
    """Send one image to Hunyuan3D-2 /shape_generation and save resulting GLB."""
    print(f"\n📤 Processing: {image_path.name}")
    print(f"   Size: {image_path.stat().st_size // 1024}KB")

    try:
        print("   ⏳ Submitting (3-8 min)...")

        # /shape_generation returns:
        #   [0] dict with 'value' = path to white_mesh.glb
        #   [1] html string
        #   [2] dict with mesh stats + params
        #   [3] int (seed)
        result = client.predict(
            caption=None,
            image=handle_file(str(image_path)),
            mv_image_front=None,
            mv_image_back=None,
            mv_image_left=None,
            mv_image_right=None,
            steps=30,
            guidance_scale=5.0,
            seed=1234,
            octree_resolution=256,
            check_box_rembg=True,
            num_chunks=8000,
            randomize_seed=True,
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

        if not mesh_path or not os.path.exists(mesh_path):
            print(f"   ⚠ Mesh file not found. Raw result[0]:")
            print(f"      {result[0] if isinstance(result, (list, tuple)) else result}")
            return False

        # Copy mesh to our output location
        out_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(mesh_path, out_path)
        size_kb = out_path.stat().st_size // 1024
        print(f"   ✓ Saved mesh: {out_path.name} ({size_kb}KB)")

        # Print stats
        if isinstance(result, (list, tuple)) and len(result) > 2:
            stats = result[2]
            if isinstance(stats, dict):
                params = stats.get('params', {})
                model = stats.get('model', {})
                print(f"   📊 Model: {model.get('shapegen', '?')}")
                print(f"   📊 Seed used: {params.get('seed', '?')}")

        return True

    except Exception as e:
        print(f"   ❌ Error: {type(e).__name__}: {e}")
        if retry < 1:
            print(f"   🔄 Retrying in 60s...")
            time.sleep(60)
            return process_image(client, image_path, out_path, retry + 1)
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--outfit', type=str, default=None,
                        help='Process only this outfit ID (e.g. "01")')
    parser.add_argument('--view', type=str, default=None,
                        help='Process only this view (substring match, e.g. "01-front")')
    parser.add_argument('--dry-run', action='store_true',
                        help='Just list photos, do not call the API')
    parser.add_argument('--no-pause', action='store_true',
                        help='Skip 60s pause between images (use with caution)')
    args = parser.parse_args()

    print("=" * 60)
    print("TMMT — Image-to-3D via Hunyuan3D-2 HF Space")
    print("=" * 60)

    photos = sorted(IN_DIR.glob("*.png"))
    if args.outfit:
        photos = [p for p in photos if p.name.startswith(f"outfit-{args.outfit}_")]
    if args.view:
        photos = [p for p in photos if args.view in p.name]

    if not photos:
        print(f"\n❌ No photos found in {IN_DIR}")
        sys.exit(1)

    print(f"\n🎯 Found {len(photos)} photo(s) to process:")
    for p in photos:
        print(f"   - {p.name}")

    if args.dry_run:
        print("\n[dry-run mode — no API calls]")
        return

    client = connect_to_space()
    if not client:
        sys.exit(1)

    success = 0
    failed = 0
    for i, photo in enumerate(photos):
        parts = photo.stem.split('_')
        outfit_id = parts[0].replace('outfit-', '')
        out_path = OUT_BASE / f"outfit-{outfit_id}" / "raw" / f"{photo.stem}.glb"

        if process_image(client, photo, out_path):
            success += 1
        else:
            failed += 1

        if not args.no_pause and i < len(photos) - 1:
            print("   ⏸ 60s pause before next (be nice to free Space)...")
            time.sleep(60)

    print("\n" + "=" * 60)
    print(f"DONE. ✓ {success} success, ✗ {failed} failed")
    print(f"Output: {OUT_BASE}/outfit-XX/raw/")
    print("=" * 60)


if __name__ == "__main__":
    main()
