/*
  The site's terminal. One set of commands drives two views: the dialog that
  opens from the nav or with Ctrl+K / Cmd+K, and the live terminal in the home
  hero that types a short introduction and then takes commands.
*/

type Line = { text: string; kind?: "cmd" | "ok" | "err" | "dim"; href?: string };

type ShellOptions = {
  root: string;
  onTheme: () => void;
  out: HTMLElement;
  /** Called before the terminal moves the page (the dialog closes itself). */
  beforeNav?: () => void;
  /** What `exit` does in this view. */
  onExit: () => void;
};

function createShell({ root, onTheme, out, beforeNav, onExit }: ShellOptions) {
  const go = (hash: string) => {
    beforeNav?.();
    // scroll when the section is on this page, otherwise open it on the home page
    const target = document.querySelector(hash);
    if (target) target.scrollIntoView({ behavior: "smooth" });
    else location.href = `${root}${hash}`;
  };

  const COMMANDS: Record<string, { help: string; run: (args: string[]) => Line[] }> = {
    help: {
      help: "list commands",
      run: () =>
        Object.entries(COMMANDS).map(([k, v]) => ({ text: `${k.padEnd(11)} ${v.help}`, kind: "dim" as const })),
    },
    whoami: {
      help: "who is this",
      run: () => [
        { text: "Mohammad H. Malkawi", kind: "ok" },
        { text: "Computer Networks & Cybersecurity student, Jadara University (3rd year)." },
        { text: "Vice Chair, IEEE Jadara Student Branch. Irbid, Jordan." },
      ],
    },
    projects: {
      help: "list projects",
      run: () => [
        { text: "salka     Adaptive traffic control for Irbid. Up to 15% less waiting in SUMO." },
        { text: "clayer    Autonomous CO2 capture for heavy industry. Concept design." },
        { text: "Type a project name to open its page.", kind: "dim" },
      ],
    },
    salka: {
      help: "open the SALKA case study",
      run: () => {
        setTimeout(() => (location.href = `${root}projects/salka.html`), 350);
        return [{ text: "Opening SALKA…", kind: "ok" }];
      },
    },
    clayer: {
      help: "open the C-Layer case study",
      run: () => {
        setTimeout(() => (location.href = `${root}projects/c-layer.html`), 350);
        return [{ text: "Opening C-Layer…", kind: "ok" }];
      },
    },
    leadership: {
      help: "IEEE roles and RoboCraft",
      run: () => [
        { text: "Vice Chair, IEEE Jadara Student Branch (now)" },
        { text: "Chair, IEEE RAS Jadara chapter (2025-2026)" },
        { text: "RoboCraft, 6 Jan 2026: 110 teams registered, ~300 participants, 16 universities." },
      ],
    },
    skills: {
      help: "tools I use",
      run: () => [
        { text: "net/sec   Cisco networking, Wireshark, Kali Linux, Linux, Bash" },
        { text: "code      Python, C++" },
        { text: "systems   SUMO, TraCI, LSTM models, NVIDIA Jetson, Arduino" },
        { text: "tooling   Git, GitHub, Docker, OpenStreetMap data" },
      ],
    },
    status: {
      help: "am I available",
      run: () => [{ text: "● Open to internships, remote or in Jordan.", kind: "ok" }],
    },
    contact: {
      help: "how to reach me",
      run: () => [
        { text: "email     malkawimohammadh@gmail.com", href: "mailto:malkawimohammadh@gmail.com" },
        { text: "linkedin  linkedin.com/in/mohammad-h-malkawi-3264b5365", href: "https://linkedin.com/in/mohammad-h-malkawi-3264b5365" },
        { text: "github    github.com/malkawi06", href: "https://github.com/malkawi06" },
      ],
    },
    cv: {
      help: "download my CV",
      run: () => {
        const a = document.createElement("a");
        a.href = `${root}Mohammad-H-Malkawi-CV.pdf`;
        a.download = "";
        a.click();
        return [{ text: "Downloading Mohammad-H-Malkawi-CV.pdf…", kind: "ok" }];
      },
    },
    ls: {
      help: "list sections",
      run: () => [{ text: "about/  projects/  leadership/  toolkit/  contact/  cv.pdf", kind: "dim" }],
    },
    cd: {
      help: "jump to a section, e.g. cd contact",
      run: ([dir]) => {
        const id = (dir || "").replace(/\/$/, "");
        if (!["about", "projects", "leadership", "toolkit", "contact"].includes(id))
          return [{ text: `cd: no such section: ${dir ?? ""}. Try ls.`, kind: "err" }];
        setTimeout(() => go(`#${id}`), 200);
        return [];
      },
    },
    theme: {
      help: "switch light and dark",
      run: () => {
        onTheme();
        return [{ text: "Theme switched.", kind: "ok" }];
      },
    },
    sudo: {
      help: "try it",
      run: () => [{ text: "Permission denied. Good instinct though, that is how security testing starts.", kind: "err" }],
    },
    clear: { help: "clear the screen", run: () => [] },
    exit: { help: "close the terminal", run: () => [] },
  };

  function print(lines: Line[]) {
    for (const l of lines) {
      const p = document.createElement("p");
      if (l.kind) p.className = `is-${l.kind}`;
      if (l.href) {
        const a = document.createElement("a");
        a.href = l.href;
        a.textContent = l.text;
        if (l.href.startsWith("http")) {
          a.target = "_blank";
          a.rel = "noopener";
        }
        p.appendChild(a);
      } else p.textContent = l.text;
      out.appendChild(p);
    }
    out.scrollTop = out.scrollHeight;
  }

  function run(raw: string) {
    const [cmd, ...args] = raw.trim().split(/\s+/);
    if (!cmd) return;
    print([{ text: `$ ${raw.trim()}`, kind: "cmd" }]);
    const key = cmd.toLowerCase() === "c-layer" ? "clayer" : cmd.toLowerCase();
    if (key === "clear") {
      out.textContent = "";
      return;
    }
    if (key === "exit") {
      onExit();
      return;
    }
    const c = COMMANDS[key];
    print(c ? c.run(args) : [{ text: `command not found: ${cmd}. Type help.`, kind: "err" }]);
  }

  const complete = (value: string) => {
    const match = Object.keys(COMMANDS).filter((k) => k.startsWith(value.trim().toLowerCase()));
    return match.length === 1 ? match[0] : value;
  };

  return { run, print, complete };
}

/** Enter runs, arrow keys walk the history, Tab completes. */
function wireInput(form: HTMLFormElement, input: HTMLInputElement, shell: ReturnType<typeof createShell>) {
  const history: string[] = [];
  let hIndex = 0;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value;
    if (v.trim()) {
      history.push(v);
      hIndex = history.length;
    }
    input.value = "";
    shell.run(v);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" && hIndex > 0) {
      hIndex--;
      input.value = history[hIndex];
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      hIndex = Math.min(history.length, hIndex + 1);
      input.value = history[hIndex] ?? "";
      e.preventDefault();
    } else if (e.key === "Tab" && input.value.trim()) {
      input.value = shell.complete(input.value);
      e.preventDefault();
    }
  });
}

export function mountTerminal(root: string, onTheme: () => void) {
  const dlg = document.createElement("dialog");
  dlg.className = "term";
  dlg.setAttribute("aria-labelledby", "term-title");
  dlg.innerHTML = `
    <div class="term__bar">
      <span class="term__dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <p id="term-title">malkawi@portfolio: ~</p>
      <button type="button" class="term__close" data-term-close aria-label="Close terminal">Esc</button>
    </div>
    <div class="term__out" data-term-out aria-live="polite"></div>
    <form class="term__form" data-term-form>
      <label for="term-in" class="term__prompt">$</label>
      <input id="term-in" name="command" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type help…" />
    </form>`;
  document.body.appendChild(dlg);

  const out = dlg.querySelector<HTMLElement>("[data-term-out]")!;
  const form = dlg.querySelector<HTMLFormElement>("[data-term-form]")!;
  const input = dlg.querySelector<HTMLInputElement>("#term-in")!;
  const close = () => dlg.close();
  const shell = createShell({ root, onTheme, out, beforeNav: close, onExit: close });
  wireInput(form, input, shell);

  dlg.querySelector("[data-term-close]")!.addEventListener("click", close);
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) close();
  });

  let greeted = false;
  function open() {
    if (!dlg.open) dlg.showModal();
    if (!greeted) {
      greeted = true;
      shell.print([
        { text: "Welcome. This terminal knows a few things about me.", kind: "ok" },
        { text: "Try whoami, projects, skills, contact or help.", kind: "dim" },
      ]);
    }
    input.focus();
  }

  document.querySelectorAll("[data-term-open]").forEach((b) => b.addEventListener("click", open));
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (dlg.open) close();
      else open();
    }
  });
}

/**
 * The hero terminal. Its introduction is plain HTML, so it reads fine without
 * JavaScript; with motion allowed, the commands are typed out once it is on screen.
 */
export function mountHeroTerminal(el: HTMLElement, root: string, onTheme: () => void, reducedMotion: boolean) {
  const out = el.querySelector<HTMLElement>("[data-hterm-out]")!;
  const form = el.querySelector<HTMLFormElement>("[data-hterm-form]")!;
  const input = el.querySelector<HTMLInputElement>("input")!;
  const shell = createShell({
    root,
    onTheme,
    out,
    onExit: () => shell.print([{ text: "This one lives on the page, so it stays open.", kind: "dim" }]),
  });
  wireInput(form, input, shell);

  // clicking anywhere in the window focuses the prompt, unless the reader is selecting or following a link
  el.addEventListener("click", (e) => {
    if ((e.target as Element).closest("a, button, input")) return;
    if (window.getSelection()?.toString()) return;
    input.focus({ preventScroll: true });
  });

  const lines = Array.from(el.querySelectorAll<HTMLElement>("[data-hterm-intro] > p"));
  if (reducedMotion || !lines.length) return;

  let timer = 0;
  let done = false;
  const cmdText = new Map<HTMLElement, string>();
  lines.forEach((l) => {
    const c = l.querySelector<HTMLElement>(".c");
    if (c) cmdText.set(c, c.textContent ?? "");
    l.hidden = true;
  });
  el.classList.add("is-typing");

  const finish = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    lines.forEach((l) => {
      l.hidden = false;
      l.classList.remove("is-active");
    });
    cmdText.forEach((text, c) => (c.textContent = text));
    el.classList.remove("is-typing");
    out.scrollTop = out.scrollHeight;
  };

  let i = 0;
  const next = () => {
    if (done) return;
    if (i >= lines.length) return finish();
    const line = lines[i++];
    line.hidden = false;
    out.scrollTop = out.scrollHeight;
    const c = line.querySelector<HTMLElement>(".c");
    if (!c) {
      timer = window.setTimeout(next, 110);
      return;
    }
    const full = cmdText.get(c) ?? "";
    c.textContent = "";
    line.classList.add("is-active");
    let k = 0;
    const type = () => {
      if (done) return;
      c.textContent = full.slice(0, ++k);
      if (k < full.length) timer = window.setTimeout(type, 45 + Math.random() * 45);
      else {
        line.classList.remove("is-active");
        timer = window.setTimeout(next, 280);
      }
    };
    timer = window.setTimeout(type, 320);
  };

  // anyone who starts typing gets the full intro at once
  input.addEventListener("focus", finish, { once: true });

  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    timer = window.setTimeout(next, 500);
  });
  io.observe(el);
}
