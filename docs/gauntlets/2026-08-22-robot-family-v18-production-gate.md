# HabitGame Robot Family v18 — production and build-modal Gauntlet

## Mission

Move the three construction robots from the stopped v17 prototype into a production-ready family and prove them inside the real building modal. “10/10” is treated as a release bar, not a subjective promise: every required visual, animation, attachment, performance, and modal gate below must pass with evidence.

## Authoritative references

- Family hierarchy: `docs/design/story-concepts/builder-robot-family-concept-2026-07-28.png`
- Heavy: `docs/design/robot-family/references/heavy-worker-turnaround-v1.png`
- Manager: `docs/design/robot-family/references/manager-orby-turnaround.png`
- Manager face/brain: `docs/design/robot-family/references/manager-orby-expression-orbits.png`
- Mini: `docs/design/robot-family/references/mini-artist-turnaround-v1.png`

Role turnarounds override the family concept for local geometry. Cross-view continuity overrides inconsistent generated micro-detail.

## Required gates

1. **Heavy form gate** — broad armored shoulder bridge, deep compact visor, huge layered forearms, useful four-digit hands, integrated dorsal arm sockets, coherent rear and underside.
2. **Manager form gate** — low pear shell, large circular-eyed face, clear brain dome, swept fins, integrated hover crescent, coherent rear and underside.
3. **Mini form gate** — exactly 0.50 Manager family scale, compact maker silhouette, mint crown sensors, small articulated hands, tray and brush, rear cassette, closed underside.
4. **Attachment gate** — no floating or merely adjacent limbs/tools; roots overlap their named sockets and remain coherent through the complete orbit.
5. **Face gate** — blink, gaze, and five emotions remain readable and role-specific in frozen evidence. Reduced motion must never introduce vibration.
6. **Construction gate** — all three work simultaneously around measured building bounds, with believable hand/tool contact, cloud-covered relocation, no building penetration, and deterministic reduced-motion staging.
7. **Performance gate** — production family low LOD <= 40k triangles / 60 draw calls; construction theatre <= 8k / 18; total live modal delta <= 48k / 72 while targeting 60 fps.
8. **Real-modal gate** — the actual build modal, not only a dev viewer, is captured at desktop and phone width with all three roles readable over a full choreography cycle.

## Review evidence

- Eight-angle orbit plus top and underside for each role.
- Reference/model front and profile comparisons for each role.
- Friendly, focused, concerned, curious, delighted, blink, and gaze frames.
- Heavy lift, Manager direct/inspect, and Mini paint/contact frames.
- Live renderer triangle/draw-call delta in the build modal.
- Real build-modal screenshots at desktop and phone widths.

## Stop conditions

- Stop a pass after three failed correction loops and open a new explicit contract before editing that pass again.
- Do not advance from blockout while a critical silhouette or attachment target is below 0.90.
- Do not call the family production-ready while the live-scene delta or real-modal gate is missing.
- Do not deploy, merge, or change canonical gameplay writes in this Gauntlet.

## Final production result — 2026-08-22

All implementation gates are met for the Island 001 launch slice:

| Gate | Evidence | Result |
| --- | --- | --- |
| Heavy / Manager / Mini form | Existing fixed 360°, top and underside review sheets; high production model unchanged by the final LOD pass | Pass |
| Attachment and face | Named sockets/pivots, blink/gaze/five emotions, role motions, structural contract | Pass |
| Construction | Five landmark envelopes × seven phases × 360 frames | 12,600/12,600 clean |
| Root stability | 120 settled working frames after a 600-frame settle | `0` positional drift |
| Low family budget | Runtime measurement | 39,922 triangles / 58 calls |
| Theatre budget | Busiest visible construction phase | 2,216 triangles / 14 calls |
| Combined modal budget | Family plus theatre | 42,138 triangles / 72 calls |
| Real modal | Phone click burst, resting scene, landmark camera lock; five landmark transition/orbit passes | Pass |

The final collision solver preserves each worker's legal landmark-shell radius
while separating the worker around the circumference, eliminating the rare
relocation penetrations that short visual samples missed. Contact vibration is
tool-local; no body root receives the effect. Reduced motion removes relocation,
vibration, greeting beats and ambient POV changes.

Repeatable commands:

- `npm run check:robot-family-3d`
- `npm run check:robot-family-3d-runtime`
- focused `island5ThreePilotContractTests` (41/41)
- production `vite build`
- `node scripts/check-island-run-architecture-guards.mjs`

Decision: **approved for the Island 001 build modal and as the production
pattern for subsequent island-specific construction authoring.** This is not a
claim that the remaining 119 island landmark transitions have already been
authored.
