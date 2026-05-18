import { WebSocketServer } from "ws";
import { spawn, type IPty } from "node-pty";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";

const PORT = Number(process.env.PORT ?? 8000);
const SHELL = process.env.PORTFOLIO_SHELL ?? resolve("server/shell.ts");
const NODE_BIN = process.env.NODE_BIN ?? process.execPath;
const DIST = resolve("dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

const http = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    let p = url.pathname === "/" ? "/index.html" : url.pathname;
    let file = join(DIST, p);
    try {
      const s = await stat(file);
      if (s.isDirectory()) file = join(file, "index.html");
    } catch {
      try {
        await stat(file + ".html");
        file = file + ".html";
      } catch {
        file = join(DIST, "index.html");
      }
    }
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

const wss = new WebSocketServer({ noServer: true });

http.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname !== "/pty") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws) => {
  let pty: IPty | null = null;
  let killed = false;

  ws.on("message", (raw) => {
    let msg: { type: string; data?: string; cols?: number; rows?: number };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.type === "resize" && msg.cols && msg.rows) {
      if (!pty) {
        try {
          pty = spawn(NODE_BIN, [SHELL], {
            name: "xterm-256color",
            cols: msg.cols,
            rows: msg.rows,
            cwd: process.cwd(),
            env: { ...process.env, TERM: "xterm-256color" },
          });
        } catch (err) {
          console.error("[pty] spawn failed:", err);
          ws.close();
          return;
        }
        console.log(`[pty] spawned ${NODE_BIN} ${SHELL} (${msg.cols}x${msg.rows})`);
        pty.onData((d) => {
          if (ws.readyState === ws.OPEN) ws.send(d);
        });
        pty.onExit(({ exitCode, signal }) => {
          console.log(`[pty] exited code=${exitCode} signal=${signal}`);
          if (!killed && ws.readyState === ws.OPEN) ws.close();
        });
      } else {
        try {
          pty.resize(msg.cols, msg.rows);
        } catch {}
      }
    } else if (msg.type === "input" && msg.data && pty) {
      pty.write(msg.data);
    }
  });

  ws.on("close", () => {
    killed = true;
    pty?.kill();
  });
});

http.listen(PORT, () => {
  console.log(`[http+ws] serving dist/ and /pty on :${PORT}`);
});
