/**
 * Pre-renders public/images/* to iTerm inline-image escape sequences
 * (the IIP protocol that xterm-addon-image's `iipSupport` decodes).
 *
 *   ESC ] 1337 ; File=inline=1;preserveAspectRatio=1;width=Ncols : BASE64 BEL
 *
 * The browser-side ImageAddon receives the OSC, base64-decodes, and
 * renders the JPEG at native browser pixel resolution — so the image
 * stays crisp regardless of the character grid.
 *
 * Two display widths per image:
 *   thumb — 36 char cells wide (banner / inline)
 *   full  — 72 char cells wide (~/photos/*.jpg)
 *
 * Source is re-encoded once at SOURCE_MAX_WIDTH px via sharp; the same
 * base64 blob is referenced from both sizes (the addon scales).
 */

import sharp from "sharp";
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const IMAGES_DIR = resolve(ROOT, "public/images");
const OUT_FILE = resolve(ROOT, "server/_image-cache.json");

const SOURCE_MAX_WIDTH = 1400;
const JPEG_QUALITY = 85;

const SIZES = {
  thumb: 36,
  full: 72,
} as const;

async function encode(path: string): Promise<{ b64: string; bytes: number }> {
  const buffer = await sharp(path)
    .rotate()
    .resize(SOURCE_MAX_WIDTH, null, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, progressive: true })
    .toBuffer();
  return { b64: buffer.toString("base64"), bytes: buffer.length };
}

function iip(b64: string, bytes: number, widthCols: number): string {
  // `size=` is required — the IIP handler aborts silently if it's missing.
  return `\x1b]1337;File=inline=1;preserveAspectRatio=1;size=${bytes};width=${widthCols}:${b64}\x07`;
}

async function main() {
  const files = (await readdir(IMAGES_DIR))
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort();

  if (!files.length) {
    console.error(`No images in ${IMAGES_DIR}`);
    process.exit(1);
  }

  const cache: Record<string, { thumb: string; full: string }> = {};
  for (const f of files) {
    const t0 = Date.now();
    const { b64, bytes } = await encode(join(IMAGES_DIR, f));
    cache[f] = {
      thumb: iip(b64, bytes, SIZES.thumb),
      full: iip(b64, bytes, SIZES.full),
    };
    console.log(
      `  ${f.padEnd(32)} ${(Date.now() - t0).toString().padStart(4)}ms  jpeg:${(bytes / 1024).toFixed(1)}KB  b64:${(b64.length / 1024).toFixed(1)}KB`,
    );
  }

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(cache));
  console.log(`\nwrote ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
