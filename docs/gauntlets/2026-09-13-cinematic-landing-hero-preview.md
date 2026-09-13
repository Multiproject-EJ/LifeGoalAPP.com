# HabitGame cinematic landing hero preview

Date: 2026-09-13
Status: representative live-preview slice
Owner: Eivind

## Mission

Publish a reversible desktop preview of the approved cinematic HabitGame hero:
pitch-black opening, the character cast side by side, robot eyes waking first,
the scene illuminating in stages, differentiated idle motion, and parallax
clouds that carry the visitor into the next explanatory section.

## Sources of truth

- User-approved concept and copy from the current Codex design thread.
- Repository `AGENTS.md` and the Island Run visual-production contracts.
- Latest `origin/main` for deploy truth.
- Existing production homepage at `/`, which must remain unchanged.

## Non-negotiables

- Existing homepage, auth, gameplay, state architecture, and database remain untouched.
- Preview is isolated at `/preview/cinematic-hero/`.
- The preview includes a visible `Old website` link back to `/`.
- Motion is decorative only, pauses offscreen, and honors reduced motion.
- No autoplay audio and no new gameplay writes.

## Scope

Included now:

- Cinematic hero opening and replay control.
- Layered background/cast artwork.
- Independent motion personalities for the robots and wizards.
- Scroll-bound parallax cloud transition.
- One lightweight neighboring “How life moves the world” section.
- Desktop and responsive spot checks.

Deferred:

- Final production asset rigging, video/GLB animation, full landing-page redesign,
  analytics, waitlist form migration, and replacement of the root homepage.

## Evidence gates

1. Static preview route builds with the main Vite production build.
2. No tracked file outside this preview route and this contract is changed.
3. Browser QA confirms opening reveal, scroll transition, responsive layout,
   reduced-motion behavior, and `Old website` navigation target.
4. Production deploy workflow completes and the preview URL loads over HTTPS.

## Asset and performance budget

- Preview artwork may use the current ~3.2 MB combined concept plates.
- Production promotion requires optimized WebP/AVIF or authored motion assets,
  measured LCP, and an explicit mobile fallback.
- Animations use opacity and transforms after one local chroma-key canvas pass.

## Rollback

Revert the single preview commit. The root homepage is never replaced, so a
rollback does not require data, DNS, auth, or application-state changes.

## Stop conditions

- Stop before replacing `/` or expanding beyond hero + neighbor without a new
  visual approval.
- Stop if the latest main branch no longer fast-forwards cleanly.

