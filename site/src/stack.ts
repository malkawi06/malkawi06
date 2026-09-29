import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NormalBlending,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type Theme = "dark" | "light";

type Palette = {
  glass: string;
  edge: string;
  etch: string;
  accent: string;
  envIntensity: number;
  etchOpacity: number;
  transmission: number;
  roughness: number;
};

const PALETTES: Record<Theme, Palette> = {
  dark: { glass: "#0f1110", edge: "#4a4e4b", etch: "#c9ccc6", accent: "#e8a24a", envIntensity: 0.2, etchOpacity: 0.32, transmission: 0, roughness: 0.28 },
  light: { glass: "#f4f5f2", edge: "#8e938d", etch: "#5d625d", accent: "#d98a2b", envIntensity: 1.05, etchOpacity: 0.5, transmission: 0.92, roughness: 0.18 },
};

const LAYERS = 5;
const W = 3.1;
const D = 2.1;
const H = 0.1;

/** Draws the etched pattern for each plate. Every layer gets its own motif. */
function etchTexture(kind: number, color: string): CanvasTexture {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = Math.round((s * D) / W);
  const g = c.getContext("2d")!;
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 1.5;
  const w = c.width;
  const h = c.height;
  const pad = 26;

  switch (kind) {
    case 0: {
      // node graph: a small network topology
      const nodes = [
        [0.18, 0.3], [0.42, 0.22], [0.7, 0.3], [0.84, 0.62], [0.55, 0.7], [0.28, 0.66], [0.5, 0.46],
      ].map(([x, y]) => [x * w, y * h]);
      const links = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [6, 1], [6, 3], [6, 5], [6, 4]];
      g.globalAlpha = 0.8;
      links.forEach(([a, b]) => {
        g.beginPath();
        g.moveTo(nodes[a][0], nodes[a][1]);
        g.lineTo(nodes[b][0], nodes[b][1]);
        g.stroke();
      });
      g.globalAlpha = 1;
      nodes.forEach(([x, y], i) => {
        g.beginPath();
        g.arc(x, y, i === 6 ? 7 : 4.5, 0, Math.PI * 2);
        g.fill();
      });
      break;
    }
    case 1: {
      // concentric rings: a roundabout, for the traffic work
      g.globalAlpha = 0.75;
      for (let r = 18; r < h * 0.46; r += 16) {
        g.beginPath();
        g.arc(w / 2, h / 2, r, 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 0.5;
      [0, 1, 2, 3].forEach((q) => {
        const a = (q * Math.PI) / 2 + Math.PI / 4;
        g.beginPath();
        g.moveTo(w / 2 + Math.cos(a) * h * 0.46, h / 2 + Math.sin(a) * h * 0.46);
        g.lineTo(w / 2 + Math.cos(a) * w, h / 2 + Math.sin(a) * w);
        g.stroke();
      });
      break;
    }
    case 2: {
      // diagonal hatch: the filter layers
      g.globalAlpha = 0.5;
      for (let x = -h; x < w; x += 14) {
        g.beginPath();
        g.moveTo(x, h);
        g.lineTo(x + h, 0);
        g.stroke();
      }
      break;
    }
    case 3: {
      // dot matrix
      g.globalAlpha = 0.8;
      for (let y = pad; y < h - pad / 2; y += 18) {
        for (let x = pad; x < w - pad / 2; x += 18) {
          g.beginPath();
          g.arc(x, y, 1.6, 0, Math.PI * 2);
          g.fill();
        }
      }
      break;
    }
    default: {
      // bus lines: parallel traces with pads
      g.globalAlpha = 0.7;
      for (let i = 0; i < 7; i++) {
        const y = pad + i * ((h - pad * 2) / 6);
        const x0 = pad + (i % 3) * 30;
        g.beginPath();
        g.moveTo(x0, y);
        g.lineTo(w - pad - ((i + 1) % 3) * 40, y);
        g.stroke();
        g.beginPath();
        g.arc(x0, y, 4, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export type StackOptions = {
  canvas: HTMLCanvasElement;
  reducedMotion: boolean;
  theme: Theme;
  onPick?: (index: number) => void;
};

export function createStack({ canvas, reducedMotion, theme, onPick }: StackOptions) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  const small = window.matchMedia("(max-width: 767px)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = PALETTES[theme].envIntensity;

  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 5.4, 9.2);
  camera.lookAt(0, 0.6, 0);

  const root = new Group();
  root.rotation.set(0, -0.62, 0);
  root.scale.setScalar(0.92);
  scene.add(root);

  let pal = PALETTES[theme];
  const plateGeo = new RoundedBoxGeometry(W, H, D, 4, 0.12);
  const edgeGeo = new EdgesGeometry(plateGeo, 25);
  const etchGeo = new PlaneGeometry(W * 0.92, D * 0.9);

  type Layer = {
    group: Group;
    mesh: Mesh;
    glass: MeshPhysicalMaterial;
    edges: LineBasicMaterial;
    etch: MeshBasicMaterial;
    glow: number;
  };
  const layers: Layer[] = [];

  for (let i = 0; i < LAYERS; i++) {
    const group = new Group();
    const glass = new MeshPhysicalMaterial({
      color: new Color(pal.glass),
      metalness: 0,
      roughness: pal.roughness,
      transmission: small ? 0 : pal.transmission,
      thickness: 0.6,
      ior: 1.45,
      transparent: true,
      opacity: small && theme === "light" ? 0.82 : 1,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    });
    const mesh = new Mesh(plateGeo, glass);
    mesh.userData.index = i;
    const edges = new LineBasicMaterial({ color: new Color(pal.edge), transparent: true, opacity: 0.9 });
    const lines = new LineSegments(edgeGeo, edges);
    const etch = new MeshBasicMaterial({
      map: etchTexture(i, "#ffffff"),
      color: new Color(pal.etch),
      transparent: true,
      opacity: pal.etchOpacity,
      depthWrite: false,
    });
    const etchMesh = new Mesh(etchGeo, etch);
    etchMesh.rotation.x = -Math.PI / 2;
    etchMesh.position.y = H / 2 + 0.004;
    group.add(mesh, lines, etchMesh);
    root.add(group);
    layers.push({ group, mesh, glass, edges, etch, glow: 0 });
  }

  // Data packets: small points travelling up through the stack.
  const PACKETS = small ? 14 : 26;
  const pGeo = new BufferGeometry();
  const pPos = new Float32Array(PACKETS * 3);
  const pSeed = Array.from({ length: PACKETS }, () => ({
    x: (Math.random() - 0.5) * W * 0.8,
    z: (Math.random() - 0.5) * D * 0.8,
    speed: 0.25 + Math.random() * 0.45,
    phase: Math.random(),
  }));
  pGeo.setAttribute("position", new BufferAttribute(pPos, 3));
  const pMat = new PointsMaterial({
    color: new Color(pal.accent),
    size: small ? 0.07 : 0.06,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: theme === "dark" ? AdditiveBlending : NormalBlending,
  });
  const packets = new Points(pGeo, pMat);
  root.add(packets);

  // State
  let spread = 0.42; // current gap between plates
  let spreadTarget = 0.42;
  let active = 0;
  const pointer = new Vector2(0, 0);
  const pointerLerp = new Vector2(0, 0);
  let running = false;
  let raf = 0;
  let last = performance.now();
  let t = 0;

  function applyTheme(next: Theme) {
    pal = PALETTES[next];
    scene.environmentIntensity = pal.envIntensity;
    layers.forEach((l) => {
      l.glass.color.set(pal.glass);
      l.glass.roughness = pal.roughness;
      l.glass.transmission = small ? 0 : pal.transmission;
      l.glass.opacity = small && next === "light" ? 0.82 : 1;
      l.glass.needsUpdate = true;
      l.etch.color.set(pal.etch);
    });
    pMat.color.set(pal.accent);
    pMat.blending = next === "dark" ? AdditiveBlending : NormalBlending;
    pMat.needsUpdate = true;
    if (!running) render();
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = canvas.clientWidth || r.width;
    const h = canvas.clientHeight || r.height;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the stack a comfortable size on tall, narrow canvases.
    const fit = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 0.9 : 1;
    const shift = camera.aspect < 1 ? 0 : -0.35; // keep clear of the headline on wide canvases
    camera.position.set(shift, 5.4 * fit, 9.2 * fit);
    camera.lookAt(shift, 0.6, 0);
    camera.updateProjectionMatrix();
    if (!running) render();
  }

  const edgeBase = new Color();
  const edgeAccent = new Color();

  function update(dt: number) {
    t += dt;
    spread = MathUtils.damp(spread, spreadTarget, 4, dt);
    pointerLerp.x = MathUtils.damp(pointerLerp.x, pointer.x, 3, dt);
    pointerLerp.y = MathUtils.damp(pointerLerp.y, pointer.y, 3, dt);

    const float = reducedMotion ? 0 : Math.sin(t * 0.8) * 0.05;
    root.rotation.y = -0.62 + pointerLerp.x * 0.22 + (reducedMotion ? 0 : Math.sin(t * 0.25) * 0.04);
    root.rotation.x = pointerLerp.y * 0.1;
    root.position.y = float;

    edgeBase.set(pal.edge);
    edgeAccent.set(pal.accent);
    const top = (LAYERS - 1) * spread;
    layers.forEach((l, i) => {
      const order = LAYERS - 1 - i; // index 0 is the top plate
      const isActive = order === active;
      l.glow = MathUtils.damp(l.glow, isActive ? 1 : 0, 5, dt);
      l.group.position.y = i * spread - top / 2 + 0.6 + l.glow * 0.14;
      l.group.position.x = l.glow * 0.08;
      l.edges.color.copy(edgeBase).lerp(edgeAccent, l.glow);
      l.etch.color.set(pal.etch).lerp(edgeAccent, l.glow * 0.85);
      l.etch.opacity = pal.etchOpacity + l.glow * (0.95 - pal.etchOpacity);
    });

    // packets rise from the bottom plate to the top plate and loop
    const bottomY = -top / 2 + 0.6;
    const range = top + 0.4;
    for (let i = 0; i < PACKETS; i++) {
      const s = pSeed[i];
      const k = reducedMotion ? s.phase : (s.phase + t * s.speed * 0.25) % 1;
      pPos[i * 3] = s.x;
      pPos[i * 3 + 1] = bottomY - 0.2 + k * range;
      pPos[i * 3 + 2] = s.z;
    }
    pGeo.attributes.position.needsUpdate = true;
  }

  function render() {
    renderer.render(scene, camera);
  }

  function loop(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    render();
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // Reduced motion: settle once and draw a still frame on each change.
  function settle() {
    for (let i = 0; i < 90; i++) update(1 / 30);
    render();
  }

  const raycaster = new Raycaster();
  function pick(clientX: number, clientY: number): number {
    const r = canvas.getBoundingClientRect();
    const ndc = new Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(layers.map((l) => l.mesh), false)[0];
    if (!hit) return -1;
    return LAYERS - 1 - (hit.object.userData.index as number);
  }

  canvas.addEventListener("click", (e) => {
    const idx = pick(e.clientX, e.clientY);
    onPick?.(idx < 0 ? active : idx);
  });

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  return {
    start: () => (reducedMotion ? settle() : start()),
    stop,
    setPointer(x: number, y: number) {
      pointer.set(x, y);
    },
    setSpread(v: number) {
      spreadTarget = v;
      if (reducedMotion) settle();
    },
    setActive(i: number) {
      active = Math.max(0, Math.min(LAYERS - 1, i));
      if (reducedMotion) settle();
    },
    setTheme: applyTheme,
    dispose() {
      stop();
      ro.disconnect();
      renderer.dispose();
    },
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
