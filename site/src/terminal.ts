/*
  A small terminal that answers a few commands about Mohammad. Opens from the
  nav button, the hero link, or with Ctrl+K / Cmd+K. Built on <dialog> so focus
  and Escape work the way assistive tech expects.
*/

type Line = { text: string; kind?: "cmd" | "ok" | "err" | "dim"; href?: string };

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
  const history: string[] = [];
  let hIndex = 0;

  const go = (hash: string) => {
    dlg.close();
    const onHome = !location.pathname.includes("/projects/");
    if (onHome) document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
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
      dlg.close();
      return;
    }
    const c = COMMANDS[key];
    print(c ? c.run(args) : [{ text: `command not found: ${cmd}. Type help.`, kind: "err" }]);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value;
    if (v.trim()) {
      history.push(v);
      hIndex = history.length;
    }
    input.value = "";
    run(v);
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
    } else if (e.key === "Tab") {
      const match = Object.keys(COMMANDS).filter((k) => k.startsWith(input.value.trim().toLowerCase()));
      if (match.length === 1) input.value = match[0];
      e.preventDefault();
    }
  });
  dlg.querySelector("[data-term-close]")!.addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  });

  let greeted = false;
  function open() {
    if (!dlg.open) dlg.showModal();
    if (!greeted) {
      greeted = true;
      print([
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
      if (dlg.open) dlg.close();
      else open();
    }
  });
}
