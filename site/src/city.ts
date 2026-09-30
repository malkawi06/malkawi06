import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  NormalBlending,
  NoToneMapping,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export type Theme = "dark" | "light";

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

type Palette = {
  sky: string;
  horizon: string;
  fog: string;
  fogDensity: number;
  ground: string;
  road: string;
  line: string;
  base: string;
  top: string;
  winA: string;
  winB: string;
  winAmount: number;
  glow: string;
  traffic: string;
  trafficAlt: string;
  trafficAlpha: number;
  smoke: string;
  ring: string;
  light: number;
  bloom: number;
};

const PALETTES: Record<Theme, Palette> = {
  dark: {
    sky: "#030303",
    horizon: "#120d08",
    fog: "#120d08",
    fogDensity: 0.0125,
    ground: "#070707",
    road: "#121110",
    line: "#6b4a17",
    base: "#0b0c0d",
    top: "#16171a",
    winA: "#ffb547",
    winB: "#fff1d6",
    winAmount: 0.095,
    glow: "#ff9d2e",
    traffic: "#ffb13b",
    trafficAlt: "#fff4e0",
    trafficAlpha: 1,
    smoke: "#3a3026",
    ring: "#ffb13b",
    light: 0,
    bloom: 0.5,
  },
  light: {
    sky: "#dfe2e3",
    horizon: "#eceeed",
    fog: "#eceeed",
    fogDensity: 0.0098,
    ground: "#e6e7e5",
    road: "#d6d7d4",
    line: "#c7a266",
    base: "#d9d9d6",
    top: "#f6f6f4",
    winA: "#8d9195",
    winB: "#b4b8bb",
    winAmount: 0.5,
    glow: "#e9a13a",
    traffic: "#e08a12",
    trafficAlt: "#b86a00",
    trafficAlpha: 0.9,
    smoke: "#c9c6bf",
    ring: "#e08a12",
    light: 1,
    bloom: 0.18,
  },
};

/* ------------------------------------------------------------------ */
/* City layout                                                         */
/* ------------------------------------------------------------------ */

const BLOCK = 6; // distance between road centre lines
const ROAD = 1.5; // road width
const RING_R = 4.4; // roundabout radius (a nod to Culture Circle)
const PLAZA_CLEAR = 8.6; // no buildings inside this radius

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Shaders                                                             */
/* ------------------------------------------------------------------ */

const FOG_GLSL = /* glsl */ `
  uniform vec3 uFog;
  uniform float uFogDensity;
  uniform vec3 uCam;
  vec3 applyFog(vec3 col, vec3 world) {
    float d = length(world - uCam);
    float f = 1.0 - exp(-pow(d * uFogDensity, 2.0));
    return mix(col, uFog, clamp(f, 0.0, 1.0));
  }
`;

const HASH_GLSL = /* glsl */ `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
`;

const buildingVert = /* glsl */ `
  attribute float aSeed;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vSeed;
  varying float vH;
  void main() {
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vNormal = normal;
    vSeed = aSeed;
    vH = position.y;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const buildingFrag = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uTop;
  uniform vec3 uWinA;
  uniform vec3 uWinB;
  uniform float uWinAmount;
  uniform vec3 uGlow;
  uniform float uLight;
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vSeed;
  varying float vH;
  ${FOG_GLSL}
  ${HASH_GLSL}
  void main() {
    vec3 n = normalize(vNormal);
    vec3 col = mix(uBase, uTop, clamp(vH, 0.0, 1.0) * 0.55);
    if (abs(n.y) < 0.5) {
      float side = abs(n.x) > 0.5 ? 1.0 : 0.0;
      float u = (side > 0.5 ? vWorld.z : vWorld.x) * 3.4;
      float v = vWorld.y * 3.2;
      vec2 cell = floor(vec2(u, v));
      vec2 f = fract(vec2(u, v));
      float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.26, f.y) * step(f.y, 0.74);
      float h = hash21(cell + vec2(vSeed * 31.7, side * 7.0 + sign(n.x + n.z) * 3.0));
      float lit = step(1.0 - uWinAmount, h);
      // a handful of windows switch on and off slowly
      float blink = step(0.985, fract(h * 97.0)) * step(0.5, fract(uTime * 0.07 + h * 5.0));
      lit = max(lit - blink, 0.0);
      vec3 wc = mix(uWinA, uWinB, fract(h * 13.0));
      if (uLight < 0.5) {
        col += win * lit * wc * (0.35 + 0.55 * fract(h * 7.3));
        col += win * (1.0 - lit) * vec3(0.012);
      } else {
        col = mix(col, wc, win * (0.35 + 0.35 * fract(h * 7.3)));
      }
      col *= side > 0.5 ? 0.82 : 1.0;
    } else {
      col = uTop;
    }
    // warm street light bouncing on the lower floors
    col += uGlow * exp(-vWorld.y * 0.9) * (uLight < 0.5 ? 0.16 : 0.05);
    gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
  }
`;

const groundVert = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const groundFrag = /* glsl */ `
  uniform vec3 uGround;
  uniform vec3 uRoad;
  uniform vec3 uLine;
  uniform vec3 uGlow;
  uniform float uLight;
  uniform float uExtent;
  varying vec3 vWorld;
  ${FOG_GLSL}
  void main() {
    vec2 p = vWorld.xz;
    float half_ = ${(ROAD / 2).toFixed(3)};
    vec2 g = abs(fract(p / ${BLOCK.toFixed(1)} + 0.5) - 0.5) * ${BLOCK.toFixed(1)};
    float roadX = 1.0 - smoothstep(half_ - 0.04, half_ + 0.04, g.y);
    float roadZ = 1.0 - smoothstep(half_ - 0.04, half_ + 0.04, g.x);
    float road = max(roadX, roadZ);
    float r = length(p);
    float ring = 1.0 - smoothstep(half_ - 0.05, half_ + 0.05, abs(r - ${RING_R.toFixed(2)}));
    float plaza = 1.0 - smoothstep(${(RING_R - ROAD / 2).toFixed(2)} - 0.05, ${(RING_R - ROAD / 2).toFixed(2)}, r);
    road = max(road * (1.0 - plaza), ring);
    // city fades into open land beyond its edge
    float inside = 1.0 - smoothstep(uExtent * 0.5, uExtent * 0.5 + 6.0, max(abs(p.x), abs(p.y)));
    road *= inside;

    vec3 col = mix(uGround, uRoad, road);
    // dashed centre lines
    float dashX = step(g.y, 0.035) * step(0.5, fract(p.x * 0.9)) * roadX;
    float dashZ = step(g.x, 0.035) * step(0.5, fract(p.y * 0.9)) * roadZ;
    float dash = max(dashX, dashZ) * (1.0 - plaza) * inside;
    float ringLine = step(abs(r - ${RING_R.toFixed(2)}), 0.035);
    col = mix(col, uLine, max(dash * (1.0 - step(r, ${(RING_R + ROAD).toFixed(2)})), ringLine) * 0.9);
    // plaza: a soft warm disc at the centre of the roundabout
    col = mix(col, mix(uRoad, uGlow, uLight < 0.5 ? 0.06 : 0.05), plaza * 0.7);
    // sodium glow along the streets
    col += uGlow * road * (uLight < 0.5 ? 0.035 : 0.0);
    gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
  }
`;

const trafficVert = /* glsl */ `
  attribute vec4 aLane;   // type, coord, dir, speed
  attribute float aPhase;
  attribute float aTint;
  uniform float uTime;
  uniform float uExtent;
  uniform float uStreak;
  varying float vHead;
  varying float vFade;
  varying float vTint;
  varying vec3 vWorld;
  void main() {
    float type = aLane.x;
    float coord = aLane.y;
    float dir = aLane.z;
    float speed = aLane.w;
    vec3 p = position;
    vHead = p.x + 0.5;
    p.x *= uStreak;
    vec3 pos;
    vFade = 1.0;
    if (type < 0.5) {
      float s = fract(aPhase + uTime * speed);
      float x = (s - 0.5) * uExtent * dir;
      pos = vec3(x + p.x * dir, 0.14 + p.y, coord + p.z);
      vFade = smoothstep(0.0, 0.06, s) * smoothstep(1.0, 0.94, s);
      vFade *= smoothstep(${(RING_R + 0.2).toFixed(2)}, ${(RING_R + 1.6).toFixed(2)}, length(pos.xz));
    } else if (type < 1.5) {
      float s = fract(aPhase + uTime * speed);
      float z = (s - 0.5) * uExtent * dir;
      pos = vec3(coord + p.z, 0.14 + p.y, z + p.x * dir);
      vFade = smoothstep(0.0, 0.06, s) * smoothstep(1.0, 0.94, s);
      vFade *= smoothstep(${(RING_R + 0.2).toFixed(2)}, ${(RING_R + 1.6).toFixed(2)}, length(pos.xz));
    } else {
      float a = aPhase * 6.28318 + uTime * speed * 40.0 * dir;
      vec3 radial = vec3(cos(a), 0.0, sin(a));
      vec3 tangent = vec3(-sin(a), 0.0, cos(a)) * dir;
      pos = radial * coord + tangent * p.x + radial * p.z + vec3(0.0, 0.14 + p.y, 0.0);
    }
    vTint = aTint;
    vWorld = pos;
    gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
  }
`;

const trafficFrag = /* glsl */ `
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform float uAlpha;
  varying float vHead;
  varying float vFade;
  varying float vTint;
  varying vec3 vWorld;
  ${FOG_GLSL}
  void main() {
    vec3 col = mix(uColA, uColB, step(0.72, vTint));
    float trail = pow(clamp(vHead, 0.0, 1.0), 1.6);
    float a = trail * vFade * uAlpha;
    float d = length(vWorld - uCam);
    float fog = exp(-pow(d * uFogDensity * 0.8, 2.0));
    gl_FragColor = vec4(col * (1.0 + trail * 1.4), a * fog);
  }
`;

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFrag = /* glsl */ `
  uniform vec3 uSky;
  uniform vec3 uHorizon;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, -0.2, 1.0);
    float t = pow(clamp(1.0 - h * 1.8, 0.0, 1.0), 1.6);
    gl_FragColor = vec4(mix(uSky, uHorizon, t), 1.0);
  }
`;

const smokeVert = /* glsl */ `
  attribute vec3 aOrigin;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPixel;
  varying float vLife;
  varying vec3 vWorld;
  void main() {
    float life = fract(aPhase + uTime * 0.045);
    vec3 pos = aOrigin + vec3(sin(aPhase * 40.0 + life * 3.0) * life * 1.6 + life * 3.5, life * 16.0, cos(aPhase * 23.0) * life * 1.4);
    vLife = life;
    vWorld = pos;
    vec4 mv = viewMatrix * vec4(pos, 1.0);
    gl_PointSize = uPixel * (40.0 + life * 160.0) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const smokeFrag = /* glsl */ `
  uniform vec3 uSmoke;
  varying float vLife;
  varying vec3 vWorld;
  ${FOG_GLSL}
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    float a = smoothstep(0.5, 0.0, r) * (1.0 - vLife) * smoothstep(0.0, 0.08, vLife) * 0.22;
    gl_FragColor = vec4(applyFog(uSmoke, vWorld), a);
  }
`;

const flatFrag = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vWorld;
  ${FOG_GLSL}
  void main() {
    gl_FragColor = vec4(applyFog(uColor, vWorld), 1.0);
  }
`;

const flatVert = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/* ------------------------------------------------------------------ */
/* Camera choreography                                                 */
/* ------------------------------------------------------------------ */

export type Shot = { pos: [number, number, number]; target: [number, number, number] };

// Each named shot is where the camera sits while that part of the story is on screen.
export const SHOTS: Record<string, Shot> = {
  sky: { pos: [6, 150, 30], target: [0, 0, 0] },
  hero: { pos: [50, 25, 56], target: [-2, 5, -14] },
  profile: { pos: [-54, 34, 52], target: [10, 0, -6] },
  salka: { pos: [15, 17, 21], target: [-1, 0, 1] },
  salkaDeep: { pos: [-24, 30, 26], target: [2, 0, -2] },
  clayer: { pos: [4, 13, -2], target: [36, 9, -38] },
  clayerDeep: { pos: [12, 30, -4], target: [40, 6, -42] },
  leadership: { pos: [0, 68, 58], target: [0, 0, -6] },
  skills: { pos: [-44, 16, -8], target: [-10, 4, -12] },
  contact: { pos: [58, 44, 64], target: [0, 0, 0] },
};

/* ------------------------------------------------------------------ */
/* City factory                                                        */
/* ------------------------------------------------------------------ */

export type CityOptions = {
  canvas: HTMLCanvasElement;
  theme: Theme;
  reducedMotion: boolean;
  lowPower: boolean;
  /** A smaller city for small framed canvases. */
  compact?: boolean;
  /** Frame rate ceiling. The slow camera does not need 60 fps. */
  maxFps?: number;
};

export function createCity({ canvas, theme, reducedMotion, lowPower, compact = false, maxFps = 60 }: CityOptions) {
  const renderer = new WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: "high-performance" });
  renderer.toneMapping = NoToneMapping;
  let dpr = Math.min(window.devicePixelRatio, lowPower ? 1.25 : 1.6);
  renderer.setPixelRatio(dpr);

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.5, 900);
  let pal = PALETTES[theme];

  const shared = {
    uFog: { value: new Color(pal.fog) },
    uFogDensity: { value: pal.fogDensity },
    uCam: { value: new Vector3() },
    uTime: { value: 0 },
    uGlow: { value: new Color(pal.glow) },
    uLight: { value: pal.light },
  };

  const HALF = compact ? 6 : lowPower ? 7 : 9; // blocks from centre to edge
  const EXTENT = HALF * 2 * BLOCK;

  /* Sky */
  const skyMat = new ShaderMaterial({
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    uniforms: { uSky: { value: new Color(pal.sky) }, uHorizon: { value: new Color(pal.horizon) } },
    side: BackSide,
    depthWrite: false,
  });
  const sky = new Mesh(new SphereGeometry(600, 32, 16), skyMat);
  scene.add(sky);

  /* Ground */
  const groundMat = new ShaderMaterial({
    vertexShader: groundVert,
    fragmentShader: groundFrag,
    uniforms: {
      ...shared,
      uGround: { value: new Color(pal.ground) },
      uRoad: { value: new Color(pal.road) },
      uLine: { value: new Color(pal.line) },
      uExtent: { value: EXTENT },
    },
  });
  const ground = new Mesh(new PlaneGeometry(EXTENT * 5, EXTENT * 5), groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  /* Buildings */
  const rand = rng(7);
  type Lot = { x: number; z: number; w: number; d: number; h: number };
  const lots: Lot[] = [];
  const industrial = (x: number, z: number) => x > BLOCK * 3.5 && z < -BLOCK * 3.5;
  const inner = BLOCK - ROAD - 0.5;
  for (let i = -HALF; i < HALF; i++) {
    for (let j = -HALF; j < HALF; j++) {
      const cx = (i + 0.5) * BLOCK;
      const cz = (j + 0.5) * BLOCK;
      const dist = Math.hypot(cx, cz);
      if (dist < PLAZA_CLEAR) continue;
      if (industrial(cx, cz)) {
        // low, wide sheds around the stacks
        if (rand() < 0.55) lots.push({ x: cx, z: cz, w: inner, d: inner * (0.5 + rand() * 0.4), h: 1.2 + rand() * 1.6 });
        continue;
      }
      const edge = Math.max(Math.abs(cx), Math.abs(cz)) / (HALF * BLOCK);
      // the skyline peaks north-east of the roundabout; the circle itself stays low-rise
      const dd = Math.hypot(cx - 14, cz + 18);
      const downtown = Math.exp(-(dd * dd) / (2 * 20 * 20)) * MathUtils.smoothstep(dist, 10, 22);
      const split = rand();
      const parts = split < 0.35 ? 1 : split < 0.7 ? 2 : 4;
      for (let k = 0; k < parts; k++) {
        let w = inner;
        let d = inner;
        let ox = 0;
        let oz = 0;
        if (parts === 2) {
          if (rand() < 0.5) {
            w = inner / 2 - 0.2;
            ox = (k === 0 ? -1 : 1) * (inner / 4 + 0.1);
          } else {
            d = inner / 2 - 0.2;
            oz = (k === 0 ? -1 : 1) * (inner / 4 + 0.1);
          }
        } else if (parts === 4) {
          w = inner / 2 - 0.2;
          d = inner / 2 - 0.2;
          ox = (k % 2 === 0 ? -1 : 1) * (inner / 4 + 0.1);
          oz = (k < 2 ? -1 : 1) * (inner / 4 + 0.1);
        }
        let h = 1.2 + rand() * 3 + downtown * (3 + rand() * 12) * (1 - edge * 0.6);
        if (rand() < 0.05 && dd < 26 && dist > 16) h += 10 + rand() * 10; // a few towers
        lots.push({ x: cx + ox, z: cz + oz, w: w * (0.82 + rand() * 0.18), d: d * (0.82 + rand() * 0.18), h });
      }
    }
  }

  const boxGeo = new BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const buildingMat = new ShaderMaterial({
    vertexShader: buildingVert,
    fragmentShader: buildingFrag,
    uniforms: {
      ...shared,
      uBase: { value: new Color(pal.base) },
      uTop: { value: new Color(pal.top) },
      uWinA: { value: new Color(pal.winA) },
      uWinB: { value: new Color(pal.winB) },
      uWinAmount: { value: pal.winAmount },
    },
  });
  const buildings = new InstancedMesh(boxGeo, buildingMat, lots.length);
  const seeds = new Float32Array(lots.length);
  const dummy = new Object3D();
  lots.forEach((l, idx) => {
    dummy.position.set(l.x, 0, l.z);
    dummy.scale.set(l.w, l.h, l.d);
    dummy.updateMatrix();
    buildings.setMatrixAt(idx, dummy.matrix);
    seeds[idx] = rand();
  });
  boxGeo.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 1));
  buildings.frustumCulled = false;
  scene.add(buildings);

  /* Industrial stacks with C-Layer capture rings */
  const stackMat = new ShaderMaterial({
    vertexShader: flatVert,
    fragmentShader: flatFrag,
    uniforms: { ...shared, uColor: { value: new Color(pal.top) } },
  });
  const ringMat = new ShaderMaterial({
    vertexShader: flatVert,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uPulse;
      varying vec3 vWorld;
      ${FOG_GLSL}
      void main() { gl_FragColor = vec4(applyFog(uColor * uPulse, vWorld), 1.0); }
    `,
    uniforms: { ...shared, uColor: { value: new Color(pal.ring) }, uPulse: { value: 1.6 } },
  });
  const stackSpots: Vector3[] = [];
  const stackGeo = new CylinderGeometry(0.55, 0.85, 1, 20, 1);
  stackGeo.translate(0, 0.5, 0);
  const ringGeo = new TorusGeometry(0.78, 0.07, 8, 32);
  ringGeo.rotateX(Math.PI / 2);
  const stackPositions: [number, number, number][] = [
    [BLOCK * 5.5, 0, -BLOCK * 5.5],
    [BLOCK * 6.5, 0, -BLOCK * 6.4],
    [BLOCK * 4.6, 0, -BLOCK * 6.6],
    [BLOCK * 6.3, 0, -BLOCK * 4.6],
    [BLOCK * 7.4, 0, -BLOCK * 7.2],
  ];
  stackPositions.forEach(([x, , z], i) => {
    const h = 14 + (i % 3) * 3.5;
    const stack = new Mesh(stackGeo, stackMat);
    stack.position.set(x, 0, z);
    stack.scale.set(1, h, 1);
    scene.add(stack);
    // four capture layers near the top of each stack
    for (let r = 0; r < 4; r++) {
      const ring = new Mesh(ringGeo, ringMat);
      ring.position.set(x, h - 1.2 - r * 0.55, z);
      ring.scale.setScalar(0.86);
      scene.add(ring);
    }
    stackSpots.push(new Vector3(x, h, z));
  });

  /* Smoke */
  const SMOKE = compact ? 50 : lowPower ? 90 : 220;
  const smokeGeo = new BufferGeometry();
  const origins = new Float32Array(SMOKE * 3);
  const phases = new Float32Array(SMOKE);
  for (let i = 0; i < SMOKE; i++) {
    const s = stackSpots[i % stackSpots.length];
    origins.set([s.x, s.y + 0.2, s.z], i * 3);
    phases[i] = rand();
  }
  smokeGeo.setAttribute("position", new BufferAttribute(new Float32Array(SMOKE * 3), 3));
  smokeGeo.setAttribute("aOrigin", new BufferAttribute(origins, 3));
  smokeGeo.setAttribute("aPhase", new BufferAttribute(phases, 1));
  const smokeMat = new ShaderMaterial({
    vertexShader: smokeVert,
    fragmentShader: smokeFrag,
    uniforms: { ...shared, uSmoke: { value: new Color(pal.smoke) }, uPixel: { value: 1 } },
    transparent: true,
    depthWrite: false,
  });
  const smoke = new Points(smokeGeo, smokeMat);
  smoke.frustumCulled = false;
  scene.add(smoke);

  /* Traffic */
  const CARS = compact ? 300 : lowPower ? 520 : 1400;
  const carGeo = new BoxGeometry(1, 0.12, 0.22);
  const lanes = new Float32Array(CARS * 4);
  const carPhase = new Float32Array(CARS);
  const tint = new Float32Array(CARS);
  const roads: number[] = [];
  for (let k = -HALF; k <= HALF; k++) roads.push(k * BLOCK);
  for (let i = 0; i < CARS; i++) {
    const r = rand();
    let type: number;
    let coord: number;
    let dir = rand() < 0.5 ? -1 : 1;
    if (r < 0.035) {
      type = 2;
      coord = RING_R + (dir > 0 ? 0.32 : -0.32);
    } else {
      type = r < 0.55 ? 0 : 1;
      const road = roads[Math.floor(rand() * roads.length)];
      coord = road + 0.36 * dir;
    }
    const speed = (0.016 + rand() * 0.03) * (type === 2 ? 0.25 : 1);
    lanes.set([type, coord, dir, speed], i * 4);
    carPhase[i] = rand();
    tint[i] = rand();
  }
  carGeo.setAttribute("aLane", new InstancedBufferAttribute(lanes, 4));
  carGeo.setAttribute("aPhase", new InstancedBufferAttribute(carPhase, 1));
  carGeo.setAttribute("aTint", new InstancedBufferAttribute(tint, 1));
  const trafficMat = new ShaderMaterial({
    vertexShader: trafficVert,
    fragmentShader: trafficFrag,
    uniforms: {
      ...shared,
      uExtent: { value: EXTENT },
      uStreak: { value: 2.6 },
      uColA: { value: new Color(pal.traffic) },
      uColB: { value: new Color(pal.trafficAlt) },
      uAlpha: { value: pal.trafficAlpha },
    },
    transparent: true,
    depthWrite: false,
    blending: theme === "dark" ? AdditiveBlending : NormalBlending,
  });
  const traffic = new InstancedMesh(carGeo, trafficMat, CARS);
  const identity = new Matrix4();
  for (let i = 0; i < CARS; i++) traffic.setMatrixAt(i, identity);
  traffic.frustumCulled = false;
  scene.add(traffic);

  /* Post-processing */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(256, 256), pal.bloom, 0.5, 0.55);
  bloom.enabled = theme === "dark";
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* Camera state */
  const camPos = new Vector3(...SHOTS.sky.pos);
  const camTarget = new Vector3(...SHOTS.sky.target);
  const wantPos = camPos.clone();
  const wantTarget = camTarget.clone();
  const pointer = new Vector2();
  const pointerLerp = new Vector2();
  const tmpA = new Vector3();
  const tmpB = new Vector3();

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    // narrow screens get a wider lens so the city still reads
    camera.fov = camera.aspect < 0.8 ? 52 : 38;
    camera.updateProjectionMatrix();
    smokeMat.uniforms.uPixel.value = h * renderer.getPixelRatio() * 0.5;
  }

  function applyTheme(next: Theme) {
    pal = PALETTES[next];
    shared.uFog.value.set(pal.fog);
    shared.uFogDensity.value = pal.fogDensity;
    shared.uGlow.value.set(pal.glow);
    shared.uLight.value = pal.light;
    skyMat.uniforms.uSky.value.set(pal.sky);
    skyMat.uniforms.uHorizon.value.set(pal.horizon);
    groundMat.uniforms.uGround.value.set(pal.ground);
    groundMat.uniforms.uRoad.value.set(pal.road);
    groundMat.uniforms.uLine.value.set(pal.line);
    buildingMat.uniforms.uBase.value.set(pal.base);
    buildingMat.uniforms.uTop.value.set(pal.top);
    buildingMat.uniforms.uWinA.value.set(pal.winA);
    buildingMat.uniforms.uWinB.value.set(pal.winB);
    buildingMat.uniforms.uWinAmount.value = pal.winAmount;
    stackMat.uniforms.uColor.value.set(pal.top);
    ringMat.uniforms.uColor.value.set(pal.ring);
    smokeMat.uniforms.uSmoke.value.set(pal.smoke);
    trafficMat.uniforms.uColA.value.set(pal.traffic);
    trafficMat.uniforms.uColB.value.set(pal.trafficAlt);
    trafficMat.uniforms.uAlpha.value = pal.trafficAlpha;
    trafficMat.blending = next === "dark" ? AdditiveBlending : NormalBlending;
    trafficMat.needsUpdate = true;
    bloom.strength = pal.bloom;
    bloom.enabled = next === "dark";
    requestRender();
  }

  /* Loop */
  let running = false;
  let raf = 0;
  let last = performance.now();
  let time = 12;
  let dirty = true;
  let slowFrames = 0;
  let sampled = 0;
  let intro: { from: Shot; to: () => Shot; start: number; dur: number; done: () => void } | null = null;
  let orbit: { cx: number; cz: number; radius: number; height: number; speed: number; angle: number; ty: number } | null = null;

  function setShot(a: Shot, b: Shot, t: number) {
    const k = t * t * (3 - 2 * t);
    tmpA.fromArray(a.pos).lerp(tmpB.fromArray(b.pos), k);
    wantPos.copy(tmpA);
    tmpA.fromArray(a.target).lerp(tmpB.fromArray(b.target), k);
    wantTarget.copy(tmpA);
    if (reducedMotion) {
      camPos.copy(wantPos);
      camTarget.copy(wantTarget);
    }
    dirty = true;
  }

  const minFrame = 1000 / maxFps - 1;
  function frame(now: number) {
    if (running && !intro && now - last < minFrame) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (!reducedMotion) time += dt;
    shared.uTime.value = time;

    if (intro) {
      const k = Math.min(1, (now - intro.start) / intro.dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const to = intro.to();
      camPos.fromArray(intro.from.pos).lerp(tmpB.fromArray(to.pos), e);
      camTarget.fromArray(intro.from.target).lerp(tmpB.fromArray(to.target), e);
      wantPos.copy(camPos);
      wantTarget.copy(camTarget);
      if (k >= 1) {
        const done = intro.done;
        intro = null;
        done();
      }
    } else if (orbit) {
      if (!reducedMotion) orbit.angle += orbit.speed * dt;
      wantPos.set(orbit.cx + Math.cos(orbit.angle) * orbit.radius, orbit.height, orbit.cz + Math.sin(orbit.angle) * orbit.radius);
      wantTarget.set(orbit.cx, orbit.ty, orbit.cz);
      if (reducedMotion) camPos.copy(wantPos);
      camPos.x = MathUtils.damp(camPos.x, wantPos.x, 6, dt);
      camPos.y = MathUtils.damp(camPos.y, wantPos.y, 6, dt);
      camPos.z = MathUtils.damp(camPos.z, wantPos.z, 6, dt);
      camTarget.copy(wantTarget);
    } else if (!reducedMotion) {
      camPos.x = MathUtils.damp(camPos.x, wantPos.x, 2.6, dt);
      camPos.y = MathUtils.damp(camPos.y, wantPos.y, 2.6, dt);
      camPos.z = MathUtils.damp(camPos.z, wantPos.z, 2.6, dt);
      camTarget.x = MathUtils.damp(camTarget.x, wantTarget.x, 2.6, dt);
      camTarget.y = MathUtils.damp(camTarget.y, wantTarget.y, 2.6, dt);
      camTarget.z = MathUtils.damp(camTarget.z, wantTarget.z, 2.6, dt);
    }

    pointerLerp.x = MathUtils.damp(pointerLerp.x, pointer.x, 2, dt);
    pointerLerp.y = MathUtils.damp(pointerLerp.y, pointer.y, 2, dt);
    const drift = reducedMotion ? 0 : Math.sin(time * 0.12) * 0.8;
    // portrait screens tilt the camera further down so the city fills the frame
    const portrait = camera.aspect < 0.8 ? 1 : 0;
    camera.position.set(camPos.x + pointerLerp.x * 2.2 + drift, camPos.y - pointerLerp.y * 1.2 + portrait * camPos.y * 0.35, camPos.z);
    tmpA.copy(camTarget);
    tmpA.y -= portrait * 4;
    camera.lookAt(tmpA);
    shared.uCam.value.copy(camera.position);

    composer.render(dt);
    dirty = false;

    // adaptive quality: step the resolution down on slow devices
    sampled++;
    if (dt > 0.034) slowFrames++;
    if (sampled === 90) {
      if (slowFrames > 45 && dpr > 0.8) {
        dpr = Math.max(0.8, dpr - 0.35);
        renderer.setPixelRatio(dpr);
        resize();
      }
      sampled = 0;
      slowFrames = 0;
    }

    if (running) raf = requestAnimationFrame(frame);
  }

  function requestRender() {
    dirty = true;
    if (!running) {
      last = performance.now();
      requestAnimationFrame(frame);
    }
  }

  resize();
  const ro = new ResizeObserver(() => {
    resize();
    requestRender();
  });
  ro.observe(canvas);

  return {
    /** Blend between two named shots. t runs from 0 to 1. */
    setShot(a: string, b: string, t: number) {
      setShot(SHOTS[a], SHOTS[b], MathUtils.clamp(t, 0, 1));
      if (reducedMotion) requestRender();
    },
    /** Fly from the sky down to the current shot. */
    playIntro(duration: number, current: () => Shot): Promise<void> {
      return new Promise((resolve) => {
        if (reducedMotion || duration <= 0) {
          const s = current();
          camPos.fromArray(s.pos);
          camTarget.fromArray(s.target);
          requestRender();
          resolve();
          return;
        }
        intro = { from: SHOTS.sky, to: current, start: performance.now(), dur: duration, done: resolve };
      });
    },
    setPointer(x: number, y: number) {
      pointer.set(x, y);
    },
    /** Circle the camera around a point on the ground. */
    setOrbit(o: { cx: number; cz: number; radius: number; height: number; speed: number; angle?: number; ty?: number }) {
      orbit = { angle: o.angle ?? 0.8, ty: o.ty ?? 0, ...o } as typeof orbit & object;
      camPos.set(o.cx + Math.cos(orbit!.angle) * o.radius, o.height, o.cz + Math.sin(orbit!.angle) * o.radius);
      camTarget.set(o.cx, orbit!.ty, o.cz);
      requestRender();
    },
    /** Turn the orbit by a number of radians (used for drag). */
    turn(delta: number) {
      if (orbit) orbit.angle += delta;
      requestRender();
    },
    setTheme: applyTheme,
    start() {
      if (running) return;
      if (reducedMotion) {
        requestRender();
        return;
      }
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    /** Compile shaders and draw one frame so the first visible frame does not stutter. */
    async warm() {
      // compile shaders off the main thread where the browser supports it
      try {
        if (renderer.extensions.has("KHR_parallel_shader_compile")) await renderer.compileAsync(scene, camera);
        else renderer.compile(scene, camera);
      } catch {
        renderer.compile(scene, camera);
      }
      requestRender();
    },
    isDirty: () => dirty,
  };
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
