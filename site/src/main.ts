import "./style.css";
import envelope from "@phosphor-icons/core/assets/regular/envelope-simple.svg?raw";
import download from "@phosphor-icons/core/assets/regular/download-simple.svg?raw";
import linkedin from "@phosphor-icons/core/assets/regular/linkedin-logo.svg?raw";
import github from "@phosphor-icons/core/assets/regular/github-logo.svg?raw";
import sun from "@phosphor-icons/core/assets/regular/sun.svg?raw";
import moon from "@phosphor-icons/core/assets/regular/moon.svg?raw";
import arrow from "@phosphor-icons/core/assets/regular/arrow-up-right.svg?raw";
import copy from "@phosphor-icons/core/assets/regular/copy.svg?raw";
import check from "@phosphor-icons/core/assets/regular/check.svg?raw";
import type { Theme } from "./stack";

const ICONS: Record<string, string> = {
  "envelope-simple": envelope,
  "download-simple": download,
  "linkedin-logo": linkedin,
  "github-logo": github,
  sun,
  moon,
  "arrow-up-right": arrow,
  copy,
  check,
};

const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobileQuery = window.matchMedia("(max-width: 767px)");
const SECTION_NAMES = ["Profile", "Work", "Leadership", "Skills", "Contact"];
const SECTION_IDS = ["top", "work", "leadership", "skills", "contact"];

/* ---------- Icons ---------- */
document.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
  const svg = ICONS[el.dataset.icon!];
  if (svg) {
    el.innerHTML = svg;
    el.setAttribute("aria-hidden", "true");
  }
});

/* ---------- Theme ---------- */
const currentTheme = (): Theme => (root.getAttribute("data-theme") === "light" ? "light" : "dark");
const themeBtn = document.querySelector<HTMLButtonElement>("[data-theme-toggle]")!;
const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!;
const themeListeners: ((t: Theme) => void)[] = [];

function syncThemeUI(t: Theme) {
  themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
  themeMeta.content = t === "dark" ? "#0e0f0f" : "#eef0ee";
}
syncThemeUI(currentTheme());

themeBtn.addEventListener("click", () => {
  const next: Theme = currentTheme() === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {
    /* storage unavailable: theme still applies for this visit */
  }
  syncThemeUI(next);
  themeListeners.forEach((fn) => fn(next));
});

/* ---------- Nav state ---------- */
const nav = document.querySelector<HTMLElement>("[data-nav]")!;
const sentinel = document.createElement("div");
sentinel.style.cssText = "position:absolute;top:0;left:0;height:24px;width:1px;pointer-events:none";
document.body.prepend(sentinel);
new IntersectionObserver(([e]) => nav.classList.toggle("is-scrolled", !e.isIntersecting)).observe(sentinel);

const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".nav__links a"));

/* ---------- Reveal on scroll ---------- */
const revealIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealIO.unobserve(e.target);
      }
    });
  },
  { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
);
document.querySelectorAll(".reveal").forEach((el) => revealIO.observe(el));

/* ---------- Count-up for stats ---------- */
const countIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target as HTMLElement;
      const to = Number(el.dataset.count);
      if (reducedMotion || !to) return;
      const t0 = performance.now();
      const dur = 1400;
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - k, 4);
        el.textContent = String(Math.round(to * eased));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  },
  { threshold: 0.6 },
);
document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => countIO.observe(el));

/* ---------- Copy email ---------- */
document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((btn) => {
  const toast = btn.parentElement?.querySelector<HTMLElement>("[data-toast]");
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy!);
      btn.classList.add("is-copied");
      if (toast) toast.textContent = "Copied";
    } catch {
      if (toast) toast.textContent = "Copy failed. Select the address instead.";
    }
    window.setTimeout(() => {
      btn.classList.remove("is-copied");
      if (toast) toast.textContent = "";
    }, 2200);
  });
});

/* ---------- Active section ---------- */
let activeIndex = 0;
const activeListeners: ((i: number) => void)[] = [];
const sectionIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const i = Number((e.target as HTMLElement).dataset.section);
      if (i === activeIndex) return;
      activeIndex = i;
      navLinks.forEach((a) => a.setAttribute("aria-current", String(a.hash === `#${SECTION_IDS[i]}`)));
      activeListeners.forEach((fn) => fn(i));
    });
  },
  { rootMargin: "-45% 0px -50% 0px" },
);
document.querySelectorAll("[data-section]").forEach((el) => sectionIO.observe(el));

/* ---------- 3D stack ---------- */
const stage = document.querySelector<HTMLElement>("[data-stage]")!;
const canvas = document.querySelector<HTMLCanvasElement>("[data-stack]")!;
const dockLabel = document.querySelector<HTMLElement>("[data-dock-label]")!;
const hero = document.querySelector<HTMLElement>(".hero")!;

async function initStack() {
  const { createStack, webglAvailable } = await import("./stack");
  if (!webglAvailable()) {
    stage.classList.add("no-webgl");
    return;
  }

  const stack = createStack({
    canvas,
    reducedMotion,
    theme: currentTheme(),
    onPick(i) {
      if (!stage.classList.contains("is-docked")) return;
      document.getElementById(SECTION_IDS[i])?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    },
  });
  themeListeners.push((t) => stack.setTheme(t));
  activeListeners.push((i) => {
    stack.setActive(i);
    dockLabel.textContent = SECTION_NAMES[i];
  });
  dockLabel.textContent = SECTION_NAMES[0];

  const DOCK_W = 92;
  const INSET = 18;
  const MAXW = 1280;
  let dockFits = false;
  function measureDock() {
    const w = stage.offsetWidth;
    const scale = DOCK_W / w;
    const dockH = stage.offsetHeight * scale;
    stage.style.setProperty("--dock-scale", String(scale));
    stage.style.setProperty("--dock-inset", `${INSET}px`);
    dockLabel.style.setProperty("--dock-inset", `${INSET}px`);
    dockLabel.style.setProperty("--dock-h", `${dockH}px`);
    // Only dock when the page margin can hold it without covering content.
    const gutter = Math.min(48, Math.max(16, window.innerWidth * 0.04));
    const margin = Math.max(0, (window.innerWidth - MAXW) / 2) + gutter;
    dockFits = margin >= DOCK_W + INSET * 2 - 4;
  }
  measureDock();

  // Hero visibility drives the exploded view and docking.
  const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);
  let heroVisible = true;
  const applyDock = () => {
    const docked = !heroVisible && dockFits && !mobileQuery.matches;
    const off = !heroVisible && !docked;
    stage.classList.toggle("is-docked", docked);
    stage.classList.toggle("is-off", off);
    dockLabel.classList.toggle("is-on", docked);
    if (off || document.hidden) stack.stop();
    else stack.start();
  };
  window.addEventListener(
    "resize",
    () => {
      measureDock();
      applyDock();
    },
    { passive: true },
  );
  new IntersectionObserver(
    ([e]) => {
      const ratio = e.intersectionRatio;
      stack.setSpread(0.42 + (1 - ratio) * 0.55);
      const vis = ratio > 0.18;
      if (vis !== heroVisible) {
        heroVisible = vis;
        applyDock();
      }
    },
    { threshold: thresholds },
  ).observe(hero);

  // Pointer parallax (desktop) and gentle tilt (touch devices without it stay still).
  if (!reducedMotion) {
    window.addEventListener(
      "pointermove",
      (e) => {
        stack.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
      },
      { passive: true },
    );
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stack.stop();
    else applyDock();
  });

  stack.start();
}

// Defer 3D until the page has painted so text is never blocked by WebGL.
if ("requestIdleCallback" in window) {
  (window as Window).requestIdleCallback(() => initStack(), { timeout: 800 });
} else {
  setTimeout(initStack, 120);
}
