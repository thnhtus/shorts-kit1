/**
 * Small drawn UI pieces for illustrated scenes: a speech bubble, a green tick
 * badge and a browser window. Ported to SVG from stick-scene's prop kit
 * (MIT, Kamran Ahmed, github.com/nilbuild/stick-scene). `k` is progress 0..1;
 * `k <= 0` draws nothing, so a piece can be popped in on a beat.
 */
import React from "react";
import {FONT} from "../theme";

const INK = "#17110C";
const GREEN = "#dafbe1";
const GREEN_INK = "#1a7f37";

/** Overshoot ease-out: pops past 1 and settles, for things that appear. */
const backOut = (k: number) => {
  const c1 = 1.70158;
  const t = k - 1;
  return 1 + (c1 + 1) * t * t * t + c1 * t * t;
};
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));

/**
 * Speech bubble: body centred on `x`, bottom edge at `y`. The tail is one outline
 * with the body, so it cannot detach; `tail` is the tail tip's x offset from the
 * centre, so point it back at the speaker's head (about +/- half the width).
 */
export const Bubble: React.FC<{x: number; y: number; text: string; k: number; tail?: number; size?: number; fill?: string; ink?: string}> = ({
  x,
  y,
  text,
  k,
  tail = 0,
  size = 26,
  fill = "#FFFDF6",
  ink = INK,
}) => {
  if (k <= 0) return null;
  // ponytail: width from character count, not a measured font; off for CJK or very wide glyphs. Upgrade: measure with @remotion/layout-utils.
  const w = text.length * size * 0.56 + 24;
  const h = size + 14;
  const r = Math.min(h / 2, 10);
  const lim = Math.max(0, w / 2 - r - 7);
  const base = Math.max(-lim, Math.min(lim, tail));
  const tip = Math.max(-w / 2 - 2, Math.min(w / 2 + 2, tail));
  const d = [
    `M ${-w / 2 + r} ${-h}`,
    `L ${w / 2 - r} ${-h}`,
    `A ${r} ${r} 0 0 1 ${w / 2} ${-h + r}`,
    `L ${w / 2} ${-r}`,
    `A ${r} ${r} 0 0 1 ${w / 2 - r} 0`,
    `L ${base + 7} 0`,
    `L ${tip} 10`,
    `L ${base - 7} 0`,
    `L ${-w / 2 + r} 0`,
    `A ${r} ${r} 0 0 1 ${-w / 2} ${-r}`,
    `L ${-w / 2} ${-h + r}`,
    `A ${r} ${r} 0 0 1 ${-w / 2 + r} ${-h} Z`,
  ].join(" ");
  return (
    <g transform={`translate(${x} ${y}) scale(${backOut(clamp01(k))})`}>
      <path d={d} fill={fill} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      <text x={0} y={-h / 2} textAnchor="middle" dominantBaseline="central" fontFamily={FONT.sans} fontSize={size} fontWeight={700} fill={ink}>
        {text}
      </text>
    </g>
  );
};

/** A green tick circle that pops in at (x, y) with radius `r`; the tick draws on. */
export const TickBadge: React.FC<{x: number; y: number; k: number; r?: number}> = ({x, y, k, r = 16}) => {
  if (k <= 0) return null;
  const tick = clamp01(k * 2 - 0.4);
  return (
    <g transform={`translate(${x} ${y}) scale(${backOut(clamp01(k * 1.6))})`}>
      <circle r={r} fill={GREEN} stroke={GREEN_INK} strokeWidth={1.3} />
      <path
        d={`M ${-r * 0.45} 0 L ${-r * 0.1} ${r * 0.38} L ${r * 0.5} ${-r * 0.38}`}
        pathLength={1}
        fill="none"
        stroke={GREEN_INK}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={1}
        strokeDashoffset={1 - tick}
      />
    </g>
  );
};

/** A browser window: rounded frame, three dots and a title bar. `(x, y)` is the top-left corner. */
export const Win: React.FC<{x: number; y: number; w: number; h: number; title?: string; fill?: string}> = ({x, y, w, h, title, fill = "#FFFDF6"}) => (
  <g transform={`translate(${x} ${y})`}>
    <rect width={w} height={h} rx={4} fill={fill} stroke={INK} strokeWidth={1.6} />
    <line x1={0} y1={13} x2={w} y2={13} stroke={INK} strokeWidth={1.2} />
    {["#E58F8F", "#FFD36B", "#8FD19E"].map((c, i) => (
      <circle key={i} cx={7 + i * 6} cy={6.5} r={1.8} fill={c} stroke={INK} strokeWidth={0.9} />
    ))}
    {title ? (
      <text x={w / 2 + 8} y={10} textAnchor="middle" fontFamily={FONT.sans} fontSize={8.5} fill="#6B6B6B">
        {title}
      </text>
    ) : null}
  </g>
);
