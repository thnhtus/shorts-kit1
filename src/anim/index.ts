/**
 * Animated presets: the quick "one spec in, one clip out" styles from
 * claude-animation-skills (MIT, vendor/claude-animation-skills), ported to
 * Remotion so they render with the kit's own toolchain (no HyperFrames, GSAP
 * or Python).
 *
 * Each preset is one 9:16 component in src/anim/<id>.tsx driven by a JSON spec
 * with the same field names as the source skill. `bun run anim <spec.json>`
 * renders it to out/anim/<name>.mp4 plus a contact sheet.
 *
 * A preset is a clip, not a video: no narration, no fact ledger, no hand-off.
 * A narrated short still goes through sk-pipeline; a preset clip can be used
 * inside it as b-roll only if its numbers have ledger records.
 */
import type React from "react";

export type Spec = Record<string, unknown>;

export type Preset = {
  id: string;
  label: string;
  blurb: string;
  defaults: Spec;
  /** Clip length in seconds, before `hold`. */
  seconds: (spec: Spec) => number;
  /** Throw a readable error when the spec cannot render. */
  check?: (spec: Spec) => void;
  Component: React.FC<{spec: Spec}>;
};

import {graph} from "./graph";
import {danKoe} from "./dan-koe";
import {minimalisticGraphics} from "./minimalistic-graphics";
import {kurzgesagt} from "./kurzgesagt";
import {mapRoute} from "./map-route";
import {breakdown} from "./breakdown";
import {lowPoly} from "./low-poly";
import {minecraft} from "./minecraft";

export const PRESET_LIST: Preset[] = [graph, danKoe, minimalisticGraphics, kurzgesagt, mapRoute, breakdown, lowPoly, minecraft];

export const PRESETS: Record<string, Preset> = Object.fromEntries(PRESET_LIST.map((p) => [p.id, p]));
export const PRESET_IDS = PRESET_LIST.map((p) => p.id);

/** Spec helpers: read a field with a type, falling back to a default. */
export const str = (s: Spec, k: string, d = "") => (typeof s[k] === "string" ? (s[k] as string) : d);
export const num = (s: Spec, k: string, d = 0) => (typeof s[k] === "number" ? (s[k] as number) : d);
export const bool = (s: Spec, k: string, d = false) => (typeof s[k] === "boolean" ? (s[k] as boolean) : d);
export const strs = (s: Spec, k: string) => (Array.isArray(s[k]) ? (s[k] as unknown[]).map(String) : []);
