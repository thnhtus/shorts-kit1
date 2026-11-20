/**
 * /breakdown ported to Remotion: a phone explodes layer by layer on a slow
 * turntable while numbered leader lines call out each part.
 * Source: vendor/claude-animation-skills/skills/breakdown/template.html (MIT).
 */
import {useLayoutEffect, useRef} from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import * as THREE from "three";
import {RoomEnvironment} from "three/examples/jsm/environments/RoomEnvironment.js";
import {FONT, FPS} from "../shared/theme";
import {str, type Preset, type Spec} from "./index";

const W = 1080, H = 1920, DUR = 4.2;
const LX = 690;

export const breakdown: Preset = {
  id: "breakdown",
  label: "Breakdown",
  blurb: "A phone explodes layer by layer on a turntable while each part gets a numbered callout.",
  defaults: {
    title: "Phone",
    subtitle: "Inside a modern phone",
    accent: "#ff7a3d",
    time: "9:41",
    date: "Thursday 20 November",
    labels: [
      ["Cover glass", "Ceramic shield"],
      ["Display", "6.7in OLED"],
      ["Frame", "Titanium band"],
      ["Logic board", "A-series chip"],
      ["Battery", "3,582 mAh"],
      ["Camera", "48MP main"],
    ],
  },
  seconds: () => DUR,
  check: (spec: Spec) => {
    if (!str(spec, "title")) throw new Error('spec: "title" is required');
    if (!/^#[0-9a-fA-F]{6}$/.test(str(spec, "accent"))) throw new Error('spec: "accent" must be a hex colour like "#ff7a3d"');
    const labels = (spec.labels ?? []) as unknown[];
    if (!Array.isArray(labels) || labels.length < 1 || labels.length > 6) throw new Error('spec: "labels" must be 1–6 [name, note] pairs');
  },
  Component: Clip,
};

type Overlay = {
  svg: SVGSVGElement | null;
  lines: (SVGPolylineElement | null)[];
  dots: (SVGCircleElement | null)[];
  labels: (HTMLDivElement | null)[];
};

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const inOut3 = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// Anchor per label: [part index, point in part-local space]. Part indexes:
// 0 back, 1 internals, 2 frame, 3 display, 4 cover glass.
const ANCHORS = (PW: number): [number, [number, number, number]][] => [
  [4, [PW / 2 - 0.02, 0.05, -1.2]],
  [3, [PW / 2 - 0.08, 0.06, -0.7]],
  [2, [PW / 2 + 0.05, 0.3, -0.1]],
  [1, [1.35, 0.1, -2.9]],
  [1, [1.5, 0.18, 0.4]],
  [0, [PW / 2, 0.08, 0.9]],
];

function build(spec: Spec, canvas: HTMLCanvasElement) {
  const ACC = str(spec, "accent", "#ff7a3d");
  const labels = (spec.labels as [string, string][]).slice(0, 6);
  const time = str(spec, "time", "9:41");
  const date = str(spec, "date", "");
  const title = str(spec, "title", "").toUpperCase();
  const subtitle = str(spec, "subtitle", "").toUpperCase();

  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true});
  renderer.setSize(W, H, false);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.75;
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-6, 12, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9c2, 1.2);
  rim.position.set(8, 4, -6);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x1a1b1e, 0.45));
  const camera = new THREE.PerspectiveCamera(26, W / H, 0.5, 200);
  camera.setViewOffset(W, H, 150, 0, W, H);

  const PW = 3.6, PL = 7.5, PR = 0.62;
  const rrShape = (w: number, l: number, r: number, hole?: THREE.Path) => {
    const s = new THREE.Shape();
    const x = -w / 2, y = -l / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
    s.lineTo(x + w, y + l - r); s.absarc(x + w - r, y + l - r, r, 0, Math.PI / 2);
    s.lineTo(x + r, y + l); s.absarc(x + r, y + l - r, r, Math.PI / 2, Math.PI);
    s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    if (hole) s.holes.push(hole);
    return s;
  };
  const rrPath = (w: number, l: number, r: number) => {
    const p = new THREE.Path();
    const x = -w / 2, y = -l / 2;
    p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
    p.lineTo(x + w, y + l - r); p.absarc(x + w - r, y + l - r, r, 0, Math.PI / 2);
    p.lineTo(x + r, y + l); p.absarc(x + r, y + l - r, r, Math.PI / 2, Math.PI);
    p.lineTo(x, y + r); p.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    return p;
  };
  const slab = (w: number, l: number, r: number, t: number, mat: THREE.Material, bevel = 0.025, hole?: THREE.Path) => {
    const g = new THREE.ExtrudeGeometry(rrShape(w, l, r, hole), {
      depth: t, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel * 0.8, bevelSegments: 4, curveSegments: 24,
    });
    g.rotateX(-Math.PI / 2);
    return new THREE.Mesh(g, mat);
  };
  const faceUV = (mesh: THREE.Mesh, w: number, l: number) => {
    const g = mesh.geometry, p = g.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      uv[i * 2] = p.getX(i) / w + 0.5;
      uv[i * 2 + 1] = -p.getZ(i) / l + 0.5;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  };
  const tex = (cw: number, ch: number, draw: (x: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const c = document.createElement("canvas");
    c.width = cw; c.height = ch;
    draw(c.getContext("2d")!, cw, ch);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };

  const phone = new THREE.Group();
  scene.add(phone);
  const parts: THREE.Group[] = [];
  const part = (y1: number) => {
    const g = new THREE.Group();
    g.userData.y1 = y1;
    phone.add(g);
    parts.push(g);
    return g;
  };

  // 0 back glass + camera plateau
  const back = part(0);
  {
    const m = new THREE.MeshPhysicalMaterial({color: 0x3b4250, roughness: 0.42, metalness: 0.15, clearcoat: 0.6, clearcoatRoughness: 0.5});
    back.add(slab(PW, PL, PR, 0.07, m));
    const ringM = new THREE.MeshStandardMaterial({color: 0xc4c8ce, metalness: 1, roughness: 0.35});
    const mag = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 16, 96), ringM);
    mag.rotation.x = Math.PI / 2; mag.scale.z = 0.5; mag.position.set(0, 0.11, 0.35); back.add(mag);
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.05, 64), new THREE.MeshStandardMaterial({color: 0xb87f4e, metalness: 0.9, roughness: 0.4}));
    coil.position.set(0, 0.1, 0.35); back.add(coil);
    const coilC = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 48), new THREE.MeshStandardMaterial({color: 0x23262b, roughness: 0.6}));
    coilC.position.set(0, 0.105, 0.35); back.add(coilC);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.8), ringM);
    strip.position.set(0, 0.1, 1.75); back.add(strip);
  }
  // 1 internals: battery, logic board, cameras
  const inner = part(1.6);
  {
    const batT = tex(520, 760, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#2a2d33"); g.addColorStop(1, "#1b1d21");
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.strokeStyle = "rgba(255,255,255,.08)"; x.lineWidth = 3; x.strokeRect(24, 24, w - 48, h - 48);
      x.fillStyle = "#d9d6d0"; x.font = `600 46px ${FONT.sans}`; x.fillText("Li-ion", 60, 120);
      x.fillStyle = "#9ba0a8"; x.font = `500 30px ${FONT.mono}`; x.fillText("3,582 mAh", 60, 172); x.fillText("13.9 Wh  3.88 V", 60, 214);
      x.fillStyle = ACC; x.fillRect(60, h - 110, 70, 8);
    });
    const bat = slab(2.7, 3.95, 0.28, 0.16, new THREE.MeshStandardMaterial({color: 0xffffff, map: batT, roughness: 0.55, metalness: 0.2}), 0.02);
    faceUV(bat, 2.7, 3.95); bat.position.set(0.18, 0, 1.25); inner.add(bat);
    const pcbT = tex(600, 480, (x, w, h) => {
      x.fillStyle = "#0f2a22"; x.fillRect(0, 0, w, h);
      x.strokeStyle = "rgba(214,174,92,.55)"; x.lineWidth = 2;
      for (let i = 0; i < 26; i++) {
        const y = 20 + i * 17;
        x.beginPath(); x.moveTo(10, y); x.lineTo(150 + ((i * 37) % 200), y); x.lineTo(180 + ((i * 37) % 200), y + 14); x.lineTo(w - 20, y + 14); x.stroke();
      }
      x.fillStyle = "rgba(214,174,92,.8)";
      for (let i = 0; i < 40; i++) x.fillRect(30 + ((i * 53) % 540), 30 + ((i * 97) % 420), 8, 8);
    });
    const pcb = slab(3.05, 2.55, 0.3, 0.06, new THREE.MeshStandardMaterial({color: 0xffffff, map: pcbT, roughness: 0.6, metalness: 0.3}), 0.015);
    faceUV(pcb, 3.05, 2.55); pcb.position.set(0.05, 0, -2.25); inner.add(pcb);
    const shield = new THREE.MeshStandardMaterial({color: 0xb8bcc2, metalness: 1, roughness: 0.32});
    const chipM = new THREE.MeshStandardMaterial({color: 0x16181b, metalness: 0.4, roughness: 0.35});
    const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z); inner.add(b);
    };
    box(1.05, 0.08, 0.95, shield, 0.55, 0.11, -2.35);
    box(0.62, 0.05, 0.62, chipM, 0.55, 0.165, -2.35);
    box(0.55, 0.07, 0.4, shield, -0.6, 0.1, -1.55);
    box(0.38, 0.06, 0.5, chipM, 0.0, 0.1, -3.0);
    box(0.7, 0.06, 0.3, shield, 0.6, 0.1, -1.35);
    const camM = new THREE.MeshStandardMaterial({color: 0x6d7178, metalness: 0.9, roughness: 0.3});
    const lensM = new THREE.MeshPhysicalMaterial({color: 0x05070a, roughness: 0.05, clearcoat: 1, iridescence: 0.7});
    [[-1.0, -2.25], [-1.0, -1.95], [-1.3, -1.95]].forEach(([x, z]) => {
      const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.18, 40), camM);
      cam.position.set(x - 0.1, 0.13, z - 0.6); inner.add(cam);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 40), lensM);
      lens.position.set(x - 0.1, 0.225, z - 0.6); inner.add(lens);
    });
    box(0.9, 0.14, 0.34, new THREE.MeshStandardMaterial({color: 0x8e939a, metalness: 0.9, roughness: 0.4}), -0.7, 0.07, 3.35);
  }
  // 2 titanium frame
  const frame = part(3.05);
  {
    const fm = new THREE.MeshStandardMaterial({color: 0xa9adb3, metalness: 1, roughness: 0.3});
    frame.add(slab(PW + 0.06, PL + 0.06, PR + 0.03, 0.4, fm, 0.04, rrPath(PW - 0.22, PL - 0.22, PR - 0.1)));
    const btn = (z: number, len: number) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, len), fm);
      b.position.set(-PW / 2 - 0.07, 0.18, z); frame.add(b);
    };
    btn(-1.9, 0.45); btn(-1.25, 0.7); btn(-0.45, 0.7);
    const pb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 1.0), fm);
    pb.position.set(PW / 2 + 0.07, 0.18, -1.3); frame.add(pb);
  }
  // 3 OLED display
  const disp = part(4.4);
  {
    const scrT = tex(720, 1500, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0d1230"); g.addColorStop(0.55, "#3a2470"); g.addColorStop(1, "#ef7d4f");
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      const r = x.createRadialGradient(w * 0.7, h * 0.78, 10, w * 0.7, h * 0.78, w * 0.9);
      r.addColorStop(0, "rgba(255,190,140,.55)"); r.addColorStop(1, "rgba(255,190,140,0)");
      x.fillStyle = r; x.fillRect(0, 0, w, h);
      x.fillStyle = "#fff"; x.textAlign = "center";
      x.font = `500 40px ${FONT.sans}`; x.globalAlpha = 0.85; x.fillText(date, w / 2, 250); x.globalAlpha = 1;
      x.font = `700 230px ${FONT.sans}`; x.fillText(time, w / 2, 470);
      x.fillStyle = "#000"; x.beginPath(); x.roundRect(w / 2 - 110, 40, 220, 64, 32); x.fill();
    });
    disp.add(slab(PW - 0.12, PL - 0.12, PR - 0.06, 0.05, new THREE.MeshStandardMaterial({color: 0x050506, roughness: 0.25, metalness: 0.2}), 0.01));
    const scr = slab(PW - 0.3, PL - 0.3, PR - 0.15, 0.01,
      new THREE.MeshStandardMaterial({color: 0xffffff, map: scrT, emissive: 0xffffff, emissiveMap: scrT, emissiveIntensity: 0.9, roughness: 0.3}), 0);
    faceUV(scr, PW - 0.3, PL - 0.3);
    scr.position.y = 0.055;
    disp.add(scr);
  }
  // 4 cover glass
  const glass = part(5.65);
  {
    const gm = new THREE.MeshPhysicalMaterial({color: 0xdfe9f5, transparent: true, opacity: 0.15, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false});
    const g = slab(PW - 0.04, PL - 0.04, PR - 0.02, 0.05, gm, 0.03);
    glass.add(g);
    glass.add(new THREE.LineSegments(new THREE.EdgesGeometry(g.geometry, 30), new THREE.LineBasicMaterial({color: 0xcfd6de, transparent: true, opacity: 0.55})));
  }

  const Y0 = [0, 0.07, 0, 0.38, 0.44];
  const ORDER = [4, 3, 2, 1, 0];
  phone.rotation.y = THREE.MathUtils.degToRad(-34);

  const ANCH = ANCHORS(PW).slice(0, labels.length);
  const v = new THREE.Vector3();
  const proj = (obj: THREE.Object3D, p: number[]) => {
    v.set(p[0], p[1], p[2]);
    obj.localToWorld(v);
    v.project(camera);
    return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
  };

  const T_EX = 0.45, T_EXD = 1.25, T_LB = 1.05;
  const state = {LY: labels.map((_, i) => 470 + i * 170)};
  const LX_ = LX;

  const setCamera = (t: number) => {
    phone.rotation.y = THREE.MathUtils.degToRad(-33 + 10 * smooth(0, 4.2, t));
    phone.rotation.x = THREE.MathUtils.degToRad(2 * Math.sin(t * 1.3));
    phone.position.y = 0.05 * Math.sin(t * 1.7);
    const ex = smooth(T_EX, T_EX + T_EXD + 0.3, t);
    const look = new THREE.Vector3(0, 0.4 + 2.5 * ex, 0);
    const dist = 46 + 9 * ex, el = THREE.MathUtils.degToRad(34 - 8 * ex);
    camera.position.set(look.x + dist * Math.cos(el) * 0.22, look.y + dist * Math.sin(el), look.z + dist * Math.cos(el));
    camera.lookAt(look.x, look.y, look.z);
    camera.updateMatrixWorld();
    phone.updateMatrixWorld(true);
  };

  const render = (t: number, ui: Overlay) => {
    parts.forEach((p, i) => {
      const k = ORDER.indexOf(i);
      const e = inOut3(clamp((t - T_EX - k * 0.07) / T_EXD));
      p.position.y = Y0[i] + (p.userData.y1 - Y0[i]) * e;
    });
    setCamera(t);
    renderer.render(scene, camera);

    ANCH.forEach(([pi, anchor], i) => {
      const a = smooth(T_LB + i * 0.13, T_LB + i * 0.13 + 0.3, t);
      const [ax, ay] = proj(parts[pi], anchor);
      const ey = state.LY[i];
      const mx = Math.max(ax + 40, LX_ - 90);
      const segA = Math.hypot(mx - ax, ey - ay), segB = LX_ - mx;
      let rem = a * (segA + segB);
      const out: number[][] = [[ax, ay]];
      if (rem <= segA) out.push([ax + (mx - ax) * rem / segA, ay + (ey - ay) * rem / segA]);
      else { out.push([mx, ey]); rem -= segA; out.push([mx + rem, ey]); }
      const ln = ui.lines[i], dt = ui.dots[i], lb = ui.labels[i];
      ln?.setAttribute("points", out.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" "));
      ln?.setAttribute("opacity", a > 0 ? "0.85" : "0");
      dt?.setAttribute("cx", String(ax)); dt?.setAttribute("cy", String(ay)); dt?.setAttribute("opacity", a > 0 ? "1" : "0");
      if (lb) {
        const la = smooth(T_LB + i * 0.13 + 0.18, T_LB + i * 0.13 + 0.45, t);
        lb.style.opacity = String(la);
        lb.style.transform = `translate(${LX_ + 22 + 18 * (1 - la)}px,${state.LY[i] - 34}px)`;
      }
    });
  };

  // Stack labels top-down so none overlap, computed once from the assembled-ish pose at t=3.4.
  setCamera(3.4);
  parts.forEach((p, i) => {
    const k = ORDER.indexOf(i);
    const e = inOut3(clamp((3.4 - T_EX - k * 0.07) / T_EXD));
    p.position.y = Y0[i] + (p.userData.y1 - Y0[i]) * e;
  });
  const ys = ANCH.map(([pi, anchor]) => proj(parts[pi], anchor)[1]);
  const order = ys.map((y, i) => [y, i] as const).sort((a, b) => a[0] - b[0]);
  let prev = -1e9;
  const GAP = 150;
  const out: number[] = [];
  order.forEach(([y, i]) => {
    const yy = Math.max(y, prev + GAP);
    out[i] = yy;
    prev = yy;
  });
  const over = Math.max(0, prev - 1440);
  state.LY = out.map((y) => Math.max(400, y - over));

  return {render, labels, time, date, title, subtitle, ACC, count: labels.length};
}

function Clip({spec}: {spec: Spec}) {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<ReturnType<typeof build> | null>(null);
  const linesRef = useRef<(SVGPolylineElement | null)[]>([]);
  const dotsRef = useRef<(SVGCircleElement | null)[]>([]);
  const labelsRef = useRef<(HTMLDivElement | null)[]>([]);
  const labels = (spec.labels ?? []) as [string, string][];
  const accent = str(spec, "accent", "#ff7a3d");
  const title = str(spec, "title", "").toUpperCase();
  const subtitle = str(spec, "subtitle", "").toUpperCase();

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!worldRef.current) worldRef.current = build(spec, canvas);
    worldRef.current.render(frame / FPS, {
      svg: svgRef.current,
      lines: linesRef.current,
      dots: dotsRef.current,
      labels: labelsRef.current,
    });
  }, [frame, spec]);

  const count = Math.min(labels.length, 6);
  return (
    <AbsoluteFill style={{background: "radial-gradient(ellipse 80% 55% at 42% 48%,#2a2d33 0%,#16181b 55%,#0a0b0d 100%)", fontFamily: FONT.sans}}>
      <canvas ref={canvasRef} width={W} height={H} style={{position: "absolute", left: 0, top: 0}} />
      <div style={{position: "absolute", left: 110, top: 250, fontFamily: FONT.mono, fontWeight: 500, fontSize: 26, letterSpacing: "0.16em", color: "#7d828a"}}>
        <b style={{color: "#e9e6e1", fontWeight: 500}}>{title}</b> / <span>{subtitle}</span>
      </div>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: "absolute", left: 0, top: 0}}>
        {Array.from({length: count}).map((_, i) => (
          <g key={i}>
            <polyline ref={(el) => { linesRef.current[i] = el; }} fill="none" stroke="#c9ccd1" strokeWidth={2} opacity={0} />
            <circle ref={(el) => { dotsRef.current[i] = el; }} r={6} fill={accent} opacity={0} />
          </g>
        ))}
      </svg>
      {Array.from({length: count}).map((_, i) => (
        <div
          key={i}
          ref={(el) => { labelsRef.current[i] = el; }}
          style={{position: "absolute", left: 0, top: 0, width: 250, opacity: 0}}
        >
          <div style={{fontFamily: FONT.mono, fontWeight: 500, fontSize: 24, color: accent, letterSpacing: "0.06em"}}>{String(i + 1).padStart(2, "0")}</div>
          <div style={{marginTop: 6, fontFamily: FONT.sans, fontWeight: 600, fontSize: 31, lineHeight: 1.05, color: "#f3f1ed", letterSpacing: "-0.01em"}}>{labels[i]?.[0] ?? ""}</div>
          <div style={{marginTop: 8, fontFamily: FONT.mono, fontWeight: 500, fontSize: 20, color: "#8b9098"}}>{labels[i]?.[1] ?? ""}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
}
