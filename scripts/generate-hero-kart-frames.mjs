// One-off asset generator for the homepage's scroll-scrub hero.
// Produces an original line-art "kart parts assembling" frame sequence —
// no photos, no external fetch, nothing derived from any existing
// video/image. Run with: node scripts/generate-hero-kart-frames.mjs
import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const OUT_DIR = path.join(process.cwd(), "public", "hero-kart");
const W = 1200;
const H = 675;
const FRAME_COUNT = 90;

const INK = "#0A0A0B";
const ACCENT = "#C8102E";
const PAPER = "#FAFAF8";
const MIST = "#E6E4DF";

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function easeOutBack(t) {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Each part flies in from an offset+rotation, staggered across the
// overall 0..1 scrub progress, landing at (0,0,0) relative to its own
// assembled anchor. Staggering order: chassis -> wheels -> seat ->
// steering -> nose -> engine pod -> rollbar, so it reads as "built".
const PARTS_TIMING = {
  chassis: [0.0, 0.32],
  wheelFront: [0.08, 0.4],
  wheelRear: [0.12, 0.44],
  seat: [0.3, 0.6],
  steering: [0.42, 0.68],
  nose: [0.5, 0.76],
  engine: [0.58, 0.84],
  rollbar: [0.66, 0.92],
  numberDot: [0.8, 1.0],
};

function partProgress(name, globalT) {
  const [start, end] = PARTS_TIMING[name];
  const raw = (globalT - start) / (end - start);
  return Math.max(0, Math.min(1, raw));
}

function transform(finalX, finalY, offsetX, offsetY, rotationDeg, t, ease = easeOutBack) {
  const e = ease(t);
  const x = lerp(finalX + offsetX, finalX, e);
  const y = lerp(finalY + offsetY, finalY, e);
  const rot = lerp(rotationDeg, 0, e);
  const opacity = Math.max(0, Math.min(1, t * 2.2));
  return { x, y, rot, opacity };
}

function wheel(cx, cy, r, t, offsetX, offsetY, rotationDeg) {
  const tr = transform(cx, cy, offsetX, offsetY, rotationDeg, t);
  return `
    <g transform="translate(${tr.x} ${tr.y}) rotate(${tr.rot})" opacity="${tr.opacity}">
      <circle cx="0" cy="0" r="${r}" fill="none" stroke="${INK}" stroke-width="10" />
      <circle cx="0" cy="0" r="${r * 0.34}" fill="${ACCENT}" />
      <line x1="${-r * 0.7}" y1="0" x2="${r * 0.7}" y2="0" stroke="${INK}" stroke-width="5" />
      <line x1="0" y1="${-r * 0.7}" x2="0" y2="${r * 0.7}" stroke="${INK}" stroke-width="5" />
    </g>`;
}

function buildFrameSvg(globalT) {
  const groundY = 520;

  const chassisT = partProgress("chassis", globalT);
  const chassisTr = transform(600, 430, 0, -140, -6, chassisT);

  const wheelFrontT = partProgress("wheelFront", globalT);
  const wheelRearT = partProgress("wheelRear", globalT);

  const seatT = partProgress("seat", globalT);
  const seatTr = transform(605, 358, 0, -180, 14, seatT);

  const steerT = partProgress("steering", globalT);
  const steerTr = transform(478, 332, -60, -160, -30, steerT);

  const noseT = partProgress("nose", globalT);
  const noseTr = transform(300, 468, -220, 40, -40, noseT);

  const engineT = partProgress("engine", globalT);
  const engineTr = transform(830, 420, 240, -60, 30, engineT);

  const rollbarT = partProgress("rollbar", globalT);
  const rollbarTr = transform(660, 300, 0, -220, 20, rollbarT);

  const numberT = partProgress("numberDot", globalT);

  return `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${PAPER}" />
  <line x1="80" y1="${groundY}" x2="${W - 80}" y2="${groundY}" stroke="${MIST}" stroke-width="3" stroke-dasharray="2 14" />

  <!-- rear wheel -->
  ${wheel(770, groundY - 20, 62, wheelRearT, 160, -90, 220)}
  <!-- front wheel -->
  ${wheel(432, groundY - 20, 62, wheelFrontT, -160, -90, -220)}

  <!-- engine / rear pod -->
  <g transform="translate(${engineTr.x} ${engineTr.y}) rotate(${engineTr.rot})" opacity="${engineTr.opacity}">
    <rect x="-46" y="-40" width="92" height="80" rx="10" fill="none" stroke="${INK}" stroke-width="8" />
    <line x1="-30" y1="-20" x2="30" y2="-20" stroke="${INK}" stroke-width="5" />
    <line x1="-30" y1="0" x2="30" y2="0" stroke="${INK}" stroke-width="5" />
    <line x1="-30" y1="20" x2="30" y2="20" stroke="${INK}" stroke-width="5" />
  </g>

  <!-- chassis frame -->
  <g transform="translate(${chassisTr.x} ${chassisTr.y}) rotate(${chassisTr.rot})" opacity="${chassisTr.opacity}">
    <path d="M -260 20 L -180 -30 L 180 -30 L 250 20 L 250 55 L -260 55 Z" fill="none" stroke="${INK}" stroke-width="10" stroke-linejoin="round" />
    <line x1="-180" y1="-30" x2="-180" y2="55" stroke="${INK}" stroke-width="6" />
    <line x1="60" y1="-30" x2="60" y2="55" stroke="${INK}" stroke-width="6" />
  </g>

  <!-- nose cone -->
  <g transform="translate(${noseTr.x} ${noseTr.y}) rotate(${noseTr.rot})" opacity="${noseTr.opacity}">
    <path d="M 0 -32 L 70 -14 L 70 34 L 0 46 Z" fill="${ACCENT}" opacity="0.9" />
  </g>

  <!-- seat -->
  <g transform="translate(${seatTr.x} ${seatTr.y}) rotate(${seatTr.rot})" opacity="${seatTr.opacity}">
    <path d="M -50 40 L -50 -34 Q -50 -60 -20 -60 L 20 -60 Q 50 -60 50 -34 L 50 40 Z" fill="none" stroke="${INK}" stroke-width="8" stroke-linejoin="round" />
  </g>

  <!-- steering wheel -->
  <g transform="translate(${steerTr.x} ${steerTr.y}) rotate(${steerTr.rot})" opacity="${steerTr.opacity}">
    <circle cx="0" cy="0" r="34" fill="none" stroke="${INK}" stroke-width="7" />
    <line x1="0" y1="0" x2="0" y2="-34" stroke="${INK}" stroke-width="5" />
    <line x1="0" y1="0" x2="-29" y2="17" stroke="${INK}" stroke-width="5" />
    <line x1="0" y1="0" x2="29" y2="17" stroke="${INK}" stroke-width="5" />
  </g>

  <!-- rollbar -->
  <g transform="translate(${rollbarTr.x} ${rollbarTr.y}) rotate(${rollbarTr.rot})" opacity="${rollbarTr.opacity}">
    <path d="M -70 60 Q -70 -50 0 -50 Q 70 -50 70 60" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round" />
  </g>

  <!-- number plate dot, appears last -->
  <g opacity="${Math.max(0, Math.min(1, (numberT - 0.3) * 3))}">
    <circle cx="595" cy="470" r="26" fill="${INK}" />
    <text x="595" y="480" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="${PAPER}" text-anchor="middle">7</text>
  </g>
</svg>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (let i = 0; i < FRAME_COUNT; i++) {
    const t = FRAME_COUNT === 1 ? 1 : i / (FRAME_COUNT - 1);
    const svg = buildFrameSvg(t);
    const buf = await sharp(Buffer.from(svg)).webp({ quality: 72 }).toBuffer();
    const name = `frame-${String(i + 1).padStart(4, "0")}.webp`;
    await writeFile(path.join(OUT_DIR, name), buf);
  }
  console.log(`Wrote ${FRAME_COUNT} frames to ${OUT_DIR}`);
}

main();
