#!/usr/bin/env python3
"""
celshade_python.py — Jet Set Radio / cel-shaded post-process for fashion photos
================================================================================

PURE-CPU pipeline. No torch, no GPU, no HF quota. Only uses:
  - PIL / Pillow
  - OpenCV (cv2)
  - NumPy
  - scikit-image (optional, currently unused — kept as future extension point)

Goal
----
Take a real fashion photo (model wearing padded shirt + quilted stitching +
padded pants) and RE-RENDER ONLY THE SHADING STYLE. The underlying garment
construction (quilted stitches, seams, padded-section boundaries) is preserved
EXACTLY because every black outline is derived directly from the ORIGINAL
photo via Canny edge detection.

Output look
-----------
  - Hard black outlines on edges (silhouette + garment construction lines)
  - N-band flat cel-shading (default 3: shadow / mid / highlight)
  - Vibrant saturated colors (LAB a/b boost)
  - No smooth gradients — flat color regions only
  - Garment construction details (quilted stitching) PRESERVED from source

Pipeline
--------
  1. Load RGB photo (PIL) → NumPy uint8 array (auto EXIF-orient)
  2. Bilateral filter — edge-preserving denoise (smooths noise on flat areas,
     keeps garment construction edges sharp). Run twice for stronger effect.
  3. Canny edge detection on the SMOOTHED luminance → edge mask
       - L2 gradient (more accurate)
       - Dilate by --edge-thickness for hard outline weight
       - Morphological close to bridge tiny gaps in stitching lines
  4. RGB posterize — per-channel quantization to N levels (default 10)
       → flat color regions, kills remaining gradients
  5. Convert posterized RGB → LAB
  6. Quantize L (lightness) channel to `--bands` discrete levels
       → classic cel-shaded shadow/mid/highlight bands
  7. Boost a/b chroma channels by `--saturation` (centered at neutral 128)
       → vibrant saturated colors
  8. Convert LAB → RGB
  9. Composite black Canny edges on top with `--edge-opacity`
 10. Optional final posterize (--final-posterize-levels, off by default)
 11. Save PNG (optimized)

Why this preserves garment details BETTER than FLUX-Kontext
----------------------------------------------------------
FLUX-Kontext (and any diffusion-based img2img model) re-renders the garment
from a latent embedding. Even at high denoising strength preservation, fine
construction details — quilted stitching lines, seam geometry, padded section
boundaries — frequently get smeared, hallucinated, or simplified. The model
"knows" what a padded shirt looks like but cannot reproduce the EXACT stitch
pattern of THIS specific garment.

This script takes the opposite approach: every black outline in the output is
a real Canny edge extracted from the original pixels. The stitching pattern
is mechanically preserved. We only re-render the SHADING (3-band L
quantization) and the COLOR SATURATION (a/b boost). The construction lines
are not generated — they are traced from the source photo.

Trade-off: this script cannot fix lighting, change pose, or stylize the
model's face. It only re-renders shading style. For pure "Jet Set Radio
look on this exact garment" use cases, it is more reliable than diffusion.

Usage
-----
  # Default cel-shaded look
  python celshade_python.py \\
      --input  /path/to/photo.png \\
      --output /path/to/celshaded.png

  # Tune for finer stitching capture (lower Canny) + harder cel (2 bands)
  python celshade_python.py \\
      -i photo.png -o out.png \\
      --canny-low 30 --canny-high 100 \\
      --bands 2 --saturation 1.8 \\
      --edge-thickness 2 --edge-opacity 1.0

  # Debug mode: saves each pipeline stage to _debug_<stem>/ next to output
  python celshade_python.py -i photo.png -o out.png --debug
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps


# ---------------------------------------------------------------------------
# Low-level helpers
# ---------------------------------------------------------------------------

def _to_uint8(arr: np.ndarray) -> np.ndarray:
    """Clip to [0, 255] and cast to uint8. Safe for any float input."""
    return np.clip(arr, 0, 255).astype(np.uint8)


def bilateral_smooth(
    rgb: np.ndarray,
    d: int = 9,
    sigma_color: float = 75.0,
    sigma_space: float = 75.0,
    iters: int = 2,
) -> np.ndarray:
    """Edge-preserving denoise. OpenCV bilateralFilter works on BGR/uint8.

    Running it twice gives noticeably cleaner flat areas while still
    preserving garment construction edges (quilting, seams, padded edges).
    """
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    for _ in range(max(1, iters)):
        bgr = cv2.bilateralFilter(bgr, d=d, sigmaColor=sigma_color,
                                  sigmaSpace=sigma_space)
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


def posterize_rgb(rgb: np.ndarray, levels_per_channel: int = 10) -> np.ndarray:
    """Per-channel RGB quantization. Each channel gets `levels_per_channel`
    discrete values, snapped to the CENTER of each bin (cleaner flat colors).

    levels=10  → step 25.6  → ~10 values/channel (recommended)
    levels=8   → step 32    → flatter
    levels=12  → step 21.3  → more color detail preserved
    levels<=0 or >=256 → no-op (returns copy)
    """
    if levels_per_channel <= 0 or levels_per_channel >= 256:
        return rgb.copy()
    step = 256.0 / levels_per_channel
    quantized = np.floor(rgb.astype(np.float32) / step) * step + step / 2.0
    return _to_uint8(quantized)


def canny_edges(
    rgb: np.ndarray,
    low: int = 50,
    high: int = 150,
    thickness: int = 1,
    blur_size: int = 3,
) -> np.ndarray:
    """Canny edge detection on luminance. Returns uint8 mask (0 or 255).

    Steps:
      - Convert RGB → grayscale (luminance)
      - Light Gaussian blur to suppress single-pixel sensor noise
        (but keep garment construction edges)
      - Canny with L2 gradient (more accurate than L1)
      - Dilate by `thickness` pixels for outline weight
      - Morphological close (2x2) to bridge tiny gaps in stitching lines
    """
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    if blur_size and blur_size > 1:
        gray = cv2.GaussianBlur(gray, (blur_size, blur_size), 0)
    edges = cv2.Canny(gray, low, high, L2gradient=True)

    # Dilate for thicker outlines.
    # thickness=1 → 3x3 kernel, 1 iteration → ~1px wider lines
    if thickness and thickness > 0:
        k = 2 * thickness + 1
        kernel = np.ones((k, k), np.uint8)
        edges = cv2.dilate(edges, kernel, iterations=1)

    # Bridge tiny gaps (broken stitching lines) without over-thickening.
    close_kernel = np.ones((2, 2), np.uint8)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, close_kernel)
    return edges


def cel_shade_l(lab: np.ndarray, bands: int = 3) -> np.ndarray:
    """Quantize the L (lightness) channel of LAB into `bands` discrete levels.

    OpenCV uint8 LAB has L in [0, 255]. We snap each pixel to the CENTER of
    its band → distinct flat shading levels with no gradient in between.

    bands=2 → hardcore high-contrast cel (shadow + highlight only)
    bands=3 → classic cel (shadow + mid + highlight)  [default]
    bands=4-5 → softer cel with more shading nuance
    """
    if bands <= 1:
        return lab
    out = lab.copy()
    L = out[:, :, 0].astype(np.float32)
    step = 256.0 / bands
    banded = np.floor(L / step) * step + step / 2.0
    out[:, :, 0] = _to_uint8(banded)
    return out


def boost_saturation(lab: np.ndarray, multiplier: float = 1.5) -> np.ndarray:
    """Scale the a/b (chroma) channels of LAB by `multiplier`, centered at
    the neutral point (128 in uint8 LAB).

    This is critical: in uint8 LAB, a=128 and b=128 mean "no color cast".
    Multiplying raw values would shift neutrals toward red/yellow. We must
    subtract 128 first, scale, then add 128 back.

    multiplier=1.0 → no change
    multiplier=1.5 → vibrant (recommended)
    multiplier=2.0 → neon / Jet Set Radio extreme
    """
    if multiplier == 1.0:
        return lab
    out = lab.copy().astype(np.float32)
    out[:, :, 1] = (out[:, :, 1] - 128.0) * multiplier + 128.0
    out[:, :, 2] = (out[:, :, 2] - 128.0) * multiplier + 128.0
    return _to_uint8(out)


def composite_edges(
    rgb: np.ndarray,
    edges: np.ndarray,
    opacity: float = 0.9,
) -> np.ndarray:
    """Overlay black Canny edges on RGB image with given opacity.

    opacity=0.0 → no edges
    opacity=0.9 → near-solid black outlines (recommended)
    opacity=1.0 → pure black outlines
    """
    if opacity <= 0:
        return rgb
    # Normalize edge mask to [0, opacity]
    mask = (edges.astype(np.float32) / 255.0) * float(opacity)
    mask = mask[..., None]  # H×W×1 for broadcast against RGB
    img_f = rgb.astype(np.float32)
    out = img_f * (1.0 - mask)  # black (0) where mask is high
    return _to_uint8(out)


# ---------------------------------------------------------------------------
# Full pipeline
# ---------------------------------------------------------------------------

def cel_shade(
    rgb: np.ndarray,
    canny_low: int = 50,
    canny_high: int = 150,
    bands: int = 3,
    saturation: float = 1.5,
    edge_thickness: int = 1,
    edge_opacity: float = 0.9,
    posterize_levels: int = 10,
    bilateral_d: int = 9,
    bilateral_sigma: float = 75.0,
    bilateral_iters: int = 2,
    final_posterize_levels: int = 0,
    debug_dir: Path | None = None,
) -> np.ndarray:
    """Run the full cel-shading pipeline. Returns RGB uint8 array."""

    # Tiny no-op closure when debug is off, real saver when on.
    if debug_dir is not None:
        debug_dir.mkdir(parents=True, exist_ok=True)
        def _dbg(name: str, arr: np.ndarray) -> None:
            Image.fromarray(arr).save(debug_dir / f"stage_{name}.png")
            print(f"    [debug] stage_{name}.png")
    else:
        def _dbg(name: str, arr: np.ndarray) -> None:
            pass

    print(f"  [1/9] input  : shape={rgb.shape} dtype={rgb.dtype}")
    _dbg("01_input", rgb)

    # ---- 2. Bilateral smooth (denoise while keeping garment edges) --------
    print(f"  [2/9] bilateral filter (d={bilateral_d}, σ={bilateral_sigma}, "
          f"iters={bilateral_iters})")
    smoothed = bilateral_smooth(
        rgb, d=bilateral_d,
        sigma_color=bilateral_sigma, sigma_space=bilateral_sigma,
        iters=bilateral_iters,
    )
    _dbg("02_smoothed", smoothed)

    # ---- 3. Canny edges on SMOOTHED luminance -----------------------------
    # Run on smoothed (not raw) so sensor noise is suppressed but real
    # garment construction edges (quilting, seams) are preserved.
    print(f"  [3/9] Canny edges (low={canny_low}, high={canny_high}, "
          f"thickness={edge_thickness})")
    edges = canny_edges(
        smoothed, low=canny_low, high=canny_high,
        thickness=edge_thickness,
    )
    _dbg("03_edges", edges)
    if debug_dir is not None:
        # Bonus: edges overlaid on the ORIGINAL input → see what Canny captured
        _dbg("03_edges_on_input", composite_edges(rgb, edges, 0.9))

    # ---- 4. RGB posterize (flat color regions, kills gradients) -----------
    print(f"  [4/9] posterize RGB → {posterize_levels} levels/channel")
    posterized = posterize_rgb(smoothed, levels_per_channel=posterize_levels)
    _dbg("04_posterized", posterized)

    # ---- 5. RGB → LAB -----------------------------------------------------
    print("  [5/9] convert RGB → LAB")
    lab = cv2.cvtColor(posterized, cv2.COLOR_RGB2LAB).astype(np.float32)

    # ---- 6. Quantize L → N shading bands ----------------------------------
    print(f"  [6/9] quantize L → {bands} shading bands")
    lab = cel_shade_l(lab, bands=bands)

    # ---- 7. Boost a/b saturation ------------------------------------------
    print(f"  [7/9] boost saturation ×{saturation}")
    lab = boost_saturation(lab, multiplier=saturation)

    # ---- 8. LAB → RGB -----------------------------------------------------
    print("  [8/9] convert LAB → RGB")
    shaded = cv2.cvtColor(_to_uint8(lab), cv2.COLOR_LAB2RGB)
    _dbg("08_shaded_no_edges", shaded)

    # ---- 9. Composite edges (+ optional final posterize) ------------------
    print(f"  [9/9] composite edges (opacity={edge_opacity})")
    result = composite_edges(shaded, edges, opacity=edge_opacity)

    if final_posterize_levels and final_posterize_levels > 1:
        print(f"  [+]   final posterize → {final_posterize_levels} levels/channel")
        result = posterize_rgb(result, levels_per_channel=final_posterize_levels)

    _dbg("09_result", result)
    return result


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args(argv=None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="celshade_python.py",
        description=(
            "Cel-shaded / Jet Set Radio post-process for fashion photos. "
            "Pure CPU. Preserves garment construction lines (quilted stitching, "
            "seams, padded edges) by deriving every black outline from the "
            "ORIGINAL photo via Canny edge detection."
        ),
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--input", "-i", required=True, type=Path,
                   help="Input photo (PNG/JPG).")
    p.add_argument("--output", "-o", required=True, type=Path,
                   help="Output PNG path.")

    # --- Canny ---
    p.add_argument("--canny-low", type=int, default=50,
                   help="Canny lower threshold. Lower → more edges captured. "
                        "Use 30-50 for fine quilted stitching; 80-100 for "
                        "silhouette-only outlines.")
    p.add_argument("--canny-high", type=int, default=150,
                   help="Canny upper threshold. Should be ~2-3× --canny-low.")

    # --- Cel shading ---
    p.add_argument("--bands", type=int, default=3,
                   help="Number of discrete shading bands (L quantization). "
                        "2=hardcore, 3=classic cel, 4-5=softer.")
    p.add_argument("--saturation", type=float, default=1.5,
                   help="Saturation multiplier on LAB a/b channels. "
                        "1.0=none, 1.5=vibrant, 2.0=neon.")

    # --- Edges ---
    p.add_argument("--edge-thickness", type=int, default=1,
                   help="Pixel thickness of black outlines (dilation radius). "
                        "1=thin hard line, 2-3=heavier comic inking.")
    p.add_argument("--edge-opacity", type=float, default=0.9,
                   help="Opacity of overlaid black edges (0=none, 1=solid).")

    # --- Pipeline extras ---
    p.add_argument("--posterize-levels", type=int, default=10,
                   help="Per-channel RGB quantization levels BEFORE LAB. "
                        "8-12 recommended. 0=skip (leave smooth).")
    p.add_argument("--bilateral-d", type=int, default=9,
                   help="Bilateral filter window diameter (pixels). "
                        "Larger = more smoothing, slower.")
    p.add_argument("--bilateral-sigma", type=float, default=75.0,
                   help="Bilateral filter σ_color and σ_space. Larger = more "
                        "smoothing across colors/coordinates.")
    p.add_argument("--bilateral-iters", type=int, default=2,
                   help="Bilateral filter iterations. 2 recommended for "
                        "cel-shaded flatness.")
    p.add_argument("--final-posterize-levels", type=int, default=0,
                   help="Optional FINAL per-channel posterize pass (0=skip). "
                        "Use 6-8 for extreme flatness.")
    p.add_argument("--max-size", type=int, default=0,
                   help="If >0, resize longest side to this before processing "
                        "(output keeps processed size). Useful for >2K images.")
    p.add_argument("--debug", action="store_true",
                   help="Save each pipeline stage to _debug_<stem>/ next to output.")
    return p.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)

    in_path: Path = args.input
    out_path: Path = args.output
    if not in_path.exists():
        print(f"ERROR: input not found: {in_path}", file=sys.stderr)
        return 2
    out_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"\n=== celshade_python ===")
    print(f"  input : {in_path} ({in_path.stat().st_size // 1024} KB)")

    # 1. Load + auto-orient
    img = Image.open(in_path)
    img = ImageOps.exif_transpose(img)  # honor EXIF orientation
    if img.mode != "RGB":
        img = img.convert("RGB")
    rgb = np.array(img)
    print(f"  loaded: {rgb.shape[1]}×{rgb.shape[0]} (RGB)")

    if args.max_size and max(rgb.shape[:2]) > args.max_size:
        scale = args.max_size / max(rgb.shape[:2])
        new_w = int(round(rgb.shape[1] * scale))
        new_h = int(round(rgb.shape[0] * scale))
        rgb = np.array(img.resize((new_w, new_h), Image.LANCZOS))
        print(f"  resized → {new_w}×{new_h}")

    # 2-9. Pipeline
    debug_dir = (out_path.parent / f"_debug_{out_path.stem}") if args.debug else None
    result = cel_shade(
        rgb,
        canny_low=args.canny_low,
        canny_high=args.canny_high,
        bands=args.bands,
        saturation=args.saturation,
        edge_thickness=args.edge_thickness,
        edge_opacity=args.edge_opacity,
        posterize_levels=args.posterize_levels,
        bilateral_d=args.bilateral_d,
        bilateral_sigma=args.bilateral_sigma,
        bilateral_iters=args.bilateral_iters,
        final_posterize_levels=args.final_posterize_levels,
        debug_dir=debug_dir,
    )

    # 10. Save
    Image.fromarray(result).save(out_path, "PNG", optimize=True)
    print(f"\n  output : {out_path}")
    print(f"           {out_path.stat().st_size // 1024} KB")
    print(f"           {result.shape[1]}×{result.shape[0]} (RGB)")
    if debug_dir is not None:
        print(f"  debug  : {debug_dir}/")
    print(f"=== done ===\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
