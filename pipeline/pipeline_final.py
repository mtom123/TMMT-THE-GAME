"""
TMMT — Pipeline Orchestrator FINALE
====================================

End-to-end: foto reali → cel-shaded viewer HTML

Pipeline:
  1. INGEST: copia foto da /home/z/my-project/upload/ → pipeline/01_capture/raw/NN/
  2. PREPROCESS: padding 1024×1024 (preserva persona intera)
  3. MESH: TripoSR mc=384 locale CPU (51k vertici per mesh)
  4. VIEWER: HTML standalone con cel-shader custom WebGL

Uso:
  python pipeline_final.py --outfit 03
  python pipeline_final.py --outfit 03 --views front,side,back
  python pipeline_final.py --outfit 03 --mc-resolution 256  # faster, less detail

Requisiti:
  - TripoSR installato in /home/z/my-project/models/triposr/
  - Python 3.12 con torch, transformers, rembg, PyMCubes, trimesh
"""
import os
import sys
import shutil
import argparse
import subprocess
from pathlib import Path
from PIL import Image, ImageOps

# Config
REPO_ROOT = Path("/home/z/my-project/tmmt-repo")
UPLOAD_DIR = Path("/home/z/my-project/upload")
TRIPOSR_DIR = Path("/home/z/my-project/models/triposr")
VIEWER_TEMPLATE = Path("/home/z/my-project/download/biker-cel-shaded-viewer.html")

STANDARD_VIEWS = ['front', 'side', 'back', 'detail']


def log(msg, level="INFO"):
    print(f"[{level}] {msg}")


def ingest_uploads(outfit_id):
    """Copia foto da upload/ a raw/NN/"""
    log(f"=== STAGE 1: INGEST ===")
    raw_dir = REPO_ROOT / f"pipeline/01_capture/raw/{outfit_id}"
    raw_dir.mkdir(parents=True, exist_ok=True)
    
    all_jpgs = sorted(list(UPLOAD_DIR.glob("*.jpg")) + list(UPLOAD_DIR.glob("*.JPG")) + list(UPLOAD_DIR.glob("*.jpeg")))
    if not all_jpgs:
        log(f"Nessuna foto trovata in {UPLOAD_DIR}", "ERROR")
        return False
    
    for i, file in enumerate(all_jpgs[:4]):
        view = STANDARD_VIEWS[i] if i < len(STANDARD_VIEWS) else f"extra{i}"
        dst = raw_dir / f"{outfit_id}-{view}.jpg"
        shutil.copy2(file, dst)
        log(f"  ✓ {file.name} → {dst.name}")
    
    return True


def preprocess(outfit_id):
    """Padding 1024×1024"""
    log(f"=== STAGE 2: PREPROCESS ===")
    raw_dir = REPO_ROOT / f"pipeline/01_capture/raw/{outfit_id}"
    proc_dir = REPO_ROOT / f"pipeline/01_capture/processed/{outfit_id}"
    proc_dir.mkdir(parents=True, exist_ok=True)
    
    TARGET = 1024
    PAD_COLOR = (240, 240, 240)
    
    def make_pad_bg(w, h):
        bg = Image.new('RGB', (w, h), PAD_COLOR)
        px = bg.load()
        cx, cy = w/2, h/2
        max_d = (cx**2 + cy**2) ** 0.5
        for y in range(h):
            for x in range(w):
                d = ((x-cx)**2 + (y-cy)**2) ** 0.5 / max_d
                v = int(240 - d * 40)
                px[x, y] = (v, v, v)
        return bg
    
    for jpg in sorted(raw_dir.glob("*.jpg")):
        png_out = proc_dir / (jpg.stem + ".png")
        img = Image.open(jpg)
        img = ImageOps.exif_transpose(img)
        if img.mode != 'RGB': img = img.convert('RGB')
        w, h = img.size
        if w >= h:
            new_w, new_h = TARGET, int(h * TARGET / w)
        else:
            new_h, new_w = TARGET, int(w * TARGET / h)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        canvas = make_pad_bg(TARGET, TARGET)
        offset = ((TARGET - new_w) // 2, (TARGET - new_h) // 2)
        canvas.paste(img, offset)
        canvas.save(png_out, 'PNG', optimize=True)
        log(f"  ✓ {jpg.name} → {png_out.name} ({png_out.stat().st_size // 1024}KB)")
    
    return True


def run_triposr(outfit_id, mc_resolution=384, views=None):
    """TripoSR mc=384 su tutte le viste"""
    log(f"=== STAGE 3: TRIPoSR (mc={mc_resolution}) ===")
    proc_dir = REPO_ROOT / f"pipeline/01_capture/processed/{outfit_id}"
    mesh_dir = REPO_ROOT / f"pipeline/03_image_to_3d/out/outfit-{outfit_id}/triposr-{mc_resolution}"
    mesh_dir.mkdir(parents=True, exist_ok=True)
    
    if views is None:
        views = [p.stem.split('-', 1)[1] for p in sorted(proc_dir.glob("*.png"))]
    
    meshes = {}
    for view in views:
        input_png = proc_dir / f"{outfit_id}-{view}.png"
        if not input_png.exists():
            log(f"  ✗ {view}: input non trovato", "WARN")
            continue
        
        out_dir = mesh_dir / view
        out_dir.mkdir(parents=True, exist_ok=True)
        
        log(f"  → Processing {view}...")
        cmd = [
            'python3', str(TRIPOSR_DIR / 'run.py'),
            str(input_png),
            '--device', 'cpu',
            '--output-dir', str(out_dir),
            '--chunk-size', '4096',
            '--mc-resolution', str(mc_resolution),
            '--model-save-format', 'glb',
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600, cwd=str(TRIPOSR_DIR))
        
        mesh_path = out_dir / '0' / 'mesh.glb'
        if mesh_path.exists():
            log(f"    ✓ {view}: {mesh_path.stat().st_size // 1024}KB")
            meshes[view] = mesh_path
        else:
            log(f"  ✗ {view}: mesh non generata", "ERROR")
    
    return meshes


def generate_viewer(outfit_id, meshes):
    """Genera viewer HTML standalone con cel-shader"""
    log(f"=== STAGE 4: VIEWER HTML ===")
    
    import base64
    
    # Read template
    with open(VIEWER_TEMPLATE, 'r') as f:
        html = f.read()
    
    # Encode meshes as base64
    glb_data = {}
    for view, path in meshes.items():
        with open(path, 'rb') as f:
            glb_data[view] = base64.b64encode(f.read()).decode()
        log(f"  ✓ {view}: {len(glb_data[view])//1024}KB base64")
    
    # Replace GLB_DATA in HTML
    import re
    pattern = r'const GLB_DATA = \{[^}]+\};'
    match = re.search(pattern, html, re.DOTALL)
    if match:
        old_data = match.group(0)
        new_data = "const GLB_DATA = {\n"
        for view, b64 in glb_data.items():
            new_data += f'      {view}: "{b64}",\n'
        new_data += "    };"
        html = html.replace(old_data, new_data)
    
    # Update title
    html = html.replace('TMMT — Biker HD', f'TMMT — Outfit {outfit_id} HD')
    
    # Save viewer
    viewer_path = REPO_ROOT.parent / f"download/outfit-{outfit_id}-cel-shaded-viewer.html"
    viewer_path.parent.mkdir(parents=True, exist_ok=True)
    with open(viewer_path, 'w') as f:
        f.write(html)
    
    log(f"  ✓ Viewer: {viewer_path} ({viewer_path.stat().st_size // 1024}KB)")
    return viewer_path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--outfit', type=str, required=True, help='Outfit ID (es. "03")')
    parser.add_argument('--mc-resolution', type=int, default=384, help='TripoSR resolution (256/384/512)')
    parser.add_argument('--views', type=str, default=None, help='Comma-separated views (es. "front,side,back")')
    parser.add_argument('--skip-ingest', action='store_true', help='Salta stage ingest')
    parser.add_argument('--skip-preprocess', action='store_true', help='Salta stage preprocess')
    args = parser.parse_args()
    
    print(f"\n{'='*60}")
    print(f"TMMT PIPELINE FINALE — outfit {args.outfit}")
    print(f"mc-resolution: {args.mc_resolution}")
    print(f"{'='*60}\n")
    
    if not args.skip_ingest:
        if not ingest_uploads(args.outfit):
            sys.exit(1)
    
    if not args.skip_preprocess:
        if not preprocess(args.outfit):
            sys.exit(1)
    
    views = args.views.split(',') if args.views else None
    meshes = run_triposr(args.outfit, mc_resolution=args.mc_resolution, views=views)
    
    if not meshes:
        log("Nessuna mesh generata", "ERROR")
        sys.exit(1)
    
    viewer_path = generate_viewer(args.outfit, meshes)
    
    print(f"\n{'='*60}")
    print(f"PIPELINE COMPLETATA — outfit {args.outfit}")
    print(f"{'='*60}")
    print(f"\nViewer HTML: {viewer_path}")
    print(f"  Apri con double-click nel browser")
    print(f"  Hotkey: 1-3 vista, Q/E preset, H hide UI, A auto-rotate")
    print(f"\nMesh generate: {len(meshes)} viste")
    for view, path in meshes.items():
        print(f"  {view}: {path}")


if __name__ == "__main__":
    main()
