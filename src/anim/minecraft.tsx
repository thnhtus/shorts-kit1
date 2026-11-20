/**
 * minecraft ported to Remotion: a voxel cottage builds itself in a field, then a
 * chimney-top block slams in, the lights come on and the cottage is alive.
 * Source: vendor/claude-animation-skills/skills/minecraft/template.html (MIT).
 */
import {useLayoutEffect, useRef} from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import * as THREE from "three";
import {FONT, FPS} from "../shared/theme";
import {strs, type Preset, type Spec} from "./index";

const W = 1080, H = 1920, DUR = 4.0, T_SLAM = 2.7;

export const minecraft: Preset = {
  id: "minecraft",
  label: "Minecraft",
  blurb: "A voxel cottage builds itself in a field, then lights up.",
  defaults: {
    lines: ["he built it", "by hand"],
  },
  seconds: () => DUR,
  check: (spec: Spec) => {
    const lines = strs(spec, "lines");
    if (lines.length < 1 || lines.length > 2) throw new Error('spec: "lines" takes 1 or 2 short captions');
    if (lines[0].length > 28) throw new Error('spec: first caption fits up to 28 characters');
  },
  Component: Clip,
};

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeIO = (x: number) => {
  x = clamp(x, 0, 1);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
};
const D2R = Math.PI / 180;

function hash2(i: number, j: number, s: number) {
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x: number, y: number, s: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function build(spec: Spec, canvas: HTMLCanvasElement) {
  const LINES = strs(spec, "lines");
  let seed = 23;
  const rnd = () => {
    seed |= 0;
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
  const SKY_TOP = new THREE.Color(0x5b93f0), SKY_HOR = new THREE.Color(0xb9d3f8);
  scene.background = SKY_HOR.clone();
  scene.fog = new THREE.Fog(SKY_HOR.clone(), 90, 420);
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.3, 1400);
  camera.setViewOffset(W, H, 40, -60, W, H);

  scene.add(new THREE.HemisphereLight(0xf4f8ff, 0x8d9a78, 2.05));
  const sun = new THREE.DirectionalLight(0xfff3df, 1.45);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -19, right: 19, top: 19, bottom: -19, near: 1, far: 120});
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 2.5;
  sun.position.set(-22, 46, 30);
  sun.target.position.set(0, 4, 0);
  scene.add(sun, sun.target);

  const C = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const pick = <T,>(arr: T[], w?: number[]): T => {
    if (!w) return arr[Math.floor(rnd() * arr.length)];
    let s = 0; for (const x of w) s += x;
    let r = rnd() * s;
    for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i]; }
    return arr[arr.length - 1];
  };
  const mul = (c: [number, number, number], k: number): [number, number, number] => [clamp(Math.round(c[0] * k), 0, 255), clamp(Math.round(c[1] * k), 0, 255), clamp(Math.round(c[2] * k), 0, 255)];

  function makeTex(draw: (x: number, y: number) => [number, number, number, number] | [number, number, number], o: {mip?: boolean; wrap?: boolean} = {}) {
    const {mip = true, wrap = false} = o;
    const cv = document.createElement("canvas");
    cv.width = cv.height = 16;
    const ctx = cv.getContext("2d")!;
    const img = ctx.createImageData(16, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const p = draw(x, y), k = (y * 16 + x) * 4;
      img.data[k] = p[0]!; img.data[k + 1] = p[1]!; img.data[k + 2] = p[2]!; img.data[k + 3] = p[3] ?? 255;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.NearestFilter;
    t.generateMipmaps = mip;
    t.anisotropy = 8;
    if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    return t;
  }

  const GREENS = ["#5c9b3b", "#65a443", "#6fad4b", "#558f37", "#79b655", "#4c8631"].map(C);
  const GW = [3, 3, 2, 2, 1, 1];
  const DIRT = ["#866043", "#7a573c", "#96704d", "#6b4a31", "#8d6849", "#5f432c"].map(C);
  const texGrassTop = makeTex(() => pick(GREENS, GW));
  const dripD = Array.from({length: 16}, () => 3 + (rnd() < 0.55 ? 1 : 0) + (rnd() < 0.22 ? 1 : 0));
  const texGrassSide = makeTex((x, y) => y < dripD[x] ? mul(pick(GREENS, GW), 0.92) : (rnd() < 0.05 ? C("#7d7a76") : pick(DIRT)));
  const texDirt = makeTex(() => rnd() < 0.04 ? C("#7d7a76") : pick(DIRT));
  const cobPts = Array.from({length: 10}, () => [rnd() * 16, rnd() * 16, 0.78 + rnd() * 0.4]);
  const texCobble = makeTex((x, y) => {
    let d1 = 99, d2 = 99, k1 = 0;
    for (let i = 0; i < cobPts.length; i++) for (let ox = -16; ox <= 16; ox += 16) for (let oy = -16; oy <= 16; oy += 16) {
      const d = Math.hypot(x + 0.5 - cobPts[i][0] - ox, y + 0.5 - cobPts[i][1] - oy);
      if (d < d1) { d2 = d1; d1 = d; k1 = i; } else if (d < d2) d2 = d;
    }
    if (d2 - d1 < 1.15) return mul(C("#4e4e4e"), 0.9 + rnd() * 0.2);
    return mul(C("#8b8b8b"), cobPts[k1][2] * (0.9 + rnd() * 0.2) * (d1 < 1.6 ? 1.08 : 1));
  });
  function planks(pal: [number, number, number][], seam: string) {
    const offs = [3 + Math.floor(rnd() * 4), 9 + Math.floor(rnd() * 4), 1 + Math.floor(rnd() * 4), 7 + Math.floor(rnd() * 5)];
    const tone = Array.from({length: 4 * 8}, () => 0.9 + rnd() * 0.2);
    return makeTex((x, y) => {
      const b = Math.floor(y / 4);
      if (y % 4 === 3) return mul(C(seam), 0.95 + rnd() * 0.1);
      if (x === offs[b]) return mul(C(seam), 1.1);
      const c = pick(pal);
      return mul(c, tone[b * 8 + (x >> 1)] * (0.95 + rnd() * 0.08));
    });
  }
  const texPlank = planks(["#b48c56", "#a7814d", "#bd975e", "#9e7848"].map(C), "#6f5333");
  const texRoof = planks(["#7a4a2e", "#6d4128", "#855236", "#633a23"].map(C), "#3f2414");
  const barkTone = Array.from({length: 16}, () => C(pick(["#6a5032", "#5c4429", "#4d3820", "#76593a"])));
  const texLogSide = makeTex((x) => rnd() < 0.16 ? mul(barkTone[x], 0.72) : mul(barkTone[x], 0.92 + rnd() * 0.16));
  const texLogTop = makeTex((x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 6.5) return mul(barkTone[(x + y) & 15], 0.95);
    return mul(C(Math.floor(d) % 2 ? "#b2915b" : "#987745"), 0.94 + rnd() * 0.1);
  });
  const LEAF = ["#3c7b28", "#468b2f", "#306b21", "#295d1b", "#549a3b"].map(C);
  const texLeaves = makeTex(() => rnd() < 0.13 ? [0, 0, 0, 0] : pick(LEAF), {mip: false});
  const texLeavesFar = makeTex(() => mul(pick(LEAF), 0.92));
  const texGlass = makeTex((x, y) => {
    if (x === 0 || x === 15 || y === 0 || y === 15) return [222, 240, 248, 255];
    if ((x - y === 3 && x > 4 && x < 10) || (x - y === 6 && x > 8 && x < 12) || (x - y === -5 && x > 2 && x < 6)) return [255, 255, 255, 200];
    return [196, 228, 242, 46];
  }, {mip: false});
  const texLantern = makeTex((x, y) => {
    if (y < 3) return (x > 4 && x < 11) ? C("#3b3b44") : [0, 0, 0, 0];
    if (x < 2 || x > 13) return [0, 0, 0, 0];
    if (x < 4 || x > 11 || y < 5 || y > 13) return mul(C("#3d3d46"), 0.9 + rnd() * 0.2);
    return pick(["#ffd66e", "#ffbe48", "#ffe7a0", "#ffc95a"].map(C));
  }, {mip: false});
  const tuftTex = makeTex(() => [0, 0, 0, 0], {mip: true});
  {
    const cv = tuftTex.image as HTMLCanvasElement, ctx = cv.getContext("2d")!;
    const img = ctx.getImageData(0, 0, 16, 16);
    for (let x = 0; x < 16; x++) {
      if (rnd() < 0.3) continue;
      const h = 4 + Math.floor(rnd() * 10);
      for (let k = 0; k < h; k++) {
        const y = 15 - k, c = mul(pick(GREENS, GW), 0.8 + 0.3 * (k / h)), q = (y * 16 + x) * 4;
        img.data[q] = c[0]; img.data[q + 1] = c[1]; img.data[q + 2] = c[2]; img.data[q + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    tuftTex.needsUpdate = true;
  }
  function flowerTex(petal: string, center: string) {
    return makeTex((x, y) => {
      const stem = (x === 7 || x === 8) && y >= 8;
      const leaf = (y === 11 && (x === 5 || x === 6)) || (y === 12 && (x === 9 || x === 10));
      if (y >= 3 && y <= 7 && x >= 5 && x <= 10 && !((y === 3 || y === 7) && (x === 5 || x === 10))) return (y === 5 && (x === 7 || x === 8)) ? C(center) : mul(C(petal), 0.85 + rnd() * 0.25);
      if (stem || leaf) return mul(C("#3f8a2c"), 0.9 + rnd() * 0.2);
      return [0, 0, 0, 0];
    }, {mip: true});
  }
  const texPoppy = flowerTex("#d1202c", "#2b1b12"), texDand = flowerTex("#f2d22b", "#d48a10"), texBlue = flowerTex("#4b7bea", "#e8e2a0");
  const glowTex = (() => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 64;
    const g = cv.getContext("2d")!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,214,130,1)");
    gr.addColorStop(0.35, "rgba(255,170,70,.55)");
    gr.addColorStop(1, "rgba(255,140,40,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  const lam = (map: THREE.Texture, o: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({map, ...o});
  const mGrassTop = lam(texGrassTop), mGrassSide = lam(texGrassSide), mDirt = lam(texDirt);
  const MAT_GRASS = [mGrassSide, mGrassSide, mGrassTop, mDirt, mGrassSide, mGrassSide];
  const MAT_DIRT = lam(texDirt);
  const mLogSide = lam(texLogSide), mLogTop = lam(texLogTop);
  const MAT_LOG = [mLogSide, mLogSide, mLogTop, mLogTop, mLogSide, mLogSide];
  const MAT_LEAF = lam(texLeaves, {alphaTest: 0.5});
  const MAT_LEAF_FAR = lam(texLeavesFar);
  const MAT_COBBLE = lam(texCobble), MAT_PLANK = lam(texPlank), MAT_ROOF = lam(texRoof);
  const MAT_GLASS = lam(texGlass, {transparent: true, depthWrite: false, emissive: new THREE.Color(0xffa63c), emissiveMap: texGlass, emissiveIntensity: 0});
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3(), e4 = new THREE.Euler();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  function staticInst(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], list: [number, number, number, number?, number?][], o: {cast?: boolean; receive?: boolean} = {}) {
    const {cast = true, receive = true} = o;
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach(([x, y, z, s = 1, ry = 0], i) => {
      q4.setFromEuler(e4.set(0, ry, 0));
      im.setMatrixAt(i, m4.compose(v4.set(x, y, z), q4, s4.set(s, s, s)));
    });
    if (!list.length) im.setMatrixAt(0, ZERO);
    im.castShadow = cast; im.receiveShadow = receive;
    scene.add(im);
    return im;
  }

  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {top: {value: SKY_TOP}, hor: {value: SKY_HOR}},
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 hor; varying vec3 vP; void main(){ float h = normalize(vP).y; float k = smoothstep(-0.01, 0.55, h); gl_FragColor = vec4(mix(hor, top, pow(k, 0.75)), 1.0);\n#include <colorspace_fragment>\n}",
  }));
  sky.renderOrder = -10;
  scene.add(sky);

  const Y0 = 3;
  const R = 34;
  function heightAt(i: number, j: number) {
    if (i >= -10 && i <= 6 && j >= -5 && j <= 5) return 3;
    const d = Math.hypot((i + 1.5) / 1.25, j / 0.92) + (vnoise(i * 0.31, j * 0.31, 3) - 0.5) * 2.2;
    if (d < 8.3) return 3;
    if (d < 10.8) return 2;
    if (d < 13.4) return 1;
    if (d > 15.5 && vnoise(i * 0.23 + 40, j * 0.23, 7) > 0.7) return 1;
    return 0;
  }
  const HT = new Map<number, number>();
  const hAt = (i: number, j: number) => {
    const k = i * 1000 + j;
    if (!HT.has(k)) HT.set(k, (Math.abs(i) > R || Math.abs(j) > R) ? 0 : heightAt(i, j));
    return HT.get(k)!;
  };
  const grassCells: [number, number, number][] = [], dirtCells: [number, number, number][] = [];
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
    const h = hAt(i, j);
    if (h < 1) continue;
    grassCells.push([i, h - 0.5, j]);
    const mn = Math.min(hAt(i + 1, j), hAt(i - 1, j), hAt(i, j + 1), hAt(i, j - 1));
    for (let k = h - 1; k >= 1; k--) if (mn < k) dirtCells.push([i, k - 0.5, j]);
  }
  staticInst(boxGeo, MAT_GRASS, grassCells);
  staticInst(boxGeo, MAT_DIRT, dirtCells);
  const farTex = texGrassTop.clone();
  farTex.wrapS = farTex.wrapT = THREE.RepeatWrapping;
  farTex.repeat.set(2400, 2400);
  farTex.needsUpdate = true;
  const field = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), lam(farTex));
  field.rotation.x = -Math.PI / 2;
  field.receiveShadow = true;
  scene.add(field);

  const trunks: [number, number, number][] = [], leaves: [number, number, number][] = [];
  const farTrunks: [number, number, number][] = [], farLeaves: [number, number, number][] = [];
  function oak(x: number, z: number, base: number, h: number, tl: [number, number, number][], ll: [number, number, number][]) {
    for (let k = 0; k < h; k++) tl.push([x, base + k + 0.5, z]);
    const top = base + h, occ = new Set<string>();
    const put = (a: number, y: number, b: number) => {
      const key = a + "," + y + "," + b;
      if (occ.has(key)) return;
      occ.add(key);
      ll.push([a, y + 0.5, b]);
    };
    for (let y = top - 2; y <= top - 1; y++) for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      if (a === 0 && b === 0) continue;
      if (Math.abs(a) === 2 && Math.abs(b) === 2 && rnd() < 0.6) continue;
      put(x + a, y, z + b);
    }
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      if (a === 0 && b === 0) continue;
      if (Math.abs(a) + Math.abs(b) === 2 && rnd() < 0.35) continue;
      put(x + a, top, z + b);
    }
    put(x, top, z);
    put(x, top + 1, z); put(x + 1, top + 1, z); put(x - 1, top + 1, z); put(x, top + 1, z + 1); put(x, top + 1, z - 1);
  }
  oak(-8, -1, Y0, 5, trunks, leaves);
  oak(9, -6, hAt(9, -6), 4, trunks, leaves);
  for (let n = 0; n < 46; n++) {
    const a = rnd() * Math.PI * 2, r = 46 + rnd() * 110;
    const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
    oak(x, z, 0, 4 + Math.floor(rnd() * 3), farTrunks, farLeaves);
  }
  const bushes: [number, number, number][] = [];
  for (let n = 0; n < 26; n++) {
    const a = rnd() * Math.PI * 2, r = 17 + rnd() * 26;
    const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
    bushes.push([x, hAt(x, z) + 0.5, z]);
  }
  staticInst(boxGeo, MAT_LOG, trunks);
  staticInst(boxGeo, MAT_LEAF, leaves.concat(bushes));
  staticInst(boxGeo, MAT_LOG, farTrunks, {cast: false});
  staticInst(boxGeo, MAT_LEAF_FAR, farLeaves, {cast: false});

  function crossGeo(sz: number) {
    const g1 = new THREE.PlaneGeometry(sz, sz);
    g1.rotateY(Math.PI / 4);
    g1.translate(0, sz / 2, 0);
    const g2 = new THREE.PlaneGeometry(sz, sz);
    g2.rotateY(-Math.PI / 4);
    g2.translate(0, sz / 2, 0);
    const pos: number[] = [], uv: number[] = [], nor: number[] = [], idx: number[] = [];
    [g1, g2].forEach((g, gi) => {
      const p = g.attributes.position.array as unknown as number[], u = g.attributes.uv.array as unknown as number[];
      for (let i = 0; i < p.length / 3; i++) { pos.push(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]); uv.push(u[i * 2], u[i * 2 + 1]); nor.push(0, 1, 0); }
      (g.index?.array as unknown as number[]).forEach((x) => idx.push(x + gi * 4));
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    return g;
  }
  const inHouse = (x: number, z: number) => x > -4.8 && x < 4.8 && z > -3.8 && z < 3.8;
  const nearTree = (x: number, z: number) => Math.hypot(x + 8, z + 1) < 1 || Math.hypot(x - 9, z + 6) < 1;
  const tufts: [number, number, number, number, number][] = [];
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
    if (rnd() > 0.42) continue;
    const x = i + (rnd() - 0.5) * 0.7, z = j + (rnd() - 0.5) * 0.7;
    if (inHouse(x, z) || nearTree(x, z) || (x > -1 && x < 1 && z > 2 && z < 6.5)) continue;
    tufts.push([x, hAt(i, j), z, 0.75 + rnd() * 0.45, rnd() * Math.PI]);
  }
  for (let n = 0; n < 1400; n++) {
    const a = rnd() * Math.PI * 2, r = R + rnd() * 30;
    tufts.push([Math.cos(a) * r, 0, Math.sin(a) * r, 0.8 + rnd() * 0.5, rnd() * Math.PI]);
  }
  const crossG = crossGeo(1);
  const tuftMat = lam(tuftTex, {alphaTest: 0.35, side: THREE.DoubleSide});
  staticInst(crossG, tuftMat, tufts, {cast: false});
  const flowers: [number, number, number, number, number][][] = [[], [], []];
  for (let n = 0; n < 60; n++) {
    const x = Math.round(-12 + rnd() * 22), z = Math.round(-6 + rnd() * 17);
    if (inHouse(x, z) || nearTree(x, z) || (x === 0 && z >= 3 && z <= 6)) continue;
    flowers[n % 3].push([x + (rnd() - 0.5) * 0.3, hAt(x, z), z + (rnd() - 0.5) * 0.3, 0.62 + rnd() * 0.18, rnd() * Math.PI]);
  }
  [texPoppy, texDand, texBlue].forEach((tx, k) => staticInst(crossG, lam(tx, {alphaTest: 0.35, side: THREE.DoubleSide}), flowers[k], {cast: false}));

  const CLOUD = 7, CY = 54;
  const cloudCells: [number, number, number][] = [];
  for (let a = -82; a <= 82; a++) for (let b = -82; b <= 82; b++) {
    const n = vnoise(a * 0.19, b * 0.19, 21) * 0.75 + hash2(a, b, 5) * 0.25;
    if (n > 0.63) cloudCells.push([a * CLOUD, CY, b * CLOUD]);
  }
  const cloudGeo = new THREE.BoxGeometry(CLOUD, 3, CLOUD);
  {
    const cols: number[] = [];
    const shade = [0.95, 0.95, 1, 0.86, 0.97, 0.93];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) cols.push(shade[f], shade[f], shade[f]);
    cloudGeo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  }
  const clouds = new THREE.InstancedMesh(cloudGeo, new THREE.MeshBasicMaterial({vertexColors: true, fog: false}), cloudCells.length);
  {
    const white = new THREE.Color(1, 1, 1), cc = new THREE.Color();
    cloudCells.forEach(([x, y, z], i) => {
      clouds.setMatrixAt(i, m4.makeTranslation(x, y, z));
      const f = smooth(260, 580, Math.hypot(x, z)) * 0.8;
      clouds.setColorAt(i, cc.copy(white).lerp(SKY_HOR, f));
    });
  }
  clouds.frustumCulled = false;
  scene.add(clouds);

  interface Block { type: string; x: number; L: number; z: number; T: number; D: number; h0: number; sq: number; spin: number; i: number; }
  const blocks: Block[] = [];
  const add = (type: string, x: number, L: number, z: number) => {
    const b: Block = {type, x, L, z, T: 0, D: 0.2, h0: 2.4, sq: 0.22, spin: (rnd() - 0.5) * 0.9, i: 0};
    blocks.push(b);
    return b;
  };
  const sched = (list: Block[], t0: number, t1: number) => list.forEach((b, i) => {
    b.T = t0 + (t1 - t0) * (list.length < 2 ? 0 : i / (list.length - 1)) + (rnd() - 0.5) * 0.01;
  });
  const ringXZ: [number, number][] = [];
  for (let x = -3; x <= 3; x++) for (let z = -2; z <= 2; z++) if (Math.abs(x) === 3 || Math.abs(z) === 2) ringXZ.push([x, z]);
  const byAngle = (a0: number) => ringXZ.slice().sort((p, q) => (((Math.atan2(p[1], p[0]) - a0) % 6.2832 + 6.2832) % 6.2832) - (((Math.atan2(q[1], q[0]) - a0) % 6.2832 + 6.2832) % 6.2832));
  const DOOR = (x: number, L: number, z: number) => x === 0 && z === 2 && (L === 1 || L === 2);
  const GLASS = (x: number, L: number, z: number) => L === 2 && ((z === 2 && Math.abs(x) === 2) || (Math.abs(x) === 3 && z === 0));
  sched(byAngle(2.55).map(([x, z]) => add("cobble", x, 0, z)), 0.1, 0.5);
  const floorL: [number, number][] = [];
  for (let z = 1; z >= -1; z--) for (let x = -2; x <= 2; x++) floorL.push([x, z]);
  sched(floorL.sort((p, q) => Math.hypot(p[0], p[1]) - Math.hypot(q[0], q[1])).map(([x, z]) => add("plank", x, 0, z)), 0.4, 0.66);
  [[1, 0.62, 0.98, 2.55], [2, 0.94, 1.3, 2.55 + 1.2], [3, 1.26, 1.58, 2.55 + 2.4]].forEach(([L, t0, t1, a0]) => {
    const list: Block[] = [];
    for (const [x, z] of byAngle(a0)) {
      if (DOOR(x, L, z)) continue;
      const corner = Math.abs(x) === 3 && Math.abs(z) === 2;
      list.push(add(corner ? "log" : GLASS(x, L, z) ? "glass" : "plank", x, L, z));
    }
    sched(list, t0 as number, t1 as number);
  });
  const CH_X = 2;
  const roofRow = (k: number, t0: number, t1: number, extra: Block[] = []) => {
    const zs = k < 3 ? [3 - k, -(3 - k)] : [0], L = 3 + k, list: Block[] = [];
    const xs: number[] = [];
    for (let x = -4; x <= 4; x++) xs.push(x);
    if (k % 2) xs.reverse();
    for (const x of xs) for (const z of zs) list.push(add(k === 3 && x === CH_X ? "cobble" : "roof", x, L, z));
    const all: Block[] = [];
    list.forEach((b) => {
      all.push(b);
      for (const e of extra) if (e.x === b.x && !(e as Block & {_in?: number})._in) { (e as Block & {_in?: number})._in = 1; all.push(e); }
    });
    extra.forEach((e) => { if (!(e as Block & {_in?: number})._in) all.push(e); });
    const groups: Block[][] = [];
    all.forEach((b) => {
      if (groups.length && groups[groups.length - 1][0].x === b.x) groups[groups.length - 1].push(b);
      else groups.push([b]);
    });
    groups.forEach((g, gi) => g.forEach((b, bi) => {
      b.T = t0 + (t1 - t0) * gi / Math.max(1, groups.length - 1) + bi * 0.012;
    }));
  };
  const gable = (L: number, zs: number[]) => {
    const l: Block[] = [];
    for (const x of [-3, 3]) for (const z of zs) l.push(add("plank", x, L, z));
    return l;
  };
  roofRow(0, 1.54, 1.8);
  roofRow(1, 1.78, 2.04, gable(4, [-1, 0, 1]));
  roofRow(2, 2.02, 2.26, gable(5, [0]));
  roofRow(3, 2.24, 2.42);
  const chimMid = add("cobble", CH_X, 7, 0);
  chimMid.T = 2.5;
  const chimTop = add("cobble", CH_X, 8, 0);
  Object.assign(chimTop, {T: T_SLAM, D: 0.23, h0: 5.5, sq: 0.4, spin: 0});
  const CHIM_TOP_Y = Y0 + 9;

  const TYPES: Record<string, THREE.Material | THREE.Material[]> = {cobble: MAT_COBBLE, plank: MAT_PLANK, log: MAT_LOG, glass: MAT_GLASS, roof: MAT_ROOF};
  const build: Record<string, THREE.InstancedMesh> = {};
  for (const [k, mat] of Object.entries(TYPES)) {
    const list = blocks.filter((b) => b.type === k);
    list.forEach((b, i) => { b.i = i; });
    const im = new THREE.InstancedMesh(boxGeo, mat, list.length);
    im.castShadow = k !== "glass";
    im.receiveShadow = true;
    im.frustumCulled = false;
    scene.add(im);
    build[k] = im;
  }
  function blockMatrix(b: Block, t: number) {
    const u = t - (b.T - b.D);
    if (u < 0) return ZERO;
    let yOff, sy, sxz, rot = 0;
    if (t < b.T) {
      const p = u / b.D;
      yOff = b.h0 * (1 - p * p);
      const sc = 0.5 + 0.5 * p;
      sy = sxz = sc;
      rot = (1 - p) * (1 - p) * b.spin;
    } else {
      const v = t - b.T;
      yOff = v < 0.16 ? (b.sq > 0.3 ? 0.06 : 0.2) * Math.sin(Math.PI * v / 0.16) : 0;
      const sq = b.sq * Math.exp(-v * 15) * Math.cos(v * 36);
      sy = 1 - sq;
      sxz = 1 + sq * 0.45;
    }
    const baseY = Y0 + b.L + yOff;
    q4.setFromEuler(e4.set(rot * 0.4, rot, 0));
    return m4.compose(v4.set(b.x, baseY + 0.5 * sy, b.z), q4, s4.set(sxz, sy, sxz));
  }

  const shellTex = texPlank.clone();
  shellTex.wrapS = shellTex.wrapT = THREE.RepeatWrapping;
  shellTex.needsUpdate = true;
  const shellMat = lam(shellTex, {emissive: new THREE.Color(0xff9a3a), emissiveMap: shellTex, emissiveIntensity: 0});
  const shell = new THREE.Group();
  scene.add(shell);
  function shellFace(w: number, h: number, px: number, py: number, pz: number, rx: number, ry: number) {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
    const m = new THREE.Mesh(g, shellMat);
    m.position.set(px, py, pz);
    m.rotation.set(rx, ry, 0);
    m.receiveShadow = true;
    shell.add(m);
  }
  const IN = 0.012, yb = Y0 + 1, yt = Y0 + 4;
  shellFace(5, 3, 0, yb, 0, -Math.PI / 2, 0);
  shell.children[0].position.y = yb + IN;
  shellFace(5, 3, 0, yt - IN, 0, Math.PI / 2, 0);
  shellFace(5, 3, 0, (yb + yt) / 2, -1.5 + IN, 0, 0);
  shellFace(5, 3, 0, (yb + yt) / 2, 1.5 - IN, 0, Math.PI);
  shellFace(3, 3, -2.5 + IN, (yb + yt) / 2, 0, 0, Math.PI / 2);
  shellFace(3, 3, 2.5 - IN, (yb + yt) / 2, 0, 0, -Math.PI / 2);
  const lanternMat = lam(texLantern, {alphaTest: 0.5, emissive: new THREE.Color(0xffc060), emissiveMap: texLantern, emissiveIntensity: 0});
  const chainMat = new THREE.MeshLambertMaterial({color: 0x3a3a42});
  const lanterns: THREE.Group[] = [];
  for (const lx of [-2, 2]) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(boxGeo, lanternMat);
    body.scale.set(0.36, 0.42, 0.36);
    body.position.y = 0;
    const chain = new THREE.Mesh(boxGeo, chainMat);
    chain.scale.set(0.06, 1.25, 0.06);
    chain.position.y = 0.21 + 0.62;
    g.add(body, chain);
    g.position.set(lx, Y0 + 2.45, 1.05);
    scene.add(g);
    lanterns.push(g);
  }
  const torch = new THREE.Group();
  {
    const stick = new THREE.Mesh(boxGeo, lam(texLogSide));
    stick.scale.set(0.11, 0.46, 0.11);
    const flame = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({color: 0x5a3a20}));
    flame.scale.set(0.13, 0.13, 0.13);
    flame.position.y = 0.28;
    torch.add(stick, flame);
    torch.userData.flame = flame;
    torch.position.set(0, Y0 + 2.05, -1.32);
    torch.rotation.x = 0.38;
    scene.add(torch);
  }
  const lamp = new THREE.PointLight(0xffa748, 0, 6.5, 1.2);
  lamp.position.set(0, Y0 + 2.4, 0.4);
  scene.add(lamp);
  const halos = [[-2, Y0 + 2.5, 2.62, 2.3], [2, Y0 + 2.5, 2.62, 2.3], [0, Y0 + 2.0, 2.62, 2.6], [-3.62, Y0 + 2.5, 0, 1.9], [3.62, Y0 + 2.5, 0, 1.9]].map(([x, y, z, s]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map: glowTex, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false}));
    sp.position.set(x as number, y as number, z as number);
    sp.scale.set(s as number, s as number, 1);
    scene.add(sp);
    return sp;
  });

  const NDUST = 36, dust: {a: number; r0: number; y0: number; v: number; u: number; s: number; life: number; spin: number}[] = [];
  for (let i = 0; i < NDUST; i++) dust.push({a: i / NDUST * Math.PI * 2 + (rnd() - 0.5) * 0.5, r0: 0.45 + rnd() * 0.3, y0: rnd() * 0.5, v: 2.0 + rnd() * 3.6, u: (rnd() < 0.3 ? -0.6 : 0.6) + rnd() * 2.6, s: 0.2 + rnd() * 0.2, life: 0.5 + rnd() * 0.35, spin: (rnd() - 0.5) * 8});
  const dustMesh = new THREE.InstancedMesh(boxGeo, new THREE.MeshLambertMaterial({color: 0xffffff}), NDUST);
  {
    const cc = new THREE.Color();
    dust.forEach((_d, i) => dustMesh.setColorAt(i, cc.set(pick(["#d9d6d0", "#bdb8b0", "#efece6", "#a8a39b"]))));
  }
  dustMesh.frustumCulled = false;
  dustMesh.castShadow = false;
  scene.add(dustMesh);
  const NSMOKE = 12;
  const smoke: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>[] = [];
  for (let i = 0; i < NSMOKE; i++) {
    const m = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({color: 0xcccccc, transparent: true, opacity: 0, depthWrite: false}));
    m.userData = {s0: 2.84 + i * 0.11, ph: rnd() * 6.28, sz: 0.3 + rnd() * 0.12, rx: rnd() * 3, ry: rnd() * 3};
    scene.add(m);
    smoke.push(m);
  }
  const SMOKE_A = new THREE.Color(0x8e8e8e), SMOKE_B = new THREE.Color(0xeeeeee);

  const T_LIT = T_SLAM + 0.095;
  function litAt(t: number) {
    const a = t - T_LIT;
    if (a < 0) return 0;
    const base = a < 0.04 ? 0.35 : a < 0.08 ? 0.7 : 1;
    return base * (1 + 0.05 * Math.sin(t * 29) + 0.035 * Math.sin(t * 61 + 1.3));
  }
  const render = (t: number) => {
    t = clamp(t, 0, DUR);
    for (const b of blocks) build[b.type].setMatrixAt(b.i, blockMatrix(b, t));
    for (const k in build) build[k].instanceMatrix.needsUpdate = true;

    const lit = litAt(t);
    shell.visible = t >= 1.62;
    shellMat.color.setScalar(1 - 0.74 * smooth(1.7, 2.45, t));
    shellMat.emissiveIntensity = lit * 0.85;
    MAT_GLASS.emissiveIntensity = lit * 1.1;
    lanternMat.emissiveIntensity = lit * 2.2;
    const lp = smooth(2.2, 2.34, t);
    lanterns.forEach((g, i) => {
      g.visible = lp > 0;
      g.scale.setScalar(Math.max(0.001, lp));
      g.rotation.z = 0.05 * Math.sin(t * 2.2 + i * 1.7) * lp;
    });
    torch.visible = t >= 2.3;
    (torch.userData.flame as THREE.Mesh).material = new THREE.MeshBasicMaterial({color: lit > 0 ? 0xffd36a : 0x5a3a20});
    lamp.intensity = lit * 7;
    halos.forEach((h, i) => { h.material.opacity = lit * (i === 2 ? 0.5 : 0.62); });

    const ad = t - T_SLAM;
    dust.forEach((d, i) => {
      if (ad < 0 || ad > d.life) { dustMesh.setMatrixAt(i, ZERO); return; }
      const k = 5, hd = d.v * (1 - Math.exp(-k * ad)) / k;
      const y = CHIM_TOP_Y - 1 + d.y0 + d.u * ad - 2.6 * ad * ad;
      const s = d.s * (1 - Math.pow(ad / d.life, 1.8));
      q4.setFromEuler(e4.set(d.spin * ad, d.spin * ad * 0.7, 0));
      dustMesh.setMatrixAt(i, m4.compose(v4.set(CH_X + Math.cos(d.a) * (hd + d.r0), y, Math.sin(d.a) * (hd + d.r0)), q4, s4.set(s, s, s)));
    });
    dustMesh.instanceMatrix.needsUpdate = true;

    smoke.forEach((m) => {
      const u = m.userData as {s0: number; ph: number; sz: number; rx: number; ry: number};
      const a = t - u.s0, life = 1.25;
      if (a < 0 || a > life) { m.visible = false; m.material.opacity = 0; return; }
      m.visible = true;
      m.position.set(CH_X + 0.9 * a * a + 0.22 * Math.sin(u.ph + a * 2.6), CHIM_TOP_Y + 0.2 + 3.4 * a - 0.7 * a * a, 0.2 * Math.sin(u.ph * 1.3 + a * 2.1));
      m.scale.setScalar((u.sz + 0.5 * Math.min(1, a / 0.9)));
      m.rotation.set(u.rx + a * 0.9, u.ry + a * 0.6, 0);
      m.material.opacity = 0.92 * smooth(0, 0.05, a) * (1 - smooth(life * 0.45, life, a));
      (m.material as THREE.MeshLambertMaterial).color.copy(SMOKE_A).lerp(SMOKE_B, clamp(a / 0.9, 0, 1));
    });

    clouds.position.set(t * 1.7, 0, 0);

    const p = easeIO(t / 3.75);
    const az = lerp(-34, 23, p) * D2R, el = lerp(29, 11.5, easeIO(t / 3.55)) * D2R, dist = lerp(41, 31.5, p);
    const ty = lerp(Y0 + 2.0, Y0 + 4.3, smooth(0, 2.7, t));
    const as = t - T_SLAM, shake = as > 0 ? Math.exp(-as * 13) * 0.2 : 0;
    const sx = shake * Math.sin(as * 71), sy = shake * Math.cos(as * 83);
    camera.position.set(dist * Math.cos(el) * Math.sin(az) + sx, ty + dist * Math.sin(el) + sy, dist * Math.cos(el) * Math.cos(az));
    camera.lookAt(sx * 0.6, ty + sy * 0.6, 0);
    camera.updateMatrixWorld();
    sky.position.copy(camera.position);
    renderer.render(scene, camera);
  };

  return {render, lines: LINES};
}

const step = (x: number, q: number) => Math.round(x / q) * q;

function Clip({spec}: {spec: Spec}) {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<ReturnType<typeof build> | null>(null);
  const t = frame / FPS;
  const lines = strs(spec, "lines");

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!worldRef.current) worldRef.current = build(spec, canvas);
    worldRef.current.render(t);
  }, [t, spec]);

  const cap1 = lines[0] ?? "";
  const cap2 = lines[1] ?? "";

  const capStyle = (on: boolean): React.CSSProperties => ({
    position: "absolute",
    left: 540,
    top: 345,
    transform: "translate(-50%,-50%)",
    whiteSpace: "nowrap",
    fontFamily: FONT.sans,
    fontWeight: 700,
    fontSize: 92,
    lineHeight: 1,
    color: "#ffffff",
    textShadow: "7px 7px 0 #2f2a25, 0 0 22px rgba(20,30,50,.22)",
    letterSpacing: "0.01em",
    opacity: on ? 1 : 0,
    visibility: on ? "visible" : "hidden",
  });
  const cap1Letters = cap1.split("").map((ch, i) => {
    const start = t - (0.3 + i * 0.03);
    let y = 0, o = 1;
    if (start < 0) { y = -70; o = 0; }
    else if (start < 0.12) { const q = start / 0.12; y = -70 * (1 - q * q); }
    else { const v = start - 0.12; y = v < 0.12 ? -14 * Math.sin(Math.PI * v / 0.12) : 0; }
    return (
      <span key={i} style={{display: "inline-block", opacity: o, transform: `translateY(${step(y, 6)}px)`}}>
        {ch === " " ? "\u00A0" : ch}
      </span>
    );
  });
  const cap1Out = 1 - smooth(2.58, 2.66, t);
  const cap2Opacity = t >= T_SLAM ? 1 : 0;
  const cap2Scale = t >= T_SLAM ? 1 : 1.6;

  return (
    <AbsoluteFill style={{background: "#86b3f5"}}>
      <canvas ref={canvasRef} width={W} height={H} style={{position: "absolute", left: 0, top: 0, width: W, height: H}} />
      <div style={{...capStyle(cap1Out > 0), opacity: cap1Out, transform: "translate(-50%,-50%)"}}>
        {cap1Letters}
      </div>
      <div style={{...capStyle(cap2Opacity > 0), top: 345, fontSize: 150, textShadow: "10px 10px 0 #2f2a25, 0 0 26px rgba(20,30,50,.25)", opacity: cap2Opacity, transform: `translate(-50%,-50%) scale(${cap2Scale.toFixed(2)})`}}>
        {cap2}
      </div>
    </AbsoluteFill>
  );
}
