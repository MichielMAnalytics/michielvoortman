# michielvoortman.com

![3D VT100 viewer with the live portfolio rendered inside the CRT](public/images/vt100-hero.png)

A single-terminal portfolio. The whole site is one xterm.js window backed by a real PTY shell — so the same backend can drive a physical VT100-style terminal later.

**[/](https://michielvoortman.boxd.sh/)** serves a 3D VT100 with the live portfolio rendered as an iframe inside the CRT. The 3D keyboard is clickable, real-keyboard input also presses the matching keycap, and clicking the engraved `boxd` logo on the side detonates the entire unit (try it).
**[/term](https://michielvoortman.boxd.sh/term)** is the plain xterm.js page — the same surface the 3D viewer iframes.

## Stack

- **Frontend:** Vite + TypeScript + xterm.js (vanilla, no React)
- **Backend:** Bun + `ws` + `node-pty` running a small portfolio shell

## Dev

```bash
bun install
bun run dev          # vite on :5173 + pty ws on :8001 (proxied by vite)
```

Open <http://localhost:5173>.

## Production (single port, this VM)

```bash
bun run build
bun run start        # serves dist/ on :8000 and pty on :8001
```

The boxd default proxy forwards `:8000` → `https://$BOXD_VM_NAME.boxd.sh`.
We expose the PTY WebSocket through a second boxd subdomain (e.g. `pty.<vm>.boxd.sh` → `:8001`).

## Adding commands

Edit `server/shell.ts`. Each command is a `{ name, desc, run }` entry in the `commands` map. Keep output ANSI-only — no mouse events, no bracketed paste tricks — so the same shell stays valid over a serial link to the physical terminal.
