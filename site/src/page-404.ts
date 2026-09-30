import "./common";

// show the address that was requested, like a line from a server log
const path = document.querySelector<HTMLElement>("[data-path]");
if (path) {
  let p = location.pathname;
  try {
    p = decodeURIComponent(p);
  } catch {
    /* malformed escapes: show the raw path */
  }
  path.textContent = p || "/";
}
