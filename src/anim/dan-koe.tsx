/**
 * /dan-koe ported to Remotion: black-and-white line art, one dot grows into a
 * branching tree and the tips light up.
 * Source: vendor/claude-animation-skills/skills/dan-koe/template.html (MIT).
 */
import {useMemo} from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {num, bool, strs} from "./index";
import {seeded} from "./interp";
import {W, H, FPS} from "../shared/theme";

export const danKoe = {
  id: "dan-koe",
  label: "Dan Koe tree",
  blurb: "Black-and-white line art: one dot grows into a branching tree and the tips light up.",
  defaults: {lines: ["one choice.", "then the next."], depth: 9, seed: 5, light: false},
  seconds: (spec: Record<string, unknown>) => {
    const depth = typeof spec.depth === "number" ? spec.depth : 9;
    return 0.3 + (depth - 1) * 0.25 + 0.27 + 1.43;
  },
  check: (spec: Record<string, unknown>) => {
    const d = spec.depth;
    if (typeof d !== "number" || !Number.isInteger(d) || d < 6 || d > 10)
      throw new Error('spec: "depth" must be a whole number from 6 to 10');
    const l = spec.lines;
    if (!Array.isArray(l) || l.length < 1 || l.length > 2)
      throw new Error('spec: "lines" takes 1 or 2 short lines of text');
  },
  Component: DanKoeClip,
};

const T0 = 0.3, STEP = 0.25, GROW = 0.27, X0 = 540, Y0 = 1400;
const out3 = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

type Seg = {x: number; y: number; ang: number; len: number; d: number; parent: number};

function buildTree(depth: number, seed: number) {
  const rnd = seeded(seed);
  const segs: Seg[] = [];
  const grow = (x: number, y: number, ang: number, len: number, d: number, parent: number) => {
    const idx = segs.length;
    segs.push({x, y, ang, len, d, parent});
    if (d >= depth - 1) return;
    const ex = x + Math.cos(ang) * len;
    const ey = y + Math.sin(ang) * len;
    for (const side of [-1, 1]) {
      const a = ang + side * (0.27 + rnd() * 0.17) + (rnd() - 0.5) * 0.1;
      grow(ex, ey, a, len * (0.72 + rnd() * 0.06), d + 1, idx);
    }
  };
  grow(X0, Y0, -Math.PI / 2, 228, 0, -1);
  const sparks: [number, number, number][] = [];
  for (let i = 0; i < 40; i++) sparks.push([rnd() * Math.PI * 2, 90 + rnd() * 240, rnd() < 0.3 ? 5 : 3]);
  return {segs, sparks};
}

function DanKoeClip({spec}: {spec: Record<string, unknown>}) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const depth = num(spec, "depth", 9);
  const seed = num(spec, "seed", 5);
  const light = bool(spec, "light", false);
  const lines = strs(spec, "lines");

  const bg = light ? "#fff" : "#000";
  const fg = light ? "#111" : "#f2f2f2";
  const dot = light ? "#000" : "#fff";
  const capColor = light ? "#111" : "#f4f4f4";

  const {segs, sparks} = useMemo(() => buildTree(depth, seed), [depth, seed]);
  const tp = 0.3 + (depth - 1) * 0.25 + 0.27;
  const dt = t - tp;
  const sway = dt > 0 ? Math.sin(dt * 2.4) * 0.045 * Math.exp(-dt * 0.6) * clamp01(dt * 3) : 0;
  const lineAlpha = dt > 0 ? 1 - 0.5 * out3((dt - 0.1) / 0.6) : 1;

  const ends: [number, number][] = new Array(segs.length);
  const drawnLines: {x1: number; y1: number; x2: number; y2: number; w: number}[] = [];
  const tips: {x: number; y: number; r: number}[] = [];

  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const k = out3((t - (T0 + s.d * STEP)) / GROW);
    if (k <= 0) continue;
    const bx = s.parent >= 0 ? ends[s.parent][0] : s.x;
    const by = s.parent >= 0 ? ends[s.parent][1] : s.y;
    const a = s.ang + sway * s.d * 0.35;
    const ex = bx + Math.cos(a) * s.len * k;
    const ey = by + Math.sin(a) * s.len * k;
    ends[i] = [ex, ey];
    drawnLines.push({x1: bx, y1: by, x2: ex, y2: ey, w: Math.max(1, 3.2 - s.d * 0.28)});
    if (k < 1 || s.d === depth - 1) {
      let r = Math.max(2.2, 16 * Math.pow(0.74, s.d));
      if (dt > 0) r *= 1 + 1.4 * Math.exp(-dt * 5) * clamp01(dt * 14);
      tips.push({x: ex, y: ey, r});
    }
  }

  const caption = lines.length > 1 && t >= tp ? (lines[1] ?? "") : (lines[0] ?? "");

  return (
    <AbsoluteFill style={{background: bg, fontFamily: "system-ui, sans-serif"}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: "absolute", inset: 0}}>
        <g opacity={lineAlpha}>
          {drawnLines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={fg} strokeWidth={l.w} strokeLinecap="round" />
          ))}
        </g>
        {tips.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={dot} />
        ))}
        {t < T0 && <circle cx={X0} cy={Y0} r={16 * out3(t / 0.2)} fill={dot} />}
        {dt > 0 && (
          <>
            <circle cx={X0} cy={Y0} r={20 + out3(dt / 0.8) * 260} fill="none" stroke={dot} strokeWidth={3} opacity={clamp01(1 - dt / 0.8) * 0.8} />
            {sparks.map(([a, dist, r], i) => {
              const e = out3(dt / 0.9);
              const op = clamp01(dt * 6) * (1 - 0.6 * clamp01((dt - 0.5) / 0.8));
              return <circle key={i} cx={540 + Math.cos(a) * dist * 1.7 * e} cy={760 + Math.sin(a) * dist * e - dt * 40} r={r} fill={dot} opacity={op} />;
            })}
          </>
        )}
      </svg>
      <div style={{position: "absolute", left: 0, width: W, top: 236, textAlign: "center", fontSize: 44, fontWeight: 400, lineHeight: 1.2, color: capColor, letterSpacing: "-0.005em"}}>
        {caption}
      </div>
    </AbsoluteFill>
  );
}
