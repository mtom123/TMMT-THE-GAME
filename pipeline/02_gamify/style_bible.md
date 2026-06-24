# TMMT — Style Bible (gamify)

Questo testo è la **fonte di verità** dello stile gamified. È incollato, identico, in ogni
chiamata API dello stadio 2. Modifica QUI, mai nel codice. Lo script lo legge da questo file.

> Editing rule: cambia poche parole alla volta e rigenera lo stesso capo pilota, così vedi
> l'effetto di ogni modifica mantenendo tutto il resto costante.

---

## STYLE_SPEC (incollato in ogni prompt)

Art style: clean hand-drawn 2.5D video-game illustration, in the style of a modern indie
adventure game. Bold but soft black ink outlines of even weight, flat cel-shading with two to
three tonal bands, gentle hand-painted gradients, subtle paper-grain texture. NOT photorealistic,
NOT 3D-render, NOT anime, NOT cartoon-cute. Editorial fashion-lookbook framing.

Brand: TMMT — "Thermal Brutalism". Mood: restrained, architectural, artisanal. Reproduce the
garment's TRUE colors faithfully (deep rich blacks must stay black, not washed out to grey).
Overall scene stays muted and desaturated — no invented bright/saturated colors, off-white backdrop.

Subject: a single full-body male fashion model, athletic build, dark skin, short natural curly
hair, neutral confident expression, standing in a relaxed A-pose (arms slightly away from the
torso, legs shoulder-width, weight even). The SAME model and the SAME body proportions in every
image. Plain off-white seamless background, soft even studio light, no cast shadows on the floor.

Garment fidelity (critical): reproduce the EXACT garment in the reference photo — same silhouette,
length, proportions, collar/closure, seams, drape, fabric texture and color, and every distinctive
detail (e.g. pinstripes, quilting, scarf wrap, cropped wide trousers, boots). Keep it recognizable
1:1 as that real piece, only re-rendered in the illustration style. Do not invent or restyle the
garment. Do not add logos or text on the garment. Preserve construction detail crisply: every
quilted channel and seam line, padding volume, scarf/shawl-collar wrap and folds, pockets,
waistband, trouser break, and the boots' shape and sole — these details must read clearly, drawn
with fine secondary line work, not flattened away. Keep the model's accessories (e.g. earrings).

Output: one figure, centered, full head-to-toe, generous margin around the figure.

---

## VIEW_INSTRUCTIONS (una per vista, aggiunta dopo lo STYLE_SPEC)

- **front**: Front view, the model facing the camera directly.
- **side**:  Left side / profile view (rotated 90°), same model, same garment, same style and scale.
- **back**:  Back view, the model seen from directly behind, same garment, same style and scale.
- **top**:   High top-down three-quarter view looking down on the shoulders and head, same model
  and garment, emphasizing collar/neck/shoulder construction, same style and scale.

## HEADER (etichetta in alto, opzionale — replica le tue tavole esistenti)

Testo piccolo in alto centrato, maiuscolo, font tecnico: `FRONT VIEW` / `LEFT SIDE VIEW` /
`BACK VIEW` / `TOP VIEW`. Disattivabile da config (`"draw_header": false`).
