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

const proto = location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(`${proto}://${location.host}/pty`);
ws.binaryType = "arraybuffer";

ws.onopen = () => {
  send({ type: "resize", cols: term.cols, rows: term.rows });
};

ws.onmessage = (ev) => {
  if (typeof ev.data === "string") {
    term.write(ev.data);
  } else {
    term.write(new Uint8Array(ev.data));
  }
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

window.addEventListener("resize", () => {
  fit.fit();
  send({ type: "resize", cols: term.cols, rows: term.rows });
});
