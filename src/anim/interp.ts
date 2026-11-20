/**
 * Interpolation helpers for the animated preset scenes (port of the
 * claude-animation-skills quick styles). These are frame-pure: every value
 * is a function of `frame` only, so Remotion can render any frame and shots
 * stay deterministic. Keep no module-level mutable state here.
 */
import {Easing, interpolate} from "remotion";

export const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

/** 0→1 over `frames` starting at `from`, eased. */
export const ramp = (frame: number, from: number, frames: number, easing = Easing.inOut(Easing.cubic)) =>
  interpolate(frame, [from, from + Math.max(1, frames)], [0, 1], {...clamp, easing});

/** Easing helpers (GSAP-style, frame-pure). */
export const powOut = (n = 2) => (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), n);
export const powIn = (n = 2) => (x: number) => Math.pow(Math.min(1, Math.max(0, x)), n);
export const backOut = (s = 1.70158) => (x: number) => { const t = Math.min(1, Math.max(0, x)); return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
export const easeNone = (x: number) => Math.min(1, Math.max(0, x));

/** Ease a value from a→b between two frame ranges. */
export const glide = (
  frame: number,
  [f0, f1]: [number, number],
  [a, b]: [number, number],
  easing = Easing.inOut(Easing.cubic),
) => interpolate(frame, [f0, f1], [a, b], {...clamp, easing});

/** Fade in over `frames` from `from`. */
export const fadeIn = (frame: number, from: number, frames = 10) => ramp(frame, from - frames, frames, Easing.out(Easing.cubic));

/** A deterministic PRNG (mulberry32) for seeded randomness. */
export const seeded = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Format a number with grouping and optional decimals. */
export const fmtNum = (x: number, decimals = 0) =>
  x.toLocaleString("en-US", {minimumFractionDigits: decimals, maximumFractionDigits: decimals});

/** Scale a big display number down so it fits `maxWidth` (rough em estimate). */
export const fitSize = (s: string, maxWidth: number, base = 180) => {
  let em = 0;
  for (const ch of s) em += /[0-9]/.test(ch) ? 0.56 : /[,.]/.test(ch) ? 0.24 : /[A-Z$€£%+]/.test(ch) ? 0.62 : 0.54;
  return Math.min(base, maxWidth / Math.max(1, em));
};
