# Styles: `docs/styles/`

A style is **the art direction of a whole video**: the palette, the type scale, the
backdrop (light, space, grain) and the dress of the running caption. It is one of the
two independent axes of a video — flow is how you tell the story, style is how it
looks. General rules live in [`docs/soul/04-color-and-type.md`](../soul/04-color-and-type.md) §6.

**Declare it once, early.** Write the style id in `narration.json` → `style` (or
`video.json` → `style` for a voiceless promo) and `bun run new --style <id>` scaffolds
it. The registry is `src/shared/style/index.tsx`; the ids are the file names here.

**One world per video.** Switching style inside a video is for a story that truly
changes world (a demo inside the story, an archive plate). Lint warns above
`maxStylesPerVideo` (2) and on a switch that rides a continuous move: cut or reveal.

**Never hex in scene code.** A scene reads `palette` and `style.type` from
`SceneProps`; it does not import a style, a look or a colour (§6).

| id | one line |
|---|---|
| [`kit`](./kit.md) | the channel's own palette and gradient; the default |
| [`midnight`](./midnight.md) | deep blue night: tech, AI, data |
| [`aurora`](./aurora.md) | purple-pink light: launches, brand, magic |
| [`ember`](./ember.md) | warm black + orange: impact, speed, energy |
| [`graphite`](./graphite.md) | near-monochrome dark, white accent: cinematic, premium |
| [`lime`](./lime.md) | graphite base + neon yellow-green: sports, data impact |
| [`paper`](./paper.md) | warm paper + ink + vermilion: editorial, humanities |
| [`porcelain`](./porcelain.md) | cool white + cobalt: SaaS, interaction demos |
| [`sand`](./sand.md) | beige + terracotta: warm, lifestyle, soft |

Try them on the style gallery: `bun run dev gallery`, composition `Styles`.
