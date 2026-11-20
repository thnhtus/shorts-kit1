/**
 * `bun run anim <spec.json>`: render one animated preset (src/anim) to
 * out/anim/<name>.mp4 and a contact sheet with the Instagram safe zone.
 *
 *   spec.json: {"preset": "graph", ...fields from the preset's defaults}
 */
import {readdirSync, readFileSync} from "node:fs";
import {basename, join} from "node:path";
import {ensureDir, die, p} from "./lib/paths";
import {duration, must, run} from "./lib/proc";

const file = process.argv[2];
if (!file) die("usage: bun run anim <spec.json>");
const spec = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
const {preset: rawPreset, ...fields} = spec;
const preset = String(rawPreset ?? "");
// one preset per src/anim/<id>.tsx (file name = composition id)
const ids = readdirSync(p("src/anim")).filter((f) => f.endsWith(".tsx") && f !== "Root.tsx").map((f) => f.slice(0, -4));
if (!ids.includes(preset)) die(`spec "preset" must be one of: ${ids.join(", ")}`);

const name = basename(file).replace(/\.json$/, "");
const out = ensureDir(p("out", "anim"));
const mp4 = join(out, `${name}.mp4`);
const props = JSON.stringify({spec: fields});

const r = await run(p("node_modules/.bin/remotion"), ["render", "src/anim/Root.tsx", preset, mp4, "--codec=h264", `--props=${props}`], {inherit: true, timeoutMs: 20 * 60_000});
if (r.code !== 0) die(`remotion render exited ${r.code}`);
console.log(`+ out/anim/${name}.mp4  ${(await duration(mp4)).toFixed(2)} s`);

// contact sheet: 6 frames across, safe zone (top 220, bottom 1500, side 100) drawn in red
const sheet = join(out, `${name}-sheet.png`);
const t = await duration(mp4);
const vf = [
  `fps=${(6 / t).toFixed(4)}`,
  "scale=270:480",
  "drawbox=x=27:y=55:w=216:h=325:color=red@0.8:t=2",
  "tile=6x1",
].join(",");
await must("ffmpeg", ["-v", "error", "-y", "-i", mp4, "-vf", vf, "-frames:v", "1", sheet], {timeoutMs: 120_000});
console.log(`+ out/anim/${name}-sheet.png (red = safe zone). Open it and look.`);
