import { describe, expect, it } from "vitest";
import { checkForContactInfo } from "@/lib/messaging/filter";

describe("contact-detail filtering — section 6, minor-involved threads", () => {
  it("blocks an email address", () => {
    const result = checkForContactInfo("Reach me at jane.doe@example.com anytime");
    expect(result.blocked).toBe(true);
    expect(result.reason).toBeTruthy();
  });

  it("blocks a phone number", () => {
    const result = checkForContactInfo("Call me at 555-123-4567");
    expect(result.blocked).toBe(true);
  });

  it("blocks a phone number written with spaces or parens", () => {
    const result = checkForContactInfo("my number is (555) 123 4567");
    expect(result.blocked).toBe(true);
  });

  it("blocks a social handle", () => {
    const result = checkForContactInfo("find me @jane_racer_23 on there");
    expect(result.blocked).toBe(true);
  });

  it("blocks a social platform mention that implies moving off-platform", () => {
    const result = checkForContactInfo("just message me on Instagram instead");
    expect(result.blocked).toBe(true);
  });

  it("explains why, never silently strips (a plain-language reason is always returned)", () => {
    const result = checkForContactInfo("email me at test@test.com");
    expect(result.reason).toMatch(/on-platform|contact/i);
  });

  it("allows an ordinary message with no contact info", () => {
    const result = checkForContactInfo("Hi! I'd love to sponsor the nose cone zone for the season. What's included?");
    expect(result.blocked).toBe(false);
    expect(result.reason).toBeNull();
  });

  it("allows a message that just mentions a number that isn't a phone number", () => {
    const result = checkForContactInfo("We finished 3rd out of 12 karts last weekend!");
    expect(result.blocked).toBe(false);
  });
});
