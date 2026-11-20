/**
 * /map-route ported to Remotion: a white 3D city where the route draws itself,
 * the pin drops and the camera pulls back.
 * Source: vendor/claude-animation-skills/skills/map-route/template.html (MIT).
 */
import {useLayoutEffect, useRef} from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import * as THREE from "three";
import {FPS} from "../shared/theme";
import {num, strs, type Preset, type Spec} from "./index";

const W = 1080, H = 1920, DUR = 4.0;

export const mapRoute: Preset = {
  id: "map-route",
  label: "Map route",
  blurb: "A white 3D city where the route draws itself, the pin drops and the camera pulls back.",
  defaults: {
    destination: "Harbor Point",
    minutes: 24,
    distance: 18.6,
    unit: "km",
    places: ["North Quay", "Botanic Gardens", "Market Hall", "Elm Park", "The Canal"],
    accent: "#2f7cf6",
    seed: 7,
  },
  seconds: () => DUR,
  check: (spec: Spec) => {
    if (!spec.destination) throw new Error('spec: "destination" is required');
    if (spec.minutes == null || spec.distance == null) throw new Error('spec: "minutes" and "distance" are required');
    if (typeof spec.accent !== "string" || !/^#[0-9a-fA-F]{6}$/.test(spec.accent)) {
      throw new Error('spec: "accent" must be a hex colour like "#2f7cf6"');
    }
  },
  Component: Clip,
};

type Overlay = {
  labels: (HTMLDivElement | null)[];
  card: HTMLDivElement | null;
  etan: HTMLElement | null;
  etad: HTMLElement | null;
};

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeQ = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function build(spec: Spec, canvas: HTMLCanvasElement) {
  const ACC = String(spec.accent);
  const KM = num(spec, "distance"), MIN = num(spec, "minutes"), UNIT = String(spec.unit ?? "km");
  const fmtD = (x: number) => `${x.toFixed(1).replace(/\.0$/, "")} ${UNIT}`;
  const places = strs(spec, "places");
  const accColor = new THREE.Color(ACC);
  let seed = num(spec, "seed", 7) | 0;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
  renderer.setSize(W, H, false);
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const BG = 0xeef0f1;
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 90, 160);
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.5, 300);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd3d6, 1.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.55);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 140});
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  const CELL = 4, ST = 1.0, BLK = CELL - ST;
  const KX = [-9, 9], KZ = [-22, 6];
  const riverZ = (x: number) => -18 + 2.2 * Math.sin(x * 0.16 + 0.6);
  const RIVER_HW = 1.75;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({color: 0xf7f7f5, roughness: 1}),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const ribbonAlong = (fx: (x: number) => number, hw: number, y: number, color: number) => {
    const pos: number[] = [], idx: number[] = [];
    const n = 200, x0 = -80, x1 = 80;
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n;
      const z = fx(x);
      const dz = (fx(x + 0.01) - fx(x - 0.01)) / 0.02;
      const len = Math.hypot(1, dz);
      const nx = -dz / len, nz = 1 / len;
      pos.push(x + nx * hw, y, z + nz * hw, x - nx * hw, y, z - nz * hw);
      if (i) {
        const a = (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({color, roughness: 0.9, side: THREE.DoubleSide}));
    m.receiveShadow = true;
    scene.add(m);
  };
  ribbonAlong(riverZ, RIVER_HW + 0.55, 0.012, 0xdfe3e0);
  ribbonAlong(riverZ, RIVER_HW, 0.02, 0x9fcbf2);

  const bridgeMat = new THREE.MeshStandardMaterial({color: 0xfafaf8, roughness: 1});
  for (let k = KX[0]; k <= KX[1]; k++) {
    const x = k * CELL;
    const b = new THREE.Mesh(new THREE.BoxGeometry(ST + 0.3, 0.12, RIVER_HW * 2 + 1.6), bridgeMat);
    b.position.set(x, 0.06, riverZ(x));
    b.receiveShadow = true;
    b.castShadow = true;
    scene.add(b);
  }

  const padMat = new THREE.MeshStandardMaterial({color: 0xe6e6e2, roughness: 1});
  const parkMat = new THREE.MeshStandardMaterial({color: 0xd3e9c6, roughness: 1});
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const lots: number[][] = [], trees: number[][] = [];
  const PARK_KEYS = new Set(["-4,-7", "-3,-7", "2,-3", "3,1", "-5,2", "4,-11", "-2,-12"]);
  for (let i = KX[0]; i < KX[1]; i++) {
    for (let j = KZ[0]; j < KZ[1]; j++) {
      const cx = i * CELL + CELL / 2, cz = j * CELL + CELL / 2;
      if (Math.abs(cz - riverZ(cx)) < RIVER_HW + 2.3) continue;
      const park = PARK_KEYS.has(`${i},${j}`) || rnd() < 0.05;
      const pad = new THREE.Mesh(new THREE.BoxGeometry(BLK + 0.2, 0.04, BLK + 0.2), park ? parkMat : padMat);
      pad.position.set(cx, 0.02, cz);
      pad.receiveShadow = true;
      scene.add(pad);
      if (park) {
        const nT = 5 + Math.floor(rnd() * 5);
        for (let t = 0; t < nT; t++) {
          trees.push([cx + (rnd() - 0.5) * (BLK - 0.8), cz + (rnd() - 0.5) * (BLK - 0.8), 0.32 + rnd() * 0.22]);
        }
        continue;
      }
      const r = rnd(), inset = 0.18, s = BLK - inset * 2;
      let parts: number[][];
      if (r < 0.22) parts = [[0, 0, s, s]];
      else if (r < 0.55) {
        parts = rnd() < 0.5
          ? [[-s / 4 - 0.06, 0, s / 2 - 0.12, s], [s / 4 + 0.06, 0, s / 2 - 0.12, s]]
          : [[0, -s / 4 - 0.06, s, s / 2 - 0.12], [0, s / 4 + 0.06, s, s / 2 - 0.12]];
      } else {
        const q = s / 2 - 0.12;
        parts = [
          [-s / 4 - 0.06, -s / 4 - 0.06, q, q], [s / 4 + 0.06, -s / 4 - 0.06, q, q],
          [-s / 4 - 0.06, s / 4 + 0.06, q, q], [s / 4 + 0.06, s / 4 + 0.06, q, q],
        ];
      }
      for (const [dx, dz, w, d] of parts) {
        const tall = rnd() < 0.07;
        const h = tall ? 1.9 + rnd() * 1.1 : 0.42 + rnd() * 1.0;
        lots.push([cx + dx, cz + dz, w, d, h]);
      }
    }
  }
  const bInst = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.92}), lots.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  lots.forEach(([x, z, w, d, h], i) => {
    m4.makeScale(w, h, d);
    m4.setPosition(x, 0, z);
    bInst.setMatrixAt(i, m4);
    const g = 0.955 + rnd() * 0.045;
    bInst.setColorAt(i, col.setRGB(g, g, g * 1.003));
  });
  bInst.castShadow = true;
  bInst.receiveShadow = true;
  scene.add(bInst);
  const tInst = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 2),
    new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.85}),
    trees.length,
  );
  trees.forEach(([x, z, r], i) => {
    m4.makeScale(r, r * 0.92, r);
    m4.setPosition(x, r * 0.9, z);
    tInst.setMatrixAt(i, m4);
    tInst.setColorAt(i, col.set(rnd() < 0.5 ? 0x8fcd78 : 0x7cbf68));
  });
  tInst.castShadow = true;
  tInst.receiveShadow = true;
  scene.add(tInst);

  const WP = [[-8, 10], [-8, -4], [0, -4], [0, -28], [8, -28], [8, -42]];
  const roundedPath = (pts: number[][], r: number) => {
    const out: THREE.Vector2[] = [];
    const v = (a: number[]) => new THREE.Vector2(a[0], a[1]);
    out.push(v(pts[0]));
    for (let i = 1; i < pts.length - 1; i++) {
      const A = v(pts[i - 1]), P = v(pts[i]), B = v(pts[i + 1]);
      const c1 = P.clone().add(A.clone().sub(P).normalize().multiplyScalar(r));
      const c2 = P.clone().add(B.clone().sub(P).normalize().multiplyScalar(r));
      out.push(c1);
      for (let k = 1; k < 12; k++) {
        const t = k / 12;
        out.push(c1.clone().lerp(P, t).lerp(P.clone().lerp(c2, t), t));
      }
      out.push(c2);
    }
    out.push(v(pts[pts.length - 1]));
    const res = [out[0].clone()];
    const STEP = 0.06;
    let carry = 0;
    for (let i = 1; i < out.length; i++) {
      const a = out[i - 1], b = out[i], seg = a.distanceTo(b);
      let d = STEP - carry;
      while (d <= seg) {
        res.push(a.clone().lerp(b, d / seg));
        d += STEP;
      }
      carry = seg - (d - STEP);
    }
    res.push(out[out.length - 1].clone());
    return res;
  };
  const RP = roundedPath(WP, 1.6);
  const N = RP.length;
  const routeRibbon = (hw: number, y: number, color: number | THREE.Color, order: number) => {
    const pos: number[] = [], idx: number[] = [];
    for (let i = 0; i < N; i++) {
      const a = RP[Math.max(0, i - 1)], b = RP[Math.min(N - 1, i + 1)];
      const t = b.clone().sub(a).normalize();
      pos.push(RP[i].x - t.y * hw, y, RP[i].y + t.x * hw, RP[i].x + t.y * hw, y, RP[i].y - t.x * hw);
      if (i) {
        const k = (i - 1) * 2;
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(
      g,
      new THREE.MeshBasicMaterial({color, polygonOffset: true, polygonOffsetFactor: -order, polygonOffsetUnits: -order * 4}),
    );
    m.renderOrder = order;
    scene.add(m);
    return m;
  };
  const routeEdge = routeRibbon(0.5, 0.16, 0xffffff, 2);
  const routeLine = routeRibbon(0.34, 0.17, accColor, 3);
  const disc = (r: number, color: number | THREE.Color, y: number, order: number) => {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(r, 48),
      new THREE.MeshBasicMaterial({color, transparent: true, depthTest: true}),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    m.renderOrder = order;
    scene.add(m);
    return m;
  };
  const startOuter = disc(0.62, accColor, 0.19, 4), startInner = disc(0.36, 0xffffff, 0.2, 5);
  startOuter.position.x = startInner.position.x = RP[0].x;
  startOuter.position.z = startInner.position.z = RP[0].y;
  const headPulse = disc(1, accColor, 0.185, 4);
  const headOuter = disc(0.72, 0xffffff, 0.2, 6), headInner = disc(0.5, accColor, 0.21, 7);

  const pin = new THREE.Group();
  const pinMat = new THREE.MeshStandardMaterial({color: 0xf0483e, roughness: 0.45, metalness: 0});
  const pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.85, 40, 28), pinMat);
  pinHead.position.y = 2.25;
  pinHead.castShadow = true;
  const tipG = new THREE.ConeGeometry(0.6, 1.7, 40);
  tipG.rotateX(Math.PI);
  const tip = new THREE.Mesh(tipG, pinMat);
  tip.position.y = 1.08;
  tip.castShadow = true;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.5}));
  dot.position.y = 2.3;
  pin.add(pinHead, tip, dot);
  const END = RP[N - 1];
  pin.position.set(END.x, 0, END.y);
  scene.add(pin);
  const pinShadow = disc(0.9, 0x000000, 0.19, 4);
  pinShadow.material.opacity = 0;
  pinShadow.position.set(END.x, 0.19, END.y);

  const LBL: [number, number][] = [[-12, 4], [-6, -33], [6, -12], [14, -36], [4.6, -19.6]];
  const v3 = new THREE.Vector3();
  const project = (x: number, y: number, z: number) => {
    v3.set(x, y, z).project(camera);
    return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H];
  };
  const pathAt = (p: number) => {
    const f = clamp(p) * (N - 1), i = Math.floor(f), j = Math.min(N - 1, i + 1);
    return RP[i].clone().lerp(RP[j], f - i);
  };
  const T_DRAW0 = 0.25, T_DRAW1 = 2.75, T_PIN = 2.62;

  const render = (t: number, ui: Overlay) => {
    const pr = easeQ(clamp((t - T_DRAW0) / (T_DRAW1 - T_DRAW0)));
    const k = Math.floor(pr * (N - 1));
    routeLine.geometry.setDrawRange(0, k * 6);
    routeEdge.geometry.setDrawRange(0, k * 6);
    const hp = pathAt(pr);
    headOuter.position.set(hp.x, 0.2, hp.y);
    headInner.position.set(hp.x, 0.21, hp.y);
    const ph = (t * 1.6) % 1;
    headPulse.position.set(hp.x, 0.185, hp.y);
    headPulse.scale.setScalar(0.8 + ph * 0.9);
    (headPulse.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - ph);
    headOuter.visible = headInner.visible = headPulse.visible = t > 0.02;

    const lag = pathAt(Math.max(0, pr - 0.02));
    const fin = smooth(2.45, DUR, t);
    const tgt = new THREE.Vector3(lag.x, 0, lag.y).lerp(new THREE.Vector3(3, 0, -27), fin * 0.85);
    const intro = smooth(0, 1.0, t);
    const dist = 62 - 14 * intro + 30 * fin;
    const pol = THREE.MathUtils.degToRad(30 + 8 * intro - 10 * fin);
    const az = THREE.MathUtils.degToRad(28 - 18 * smooth(0, DUR, t));
    camera.position.set(
      tgt.x + dist * Math.sin(pol) * Math.sin(az),
      tgt.y + dist * Math.cos(pol),
      tgt.z + dist * Math.sin(pol) * Math.cos(az),
    );
    camera.lookAt(tgt.x, tgt.y, tgt.z - 3);
    sun.position.set(tgt.x - 18, 34, tgt.z + 12);
    sun.target.position.set(tgt.x, 0, tgt.z - 4);

    const pt = t - T_PIN;
    let py = 9, ps = 0;
    if (pt > 0) {
      if (pt < 0.28) py = 9 * (1 - Math.pow(pt / 0.28, 2));
      else if (pt < 0.5) py = 1.1 * Math.sin(Math.PI * ((pt - 0.28) / 0.22));
      else py = 0;
      ps = 1;
    }
    pin.visible = pt > 0;
    pin.position.y = py;
    const squash = pt > 0.28 && pt < 0.4 ? 1 - 0.18 * Math.sin(Math.PI * ((pt - 0.28) / 0.12)) : 1;
    pin.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    (pinShadow.material as THREE.MeshBasicMaterial).opacity = ps * 0.16 * (1 - clamp(py / 9) * 0.8);
    pinShadow.scale.setScalar(1.2 - clamp(py / 9) * 0.5);

    camera.updateMatrixWorld();
    renderer.render(scene, camera);

    LBL.forEach(([x, z], i) => {
      const el = ui.labels[i];
      if (!el) return;
      const [sx, sy] = project(x, 0.3, z);
      el.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) translate(-50%,-50%)`;
      const inside = sx > 140 && sx < 940 && sy > 400 && sy < 1560;
      el.style.opacity = String(inside && places[i] ? smooth(0.15, 0.5, t) : 0);
    });
    if (ui.etan) ui.etan.textContent = pr >= 1 ? "Arrived" : `${Math.max(1, Math.round(MIN * (1 - pr)))} min`;
    if (ui.etad) ui.etad.textContent = pr >= 1 ? `${fmtD(KM)} in ${MIN} min` : `${fmtD(Math.max(0.1, KM * (1 - pr)))} to go`;
    if (ui.card) {
      const [cx, cy] = project(END.x, 3.4, END.y);
      const ca = smooth(T_PIN + 0.45, T_PIN + 0.7, t);
      ui.card.style.opacity = String(ca);
      const cw = ui.card.offsetWidth || 320;
      const ccx = clamp(cx, 100 + cw / 2, 980 - cw / 2);
      ui.card.style.transform = `translate(${ccx.toFixed(1)}px,${(cy - 18 + 16 * (1 - ca)).toFixed(1)}px) translate(-50%,-100%)`;
    }
  };
  return {render, destination: String(spec.destination), minutes: MIN, distance: KM, unit: UNIT};
}

function Clip({spec}: {spec: Spec}) {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<ReturnType<typeof build> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const etanRef = useRef<HTMLElement>(null);
  const etadRef = useRef<HTMLElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);
  const places = strs(spec, "places");
  const accent = String(spec.accent ?? "#2f7cf6");

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!worldRef.current) worldRef.current = build(spec, canvas);
    worldRef.current.render(frame / FPS, {
      labels: labelRefs.current,
      card: cardRef.current,
      etan: etanRef.current,
      etad: etadRef.current,
    });
  }, [frame, spec]);

  const world = worldRef.current;
  return (
    <AbsoluteFill style={{background: "#eef0f1", fontFamily: "Inter, system-ui, sans-serif"}}>
      <canvas ref={canvasRef} width={W} height={H} style={{position: "absolute", left: 0, top: 0}} />
      {labelRefs.current.map((_, i) => (
        <div
          key={i}
          ref={(el) => { labelRefs.current[i] = el; }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: "translate(-50%,-50%)",
            fontSize: 27,
            fontWeight: 600,
            color: "#77797c",
            whiteSpace: "nowrap",
            letterSpacing: "0.01em",
            textShadow: "0 0 4px #fff,0 0 4px #fff,0 0 8px #fff",
            opacity: 0,
          }}
        >
          {places[i] ?? ""}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: 110,
          top: 250,
          background: "#fff",
          borderRadius: 28,
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          boxShadow: "0 10px 30px rgba(30,40,60,.14)",
        }}
      >
        <div style={{width: 58, height: 58, borderRadius: 18, background: accent, display: "grid", placeItems: "center"}}>
          <svg width={34} height={34} viewBox="0 0 24 24"><path d="M12 2.5 20 21l-8-4-8 4z" fill="#fff" /></svg>
        </div>
        <div>
          <b ref={etanRef} style={{display: "block", fontSize: 34, fontWeight: 700, color: "#16181b", lineHeight: 1}} />
          <span ref={etadRef} style={{display: "block", marginTop: 8, fontSize: 25, fontWeight: 500, color: "#6b6f75", lineHeight: 1}} />
        </div>
      </div>
      <div
        ref={cardRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "translate(-50%,-100%)",
          background: "#fff",
          borderRadius: 26,
          padding: "22px 30px 24px",
          boxShadow: "0 14px 40px rgba(30,40,60,.18),0 2px 6px rgba(30,40,60,.08)",
          opacity: 0,
          whiteSpace: "nowrap",
        }}
      >
        <b style={{display: "block", fontSize: 38, fontWeight: 700, lineHeight: 1, color: "#16181b"}}>{world?.destination}</b>
        <span style={{display: "flex", alignItems: "center", gap: 12, marginTop: 12, fontSize: 28, fontWeight: 500, lineHeight: 1, color: "#6b6f75"}}>
          <i style={{width: 14, height: 14, borderRadius: "50%", background: accent}} />
          <em style={{fontStyle: "normal"}}>{world ? `${world.minutes} min · ${world.distance.toFixed(1).replace(/\.0$/, "")} ${world.unit}` : ""}</em>
        </span>
      </div>
    </AbsoluteFill>
  );
}
