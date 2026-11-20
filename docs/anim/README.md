# Animated presets (`src/anim/`)

The "quick" styles from [claude-animation-skills](https://github.com/artemnovitckii/claude-animation-skills)
(MIT, kept for reference in `vendor/claude-animation-skills/`), ported to Remotion so
they render with this kit's own toolchain — no HyperFrames, GSAP or Python.

Each preset is one 9:16 component in `src/anim/<id>.tsx`, driven by a JSON spec
with the same field names as the source skill.

## Render one

```bash
bun run anim <spec.json>
```

The spec has the shape `{"preset": "<id>", ...fields}`. It renders to
`out/anim/<name>.mp4` plus a contact sheet `out/anim/<name>-sheet.png` (six
frames tiled 6x1, red box = safe zone).

Example:

```bash
cat > /tmp/g.json <<'JSON'
{"preset":"graph","label":"Views","values":[1.2,2.1,3.4,5,9,24,51,78,100],"final":100,"prefix":"","suffix":"K","decimals":0,"dark":true}
JSON
bun run anim /tmp/g.json
```

## Presets

| id | label | what it shows | key spec fields |
|---|---|---|---|
| `graph` | Line graph | a smooth line draws itself, one big number counts up | `label`, `values[]`, `final`, `prefix`, `suffix`, `decimals`, `dark` |
| `map-route` | Map route | white 3D city, route draws, pin drops, ETA card | `destination`, `minutes`, `distance`, `unit`, `places[]`, `accent`, `seed` |
| `breakdown` | Breakdown | phone explodes layer by layer with callouts | `title`, `subtitle`, `labels[6]` `{name, note}`, `time`, `date`, `accent` |
| `dan-koe` | Dan Koe tree | black-and-white branching tree, tips light up | `lines[]`, `depth`, `seed`, `light` |
| `minimalistic-graphics` | Minimal steps | a dot hops up the steps and lands the line | `lines[]`, `steps`, `light` |
| `kurzgesagt` | Kurzgesagt planets | flat-vector planets to scale between Earth and Moon | `lines[]`, `tag` |
| `low-poly` | Low poly | PS1-style dog waits at a train platform | `lines[]`, `sign`, `prev`, `next`, `snow` |
| `minecraft` | Minecraft | a voxel cottage builds itself, then lights up | `lines[]` |

## Relationship to the shorts pipeline

A preset is a **clip**, not a video: no narration, no fact ledger, no hand-off.
A narrated short still goes through `sk-pipeline`. A preset clip can be used
inside a video as b-roll only if every number it shows has a record in
`docs/facts/` (§9). Style rules from the source skills (e.g. one number per line,
no marketing chips, hairline-only line art) are preserved per preset.
