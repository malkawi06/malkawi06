import { finePointer, reducedMotion, siteRoot, toggleTheme } from "./common";
import { mountHeroTerminal } from "./terminal";
import { mountSalkaDemo } from "./salka-demo";

/* ---------- Hero terminal ---------- */
const heroTerm = document.querySelector<HTMLElement>("[data-hero-term]");
if (heroTerm) mountHeroTerminal(heroTerm, siteRoot, toggleTheme, reducedMotion);

// the terminal floats; it leans toward the pointer and holds still while someone types in it
const float = document.querySelector<HTMLElement>("[data-float]");
if (float && !reducedMotion) {
  let onScreen = true;
  let typing = false;
  const still = () => float.classList.toggle("is-still", !onScreen || typing);
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    still();
  }).observe(float);

  const rest = () => {
    float.style.removeProperty("--rx");
    float.style.removeProperty("--ry");
  };
  float.addEventListener("focusin", () => {
    typing = true;
    still();
    float.style.setProperty("--rx", "1.5deg");
    float.style.setProperty("--ry", "-2deg");
  });
  float.addEventListener("focusout", () => {
    typing = false;
    still();
    rest();
  });

  if (finePointer) {
    const hero = float.closest("section")!;
    let queued = false;
    let px = 0;
    let py = 0;
    hero.addEventListener("pointermove", (e) => {
      px = e.clientX;
      py = e.clientY;
      if (queued || typing) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        if (typing) return;
        const r = float.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (px - (r.left + r.width / 2)) / (r.width * 0.9)));
        const y = Math.max(-1, Math.min(1, (py - (r.top + r.height / 2)) / (r.height * 0.9)));
        float.style.setProperty("--ry", `${(-7 + x * 5).toFixed(2)}deg`);
        float.style.setProperty("--rx", `${(4 - y * 4).toFixed(2)}deg`);
      });
    });
    hero.addEventListener("pointerleave", () => {
      if (!typing) rest();
    });
  }
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
