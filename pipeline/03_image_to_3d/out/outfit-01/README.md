# Stadio 3 — Output: outfit-01

Generated on 24 Giugno 2026 via Hunyuan3D-2 HF Space (Strada A, zero installazione).

## Sorgenti

4 foto iPhone 12 (3024×4032) preprocessate a 1024×1024 PNG:

- `outfit-01_01-front.png` → front view
- `outfit-01_02-side.png`  → side view
- `outfit-01_03-back.png`  → back view
- `outfit-01_04-detail.png` → detail/close-up

## Mesh generate

Tutte in `raw/`, formato `.glb` (geometry only, no texture — lo shader NPR è procedurale).

| File | Vertici | Facce | Bounds (W×H×D) | Size |
|------|---------|-------|-----------------|------|
| `outfit-01_01-front.glb` | 109,463 | 391,558 | 0.93 × 1.96 × 0.55 | 5.7 MB |
| `outfit-01_02-side.glb`  | 94,006  | 335,056 | 0.59 × 1.96 × 0.76 | 4.9 MB |
| `outfit-01_03-back.glb`  | 111,130 | 405,356 | 0.87 × 1.96 × 0.62 | 5.9 MB |
| `outfit-01_04-detail.glb`| 183,920 | 673,524 | 1.43 × 1.96 × 0.78 | 9.8 MB |

## Note tecniche

- **Modello**: `tencent/Hunyuan3D-2/hunyuan3d-dit-v2-0`
- **Endpoint**: `/shape_generation` (single-image mode, 4 visti separati)
- **Background removal**: attivo (`check_box_rembg=True`)
- **Steps**: 30, **Guidance scale**: 5.0, **Octree resolution**: 256
- **Seed**: randomizzato per ogni mesh (vedi `pipeline/03_image_to_3d/scripts/to3d_hf.py`)
- **Tempo totale**: ~5 minuti per mesh, ~25 minuti per tutte e 4

## Bounds analysis

Front/side/back hanno bounds coerenti (~0.9m larghezza, ~2m altezza) → figura umana
in piedi. La "detail" è più larga (1.43m) → probabilmente un close-up di un capo
specifico (es. per catturare dettagli texture/volume).

Le prime 3 mesh sono candidate per la fusione in Blender (stadio 4) — Claude potrà:
1. Scegliere la migliore come base
2. Oppure allinearle e fonderle per ottenere una mesh completa
3. Usare la "detail" come reference per i volumi specifici

## Prossimi step (Stadio 4 — Blender)

1. Importare una o più mesh in Blender
2. Cleanup topologico: Decimate per ridurre da 100k+ vertici a ~20-30k
3. Separare capo da corpo (manichino)
4. Rinominare le mesh secondo convenzione AtelierLoader:
   - `mesh_skin_mannequin` (corpo)
   - `mesh_nylon_*` / `mesh_denim_*` / `mesh_fur_*` / `mesh_laser_*` (capi)
5. Export GLB con `pipeline/04_blender/blender_export.py`
6. Salvare in `web/assets/looks/01-outfit-one.glb`
7. Testare in `web/standalone.html`
