import "./style.css";
import Lenis from "lenis";
import arrowRight from "@phosphor-icons/core/assets/regular/arrow-right.svg?raw";
import download from "@phosphor-icons/core/assets/regular/download-simple.svg?raw";
import linkedin from "@phosphor-icons/core/assets/regular/linkedin-logo.svg?raw";
import github from "@phosphor-icons/core/assets/regular/github-logo.svg?raw";
import sun from "@phosphor-icons/core/assets/regular/sun.svg?raw";
import moon from "@phosphor-icons/core/assets/regular/moon.svg?raw";
import arrowUpRight from "@phosphor-icons/core/assets/regular/arrow-up-right.svg?raw";
import copy from "@phosphor-icons/core/assets/regular/copy.svg?raw";
import check from "@phosphor-icons/core/assets/regular/check.svg?raw";
import type { Theme } from "./city";

const ICONS: Record<string, string> = {
  "arrow-right": arrowRight,
  "download-simple": download,
  "linkedin-logo": linkedin,
  "github-logo": github,
  sun,
  moon,
  "arrow-up-right": arrowUpRight,
  copy,
  check,
};

const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const lowPower =
  window.matchMedia("(max-width: 767px)").matches ||
  (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4);

/* ---------- Icons ---------- */
document.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
  const svg = ICONS[el.dataset.icon!];
  if (svg) {
    el.innerHTML = svg;
    el.setAttribute("aria-hidden", "true");
  }
});

/* ---------- Hero name: split into letters for the reveal ---------- */
document.querySelectorAll<HTMLElement>("[data-split] .hero__line").forEach((line, li) => {
  const words = (line.textContent ?? "").trim().split(/\s+/);
  line.textContent = "";
  line.setAttribute("aria-hidden", "true");
  let c = li * 8;
  words.forEach((word, wi) => {
    const w = document.createElement("span");
    w.className = "word";
    [...word].forEach((ch) => {
      const s = document.createElement("span");
      s.className = "char";
      s.style.setProperty("--c", String(c++));
      s.textContent = ch;
      w.appendChild(s);
    });
    line.appendChild(w);
    if (wi < words.length - 1) line.appendChild(document.createTextNode(" "));
  });
});

/* ---------- Theme ---------- */
const currentTheme = (): Theme => (root.getAttribute("data-theme") === "light" ? "light" : "dark");
const themeBtn = document.querySelector<HTMLButtonElement>("[data-theme-toggle]")!;
const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!;
const themeListeners: ((t: Theme) => void)[] = [];
function syncThemeUI(t: Theme) {
  themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
  themeMeta.content = t === "dark" ? "#060606" : "#ecedeb";
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

/* ---------- Smooth scroll ---------- */
const lenis = reducedMotion ? null : new Lenis({ autoRaf: true, lerp: 0.085, wheelMultiplier: 0.9 });
const navH = () => (document.querySelector<HTMLElement>("[data-nav]")?.offsetHeight ?? 76) + 8;

function scrollToHash(hash: string) {
  const el = hash === "#top" ? document.body : document.querySelector<HTMLElement>(hash);
  if (!el) return;
  if (lenis) lenis.scrollTo(hash === "#top" ? 0 : el, { offset: -navH(), duration: 1.6 });
  else el.scrollIntoView({ block: "start" });
}
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const hash = a.getAttribute("href")!;
    if (hash.length < 2 || hash === "#main") return;
    e.preventDefault();
    closeMenu();
    scrollToHash(hash);
  });
});

/* ---------- Mobile menu ---------- */
const menu = document.querySelector<HTMLElement>("[data-menu]")!;
const menuBtn = document.querySelector<HTMLButtonElement>("[data-menu-toggle]")!;
function openMenu() {
  menu.hidden = false;
  menuBtn.setAttribute("aria-expanded", "true");
  menuBtn.querySelector(".menu-btn__label")!.textContent = "Close";
  lenis?.stop();
  menu.querySelector<HTMLAnchorElement>("a")?.focus();
}
function closeMenu() {
  if (menu.hidden) return;
  menu.hidden = true;
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.querySelector(".menu-btn__label")!.textContent = "Menu";
  lenis?.start();
}
menuBtn.addEventListener("click", () => (menu.hidden ? openMenu() : closeMenu()));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !menu.hidden) {
    closeMenu();
    menuBtn.focus();
  }
});

/* ---------- Nav state ---------- */
const nav = document.querySelector<HTMLElement>("[data-nav]")!;
const sentinel = document.createElement("div");
sentinel.style.cssText = "position:absolute;top:0;left:0;height:40px;width:1px;pointer-events:none";
document.body.prepend(sentinel);
new IntersectionObserver(([e]) => nav.classList.toggle("is-scrolled", !e.isIntersecting)).observe(sentinel);
const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".nav__links a"));

/* ---------- Reveal on scroll ---------- */
const revealIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      revealIO.unobserve(e.target);
    });
  },
  { rootMargin: "0px 0px -3% 0px", threshold: 0.04 },
);
document.querySelectorAll(".reveal").forEach((el) => revealIO.observe(el));

/* ---------- Count-up numbers ---------- */
const countIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target as HTMLElement;
      const to = Number(el.dataset.count);
      if (reducedMotion || !to) return;
      const t0 = performance.now();
      const dur = 1600;
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 4))));
        if (k < 1) requestAnimationFrame(tick);
      };
      el.textContent = "0";
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
      const link = btn.parentElement?.querySelector("a");
      if (link) window.getSelection()?.selectAllChildren(link);
      if (toast) toast.textContent = "Selected. Press Ctrl+C to copy.";
    }
    window.setTimeout(() => {
      btn.classList.remove("is-copied");
      if (toast) toast.textContent = "";
    }, 2400);
  });
});

/* ---------- Active nav link ---------- */
const sectionIds = ["work", "leadership", "skills", "contact"];
const activeIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const id = (e.target as HTMLElement).id;
      navLinks.forEach((a) => a.setAttribute("aria-current", String(a.hash === `#${id}`)));
    });
  },
  { rootMargin: "-45% 0px -50% 0px" },
);
sectionIds.forEach((id) => {
  const el = document.getElementById(id);
  if (el) activeIO.observe(el);
});

/* ---------- Intro + city ---------- */
const loader = document.querySelector<HTMLElement>("[data-loader]")!;
const bar = document.querySelector<HTMLElement>("[data-loader-bar]")!;
const count = document.querySelector<HTMLElement>("[data-loader-count]")!;
const skipBtn = document.querySelector<HTMLButtonElement>("[data-loader-skip]")!;

let seen = false;
try {
  seen = sessionStorage.getItem("intro-seen") === "1";
  sessionStorage.setItem("intro-seen", "1");
} catch {
  /* no storage: play the full intro */
}

let progressTarget = 0;
let progressShown = 0;
let skipped = false;
function tickProgress() {
  progressShown += (progressTarget - progressShown) * 0.12;
  if (progressTarget - progressShown < 0.4) progressShown = progressTarget;
  bar.style.transform = `scaleX(${progressShown / 100})`;
  count.textContent = String(Math.round(progressShown)).padStart(3, "0");
  if (progressShown < 100) requestAnimationFrame(tickProgress);
}
requestAnimationFrame(tickProgress);

function finishLoader() {
  loader.classList.add("is-done");
  window.setTimeout(() => loader.remove(), 1300);
}
function reveal() {
  root.classList.add("is-ready");
}

type City = ReturnType<typeof import("./city").createCity>;
let city: City | null = null;

// Camera choreography: every section with data-shot is an anchor on the flight path.
const shotEls = Array.from(document.querySelectorAll<HTMLElement>("[data-shot]"));
let anchors: { y: number; shot: string }[] = [];
function measureAnchors() {
  const vh = window.innerHeight;
  anchors = shotEls.map((el) => {
    const r = el.getBoundingClientRect();
    const top = r.top + window.scrollY;
    // the shot is "fully on" when the section's upper third reaches the middle of the screen
    return { y: Math.max(0, top + Math.min(r.height * 0.33, vh * 0.5) - vh * 0.5), shot: el.dataset.shot! };
  });
  anchors[0].y = 0;
}
function currentShotPair(scrollY: number) {
  if (!anchors.length) return { a: "hero", b: "hero", t: 0 };
  for (let i = anchors.length - 1; i >= 0; i--) {
    if (scrollY >= anchors[i].y) {
      const next = anchors[i + 1];
      if (!next) return { a: anchors[i].shot, b: anchors[i].shot, t: 0 };
      const t = (scrollY - anchors[i].y) / Math.max(1, next.y - anchors[i].y);
      return { a: anchors[i].shot, b: next.shot, t };
    }
  }
  return { a: anchors[0].shot, b: anchors[0].shot, t: 0 };
}
function updateCamera(scrollY: number) {
  if (!city) return;
  const { a, b, t } = currentShotPair(scrollY);
  city.setShot(a, b, t);
}

async function boot() {
  const minTime = reducedMotion ? 0 : seen ? 500 : 1500;
  const t0 = performance.now();
  progressTarget = 18;

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  const cityModule = import("./city");
  await fontsReady;
  progressTarget = 42;
  const { createCity, webglAvailable, SHOTS } = await cityModule;
  progressTarget = 70;

  if (webglAvailable()) {
    try {
      city = createCity({
        canvas: document.querySelector<HTMLCanvasElement>("[data-city]")!,
        theme: currentTheme(),
        reducedMotion,
        lowPower,
      });
      city.warm();
      themeListeners.push((t) => city?.setTheme(t));
    } catch {
      city = null;
      root.classList.add("no-webgl");
    }
  } else {
    root.classList.add("no-webgl");
  }
  progressTarget = 100;

  measureAnchors();
  window.addEventListener(
    "resize",
    () => {
      measureAnchors();
      updateCamera(lenis ? lenis.scroll : window.scrollY);
    },
    { passive: true },
  );
  new ResizeObserver(() => measureAnchors()).observe(document.body);

  const wait = Math.max(0, minTime - (performance.now() - t0));
  if (!skipped) {
    await Promise.race([
      new Promise((r) => window.setTimeout(r, wait + (reducedMotion ? 0 : 350))),
      skipSignal,
    ]);
  }

  finishLoader();
  city?.start();

  // camera: fly down from the sky to the current shot
  const shotNow = () => {
    const { a, b, t } = currentShotPair(lenis ? lenis.scroll : window.scrollY);
    const A = SHOTS[a];
    const B = SHOTS[b];
    const k = t * t * (3 - 2 * t);
    const mix = (p: number[], q: number[]) => p.map((v, i) => v + (q[i] - v) * k) as [number, number, number];
    return { pos: mix(A.pos, B.pos), target: mix(A.target, B.target) };
  };
  const flight = skipped || reducedMotion ? 0 : seen ? 1500 : 2800;
  window.setTimeout(reveal, flight * 0.45);
  if (city) {
    await city.playIntro(flight, shotNow);
    updateCamera(lenis ? lenis.scroll : window.scrollY);
  } else {
    reveal();
  }

  if (lenis) {
    lenis.on("scroll", (l: Lenis) => updateCamera(l.scroll));
  } else {
    // reduced motion: jump between shots as sections come into view
    const snapIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) city?.setShot((e.target as HTMLElement).dataset.shot!, (e.target as HTMLElement).dataset.shot!, 0);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    shotEls.forEach((el) => snapIO.observe(el));
  }

  if (!reducedMotion && city) {
    window.addEventListener(
      "pointermove",
      (e) => city?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1),
      { passive: true },
    );
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) city?.stop();
    else city?.start();
  });
}

let onSkip: () => void = () => {};
const skipSignal = new Promise<void>((r) => (onSkip = r));
skipBtn.addEventListener("click", () => {
  skipped = true;
  progressTarget = 100;
  progressShown = 100;
  onSkip();
});

// Safety net: never leave a visitor stuck behind the loader.
window.setTimeout(() => {
  if (!root.classList.contains("is-ready")) {
    finishLoader();
    reveal();
  }
}, 9000);

boot().catch(() => {
  root.classList.add("no-webgl");
  finishLoader();
  reveal();
});
