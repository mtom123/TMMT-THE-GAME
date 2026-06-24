# TMMT — Guida per Tommy

> Come organizzare le foto e farle processare dalla pipeline

## 📁 Dove mettere le foto

Metti le foto in questa cartella:

```
/home/z/my-project/upload/
```

**Naming libero**: puoi chiamarle come vuoi (`IMG_3257.jpg`, `outfit-01.jpg`, etc.) — la pipeline le rinomina automaticamente in modo standard.

**Quante foto per outfit**: 4 viste standard
- `front` — vista frontale del capo indossato
- `side` — vista laterale
- `back` — vista posteriore
- `detail` — dettaglio (texture, cucitura, accessorio)

**Importante**: quando carichi foto di un nuovo outfit, assicurati che nella cartella `upload/` ci siano SOLO le 4 foto di quell'outfit. Se hai foto di più outfit mischiate, la pipeline non riesce a distinguerle.

## 🚀 Come lanciare la pipeline

Dopo aver messo le 4 foto in `/home/z/my-project/upload/`, scrivi a GLM uno di questi messaggi:

### Messaggio base (consigliato)
```
processa outfit 01
```
GLM lancia la pipeline completa: ingest → preprocess → gamify → mesh 3D.

### Oppure lancio stage per stage
Se vuoi controllare un singolo stage:
```
processa outfit 01 stage preprocess    # solo resize/EXIF strip
processa outfit 01 stage gamify        # solo image-to-image
processa outfit 01 stage mesh          # solo image-to-3D
```

### Oppure scegli il modello di gamify
```
processa outfit 01 model flux-kontext    # default, migliore qualità
processa outfit 01 model instantstyle    # style transfer con reference JSR
processa outfit 01 model bagel           # instruction-based, Apache-2.0
processa outfit 01 model animeganv2      # one-click anime, meno controllabile
```

## ⏱️ Tempi attesi (per outfit)

| Stage | Tempo | Note |
|-------|-------|------|
| Ingest | <1s | Copia file |
| Preprocess | ~5s | Resize + EXIF strip |
| Gamify (4 foto) | ~3-5 min | HF Space, dipende da quota |
| Mesh (4 foto) | ~25 min | Hunyuan3D-2, 5-6 min per mesh |
| **Totale** | **~30 min** | Per outfit completo |

⚠️ **Limitazione HF Spaces**: c'è un quota gratuito di ~90s di GPU ogni 6 ore. Se il quota si esaurisce, la pipeline si ferma e bisogna aspettare. Per evitare questo, processa un outfit alla volta.

## 📂 Struttura cartelle output

Dopo la pipeline, trovi tutto in:

```
/home/z/my-project/tmmt-repo/pipeline/
├── 01_capture/
│   ├── raw/01/                          ← foto originali (rinominate standard)
│   │   ├── 01-front.jpg
│   │   ├── 01-side.jpg
│   │   ├── 01-back.jpg
│   │   └── 01-detail.jpg
│   └── processed/01/                    ← 1024x1024 PNG (auto-orientate)
│       ├── 01-front.png
│       └── ...
├── 02_gamify/
│   └── out/outfit-01/                   ← immagini gamified (cel-shaded)
│       ├── 01-front-gamified.png
│       └── ...
└── 03_image_to_3d/
    └── out/outfit-01/raw/               ← mesh 3D GLB
        ├── 01-front-gamified.glb
        └── ...
```

## 🔄 Workflow per i 12 outfit

1. Svuota `/home/z/my-project/upload/` (rimuovi vecchie foto)
2. Copia le 4 foto del prossimo outfit in `/home/z/my-project/upload/`
3. Scrivi a GLM: `processa outfit 02` (o il numero successivo)
4. Aspetta ~30 minuti
5. Quando GLM dice "fatto", ripeti dal punto 1 per l'outfit successivo

## ⚠️ Problemi noti (da risolvere)

### 1. Crop quadrato perde la testa
La pipeline fa center-crop a 1024×1024. Se la foto è verticale (ritratto persona in piedi), taglia testa e piedi. **Workaround attuale**: Tommy deve fare le foto già inquadrate "tight" sul capo (riempire il frame con il capo).

**Da fare**: quando avremo GPU locale, faremo padding intelligente invece di crop.

### 2. Manca la persona/viso
Le foto di dettaglio del capo non hanno una persona intera. Per il gioco serve un **avatar** che indossi il capo. **Da fare**: generare personaggi TMMT stylizzati (con image-gen) e applicare i capi via ControlNet.

### 3. Quota HF Spaces
Senza GPU locale, siamo limitati a ~90s di GPU ogni 6 ore su HF. Per batchare 12 outfit serve GPU locale (in arrivo sul computer NVIDIA).

## 🎯 Cosa chiede GLM a Tommy

Quando carichi le foto, GLM ha bisogno di sapere:

1. **Quale outfit è** (numero: 01, 02, ..., 12)
2. **Che modello gamify** usare (default: `flux-kontext`, oppure `instantstyle` se hai una reference JSR specifica in mente)
3. **Se procedere anche col mesh** (default: sì, ma se il gamify non ti convince puoi fermarti lì)

## 📝 Log su GitHub

Ogni outfit processato viene committato su GitHub con:
- Foto originali (rinominate)
- Foto preprocessate
- Foto gamified
- Mesh GLB
- Aggiornamento di `GLM_HANDOFF.md` con stats

Così Claude vede i progressi e può prendere in carico le mesh per lo stadio 4 (Blender).
