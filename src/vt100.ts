import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";

// ---------- Renderers ----------
const canvas = document.getElementById("scene") as HTMLCanvasElement;
const cssRoot = document.getElementById("css-scene") as HTMLDivElement;
const loading = document.getElementById("loading") as HTMLDivElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x07090b, 1);

const cssRenderer = new CSS3DRenderer({ element: cssRoot });
cssRenderer.setSize(window.innerWidth, window.innerHeight);

// ---------- Scene + Camera ----------
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x07090b, 35, 90);

const camera = new THREE.PerspectiveCamera(
  32,
  window.innerWidth / window.innerHeight,
  0.1,
  500,
);

// Compute a camera distance that frames the whole VT100 unit (case + tray)
// with comfortable margin, for *this* viewport's aspect ratio. Without this,
// narrow portrait viewports (mobile) crop the horizontal FOV so tight that
// the machine fills the screen — the user just sees one big keyboard.
// Slightly larger than the literal bounding box because the camera target
// (y=4.5) sits below the case center (y=5.2), so we need to fit ~5.9 above
// and ~4.5 below the target.
const UNIT_W = 14;
const UNIT_H = 12;
// Default view direction: the original (11, 9.5, 24) camera relative to the
// (0, 4.5, 1.5) orbit target — a 3/4 view from slightly above.
const TARGET = new THREE.Vector3(0, 4.5, 1.5);
const VIEW_DIR = new THREE.Vector3(11, 9.5 - 4.5, 24 - 1.5).normalize();
function distanceToFit(): number {
  const aspect = window.innerWidth / window.innerHeight;
  const fovV = (camera.fov * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);
  const distV = UNIT_H / (2 * Math.tan(fovV / 2));
  const distH = UNIT_W / (2 * Math.tan(fovH / 2));
  return Math.max(distV, distH) * 1.4;
}
function frameUnit() {
  const d = distanceToFit();
  camera.position.copy(VIEW_DIR).multiplyScalar(d).add(TARGET);
  camera.lookAt(TARGET);
}
frameUnit();

// ---------- Lighting ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const key = new THREE.DirectionalLight(0xfff2d6, 1.5);
key.position.set(8, 14, 10);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 50;
key.shadow.camera.left = -15;
key.shadow.camera.right = 15;
key.shadow.camera.top = 15;
key.shadow.camera.bottom = -15;
key.shadow.bias = -0.0002;
key.shadow.normalBias = 0.02;
scene.add(key);

const fill = new THREE.DirectionalLight(0xb8d2ff, 0.55);
fill.position.set(-9, 6, 6);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffe2b8, 0.4);
rim.position.set(-2, 4, -10);
scene.add(rim);

// ---------- Floor ----------
{
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({
      color: 0x0c1014,
      roughness: 0.92,
      metalness: 0.0,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.0;
  floor.receiveShadow = true;
  scene.add(floor);
}

// ---------- Materials ----------
const BEIGE = 0xc9bfa6;
const BEIGE_DARK = 0xb1a78d;
const BEZEL = 0x2b2a26;
const KEY_DARK = 0x1c1b18;
const KEY_CAP = 0x2c2a25;
const ACCENT = 0xd9534a;

const caseMat = new THREE.MeshStandardMaterial({
  color: BEIGE,
  roughness: 0.78,
  metalness: 0.04,
});
const caseMatDark = new THREE.MeshStandardMaterial({
  color: BEIGE_DARK,
  roughness: 0.85,
  metalness: 0.03,
});
const bezelMat = new THREE.MeshStandardMaterial({
  color: BEZEL,
  roughness: 0.55,
  metalness: 0.15,
});
const trayMat = new THREE.MeshStandardMaterial({
  color: KEY_DARK,
  roughness: 0.7,
  metalness: 0.08,
});
const keyMat = new THREE.MeshStandardMaterial({
  color: KEY_CAP,
  roughness: 0.55,
  metalness: 0.12,
});
const accentMat = new THREE.MeshStandardMaterial({
  color: ACCENT,
  roughness: 0.5,
  metalness: 0.2,
});

// ---------- VT100 group ----------
const terminal = new THREE.Group();
scene.add(terminal);

// Monitor body — main beige housing.
// Dimensions roughly tuned to reference VT100 photo: chunky, near-square front face.
const MON_W = 11.0; // width
const MON_H = 9.4;  // height
const MON_D = 9.8;  // depth (deep CRT)

// Body: a slightly tapered box (front wider than back via two stacked boxes is overkill;
// use a single rounded box for simplicity).
function roundedBox(w: number, h: number, d: number, r: number, mat: THREE.Material) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 6,
  });
  geo.translate(0, 0, -d / 2);
  return new THREE.Mesh(geo, mat);
}

const body = roundedBox(MON_W, MON_H, MON_D, 0.45, caseMat);
body.castShadow = true;
body.receiveShadow = true;
body.position.set(0, MON_H / 2 + 1.0, 0); // 1.0 = keyboard tray height
terminal.add(body);

// Top "hood" — the dark grey strip across the top portion of the monitor
// that overhangs the screen on the real VT100.
const HOOD_H = 1.7;
{
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(MON_W - 0.05, HOOD_H, MON_D - 0.05),
    new THREE.MeshStandardMaterial({
      color: 0x4a463f,
      roughness: 0.72,
      metalness: 0.08,
    }),
  );
  // Sit at the top of the body
  hood.position.set(0, 1.0 + MON_H - HOOD_H / 2, 0);
  hood.castShadow = true;
  hood.receiveShadow = true;
  terminal.add(hood);

  // Slight forward overhang lip (the hood juts forward a touch)
  const overhang = new THREE.Mesh(
    new THREE.BoxGeometry(MON_W - 0.4, 0.18, 0.25),
    new THREE.MeshStandardMaterial({
      color: 0x3a362f,
      roughness: 0.7,
      metalness: 0.1,
    }),
  );
  overhang.position.set(0, 1.0 + MON_H - HOOD_H - 0.04, MON_D / 2 + 0.1);
  overhang.castShadow = true;
  terminal.add(overhang);
}

// Back-of-case details — vents + a small embossed model plate so the rear
// doesn't look like a flat slab when the user orbits all the way around.
{
  const ventMat = new THREE.MeshStandardMaterial({
    color: 0x2a2924,
    roughness: 0.85,
    metalness: 0.05,
  });
  // A horizontal louvre grille on the back, centered, with multiple slats.
  const SLAT_COUNT = 18;
  const SLAT_GAP = 0.16;
  const SLAT_W = MON_W * 0.62;
  const SLAT_H = 0.05;
  const SLAT_D = 0.02;
  const totalSlatH = SLAT_COUNT * (SLAT_H + SLAT_GAP) - SLAT_GAP;
  const ventY = 1.0 + (MON_H - HOOD_H) / 2;
  for (let i = 0; i < SLAT_COUNT; i++) {
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(SLAT_W, SLAT_H, SLAT_D),
      ventMat,
    );
    slat.position.set(
      0,
      ventY - totalSlatH / 2 + i * (SLAT_H + SLAT_GAP),
      -MON_D / 2 - 0.10, // outside the body bevel (~0.06)
    );
    slat.castShadow = false;
    slat.receiveShadow = true;
    terminal.add(slat);
  }

  // Tiny rear nameplate "BC-BS 20768" — matches the silver plate on a real VT100.
  const c = document.createElement("canvas");
  c.width = 512; c.height = 96;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#bcbcbc";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 40px ui-monospace, 'SF Mono', Menlo, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText("BC-BS 20768", 32, c.height / 2);
  const plateTex = new THREE.CanvasTexture(c);
  plateTex.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.26),
    new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.5, metalness: 0.4 }),
  );
  // Face -Z (back), positioned low-right on the back.
  plate.rotation.y = Math.PI;
  plate.position.set(MON_W / 2 - 1.1, 1.0 + 0.7, -MON_D / 2 - 0.10);
  terminal.add(plate);
}

// CRT front bezel — recessed dark plastic surrounding the screen.
// Sits in the lower-middle of the front face, below the hood.
const BEZ_W = 8.2;
const BEZ_H = 6.0;
const BEZ_D = 0.4;
// Bezel vertical center: roughly screen-center, below the hood, leaving
// room for a brand strip across the bottom of the front face.
const BEZ_Y = 1.0 + (MON_H - HOOD_H) / 2 + 0.0;
{
  const bezel = roundedBox(BEZ_W, BEZ_H, BEZ_D, 0.45, bezelMat);
  bezel.position.set(0, BEZ_Y, MON_D / 2 - 0.02);
  bezel.castShadow = true;
  bezel.receiveShadow = true;
  terminal.add(bezel);
}

// Screen aperture — the cutout where the CRT face sits.
// We'll make a slightly recessed dark plane behind which the CSS3D iframe lives.
const SCREEN_W = BEZ_W - 1.6;
const SCREEN_H = BEZ_H - 1.4;
const SCREEN_Y = BEZ_Y;
const SCREEN_Z = MON_D / 2 + 0.18;       // out in front of bezel

{
  // Dark recess behind the screen so any iframe gaps look intentional.
  const recess = new THREE.Mesh(
    new THREE.PlaneGeometry(SCREEN_W + 0.3, SCREEN_H + 0.3),
    new THREE.MeshStandardMaterial({
      color: 0x050505,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );
  recess.position.set(0, SCREEN_Y, MON_D / 2 + 0.05);
  terminal.add(recess);
}

// boxd logo mark — etched on the right side, above the wordmark. Loads the
// SVG from public/, recolors it to black, then renders the same shadow +
// highlight + bumpMap engraving treatment as the wordmark below.
let logoMesh: THREE.Mesh | null = null;
(async () => {
  const r = await fetch("/boxd-logo.svg");
  if (!r.ok) return;
  let svgText = await r.text();
  // Force fill to black regardless of what's in the file.
  svgText = svgText.replace(/fill="[^"]*"/g, 'fill="#000000"');
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("logo load failed"));
    img.src = url;
  });
  URL.revokeObjectURL(url);

  const cs = 512;
  // Helper: rasterize the SVG silhouette with a given fill color into a fresh canvas.
  function silhouette(color: string): HTMLCanvasElement {
    const c = document.createElement("canvas");
    c.width = c.height = cs;
    const cx = c.getContext("2d")!;
    cx.drawImage(img, 0, 0, cs, cs);
    cx.globalCompositeOperation = "source-in";
    cx.fillStyle = color;
    cx.fillRect(0, 0, cs, cs);
    return c;
  }

  // Composite layered engraving onto the main canvas.
  const main = document.createElement("canvas");
  main.width = main.height = cs;
  const mctx = main.getContext("2d")!;
  // Shadow (bottom-right edge of groove)
  mctx.globalAlpha = 0.55;
  mctx.drawImage(silhouette("#000000"), 7, 7);
  // Highlight (top-left lip)
  mctx.globalAlpha = 0.30;
  mctx.drawImage(silhouette("#ffffff"), -3, -3);
  // Main recessed glyph
  mctx.globalAlpha = 0.92;
  mctx.drawImage(silhouette("#181208"), 0, 0);
  mctx.globalAlpha = 1;

  const logoTex = new THREE.CanvasTexture(main);
  logoTex.colorSpace = THREE.SRGBColorSpace;
  logoTex.anisotropy = 8;

  // Bump map: dark glyph on neutral gray for surface-normal lighting.
  const bump = document.createElement("canvas");
  bump.width = bump.height = cs;
  const bctx = bump.getContext("2d")!;
  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, cs, cs);
  bctx.drawImage(silhouette("#202020"), 0, 0);
  const logoBump = new THREE.CanvasTexture(bump);
  logoBump.anisotropy = 8;

  const logoSize = 1.0;
  logoMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(logoSize, logoSize),
    new THREE.MeshStandardMaterial({
      map: logoTex,
      transparent: true,
      bumpMap: logoBump,
      bumpScale: 0.08,
      roughness: 0.78,
      metalness: 0.04,
      side: THREE.DoubleSide,
    }),
  );
  logoMesh.rotation.y = Math.PI / 2; // face +X
  logoMesh.userData.isBoxdLogo = true; // tag so clones can be found after .clone(true)
  // Sit just outside the bevelled right face, above the wordmark.
  // Wordmark center is at y = 1.0 + (MON_H - HOOD_H)/2 = 4.85, plateH = 1.2,
  // so its top is at y = 5.45. Logo sits with a small gap above that.
  logoMesh.position.set(
    MON_W / 2 + 0.12,
    5.45 + logoSize / 2 + 0.2,
    0,
  );
  terminal.add(logoMesh);
})().catch((e) => console.warn("[boxd logo]", e));

// boxd wordmark — etched into the right side of the case, MacBook-lid style.
// Implemented as a canvas decal with shadow + highlight to fake the engraved
// edge, plus a bumpMap so directional light reacts to it.
{
  const plateW = 3.0;
  const plateH = 1.2;
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 384;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, c.width, c.height);

  const text = "boxd";
  ctx.font = "bold 260px ui-monospace, 'SF Mono', Menlo, monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  const cx = c.width / 2, cy = c.height / 2 + 10;

  // Layered drop-shadow + highlight + main fill to fake an engraved edge.
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillText(text, cx + 5, cy + 5);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText(text, cx - 2, cy - 2);
  ctx.fillStyle = "rgba(30,22,10,0.92)";
  ctx.fillText(text, cx, cy);

  const decalTex = new THREE.CanvasTexture(c);
  decalTex.colorSpace = THREE.SRGBColorSpace;
  decalTex.anisotropy = 8;

  // Bump version: black glyph on neutral grey for normal-driven lighting.
  const b = document.createElement("canvas");
  b.width = 1024; b.height = 384;
  const bctx = b.getContext("2d")!;
  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, b.width, b.height);
  bctx.font = ctx.font;
  bctx.textBaseline = "middle";
  bctx.textAlign = "center";
  bctx.fillStyle = "#202020";
  bctx.fillText(text, cx, cy);
  const bumpTex = new THREE.CanvasTexture(b);
  bumpTex.anisotropy = 8;

  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(plateW, plateH),
    new THREE.MeshStandardMaterial({
      map: decalTex,
      transparent: true,
      bumpMap: bumpTex,
      bumpScale: 0.08,
      roughness: 0.78,
      metalness: 0.04,
      side: THREE.DoubleSide,
    }),
  );
  decal.rotation.y = Math.PI / 2; // face +X (right side)
  // The body uses ExtrudeGeometry with bevelSize 0.06, so its actual right
  // face is at x = MON_W/2 + 0.06, not MON_W/2. Sit clearly outside that.
  decal.position.set(
    MON_W / 2 + 0.12,
    1.0 + (MON_H - HOOD_H) / 2,  // vertically centered on the front face below hood
    0.0,                          // centered along the side (z)
  );
  terminal.add(decal);
}

// Nameplate "digital VT100" — small black panel with subtle text.
{
  const plateW = 1.6, plateH = 0.3;
  const c = document.createElement("canvas");
  c.width = 512; c.height = 96;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0d0d0d";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#e6e6e6";
  ctx.font = "bold 38px Helvetica, Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("digital", 28, c.height / 2);
  ctx.fillStyle = "#e94c3b";
  ctx.fillText("VT100", 188, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(plateW, plateH),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  // Sits low-right on the front face, below the screen bezel.
  plate.position.set(
    MON_W / 2 - plateW / 2 - 0.6,
    1.0 + 0.4,
    MON_D / 2 + 0.05,
  );
  terminal.add(plate);
}

// ---------- Keyboard tray ----------
// Keyboard widths (must agree with the MAIN_ROWS / NUMPAD layout below).
//   Main block max row: 15.5 keys (1.5 modifier + 13 alphanumeric + 1.0 trailing,
//     or 1.3 + 13 + 1.2, or 1.5 + 12 + 2.0, etc — all 15.5 key-units).
//   Numpad max row:     4 keys.
const KEY_BASE = 0.46;
const KEY_H = 0.18;
const KEY_GAP = 0.08;
const ROW_GAP = 0.14;            // visual breathing room between rows (z axis)
const KB_BLOCK_GAP = 0.6;         // gap between main block and numpad

const mainBlockWidth = 15.5 * KEY_BASE + 14 * KEY_GAP;   // 8.25
const numpadBlockWidth = 4 * KEY_BASE + 3 * KEY_GAP;     // 2.08
const totalKbWidth = mainBlockWidth + KB_BLOCK_GAP + numpadBlockWidth; // 10.93

// Tray widens to fit the keyboard + ~1 unit margin on each side.
const TRAY_W = totalKbWidth + 2.6;
const TRAY_D = 4.6;
const TRAY_H = 0.55;
{
  const tray = roundedBox(TRAY_W, TRAY_H, TRAY_D, 0.28, caseMat);
  tray.position.set(0, TRAY_H / 2 + 0.45, MON_D / 2 + TRAY_D / 2 - 0.6);
  tray.castShadow = true;
  tray.receiveShadow = true;
  terminal.add(tray);

  // Keyboard well — dark recessed plane on top of tray.
  const well = new THREE.Mesh(
    new THREE.BoxGeometry(TRAY_W - 0.5, 0.06, TRAY_D - 0.55),
    trayMat,
  );
  well.position.set(
    0,
    TRAY_H + 0.45 + 0.01,
    MON_D / 2 + TRAY_D / 2 - 0.6,
  );
  well.receiveShadow = true;
  terminal.add(well);

  // Front lip / wrist rest (slightly raised lip at the front edge).
  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(TRAY_W - 0.5, 0.18, 0.5),
    caseMatDark,
  );
  lip.position.set(
    0,
    TRAY_H + 0.45 + 0.04,
    MON_D / 2 + TRAY_D - 0.6 - 0.25 + 0.05,
  );
  lip.castShadow = true;
  terminal.add(lip);
}

// Keycaps — labeled VT100-ish layout, each keycap clickable and animated.
type KeyDef = {
  label: string;          // visible glyph
  send?: string;          // character to write to the PTY (single char)
  key?: string;           // KeyboardEvent.key for special keys
  code?: string;          // KeyboardEvent.code
  width?: number;         // multiplier of base key width (default 1)
  ghost?: boolean;        // render but don't react to clicks (e.g. label-only)
};
type KeyInst = {
  def: KeyDef;
  mesh: THREE.Mesh;
  restY: number;
  machineIdx: number; // index into `machines[]` — set to 0 for source, n for clones
};
const keycaps: KeyInst[] = [];

// (KEY_BASE / KEY_H / KEY_GAP / ROW_GAP defined above with the tray sizing.)

// Each keycap is a solid block + a separate label plane glued to its top,
// so labels stay the same physical size regardless of key width.
const keyTopMat = new THREE.MeshStandardMaterial({
  color: 0x232121,
  roughness: 0.5,
  metalness: 0.1,
});
const keySideMat = new THREE.MeshStandardMaterial({
  color: 0x141312,
  roughness: 0.55,
  metalness: 0.1,
});

function makeLabelTexture(label: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, c.width, c.height);
  const len = label.length;
  const fontSize = len === 1 ? 140 : len <= 3 ? 86 : len <= 5 ? 64 : 50;
  ctx.fillStyle = "#d8d2c0";
  ctx.font = `${fontSize}px ui-monospace, "SF Mono", Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, c.width / 2, c.height / 2 + 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

const labelMatCache = new Map<string, THREE.Material>();
function getLabelMat(label: string): THREE.Material {
  let m = labelMatCache.get(label);
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      map: makeLabelTexture(label),
      transparent: true,
      depthWrite: false,
    });
    labelMatCache.set(label, m);
  }
  return m;
}

function makeKeyMesh(def: KeyDef): THREE.Mesh {
  const w = KEY_BASE * (def.width ?? 1);
  const d = KEY_BASE;
  const geo = new THREE.BoxGeometry(w, KEY_H, d);
  const mats: THREE.Material[] = [
    keySideMat, keySideMat, keyTopMat, keySideMat, keySideMat, keySideMat,
  ];
  const mesh = new THREE.Mesh(geo, mats);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  if (def.label) {
    // Label plane: fixed size (KEY_BASE wide), centered on top of the keycap.
    const labelPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(KEY_BASE * 0.85, KEY_BASE * 0.85),
      getLabelMat(def.label),
    );
    labelPlane.rotation.x = -Math.PI / 2;
    labelPlane.position.y = KEY_H / 2 + 0.002; // just above the top face
    labelPlane.renderOrder = 1;
    mesh.add(labelPlane);
  }
  return mesh;
}

// Layout helper — emit a row left-to-right starting at xCursor (mutated).
const trayY = TRAY_H + 0.45 + 0.04 + KEY_H / 2 + 0.02;
const trayZCenter = MON_D / 2 + TRAY_D / 2 - 0.6;

function emitRow(defs: KeyDef[], rowZ: number, xStart: number) {
  let x = xStart;
  for (const def of defs) {
    const w = KEY_BASE * (def.width ?? 1);
    const mesh = makeKeyMesh(def);
    mesh.position.set(x + w / 2, trayY, trayZCenter + rowZ);
    terminal.add(mesh);
    if (!def.ghost) {
      keycaps.push({ def, mesh, restY: mesh.position.y, machineIdx: 0 });
      mesh.userData.keyDef = def;
    }
    x += w + KEY_GAP;
  }
  return x;
}

// VT100-ish main block (simplified). 5 rows, back to front.
// Width values multiply KEY_BASE.
const MAIN_ROWS: KeyDef[][] = [
  // Row 0 — number row
  [
    { label: "ESC", key: "Escape", code: "Escape" },
    { label: "1", send: "1" }, { label: "2", send: "2" }, { label: "3", send: "3" },
    { label: "4", send: "4" }, { label: "5", send: "5" }, { label: "6", send: "6" },
    { label: "7", send: "7" }, { label: "8", send: "8" }, { label: "9", send: "9" },
    { label: "0", send: "0" }, { label: "-", send: "-" }, { label: "=", send: "=" },
    { label: "⌫", key: "Backspace", code: "Backspace", width: 1.5 },
  ],
  // Row 1 — QWERTY
  [
    { label: "TAB", key: "Tab", code: "Tab", width: 1.3 },
    { label: "Q", send: "q" }, { label: "W", send: "w" }, { label: "E", send: "e" },
    { label: "R", send: "r" }, { label: "T", send: "t" }, { label: "Y", send: "y" },
    { label: "U", send: "u" }, { label: "I", send: "i" }, { label: "O", send: "o" },
    { label: "P", send: "p" }, { label: "[", send: "[" }, { label: "]", send: "]" },
    { label: "\\", send: "\\", width: 1.2 },
  ],
  // Row 2 — ASDF + RETURN
  [
    { label: "CTRL", key: "Control", code: "ControlLeft", width: 1.5 },
    { label: "A", send: "a" }, { label: "S", send: "s" }, { label: "D", send: "d" },
    { label: "F", send: "f" }, { label: "G", send: "g" }, { label: "H", send: "h" },
    { label: "J", send: "j" }, { label: "K", send: "k" }, { label: "L", send: "l" },
    { label: ";", send: ";" }, { label: "'", send: "'" },
    { label: "RETURN", key: "Enter", code: "Enter", width: 2.0 },
  ],
  // Row 3 — ZXCV
  [
    { label: "SHIFT", key: "Shift", code: "ShiftLeft", width: 2.0 },
    { label: "Z", send: "z" }, { label: "X", send: "x" }, { label: "C", send: "c" },
    { label: "V", send: "v" }, { label: "B", send: "b" }, { label: "N", send: "n" },
    { label: "M", send: "m" }, { label: ",", send: "," }, { label: ".", send: "." },
    { label: "/", send: "/" },
    { label: "SHIFT", key: "Shift", code: "ShiftRight", width: 2.5 },
  ],
  // Row 4 — space bar row
  [
    { label: "CAPS", key: "CapsLock", code: "CapsLock", width: 1.6 },
    { label: "ALT", key: "Alt", code: "AltLeft", width: 1.3 },
    { label: "", send: " ", width: 7.0, key: " ", code: "Space" },
    { label: "ALT", key: "Alt", code: "AltRight", width: 1.3 },
    { label: "←", key: "ArrowLeft", code: "ArrowLeft" },
    { label: "↓", key: "ArrowDown", code: "ArrowDown" },
    { label: "↑", key: "ArrowUp", code: "ArrowUp" },
    { label: "→", key: "ArrowRight", code: "ArrowRight" },
  ],
];

// Center the whole keyboard (main block + numpad) at x=0 within the tray.
const MAIN_X_START = -totalKbWidth / 2;
const ROW_DZ = KEY_BASE + ROW_GAP;
const Z_TOP = -((MAIN_ROWS.length - 1) * ROW_DZ) / 2 - 0.1;

for (let r = 0; r < MAIN_ROWS.length; r++) {
  emitRow(MAIN_ROWS[r], Z_TOP + r * ROW_DZ, MAIN_X_START);
}

// Numpad on the right.
const NUMPAD: KeyDef[][] = [
  [
    { label: "PF1", key: "F1", code: "F1" },
    { label: "PF2", key: "F2", code: "F2" },
    { label: "PF3", key: "F3", code: "F3" },
    { label: "PF4", key: "F4", code: "F4" },
  ],
  [
    { label: "7", send: "7" }, { label: "8", send: "8" },
    { label: "9", send: "9" }, { label: "-", send: "-" },
  ],
  [
    { label: "4", send: "4" }, { label: "5", send: "5" },
    { label: "6", send: "6" }, { label: ",", send: "," },
  ],
  [
    { label: "1", send: "1" }, { label: "2", send: "2" },
    { label: "3", send: "3" }, { label: "ENT", key: "Enter", code: "NumpadEnter" },
  ],
  [
    { label: "0", send: "0", width: 2.0 },
    { label: ".", send: "." },
    { label: "", ghost: true },
  ],
];
const NP_X_START = MAIN_X_START + mainBlockWidth + KB_BLOCK_GAP;
for (let r = 0; r < NUMPAD.length; r++) {
  emitRow(NUMPAD[r], Z_TOP + r * ROW_DZ, NP_X_START);
}

// Status LED strip above the back row.
{
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xff3322,
    emissive: 0xff2211,
    emissiveIntensity: 1.4,
    roughness: 0.4,
  });
  const ledGeo = new THREE.SphereGeometry(0.045, 16, 12);
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(ledGeo, ledMat);
    l.position.set(
      MAIN_X_START + 1.5 + i * 0.55,
      trayY + 0.02,
      trayZCenter + Z_TOP - 0.5,
    );
    terminal.add(l);
  }
}

// ---------- CSS3D Screen (iframe with the live portfolio) ----------
const PIXELS_PER_UNIT = 90;
const iframePxW = Math.round(SCREEN_W * PIXELS_PER_UNIT);
const iframePxH = Math.round(SCREEN_H * PIXELS_PER_UNIT);

type ScreenHandle = {
  wrapper: HTMLDivElement;
  iframe: HTMLIFrameElement;
  css3d: CSS3DObject;
};

function buildScreen(src: string, title: string, onLoad?: () => void): ScreenHandle {
  const wrapper = document.createElement("div");
  wrapper.style.width = `${iframePxW}px`;
  wrapper.style.height = `${iframePxH}px`;
  wrapper.style.background = "#000";
  wrapper.style.overflow = "hidden";
  wrapper.style.position = "relative";
  wrapper.style.borderRadius = "16px";
  wrapper.style.boxShadow =
    "inset 0 0 80px rgba(0,0,0,0.9), inset 0 0 240px rgba(140,255,180,0.05)";

  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.title = title;
  if (onLoad) iframe.addEventListener("load", onLoad);
  wrapper.appendChild(iframe);

  const scan = document.createElement("div");
  scan.style.position = "absolute";
  scan.style.inset = "0";
  scan.style.pointerEvents = "none";
  scan.style.background =
    "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0) 4px)";
  scan.style.mixBlendMode = "multiply";
  wrapper.appendChild(scan);

  const vignette = document.createElement("div");
  vignette.style.position = "absolute";
  vignette.style.inset = "0";
  vignette.style.pointerEvents = "none";
  vignette.style.background =
    "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)";
  wrapper.appendChild(vignette);

  const css3d = new CSS3DObject(wrapper);
  const s = 1 / PIXELS_PER_UNIT;
  css3d.scale.set(s, s, s);
  css3d.position.set(0, SCREEN_Y, SCREEN_Z);

  wrapper.addEventListener("mousedown", () => {
    try { iframe.contentWindow?.focus(); } catch {}
  });

  return { wrapper, iframe, css3d };
}

// ---------- Machine registry ----------
// Each "machine" is one VT100 unit: a terminal Object3D group, its own iframe
// (and therefore PTY), and references to its logo + keycaps. Every fork
// produces a fully-independent peer that can itself be forked or exploded.
type Machine = {
  group: THREE.Group;
  iframe: HTMLIFrameElement;
  logoMesh: THREE.Mesh | null;
};
const machines: Machine[] = [];
// Center-to-center distance between adjacent forked machines. Must exceed
// TRAY_W (≈13.53) plus a comfortable gap so neighbouring keyboards don't
// look glued together.
const SLIDE_SPACING = 15.5;

type ChildBridge = {
  __sendInput?: (d: string) => void;
  __getBuffer?: () => string;
  __hydrate?: (text: string) => void;
};

function findCSS3DObject(root: THREE.Object3D): CSS3DObject | null {
  let found: CSS3DObject | null = null;
  root.traverse((o) => {
    if (found) return;
    if ((o as { isCSS3DObject?: boolean }).isCSS3DObject || o.constructor.name === "CSS3DObject") {
      found = o as CSS3DObject;
    }
  });
  return found;
}

function findLogoMesh(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((o) => {
    if (!found && (o as THREE.Mesh).isMesh && o.userData?.isBoxdLogo) {
      found = o as THREE.Mesh;
    }
  });
  return found;
}

// Source machine — terminal group already in the scene, logo created
// asynchronously by the SVG fetch above.
const sourceScreen = buildScreen("/term", "michielvoortman portfolio terminal", () => {
  try { sourceScreen.iframe.contentWindow?.focus(); } catch {}
});

// Hide the "BOOTING VT100…" overlay only once the PTY has actually rendered
// its boot banner. main.ts posts a 'pty-ready' message after the first WS
// data lands. Fallback at 5s in case the WebSocket can't reach the server.
function dismissLoadingOverlay() {
  if (!loading || loading.dataset.hidden === "1") return;
  loading.dataset.hidden = "1";
  loading.classList.add("hidden");
  setTimeout(() => loading.remove(), 600);
}
window.addEventListener("message", (ev) => {
  if (ev.data?.type === "pty-ready" && ev.source === sourceScreen.iframe.contentWindow) {
    dismissLoadingOverlay();
  }
});
setTimeout(dismissLoadingOverlay, 5000);
const ptyIframe = sourceScreen.iframe;
const screenWrapper = sourceScreen.wrapper;
terminal.add(sourceScreen.css3d);

const sourceMachine: Machine = {
  group: terminal,
  iframe: sourceScreen.iframe,
  logoMesh: null, // populated when SVG load completes
};
machines.push(sourceMachine);

// When the async logo loader resolves, attach the mesh to the source machine.
// Poll briefly because the logo IIFE runs concurrently.
(function bindLogoToSource() {
  const id = setInterval(() => {
    if (logoMesh) {
      sourceMachine.logoMesh = logoMesh;
      clearInterval(id);
    }
  }, 50);
  setTimeout(() => clearInterval(id), 5000);
})();

// ---------- Fork: any machine can spawn a forked peer to its right ----------
function machineForIframe(win: WindowProxy | null): Machine | null {
  if (!win) return null;
  return machines.find((m) => m.iframe.contentWindow === win) ?? null;
}

window.addEventListener("message", (ev) => {
  if (!ev.data || ev.data.type !== "boxd-fork") return;
  if (explosionStarted) return;
  const src = machineForIframe(ev.source as WindowProxy | null);
  if (!src) return;
  doFork(src);
});

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function doFork(src: Machine) {
  // Snapshot source PTY (raw bytes, including IIP images).
  const win = src.iframe.contentWindow as unknown as ChildBridge | null;
  const snapshot = win?.__getBuffer?.() ?? "";

  // Deep-clone the source's group. CSS3DObject's .element is shared after
  // clone, so we strip the stale screen and inject a fresh iframe.
  const cloneRoot = src.group.clone(true);
  const staleScreen = findCSS3DObject(cloneRoot);
  if (staleScreen && staleScreen.parent) staleScreen.parent.remove(staleScreen);

  const cloneScreen = buildScreen("/term?nobanner=1", "forked terminal", () => {
    const tryHydrate = (attempts = 0) => {
      const cw = cloneScreen.iframe.contentWindow as unknown as ChildBridge | null;
      if (cw?.__hydrate) cw.__hydrate(snapshot);
      else if (attempts < 40) setTimeout(() => tryHydrate(attempts + 1), 50);
    };
    tryHydrate();
  });
  cloneRoot.add(cloneScreen.css3d);
  scene.add(cloneRoot);

  // Register the clone as a first-class machine with its own logo ref.
  const clone: Machine = {
    group: cloneRoot,
    iframe: cloneScreen.iframe,
    logoMesh: findLogoMesh(cloneRoot),
  };
  machines.push(clone);
  const cloneIdxInRegistry = machines.length - 1;

  // Register every cloned keycap so its 3D keyboard sends input to the
  // clone's PTY, with a press animation that matches the source's.
  cloneRoot.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o.userData?.keyDef) {
      const mesh = o as THREE.Mesh;
      keycaps.push({
        def: o.userData.keyDef as KeyDef,
        mesh,
        restY: mesh.position.y,
        machineIdx: cloneIdxInRegistry,
      });
      keycapMeshes.push(mesh);
    }
  });

  // Layout: position the clone immediately to the right of the source, then
  // re-center the whole row at x=0 with smooth slide-from-current animation.
  const srcX = src.group.position.x;
  const startPositions = machines.map((m) => m.group.position.x);
  // Clone visually emerges from the source's spot.
  cloneRoot.position.x = srcX;
  startPositions[machines.length - 1] = srcX;

  // Target positions: spread evenly across SLIDE_SPACING, centered on 0,
  // preserving left-to-right order so the new machine appears to the right
  // of its parent. Insert the clone right after the source.
  const ordered = machines.slice();
  // Reorder: keep existing order but ensure clone sits immediately after src.
  // (machines already has clone at the end; pull it in next to src.)
  const srcIdx = ordered.indexOf(src);
  const cloneIdx = ordered.indexOf(clone);
  if (srcIdx !== -1 && cloneIdx !== -1 && cloneIdx !== srcIdx + 1) {
    ordered.splice(cloneIdx, 1);
    ordered.splice(srcIdx + 1, 0, clone);
  }

  const N = ordered.length;
  const totalWidth = (N - 1) * SLIDE_SPACING;
  const targetX = (i: number) => -totalWidth / 2 + i * SLIDE_SPACING;
  const targets: number[] = ordered.map((_, i) => targetX(i));
  const starts: number[] = ordered.map((m) => m.group.position.x);

  // Camera frames the new row. Distance scales with machine count.
  const baseDistance = 24;
  const distance = Math.max(baseDistance, totalWidth * 1.8 + 18);
  const camFrom = camera.position.clone();
  const camTo = new THREE.Vector3(0, 11 + N * 0.6, distance);
  const tgtFrom = controls.target.clone();
  const tgtTo = new THREE.Vector3(0, 4.5, 0);

  // Allow full 360° orbit now that the back of the case is modeled and the
  // CSS3D screens hide themselves when viewed from behind (see tickScreens
  // in the animation loop).
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.minPolarAngle = Math.PI * 0.10;
  controls.maxPolarAngle = Math.PI * 0.55;
  controls.minDistance = 20;
  controls.maxDistance = Math.max(70, distance + 30);

  const startT = performance.now();
  const DURATION = 900;
  function animateFork() {
    const t = Math.min(1, (performance.now() - startT) / DURATION);
    const k = easeInOut(t);
    for (let i = 0; i < ordered.length; i++) {
      ordered[i].group.position.x = starts[i] + (targets[i] - starts[i]) * k;
    }
    camera.position.lerpVectors(camFrom, camTo, k);
    controls.target.lerpVectors(tgtFrom, tgtTo, k);
    if (t < 1) requestAnimationFrame(animateFork);
  }
  animateFork();
}

// ---------- Keyboard plumbing ----------
// The iframe exposes __sendInput(data) which writes directly to the PTY
// WebSocket, bypassing xterm's keyboard parsing. Map each 3D keycap to
// the bytes a real terminal would send.
function bytesFor(def: KeyDef): string | null {
  if (def.send) return def.send;
  switch (def.key) {
    case "Enter": return "\r";
    case "Backspace": return "\x7f"; // DEL — standard for xterm
    case "Tab": return "\t";
    case "Escape": return "\x1b";
    case "ArrowUp": return "\x1b[A";
    case "ArrowDown": return "\x1b[B";
    case "ArrowRight": return "\x1b[C";
    case "ArrowLeft": return "\x1b[D";
    case "F1": return "\x1bOP";
    case "F2": return "\x1bOQ";
    case "F3": return "\x1bOR";
    case "F4": return "\x1bOS";
    // Modifier-only keys don't send bytes on their own.
    case "Shift":
    case "Control":
    case "Alt":
    case "Meta":
    case "CapsLock":
      return null;
  }
  return null;
}

function dispatchToTerminal(def: KeyDef, machineIdx: number) {
  const data = bytesFor(def);
  if (!data) return;
  const m = machines[machineIdx] ?? machines[0];
  const w = m.iframe.contentWindow as unknown as {
    __sendInput?: (d: string) => void;
  };
  if (typeof w?.__sendInput === "function") {
    w.__sendInput(data);
  }
}

// Press animation for a 3D keycap.
const pressAnim = new Map<THREE.Mesh, { until: number; restY: number }>();
function animatePress(mesh: THREE.Mesh, restY: number) {
  const PRESS_MS = 120;
  pressAnim.set(mesh, { until: performance.now() + PRESS_MS, restY });
  mesh.position.y = restY - 0.05;
}
function tickPress(now: number) {
  for (const [mesh, info] of pressAnim) {
    if (now >= info.until) {
      mesh.position.y = info.restY;
      pressAnim.delete(mesh);
    }
  }
}

// Map from KeyboardEvent.code → 3D keycap (for echo from real keyboard).
const codeToKeycap = new Map<string, KeyInst>();
const keyToKeycap = new Map<string, KeyInst>(); // by char (lowercased)
for (const k of keycaps) {
  if (k.def.code) codeToKeycap.set(k.def.code, k);
  if (k.def.send) keyToKeycap.set(k.def.send, k);
  if (k.def.key && !k.def.code) keyToKeycap.set(k.def.key, k);
}

// Raycaster — click a 3D keycap to type it.
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const keycapMeshes: THREE.Mesh[] = keycaps.map((k) => k.mesh);

function setNdc(ev: PointerEvent) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  ndc.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
}

function keycapAt(ev: PointerEvent): KeyInst | null {
  setNdc(ev);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(keycapMeshes, false);
  if (!hits.length) return null;
  const mesh = hits[0].object as THREE.Mesh;
  return keycaps.find((k) => k.mesh === mesh) ?? null;
}

// Click vs drag — only dispatch on a clean press+release within a small radius.
let pendingKey: { inst: KeyInst; x: number; y: number; t: number } | null = null;
const CLICK_RADIUS = 6; // px
const CLICK_TIME = 500; // ms

function logoMeshAt(ev: PointerEvent): THREE.Mesh | null {
  const candidates = machines.map((m) => m.logoMesh).filter(Boolean) as THREE.Mesh[];
  if (!candidates.length) return null;
  setNdc(ev);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(candidates, false);
  return hits.length ? (hits[0].object as THREE.Mesh) : null;
}

// IMPORTANT: this listener runs BEFORE OrbitControls (added later). Calling
// stopImmediatePropagation on a keycap (or logo) hit prevents OrbitControls
// from starting an orbit drag for that pointer interaction.
let pendingLogo: { x: number; y: number; t: number } | null = null;
renderer.domElement.addEventListener("pointerdown", (ev) => {
  // Logo on ANY machine triggers explosion.
  if (!explosionStarted && logoMeshAt(ev)) {
    ev.preventDefault();
    ev.stopImmediatePropagation();
    pendingLogo = { x: ev.clientX, y: ev.clientY, t: performance.now() };
    renderer.domElement.setPointerCapture?.(ev.pointerId);
    return;
  }
  const inst = keycapAt(ev);
  if (!inst) return;
  ev.preventDefault();
  ev.stopImmediatePropagation();
  pendingKey = { inst, x: ev.clientX, y: ev.clientY, t: performance.now() };
  renderer.domElement.setPointerCapture?.(ev.pointerId);
});

renderer.domElement.addEventListener("pointermove", (ev) => {
  if (pendingKey) {
    const dx = ev.clientX - pendingKey.x;
    const dy = ev.clientY - pendingKey.y;
    if (Math.hypot(dx, dy) > CLICK_RADIUS) pendingKey = null;
  }
  if (pendingLogo) {
    const dx = ev.clientX - pendingLogo.x;
    const dy = ev.clientY - pendingLogo.y;
    if (Math.hypot(dx, dy) > CLICK_RADIUS) pendingLogo = null;
  }
});

function releaseKey(ev: PointerEvent) {
  if (pendingLogo) {
    const dx = ev.clientX - pendingLogo.x;
    const dy = ev.clientY - pendingLogo.y;
    const dt = performance.now() - pendingLogo.t;
    pendingLogo = null;
    renderer.domElement.releasePointerCapture?.(ev.pointerId);
    if (Math.hypot(dx, dy) <= CLICK_RADIUS && dt <= CLICK_TIME) {
      startExplosion();
    }
    return;
  }
  if (!pendingKey) return;
  const dx = ev.clientX - pendingKey.x;
  const dy = ev.clientY - pendingKey.y;
  const dt = performance.now() - pendingKey.t;
  const { inst } = pendingKey;
  pendingKey = null;
  renderer.domElement.releasePointerCapture?.(ev.pointerId);
  if (Math.hypot(dx, dy) <= CLICK_RADIUS && dt <= CLICK_TIME) {
    animatePress(inst.mesh, inst.restY);
    dispatchToTerminal(inst.def, inst.machineIdx);
  }
}
renderer.domElement.addEventListener("pointerup", releaseKey);
renderer.domElement.addEventListener("pointercancel", releaseKey);

// Hover → pointer cursor over keycaps or any logo.
let hoverThrottle = 0;
renderer.domElement.addEventListener("pointermove", (ev) => {
  const now = performance.now();
  if (now - hoverThrottle < 50) return;
  hoverThrottle = now;
  let pointer = !!keycapAt(ev);
  if (!pointer && !explosionStarted) pointer = !!logoMeshAt(ev);
  renderer.domElement.style.cursor = pointer ? "pointer" : "";
});

// ---------- Easter egg: explode the unit when the logo is clicked ----------
type Debris = {
  obj: THREE.Object3D;
  vx: number; vy: number; vz: number;
  avx: number; avy: number; avz: number;
};
let explosionStarted = false;
const debris: Debris[] = [];

// Camera shake state (applied after OrbitControls.update() each frame).
let shakeStrength = 0;
const shakeOffset = new THREE.Vector3();

function approxSize(obj: THREE.Object3D): number {
  const g = (obj as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
  if (!g) return 1;
  if (!g.boundingBox) g.computeBoundingBox();
  const bb = g.boundingBox!;
  return Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
}

function triggerFlash() {
  const f = document.createElement("div");
  Object.assign(f.style, {
    position: "fixed",
    inset: "0",
    background: "#ffffff",
    pointerEvents: "none",
    zIndex: "150",
    opacity: "0.95",
    transition: "opacity 320ms ease-out",
  } as CSSStyleDeclaration);
  document.body.appendChild(f);
  requestAnimationFrame(() => (f.style.opacity = "0"));
  setTimeout(() => f.remove(), 420);
}

function startExplosion() {
  if (explosionStarted) return;
  explosionStarted = true;

  triggerFlash();
  shakeStrength = 1;
  controls.enabled = false;

  const worldPos = new THREE.Vector3();
  // Each machine scatters around its own center so the explosion looks like
  // multiple synchronized detonations rather than one giant outward push.
  for (const m of machines) {
    const mc = new THREE.Vector3();
    m.group.getWorldPosition(mc);
    mc.add(new THREE.Vector3(0, 4.5, 1.5));
    for (const child of m.group.children.slice()) {
      child.getWorldPosition(worldPos);
      const dir = worldPos.clone().sub(mc);
      if (dir.lengthSq() < 0.001) dir.set(0, 1, 0);
      dir.normalize();

      const size = approxSize(child);
      const big = size > 3;
      const baseSpeed = big ? 3.5 : 7.5;
      const speed = baseSpeed + Math.random() * 2.5;

      debris.push({
        obj: child,
        vx: dir.x * speed + (Math.random() - 0.5) * 2,
        vy: 5 + Math.random() * 3 + dir.y * speed * 0.35,
        vz: dir.z * speed + (Math.random() - 0.5) * 2,
        avx: (Math.random() - 0.5) * (big ? 3 : 10),
        avy: (Math.random() - 0.5) * (big ? 3 : 10),
        avz: (Math.random() - 0.5) * (big ? 3 : 10),
      });
    }
  }

  setTimeout(showEasterEgg, 1900);
}

function tickExplosion(dt: number) {
  if (!explosionStarted) return;
  const GRAVITY = 9.5;
  for (const p of debris) {
    p.vy -= GRAVITY * dt;
    p.obj.position.x += p.vx * dt;
    p.obj.position.y += p.vy * dt;
    p.obj.position.z += p.vz * dt;
    p.obj.rotation.x += p.avx * dt;
    p.obj.rotation.y += p.avy * dt;
    p.obj.rotation.z += p.avz * dt;
  }
  // Camera shake: short decay, applied as additive offset after controls.update.
  if (shakeStrength > 0) {
    shakeStrength = Math.max(0, shakeStrength - dt * 3.5); // ~285ms decay
    const k = shakeStrength * 0.6;
    shakeOffset.set(
      (Math.random() - 0.5) * k,
      (Math.random() - 0.5) * k,
      (Math.random() - 0.5) * k,
    );
  } else {
    shakeOffset.set(0, 0, 0);
  }
}

// Phosphor-green VT100 self-test screen + reward.
function showEasterEgg() {
  const overlay = document.createElement("div");
  overlay.id = "easter-egg";
  // Widest line of the boot screen is the 50-char ASCII box. At a monospace
  // glyph width of ~0.6em, fontSize × 30 ≈ content width. We pick font-size
  // so 30 × fontSize fits inside (viewport − padding × 2): clamp scales it
  // from ~10px on a 320-px phone up to 15px on desktop without ever
  // overflowing the viewport.
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background:
      "radial-gradient(ellipse at center, #022 0%, #000 75%)",
    color: "#7cffae",
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
    fontSize: "clamp(10px, 2.8vw, 15px)",
    lineHeight: "1.55",
    padding: "clamp(18px, 5vh, 60px) clamp(14px, 4vw, 70px)",
    zIndex: "200",
    overflow: "auto",
    opacity: "0",
    transition: "opacity 600ms ease",
    textShadow: "0 0 6px rgba(124,255,174,0.55), 0 0 18px rgba(60,255,150,0.18)",
    WebkitOverflowScrolling: "touch",
  } as CSSStyleDeclaration);

  // Scanline + vignette layers
  const scan = document.createElement("div");
  Object.assign(scan.style, {
    position: "absolute", inset: "0", pointerEvents: "none",
    background:
      "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,40,0,0.5) 3px, rgba(0,0,0,0) 4px)",
    mixBlendMode: "multiply",
  } as CSSStyleDeclaration);
  overlay.appendChild(scan);

  const vignette = document.createElement("div");
  Object.assign(vignette.style, {
    position: "absolute", inset: "0", pointerEvents: "none",
    background:
      "radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,0.85) 100%)",
  } as CSSStyleDeclaration);
  overlay.appendChild(vignette);

  const pre = document.createElement("pre");
  Object.assign(pre.style, {
    margin: "0",
    // pre-wrap so long lines (the calendar URL on a narrow phone) can wrap
    // at spaces — but ASCII boxes still align because every leading/inner
    // whitespace is preserved.
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    position: "relative",
    zIndex: "1",
  } as CSSStyleDeclaration);
  overlay.appendChild(pre);

  document.body.appendChild(overlay);
  requestAnimationFrame(() => (overlay.style.opacity = "1"));

  const lines: string[] = [
    "DEC VT100/VT102  SELF-TEST  ROM v3.2",
    "(C) 1978-1983 DIGITAL EQUIPMENT CORPORATION",
    "",
    "  RAM        ................. [ OK ]",
    "  CHARACTER GENERATOR ........ [ OK ]",
    "  CRT  PHOSPHOR .............. [ OK ]",
    "  KEYBOARD ................... [ OK ]",
    "  PTY  LINK .................. [ OK ]",
    "",
    "  ╔════════════════════════════════════════════╗",
    "  ║          E A S T E R   E G G               ║",
    "  ║              U N L O C K E D               ║",
    "  ╚════════════════════════════════════════════╝",
    "",
    "  > welcome, operator.",
    "  > you have decoded the cube.",
    "",
    "  REWARD :",
    "    30 minutes with the human who built this.",
    "",
    `    » https://calendar.app.google/8ZY18xRH9qQQuuTo9`,
    "",
    "  press any key to reassemble the unit█",
  ];

  let lineIdx = 0;
  function typeNextLine() {
    if (lineIdx >= lines.length) {
      // Link is part of the rendered text — replace it with a clickable anchor.
      pre.innerHTML = pre.textContent!.replace(
        /https:\/\/calendar\.app\.google\/[A-Za-z0-9]+/,
        (m) =>
          `<a href="${m}" target="_blank" rel="noopener" style="color:#a4ffd0;text-decoration:underline;text-shadow:inherit">${m}</a>`,
      );
      // Blinking cursor
      const cursor = pre.querySelector(":scope") as HTMLElement | null;
      if (cursor) cursor.style.animation = "blink 1s steps(2) infinite";

      // Accept any key / click to reset.
      const reset = () => location.reload();
      window.addEventListener("keydown", reset, { once: true });
      overlay.addEventListener("click", reset, { once: true });
      return;
    }
    pre.textContent = (pre.textContent ?? "") + lines[lineIdx] + "\n";
    lineIdx++;
    // Variable cadence — section breaks pause longer.
    const delay = lines[lineIdx - 1] === "" ? 220 : 80;
    setTimeout(typeNextLine, delay);
  }
  setTimeout(typeNextLine, 400);
}

// Debug handle so test harnesses can find keycap positions.
(window as unknown as { __vt100: unknown }).__vt100 = {
  keycaps, camera, renderer, raycaster,
  get logoMesh() { return logoMesh; },
  get controls() { return controls; },
  startExplosion,
  // Return screen (clientX, clientY) for a keycap by its label.
  screenOf(label: string) {
    const k = keycaps.find((kc) => kc.def.label === label);
    if (!k) return null;
    const v = new THREE.Vector3();
    k.mesh.updateMatrixWorld();
    v.setFromMatrixPosition(k.mesh.matrixWorld);
    v.project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return {
      x: r.left + ((v.x + 1) / 2) * r.width,
      y: r.top + ((1 - v.y) / 2) * r.height,
    };
  },
};

// Real keyboard typing → animate matching 3D keycap (input still goes to PTY).
window.addEventListener("keydown", (ev) => {
  let inst = codeToKeycap.get(ev.code);
  if (!inst) inst = keyToKeycap.get(ev.key.toLowerCase());
  if (!inst) inst = keyToKeycap.get(ev.key);
  if (inst && !pressAnim.has(inst.mesh)) {
    animatePress(inst.mesh, inst.restY);
  }
  // Forward focus to iframe if it drifted.
  if (document.activeElement !== ptyIframe) {
    try { ptyIframe.contentWindow?.focus(); } catch {}
  }
});

// ---------- Controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 4.5, 1.5);
controls.minDistance = 16;
// Allow zooming out a fair bit further than the initial framing so users
// can still pull back if the device pixel ratio leaves them feeling close.
controls.maxDistance = Math.max(60, distanceToFit() * 1.8);
controls.minPolarAngle = Math.PI * 0.10;
controls.maxPolarAngle = Math.PI * 0.55;
// Full 360° orbit — back of case is modeled (vents + nameplate) and CSS3D
// screens hide themselves when the camera is behind them (tickScreens).
controls.minAzimuthAngle = -Infinity;
controls.maxAzimuthAngle = Infinity;
controls.enablePan = false;

// ---------- Resize ----------
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  cssRenderer.setSize(w, h);
  // Re-frame the camera on resize (handles orientation change on mobile).
  // Only adjust if no forks happened yet — once the user has multiple
  // machines, the fork animation manages framing.
  if (machines.length <= 1) {
    frameUnit();
    controls.maxDistance = Math.max(60, distanceToFit() * 1.8);
  }
}
window.addEventListener("resize", onResize);

// ---------- Animate ----------
const explosionClock = new THREE.Clock();
const _screenPos = new THREE.Vector3();
const _screenQuat = new THREE.Quaternion();
const _screenFwd = new THREE.Vector3();
const _toCamera = new THREE.Vector3();

// Hide each CSS3D iframe when the camera is behind it OR viewing it at a
// grazing angle. CSS3DObjects are rendered by a separate DOM-based renderer
// that ignores WebGL depth, so without this they'd punch through the case
// from the back, and at near-edge-on angles they'd appear as a thin slit
// poking out of the side of the case (especially for neighboring machines).
// cos(72°) ≈ 0.31 — screens fade out before they degenerate into a sliver.
const SCREEN_VISIBILITY_COS = 0.31;
function tickScreens() {
  for (const m of machines) {
    const screen = findCSS3DObject(m.group);
    if (!screen) continue;
    screen.getWorldPosition(_screenPos);
    screen.getWorldQuaternion(_screenQuat);
    _screenFwd.set(0, 0, 1).applyQuaternion(_screenQuat);
    _toCamera.subVectors(camera.position, _screenPos).normalize();
    screen.visible = _screenFwd.dot(_toCamera) > SCREEN_VISIBILITY_COS;
  }
}

function tick() {
  const now = performance.now();
  const dt = Math.min(0.05, explosionClock.getDelta());
  tickPress(now);
  tickExplosion(dt);
  controls.update();
  if (shakeOffset.lengthSq() > 0) {
    camera.position.add(shakeOffset);
  }
  tickScreens();
  renderer.render(scene, camera);
  cssRenderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
