/**
 * /minimalistic-graphics ported to Remotion: black-and-white line art, a dot
 * hops up the steps and lands the line.
 * Source: vendor/claude-animation-skills/skills/minimalistic-graphics/template.html (MIT).
 */
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {bool, num, strs, type Preset, type Spec} from "./index";
import {backOut, easeNone, powIn, powOut} from "./interp";
import {at, inOut, type Tw} from "./tween";
import {FPS, H, W} from "../shared/theme";

const stepDur = (n: number) => Math.min(0.5, Math.max(0.3, 1.6 / (n - 1)));
const payoff = (n: number) => 0.42 + stepDur(n) * (n - 2) + 0.58;

export const minimalisticGraphics: Preset = {
  id: "minimalistic-graphics",
  label: "Minimal steps",
  blurb: "Black-and-white line art: a dot hops up the steps and lands the line.",
  defaults: {lines: ["every step feels small.", "until you look back."], steps: 5, light: false},
  seconds: (spec) => payoff(num(spec, "steps", 5)) + 1.6,
  check: (spec) => {
    const n = spec.steps;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 3 || n > 7) throw new Error('spec: "steps" must be a whole number from 3 to 7');
    if (!Array.isArray(spec.lines) || spec.lines.length < 1 || spec.lines.length > 2) throw new Error('spec: "lines" takes 1 or 2 short lines of text');
  },
  Component: Clip,
};

const R = 31, LX = 137, RX = 853, SPARKS = 22;

function timeline(n: number) {
  const BW = Math.min(116, ((RX - LX) / n) * 0.77);
  const pitch = (RX - LX - BW) / (n - 1);
  const BX = [...Array(n)].map((_, k) => LX + BW / 2 + k * pitch);
  const TOP = [...Array(n)].map((_, k) => 1240 - k * (720 / (n - 1)));
  const tw: Tw[] = [
    {p: "s", at: 0, d: 0.16, to: 2.1, e: powOut(2)},
    {p: "s", at: 0.16, d: 0.26, to: 1, e: inOut},
    {p: "b0", at: 0.18, d: 0.34, to: TOP[0], e: powOut(4)},
  ];
  const STEP = stepDur(n);
  for (let k = 1; k < n; k++) {
    const tb = 0.42 + STEP * (k - 1), th = tb + 0.2;
    const y0 = TOP[k - 1] - R, y1 = TOP[k] - R, peak = Math.min(y0, y1) - 120;
    const squash = (t: number, d: number, sx: number, sy: number, e = powOut(2)) =>
      tw.push({p: "sx", at: t, d, to: sx, e}, {p: "sy", at: t, d, to: sy, e});
    tw.push({p: `b${k}`, at: tb, d: 0.3, to: TOP[k], e: powOut(4)});
    squash(th - 0.05, 0.05, 1.18, 0.78);
    tw.push({p: "x", at: th, d: 0.3, to: BX[k], e: easeNone});
    squash(th, 0.1, 0.9, 1.12);
    squash(th + 0.1, 0.1, 1, 1, powIn(2));
    tw.push({p: "y", at: th, d: 0.15, to: peak, e: powOut(3)}, {p: "y", at: th + 0.15, d: 0.15, to: y1, e: powIn(3)});
    squash(th + 0.3, 0.05, 1.22, 0.74);
    squash(th + 0.35, 0.18, 1, 1, backOut(3));
  }
  return {BW, BX, TOP, tw};
}

function Clip({spec}: {spec: Spec}) {
  const t = useCurrentFrame() / FPS;
  const n = num(spec, "steps", 5);
  const light = bool(spec, "light", false);
  const lines = strs(spec, "lines");
  const fg = light ? "#111" : "#f4f4f4";
  const soft = light ? "#555" : "#bdbdbd";
  const {BW, BX, TOP, tw} = timeline(n);
  const OX = BX[n - 1], OY = TOP[n - 1] - R, TP = payoff(n);

  const bx = at(t, "x", tw, BX[0]), by = at(t, "y", tw, TOP[0] - R);
  const s = at(t, "s", tw, 0), sx = s * at(t, "sx", tw, 1), sy = s * at(t, "sy", tw, 1);
  const pulse = (t0: number, d: number, to: number, cx: number, cy: number) => {
    const k = t < t0 ? -1 : powOut(2)(Math.min(1, (t - t0) / d));
    return k < 0 ? null : <circle cx={cx} cy={cy} r={34 * (1 + (to - 1) * k)} fill="none" stroke={fg} strokeWidth={3} opacity={0.9 * (1 - k)} />;
  };
  const late = t >= TP;
  const k = (t0: number, d: number, e: (x: number) => number) => (t < t0 ? 0 : e((t - t0) / d));
  const om = 880 * (1 - k(TP + 0.05, 0.55, inOut));
  const em = 1000 * (1 - k(TP + 0.18, 0.6, inOut));
  const rot = 40 * k(TP, 1.6, easeNone);
  const barsOp = 1 - 0.68 * k(TP + 0.1, 0.5, powOut(2));
  const caption = lines.length > 1 && late ? lines[1] : (lines[0] ?? "");

  return (
    <AbsoluteFill style={{background: light ? "#fff" : "#000"}}>
      <div style={{position: "absolute", left: 100, width: 880, top: 236, textAlign: "center", font: "400 44px/1.2 Inter, sans-serif", color: fg, letterSpacing: "-0.005em"}}>{caption}</div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: "absolute", inset: 0}}>
        <defs>
          <mask id="mg-om" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
            <circle cx={OX} cy={OY} r={140} fill="none" stroke="#fff" strokeWidth={14} strokeDasharray={880} strokeDashoffset={om} transform={`rotate(-90 ${OX} ${OY})`} />
          </mask>
          <mask id="mg-em" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
            <ellipse cx={OX} cy={OY} rx={220} ry={46} fill="none" stroke="#fff" strokeWidth={14} strokeDasharray={1000} strokeDashoffset={em} />
          </mask>
        </defs>
        <g fill="none" stroke={fg} strokeWidth={2.6} opacity={barsOp}>
          {BX.map((x, i) => <rect key={i} x={x - BW / 2} y={at(t, `b${i}`, tw, 1960)} width={BW} height={1700} />)}
        </g>
        {late && <circle cx={OX} cy={OY} r={140} fill="none" stroke={fg} strokeWidth={2} strokeDasharray="5 9" mask="url(#mg-om)" transform={`rotate(${rot} ${OX} ${OY})`} />}
        {late && <ellipse cx={OX} cy={OY} rx={220} ry={46} fill="none" stroke={soft} strokeWidth={2} mask="url(#mg-em)" />}
        {[...Array(SPARKS)].map((_, i) => {
          if (t < TP + 0.05) return null;
          const a = (i / SPARKS) * Math.PI * 2 + (i % 2) * 0.12, d = 190 + (i % 4) * 34;
          const e = k(TP + 0.05, 0.5, powOut(3));
          const op = t < TP + 0.55 ? e : 1 + ((i % 3 ? 0.35 : 0.8) - 1) * k(TP + 0.55, 0.5, powOut(1));
          return <circle key={i} cx={OX + Math.cos(a) * d * e} cy={OY + Math.sin(a) * d * e} r={i % 3 ? 4 : 6} fill={fg} opacity={op} />;
        })}
        {late ? pulse(TP, 0.6, 4.2, OX, OY) : pulse(0.2, 0.5, 3.2, BX[0], TOP[0] - R)}
        {/* scale origin = bottom of the ball */}
        <circle cx={0} cy={0} r={R} fill={fg} transform={`translate(${bx} ${by + R}) scale(${sx} ${sy}) translate(0 ${-R})`} />
      </svg>
    </AbsoluteFill>
  );
}
