import sharp from "sharp";

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Section 1: "A designed fallback, never a grey box... It must look like a
 * decision, not a gap." Deterministic per racer (same id always produces
 * the same composition) so a profile doesn't visually flicker between
 * renders, built from data already on hand (race number, class, track)
 * rather than a stock image or a generic avatar.
 */
export async function generateFallbackImage(params: {
  seed: string; // racer id — deterministic
  raceNumber: string | null;
  className: string | null;
  trackName: string | null;
  width?: number;
  height?: number;
}): Promise<Buffer> {
  const width = params.width ?? 1200;
  const height = params.height ?? 1500;
  const seed = hashSeed(params.seed);
  const angle = seed % 360;
  const numberOpacity = 0.08 + ((seed % 10) / 100);

  const escapeXml = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="marble" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle} 0.5 0.5)">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="45%" stop-color="#F2F0EC" />
          <stop offset="100%" stop-color="#E6E4DF" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#marble)" />
      ${
        params.raceNumber
          ? `<text x="50%" y="58%" font-family="Georgia, serif" font-size="${Math.floor(width * 0.55)}"
              fill="#0A0A0B" fill-opacity="${numberOpacity}" text-anchor="middle" font-weight="700">${escapeXml(params.raceNumber)}</text>`
          : ""
      }
      <text x="8%" y="90%" font-family="Helvetica, Arial, sans-serif" font-size="${Math.floor(width * 0.032)}"
        letter-spacing="2" fill="#5A5A5E" font-weight="600">${escapeXml((params.className ?? "").toUpperCase())}</text>
      <text x="8%" y="94%" font-family="Helvetica, Arial, sans-serif" font-size="${Math.floor(width * 0.024)}"
        letter-spacing="2" fill="#B8B5AE">${escapeXml((params.trackName ?? "").toUpperCase())}</text>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
