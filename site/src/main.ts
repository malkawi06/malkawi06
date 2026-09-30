import { root, reducedMotion, finePointer, currentTheme, themeListeners, idle } from "./common";
import { mountSalkaDemo } from "./salka-demo";

/* ---------- Hero tilt ---------- */
const art = document.querySelector<HTMLElement>("[data-tilt]");
if (art && finePointer && !reducedMotion) {
  const hero = art.closest("section")!;
  let pending = false;
  let px = 0;
  let py = 0;
  hero.addEventListener("pointermove", (e) => {
    px = e.clientX;
    py = e.clientY;
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const r = art.getBoundingClientRect();
      const x = (px - (r.left + r.width / 2)) / r.width;
      const y = (py - (r.top + r.height / 2)) / r.height;
      art.style.setProperty("--ry", `${(x * 5).toFixed(2)}deg`);
      art.style.setProperty("--rx", `${(-y * 4).toFixed(2)}deg`);
    });
  });
  hero.addEventListener("pointerleave", () => {
    art.style.setProperty("--ry", "0deg");
    art.style.setProperty("--rx", "0deg");
  });
}

/* ---------- Leadership timeline ---------- */
// the line fills and each node lights up once it passes 60% of the viewport height
const tl = document.querySelector<HTMLElement>("[data-timeline]");
if (tl) {
  const items = Array.from(tl.querySelectorAll<HTMLElement>(".tl__item"));
  let queued = false;
  let near = false;
  const update = () => {
    queued = false;
    const mark = window.innerHeight * 0.6;
    const r = tl.getBoundingClientRect();
    tl.style.setProperty("--p", Math.min(1, Math.max(0, (mark - r.top) / r.height)).toFixed(3));
    items.forEach((it) => it.classList.toggle("is-past", it.getBoundingClientRect().top + 12 < mark));
  };
  const onScroll = () => {
    if (!near || queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  new IntersectionObserver(
    ([e]) => {
      near = e.isIntersecting;
      if (near) update();
    },
    { rootMargin: "200px 0px" },
  ).observe(tl);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
}

/* ---------- SALKA demo ---------- */
const demo = document.querySelector<HTMLElement>("[data-salka-demo]");
if (demo) mountSalkaDemo(demo);

/* ---------- 3D frames ---------- */
async function init3D() {
  const cityCanvas = document.querySelector<HTMLCanvasElement>("[data-city-canvas]");
  if (!cityCanvas) return;
  const { createCity, webglAvailable } = await import("./city");
  if (!webglAvailable()) {
    root.classList.add("no-webgl");
    return;
  }

  const city = createCity({ canvas: cityCanvas, theme: currentTheme(), reducedMotion, lowPower: true, compact: true, maxFps: 30, network: true });
  city.setOrbit({ cx: 0, cz: -2, radius: 56, height: 44, speed: 0.06, ty: 2 });
  themeListeners.push((t) => city.setTheme(t));

  // drag or use the arrow keys to rotate the city model
  let dragX: number | null = null;
  cityCanvas.addEventListener("pointerdown", (e) => {
    dragX = e.clientX;
    cityCanvas.setPointerCapture(e.pointerId);
  });
  cityCanvas.addEventListener("pointermove", (e) => {
    if (dragX === null) return;
    city.turn((e.clientX - dragX) * -0.008);
    dragX = e.clientX;
  });
  const endDrag = () => (dragX = null);
  cityCanvas.addEventListener("pointerup", endDrag);
  cityCanvas.addEventListener("pointercancel", endDrag);
  cityCanvas.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") city.turn(0.15);
    if (e.key === "ArrowRight") city.turn(-0.15);
  });
  cityCanvas.tabIndex = 0;

  let visible = true;
  const sync = () => {
    if (visible && !document.hidden) city.start();
    else city.stop();
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    sync();
  }).observe(cityCanvas.closest(".hero__art")!);
  document.addEventListener("visibilitychange", sync);
  await city.warm();
  sync();
}

idle(() => {
  init3D().catch(() => root.classList.add("no-webgl"));
});
