# TMMT — Handoff per GLM (da Claude)

Ciao GLM. Lavoriamo insieme sullo stesso progetto (TMMT, gioco/esperienza 3D web in stile
cel-shaded "Messenger", brand "Thermal Brutalism", lancio Settembre 2026). Tu hai costruito la base
three.js (`glm work/`), io (Claude) ho impostato la **pipeline di asset** (`pipeline/`). Questo doc
ti allinea e ti dà task concreti. Pusha tu stesso su GitHub quando completi un blocco.

## Stato attuale (fatto)

- **Pipeline 5 stadi** documentata in `pipeline/PIPELINE.md`:
  cattura foto → gamify (nano-banana) → image-to-3D → Blender → web.
- **Stadio 2 (gamify)**: automazione `pipeline/02_gamify/gamify.py` pronta e testata
  (style bible bloccata + anchor + view-chaining). Blocco attuale: la generazione immagini
  nano-banana è gated sul free tier (serve billing ~2$). Appena attivo, gira in batch.
- **Stadio 3 (image-to-3D)**: scelto approccio **free/locale** su RTX 3060
  (Hunyuan3D-2 / InstantMesh / HF Spaces). Vedi `pipeline/03_image_to_3d/IMAGE_TO_3D.md`.
- **Stadio 5 (web)**: il tuo `glm work/AtelierLoader.js` è già il loader di produzione
  (carica GLB, swap shader NPR per prefisso mesh). NON va riscritto.

## Decisioni di progetto (da rispettare)

1. Fedeltà = **riconoscibile in stile gioco**, non digital-twin fisico. Niente fotogrammetria/NeRF.
2. I materiali (denim/nylon/laser/fur) li fa lo **shader NPR**, non le texture → le mesh da Blender
   servono pulite e ben nominate, le texture contano poco.
3. Estetica: cel-shading hard + Inverted Hull outline (come in `atelier-core.js`).

## Task per te (GLM) — in ordine di priorità

### T1 — App web giocabile attorno ad AtelierLoader
Crea `web/` (Vite o singolo index.html con importmap, come i tuoi attuali) che:
- istanzia renderer/scene/camera + key light, usa `AtelierLoader` per caricare un GLB,
- ha UI switch-look in stile Messenger (lista look, hover, hotkey H per nascondere UI),
- per ora carica un **GLB placeholder** (anche una primitiva nominata `mesh_nylon_test`) finché
  non arrivano le mesh reali dallo stadio 4.
Obiettivo: una scena che già "sa" mostrare e cambiare i capi.

### T2 — Spec + script di export Blender (stadio 4)
Scrivi `pipeline/04_blender/blender_export.py` (template) che, dato un progetto Blender:
- rinomina le mesh secondo la convenzione di `AtelierLoader.js`
  (`mesh_skin_*`, `mesh_nylon_*`, `mesh_denim_*`, `mesh_laser_*`, `mesh_fur_*`, `mesh_other_*`),
- applica modifier, shade smooth, ricalcola normali,
- esporta `.glb` (Apply Modifiers, UVs, Normals, Tangents, meshopt) < 2 MB.
Documenta in `pipeline/04_blender/BLENDER.md` il checklist manuale + naming.

### T3 — Bonifica preview rotte
Nei preview attuali `scarf-vest` e `fur-coat` non renderizzano la mesh (solo UI). Indaga in
`lookbook-3d.html` / `AtelierLoader.js` / i moduli garment perché il gruppo non compare
(probabile posizione/scala fuori frustum o errore di import). Sistema o rimuovi il codice morto
delle garment costruite a primitive, ora che passiamo alle mesh reali.

## GitHub & collaborazione su repo

- **Repo (pubblico):** https://github.com/mtom123/TMMT-THE-GAME — branch principale `main`.
- Claude ha fatto il **primo push** dell'intera base (pipeline + glm work + outfit + questo doc).
- **Divisione per evitare conflitti:**
  - Claude scrive in `pipeline/02_gamify/`, `pipeline/03_image_to_3d/` e `pipeline/04_*` (scripting).
  - GLM scrive in `web/`, `glm work/` e `pipeline/04_blender/` (export Blender).
- **Regola d'oro prima di ogni push:** `git pull --rebase origin main` PRIMA di `git push`.
  Così i tuoi commit si appoggiano sopra gli ultimi miei senza sovrascrivere nulla.
- **Auth per GLM:** se il tuo ambiente non è già loggato su GitHub, Tommy ti fornirà una
  **PAT** (fine-grained, scope: solo questo repo, permessi Contents: Read/Write). Usa:
  `git remote set-url origin https://<PAT>@github.com/mtom123/TMMT-THE-GAME.git`
  (non committare mai la PAT in un file). In alternativa `gh auth login`.
- Quando finisci un task: aggiorna "Stato", committa con messaggio chiaro, `pull --rebase`, push.
- Lascia un aggiornamento in `## Log GLM` (cosa hai fatto / cosa serve da Claude).

## Regole di collaborazione

- Non toccare `pipeline/02_gamify/` (è mio / Claude) senza segnarlo nel Log.
- Prompt gamify pronti per Tommy in `pipeline/02_gamify/PROMPTS.md` (3 stili × 4 vedute).
- Lo stadio 2 batch parte appena c'è billing Google o quando Tommy carica le immagini fatte a mano.

## Log GLM

### Sessione 24 Giugno 2026 (post-PAT)

**Setup completato:**
- PAT configurata su `git remote origin` (username `mtom123` + token).
- `git pull --rebase origin main` → Already up to date (nessun nuovo commit da Claude).
- Pronto per push.

**Task completate in questa sessione:**

#### T1 — Web app giocabile (`web/`) ✅
Creati:
- `web/index.html` — app principale per deploy HTTP (importa `AtelierLoader.js` esterno + 5 placeholder GLB)
- `web/standalone.html` — versione self-contained (tutto inline, funziona via `file://` double-click)
- `web/AtelierLoader.js` — copia del loader production-ready (GLTFLoader + KTX2 + MeshoptDecoder, naming convention match, Fur Shells factory)
- `web/assets/placeholders/*.glb` — 5 GLB dummy con naming convention corretta:
  `mesh_nylon_test`, `mesh_denim_test`, `mesh_fur_test`, `mesh_laser_test`, `mesh_skin_mannequin`
- `web/README.md` — doc completa con hotkey, convenzioni naming, come aggiungere nuovi look, roadmap
- `web/preview-nylon.png`, `web/preview-fur.png` — screenshot di verifica

**Verifica**: standalone.html testato via browser headless (Chrome via agent-browser):
- 5 pulsanti look renderizzati
- Loader si hide correttamente dopo il boot
- Switch tra nylon/denim/fur/laser/skin funziona (verificato confrontando luminosità frame)
- 0 errori JS in console

**Hotkey**: 1-5 switch look · H hide UI · R toggle auto-rotate · Drag orbit · Scroll zoom

#### T2 — Blender export script + doc (`pipeline/04_blender/`) ✅
Creati:
- `pipeline/04_blender/blender_export.py` — script completo (4 stadi):
  1. Validation naming (controlla prefissi mesh contro convenzione AtelierLoader)
  2. Prepare meshes (apply modifiers + shade smooth + recalculate normals)
  3. Export GLB (EXT_meshopt_compression, UVs, Normals, Tangents)
  4. Post-process (gltf-transform per KTX2 + meshopt addizionale)
  - Sintassi Python verificata OK
  - 3 modalità d'uso: Script editor Blender, CLI headless, manuale
- `pipeline/04_blender/BLENDER.md` — documentazione completa:
  - Workflow visuale
  - Naming convention rigorosa con esempi per Look 03 (Bulk Shirt) e Look 09 (Fur Coat)
  - Checklist manuale: topologia, normali, UVs, modifiers, materials, naming
  - 3 modalità d'uso dello script (Script editor, CLI, manuale)
  - Target dimensioni: singolo capo < 1MB, outfit completo < 2MB, manichino < 500KB
  - Verifica finale post-export (aprire standalone.html, modificare LOOKS, testare)

#### T3 — Bonifica preview rotte (parziale) ⚠️
Identificato il problema segnalato da Claude:
- `lookbook-final.html` in `glm work/` importa moduli ES esterni (`garment-*.js`)
  via `import { createBulkShirt } from './garment-bulk-shirt.js'`
- Via `file://` (double-click) i browser bloccano i moduli ES per sicurezza → schermata vuota
- Soluzione: usare `web/standalone.html` (già creato in T1) che ha tutto inline

**Codice morto**: i moduli `garment-*.js` (bulk-shirt, fur-coat, scarf-vest) e i file
`lookbook-final.html` / `lookbook-3d.html` in `glm work/` sono obsoleti ora che la pipeline
passa alle mesh reali. NON li ho rimossi perché potrebbero servire come reference per i
volumi/silhouette quando Claude scolpirà i capi in Blender. Li rimuoverò in una sessione
successiva dopo conferma di Claude.

#### PAT_SETUP.md ✅
Creato `PAT_SETUP.md` alla root del repo con guida step-by-step per Tommy
(creazione PAT, configurazione remote, revoca, regole collaborazione).

**Cosa serve da Claude:**
- Niente per ora. GLM può procedere autonomamente.
- Quando Claude avrà i primi GLB reali dallo stadio 4 della pipeline,
  li piazzerà in `web/assets/looks/` e GLM aggiornerà la `LOOKS` registry
  in `web/index.html` e `web/standalone.html`.

**Prossimi step GLM (post-push):**
- Aspetta feedback di Claude su quanto pushato
- Se Claude pusha modifiche, fare `git pull --rebase origin main` prima di ripushare
- Quando arrivano i primi GLB reali → testarli in standalone.html e validare shader

**Note tecniche:**
- Bash tool si era bloccato a metà sessione precedente, ora recuperato.
- Verificato che la PAT ha scope corretto (Contents: Read/Write su TMMT-THE-GAME).
- Repo è pubblico quindi fetch/push funzionanti.

---

### Verdetto Claude (24 Giugno 2026, post-review commit f756b35)

> "Lavoro solido e coerente con l'architettura."

**Approvazioni:**
- ✅ T1 (web app): approvato così com'è
- ✅ T2 (Blender export): approvato così com'è

**3 decisioni prese da Claude:**

1. **Fix minore tecnico su Blender export**: il flag meshopt
   nell'export Blender nativo è di fatto gestito dal post-process
   gltf-transform (Blender nativo fa solo Draco, non Meshopt).
   → GLM ha fixato `blender_export.py` rimuovendo
   `export_mesh_extension: True` (era in realtà Draco, non Meshopt)
   e aggiunto `export_draco_mesh_compression_enable: False` con
   commento esplicito. Aggiornato anche `BLENDER.md` con sezione
   "Compression" corretta.

2. **Multi-mesh per outfit**: un **unico GLB per outfit** con dentro
   tutte le mesh nominate (vest, pantaloni, manichino). È esattamente
   come AtelierLoader già lavora (un look = un GLB = una `loadLook()`).
   NON file separati per capo. GLM ha aggiunto sezione esplicita
   "Struttura GLB: UN file per outfit (multi-mesh)" in `BLENDER.md`.

3. **T3 (garment-*.js deprecati)**: tenere come **reference silhouette**,
   non rimuovere. L'istinto di GLM era giusto.
   → GLM ha aggiunto header `// ⚠ DEPRECATED — REFERENCE ONLY`
   in cima ai 3 file `garment-bulk-shirt.js`, `garment-fur-coat.js`,
   `garment-scarf-vest.js`. Le funzioni `createBulkShirt()`,
   `createFurCoat()`, `createScarfVest()` restano esportate e
   sintatticamente valide (node --check OK) — utilizzabili se mai
   servisse in futuro per reference visivo.
   → Creato `glm work/README.md` con status completo di tutti i file
   della cartella (cosa è production, cosa è prototipo, cosa è rotto).

**Cosa serve da Claude in futuro:**
- Niente per ora. Quando Claude avrà il primo GLB reale dallo stadio 4
  (Blender), lo salva in `web/assets/looks/NN-slug.glb` e GLM aggiorna
  la `LOOKS` registry in `web/index.html` e `web/standalone.html`.

**Prossimi step GLM:**
- Aspetta il primo GLB reale
- Test in standalone.html
- Validazione shader sui materiali reali (denim/nylon/laser/fur)
- Iterazione sui parametri shader se la resa non convince Tommy

**Stato complessivo**: pipeline END-TO-END pronta. Mancano solo i GLB
reali dallo stadio 4 (Blender) per chiudere il cerchio.

---

### Update 24/06/2026 — Stadio 3 testato su outfit-01 (richiesta Tommy)

Tommy ha chiesto di scaricare Hunyuan3D-2 e convertire le foto dell'outfit-01 in 3D.

**Limitazione ambientale**: l'ambiente GLM non ha GPU CUDA. Hunyuan3D-2 richiede
minimo 8GB VRAM CUDA + PyTorch + pesi modello (~10GB). NON scaricabile e runnabile qui.

**Soluzione adottata**: Strada A dal piano di Claude (IMAGE_TO_3D.md) — usare lo
Hunyuan3D-2 Space ufficiale su Hugging Face via `gradio_client`. Stesso modello,
stessa qualità, zero installazione.

**Cosa è stato fatto:**
1. 4 foto iPhone 12 (3024×4032) preprocessate a 1024×1024 PNG (`scripts/preprocess.py`)
2. Script `scripts/to3d_hf.py` per automatizzare la chiamata allo Space
3. Endpoint `/shape_generation` usato (single-image mode, 4 mesh separate)
4. 4 mesh GLB generate in ~25 minuti totali:
   - `outfit-01_01-front.glb` (109k vertici, 5.7MB)
   - `outfit-01_02-side.glb` (94k vertici, 4.9MB)
   - `outfit-01_03-back.glb` (111k vertici, 5.9MB)
   - `outfit-01_04-detail.glb` (184k vertici, 9.8MB)
5. Bounds coerenti per front/side/back (~0.9m × 2m × 0.6m) → figura umana
6. `out/outfit-01/README.md` con stats e analisi bounds
7. `IMAGE_TO_3D.md` aggiornato con stato "Strada A testata e funzionante"

**Decisioni prese:**
- File mesh .gitignore-ati per default (pesanti), ma forzati in commit per outfit-01
  (pilota — Claude deve poterli ispezionare)
- Script `to3d_hf.py` ripetibile per outfit successivi: basta aggiungere foto in
  `pipeline/03_image_to_3d/in/` con naming `outfit-NN_NN-view.jpg` e rilanciare

**Cosa serve da Claude:**
- Ispezionare le 4 mesh in Blender (stadio 4)
- Scegliere la migliore come base (front/back hanno bounds coerenti)
- Oppure fonderle per ottenere mesh completa
- Decimate per ridurre polycount (100k → 20-30k vertici)
- Separare capo da manichino
- Rinominare mesh secondo convenzione AtelierLoader
- Export GLB via `pipeline/04_blender/blender_export.py`
- Salvare in `web/assets/looks/01-outfit-one.glb`

**Prossimi step GLM:**
- Aspetta che Claude processi le mesh in Blender
- Quando il primo GLB production-ready è in `web/assets/looks/`, aggiornare
  `LOOKS` registry in `web/index.html` e `web/standalone.html`
- Test visivo in standalone.html

**Per outfit successivi (02-12):**
- Tommy scatta 4 foto per outfit
- Tommy le mette in `/home/z/my-project/upload/`
- GLM rilancia `preprocess.py` + `to3d_hf.py`
- Stesso flusso, ~25 minuti per outfit

---

### Update 24/06/2026 — Sessione 2: image-to-image research + pipeline orchestrator

Tommy ha chiesto:
1. Preview delle 4 mesh già generate ✅ (`download/mesh-preview.html`)
2. Verifica quanti input accetta Hunyuan3D-2 → **5 input** (1 image + 4 multi-view)
3. Deep research image-to-image OS per gamificazione ✅
4. Test diversi modelli sullo stesso capo ✅ (parziale)
5. Fermarsi per spostarsi su computer con NVIDIA

**Cosa è stato fatto:**

1. **Preview mesh**: `download/mesh-preview.html` — visore 3D per le 4 mesh
   GLB di outfit-01 (front/side/back/detail). Auto-rotate, switch 1-4, wireframe W.

2. **Hunyuan3D-2 input check**: API ispezionata, confermato 5 input immagini:
   - `image` (principale)
   - `mv_image_front`, `mv_image_back`, `mv_image_left`, `mv_image_right` (multi-view)
   → Ha senso generare 4 viste gamified prima di passare al 3D.

3. **Deep research img2img OS**: top 5 candidates identificati:
   - `black-forest-labs/FLUX.1-Kontext-Dev` (non-commercial, best fidelity)
   - `InstantX/InstantStyle` (Apache-2.0, style transfer con reference)
   - `ByteDance-Seed/BAGEL` (Apache-2.0, instruction-based)
   - `akhaliq/AnimeGANv2` (one-click anime)
   - `timbrooks/instruct-pix2pix` (classic)
   Report completo: `/home/z/my-project/tool-results/img2img-os-research.md`

4. **Test A/B**: 2 modelli testati con successo su outfit-01/front:
   - `test-2-flux-kontext-attempt1.png` (1024×1024, 66KB) ← MIGLIORE
   - `test-4-animeganv2-version1.png` (512×512, 12KB)
   Gli altri (InstantStyle, BAGEL, AnimeGANv2 v2) sono falliti per
   ZeroGPU quota di HF Spaces.

5. **Pipeline orchestrator**: `pipeline/pipeline.py` — script unico che fa:
   - Stage 0 INGEST: copia da `/home/z/my-project/upload/` a `pipeline/01_capture/raw/NN/`
   - Stage 1 PREPROCESS: 1024×1024 PNG, EXIF stripped
   - Stage 2 GAMIFY: image-to-image con modello selezionabile
     (`--model flux-kontext|instantstyle|bagel|animeganv2`)
   - Stage 3 MESH: Hunyuan3D-2 → GLB
   Uso: `python pipeline.py --outfit 01 [--stage all|ingest|preprocess|gamify|mesh] [--model XXX]`

6. **Documentazione**:
   - `GUIDA_TOMMY.md`: istruzioni step-by-step per Tommy (dove mettere le foto, come lanciare)
   - `download/gamify-test-preview.html`: mock HTML per confrontare i 2 test gamified
   - Struttura cartelle per 12 outfit creata in `pipeline/01_capture/raw/` e `processed/`

**Problemi aperti identificati:**
1. **Crop quadrato**: FLUX-Kontext croppa a 1024×1024 perdendo persona intera
   (teste/piedi tagliati). Da fixare con padding o aspect ratio verticale.
2. **Manca avatar/persona**: le foto di dettaglio del capo non hanno viso.
   Per il gioco serve un personaggio TMMT che indossi i capi.
3. **HF Spaces quota**: senza GPU locale, limitati a ~90s/6h di ZeroGPU.
   Per batchare 12 outfit serve GPU locale.

**Cosa serve a GLM quando Tommy attiva GPU locale:**
- Avviso che siamo su computer con NVIDIA
- Verifica `nvidia-smi` + `torch.cuda.is_available()` per confermare
- A quel punto GLM installa dipendenze locali (torch+cuda, diffusers, etc.)
  e runna i modelli in locale senza quota HF

**Stato pipeline:**
```
[INGEST]      ✅ Script pronto (pipeline/pipeline.py)
[PREPROCESS]  ✅ Script pronto
[GAMIFY]      ⚠️  Funziona ma quota HF limita (1-2 foto per sessione)
                - FLUX-Kontext: ✓ better quality (non-commercial)
                - AnimeGANv2: ✓ one-click (research only)
                - InstantStyle, BAGEL: bloccati da quota
[MESH]        ✅ Hunyuan3D-2 testato su outfit-01 (4 mesh GLB generate)
                - Funziona bene anche con single-image
                - Con 4 viste gamified sarà ancora meglio
```


