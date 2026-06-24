# Stadio 3 — Da 4 viste a mesh 3D (FREE, in locale)

Input: le 4 viste gamified da `02_gamify/out/<outfit>/`.
Output: una mesh grezza (`.glb`/`.obj`) da rifinire in Blender (stadio 4).

Hardware disponibile: **NVIDIA RTX 3060** → possiamo fare tutto **gratis e in locale**.

## Perché NON fotogrammetria / NeRF / Gaussian Splatting

Servono decine di foto reali dello stesso oggetto da molti angoli, e i Gaussian splat non sono
mesh pulite riggabili. Per poche viste stilizzate → mesh pulita, lo strumento giusto è
**AI image-to-3D** (single/multi-view).

## La verità sui "plugin Blender gratis"

Non esiste un addon Blender, gratuito e offline, che faccia foto→mesh di buona qualità da solo.
I modelli buoni (Tripo, Rodin, Meshy, Hunyuan3D, TripoSR, InstantMesh) girano come **app/servizi
separati**. Gli addon Blender tipo "Tripo"/"Meshy" esistono ma chiamano le loro **API a pagamento**.
Quindi il flusso free è sempre:

```
modello AI (locale o web)  →  esporti .glb/.obj  →  IMPORTI in Blender  →  pulizia/retopo/export
```

Blender qui fa la **rifinitura** (Decimate/Remesh sono gratis), non la generazione.

## Due strade free (in ordine di comodità)

### A) Hugging Face Spaces — ZERO installazione (consigliata per partire)
Demo gratuite nel browser: carichi le viste, scarichi la mesh. Nessun setup, usano le loro GPU
(con coda). Cerca su huggingface.co/spaces:
- **InstantMesh** — multi-view → mesh, ottimo compromesso.
- **Hunyuan3D-2** (Tencent) — qualità migliore.
- **TripoSR** — single image, velocissimo, qualità minore (ripiego).

Procedura: carica `front.png` (e dove supportato `side/back`) → genera → scarica `.glb`/`.obj`
in `pipeline/03_image_to_3d/out/<outfit>/raw.glb`.

### B) Hunyuan3D-2 in LOCALE sulla 3060 — massima qualità, più setup
Gira sulla tua GPU, gratis, nessuna coda, batchabile. Richiede Python + CUDA + torch e qualche
dipendenza. Quando vuoi, ti preparo io lo script di setup + un `to3d.py` che processa tutta la
cartella `out/` in automatico (come il gamify). Consiglio: prima validiamo 1 capo via HF Space (A),
poi se la qualità ci piace passiamo al locale (B) per fare i 12 in serie.

## Cosa cerchiamo nell'output
- Silhouette e proporzioni fedeli (le **texture contano poco**: denim/nylon/laser/fur li fa lo
  shader NPR in three.js, sono procedurali).
- Topologia ragionevole, **pochi poligoni**, opzione quad/remesh se disponibile.
- Per lo scarf-vest: che si leggano collo-sciarpa a scialle, i canali trapuntati verticali,
  il pantalone wide cropped e gli anfibi.

→ poi stadio 4 (Blender): separi capo/corpo, nomini le mesh `mesh_nylon_*` ecc., esporti `.glb`.
