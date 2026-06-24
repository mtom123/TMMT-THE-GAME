"""
TMMT — Preprocess photos for image-to-3D pipeline
==================================================

Take raw iPhone photos (typically 3024x4032, EXIF-rotated, ~3MB each)
and produce clean 1024x1024 PNG inputs for the Hunyuan3D-2 model.

Operations per photo:
  1. Auto-orient from EXIF (so up is really up)
  2. Center-crop to square (model expects square input)
  3. Resize to 1024x1024 (Hunyuan3D-2 default)
  4. Save as PNG (lossless, no artifacts)
  5. Strip all EXIF/metadata

Input:  pipeline/03_image_to_3d/in/<outfit>_<NN>-<view>.jpg
Output: pipeline/03_image_to_3d/in/_processed/<outfit>_<NN>-<view>.png
"""
import os
from pathlib import Path
from PIL import Image, ImageOps

IN_DIR = Path("/home/z/my-project/tmmt-repo/pipeline/03_image_to_3d/in")
OUT_DIR = IN_DIR / "_processed"
OUT_DIR.mkdir(parents=True, exist_ok=True)

TARGET_SIZE = 1024
VALID_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp')


def process_photo(in_path: Path, out_path: Path) -> dict:
    """Process a single photo. Returns metadata dict."""
    img = Image.open(in_path)

    # 1. Auto-orient from EXIF
    img = ImageOps.exif_transpose(img)

    # 2. Convert to RGB (drop alpha)
    if img.mode != 'RGB':
        img = img.convert('RGB')

    # 3. Center-crop to square
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))

    # 4. Resize to target
    img = img.resize((TARGET_SIZE, TARGET_SIZE), Image.LANCZOS)

    # 5. Save as PNG (no metadata)
    img.save(out_path, 'PNG', optimize=True)

    return {
        'input': str(in_path.name),
        'output': str(out_path.name),
        'original_size': (w, h),
        'final_size': img.size,
        'final_kb': out_path.stat().st_size // 1024,
    }


def main():
    print(f"=== TMMT photo preprocessing ===")
    print(f"Input:  {IN_DIR}")
    print(f"Output: {OUT_DIR}\n")

    processed = []
    for f in sorted(IN_DIR.iterdir()):
        if f.suffix.lower() not in VALID_EXTENSIONS:
            continue
        out_path = OUT_DIR / (f.stem + '.png')
        print(f"  → {f.name}")
        meta = process_photo(f, out_path)
        print(f"    {meta['original_size']} → {meta['final_size']} | {meta['final_kb']}KB")
        processed.append(meta)

    print(f"\n✓ Processed {len(processed)} photos. Output in {OUT_DIR}")


if __name__ == "__main__":
    main()
