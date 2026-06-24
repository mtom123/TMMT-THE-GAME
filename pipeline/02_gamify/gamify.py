#!/usr/bin/env python3
"""
TMMT — Stadio 2: Gamify automatico e consistente.

Trasforma le foto reali di un capo (front/side/back/top) in 4 viste "gamified"
nello stile TMMT, usando nano-banana (Gemini 2.5 Flash Image) via API.

Consistenza garantita da 4 leve:
  1. STYLE_SPEC bloccata (letta da style_bible.md, identica ad ogni chiamata)
  2. Immagini-ancora di stile passate ad OGNI generazione (--anchors)
  3. Stessa figura/posa imposta dallo style spec
  4. View-chaining: 'front' generata per prima; side/back/top ricevono la FRONT
     gamificata come riferimento aggiuntivo -> il capo resta identico tra le viste.

USO BASE
--------
  export GEMINI_API_KEY=...        # (Windows PowerShell: $env:GEMINI_API_KEY="...")
  python gamify.py --outfit 02-scarf-vest

  # tutti gli outfit presenti in ./in:
  python gamify.py --all

Le foto di input vanno in:   ./in/<outfit>/{front,side,back,top}.jpg
I risultati escono in:       ./out/<outfit>/{front,side,back,top}.png

Vedi config.example.json per le opzioni.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
from pathlib import Path

try:
    from google import genai
    from google.genai import types
except ImportError:
    sys.exit(
        "Manca l'SDK. Installa con:\n"
        "    pip install -r requirements.txt\n"
        "(richiede google-genai e pillow)"
    )

try:
    from PIL import Image
except ImportError:
    sys.exit("Manca Pillow. Installa con: pip install -r requirements.txt")


HERE = Path(__file__).resolve().parent
MODEL = "gemini-2.5-flash-image"     # nano-banana
VIEWS = ["front", "side", "back", "top"]
INPUT_EXTS = [".jpg", ".jpeg", ".png", ".webp"]


# ----------------------------------------------------------------------------
# Style bible parsing
# ----------------------------------------------------------------------------
def load_style_spec(path: Path) -> str:
    """Estrae il blocco STYLE_SPEC da style_bible.md (tra '## STYLE_SPEC' e '---')."""
    text = path.read_text(encoding="utf-8")
    marker = "## STYLE_SPEC"
    if marker not in text:
        sys.exit(f"'{marker}' non trovato in {path}")
    after = text.split(marker, 1)[1]
    # prendi fino al primo separatore '---' su riga propria
    spec = after.split("\n---", 1)[0]
    # rimuovi la riga parentetica '(incollato...)' iniziale se presente
    lines = [ln for ln in spec.splitlines() if not ln.strip().startswith("(")]
    return "\n".join(lines).strip()


VIEW_INSTRUCTIONS = {
    "front": "Front view, the model facing the camera directly.",
    "side":  "Left side / profile view (rotated 90 degrees), same model, same garment, "
             "same illustration style and scale.",
    "back":  "Back view, the model seen from directly behind, same garment, same style and scale.",
    "top":   "High top-down three-quarter view looking down on shoulders and head, same model and "
             "garment, emphasizing collar/neck/shoulder construction, same style and scale.",
}
VIEW_HEADER = {"front": "FRONT VIEW", "side": "LEFT SIDE VIEW",
               "back": "BACK VIEW", "top": "TOP VIEW"}


# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
DEFAULT_CONFIG = {
    "input_dir": "in",
    "output_dir": "out",
    "style_bible": "style_bible.md",
    "anchors": [],            # lista di path immagine-ancora di stile (riusate sempre)
    "draw_header": True,
    "chain_views": True,      # usa la front gamificata come ref per le altre viste
    "overwrite": False,
}


def load_config(path: Path | None) -> dict:
    cfg = dict(DEFAULT_CONFIG)
    if path and path.exists():
        cfg.update(json.loads(path.read_text(encoding="utf-8")))
    return cfg


# ----------------------------------------------------------------------------
# IO helpers
# ----------------------------------------------------------------------------
def find_input(outfit_dir: Path, view: str) -> Path | None:
    for ext in INPUT_EXTS:
        p = outfit_dir / f"{view}{ext}"
        if p.exists():
            return p
    return None


def load_img(path: Path) -> Image.Image:
    return Image.open(path).convert("RGB")


def extract_image(resp) -> Image.Image | None:
    """Recupera la prima immagine dalla risposta Gemini."""
    for cand in (resp.candidates or []):
        for part in (cand.content.parts or []):
            inline = getattr(part, "inline_data", None)
            if inline and inline.data:
                return Image.open(io.BytesIO(inline.data)).convert("RGB")
    return None


# ----------------------------------------------------------------------------
# Generazione
# ----------------------------------------------------------------------------
def build_prompt(style_spec: str, view: str, draw_header: bool) -> str:
    parts = [
        style_spec,
        "",
        f"VIEW: {VIEW_INSTRUCTIONS[view]}",
    ]
    if draw_header:
        parts.append(
            f'Add a small centered uppercase technical label at the very top reading "{VIEW_HEADER[view]}".'
        )
    parts.append(
        "Reference images provided: the photo(s) of the REAL garment to reproduce 1:1, plus "
        "style-anchor illustration(s) defining the exact rendering style. Match the garment from "
        "the photo and the style from the anchors."
    )
    return "\n".join(parts)


def generate_view(client, style_spec, outfit_dir, view, cfg, anchor_imgs, front_result):
    src = find_input(outfit_dir, view)
    # per side/back/top usa la foto della vista se c'è, altrimenti la front foto
    if src is None:
        src = find_input(outfit_dir, "front")
    if src is None:
        print(f"   [skip] nessuna foto per '{view}' e nessuna front di fallback")
        return None

    prompt = build_prompt(style_spec, view, cfg["draw_header"])

    contents = [prompt, load_img(src)]
    contents += anchor_imgs
    # view-chaining: aggiungi la front gamificata come riferimento di coerenza
    if cfg["chain_views"] and view != "front" and front_result is not None:
        contents.append(front_result)

    resp = client.models.generate_content(model=MODEL, contents=contents)
    img = extract_image(resp)
    if img is None:
        print(f"   [warn] nessuna immagine restituita per '{view}'")
    return img


def process_outfit(client, style_spec, cfg, outfit: str):
    in_root = (HERE / cfg["input_dir"]).resolve()
    out_root = (HERE / cfg["output_dir"]).resolve()
    outfit_dir = in_root / outfit
    if not outfit_dir.is_dir():
        print(f"[{outfit}] cartella input mancante: {outfit_dir}")
        return

    out_dir = out_root / outfit
    out_dir.mkdir(parents=True, exist_ok=True)

    anchor_imgs = [load_img(Path(a) if Path(a).is_absolute() else HERE / a)
                   for a in cfg["anchors"]]

    print(f"[{outfit}] gamify (anchors: {len(anchor_imgs)}, chain: {cfg['chain_views']})")

    front_result = None
    # front sempre per prima (serve come ancora di chaining)
    order = ["front"] + [v for v in VIEWS if v != "front"]
    for view in order:
        out_path = out_dir / f"{view}.png"
        if out_path.exists() and not cfg["overwrite"]:
            print(f"   [have] {view} (esiste già, usa --overwrite per rifare)")
            if view == "front":
                front_result = load_img(out_path)
            continue

        print(f"   ...{view}")
        img = generate_view(client, style_spec, outfit_dir, view, cfg, anchor_imgs, front_result)
        if img is not None:
            img.save(out_path)
            print(f"   [ok]  {out_path.relative_to(HERE)}")
            if view == "front":
                front_result = img


def list_outfits(cfg) -> list[str]:
    in_root = (HERE / cfg["input_dir"]).resolve()
    if not in_root.is_dir():
        return []
    return sorted(p.name for p in in_root.iterdir() if p.is_dir())


# ----------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="TMMT gamify (stadio 2)")
    ap.add_argument("--outfit", help="nome cartella outfit in ./in (es. 02-scarf-vest)")
    ap.add_argument("--all", action="store_true", help="processa tutti gli outfit in ./in")
    ap.add_argument("--config", type=Path, default=HERE / "config.json")
    ap.add_argument("--overwrite", action="store_true", help="rigenera anche se esiste")
    args = ap.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        sys.exit("Imposta GEMINI_API_KEY (https://aistudio.google.com/apikey).")

    cfg = load_config(args.config)
    if args.overwrite:
        cfg["overwrite"] = True

    style_spec = load_style_spec(HERE / cfg["style_bible"])
    client = genai.Client(api_key=api_key)

    if args.all:
        outfits = list_outfits(cfg)
        if not outfits:
            sys.exit(f"Nessun outfit in {HERE / cfg['input_dir']}")
        for o in outfits:
            process_outfit(client, style_spec, cfg, o)
    elif args.outfit:
        process_outfit(client, style_spec, cfg, args.outfit)
    else:
        ap.error("specifica --outfit <nome> oppure --all")


if __name__ == "__main__":
    main()
