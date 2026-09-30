import "./style.css";
import envelope from "@phosphor-icons/core/assets/regular/envelope-simple.svg?raw";
import download from "@phosphor-icons/core/assets/regular/download-simple.svg?raw";
import github from "@phosphor-icons/core/assets/regular/github-logo.svg?raw";
import linkedin from "@phosphor-icons/core/assets/regular/linkedin-logo.svg?raw";
import sun from "@phosphor-icons/core/assets/regular/sun.svg?raw";
import moon from "@phosphor-icons/core/assets/regular/moon.svg?raw";
import list from "@phosphor-icons/core/assets/regular/list.svg?raw";
import xIcon from "@phosphor-icons/core/assets/regular/x.svg?raw";
import grab from "@phosphor-icons/core/assets/regular/hand-grabbing.svg?raw";
import caret from "@phosphor-icons/core/assets/regular/caret-down.svg?raw";
import shield from "@phosphor-icons/core/assets/regular/shield-check.svg?raw";
import code from "@phosphor-icons/core/assets/regular/code.svg?raw";
import cpu from "@phosphor-icons/core/assets/regular/cpu.svg?raw";
import branch from "@phosphor-icons/core/assets/regular/git-branch.svg?raw";
import copy from "@phosphor-icons/core/assets/regular/copy.svg?raw";
import check from "@phosphor-icons/core/assets/regular/check.svg?raw";
import arrowUp from "@phosphor-icons/core/assets/regular/arrow-up.svg?raw";
import type { Theme } from "./city";

const ICONS: Record<string, string> = {
  "envelope-simple": envelope,
  "download-simple": download,
  "github-logo": github,
  "linkedin-logo": linkedin,
  sun,
  moon,
  list,
  x: xIcon,
  "hand-grabbing": grab,
  "caret-down": caret,
  "shield-check": shield,
  code,
  cpu,
  "git-branch": branch,
  copy,
  check,
  "arrow-up": arrowUp,
};

const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

/* ---------- Icons ---------- */
document.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
  const svg = ICONS[el.dataset.icon!];
  if (svg) {
    el.innerHTML = svg;
    el.setAttribute("aria-hidden", "true");
  }
});

/* ---------- Theme ---------- */
const currentTheme = (): Theme => (root.getAttribute("data-theme") === "dark" ? "dark" : "light");
const themeBtn = document.querySelector<HTMLButtonElement>("[data-theme-toggle]")!;
const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!;
const themeListeners: ((t: Theme) => void)[] = [];
function syncThemeUI(t: Theme) {
  themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
  themeMeta.content = t === "dark" ? "#111113" : "#f5f5f1";
}
syncThemeUI(currentTheme());
themeBtn.addEventListener("click", () => {
  const next: Theme = currentTheme() === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {
    /* storage blocked: the choice still applies for this visit */
  }
  syncThemeUI(next);
  themeListeners.forEach((fn) => fn(next));
});

/* ---------- Nav ---------- */
const nav = document.querySelector<HTMLElement>("[data-nav]")!;
const sentinel = document.createElement("div");
sentinel.style.cssText = "position:absolute;top:0;left:0;height:8px;width:1px;pointer-events:none";
document.body.prepend(sentinel);
new IntersectionObserver(([e]) => nav.classList.toggle("is-scrolled", !e.isIntersecting)).observe(sentinel);

const menu = document.querySelector<HTMLElement>("[data-menu]")!;
const menuBtn = document.querySelector<HTMLButtonElement>("[data-menu-toggle]")!;
function setMenu(open: boolean) {
  menu.hidden = !open;
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}
menuBtn.addEventListener("click", () => setMenu(Boolean(menu.hidden)));
menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !menu.hidden) {
    setMenu(false);
    menuBtn.focus();
  }
});

const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".nav__links a"));
const activeIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const id = (e.target as HTMLElement).id;
      navLinks.forEach((a) => a.setAttribute("aria-current", String(a.hash === `#${id}`)));
    });
  },
  { rootMargin: "-40% 0px -55% 0px" },
);
["about", "projects", "leadership", "toolkit", "contact"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) activeIO.observe(el);
});

/* ---------- Reveal ---------- */
const revealIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      revealIO.unobserve(e.target);
    });
  },
  { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
);
document.querySelectorAll(".reveal").forEach((el) => revealIO.observe(el));

/* ---------- Count-up ---------- */
const countIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target as HTMLElement;
      const to = Number(el.dataset.count);
      if (reducedMotion || !to) return;
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / 1300);
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
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
  const toast = document.querySelector<HTMLElement>("[data-toast]");
  const label = btn.querySelector<HTMLElement>("[data-copy-label]");
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy!);
      btn.classList.add("is-copied");
      if (label) label.textContent = "Copied";
      if (toast) toast.textContent = "Email address copied.";
    } catch {
      const addr = document.querySelector(".contact__addr");
      if (addr) window.getSelection()?.selectAllChildren(addr);
      if (toast) toast.textContent = "Address selected. Press Ctrl+C to copy it.";
    }
    window.setTimeout(() => {
      btn.classList.remove("is-copied");
      if (label) label.textContent = "Copy";
      if (toast) toast.textContent = "";
    }, 2400);
  });
});

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

  // drag to rotate the city model
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

  // only animate while the hero is on screen and the tab is visible
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

const idle = (cb: () => void) => {
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(cb, { timeout: 700 });
  else setTimeout(cb, 150);
};
idle(() => {
  init3D().catch(() => root.classList.add("no-webgl"));
});
