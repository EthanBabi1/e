import sharp from "sharp";
import { checkImageQuality, type QualityReport } from "./qualityGate";

export interface CropSpec {
  name: "hero" | "portrait" | "avatar";
  width: number;
  height: number;
}

export const CROPS: CropSpec[] = [
  { name: "hero", width: 1600, height: 900 }, // 16:9
  { name: "portrait", width: 1000, height: 1250 }, // 4:5
  { name: "avatar", width: 600, height: 600 }, // 1:1
];

export interface ProcessedImage {
  quality: QualityReport;
  /** "full-bleed" for a photo that passes the quality gate, "framed" for
   * one that's usable but weaker — section 1: "Quality determines
   * treatment." */
  treatment: "full-bleed" | "framed";
  crops: Record<CropSpec["name"], { webp: Buffer; avif: Buffer }>;
}

/**
 * Section 1's full pipeline: correct EXIF orientation, strip EXIF
 * (including GPS — mandatory, this platform has minors on it), grade
 * consistently, and produce every crop a layout needs, smart-cropped
 * toward the detected subject via sharp's built-in attention strategy
 * rather than a naive center-crop.
 */
export async function processUploadedImage(buffer: Buffer): Promise<ProcessedImage> {
  const quality = await checkImageQuality(buffer);

  // .rotate() with no args auto-orients from EXIF, then bakes the
  // orientation in. Not calling .withMetadata() anywhere in this pipeline
  // means sharp's default (strip all metadata, GPS included) applies to
  // every output — see tests/unit/image-pipeline.test.ts for a
  // GPS-survives-nowhere assertion.
  const base = sharp(buffer, { failOn: "none" }).rotate();

  // One consistent grade across all user photos (section 1): slight
  // desaturation, lifted blacks, a warm point. `.linear(a, b)` computes
  // output = input*a + b per channel — a slight positive b lifts blacks
  // without touching highlights much.
  const graded = base
    .modulate({ saturation: 0.93, brightness: 1.01 })
    .linear(0.96, 8)
    .tint({ r: 255, g: 248, b: 240 });

  const crops: Partial<ProcessedImage["crops"]> = {};
  for (const spec of CROPS) {
    const resized = graded.clone().resize(spec.width, spec.height, {
      fit: "cover",
      position: sharp.strategy.attention, // smart-crop toward the detected subject
    });
    const [webp, avif] = await Promise.all([
      resized.clone().webp({ quality: 82 }).toBuffer(),
      resized.clone().avif({ quality: 60 }).toBuffer(),
    ]);
    crops[spec.name] = { webp, avif };
  }

  return {
    quality,
    treatment: quality.passesFloor && !quality.isLowContrast && !quality.isLikelyBlurry ? "full-bleed" : "framed",
    crops: crops as ProcessedImage["crops"],
  };
}
