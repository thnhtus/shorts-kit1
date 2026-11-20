# Colour and type

> Part of [`SOUL.md`](../../SOUL.md). This file holds **§6**. Values live in
> `src/shared/theme.ts` and `src/shared/font.ts`; this file holds the reasons.

---

## 6. Art direction & colour (`style`) [default]

A video declares a **style** from `docs/styles/` (`kit`, `midnight`, `aurora`, `ember`, `graphite`, `lime`, `paper`, `porcelain`, `sand`) in `narration.json` → `style` (or `video.json` → `style` for a voiceless promo). `kit` is the default (`DEFAULT_PALETTE` on the shared gradient `Backdrop`); the other eight wrap `LOOKS` + `Stage` + a matching caption skin in `src/shared/style/index.tsx`. The red-is-rare rule is **[craft]**.

| Role (`palette.*`) | `kit` default |
| --- | --- |
| Main line, highlight, current caption word (`accent`) | cyan `#3FD0FF` |
| Negation, the punch (`bad`) | red `#FF4D4D` |
| Measurement, warning (`warn`) | yellow `#FFC83D` |
| Positive / selected (`good`) | lime `#7BE07B` |
| Text (`text`) | white `#F4F7FB` (or ink on light styles) |
| Canvas (`bg`) | deep navy `#0B1016` (or the style's `Stage`) |

- **Red / `palette.bad` is reserved for the punch** ("0 bridges", the struck-out word). Used often, it loses its weight: the same economy as the strong word in §1b.
- **Never hex in scene code.** Scenes read `palette` (and optional `style`) from `SceneProps`, never importing a style, look, or colour literal.
- **One world per video.** Switching style mid-video (`scene.style` or `shot.style`) is only for a story that changes world (a demo inside the story, an archive plate). Switch on a cut or reveal, never on a continuous move, and keep a video within `maxStylesPerVideo` (2).
- When a background is uncontrolled (clips, GIFs) or light (`paper`, `porcelain`, `sand`), `style.caption` adjusts the caption stroke/shadow; still check contrast on rendered frames (§5e, §7).

## 6b. Fonts: ship them in the repo, never borrow the OS's [craft; font licence is hard]

The old stack was `-apple-system, BlinkMacSystemFont, "SF Pro Display", …`. On a
Mac it rendered SF Pro; on Windows none of the first four existed, so the browser
fell back to Segoe UI. Same commit, two machines, two typefaces, nothing reported.

It is not only looks. The fallback was **wider**, so a headline that fit on one line
on the Mac wrapped differently elsewhere, and every layout approved by eye on stills
was invalid. Measured pixel by pixel against the Mac render: mean difference 75.4/255
with the system font, 4.9/255 with a bundled font (the residue is anti-aliasing).

- **Bundle the font file** in `public/fonts/` with an open licence (Inter, any OFL
  family that covers your language's diacritics). `public/fonts/README.md` records
  where each file came from and its licence. Do not commit fonts you may not
  redistribute; a system font copied out of an OS is licensed for that OS only.
- **Pin variable-font axes** you depend on (optical size, width, grade) explicitly
  rather than relying on clamping to land on the default.
- **Block rendering until the font has loaded** (`delayRender` in `font.ts`).
  `@font-face` loads asynchronously and the renderer does not wait: the first frames
  draw in the fallback, then jump. It does **not** show in preview, because the font
  is already cached there.
- Swapping the font must be **one file and one line**, never a scene edit.
