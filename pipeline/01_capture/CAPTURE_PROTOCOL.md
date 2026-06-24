# Stadio 1 — Protocollo di Cattura

Obiettivo: foto del capo reale **ripetibili al 100%** tra un outfit e l'altro. La consistenza
dello stadio 2 (gamify) dipende quasi interamente dalla consistenza di queste foto.

## Setup fisso (uguale per tutti i 12 capi)

- **Sfondo:** neutro uniforme — bianco o grigio chiaro liscio (un lenzuolo/cartoncino va benissimo).
- **Luce:** diffusa e frontale, niente ombre dure. Vicino a una finestra con tenda, o due luci ai 45°.
  Evita luce mista (finestra + lampada calda insieme) → cambia i colori tra uno scatto e l'altro.
- **Fotocamera:** stessa distanza, stessa altezza (treppiede o un segno per terra). Telefono va bene.
  Disattiva i filtri/"beautify". Formato verticale.
- **Esposizione/bilanciamento bianco:** se il telefono lo permette, **blocca** AE/AWB (tieni il dito
  premuto sul soggetto) così tutte le foto hanno la stessa luminosità/temperatura colore.

## Come indossare il capo

Il modo migliore per la fedeltà è su **manichino** o su una **persona** in posa neutra (A-pose:
braccia leggermente staccate dal corpo, gambe a larghezza spalle, sguardo avanti). Se usi una persona,
**stessa persona/posa per tutti i capi** → il personaggio gamified resta coerente.

In alternativa, "flat lay" (capo steso) funziona per lo stadio 3 ma perde i volumi → preferisci indossato.

## Le 4 viste da scattare (per ogni capo)

Scatta **esattamente** queste 4, con questi nomi file:

| Vista | Nome file | Note |
|-------|-----------|------|
| Fronte | `front.jpg` | soggetto centrato, intero dalla testa ai piedi |
| Lato (sinistro) | `side.jpg` | profilo a 90°, stessa centratura |
| Retro | `back.jpg` | di spalle |
| Dall'alto | `top.jpg` | opzionale ma utile per colli/sciarpe/spalle |

Il soggetto sta fermo e **ruota lui** (o ruoti tu attorno) — la luce non si tocca.

## Dove salvarle

```
pipeline/02_gamify/in/<NN>-<slug>/
    front.jpg
    side.jpg
    back.jpg
    top.jpg
```

Esempio: `pipeline/02_gamify/in/02-scarf-vest/front.jpg`

## Checklist rapida prima di scattare

- [ ] Sfondo pulito e uniforme
- [ ] AE/AWB bloccati
- [ ] Capo senza pieghe indesiderate, etichette nascoste
- [ ] Inquadratura intera con un po' di margine attorno
- [ ] Le 4 viste con la stessa distanza/altezza
