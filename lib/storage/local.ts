import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

/**
 * Stub storage adapter — writes to /public/uploads on local disk. This is
 * a documented stand-in for UploadThing/S3 (no credentials for either are
 * available in this environment — see REVIEW.md), swappable behind this
 * same function signature once real object storage is wired up. Does NOT
 * work on Vercel's ephemeral filesystem in production; local dev only.
 */
export async function saveLocalUpload(buffer: Buffer, extension: string): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const filename = `${nanoid()}.${extension}`;
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${filename}`;
}
