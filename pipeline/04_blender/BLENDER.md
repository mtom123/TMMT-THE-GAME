# TMMT — Stage 4: Blender Export

> Da mesh grezza (stadio 3, image-to-3D) a `.glb` pulito e nominato
> per il caricamento nel `web/AtelierLoader.js` (stadio 5).

## Workflow

```
mesh grezza (.obj/.glb da stadio 3)
    ↓ cleanup topologico + shade smooth
    ↓ rename secondo convenzione
    ↓ (opzionale) Decimate per ridurre polycount
    ↓ export .glb via blender_export.py
    ↓ (opzionale) gltf-transform post-process
.glb finale (< 2 MB) → web/assets/looks/NN-slug.glb
```

## Naming convention mesh (RIGOROSO)

Il loader `AtelierLoader.js` fa match sul prefisso del nome mesh.
Ogni mesh esportabile DEVE iniziare con uno dei prefissi seguenti.

| Prefisso | Shader applicato | Note |
|----------|------------------|------|
| `mesh_nylon_*` | Padded nylon (Blinn-Phong tight specular) | Capo imbottito, speculare netto |
| `mesh_denim_*` | Washed denim (weave + hand-bleaching) | UVs importani per il bleaching |
| `mesh_laser_*` | Laser-engraved cotton (normal perturbation) | UVs importani per il pattern |
| `mesh_fur_*` | Eco-fur (Fur Shells, 14 layer concentrici) | **Shade smooth obbligatorio** + normali pulite |
| `mesh_skin_*` | Manichino (PBR nativo Blender, NO swap) | Mantenuto così come esportato |
| `mesh_other_*` | Accessori (PBR nativo) | Cinture, zip, bottoni, ecc. |

**Qualsiasi mesh senza un prefisso valido viene SKIPPATA dal loader con un warning.**

### Esempio di Outliner per Look 03 (Bulk Shirt)
```
Look_03_BulkShirt/
├── mesh_skin_mannequin
├── mesh_denim_bulk_shirt_body
├── mesh_denim_bulk_shirt_sleeve_L
└── mesh_denim_bulk_shirt_sleeve_R
```

### Esempio per Look 09 (Bigfoot Fur Coat)
```
Look_09_FurCoat/
├── mesh_skin_mannequin
└── mesh_fur_bigfoot_coat       ← singola mesh. Il loader la clona 14 volte
                                   (Fur Shells factory). Deve essere smooth-shaded
                                   con normali pulite per il displacement corretto.
```

## Checklist manuale in Blender

Prima di lanciare lo script di export:

1. **Topologia**
   - [ ] Elimina mesh duplicate o nascoste (`Outliner > Show Hidden`)
   - [ ] Verifica che non ci siano mesh con 0 vertici
   - [ ] Unisci mesh dello stesso materiale se possibile (meno draw call)

2. **Normali**
   - [ ] Per ogni mesh: `Edit Mode > A (select all) > Mesh > Normals > Recalculate Outside`
   - [ ] Shade smooth (`Right-click > Shade Smooth`)
   - [ ] **Per `mesh_fur_*`**: smooth è obbligatorio, le normali devono essere pulite

3. **UVs**
   - [ ] Per `mesh_denim_*` e `mesh_laser_*`: UVs unwrapped (lo shader dipende dagli UV)
   - [ ] Per `mesh_nylon_*`, `mesh_fur_*`, `mesh_skin_*`: UVs opzionali

4. **Modifiers**
   - [ ] Mirror: applicato (lascia che lo script applichi, oppure fallo a mano)
   - [ ] Subdivision Surface: solo se necessario, max level 2
   - [ ] Decimate: per mesh oltre 50k vertici, target 20-30k (ratio 0.4-0.6)
   - [ ] Elimina modifiers non necessari prima dell'export

5. **Materials**
   - [ ] Per `mesh_skin_*` e `mesh_other_*`: PBR materials funzionanti (saranno preservati)
   - [ ] Per `mesh_nylon/denim/laser/fur_*`: il materiale sarà scartato dal loader e
         sostituito con lo shader NPR. NON serve curare le texture qui, conta solo la geometria.

6. **Naming**
   - [ ] Rinomina ogni mesh nell'Outliner secondo la convenzione sopra
   - [ ] Verifica con lo script (validation step)

## Come usare `blender_export.py`

### Opzione A — Script editor (consigliata per iterare)

1. Apri il file `.blend` in Blender
2. Vai nel workspace **Scripting**
3. Apri `pipeline/04_blender/blender_export.py`
4. Click **Run Script**
5. L'output appare nella console di Blender (`Window > Toggle System Console` su Windows,
   o lancia Blender da terminale su Mac/Linux)
6. Il file `.glb` viene salvato accanto al `.blend`

### Opzione B — CLI headless

```bash
blender --background input.blend \
  --python pipeline/04_blender/blender_export.py \
  -- --out /path/to/web/assets/looks/02-scarf-vest.glb
```

### Opzione C — Export manuale (no script)

1. `File > Export > glTF 2.0 (.glb)`
2. Nel pannello di destra, attiva:
   - ✓ Apply Modifiers
   - ✓ UVs
   - ✓ Normals
   - ✓ Tangents
   - Compression: **Meshopt** (EXT_meshopt_compression)
3. Disattiva:
   - ✗ Cameras
   - ✗ Lights
4. Click **Export glb**

## Post-processing con gltf-transform (opzionale ma consigliato)

Lo script tenta automaticamente di lanciare `gltf-transform` per:
- Comprimere ulteriormente la geometria con EXT_meshopt_compression
- Convertire le texture in KTX2 (Basis Universal)

Installa prima:
```bash
npm install -g @gltf-transform/cli
```

Oppure manualmente:
```bash
gltf-transform in input.glb output.glb \
  --meshopt \
  --texture-compress ktx2
```

## Target dimensioni

| Outfit | Vertici target | GLB target |
|--------|----------------|------------|
| Singolo capo (es. shirt) | 5k – 20k | < 1 MB |
| Outfit completo (multi-mesh) | 20k – 50k | < 2 MB |
| Manichino (`mesh_skin_*`) | 5k – 10k | < 500 KB |

Se superi i target, usa **Decimate** (ratio 0.4-0.6) o riduci le texture.

## Verifica finale

Dopo export, prima di pushare il GLB in `web/assets/looks/`:

1. Apri `web/standalone.html` nel browser
2. Modifica la `LOOKS` registry per includere il nuovo file
3. Click sul pulsante del nuovo look
4. Verifica che:
   - La mesh carica senza errori in console (F12)
   - Lo shader è applicato (non vedi il PBR originale)
   - L'outline nero è presente sui capi non-fur
   - Per `mesh_fur_*`: il pelo ha volume (le 14 shells sono visibili)
5. Se qualcosa non funziona, controlla:
   - Naming mesh (deve matchare esattamente il prefisso)
   - Normali (shade smooth + recalculate outside)
   - UVs per denim/laser

## Roadmap stage 4

- [x] `blender_export.py` con validation + prepare + export + post-process
- [ ] Template `.blend` con manichino base già nominato `mesh_skin_mannequin`
- [ ] Plugin UI in Blender per visualizzare warning di naming nell'Outliner
- [ ] Integrazione con CI: auto-export su push di `.blend` modificati
