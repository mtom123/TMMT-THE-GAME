# glm work/ — Status

> ⚠️ Questa cartella contiene i prototipi di GLM. Stato: **parzialmente deprecato**.

## Cosa contiene

| File | Stato | Note |
|------|-------|------|
| `AtelierLoader.js` | ✅ **PRODUCTION** | Copia identica in `web/AtelierLoader.js` — usare quella per nuovi progetti. Tenuto qui come reference originale. |
| `atelier-core.js` | ⚠️ Prototipo | Sistema shader inlined — la versione production è dentro `web/standalone.html`. |
| `mannequin.js` | ⚠️ Prototipo | Manichino procedurale. Sostituito da `mesh_skin_mannequin` GLB nella pipeline reale. |
| `garment-bulk-shirt.js` | 🚫 **DEPRECATED** | Capi procedurali. Tenuti solo come **reference silhouette** per chi sculpirà le mesh reali in Blender. |
| `garment-fur-coat.js` | 🚫 **DEPRECATED** | (vedi sopra) |
| `garment-scarf-vest.js` | 🚫 **DEPRECATED** | (vedi sopra) |
| `env-sewing-station.js` | ⚠️ Prototipo | Ambiente atelier — non più usato. |
| `env-cutting-table.js` | ⚠️ Prototipo | Ambiente atelier — non più usato. |
| `env-fabric-rack.js` | ⚠️ Prototipo | Ambiente atelier — non più usato. |
| `lookbook-3d.html` | 🚫 Rotto | Usa moduli ES esterni → non funziona via `file://`. Non usare. |
| `lookbook-final.html` | 🚫 Rotto | (vedi sopra) |
| `atelier.html` | ✅ Funziona | Versione self-contained, funziona via `file://`. Sozzo da `web/standalone.html` per la versione aggiornata. |
| `preview*.png` | ℹ️ Reference | Screenshot storici. |
| `index.html` | 🚫 Vecchio | Prima iterazione. Ignorare. |

## Regole d'uso

1. **Per production**: usa sempre `web/standalone.html` o `web/index.html`
2. **Per reference silhouette**: i file `garment-*.js` deprecati contengono
   posizioni/dimensioni/puffy amounts che possono informare il lavoro di
   scultura in Blender. Non importarli in codice production.
3. **Non rimuovere** i file deprecati senza conferma di Claude o Tommy.
4. **Per modifiche al loader**: edita `web/AtelierLoader.js` (copiando poi
   eventualmente in `glm work/AtelierLoader.js` se serve mantenere sync).

## Roadmap

- [x] Pipeline reale (`web/`) funzionante con placeholder GLB
- [ ] Sostituire i placeholder con i primi GLB reali da Blender
- [ ] Quando tutti i 12 look sono in production, valutare se rimuovere
      completamente questa cartella `glm work/` o tenerla come archivio
      storico dei prototipi
