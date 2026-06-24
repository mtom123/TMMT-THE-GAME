# Stadio 2 — Gamify automatico (nano-banana)

Trasforma le foto reali di un capo in 4 viste gamified consistenti, in batch.

## Setup (una volta sola)

```bash
pip install -r requirements.txt
# Gemini API key da https://aistudio.google.com/apikey
#  PowerShell:  $env:GEMINI_API_KEY="la-tua-chiave"
#  Git Bash:    export GEMINI_API_KEY=la-tua-chiave
cp config.example.json config.json   # già fatto
```

## Workflow

1. Metti le foto del capo in `in/<NN>-<slug>/` (`front.jpg`, `side.jpg`, `back.jpg`, `top.jpg`)
   secondo `../01_capture/CAPTURE_PROTOCOL.md`.
2. (Opz.) Aggiorna `style_anchors/` con i frame già approvati e referenziali in `config.json → anchors`.
   Già pre-caricato: `scarfvest_front.png` (la tua tavola fatta a mano).
3. Lancia:
   ```bash
   python gamify.py --outfit 02-scarf-vest      # un capo
   python gamify.py --all                        # tutti i capi in ./in
   python gamify.py --outfit 02-scarf-vest --overwrite   # rigenera
   ```
4. Risultati in `out/<outfit>/{front,side,back,top}.png`.

## Come ottiene la consistenza

| Leva | Dove |
|------|------|
| Style spec bloccata | `style_bible.md` → blocco `## STYLE_SPEC`, identico ad ogni chiamata |
| Immagini-ancora di stile | `config.json → anchors`, passate ad **ogni** generazione |
| Figura/posa identica | imposte nello style spec ("SAME model ... A-pose") |
| Capo identico tra viste | **view-chaining**: la `front` gamificata è data come ref a side/back/top |

## Tuning

- Lo stile non ti convince? Cambia poche parole in `style_bible.md` e rigenera **solo il pilota**
  con `--overwrite`. Itera finché la `front` è perfetta, poi sblocca le altre viste/outfit.
- Personaggio incoerente tra outfit? Genera una volta una "model sheet" del modello a posa neutra
  e aggiungila come anchor fisso per tutti.
- Costo: ~4 immagini per outfit × 12 = ~48 generazioni. Modello `gemini-2.5-flash-image`.

## Note

- `config.json` e `in/`, `out/` sono ignorati da git (vedi `.gitignore`). Versiona solo
  `style_bible.md`, lo script e gli anchor scelti.
- Se una vista manca tra le foto, lo script usa la `front.jpg` come fallback di input.
