# DESIGN.md — Tokens, type, motion

Full tokens are implemented in `app/globals.css` (CSS custom properties + Tailwind v4 `@theme`) and rendered live at `/style`. This file explains intent; `/style` is the source of truth for values.

## Palette

Exactly the palette in the brief (`--paper`, `--marble`, `--mist`, `--ink`, `--graphite`, `--silver`, `--accent`, `--accent-soft`, `--glass`). Enforced discipline: `--accent` is used only for — live/open indicators, leading bid, personal best, primary CTA background. Nowhere else. No dark mode in v1 (explicit anti-pattern in the brief), so tokens are defined once on `:root` with no media-query override.

## Type

- Display: `Fraunces` (variable, via `next/font/google`) — the brief's explicit fallback when a licensed editorial serif isn't available, which is the case here (no font licensing budget/credentials in this environment).
- Interface: `Inter` (via `next/font/google` — `Geist`/`Suisse Int'l` require licensing not available here; noted as a stub to swap in `REVIEW.md`).
- Mono (lap times/telemetry): `JetBrains Mono` (via `next/font/google`), `font-variant-numeric: tabular-nums` applied globally to any element with class `.tabular`.
- Display sizes: `letter-spacing: -0.03em`, generous `line-height`. Small-caps metadata labels: 11px, `letter-spacing: 0.12em`, `text-transform: uppercase`, color `--silver`.

## Motion

- Lenis for smooth scroll, mounted once in `components/motion/LenisProvider.tsx`, disabled entirely when `prefers-reduced-motion: reduce` (checked via `useReducedMotion` from Framer Motion, which reads the media query).
- Reveal: `components/motion/Reveal.tsx` — intersection-triggered, staggers children 40–60ms, animates `opacity`/`transform` only (never layout-affecting properties), so it stays GPU-cheap and doesn't shift layout.
- Count-up: `components/motion/CountUp.tsx`, animates once on first view (tracked via a `useRef` flag, not on every scroll re-entry), tabular numerals throughout so digits never reflow siblings.
- Magnetic CTA: `components/motion/MagneticButton.tsx`, ~40px capture radius, spring back on leave.
- Marble drift: a slow (24s) background-position keyframe on `.marble-surface`, `will-change: background-position` only where actually animating, removed via reduced-motion query.
- Page/card shared-element transitions: View Transitions API (`document.startViewTransition`) wrapped in `components/motion/ViewTransitionLink.tsx`, feature-detected and falling back to a plain `next/link` navigation where unsupported — this is a progressive enhancement, not a dependency.

All of the above respect `prefers-reduced-motion` at a single choke point (`lib/motion/useMotionAllowed.ts`) rather than being checked ad hoc in every component, so the DoD requirement ("fully honored") is enforceable by grep/test rather than by hoping every component remembered.

## Photography pipeline

See `lib/images/` and section 1 requirements — implemented in Phase 3: floor-size rejection with a helpful (not validation-red) message, EXIF-orientation correction + mandatory GPS strip, AVIF/WebP with `<picture>` fallback, smart-crop via a saliency heuristic (face/subject-weighted center-of-mass on the alpha-less luminance map — no ML model dependency, since no vision-model image-cropping credential is assumed available at build time), a deterministic generated fallback (marble field + race number/class/track name composition, seeded by racer id so it's stable), and a single consistent grade (desaturate 8%, lift blacks, warm white balance) applied to every accepted photo via `sharp` at ingest time so the grade is baked once, not recomputed per render.

## Empty/sparse/full densities

Every profile/marketplace/dashboard surface component takes a `density` prop derived from actual data shape (never guessed) and renders one of three explicit branches — there is no "empty chart with axes" branch; a module with nothing to show returns `null` from its parent list, not an empty card. See `components/ui/EmptyState.tsx` for the shared, designed (never a bare string) sparse/empty presentation used across profile, marketplace and dashboard.
