import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { ImageAddon } from "@xterm/addon-image";
import "@xterm/xterm/css/xterm.css";

const term = new Terminal({
  cursorBlink: true,
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  fontSize: 14,
  theme: {
    background: "#0a0a0a",
    foreground: "#e6e6e6",
    cursor: "#e6e6e6",
    black: "#0a0a0a",
    brightBlack: "#5a5a5a",
  },
  convertEol: true,
  scrollback: 5000,
});

const fit = new FitAddon();
term.loadAddon(fit);
term.loadAddon(new WebLinksAddon());
term.loadAddon(
  new ImageAddon({
    sixelSupport: false,
    iipSupport: true,
    storageLimit: 256,
  }),
);

const el = document.getElementById("term")!;
term.open(el);
fit.fit();

const query = new URLSearchParams(location.search);
const noBanner = query.get("nobanner") === "1";

const proto = location.protocol === "https:" ? "wss" : "ws";
const wsUrl = `${proto}://${location.host}/pty${noBanner ? "?nobanner=1" : ""}`;
const ws = new WebSocket(wsUrl);
ws.binaryType = "arraybuffer";

// Private OSC sequence emitted by the shell's `fork` command. We strip it
// from the on-screen output and notify the parent (the 3D /vt100 viewer).
const FORK_MARKER = "\x1b]1337;boxd-fork\x07";
function intercept(data: string): string {
  if (!data.includes(FORK_MARKER)) return data;
  try { window.parent?.postMessage({ type: "boxd-fork" }, "*"); } catch {}
  return data.split(FORK_MARKER).join("");
}

ws.onopen = () => {
  send({ type: "resize", cols: term.cols, rows: term.rows });
};

ws.onmessage = (ev) => {
  if (typeof ev.data === "string") {
    term.write(intercept(ev.data));
  } else {
    // Binary frame → decode as utf-8 so we can sniff for the fork marker.
    const text = new TextDecoder().decode(new Uint8Array(ev.data));
    term.write(intercept(text));
  }
  term.scrollToBottom();
};

ws.onclose = () => {
  term.write("\r\n\x1b[2m[disconnected]\x1b[0m\r\n");
};

term.onData((d) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "input", data: d }));
  }
});

function send(msg: object) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

// Exposed for the 3D /vt100 viewer: lets the parent send raw input bytes
// (e.g. "\r" for Return) without going through synthetic KeyboardEvents.
type Bridge = {
  __sendInput: (d: string) => void;
  __getBuffer: () => string;
  __hydrate: (text: string) => void;
};
const bridge = window as unknown as Bridge;
bridge.__sendInput = (d) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "input", data: d }));
  }
};

// Return the textual snapshot of every non-empty line in the active buffer,
// joined with CRLFs. Used by the fork command to seed the clone terminal.
bridge.__getBuffer = () => {
  const buf = term.buffer.active;
  const lines: string[] = [];
  // Walk from the top of the scrollback through the visible viewport.
  const total = buf.length;
  for (let y = 0; y < total; y++) {
    const line = buf.getLine(y);
    if (!line) continue;
    lines.push(line.translateToString(true));
  }
  // Trim trailing empty lines so the clone's prompt sits right where the
  // source's does, not at the bottom of the buffer.
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\r\n") + "\r\n";
};

// Write hydration text into xterm before / alongside the live PTY stream.
bridge.__hydrate = (text) => {
  term.write(text);
  term.scrollToBottom();
};

window.addEventListener("resize", () => {
  fit.fit();
  send({ type: "resize", cols: term.cols, rows: term.rows });
  term.scrollToBottom();
});
