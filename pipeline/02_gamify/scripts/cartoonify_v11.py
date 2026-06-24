#!/usr/bin/env python3
"""
cartoonify_v11.py — v1.1 Cartoonify pipeline for TMMT
=====================================================

Converts real fashion photos to clean cartoon style (NOT noisy like Canny filter).

Pipeline
--------
  1. Primary: YANGYYYY/cartoonize HF Space (AnimeGANv2 on CPU)
       - Style: Hayao (most cartoon-like, cleanest of the 3 available)
       - Verified working per /home/z/my-project/tool-results/cartoonify-research.md
       - Output may be down-scaled by the Space; we resize back to input size
  2. Post-processing (CPU, OpenCV):
       - cv2.bilateralFilter to clean residual AnimeGAN noise (light pass)
       - LAB saturation ×1.3 to recover garment color richness
       - Light sharpening pass to keep edges crisp (unsharp mask via Gaussian)
  3. Output: PNG, 1024×1024 (matches input), saved to /home/z/my-project/download/

Notes
-----
  - We do NOT use Canny edge detection (that was the v3 noisy approach).
  - We do NOT need faces generated (next step).
  - HF Space is CPU, no quota issues. HF_TOKEN env var provides auth.

Fallback path (if YANGYYYY is down): see cartoonify_via_local_animegan2()
function at bottom — uses bryandlee/animegan2-pytorch with paprika weights.
This script will try YANGYYYY first; if it fails, it raises and the operator
can install torch and re-run with --local flag.
"""
from __future__ import annotations

import argparse
import os
import shutil
import sys
import time
import traceback
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

# --- Config ------------------------------------------------------------------

DEFAULT_INPUTS = [
    ("/home/z/my-project/tmmt-repo/pipeline/01_capture/processed/01/01-front.png",
     "/home/z/my-project/download/01-front-cartoon-v11.png"),
    ("/home/z/my-project/tmmt-repo/pipeline/01_capture/processed/01/01-side.png",
     "/home/z/my-project/download/01-side-cartoon-v11.png"),
    ("/home/z/my-project/tmmt-repo/pipeline/01_capture/processed/01/01-back.png",
     "/home/z/my-project/download/01-back-cartoon-v11.png"),
    ("/home/z/my-project/tmmt-repo/pipeline/01_capture/processed/01/01-detail.png",
     "/home/z/my-project/download/01-detail-cartoon-v11.png"),
]

SPACE_ID = "YANGYYYY/cartoonize"
DEFAULT_STYLE = "Hayao"


# --- Primary: YANGYYYY/cartoonize HF Space -----------------------------------

def cartoonize_via_hf(input_path: str, style: str = DEFAULT_STYLE,
                      timeout: int = 180) -> str:
    """Call YANGYYYY/cartoonize /transfer endpoint.

    Returns the local file path to the raw cartoon PNG (pre-postprocess).
    The file lives in the gradio_client cache dir.
    """
    from gradio_client import Client, handle_file

    print(f"  [HF] connecting to {SPACE_ID} ...")
    client = Client(SPACE_ID, verbose=False)
    print(f"  [HF] calling /transfer (style={style}) ...")
    t0 = time.time()
    result_path = client.predict(
        image=handle_file(input_path),
        transfer_style=style,
        api_name="/transfer",
    )
    print(f"  [HF] returned in {time.time()-t0:.1f}s -> {result_path}")
    if not result_path or not os.path.exists(result_path):
        raise RuntimeError(f"HF Space returned invalid path: {result_path!r}")
    return result_path


# --- Post-processing ---------------------------------------------------------

def post_process(rgb: np.ndarray,
                 bilateral_d: int = 9,
                 bilateral_sigma_color: float = 40.0,
                 bilateral_sigma_space: float = 40.0,
                 bilateral_iters: int = 1,
                 saturation_mult: float = 1.3,
                 sharpen_amount: float = 0.35,
                 target_size: tuple[int, int] | None = None) -> np.ndarray:
    """Clean residual noise + enhance color + sharpen.

    Steps:
      1. Resize to target_size if specified (LANCZOS, for Hunyuan3D-2 input).
      2. Light bilateral filter (1 pass) — kills residual AnimeGAN grain
         WITHOUT flattening garment construction edges.
      3. LAB saturation ×1.3 — recovers garment color richness; AnimeGAN
         sometimes desaturates.
      4. Unsharp mask — restores a touch of crispness after the bilateral pass.

    All operations are deterministic, CPU-only, OpenCV-based.
    """
    # 1. Resize (PIL LANCZOS for cleanest down/up-sampling)
    if target_size is not None and tuple(rgb.shape[1::-1]) != tuple(target_size):
        pil = Image.fromarray(rgb)
        pil = pil.resize(target_size, Image.LANCZOS)
        rgb = np.array(pil)
        print(f"  [post] resized -> {target_size[0]}×{target_size[1]}")

    # 2. Bilateral filter (light) — denoise while preserving garment edges
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    for _ in range(max(1, bilateral_iters)):
        bgr = cv2.bilateralFilter(
            bgr, d=bilateral_d,
            sigmaColor=bilateral_sigma_color,
            sigmaSpace=bilateral_sigma_space,
        )
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    print(f"  [post] bilateral filter (d={bilateral_d}, σ={bilateral_sigma_color}, "
          f"iters={bilateral_iters})")

    # 3. LAB saturation boost (×1.3) — center at neutral 128
    if saturation_mult != 1.0:
        lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
        lab[:, :, 1] = (lab[:, :, 1] - 128.0) * saturation_mult + 128.0
        lab[:, :, 2] = (lab[:, :, 2] - 128.0) * saturation_mult + 128.0
        lab = np.clip(lab, 0, 255).astype(np.uint8)
        rgb = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
        print(f"  [post] LAB saturation ×{saturation_mult}")

    # 4. Unsharp mask — gentle crispness restoration
    if sharpen_amount > 0:
        blur = cv2.GaussianBlur(rgb, (0, 0), sigmaX=1.2)
        sharpened = cv2.addWeighted(rgb, 1.0 + sharpen_amount,
                                    blur, -sharpen_amount, 0)
        rgb = np.clip(sharpened, 0, 255).astype(np.uint8)
        print(f"  [post] unsharp mask (amount={sharpen_amount})")

    return rgb


# --- Per-image processing ----------------------------------------------------

def process_one(input_path: str, output_path: str,
                style: str = DEFAULT_STYLE,
                hf_cache_dir: str = "/tmp/cartoonify_v11_hf",
                save_raw: bool = True) -> dict:
    """Run the full v1.1 pipeline on one image. Returns a metadata dict."""
    print(f"\n=== Processing: {Path(input_path).name} ===")
    print(f"  input : {input_path}")
    print(f"  output: {output_path}")

    if not os.path.exists(input_path):
        raise FileNotFoundError(input_path)

    # Load input dims for target_size restoration
    in_img = Image.open(input_path)
    in_img = ImageOps.exif_transpose(in_img)
    if in_img.mode != "RGB":
        in_img = in_img.convert("RGB")
    in_w, in_h = in_img.size
    print(f"  input size: {in_w}×{in_h}")

    # 1. Cartoonify via HF Space
    raw_path = cartoonize_via_hf(input_path, style=style)

    # Persist raw HF output for debugging
    os.makedirs(hf_cache_dir, exist_ok=True)
    raw_persist = os.path.join(
        hf_cache_dir,
        f"{Path(input_path).stem}-raw-{style.lower()}.png")
    shutil.copy(raw_path, raw_persist)
    print(f"  [raw] saved -> {raw_persist}")

    # Load raw cartoon
    raw_img = Image.open(raw_persist)
    raw_img = ImageOps.exif_transpose(raw_img)
    if raw_img.mode != "RGB":
        raw_img = raw_img.convert("RGB")
    raw_rgb = np.array(raw_img)
    print(f"  [raw] cartoon size: {raw_img.size[0]}×{raw_img.size[1]}")

    # 2-4. Post-process (resize back to input dims, clean, enhance)
    final_rgb = post_process(raw_rgb, target_size=(in_w, in_h))

    # 5. Save final PNG
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    Image.fromarray(final_rgb).save(output_path, "PNG", optimize=True)
    out_size_kb = os.path.getsize(output_path) // 1024
    print(f"  [done] {output_path}")
    print(f"         {final_rgb.shape[1]}×{final_rgb.shape[0]} | {out_size_kb} KB")

    return {
        "input": input_path,
        "output": output_path,
        "output_kb": out_size_kb,
        "output_dims": (final_rgb.shape[1], final_rgb.shape[0]),
        "raw_path": raw_persist,
        "raw_dims": raw_img.size,
        "style": style,
    }


# --- Fallback: bryandlee/animegan2-pytorch (local, MIT) ----------------------
# Activated only if --local flag is passed AND torch is installed.

def cartoonize_via_local_animegan2(input_path: str, pretrained: str = "paprika",
                                   size: int = 512) -> str:
    """Fallback: run bryandlee/animegan2-pytorch locally on CPU.

    Requires torch + torchvision. The model + face2paint helper are loaded
    via torch.hub.load("bryandlee/animegan2-pytorch:main", ...).
    """
    import torch
    from PIL import Image as PILImage

    print(f"  [LOCAL] loading bryandlee/animegan2-pytorch (pretrained={pretrained}) ...")
    model = torch.hub.load(
        "bryandlee/animegan2-pytorch:main",
        "generator", pretrained=pretrained, trust_repo=True,
    ).eval()
    face2paint = torch.hub.load(
        "bryandlee/animegan2-pytorch:main", "face2paint", size=size,
        trust_repo=True,
    )
    img = PILImage.open(input_path).convert("RGB")
    with torch.no_grad():
        out = face2paint(model, img)
    out_path = "/tmp/cartoonify_v11_local_raw.png"
    out.save(out_path)
    print(f"  [LOCAL] raw saved -> {out_path}")
    return out_path


# --- Main --------------------------------------------------------------------

def main(argv=None) -> int:
    p = argparse.ArgumentParser(
        prog="cartoonify_v11.py",
        description="TMMT v1.1 cartoonify pipeline (YANGYYYY HF Space + cleanup).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--style", default=DEFAULT_STYLE,
                   choices=["Hayao", "Shinkai", "Kon Satoshi"],
                   help="AnimeGANv2 style. Hayao is cleanest (Ghibli-like).")
    p.add_argument("--local", action="store_true",
                   help="Use local bryandlee/animegan2-pytorch instead of HF Space.")
    p.add_argument("--local-pretrained", default="paprika",
                   choices=["paprika", "face_paint_512_v2", "face_paint_512_v1",
                            "celeba_distill"],
                   help="Local model weights (paprika preserves garment texture best).")
    p.add_argument("--input", action="append", default=None,
                   help="Override input image (repeat for multiple). "
                        "If omitted, uses the 4 default outfit-01 paths.")
    p.add_argument("--output", action="append", default=None,
                   help="Override output path (paired with --input).")
    p.add_argument("--saturation", type=float, default=1.3,
                   help="LAB a/b saturation multiplier.")
    p.add_argument("--bilateral-iters", type=int, default=1,
                   help="Bilateral filter passes (1 = light cleanup).")
    p.add_argument("--sharpen", type=float, default=0.35,
                   help="Unsharp mask amount (0 = off).")
    args = p.parse_args(argv)

    # Build input/output pairs
    if args.input:
        if args.output and len(args.output) != len(args.input):
            print("ERROR: --output count must match --input count", file=sys.stderr)
            return 2
        pairs = list(zip(args.input,
                         args.output or [None] * len(args.input)))
        # Fill in default outputs for missing ones
        filled = []
        for inp, out in pairs:
            if out is None:
                stem = Path(inp).stem
                out = f"/home/z/my-project/download/{stem}-cartoon-v11.png"
            filled.append((inp, out))
        pairs = filled
    else:
        pairs = DEFAULT_INPUTS

    # Sanity: outputs land in /home/z/my-project/download/
    os.makedirs("/home/z/my-project/download", exist_ok=True)

    print(f"\n=== TMMT v1.1 Cartoonify ===")
    print(f"  mode       : {'local (bryandlee/animegan2-pytorch)' if args.local else 'HF Space (YANGYYYY/cartoonize)'}")
    print(f"  style      : {args.style if not args.local else args.local_pretrained + ' (local weights)'}")
    print(f"  saturation : ×{args.saturation}")
    print(f"  bilateral  : {args.bilateral_iters} pass(es)")
    print(f"  sharpen    : {args.sharpen}")
    print(f"  images     : {len(pairs)}")

    results = []
    failures = []
    for i, (inp, out) in enumerate(pairs, 1):
        print(f"\n--- [{i}/{len(pairs)}] ---")
        try:
            # Load input to capture original dims for restoration
            in_img = Image.open(inp)
            in_img = ImageOps.exif_transpose(in_img).convert("RGB")
            in_w, in_h = in_img.size
            print(f"  input : {inp}  ({in_w}×{in_h})")
            print(f"  output: {out}")

            # 1. Cartoonify (HF Space primary, or local fallback)
            if args.local:
                raw_path = cartoonize_via_local_animegan2(
                    inp, pretrained=args.local_pretrained)
                style_label = f"local:{args.local_pretrained}"
            else:
                raw_path = cartoonize_via_hf(inp, style=args.style)
                style_label = args.style

            # Persist raw output for debugging
            os.makedirs("/tmp/cartoonify_v11_raw", exist_ok=True)
            raw_persist = os.path.join(
                "/tmp/cartoonify_v11_raw",
                f"{Path(inp).stem}-raw-{style_label.replace(':','-').lower()}.png")
            shutil.copy(raw_path, raw_persist)
            raw_img = Image.open(raw_persist).convert("RGB")
            raw_rgb = np.array(raw_img)
            print(f"  [raw] cartoon size: {raw_img.size[0]}×{raw_img.size[1]} "
                  f"-> {raw_persist}")

            # 2-4. Post-process: resize back to input dims, denoise, enhance, sharpen
            final_rgb = post_process(
                raw_rgb, target_size=(in_w, in_h),
                bilateral_iters=args.bilateral_iters,
                saturation_mult=args.saturation,
                sharpen_amount=args.sharpen,
            )

            # 5. Save final PNG
            os.makedirs(os.path.dirname(out), exist_ok=True)
            Image.fromarray(final_rgb).save(out, "PNG", optimize=True)
            out_kb = os.path.getsize(out) // 1024
            results.append({
                "input": inp, "output": out,
                "output_kb": out_kb,
                "output_dims": (final_rgb.shape[1], final_rgb.shape[0]),
                "raw_dims": raw_img.size,
                "raw_path": raw_persist,
                "style": style_label,
            })
            print(f"  ✓ OK  -> {out}  ({out_kb} KB)")
        except Exception as e:
            print(f"  ✗ FAIL: {e}")
            traceback.print_exc()
            failures.append((inp, str(e)))

    # Summary
    print(f"\n=== Summary ===")
    print(f"  success: {len(results)} / {len(pairs)}")
    print(f"  failures: {len(failures)}")
    for r in results:
        print(f"  ✓ {r['output']}  "
              f"{r['output_dims'][0]}×{r['output_dims'][1]}  "
              f"{r['output_kb']} KB  "
              f"(raw {r.get('raw_dims','?')}, style={r['style']})")
    for inp, err in failures:
        print(f"  ✗ {inp}: {err}")

    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
