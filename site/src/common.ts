import "./style.css";
import envelope from "@phosphor-icons/core/assets/regular/envelope-simple.svg?raw";
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
import arrowLeft from "@phosphor-icons/core/assets/regular/arrow-left.svg?raw";
import arrowRight from "@phosphor-icons/core/assets/regular/arrow-right.svg?raw";
import terminal from "@phosphor-icons/core/assets/regular/terminal-window.svg?raw";
import { mountTerminal } from "./terminal";
import type { Theme } from "./theme";

const ICONS: Record<string, string> = {
  "envelope-simple": envelope,
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
  "arrow-left": arrowLeft,
  "arrow-right": arrowRight,
  "terminal-window": terminal,
};

export const root = document.documentElement;
export const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = window.matchMedia("(pointer: fine)").matches;
export const siteRoot = document.body.dataset.root ?? "./";

/* ---------- Open at the top ---------- */
// Some hosts, like the preview viewer, reuse the window between pages and keep the old scroll
// position. Start a fresh visit at the top, or at the linked section, but leave back/forward
// and reloads to the browser.
{
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type !== "back_forward" && nav?.type !== "reload") {
    const place = () => {
      const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
      if (target) target.scrollIntoView({ behavior: "instant" });
      else window.scrollTo({ top: 0, behavior: "instant" });
    };
    place();
    requestAnimationFrame(place);
  }
}

/* ---------- Icons ---------- */
document.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
  const svg = ICONS[el.dataset.icon!];
  if (svg) {
    el.innerHTML = svg;
    el.setAttribute("aria-hidden", "true");
  }
});

/* ---------- Theme ---------- */
export const currentTheme = (): Theme => (root.getAttribute("data-theme") === "dark" ? "dark" : "light");
const themeBtn = document.querySelector<HTMLButtonElement>("[data-theme-toggle]")!;
const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!;
export const themeListeners: ((t: Theme) => void)[] = [];
function syncThemeUI(t: Theme) {
  themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
  themeMeta.content = t === "dark" ? "#111113" : "#f5f5f1";
}
syncThemeUI(currentTheme());
export function toggleTheme() {
  const next: Theme = currentTheme() === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {
    /* storage blocked: the choice still applies for this visit */
  }
  syncThemeUI(next);
  themeListeners.forEach((fn) => fn(next));
}
themeBtn.addEventListener("click", toggleTheme);

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

/* ---------- Reveal and intro ---------- */
let revealSeen = false;
const revealIO = new IntersectionObserver(
  (entries) => {
    revealSeen = true;
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      revealIO.unobserve(e.target);
    });
  },
  { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
);
document.querySelectorAll(".reveal").forEach((el) => revealIO.observe(el));
// safety net for hosts where the observer never reports: show everything rather than leave it hidden
window.setTimeout(() => {
  if (!revealSeen) document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
}, 3000);
requestAnimationFrame(() => root.classList.add("is-loaded"));

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
      const addr = document.querySelector("[data-email-text]");
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

/* ---------- Local time in Irbid ---------- */
{
  const el = document.querySelector<HTMLTimeElement>("[data-local-time]");
  if (el) {
    let fmt: Intl.DateTimeFormat | null = null;
    try {
      fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Amman", timeZoneName: "shortOffset" });
    } catch {
      /* very old engines: keep the static "Jordan" text */
    }
    let timer = 0;
    const tick = () => {
      const now = new Date();
      const parts = fmt!.formatToParts(now);
      const zone = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
      const time = parts
        .filter((p) => p.type !== "timeZoneName")
        .map((p) => p.value)
        .join("")
        .trim();
      el.textContent = zone ? `${time} (${zone})` : time;
      el.dateTime = now.toISOString();
    };
    if (fmt)
      new IntersectionObserver(([e]) => {
        window.clearInterval(timer);
        if (!e.isIntersecting) return;
        tick();
        timer = window.setInterval(tick, 15000);
      }).observe(el);
  }
}

/* ---------- Card spotlight ---------- */
if (finePointer && !reducedMotion) {
  // one style write per frame at most, and only for the card under the pointer
  let target: HTMLElement | null = null;
  let cx = 0;
  let cy = 0;
  let queued = false;
  document.addEventListener(
    "pointermove",
    (e) => {
      target = (e.target as Element).closest?.<HTMLElement>(".card") ?? null;
      if (!target || queued) return;
      cx = e.clientX;
      cy = e.clientY;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        if (!target) return;
        const r = target.getBoundingClientRect();
        target.style.setProperty("--mx", `${cx - r.left}px`);
        target.style.setProperty("--my", `${cy - r.top}px`);
      });
    },
    { passive: true },
  );
}

/* ---------- Magnetic primary buttons ---------- */
if (finePointer && !reducedMotion) {
  // the button leans a few pixels toward the pointer; `translate` stacks with the hover transform
  document.querySelectorAll<HTMLElement>(".btn--primary, .mailbtn").forEach((el) => {
    let raf = 0;
    el.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 8;
        const y = ((e.clientY - r.top) / r.height - 0.5) * 6;
        el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      });
    });
    el.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      el.style.translate = "";
    });
  });
}

/* ---------- Terminal ---------- */
mountTerminal(siteRoot, toggleTheme);

export const idle = (cb: () => void) => {
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(cb, { timeout: 700 });
  else setTimeout(cb, 150);
};
