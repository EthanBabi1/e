import { describe, expect, it } from "vitest";
import { classImpliesMinor, inferIsMinor } from "@/lib/minors/inferAge";
import { canGenerateShareCard, ghostProfileView, type RawRacerRecord } from "@/lib/minors/redact";

function makeRacer(overrides: Partial<RawRacerRecord> = {}): RawRacerRecord {
  return {
    id: "r1",
    slug: "test-racer",
    firstName: "Jamie",
    lastName: "Fenwick",
    dob: "2015-01-01",
    isMinor: true,
    classDefault: "Cadet",
    numberDefault: "42",
    homeTrackId: "t1",
    town: "Millhaven",
    photoUrl: "https://example.com/photo.jpg",
    bio: "Racing since age 6.",
    story: "Chasing the championship.",
    claimStatus: "unclaimed",
    socialFollowingSelfReported: 500,
    ...overrides,
  };
}

describe("minor inference", () => {
  it("treats unknown age/class as minor by default", () => {
    expect(inferIsMinor({}).isMinor).toBe(true);
  });

  it("infers minor from junior/cadet class names when DOB is unknown", () => {
    expect(classImpliesMinor("Junior Sportsman")).toBe(true);
    expect(classImpliesMinor("Cadet 1")).toBe(true);
    expect(classImpliesMinor("Kid Kart")).toBe(true);
    expect(classImpliesMinor("Masters")).toBe(false);
  });

  it("uses DOB when available, overriding class inference", () => {
    const adultDob = new Date();
    adultDob.setFullYear(adultDob.getFullYear() - 25);
    expect(inferIsMinor({ dob: adultDob, className: "Senior Sportsman" }).isMinor).toBe(false);
  });
});

describe("unclaimed minor ghost profile — hard limit (section 3)", () => {
  const view = ghostProfileView(makeRacer({ isMinor: true, claimStatus: "unclaimed" }));

  it("never exposes the full last name", () => {
    expect(view.displayName).toBe("Jamie F.");
    expect(view.displayName).not.toContain("Fenwick");
  });

  it("never exposes photo, town, or age", () => {
    expect(view.photoUrl).toBeNull();
    expect(view.town).toBeNull();
    expect(view.age).toBeNull();
  });

  it("is flagged noindex", () => {
    expect(view.noindex).toBe(true);
  });

  it("never generates a share card", () => {
    expect(canGenerateShareCard({ isMinor: true, claimStatus: "unclaimed" })).toBe(false);
  });
});

describe("unclaimed ADULT ghost profile — ordinary, per section 3", () => {
  const view = ghostProfileView(makeRacer({ isMinor: false, claimStatus: "unclaimed", dob: "1995-01-01" }));

  it("shows full name, photo, and town", () => {
    expect(view.displayName).toBe("Jamie Fenwick");
    expect(view.photoUrl).not.toBeNull();
    expect(view.town).not.toBeNull();
  });

  it("allows a share card", () => {
    expect(canGenerateShareCard({ isMinor: false, claimStatus: "unclaimed" })).toBe(true);
  });
});
