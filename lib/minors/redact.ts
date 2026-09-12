import { ageFromDob } from "./inferAge";

/**
 * Shape is intentionally a subset of the `racers` row (plus the guardian's
 * contact info, when relevant) — every server-side query that will render a
 * profile should pass through one of the functions below before the payload
 * leaves the server. Never render a raw racer row from the database.
 */
export interface RawRacerRecord {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  isMinor: boolean;
  classDefault: string | null;
  numberDefault: string | null;
  homeTrackId: string | null;
  town: string | null;
  photoUrl: string | null;
  bio: string | null;
  story: string | null;
  claimStatus: "unclaimed" | "pending" | "claimed";
  socialFollowingSelfReported: number | null;
}

/** Age as a plain number — never the DOB itself, for anyone. */
export function ageDisplay(racer: Pick<RawRacerRecord, "dob">): number | null {
  return ageFromDob(racer.dob);
}

/**
 * The view for an UNCLAIMED racer profile. For a minor: first name + last
 * initial only, no photo, no town, no age, no socials, results/class only.
 * For an adult: ordinary — full name, photo, town are fine (same as any
 * results site already publishes).
 */
export function ghostProfileView(racer: RawRacerRecord) {
  if (racer.isMinor) {
    return {
      id: racer.id,
      slug: racer.slug,
      displayName: `${racer.firstName} ${racer.lastName.charAt(0)}.`,
      photoUrl: null,
      town: null,
      age: null,
      classDefault: racer.classDefault,
      numberDefault: racer.numberDefault,
      claimStatus: racer.claimStatus,
      isMinor: true,
      noindex: true,
    };
  }
  return {
    id: racer.id,
    slug: racer.slug,
    displayName: `${racer.firstName} ${racer.lastName}`,
    photoUrl: racer.photoUrl,
    town: racer.town,
    age: ageDisplay(racer),
    classDefault: racer.classDefault,
    numberDefault: racer.numberDefault,
    claimStatus: racer.claimStatus,
    isMinor: false,
    noindex: false,
  };
}

/**
 * The view for a CLAIMED profile (the racer or their guardian has consented
 * to display). Name/photo/town can show once claimed+consented — the
 * restriction that never lifts, at any claim status, is email/phone/address/
 * exact DOB/school.
 */
export function claimedProfileView(racer: RawRacerRecord) {
  return {
    id: racer.id,
    slug: racer.slug,
    displayName: `${racer.firstName} ${racer.lastName}`,
    photoUrl: racer.photoUrl,
    town: racer.isMinor ? null : racer.town, // town still withheld for minors even once claimed
    age: ageDisplay(racer),
    classDefault: racer.classDefault,
    numberDefault: racer.numberDefault,
    bio: racer.bio,
    story: racer.story,
    socialFollowingSelfReported: racer.isMinor ? null : racer.socialFollowingSelfReported,
    claimStatus: racer.claimStatus,
    isMinor: racer.isMinor,
    noindex: racer.isMinor, // still noindexed even claimed, out of caution for a minor
  };
}

export function racerPublicView(racer: RawRacerRecord) {
  return racer.claimStatus === "unclaimed" ? ghostProfileView(racer) : claimedProfileView(racer);
}

/** Share cards: never generated for an unclaimed minor (section 3). */
export function canGenerateShareCard(racer: Pick<RawRacerRecord, "isMinor" | "claimStatus">): boolean {
  return !(racer.isMinor && racer.claimStatus === "unclaimed");
}
