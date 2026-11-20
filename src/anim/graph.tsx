/**
 * /graph ported to Remotion: a smooth line draws itself while one number counts up.
 * Source: vendor/claude-animation-skills/skills/graph/template.html (MIT).
 */
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {str, num, bool, strs} from "./index";
import {ramp, fadeIn, fmtNum, fitSize} from "./interp";
import {W} from "../shared/theme";

export const graph = {
  id: "graph",
  label: "Line graph",
  blurb: "A smooth line draws itself while one big number counts up with the tip.",
  defaults: {
    label: "", values: [1.2, 2.1, 3.4, 5, 9, 24, 51, 78, 100],
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
    final: null, prefix: "", suffix: "", decimals: 0, dark: false,
  },
  seconds: () => 4.0,
  check: (spec: Record<string, unknown>) => {
    const v = spec.values;
    if (!Array.isArray(v) || v.length < 2 || !v.every((x) => typeof x === "number" && (x as number) >= 0))
      throw new Error('spec: "values" needs 2 or more numbers, all 0 or above');
    if (Math.max(...(v as number[])) <= 0) throw new Error("spec: at least one value must be above 0");
  },
  Component: GraphClip,
};

function GraphClip({spec}: {spec: Record<string, unknown>}) {
  const frame = useCurrentFrame();
  const dark = bool(spec, "dark", false);
  const label = str(spec, "label");
  const values = (Array.isArray(spec.values) ? spec.values : []).map(Number);
  const labels = strs(spec, "labels");
  const final = spec.final == null ? null : Number(spec.final);
  const prefix = str(spec, "prefix");
  const suffix = str(spec, "suffix");
  const decimals = num(spec, "decimals", 0);
  const last = values[values.length - 1] || 1;
  const FINAL = final != null ? final : last;
  const scale = FINAL / last;
  const vmax = Math.max(...values, 1);
  const X0 = 120, X1 = 940, Y0 = 1330, Y1 = 770;
  const px = (i: number) => X0 + (i * (X1 - X0)) / (values.length - 1);
  const py = (v: number) => Y0 - (v / vmax) * (Y0 - Y1);

  const P = values.map((v, i) => [px(i), py(v)] as [number, number]);
  let d = `M${P[0][0]},${P[0][1]}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const t = 0.5 / 3;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }

  // path length approx (chord sum * 1.05)
  let len = 0;
  for (let i = 1; i < P.length; i++) len += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  len *= 1.05;

  const T0 = 0.3, TD = 2.7, TE = T0 + TD;
  const k = ramp(frame, T0 * 30, TD * 30);
  const idx = Math.min(values.length - 1, Math.max(0, Math.round(k * (values.length - 1))));
  const tipPt = P[idx];
  const shown = k >= 1 ? FINAL : (Math.round((k * vmax * scale) * Math.pow(10, decimals)) / Math.pow(10, decimals));
  const numStr = (prefix || "") + fmtNum(shown, decimals) + (suffix || "");
  const numSize = fitSize((prefix || "") + fmtNum(FINAL, decimals) + (suffix || ""), 850, 180);

  const axisK = ramp(frame, 0, 0.45 * 30);
  const haloK = ramp(frame, TE * 30, 0.7 * 30);
  const dropK = ramp(frame, (TE + 0.05) * 30, 0.45 * 30);

  const bg = dark ? "#000" : "#fff";
  const fg = dark ? "#fff" : "#000";
  const mute = dark ? "#8a8a8a" : "#8c8c8c";
  const axis = dark ? "#707070" : "#a3a3a3";
  const grid = dark ? "#262626" : "#e6e6e6";

  const every = Math.ceil(labels.length / 12);

  return (
    <AbsoluteFill style={{background: bg, color: fg, fontFamily: "Inter, system-ui, sans-serif"}}>
      <div style={{position: "absolute", left: 120, top: 330, fontSize: 34, color: mute, whiteSpace: "nowrap"}}>{label}</div>
      <div style={{position: "absolute", left: 114, top: 382, fontWeight: 700, fontSize: numSize, letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap"}}>
        {k <= 0 ? (prefix || "") + fmtNum(0, decimals) + (suffix || "") : numStr}
      </div>
      <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0}}>
        <line x1={120} y1={1330} x2={120 + (940 - 120) * axisK} y2={1330} stroke={axis} strokeWidth={2} />
        <line x1={120} y1={1050} x2={120 + (940 - 120) * axisK} y2={1050} stroke={grid} strokeWidth={2} />
        <line x1={120} y1={770} x2={120 + (940 - 120) * axisK} y2={770} stroke={grid} strokeWidth={2} />
        <g>
          {labels.map((m, i) => {
            if (i >= values.length || i % every) return null;
            const op = fadeIn(frame, (0.1 + i * 0.03) * 30, 10);
            return (
              <text key={i} x={px(i)} y={1388} textAnchor="middle" style={{fontSize: 26, fontWeight: 500, fill: axis, opacity: op}}>
                {m}
              </text>
            );
          })}
        </g>
        <path d={d} fill="none" stroke={fg} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - k)} />
        <circle cx={tipPt[0]} cy={tipPt[1]} r={13} fill={fg} stroke={bg} strokeWidth={5} opacity={k > 0 ? 1 : 0} />
        <circle cx={tipPt[0]} cy={tipPt[1]} r={13 + 47 * haloK} fill="none" stroke={fg} strokeWidth={2} opacity={0.18 * (1 - haloK)} />
        {dropK > 0 && (
          <line x1={tipPt[0]} y1={tipPt[1] + 22} x2={tipPt[0]} y2={tipPt[1] + 22 + (Y0 - (tipPt[1] + 22)) * dropK} stroke={fg} strokeWidth={2} strokeDasharray="3 9" opacity={1} />
        )}
      </svg>
    </AbsoluteFill>
  );
}
