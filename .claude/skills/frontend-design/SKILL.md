---
name: frontend-design
description: This repo's actual design system (palette, type, spacing, motion, component patterns) and the taste rules that keep new UI consistent with it. Load before writing or redesigning any page, component, or section in app/ or components/.
---

# Frontend design system — Podium Row

This is not a generic template. It's the actual, already-implemented system for this
project. `DESIGN.md` and `app/globals.css` are the source of truth for values; this file
is the checklist to apply them consistently and to avoid drifting into generic-AI-website
patterns (random Tailwind grays, arbitrary one-off spacing, a hero built from whatever
felt fastest).

## Before writing any UI

1. Read `DESIGN.md` and skim `app/globals.css` for the current token values — don't
   guess a hex code or font size.
2. Look at 2-3 existing pages in `app/(site)/` that resemble what you're building.
   Match their structure (section wrapper classes, spacing, heading hierarchy) rather
   than inventing a new pattern for the same kind of content.
3. Never add a new color, font, or spacing value outside the existing tokens without
   updating `DESIGN.md` in the same change — an inline hex code or arbitrary `px-[17px]`
   is a signal something is being improvised instead of designed.

## Tokens (see `app/globals.css` for exact values)

- **Color**: `--paper`, `--marble`, `--mist`, `--ink`, `--graphite`, `--silver`,
  `--accent`, `--accent-soft`. That's the whole palette — no ad hoc grays or blues.
  `--accent` is a scalpel: live/open indicators, a leading bid, a personal best, a
  primary CTA. Reserve it for one loud thing per view, not a wash across the page —
  unless a hero/stat section is explicitly designed as a bold color-blocked moment,
  in which case that's a deliberate exception, not the default treatment.
- **Type**: `font-display` (Fraunces, editorial serif, headlines only, `-0.03em`
  tracking) vs. default sans (Inter, everything else) vs. `font-mono-tabular` (lap
  times, currency, anything that must not reflow). Never introduce a third display
  font. `label-small` class = the small-caps metadata label pattern (11px, uppercase,
  `0.12em` tracking, `--silver`) — use it for eyebrows/section labels, not ad hoc
  `text-xs uppercase`.
- **Spacing rhythm**: sections are `max-w-3xl` or `max-w-5xl`, `mx-auto`, `px-6`,
  vertical rhythm in `py-12`/`py-16`/`py-20`/`py-24` steps — not arbitrary numbers.
  Cards: `rounded-xl` or `rounded-2xl`, `border border-mist`, `p-4`/`p-5`/`p-6`.
  Grids: `grid-cols-1 sm:grid-cols-2/3/4` with `gap-4`/`gap-5`/`gap-8`. Reuse these
  exact steps so new sections feel like the same product, not a bolted-on page.

## Motion (Framer Motion is already installed and wired — don't re-add it)

- `components/motion/Reveal.tsx` — scroll-triggered fade/rise for anything below the
  fold. Stagger with the `index` prop, don't hand-roll a new stagger pattern.
- `components/motion/CountUp.tsx` — any stat/number that should animate in once.
- `components/motion/MagneticButton.tsx` — the primary CTA pattern site-wide.
- Everything routes through `lib/motion/useMotionAllowed.ts` for
  `prefers-reduced-motion` — never check that media query ad hoc in a new component.
- Motion above the fold (a hero) should animate on mount, not `whileInView` — a
  visitor shouldn't have to scroll to see the hero finish appearing.

## What "generic AI website" looks like, and why to avoid it here

- A hero with a big centered headline, a paragraph, two pill buttons, and nothing
  else — no visual weight, no color decision, no motion. (This is exactly what this
  project's homepage looked like before it was called out as boring — don't regress
  to it.)
- Cards that are just `rounded-lg border p-4` with no relationship to the content
  inside (same treatment for a stat, a testimonial, and a pricing tier).
- Icon-in-a-circle + heading + one sentence, repeated 3x, as the default way to
  explain "how it works." It's fine as a *layout*, but it needs real specificity in
  the copy and enough type/spacing contrast to not look like a Bootstrap template.
- Every section same width, same padding, same gray-on-white treatment — no visual
  rhythm change between sections (alternating background, an occasional full-bleed
  bold moment, breaking the grid once) reads as more designed than uniform sameness.

## No real imagery exists yet

There is no real racer/track photography in this project (see `REVIEW.md`), and
this environment cannot reach external image sources or paid generation APIs to get
any. Don't fake it with a generic stock-photo look-alike gradient-over-photo hero —
build visual weight with color blocking, the type scale, and the motion primitives
above instead. If real photography is supplied later, `lib/images/process.ts`
already has the ingest pipeline (EXIF strip, smart-crop, consistent grade) — wire
into that, don't build a second one.
