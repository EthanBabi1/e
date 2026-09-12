import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { racers } from "@/db/schema";
import { inferIsMinor } from "@/lib/minors";
import { logEvent, ANALYTICS_EVENTS } from "@/lib/analytics/events";

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "racer"
  );
}

/**
 * Creates an unclaimed ghost profile from a parsed name that didn't match
 * an existing racer (section 3). No guardian is created here even when the
 * racer is inferred to be a minor — see the correction note at the top of
 * COMPLIANCE.md: a ghost profile has no account holder yet, guardian
 * creation happens at claim time. The redaction rules in lib/minors/redact
 * apply regardless, from the moment this row exists.
 */
export async function createGhostRacer(params: {
  fullName: string;
  trackId: string;
  className?: string | null;
  kartNumber?: string | null;
}) {
  const { firstName, lastName } = splitName(params.fullName);
  const { isMinor, inferredFromClass } = inferIsMinor({ className: params.className });
  const slug = `${slugify(params.fullName)}-${nanoid(6)}`;

  const [racer] = await db
    .insert(racers)
    .values({
      slug,
      firstName,
      lastName: lastName || "—",
      isMinor,
      ageInferredFromClass: inferredFromClass,
      numberDefault: params.kartNumber ?? null,
      classDefault: params.className ?? null,
      homeTrackId: params.trackId,
      claimStatus: "unclaimed",
      isFictionalDemo: false,
    })
    .returning();

  await logEvent(ANALYTICS_EVENTS.GHOST_PROFILE_CREATED, { racerId: racer.id, trackId: params.trackId });

  return racer;
}
