import Stripe from "stripe";
import { assertTestModeKey } from "@/lib/config";

/**
 * Single Stripe client construction point. `assertTestModeKey` refuses to
 * boot with anything that isn't an `sk_test_` key — this build never uses
 * live payment keys, anywhere, per the autonomy rules.
 */
let cached: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cached) return cached;
  const key = assertTestModeKey(process.env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY");
  cached = new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
  return cached;
}
