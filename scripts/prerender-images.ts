/**
 * Pre-renders public/images/* to half-block ANSI art and writes
 * server/_image-cache.json.
 *
 * Each text row encodes 2 image rows via ▀ (upper half block) with the
 * top pixel as foreground colour and the bottom pixel as background.
 * Adjacent cells skip emitting colour codes that haven't changed
 * (basic per-row RLE).
 *
 * Two sizes per image:
 *   small  — 36 char wide, suitable for banner / inline use
 *   large  — 72 char wide, suitable for `cat ~/photos/X.jpg`
 */

import sharp from "sharp";
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const IMAGES_DIR = resolve(ROOT, "public/images");
const OUT_FILE = resolve(ROOT, "server/_image-cache.json");

const SIZES = { small: 36, large: 72 } as const;

async function renderHalfBlock(path: string, charWidth: number): Promise<string> {
  const meta = await sharp(path).rotate().metadata();
  const aspect = meta.height! / meta.width!;
  const pixelW = charWidth;
  // Char cells are ~2:1 tall:wide; each text row stores 2 pixels.
  // Pixel-H that preserves visual aspect = pixelW * aspect.
  let pixelH = Math.max(2, Math.round(pixelW * aspect));
  if (pixelH % 2 !== 0) pixelH++;

  const { data, info } = await sharp(path)
    .rotate()
    .resize(pixelW, pixelH, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const W = info.width;
  const H = info.height;
  const lines: string[] = [];

  for (let y = 0; y < H; y += 2) {
    let line = "";
    let lastFg = "";
    let lastBg = "";
    for (let x = 0; x < W; x++) {
      const t = (y * W + x) * 3;
      const fg = `${data[t]};${data[t + 1]};${data[t + 2]}`;
      let bg: string;
      if (y + 1 < H) {
        const b = ((y + 1) * W + x) * 3;
        bg = `${data[b]};${data[b + 1]};${data[b + 2]}`;
      } else {
        bg = "0;0;0";
      }

      let codes = "";
      if (fg !== lastFg && bg !== lastBg) {
        codes = `\x1b[38;2;${fg};48;2;${bg}m`;
      } else if (fg !== lastFg) {
        codes = `\x1b[38;2;${fg}m`;
      } else if (bg !== lastBg) {
        codes = `\x1b[48;2;${bg}m`;
      }
      lastFg = fg;
      lastBg = bg;
      line += codes + "▀";
    }
    lines.push(line + "\x1b[0m");
  }

  return lines.join("\n");
}

async function main() {
  const files = (await readdir(IMAGES_DIR)).filter((f) =>
    /\.(jpe?g|png|webp)$/i.test(f),
  );
  if (!files.length) {
    console.error(`No images found in ${IMAGES_DIR}`);
    process.exit(1);
  }

  const cache: Record<string, { small: string; large: string }> = {};
  for (const f of files) {
    const path = join(IMAGES_DIR, f);
    process.stdout.write(`  rendering ${f} ...`);
    const t0 = Date.now();
    const small = await renderHalfBlock(path, SIZES.small);
    const large = await renderHalfBlock(path, SIZES.large);
    cache[f] = { small, large };
    console.log(` ${Date.now() - t0}ms  (s:${small.length}B l:${large.length}B)`);
  }

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(cache));
  console.log(`wrote ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
