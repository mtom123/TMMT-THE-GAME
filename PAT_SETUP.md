# TMMT — Guida PAT GitHub per Tommy

Tommy, questa è la guida rapida per creare e inserire la PAT (Personal Access Token)
che serve a GLM per pushare sul repo `mtom123/TMMT-THE-GAME`.

> ✅ **Stato**: PAT già creata e configurata da Tommy nella sessione del 24 Giugno 2026.
> Questa guida rimane come reference per future rotazioni/revocation.

## 1. Crea la PAT su GitHub (2 minuti)

1. Vai su https://github.com/settings/tokens?type=beta (devi essere loggato come `mtom123`)
2. Click **"Generate new token"**
3. Compila così:
   - **Token name**: `TMMT GLM PAT`
   - **Expiration**: 90 days (o quello che preferisci)
   - **Repository access**: ✅ "**Only select repositories**" → seleziona `mtom123/TMMT-THE-GAME`
   - **Repository permissions**:
     - **Contents**: `Read and write` (per pushare)
     - Tutto il resto: `No access` (default)
   - **Account permissions**: nessuna (lascia tutto a `No access`)
4. Click **"Generate token"**
5. **COPIA SUBITO** il token (`github_pat_xxxxxxxxxxxxxxxxxx...`). Non lo rivedrai più.

> ⚠️ Importante: NON committare MAI questo token in un file dentro il repo.
> Se lo fai per sbaglio, GitHub lo revoca automaticamente e devi rifarlo.

## 2. Passa il token a GLM

Copia la stringa del token e incollala in chat.
GLM la userà SOLO per configurare il `git remote` del clone locale, non la salverà in nessun file.

Formato esempio del messaggio:
```
PAT: github_pat_1234567890abcdef...xyz
```

## 3. Cosa fa GLM col token

Dentro la sua working directory (`/home/z/my-project/tmmt-repo/`), esegue:

```bash
git remote set-url origin https://mtom123:<PAT>@github.com/mtom123/TMMT-THE-GAME.git
```

Questo fa in modo che `git push` verso `origin` si autentichi con la PAT.
La PAT NON viene salvata in nessun file tracciato da git (solo nella `.git/config` locale,
che è nel `.gitignore` implicito di git).

## 4. Verifica post-setup

Dopo che GLM ha configurato il remote, deve fare un test push:

```bash
cd /home/z/my-project/tmmt-repo
git pull --rebase origin main
git push origin main
```

Se il push va a buon fine, la PAT è configurata correttamente.

## 5. Revoca la PAT (se serve)

Se in futuro vuoi revocare il token (es. GLM non lavora più al progetto, token leakato):

1. Vai su https://github.com/settings/tokens?type=beta
2. Trova "TMMT GLM PAT"
3. Click **"Revoke"**
4. Eventualmente genera una nuova PAT e ripeti il setup

## Regole d'oro di collaborazione con Claude + GLM

- **Branch**: lavoriamo entrambi su `main` ma facciamo `git pull --rebase origin main` PRIMA di ogni push
- **Cartelle riservate**:
  - Claude scrive in: `pipeline/02_gamify/`, `pipeline/03_image_to_3d/`
  - GLM scrive in: `web/`, `glm work/`, `pipeline/04_blender/`
  - Nessuno tocca le cartelle dell'altro senza segnalarlo nel `GLM_HANDOFF.md > Log GLM`
- **Commit messages**: chiari e descrittivi, esempio:
  - `feat(web): aggiunto standalone.html con AtelierLoader inlined`
  - `docs(pipeline): aggiunto BLENDER.md con naming convention`
  - `fix(atelier): corretto silverMat non dichiarato in createAtelierRoom`
- **Push frequency**: spingi subito quando un task è completo, non accumulare 10 commit locali
