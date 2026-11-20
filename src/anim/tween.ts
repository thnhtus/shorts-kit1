/**
 * A tiny GSAP-timeline stand-in: tweens on named props, evaluated per frame.
 * Tweens on the same prop run in order; each one starts from the value the
 * prop has when it starts. Frame-pure, no state.
 */
export type Tw = {p: string; at: number; d: number; to: number; e?: (x: number) => number};

export const out = (pow = 2) => (x: number) => 1 - Math.pow(1 - x, pow);
export const inOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Value of prop `p` at time `t` (seconds), starting from `init`. */
export const at = (t: number, p: string, tweens: Tw[], init: number) => {
  let cur = init;
  for (const tw of tweens) {
    if (tw.p !== p) continue;
    if (t < tw.at) break;
    if (t < tw.at + tw.d) {
      const k = (t - tw.at) / tw.d;
      return cur + (tw.to - cur) * (tw.e ?? out(2))(k);
    }
    cur = tw.to;
  }
  return cur;
};
