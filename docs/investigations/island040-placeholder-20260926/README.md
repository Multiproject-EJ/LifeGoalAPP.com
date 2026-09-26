# Island 040 temporary 3D setting

Date: 2026-09-26. Status: local placeholder for review, not production artwork.

## Delivered slice

Runtime Island 040 has an explicit source-040 route marked `placeholder`.
The actual shared renderer presents original space-deck massing and five compact
L0–L3 landmark families. It uses the existing tile transforms, gameplay inputs,
arena presentation and camera system. It does not reuse Island 005 as a hidden
fallback. The dev workbench now resolves its island parameter from the same
routing registry instead of silently substituting 005 for 040.

The separate council deck has empty placeholder seats and an inactive frame.
It is NOT an all-caretaker ceremony, a portal entitlement, a new completed
mission, or a new destination. It has no gameplay callbacks or persistence.
Its label says “temporary 3D setting” and “portal not active.”

No edits to the separate paused Cosmic Outpost worktree or reference packet.
No demo-cap change, no additional later-island routes, no save migration,
no currencies, level changes, app-access changes, publishing or deployment.
The existing non-admin departure gate after Island003 remains unchanged.

## Evidence

- `node scripts/check-island040-placeholder.mjs`: five routing tests pass;
  all five landmark families pass L0–L3 canonical-anchor, compact-envelope and
  additive-growth checks. World transforms remain static across time samples.
- Architecture guard: zero violations, three existing allowlisted warnings.
- Full app TypeScript check (`tsc --noEmit --pretty false`): passed.
  The subsequent framing-only numeric adjustment is covered by the final
  browser rerun.
- `git diff --check`: clean.
- `node scripts/check-island040-placeholder-browser.mjs`: real shared renderer
  in a small viewport-sized development fixture, not a separate imitation of it.
  Assertions check the canvas's actual CSS dimensions against the viewport.
  See `browser-check.json` and the screenshots for completed cases.
- Phone overview, left/right/rear; L0 and L3; 360×640, 390×844, 430×932
  reduced-motion, and 1280×900 desktop captures.
- The existing app workbench rendered and passed one run, but later startup
  attempts exceeded the 120-second mount timeout (blank body, no captured
  JavaScript errors in a separate diagnostic). Its evidence mode also pins the
  canvas to 390×844, so that earlier run did not establish true responsiveness.
  The bounded fixture avoids App/auth imports and the fixed phone frame.
  First visual inspection also found inherited reef
  scatter and notch overlap; both were corrected before retained captures.
- Side review found the reserved council deck clipped at the edge. The
  placeholder's overview zoom and dedicated survey radius were adjusted;
  board/landmark geometry and other islands' cameras remain unchanged.

This does not certify authenticated full-board gameplay, physical-phone
performance, full construction choreography, production source fidelity or the
future portal unlock. Shared renderer cost includes the existing route, reward
objects, pawn and arena creature. No physical-phone FPS claim is made.

No image/model/texture binaries are added to deployed assets: the placeholder
is a small original code-only delta using the installed Three.js/shared runtime.
Screenshots in this folder are review evidence, not shipped game assets.

## Review

Start the local Vite server, then open:

`/dev/island-template-kit?mode=3d&island=40&level=3&island3dEvidence=1`

For true viewport-sized QA without the full app bootstrap:

`/scripts/fixtures/island040-placeholder.html?island3dEvidence=1&level=3`

Both review surfaces are development-only. The fixture has no gameplay writes,
account, authentication or entitlement changes. The route itself is available to the normal
board when the player legitimately reaches 040 or uses existing developer
navigation; it does not bypass the demo or progression gates.

## Next and rollback

Implement canonical once-only portal ownership and the caretaker handover,
then all-path game-first/Today entry guards with verified developer bypass.
Keep the entitlement independent of world geometry so the final Cosmic Outpost
can replace this setting without resetting progress.

Remove the explicit 040 route to restore its previous legacy-board presentation;
no save data needs reverting. Final artwork remains the separate workstream.
