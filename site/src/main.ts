import { root, reducedMotion, finePointer, currentTheme, themeListeners, idle } from "./common";
import { mountSalkaDemo } from "./salka-demo";

/* ---------- Hero tilt ---------- */
const art = document.querySelector<HTMLElement>("[data-tilt]");
if (art && finePointer && !reducedMotion) {
  const hero = art.closest("section")!;
  hero.addEventListener("pointermove", (e) => {
    const r = art.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / r.width;
    const y = (e.clientY - (r.top + r.height / 2)) / r.height;
    art.style.setProperty("--ry", `${(x * 5).toFixed(2)}deg`);
    art.style.setProperty("--rx", `${(-y * 4).toFixed(2)}deg`);
  });
  hero.addEventListener("pointerleave", () => {
    art.style.setProperty("--ry", "0deg");
    art.style.setProperty("--rx", "0deg");
  });
}

/* ---------- SALKA demo ---------- */
const demo = document.querySelector<HTMLElement>("[data-salka-demo]");
if (demo) mountSalkaDemo(demo);

/* ---------- 3D frames ---------- */
async function init3D() {
  const cityCanvas = document.querySelector<HTMLCanvasElement>("[data-city-canvas]");
  const cartCanvas = document.querySelector<HTMLCanvasElement>("[data-cart-canvas]");
  if (!cityCanvas || !cartCanvas) return;
  const [{ createCity, webglAvailable }, { createCartridge }] = await Promise.all([import("./city"), import("./cartridge")]);
  if (!webglAvailable()) {
    root.classList.add("no-webgl");
    return;
  }

  const city = createCity({ canvas: cityCanvas, theme: currentTheme(), reducedMotion, lowPower: true });
  city.setOrbit({ cx: 0, cz: 0, radius: 30, height: 23, speed: 0.07 });
  const cart = createCartridge(cartCanvas, currentTheme(), reducedMotion);
  themeListeners.push((t) => {
    city.setTheme(t);
    cart.setTheme(t);
  });

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
    if (visible && !document.hidden) {
      city.start();
      cart.start();
    } else {
      city.stop();
      cart.stop();
    }
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    sync();
  }).observe(cityCanvas.closest(".hero__art")!);
  document.addEventListener("visibilitychange", sync);
  city.warm();
  sync();
}

idle(() => {
  init3D().catch(() => root.classList.add("no-webgl"));
});
