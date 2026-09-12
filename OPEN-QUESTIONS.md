# OPEN-QUESTIONS.md

Decisions made autonomously that are worth revisiting, with the alternative rejected. Appended at each phase boundary.

## Phase 0

- **Rejected: stalling until real CONFIG values are supplied.** The brief explicitly says not to (a blocked question costs days) and gives a stub-and-document mechanism instead. If you'd rather have seen a hard stop here, say so and future runs will wait at exactly this kind of gap instead of substituting a labeled placeholder.
- **Rejected: scraping or guessing at the real EXISTING CODE Vercel URL's contents.** The brief's own "no scraping" rule and "never guess URLs" constraint both point the same direction here, so the profile/zone/bid system was rebuilt from the written spec instead of fetched. If the real site's source is available, supplying it directly would let later phases lift its actual photography and copy instead of the placeholders built here.

## Phase 3

- **Chosen: claimed minors stay `noindex`, same as unclaimed ones.** The brief only requires this for *unclaimed* minors — a claimed profile has guardian consent for public display. This build applied the stricter rule to claimed minors too, out of caution. Alternative rejected: index a claimed minor's profile normally once consent is recorded, which is what the brief's literal text permits. If you'd rather have the growth/SEO benefit for claimed minor profiles (with consent already on record), this is a one-line change in `lib/minors/redact.ts`'s `claimedProfileView`.
- **Chosen: zone/listing schema and marketplace display shipped in Phase 3, not held for Phase 5.** The brief's phase list puts "marketplace" under Phase 3's public surface and pricing/checkout under Phase 5, which reads as exactly this split, but it's a judgment call about where the line falls. Alternative rejected: defer all zone-related schema to Phase 5 and show marketplace as permanently empty until then — this would have made section 1's "sparse marketplace framed as curation" requirement untestable in Phase 3.
