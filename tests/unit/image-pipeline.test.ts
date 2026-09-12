import { describe, expect, it } from "vitest";
import sharp from "sharp";
import piexif from "piexifjs";
import { checkImageQuality, MIN_LONG_EDGE_PX } from "@/lib/images/qualityGate";
import { processUploadedImage } from "@/lib/images/process";
import { generateFallbackImage } from "@/lib/images/fallback";

async function makeTestJpeg(opts: { width: number; height: number; noisy?: boolean }): Promise<Buffer> {
  if (opts.noisy) {
    // A field of random-ish blocks reads as high-contrast, high-edge-energy
    // (i.e. "sharp"), unlike a flat color fill.
    const raw = Buffer.alloc(opts.width * opts.height * 3);
    for (let i = 0; i < raw.length; i++) raw[i] = (i * 97) % 256;
    return sharp(raw, { raw: { width: opts.width, height: opts.height, channels: 3 } }).jpeg().toBuffer();
  }
  return sharp({
    create: { width: opts.width, height: opts.height, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .jpeg()
    .toBuffer();
}

describe("image quality gate (section 1)", () => {
  it("rejects images under the floor with a helpful, non-validation-error message", async () => {
    const small = await makeTestJpeg({ width: 400, height: 300 });
    const report = await checkImageQuality(small);
    expect(report.passesFloor).toBe(false);
    expect(report.message).toContain(`${MIN_LONG_EDGE_PX}px`);
    expect(report.message).not.toMatch(/error/i);
  });

  it("passes a large image on size", async () => {
    const large = await makeTestJpeg({ width: 1600, height: 1200, noisy: true });
    const report = await checkImageQuality(large);
    expect(report.passesFloor).toBe(true);
    expect(report.longEdgePx).toBe(1600);
  });

  it("flags a flat, low-contrast image", async () => {
    const flat = await makeTestJpeg({ width: 1600, height: 1200 });
    const report = await checkImageQuality(flat);
    expect(report.isLowContrast).toBe(true);
  });
});

describe("image processing pipeline (section 1)", () => {
  it("produces all three required crops in both webp and avif", async () => {
    const source = await makeTestJpeg({ width: 1600, height: 1200, noisy: true });
    const result = await processUploadedImage(source);
    expect(Object.keys(result.crops).sort()).toEqual(["avatar", "hero", "portrait"]);
    for (const crop of Object.values(result.crops)) {
      expect(crop.webp.length).toBeGreaterThan(0);
      expect(crop.avif.length).toBeGreaterThan(0);
    }
  });

  it("assigns full-bleed treatment to a qualifying photo, framed to a weak one", async () => {
    const good = await processUploadedImage(await makeTestJpeg({ width: 1600, height: 1200, noisy: true }));
    expect(good.treatment).toBe("full-bleed");

    const weak = await processUploadedImage(await makeTestJpeg({ width: 400, height: 300 }));
    expect(weak.treatment).toBe("framed");
  });

  it("strips EXIF GPS data from every output crop — mandatory, this platform has minors on it", async () => {
    const base = await makeTestJpeg({ width: 1600, height: 1200, noisy: true });

    // Inject real GPS EXIF into the source using piexifjs, and confirm the
    // injection actually worked before testing that our pipeline removes it
    // — otherwise this test would pass vacuously.
    const binaryBase = base.toString("binary");
    const gpsExif = {
      "0th": {},
      Exif: {},
      GPS: {
        [piexif.GPSIFD.GPSLatitudeRef]: "N",
        [piexif.GPSIFD.GPSLatitude]: [[40, 1], [23, 1], [0, 1]],
        [piexif.GPSIFD.GPSLongitudeRef]: "W",
        [piexif.GPSIFD.GPSLongitude]: [[82, 1], [54, 1], [0, 1]],
      },
    };
    const exifBytes = piexif.dump(gpsExif);
    const withGps = piexif.insert(exifBytes, binaryBase);
    const sourceWithGps = Buffer.from(withGps, "binary");

    const loadedBack = piexif.load(sourceWithGps.toString("binary"));
    expect(Object.keys(loadedBack.GPS ?? {}).length).toBeGreaterThan(0); // sanity: injection worked

    const sourceMetadata = await sharp(sourceWithGps).metadata();
    expect(sourceMetadata.exif).toBeDefined(); // sanity: sharp sees the exif blob pre-processing

    const result = await processUploadedImage(sourceWithGps);
    for (const crop of Object.values(result.crops)) {
      const webpMeta = await sharp(crop.webp).metadata();
      const avifMeta = await sharp(crop.avif).metadata();
      expect(webpMeta.exif).toBeUndefined();
      expect(avifMeta.exif).toBeUndefined();
    }
  });
});

describe("deterministic fallback art (section 1: never a grey box)", () => {
  it("produces the identical image for the same racer id every time", async () => {
    const a = await generateFallbackImage({ seed: "racer-123", raceNumber: "42", className: "Junior", trackName: "Millhaven" });
    const b = await generateFallbackImage({ seed: "racer-123", raceNumber: "42", className: "Junior", trackName: "Millhaven" });
    expect(a.equals(b)).toBe(true);
  });

  it("produces a real, non-empty image even with no data at all", async () => {
    const img = await generateFallbackImage({ seed: "racer-empty", raceNumber: null, className: null, trackName: null });
    expect(img.length).toBeGreaterThan(0);
    const meta = await sharp(img).metadata();
    expect(meta.width).toBeGreaterThan(0);
  });
});
