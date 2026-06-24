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
(scrivi qui i tuoi aggiornamenti)
