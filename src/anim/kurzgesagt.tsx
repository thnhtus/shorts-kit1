/**
 * /kurzgesagt ported to Remotion: flat-vector space scene, every planet drops in
 * between Earth and the Moon.
 * Source: vendor/claude-animation-skills/skills/kurzgesagt/template.html (MIT).
 */
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {strs, type Preset, type Spec} from "./index";
import {powOut, backOut} from "./interp";
import {FPS, H, W} from "../shared/theme";

const Y0 = 390, Y1 = 1360, KM = (Y1 - Y0) / 406700;
const rE = 6371 * KM, rM = 1737 * KM;
const PL = [
  ["Mercury", 4879, ["#bdb6cf", "#8a82a3"], "#6b6a8f", false],
  ["Venus", 12104, ["#ffd98a", "#e9a45a"], "#e9a45a", false],
  ["Mars", 6779, ["#ff7a5c", "#c4433b"], "#ff5a4d", false],
  ["Jupiter", 139820, ["#f7cf9b", "#e39b67", "#f8e6c4", "#c97c58"], "#f08a4b", false],
  ["Saturn", 116460, ["#f7dfa6", "#e3b871", "#f8ecc8"], "#e9b44c", true],
  ["Uranus", 50724, ["#9ff0ee", "#62cfd8"], "#2fc6c9", false],
  ["Neptune", 49244, ["#6d93ff", "#3d5fe0"], "#4a6bff", false],
] as const;

function Planet({cx, cy, r, cols, rings, id}: {cx: number; cy: number; r: number; cols: readonly string[]; rings: boolean; id: string}) {
  const uid = id;
  return (
    <g>
      <defs><clipPath id={uid}><circle cx={cx} cy={cy} r={r} /></clipPath></defs>
      <circle cx={cx} cy={cy} r={r * 1.12} fill={cols[0]} opacity={0.5} />
      {rings && <ellipse cx={cx} cy={cy} rx={r * 2.15} ry={r * 0.42} fill="none" stroke="#e7c98d" strokeWidth={r * 0.2} opacity={0.85} transform={`rotate(-14 ${cx} ${cy})`} />}
      <g clipPath={`url(#${uid})`}>
        <circle cx={cx} cy={cy} r={r} fill={cols[0]} />
        {cols.length > 2 ? (
          [...Array(7)].map((_, k) => (
            <rect key={k} x={cx - r} y={cy - r + (k + 0.5) * (2 * r / 7) - r * 0.06 - (k % 2) * r * 0.03} width={2 * r} height={r * (0.1 + (k % 3) * 0.05)} fill={cols[1 + (k % (cols.length - 1))]} opacity={0.8} />
          ))
        ) : (
          [...Array(5)].map((_, k) => (
            <ellipse key={k} cx={cx + (Math.sin(k * 3.1) * 0.3) * r * 1.2} cy={cy + (Math.cos(k * 2.7) * 0.5) * r * 1.4} rx={r * (0.18 + 0.2)} ry={r * (0.1 + 0.12)} fill={cols[1]} opacity={0.75} />
          ))
        )}
        {id === "earth" && (
          <>
            <ellipse cx={cx - 0.3 * r} cy={cy - 0.2 * r} rx={0.5 * r} ry={0.35 * r} fill="#3fd28f" />
            <ellipse cx={cx + 0.35 * r} cy={cy + 0.25 * r} rx={0.4 * r} ry={0.3 * r} fill="#3fd28f" />
            <ellipse cx={cx + 0.1 * r} cy={cy - 0.55 * r} rx={0.3 * r} ry={0.18 * r} fill="#3fd28f" />
          </>
        )}
        <ellipse cx={cx - r * 0.55} cy={cy} rx={r * 1.02} ry={r * 1.25} fill="#1c1653" opacity={0.78} />
        <circle cx={cx + r * 0.35} cy={cy - r * 0.38} r={r * 0.22} fill="#fff" opacity={0.16} />
        {rings && <path d={`M${cx - r * 2.15},${cy} A${r * 2.15},${r * 0.42} 0 0 0 ${cx + r * 2.15},${cy}`} fill="none" stroke="#f3dca7" strokeWidth={r * 0.2} opacity={0.95} transform={`rotate(-14 ${cx} ${cy})`} />}
      </g>
    </g>
  );
}

export const kurzgesagt: Preset = {
  id: "kurzgesagt",
  label: "Kurzgesagt planets",
  blurb: "Flat-vector space scene: every planet drops in, to scale, between Earth and the Moon.",
  defaults: {lines: ["Could every planet fit", "between Earth and the Moon?", "At its farthest, yes."], tag: "They all fit"},
  seconds: () => 4.0,
  check: (spec) => {
    if (!Array.isArray(spec.lines) || spec.lines.length < 1 || spec.lines.length > 3) throw new Error('spec: "lines" takes 1 to 3 captions');
  },
  Component: Clip,
};

function Clip({spec}: {spec: Spec}) {
  const t = useCurrentFrame() / FPS;
  const lines = strs(spec, "lines");
  const tag = String(spec.tag ?? "They all fit");
  const k = (t0: number, d: number, e: (x: number) => number) => (t < t0 ? 0 : e(Math.min(1, (t - t0) / d)));
  const pop = (t0: number) => (t < t0 ? 0 : backOut(2.5)(Math.min(1, (t - t0) / 0.35)));
  const earthPop = pop(0.05), moonPop = pop(0.12);
  const distOp = k(0.2, 0.3, powOut(2));
  // planet column
  let y = Y0 + rE;
  const planets = PL.map(([, d, cols, , rings], i) => {
    const r = (d / 2) * KM;
    const cy = y + r; y += 2 * r;
    const side = i % 2 ? 1 : -1;
    const p = k(0.45 + i * 0.29, 0.34, backOut(1.25));
    const q = 1 - p;
    return {r, cy, cols, rings, side, q};
  });
  const TP = 0.45 + 6 * 0.29 + 0.34;
  const late = t >= TP;
  const sceneScale = late ? 1 + 0.035 * k(TP, 0.12, powOut(2)) - 0.035 * k(TP + 0.12, 0.45, backOut(2)) : 1;
  const bracketOp = k(TP, 0.15, powOut(2));
  const gy0 = planets[planets.length - 1].cy + planets[planets.length - 1].r + 3;
  const gy1 = Y1 - rM - 3;
  const smallPlanets = planets.filter((p) => p.r < 30);

  return (
    <AbsoluteFill style={{background: "#0d0930", fontFamily: "Inter, sans-serif"}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: "absolute", inset: 0}}>
        <defs>
          <linearGradient id="kg-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#140c3f" /><stop offset="0.55" stopColor="#0c0830" /><stop offset="1" stopColor="#26103f" />
          </linearGradient>
          <radialGradient id="kg-haze" cx="0.5" cy="0.55" r="0.6">
            <stop offset="0" stopColor="#3a1f86" stopOpacity="0.45" /><stop offset="1" stopColor="#3a1f86" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#kg-bg)" />
        <rect width={W} height={H} fill="url(#kg-haze)" />
        <g id="stars">
          {[...Array(170)].map((_, i) => {
            const seed = (i * 9301 + 49297) % 233280;
            const rnd = seed / 233280;
            const x = (i * 37) % W, y = (i * 71) % H;
            const r = rnd < 0.85 ? 1 + rnd * 2.2 : 3 + rnd * 1.5;
            const op = 0.35 + rnd * 0.6;
            return <circle key={i} cx={x} cy={y} r={r} fill={rnd < 0.6 ? "#6f5fd6" : "#d9d2ff"} opacity={op} />;
          })}
        </g>
        <g transform={`translate(540 815) scale(${sceneScale}) translate(-540 -815)`}>
          <line id="dist" x1={540} y1={Y0} x2={540} y2={Y1} stroke="#8d7dff" strokeWidth={3} strokeDasharray="6 12" opacity={distOp * 0.75} />
          <g id="planets">
            <g transform={`translate(540 ${Y0}) scale(${earthPop}) translate(-540 ${-Y0})`}>
              <Planet cx={540} cy={Y0} r={rE} cols={["#3aa0ff", "#2b7fe0"]} rings={false} id="earth" />
            </g>
            <g transform={`translate(540 ${Y1}) scale(${moonPop}) translate(-540 ${-Y1})`}>
              <Planet cx={540} cy={Y1} r={rM} cols={["#ddd7f0", "#b5adcf"]} rings={false} id="moon" />
            </g>
            {planets.map((p, i) => (
              <g key={i} transform={`translate(${p.side * 760 * p.q} 0) rotate(${p.side * 40 * p.q} 540 ${p.cy})`}>
                <Planet cx={540} cy={p.cy} r={p.r} cols={p.cols} rings={p.rings} id={`p${i}`} />
              </g>
            ))}
            {late && <path d={`M478,${gy0} h-16 V${gy1} h16`} fill="none" stroke="#3cf2a0" strokeWidth={5} strokeLinecap="round" opacity={bracketOp} />}
          </g>
        </g>
      </svg>
      {/* tags */}
      <div style={{position: "absolute", left: 580, top: Y0 - 14, fontSize: 27, fontWeight: 600, padding: "8px 18px 10px", borderRadius: 12, background: "#2f8cff", color: "#fff", transform: `scale(${k(0.2, 0.25, backOut(2.2))})`, transformOrigin: "0 50%", opacity: k(0.2, 0.25, backOut(2.2)) > 0 ? 1 : 0}}>Earth</div>
      <div style={{position: "absolute", left: 580, top: Y1 - 14, fontSize: 27, fontWeight: 600, padding: "8px 18px 10px", borderRadius: 12, background: "#8d7dff", color: "#fff", transform: `scale(${k(0.25, 0.25, backOut(2.2))})`, transformOrigin: "0 50%", opacity: k(0.25, 0.25, backOut(2.2)) > 0 ? 1 : 0}}>Moon, 406,700 km away</div>
      {smallPlanets.length > 0 && (
        <div style={{position: "absolute", left: 540 - 40, top: Y0 + rE + 30 - 14, fontSize: 27, fontWeight: 600, padding: "8px 18px 10px", borderRadius: 12, background: "#7d7aa8", color: "#fff", transform: `scale(${k(0.45 + 2 * 0.29 + 0.2, 0.22, backOut(2.2))})`, transformOrigin: "100% 50%", opacity: k(0.45 + 2 * 0.29 + 0.2, 0.22, backOut(2.2)) > 0 ? 1 : 0}}>Mercury, Venus, Mars</div>
      )}
      {late && (
        <div style={{position: "absolute", left: 446, top: (gy0 + gy1) / 2 - 14, fontSize: 27, fontWeight: 600, padding: "8px 18px 10px", borderRadius: 12, background: "#3cf2a0", color: "#0d2a1e", transform: `scale(${k(TP + 0.08, 0.22, backOut(2.2))})`, transformOrigin: "100% 50%", opacity: k(TP + 0.08, 0.22, backOut(2.2)) > 0 ? 1 : 0}}>18,600 km spare</div>
      )}
      {late && (
        <div style={{position: "absolute", left: 540, top: 250, padding: "14px 26px 16px", borderRadius: 16, background: "#ff3d6e", color: "#fff", fontSize: 36, fontWeight: 600, display: "flex", alignItems: "center", gap: 14, transformOrigin: "50% 50%", transform: `translateX(-50%) scale(${k(TP + 0.05, 0.32, backOut(2.6))}) rotate(${k(TP + 0.05, 0.32, backOut(2.6)) * -3 + (1 - k(TP + 0.05, 0.32, backOut(2.6))) * -8}deg)`}}>
          <span style={{display: "inline-grid", placeItems: "center", width: 44, height: 44, borderRadius: "50%", background: "#ffc93b", color: "#2a1250", fontWeight: 700, fontSize: 28}}>✓</span>
          {tag}
        </div>
      )}
      {/* captions */}
      <div style={{position: "absolute", left: 0, width: W, top: 1408, textAlign: "center", fontSize: 46, fontWeight: 500, color: "#fff", textShadow: "0 2px 14px rgba(10,5,40,.6)", visibility: t >= 0.15 && t < 1.3 ? "visible" : "hidden"}}>{lines[0] ?? ""}</div>
      <div style={{position: "absolute", left: 0, width: W, top: 1408, textAlign: "center", fontSize: 46, fontWeight: 500, color: "#fff", textShadow: "0 2px 14px rgba(10,5,40,.6)", visibility: t >= 1.3 && t < TP ? "visible" : "hidden"}}>{lines[1] ?? ""}</div>
      <div style={{position: "absolute", left: 0, width: W, top: 1408, textAlign: "center", fontSize: 46, fontWeight: 500, color: "#fff", textShadow: "0 2px 14px rgba(10,5,40,.6)", visibility: t >= TP ? "visible" : "hidden"}}>{lines[2] ?? ""}</div>
    </AbsoluteFill>
  );
}
