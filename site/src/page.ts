import { root, reducedMotion, currentTheme, themeListeners, idle } from "./common";
import { mountSalkaDemo } from "./salka-demo";

// Project pages: optional live demo and optional C-Layer model.
const demo = document.querySelector<HTMLElement>("[data-salka-demo]");
if (demo) mountSalkaDemo(demo);

const cartCanvas = document.querySelector<HTMLCanvasElement>("[data-cart-canvas]");
if (cartCanvas) {
  idle(async () => {
    const { createCartridge } = await import("./cartridge");
    const gl = document.createElement("canvas");
    if (!(gl.getContext("webgl2") || gl.getContext("webgl"))) {
      root.classList.add("no-webgl");
      return;
    }
    const cart = createCartridge(cartCanvas, currentTheme(), reducedMotion);
    themeListeners.push((t) => cart.setTheme(t));
    new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? cart.start() : cart.stop())).observe(cartCanvas);
  });
}
