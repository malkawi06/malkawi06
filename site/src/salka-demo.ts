/*
  An illustrative model of the SALKA idea. Two copies of the same four-way
  intersection receive identical traffic: one runs a fixed timer, the other an
  adaptive controller that follows the queues and gives ambulances priority.
  The canvas shows the mode the visitor picks; the numbers compare both.
  This is a teaching toy, not the SUMO model behind the real results.
*/

type Approach = 0 | 1 | 2 | 3; // 0 north, 1 south, 2 east, 3 west (where the car comes from)
type Car = { s: number; wait: number; passed: boolean; amb: boolean };
type Mode = "fixed" | "adaptive";

const W = 640;
const H = 440;
const ROAD = 52;
const LANE = ROAD / 4;
const CAR_L = 15;
const GAP = 7;
const V = 70; // px per simulated second
const AMBER = 2.5;

// distance from the spawn edge to the stop line for each approach
const STOP: number[] = [H / 2 - ROAD / 2 - 6, H / 2 - ROAD / 2 - 6, W / 2 - ROAD / 2 - 6, W / 2 - ROAD / 2 - 6];
const LENGTH: number[] = [H + 30, H + 30, W + 30, W + 30];
// arrival rates in cars per simulated second: the north-south axis is busier
const BASE_RATE = [0.34, 0.3, 0.12, 0.1];

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Sim {
  mode: Mode;
  lanes: Car[][] = [[], [], [], []];
  phase = 0; // 0: north-south green, 1: east-west green
  amber = 0; // seconds of amber left before switching
  elapsed = 0;
  waits: number[] = [];
  ambWaits: number[] = [];
  rand: () => number;
  constructor(mode: Mode, seed: number) {
    this.mode = mode;
    this.rand = rng(seed);
  }

  greenFor(a: Approach) {
    return this.amber <= 0 && (a < 2 ? this.phase === 0 : this.phase === 1);
  }

  queue(a: Approach) {
    return this.lanes[a].filter((c) => !c.passed && STOP[a] - c.s < 140).length;
  }

  step(dt: number, rush: boolean) {
    // arrivals: identical random draws in both sims keep the traffic the same
    for (let a = 0 as Approach; a < 4; a++) {
      const rate = BASE_RATE[a] * (rush ? 1.55 : 1);
      if (this.rand() < rate * dt) this.spawn(a, false);
    }

    // controller
    this.elapsed += dt;
    if (this.amber > 0) {
      this.amber -= dt;
      if (this.amber <= 0) {
        this.phase = 1 - this.phase;
        this.elapsed = 0;
      }
    } else if (this.mode === "fixed") {
      if (this.elapsed >= 20) this.amber = AMBER;
    } else {
      const green: Approach[] = this.phase === 0 ? [0, 1] : [2, 3];
      const red: Approach[] = this.phase === 0 ? [2, 3] : [0, 1];
      const qg = this.queue(green[0]) + this.queue(green[1]);
      const qr = this.queue(red[0]) + this.queue(red[1]);
      const ambRed = red.some((a) => this.lanes[a].some((c) => c.amb && !c.passed && STOP[a] - c.s < 260));
      const ambGreen = green.some((a) => this.lanes[a].some((c) => c.amb && !c.passed));
      if (ambRed && !ambGreen) this.amber = AMBER;
      else if (this.elapsed >= 6 && (qg === 0 || qr > qg * 2 + 2) && qr > 0) this.amber = AMBER;
      else if (this.elapsed >= 40) this.amber = AMBER;
    }

    // movement
    for (let a = 0 as Approach; a < 4; a++) {
      const lane = this.lanes[a];
      for (let i = 0; i < lane.length; i++) {
        const c = lane[i];
        let max = c.s + V * dt;
        if (i > 0) max = Math.min(max, lane[i - 1].s - CAR_L - GAP);
        if (!c.passed && !this.greenFor(a) && c.s <= STOP[a]) {
          // hold at the stop line until this approach turns green
          max = Math.min(max, STOP[a]);
        }
        const moved = Math.max(0, max - c.s);
        if (!c.passed && moved < V * dt * 0.25) c.wait += dt;
        c.s += moved;
        if (!c.passed && c.s > STOP[a] + 2) {
          c.passed = true;
          (c.amb ? this.ambWaits : this.waits).push(c.wait);
        }
      }
      while (lane.length && lane[0].s > LENGTH[a]) lane.shift();
    }
  }

  spawn(a: Approach, amb: boolean) {
    const lane = this.lanes[a];
    const last = lane[lane.length - 1];
    if (last && last.s < CAR_L + GAP) return; // no room at the edge this tick
    lane.push({ s: 0, wait: 0, passed: false, amb });
  }

  avgWait() {
    // count cars still queued too, otherwise a long red looks free until those cars finally cross
    let sum = 0;
    let n = this.waits.length;
    for (const w of this.waits) sum += w;
    for (const lane of this.lanes)
      for (const c of lane)
        if (!c.passed && !c.amb && c.wait > 0) {
          sum += c.wait;
          n++;
        }
    return n ? sum / n : 0;
  }
}

function pos(a: Approach, s: number): [number, number, number] {
  // returns x, y, angle for a car s pixels into its approach (right-hand traffic)
  switch (a) {
    case 0:
      return [W / 2 - LANE, s, Math.PI / 2];
    case 1:
      return [W / 2 + LANE, H - s, -Math.PI / 2];
    case 2:
      return [W - s, H / 2 - LANE, Math.PI];
    default:
      return [s, H / 2 + LANE, 0];
  }
}

export function mountSalkaDemo(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
  const ctx = canvas.getContext("2d")!;
  const modeInputs = root.querySelectorAll<HTMLInputElement>('input[name="salka-mode"]');
  const rushInput = root.querySelector<HTMLInputElement>("[data-rush]")!;
  const ambBtn = root.querySelector<HTMLButtonElement>("[data-amb]")!;
  const playBtn = root.querySelector<HTMLButtonElement>("[data-play]")!;
  const resetBtn = root.querySelector<HTMLButtonElement>("[data-reset]")!;
  const out = {
    fixed: root.querySelector<HTMLElement>("[data-out-fixed]")!,
    adaptive: root.querySelector<HTMLElement>("[data-out-adaptive]")!,
    gain: root.querySelector<HTMLElement>("[data-out-gain]")!,
    cars: root.querySelector<HTMLElement>("[data-out-cars]")!,
    amb: root.querySelector<HTMLElement>("[data-out-amb]")!,
  };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let seed = 11;
  let sims = { fixed: new Sim("fixed", seed), adaptive: new Sim("adaptive", seed) };
  let view: Mode = "adaptive";
  let playing = !reduced;
  let visible = false;
  let raf = 0;
  let last = 0;

  const css = () => getComputedStyle(document.documentElement);
  let colors = readColors();
  function readColors() {
    const c = css();
    const v = (n: string) => c.getPropertyValue(n).trim();
    return {
      block: v("--bg"),
      bg: v("--surface-2"),
      road: v("--surface"),
      line: v("--line"),
      ink: v("--ink"),
      muted: v("--muted"),
      accent: v("--accent"),
      edge: v("--edge"),
    };
  }
  new MutationObserver(() => {
    colors = readColors();
    draw();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function signal(x: number, y: number, state: "green" | "amber" | "red") {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = state === "green" ? "#2f9e5b" : state === "amber" ? "#f2a516" : "#d64545";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = colors.edge;
    ctx.stroke();
  }

  function draw() {
    const sim = sims[view];
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);
    // city blocks around the junction
    ctx.fillStyle = colors.block;
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    const m = 16;
    const bw = W / 2 - ROAD / 2 - m * 2;
    const bh = H / 2 - ROAD / 2 - m * 2;
    for (const [bx, by] of [
      [m, m],
      [W / 2 + ROAD / 2 + m, m],
      [m, H / 2 + ROAD / 2 + m],
      [W / 2 + ROAD / 2 + m, H / 2 + ROAD / 2 + m],
    ]) {
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 12);
      ctx.fill();
      ctx.stroke();
    }
    // roads
    ctx.fillStyle = colors.road;
    ctx.fillRect(W / 2 - ROAD / 2, 0, ROAD, H);
    ctx.fillRect(0, H / 2 - ROAD / 2, W, ROAD);
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H / 2 - ROAD / 2);
    ctx.moveTo(W / 2, H / 2 + ROAD / 2);
    ctx.lineTo(W / 2, H);
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W / 2 - ROAD / 2, H / 2);
    ctx.moveTo(W / 2 + ROAD / 2, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // stop lines
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - ROAD / 2, STOP[0] + 2);
    ctx.lineTo(W / 2, STOP[0] + 2);
    ctx.moveTo(W / 2, H - STOP[1] - 2);
    ctx.lineTo(W / 2 + ROAD / 2, H - STOP[1] - 2);
    ctx.moveTo(W - STOP[2] - 2, H / 2 - ROAD / 2);
    ctx.lineTo(W - STOP[2] - 2, H / 2);
    ctx.moveTo(STOP[3] + 2, H / 2);
    ctx.lineTo(STOP[3] + 2, H / 2 + ROAD / 2);
    ctx.stroke();

    // signals
    const st = (a: Approach) => (sim.greenFor(a) ? "green" : sim.amber > 0 && (a < 2 ? sim.phase === 0 : sim.phase === 1) ? "amber" : "red");
    signal(W / 2 - ROAD / 2 - 12, STOP[0] - 6, st(0));
    signal(W / 2 + ROAD / 2 + 12, H - STOP[1] + 6, st(1));
    signal(W - STOP[2] + 6, H / 2 - ROAD / 2 - 12, st(2));
    signal(STOP[3] - 6, H / 2 + ROAD / 2 + 12, st(3));

    // cars
    for (let a = 0 as Approach; a < 4; a++) {
      for (const c of sim.lanes[a]) {
        const [x, y, ang] = pos(a, c.s - CAR_L / 2);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        const waiting = !c.passed && c.wait > 0.5;
        ctx.fillStyle = c.amb ? "#ffffff" : waiting ? colors.accent : colors.ink;
        ctx.strokeStyle = c.amb ? "#d64545" : colors.edge;
        ctx.lineWidth = c.amb ? 2.5 : 1;
        ctx.beginPath();
        ctx.roundRect(-CAR_L / 2, -5, CAR_L, 10, 3);
        ctx.fill();
        ctx.stroke();
        if (c.amb) {
          ctx.fillStyle = "#d64545";
          ctx.fillRect(-2, -5, 4, 10);
        }
        ctx.restore();
      }
    }
  }

  function fmt(n: number) {
    return n.toFixed(1);
  }

  let lastUi = 0;
  function updateUi(force = false) {
    const now = performance.now();
    if (!force && now - lastUi < 400) return;
    lastUi = now;
    const f = sims.fixed.avgWait();
    const ad = sims.adaptive.avgWait();
    out.fixed.textContent = `${fmt(f)} s`;
    out.adaptive.textContent = `${fmt(ad)} s`;
    const n = Math.min(sims.fixed.waits.length, sims.adaptive.waits.length);
    out.cars.textContent = String(n);
    out.gain.textContent = n >= 20 && f > 0 ? `${Math.max(0, Math.round((1 - ad / f) * 100))}% less waiting` : "Measuring…";
    const af = sims.fixed.ambWaits[sims.fixed.ambWaits.length - 1];
    const aa = sims.adaptive.ambWaits[sims.adaptive.ambWaits.length - 1];
    out.amb.textContent =
      af !== undefined && aa !== undefined ? `Ambulance waited ${fmt(af)} s on the timer, ${fmt(aa)} s with SALKA.` : "";
  }

  function tick(now: number) {
    // draw at about 30 fps; the simulation still advances by the real elapsed time
    if (now - last < 32) {
      raf = requestAnimationFrame(tick);
      return;
    }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const simDt = dt * 2.2; // run faster than real time so the difference shows quickly
    const steps = Math.ceil(simDt / (1 / 60));
    for (let i = 0; i < steps; i++) {
      sims.fixed.step(simDt / steps, rushInput.checked);
      sims.adaptive.step(simDt / steps, rushInput.checked);
    }
    draw();
    updateUi();
    if (playing && visible) raf = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(raf);
    if (playing && visible) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
    playBtn.textContent = playing ? "Pause" : "Play";
    playBtn.setAttribute("aria-pressed", String(!playing));
  }

  modeInputs.forEach((i) =>
    i.addEventListener("change", () => {
      view = i.value as Mode;
      draw();
    }),
  );
  ambBtn.addEventListener("click", () => {
    // the ambulance comes in on the quieter east-west road, where the timer makes it wait
    sims.fixed.spawn(3, true);
    sims.adaptive.spawn(3, true);
    if (!playing) {
      playing = true;
      sync();
    }
  });
  playBtn.addEventListener("click", () => {
    playing = !playing;
    sync();
  });
  resetBtn.addEventListener("click", () => {
    seed += 1;
    sims = { fixed: new Sim("fixed", seed), adaptive: new Sim("adaptive", seed) };
    updateUi(true);
    draw();
  });

  fit();
  draw();
  // warm up only when the demo first scrolls into view, so page load stays light
  let warmed = false;
  new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      if (visible && !warmed) {
        warmed = true;
        for (let i = 0; i < 30 * 15; i++) {
          sims.fixed.step(1 / 30, false);
          sims.adaptive.step(1 / 30, false);
        }
        draw();
        updateUi(true);
      }
      sync();
    },
    { rootMargin: "200px 0px" },
  ).observe(canvas);
  sync();
}
