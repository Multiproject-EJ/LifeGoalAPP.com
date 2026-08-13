# Journey Disc Arena — 10/10 Quality Gauntlet

Status: **Approved for implementation** by Eivind on 2026-08-13 after rating
the 9/10 slice 7/10 and asking for a complete quality pass followed by an
Island 006 integration investigation.

## Mission

Make the mobile battle feel directed, authored and replayable rather than like
an attractive simulation. Preserve the deterministic engine and canonical
HabitGame reward paths while adding the missing player decision, battle
staging, weapon identity and knockout-to-reward crescendo.

## Observable 10/10 outcome

At 390×844, the full arena lip and every core control are visible. A round opens
with a short readable countdown. During the fight the player can select any
surviving friendly disc, see its weapon, and launch that exact disc when Surge
is ready. The selected disc is unambiguous on the 3D board. Ram, Aegis and Pulse
strikes have different deterministic effects. The terminal knockout remains
visible long enough to land before a victory/defeat reveal and reward card.

## Acceptance criteria

- Captain selection is deterministic, survives normal snapshot publication,
  and falls back to another active real player disc after a knockout.
- Ram Fin produces the hardest launch, Aegis Ring restores bounded shield, and
  Pulse Vane adds a bounded speed window; all effects live in the pure engine.
- A fixed-step opening countdown freezes combat without consuming round time.
- Result banking remains idempotent, but presentation includes a resolve beat
  before the result panel covers the arena.
- Selection ring, captain strip, countdown, resolve banner and Surge control fit
  with the complete board at exact 390×844.
- Existing event ticket, score, reward, armory and Supabase paths remain
  canonical and feature-default-off.
- Typecheck, build, architecture guard, deterministic service tests, exact-phone
  browser playtest and terminal/rematch flow pass with no new regressions.

## Island 006 investigation boundary

Island 006 is canonically the ordinary Moonveil Nexus and must not be silently
reclassified as the fifth-island boss arena. Investigate a reversible chapter-
opening exhibition: the island centre temporarily transforms/zooms into the
fullscreen arena while the ordinary world role, Moon Gate landmark and Island
005 arena cadence remain intact. Document the exact launch seam and conflicts;
do not enable production or rewrite Island 006 art in this pass.

## Rollback

All work remains isolated on `codex/journey-disc-arena`. Roll back any slice
that weakens determinism, canonical state ownership, exact-phone fit,
accessibility, or the existing Island 006 visual/routing contract.

## Completed 7/10 → 10/10 pass

- Added a deterministic two-second `3–2–1–SPIN` formation hold that does not
  consume round time or allow an early strike.
- Added an in-battle captain strip and animated gold 3D selection ring. The
  player can choose any surviving friendly disc; a knockout automatically
  transfers captaincy to a remaining real disc.
- Gave every saved weapon a distinct engine-owned active: Comet Ram launches
  hardest, Aegis Drive restores bounded shield, and Pulse Dash grants a bounded
  speed window.
- Added a 1.05-second terminal resolve state so KO launch and the full-board
  `VICTORY`/`RIVALS WIN` beat land before the reward card appears.
- Persisted fighter rank in the permanent armory alongside weapons and Guardian
  clearance, preventing rank regression on Island 011/016 or a new event id.
- Completed the Island 006 integration investigation and retained the feature
  default-off pending the centre-beacon/composite slice.

### Verification

- TypeScript no-emit compile: pass.
- Production build: pass.
- Island Run architecture guard: pass.
- Full deterministic Island Run service runner: pass.
- Exact 390×844 playtest: 390×844 DOM with no overflow; complete arena lip;
  countdown visible; four-disc captain strip; non-default Ancient Egg captain
  selection; gold selection ring; terminal `resolve` state captured before the
  result panel; tickets spent 6→2 for four deployed discs.

### Captured evidence

- `evidence-journey-disc-arena-10of10-countdown.png`
- `evidence-journey-disc-arena-10of10-captain.png`
- `evidence-journey-disc-arena-10of10-result.png`
