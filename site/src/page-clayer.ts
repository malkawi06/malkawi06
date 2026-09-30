import { root, reducedMotion, currentTheme, themeListeners, idle } from "./common";

// The C-Layer model loads Three.js only after the page is idle and the model is near the screen.
const canvas = document.querySelector<HTMLCanvasElement>("[data-cart-canvas]");
if (canvas) {
  const gl = document.createElement("canvas");
  if (!(gl.getContext("webgl2") || gl.getContext("webgl"))) {
    root.classList.add("no-webgl");
  } else {
    idle(async () => {
      const { createCartridge } = await import("./cartridge");
      const cart = createCartridge(canvas, currentTheme(), reducedMotion);
      themeListeners.push((t) => cart.setTheme(t));
      let onScreen = false;
      const sync = () => (onScreen && !document.hidden ? cart.start() : cart.stop());
      new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting;
        sync();
      }).observe(canvas);
      document.addEventListener("visibilitychange", sync);
    });
  }
}
