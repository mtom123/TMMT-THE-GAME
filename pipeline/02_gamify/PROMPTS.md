# TMMT — Super-Prompts gamify (manuale, Nano Banana)

Pilota: **scarf-vest**. 3 stili da testare × 4 vedute = 12 prompt pronti.
Stile A è quello già validato (il render front che ci piace). B e C sono più "cartoon/Messenger".

## Come usarli (checklist veloce)

1. Su AI Studio / Gemini: modello **Nano Banana** (`gemini-2.5-flash-image`).
2. **Carica come riferimento** la/le foto reali del capo:
   - FRONT, SIDE, TOP → carica `front` reale.
   - BACK → carica `back` reale.
3. Genera **prima la FRONT** di uno stile. Scegli la migliore.
4. Per SIDE / BACK / TOP: carica **ANCHE la front approvata** come secondo riferimento
   (serve a tenere identici modello + capo tra le vedute). ← trucco-consistenza chiave.
5. Salva: `out/02-scarf-vest/<stile>/<veduta>.png` (es. `out/02-scarf-vest/A/front.png`).
6. Stesso modello per le 4 vedute di un outfit. Il modello PUÒ cambiare tra outfit diversi
   (modifica solo il blocco MODEL qui sotto).

> Nota: i prompt includono già il capo descritto 1:1. Se cambi modello, edita solo `MODEL:`.

---

## STILE A — Editorial Painterly (validato) ✅

**A · FRONT**
```
High-end hand-painted 2.5D game-character illustration — semi-realistic digital painting with smooth cel-style shading, subtle volumetric studio light, finely rendered fabric, delicate clean edges (NO thick cartoon outline). Muted refined fashion-editorial mood. Plain pale grey-white seamless backdrop. Looks like a premium next-gen RPG character render, not a photo.
MODEL: single full-body male model, athletic build, dark skin, short natural curly hair, small ear studs, calm confident expression, relaxed neutral A-pose, weight even. Keep this SAME model across all four views.
OUTFIT (reproduce 1:1, do NOT restyle, deep matte BLACK): (1) sleeveless padded/quilted nylon VEST, boxy cropped length, with a large oversized shawl-collar SCARF in the same quilted nylon wrapping the neck and crossing over the chest, one end hanging down the front; ribbed elasticated waistband at the vest hem. (2) cropped WIDE-LEG trousers in matching black quilted nylon with bold VERTICAL channel quilting top-to-bottom, two large front patch pockets, cropped above the ankle. (3) chunky black rubber ankle BOOTS with thick lug sole. Every quilted channel, seam, fold and pocket stays crisp and visible.
VIEW: FRONT, model facing camera directly, full head-to-toe, centered, generous margin. Small centered uppercase label at very top: "FRONT VIEW".
Avoid: photorealistic photo skin, extra garments, color changes, washed-out grey (keep true black), logos, text on clothing, distorted anatomy, melted/blurry quilting lines, busy background.
```

**A · SIDE**
```
High-end hand-painted 2.5D game-character illustration — semi-realistic digital painting with smooth cel-style shading, subtle volumetric studio light, finely rendered fabric, delicate clean edges (NO thick cartoon outline). Muted refined fashion-editorial mood. Plain pale grey-white seamless backdrop.
MODEL: SAME male model as the reference front image — athletic, dark skin, short curly hair, small ear studs, relaxed A-pose. Identical face and proportions.
OUTFIT (reproduce 1:1, deep matte BLACK): sleeveless quilted nylon vest with oversized shawl-collar scarf wrapping the neck; cropped wide-leg trousers with bold VERTICAL channel quilting and front patch pockets; chunky black rubber boots. Keep every quilted channel, seam and fold crisp.
VIEW: LEFT SIDE / profile view (rotated 90°), full head-to-toe, same scale and framing as the front. Small centered uppercase label at very top: "SIDE VIEW".
Avoid: photo skin, extra garments, color changes, grey wash, logos, text, distorted anatomy, melted quilting, busy background.
```

**A · BACK**
```
High-end hand-painted 2.5D game-character illustration — semi-realistic digital painting with smooth cel-style shading, subtle volumetric studio light, finely rendered fabric, delicate clean edges (NO thick cartoon outline). Muted refined fashion-editorial mood. Plain pale grey-white seamless backdrop.
MODEL: SAME male model as the reference images — athletic, dark skin, short curly hair, relaxed A-pose. Identical proportions.
OUTFIT (reproduce 1:1, deep matte BLACK): quilted nylon vest seen from behind (show the shawl-collar scarf and the vertical quilting of the back panel and the elasticated waistband); cropped wide-leg trousers with bold VERTICAL channel quilting; chunky black rubber boots. Keep seams and channels crisp.
VIEW: BACK view, model seen from directly behind, full head-to-toe, same scale. Small centered uppercase label at very top: "BACK VIEW".
Avoid: photo skin, extra garments, color changes, grey wash, logos, text, distorted anatomy, melted quilting, busy background.
```

**A · TOP**
```
High-end hand-painted 2.5D game-character illustration — semi-realistic digital painting with smooth cel-style shading, subtle volumetric studio light, finely rendered fabric, delicate clean edges (NO thick cartoon outline). Muted refined fashion-editorial mood. Plain pale grey-white seamless backdrop.
MODEL: SAME male model as the reference front image, identical face and proportions.
OUTFIT (reproduce 1:1, deep matte BLACK): quilted nylon vest with oversized shawl-collar scarf; vertical-quilted wide-leg trousers; black boots. Keep quilting and folds crisp.
VIEW: high TOP-DOWN three-quarter view looking down onto the head and shoulders, emphasizing the shawl-collar scarf wrap and shoulder construction, same model and outfit. Small centered uppercase label at very top: "TOP VIEW".
Avoid: photo skin, extra garments, color changes, grey wash, logos, text, distorted anatomy, melted quilting, busy background.
```

---

## STILE B — Messenger Cel (cartoon, sfondo acquerello)

> Più piatto e grafico, outline marcato, sfondo acquerellato come il gioco *Messenger*. Capo fedele.

**B · FRONT**
```
Stylized cel-shaded CARTOON character in the look of the indie game "The Messenger" by Abeto: clean bold dark outlines of even weight, flat color fills with 2 tonal bands, simple soft cel shadows, gentle hand-painted WATERCOLOUR background in muted cool tones, slight paper texture. Charming animation-still feel. Natural adult proportions (NOT chibi). The garment stays 100% faithful and detailed despite the flatter shading.
MODEL: single full-body male model, athletic, dark skin, short natural curly hair, small ear studs, calm expression, relaxed A-pose. Keep this SAME model across all four views.
OUTFIT (reproduce 1:1, deep BLACK): sleeveless quilted nylon vest with a large oversized shawl-collar scarf wrapping the neck and crossing the chest, elasticated waist; cropped WIDE-LEG trousers with bold VERTICAL channel quilting drawn as clean parallel lines, two front patch pockets; chunky black rubber boots. Keep every quilted channel and seam readable as crisp line work.
VIEW: FRONT, facing camera, full head-to-toe, centered. Small centered uppercase label at top: "FRONT VIEW".
Avoid: photorealism, color changes, grey wash, logos, text, chibi/childish proportions, messy lines, cluttered background.
```

**B · SIDE**
```
Stylized cel-shaded cartoon in the "The Messenger" (Abeto) look: bold even dark outlines, flat 2-band color, soft cel shadows, muted watercolour background, paper texture. Natural adult proportions. Garment 100% faithful.
MODEL: SAME male model as the reference front image, identical face and proportions, relaxed A-pose.
OUTFIT (1:1, deep BLACK): quilted nylon vest + oversized shawl-collar scarf; cropped wide-leg trousers with bold VERTICAL channel quilting (clean parallel lines) and front pockets; chunky black boots.
VIEW: LEFT SIDE / profile (rotated 90°), full head-to-toe, same scale as front. Label at top: "SIDE VIEW".
Avoid: photorealism, color changes, grey wash, logos, text, chibi proportions, messy lines, cluttered background.
```

**B · BACK**
```
Stylized cel-shaded cartoon in the "The Messenger" (Abeto) look: bold even dark outlines, flat 2-band color, soft cel shadows, muted watercolour background, paper texture. Natural adult proportions. Garment 100% faithful.
MODEL: SAME male model as the reference images, identical proportions.
OUTFIT (1:1, deep BLACK): quilted vest from behind (show shawl-collar scarf, back-panel vertical quilting, elasticated waistband); wide-leg trousers with bold VERTICAL channel quilting; black boots.
VIEW: BACK, seen from directly behind, full head-to-toe, same scale. Label at top: "BACK VIEW".
Avoid: photorealism, color changes, grey wash, logos, text, chibi proportions, messy lines, cluttered background.
```

**B · TOP**
```
Stylized cel-shaded cartoon in the "The Messenger" (Abeto) look: bold even dark outlines, flat 2-band color, soft cel shadows, muted watercolour background, paper texture. Natural adult proportions. Garment 100% faithful.
MODEL: SAME male model as the reference front image, identical face and proportions.
OUTFIT (1:1, deep BLACK): quilted vest with oversized shawl-collar scarf; vertical-quilted wide-leg trousers; black boots.
VIEW: high TOP-DOWN three-quarter view onto head and shoulders, emphasizing the scarf wrap. Label at top: "TOP VIEW".
Avoid: photorealism, color changes, grey wash, logos, text, chibi proportions, messy lines, cluttered background.
```

---

## STILE C — Clean Vector Toon (il più gamified)

> Massima resa "avatar di gioco": outline netto uniforme, blocchi di colore piatti, quilting come tratti puliti. Capo sempre esatto.

**C · FRONT**
```
Crisp flat VECTOR TOON / mobile-game character art: uniform clean black outline, bold flat color blocks, minimal gradients, soft ambient occlusion only inside deep folds, flat off-white background. Bright, readable, sticker-like modern fashion-game avatar. Realistic adult proportions. The garment silhouette and all key details remain exact.
MODEL: single full-body male model, athletic, dark skin, short natural curly hair, small ear studs, calm expression, relaxed A-pose. Keep this SAME model across all four views.
OUTFIT (reproduce 1:1, deep BLACK): sleeveless quilted nylon vest with large oversized shawl-collar scarf wrapping the neck, elasticated waist; cropped WIDE-LEG trousers with bold VERTICAL channel quilting drawn as clean parallel strokes, two front patch pockets; chunky black rubber boots with thick sole. Quilting lines clean and accurate, not melted.
VIEW: FRONT, facing camera, full head-to-toe, centered. Small centered uppercase label at top: "FRONT VIEW".
Avoid: photorealism, gradients-heavy painting, color changes, grey wash, logos, text, distorted anatomy, blurry/melted quilting, busy background.
```

**C · SIDE**
```
Crisp flat vector toon / mobile-game character art: uniform clean black outline, bold flat color blocks, minimal gradients, AO only in deep folds, flat off-white background. Realistic adult proportions. Garment exact.
MODEL: SAME male model as the reference front image, identical face and proportions, relaxed A-pose.
OUTFIT (1:1, deep BLACK): quilted vest + oversized shawl-collar scarf; cropped wide-leg trousers with bold VERTICAL channel quilting (clean parallel strokes) and front pockets; chunky black boots.
VIEW: LEFT SIDE / profile (rotated 90°), full head-to-toe, same scale as front. Label at top: "SIDE VIEW".
Avoid: photorealism, heavy gradients, color changes, grey wash, logos, text, distorted anatomy, melted quilting, busy background.
```

**C · BACK**
```
Crisp flat vector toon / mobile-game character art: uniform clean black outline, bold flat color blocks, minimal gradients, AO only in deep folds, flat off-white background. Realistic adult proportions. Garment exact.
MODEL: SAME male model as the reference images, identical proportions.
OUTFIT (1:1, deep BLACK): quilted vest from behind (shawl-collar scarf, back-panel vertical quilting, elasticated waistband); wide-leg trousers with bold VERTICAL channel quilting; black boots.
VIEW: BACK, seen from directly behind, full head-to-toe, same scale. Label at top: "BACK VIEW".
Avoid: photorealism, heavy gradients, color changes, grey wash, logos, text, distorted anatomy, melted quilting, busy background.
```

**C · TOP**
```
Crisp flat vector toon / mobile-game character art: uniform clean black outline, bold flat color blocks, minimal gradients, AO only in deep folds, flat off-white background. Realistic adult proportions. Garment exact.
MODEL: SAME male model as the reference front image, identical face and proportions.
OUTFIT (1:1, deep BLACK): quilted vest with oversized shawl-collar scarf; vertical-quilted wide-leg trousers; black boots.
VIEW: high TOP-DOWN three-quarter view onto head and shoulders, emphasizing the scarf wrap. Label at top: "TOP VIEW".
Avoid: photorealism, heavy gradients, color changes, grey wash, logos, text, distorted anatomy, melted quilting, busy background.
```

---

## Per gli altri 11 outfit
Tieni i blocchi STYLE e VIEW identici. Cambia SOLO il blocco `OUTFIT (reproduce 1:1 ...)` con la
descrizione del nuovo capo, e (se vuoi) il blocco `MODEL`. Così gli stili restano coerenti su tutta
la collezione. Quando scegliamo lo stile vincente, lo blocco in `style_bible.md` per il batch.
