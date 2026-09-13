// Composites the user-supplied kart part photos (assets/kart-source/) into
// the same scroll-scrub frame sequence the line-art version used — real
// photo tiles, each in its own white card, flying in around a fixed
// central "fully assembled" reference shot. Independently-generated
// photos don't share a consistent camera angle/scale, so this composes
// them the way the user's own reference image did (a spec-sheet-style
// exploded diagram) rather than trying to merge them into one seamless
// silhouette, which would look mismatched.
import sharp from "sharp";
import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";

const SRC_DIR = path.join(process.cwd(), "assets", "kart-source");
const OUT_DIR = path.join(process.cwd(), "public", "hero-kart");
const W = 1600;
const H = 900;
const FRAME_COUNT = 90;

const TILE_W = 260;
const TILE_H = 190;
const CARD_PAD = 14;

function easeOutBack(t) {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// name -> [startProgress, endProgress] within the overall 0..1 scrub.
// Weighted toward the surfaces a sponsor's livery actually goes on (nose,
// side pods, bumpers, seat back, number panels, helmet) per the reference
// photo set, with a few mechanical parts kept for context.
const SATELLITES = [
  { name: "nose-cone", row: "top", col: 0, timing: [0.0, 0.32] },
  { name: "side-pod-left", row: "top", col: 1, timing: [0.05, 0.37] },
  { name: "number-panels", row: "top", col: 2, timing: [0.1, 0.42] },
  { name: "helmet", row: "top", col: 3, timing: [0.15, 0.47] },
  { name: "seat", row: "top", col: 4, timing: [0.2, 0.52] },
  { name: "wheel-a", row: "bottom", col: 0, timing: [0.25, 0.57] },
  { name: "front-bumper", row: "bottom", col: 1, timing: [0.3, 0.62] },
  { name: "rear-bumper", row: "bottom", col: 2, timing: [0.35, 0.67] },
  { name: "side-pod-right", row: "bottom", col: 3, timing: [0.4, 0.72] },
  { name: "engine", row: "bottom", col: 4, timing: [0.45, 0.77] },
];

const OUTER_MARGIN = 40;
const COLS = 5;
const COL_SPACING = (W - OUTER_MARGIN * 2) / COLS;

function finalSlot(row, col) {
  const cx = OUTER_MARGIN + COL_SPACING * col + COL_SPACING / 2;
  const y = row === "top" ? OUTER_MARGIN : H - OUTER_MARGIN - TILE_H;
  return { left: Math.round(cx - TILE_W / 2), top: Math.round(y) };
}

function startOffset(row) {
  // top-row tiles start further up/scattered outward; bottom-row start further down.
  return row === "top" ? -260 : 260;
}

/** Trim transparent padding, then contain-fit inside a white rounded
 * card so every tile is a uniform size regardless of source aspect. */
async function buildCardTile(srcPath) {
  const trimmed = await sharp(srcPath).trim({ threshold: 10 }).toBuffer();
  const innerW = TILE_W - CARD_PAD * 2;
  const innerH = TILE_H - CARD_PAD * 2;
  const fitted = await sharp(trimmed)
    .resize(innerW, innerH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const radius = 16;
  const cardSvg = `<svg width="${TILE_W}" height="${TILE_H}"><rect x="1" y="1" width="${TILE_W - 2}" height="${TILE_H - 2}" rx="${radius}" fill="#FFFFFF" stroke="#E6E4DF" stroke-width="1.5"/></svg>`;

  return sharp(Buffer.from(cardSvg))
    .composite([{ input: fitted, left: CARD_PAD, top: CARD_PAD }])
    .png()
    .toBuffer();
}

async function buildCenterHero() {
  const trimmed = await sharp(path.join(SRC_DIR, "kart-assembled.png")).trim({ threshold: 10 }).toBuffer();
  const meta = await sharp(trimmed).metadata();
  const targetW = 760;
  const targetH = Math.round((meta.height / meta.width) * targetW);
  const resized = await sharp(trimmed).resize(targetW, targetH, { fit: "inside" }).toBuffer();
  return { buffer: resized, width: targetW, height: targetH };
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  console.log("Building tiles...");
  const tiles = {};
  for (const sat of SATELLITES) {
    tiles[sat.name] = await buildCardTile(path.join(SRC_DIR, `${sat.name}.png`));
  }
  const center = await buildCenterHero();
  const centerLeft = Math.round((W - center.width) / 2);
  const centerTop = Math.round((H - center.height) / 2);

  console.log("Compositing frames...");
  for (let i = 0; i < FRAME_COUNT; i++) {
    const globalT = FRAME_COUNT === 1 ? 1 : i / (FRAME_COUNT - 1);
    const layers = [{ input: center.buffer, left: centerLeft, top: centerTop }];

    for (const sat of SATELLITES) {
      const [start, end] = sat.timing;
      const raw = (globalT - start) / (end - start);
      const t = Math.max(0, Math.min(1, raw));
      if (t <= 0) continue;
      const e = easeOutBack(t);
      const final = finalSlot(sat.row, sat.col);
      const offset = startOffset(sat.row);
      const top = sat.row === "top" ? Math.round(lerp(final.top + offset, final.top, e)) : Math.round(lerp(final.top + offset, final.top, e));
      layers.push({ input: tiles[sat.name], left: final.left, top });
    }

    const frame = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 250, g: 250, b: 248, alpha: 1 } } })
      .composite(layers)
      .webp({ quality: 78 })
      .toBuffer();

    await writeFile(path.join(OUT_DIR, `frame-${String(i + 1).padStart(4, "0")}.webp`), frame);
  }

  console.log(`Wrote ${FRAME_COUNT} frames to ${OUT_DIR}`);
}

main();
