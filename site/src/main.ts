import { reducedMotion, siteRoot, toggleTheme } from "./common";
import { mountHeroTerminal } from "./terminal";
import { mountSalkaDemo } from "./salka-demo";

/* ---------- Hero terminal ---------- */
const heroTerm = document.querySelector<HTMLElement>("[data-hero-term]");
if (heroTerm) mountHeroTerminal(heroTerm, siteRoot, toggleTheme, reducedMotion);

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
