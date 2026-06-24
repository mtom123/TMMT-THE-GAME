# TMMT — Digital Twin Pipeline

> Dalla foto del capo reale al gioco 3D nel browser, in modo **automatizzato** e **consistente**.
> Estetica target: cel-shading "fatto a mano" stile *Messenger* (abeto.co) + Inverted Hull outline.
> Look del brand: **Thermal Brutalism** — lancio Settembre 2026.

## I 5 stadi

| # | Stadio | Input | Output | Tool | Stato |
|---|--------|-------|--------|------|-------|
| 1 | **Cattura** | capo reale | foto standardizzate | fotocamera/telefono + protocollo | 📋 `01_capture/CAPTURE_PROTOCOL.md` |
| 2 | **Gamify** ★ | foto reali | 4 viste gamified consistenti | nano-banana (Gemini 2.5 Flash Image) via API | 🟢 `02_gamify/` |
| 3 | **Image→3D** | 4 viste | mesh grezza | Tripo / Rodin / Hunyuan3D-2 | 📋 `03_image_to_3d/IMAGE_TO_3D.md` |
| 4 | **Blender** | mesh grezza | `.glb` con naming corretto | Blender 4.2 LTS + script Python | ⏳ da fare |
| 5 | **Web** | `.glb` | gioco 3D | three.js `AtelierLoader.js` (già pronto) | ✅ esiste |

★ = collo di bottiglia attuale, dove partiamo.

## Principio guida: consistenza prima di tutto

Il motivo per cui 1 outfit ha richiesto tantissimo tempo è che ogni immagine veniva trattata
come un caso isolato. La pipeline elimina questo: **stesso modello, stessa luce, stesso stile,
stesse 4 viste** per tutti i 12 outfit, definiti una volta sola e riapplicati in batch.

## Naming dei capi (usato in tutti gli stadi)

Cartella per outfit: `<NN>-<slug>` es. `02-scarf-vest`, `09-bigfoot-fur-coat`.
Materiale dominante del capo (serve allo stadio 4/5): `nylon`, `denim`, `laser`, `fur`.

## Come procedere ORA

1. Leggi `01_capture/CAPTURE_PROTOCOL.md` e fotografa **un** capo pilota (consiglio: scarf-vest, che hai già gamificato → ci confrontiamo col risultato fatto a mano).
2. Ottieni una **Gemini API key** (https://aistudio.google.com/apikey) e impostala.
3. Lancia lo stadio 2 (`02_gamify/`) → ottieni le 4 viste automatiche.
4. Validiamo la consistenza, poi passiamo allo stadio 3.
