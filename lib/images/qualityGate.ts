import sharp from "sharp";

export const MIN_LONG_EDGE_PX = 1200;

export interface QualityReport {
  passesFloor: boolean;
  longEdgePx: number;
  isLowContrast: boolean;
  isLikelyBlurry: boolean;
  /** Plain-language guidance, never a raw validation error (section 1). */
  message: string | null;
}

/**
 * Section 1: "Reject images under 1200px on the long edge with a helpful
 * message, not a validation error. Detect and warn on very low contrast or
 * heavy blur." Blur is approximated via variance of a Laplacian-edge pass —
 * a genuinely sharp photo has high-variance edges; a blurred one doesn't.
 * This is a heuristic, not a certified blur detector — good enough to
 * steer a form nudge, not to hard-block an upload.
 */
export async function checkImageQuality(buffer: Buffer): Promise<QualityReport> {
  const image = sharp(buffer, { failOn: "none" });
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const longEdgePx = Math.max(width, height);

  const passesFloor = longEdgePx >= MIN_LONG_EDGE_PX;

  // Contrast: stdev of the greyscale luminance channel.
  const greyscale = image.clone().greyscale();
  const stats = await greyscale.stats();
  const contrastStdev = stats.channels[0]?.stdev ?? 0;
  const isLowContrast = contrastStdev < 20;

  // Blur: variance of a Laplacian edge-detected version — low variance
  // means few sharp edges, which reads as blur.
  const laplacianKernel = { width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] };
  const edgeStats = await greyscale.clone().convolve(laplacianKernel).stats();
  const edgeVariance = Math.pow(edgeStats.channels[0]?.stdev ?? 0, 2);
  const isLikelyBlurry = edgeVariance < 15;

  let message: string | null = null;
  if (!passesFloor) {
    message = `This photo is ${width}×${height}px — for it to look sharp on a profile, use one at least ${MIN_LONG_EDGE_PX}px on the long edge. Most phone cameras shoot well above this by default.`;
  } else if (isLowContrast) {
    message = "This photo looks a little flat or hazy — a shot with clearer light and shadow will hold up better full-size.";
  } else if (isLikelyBlurry) {
    message = "This photo looks slightly soft — if you have a sharper shot, it'll read better at full size.";
  }

  return { passesFloor, longEdgePx, isLowContrast, isLikelyBlurry, message };
}
