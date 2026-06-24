# TMMT — Web Build

App 3D che usa `AtelierLoader.js` per caricare i capi della collezione TMMT 2025-26
in formato GLB con materiali NPR (cel-shading + Inverted Hull outline).

## File

| File | Scopo |
|------|------|
| `index.html` | App principale (per deploy su HTTP/Vite/GitHub Pages) |
| `standalone.html` | Versione self-contained, apre con double-click via `file://` |
| `AtelierLoader.js` | Loader production-ready per GLB con naming convention |
| `assets/placeholders/` | 5 GLB dummy per testare il loader prima delle mesh reali |
| `preview-*.png` | Screenshot di esempio (presi via browser headless) |

## Come usarlo

### Modalità standalone (rapida, double-click)
Apri `standalone.html` con qualsiasi browser moderno. Carica 5 placeholder inline
e ti permette di switchare tra nylon/denim/fur/laser/skin. Non serve server.

### Modalità dev (HTTP, per lavorare con GLB reali)
```bash
cd web/
python3 -m http.server 8000
# Apri http://localhost:8000/index.html
```

Oppure con Vite (consigliato per produzione):
```bash
cd web/
npm create vite@latest . -- --template vanilla
# Copia index.html + AtelierLoader.js + assets/ nella nuova struttura
npm install three
npm run dev
```

## Come aggiungere un nuovo look

1. Esporta il `.glb` dal Blender seguendo `pipeline/04_blender/BLENDER.md`
2. Salvalo in `web/assets/looks/` con naming `NN-slug.glb`
   (es. `02-scarf-vest.glb`, `09-bigfoot-fur-coat.glb`)
3. Modifica la `LOOKS` registry in `index.html` (o `standalone.html`):

```js
const LOOKS = [
  // ...
  { id: 6, label: 'Scarf Vest', material: 'nylon', glbPath: './assets/looks/02-scarf-vest.glb' },
];
```

4. Aggiorna l'eventuale range del hotkey `1-9` nello script

## Convenzione naming mesh (per Blender)

Vedi `pipeline/04_blender/BLENDER.md` per dettagli. Sintesi:

| Prefisso mesh | Shader applicato |
|---|---|
| `mesh_nylon_*` | Padded nylon (Blinn-Phong tight specular) |
| `mesh_denim_*` | Washed denim (weave + hand-bleaching) |
| `mesh_laser_*` | Laser engraved (normal perturbation) |
| `mesh_fur_*` | Eco-fur (14 concentric shells) |
| `mesh_skin_*` | Manichino (PBR nativo Blender, no swap) |
| `mesh_other_*` | Accessori (PBR nativo) |

## Hotkey

| Tasto | Azione |
|---|---|
| `1`–`5` | Switcha look |
| `H` | Nasconde/mostra UI |
| `R` | Toggle auto-rotate |
| Drag | Orbita camera |
| Scroll | Zoom |

## Roadmap

- [x] Loader production-ready
- [x] 5 placeholder GLB per testare il loader
- [x] UI switch-look stile Messenger
- [ ] Spotlight editoriale + atmosfera atelier (in atelier.html legacy)
- [ ] Caricamento dei primi GLB reali dallo stadio 4 della pipeline
- [ ] Integrazione venue sferica con gravità procedurale (post-MVP)
