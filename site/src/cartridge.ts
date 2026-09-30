import {
  CanvasTexture,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  BoxGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Theme } from "./city";

/*
  The C-Layer filter cartridge: four stacked layers. Every few seconds the robot
  pulls a saturated absorption layer out and slides a fresh one back in, which is
  the core idea of the design.
*/

const PAL = {
  dark: { plate: "#26272a", edge: "#6b6f74", accent: "#f2b23e", etch: "#b4b8bd", env: 0.6 },
  light: { plate: "#f7f7f4", edge: "#8d918c", accent: "#dc8c10", etch: "#6c706b", env: 1 },
};

const W = 2.6;
const D = 2.6;
const H = 0.14;

function etch(kind: number): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.strokeStyle = g.fillStyle = "#fff";
  g.lineWidth = 2;
  if (kind === 0) {
    for (let y = 18; y < 256; y += 20) for (let x = 18; x < 256; x += 20) g.fillRect(x - 1.5, y - 1.5, 3, 3);
  } else if (kind === 3) {
    for (let i = 16; i < 256; i += 24) {
      g.beginPath();
      g.moveTo(i, 10);
      g.lineTo(i, 246);
      g.moveTo(10, i);
      g.lineTo(246, i);
      g.stroke();
    }
  } else {
    g.globalAlpha = 0.9;
    for (let x = -256; x < 256; x += 14) {
      g.beginPath();
      g.moveTo(x, 256);
      g.lineTo(x + 256, 0);
      g.stroke();
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function createCartridge(canvas: HTMLCanvasElement, theme: Theme, reducedMotion: boolean) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(6.6, 6.4, 8.2);
  camera.lookAt(0, 0.95, 0);

  let pal = PAL[theme];
  scene.environmentIntensity = pal.env;

  const root = new Group();
  scene.add(root);
  const geo = new RoundedBoxGeometry(W, H, D, 3, 0.1);
  const edges = new EdgesGeometry(geo, 25);
  const etchGeo = new PlaneGeometry(W * 0.86, D * 0.86);

  type Layer = { g: Group; body: MeshPhysicalMaterial; line: LineBasicMaterial; mark: MeshBasicMaterial; chem: boolean };
  const layers: Layer[] = [];
  // bottom to top: support, absorption II, absorption I, pre-filtration
  const kinds = [3, 1, 1, 0];
  kinds.forEach((kind, i) => {
    const chem = kind === 1;
    const g = new Group();
    const body = new MeshPhysicalMaterial({ color: pal.plate, roughness: 0.35, clearcoat: 0.6, transparent: true, opacity: 0.96 });
    const line = new LineBasicMaterial({ color: chem ? pal.accent : pal.edge });
    const mark = new MeshBasicMaterial({ map: etch(kind), color: chem ? pal.accent : pal.etch, transparent: true, opacity: chem ? 0.55 : 0.45, depthWrite: false });
    const m = new Mesh(etchGeo, mark);
    m.rotation.x = -Math.PI / 2;
    m.position.y = H / 2 + 0.003;
    g.add(new Mesh(geo, body), new LineSegments(edges, line), m);
    g.position.y = i * 0.62;
    root.add(g);
    layers.push({ g, body, line, mark, chem });
  });

  // guide rails the robot runs on
  const railMat = new MeshBasicMaterial({ color: pal.edge });
  const railGeo = new BoxGeometry(0.05, 2.4, 0.05);
  [
    [-W / 2 - 0.18, -D / 2 - 0.18],
    [W / 2 + 0.18, -D / 2 - 0.18],
    [-W / 2 - 0.18, D / 2 + 0.18],
    [W / 2 + 0.18, D / 2 + 0.18],
  ].forEach(([x, z]) => {
    const r = new Mesh(railGeo, railMat);
    r.position.set(x, 0.95, z);
    root.add(r);
  });

  root.rotation.y = -0.6;

  function setTheme(t: Theme) {
    pal = PAL[t];
    scene.environmentIntensity = pal.env;
    railMat.color.set(pal.edge);
    layers.forEach((l) => {
      l.body.color.set(pal.plate);
      l.line.color.set(l.chem ? pal.accent : pal.edge);
      l.mark.color.set(l.chem ? pal.accent : pal.etch);
    });
    draw();
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    draw();
  }

  let t = 0;
  let last = performance.now();
  let running = false;
  let raf = 0;
  const swapLayer = layers[2];

  function update(dt: number) {
    t += dt;
    root.rotation.y = -0.6 + Math.sin(t * 0.3) * 0.25;
    // a 7 second cycle: slide out, pause, slide back in
    const cycle = t % 7;
    const out = MathUtils.smoothstep(cycle, 2, 3.2) - MathUtils.smoothstep(cycle, 4.4, 5.6);
    swapLayer.g.position.x = out * 2.1;
    swapLayer.mark.opacity = 0.55 - out * 0.35; // the saturated layer looks spent on the way out
  }

  function draw() {
    renderer.render(scene, camera);
  }

  function loop(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    draw();
    if (running) raf = requestAnimationFrame(loop);
  }

  resize();
  new ResizeObserver(resize).observe(canvas);

  return {
    start() {
      if (reducedMotion) return draw();
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    setTheme,
  };
}

