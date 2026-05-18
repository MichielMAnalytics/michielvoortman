import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/pty": {
        target: "ws://localhost:8000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: {
        // / serves the 3D VT100 viewer (was vt100.html), /term serves the
        // plain xterm.js page that's iframed inside the 3D screen.
        main: resolve(__dirname, "index.html"),
        term: resolve(__dirname, "term.html"),
      },
    },
  },
});
