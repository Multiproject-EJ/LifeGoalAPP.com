# Shared coast and max-dice creature celebration

User requested matching layered coast bases for surrounding islands and a creature celebration: roll into arena center, spin, pop up like a ping-pong ball with green/purple smoke, land, roll out and resume normal behaviour. A preview test button was also requested.

## Implementation

Neighbouring islands now use the same exported coast-surface builder, four sand/limestone/grass ring profiles and materials as the main island. Their individual irregular outlines remain intact. Faceted coastal crags break up the layered shores, retaining settlement pier gaps. Main-island geometry uses the original radius function by default.

The creature's presentation-only7.2-second sequence has roll-in, spin, pop-up, fall, landing bounce and roll-out phases. It captures an entry pose, folds the wings, rolls/spins the existing model and blends back to the current ordinary roaming pose at completion. Two pooled billboard batches create green/purple smoke; particles cease at the end. Battle, active construction or paused interaction cancels the effect; reduced motion keeps the normal static pose and emits no smoke. Repeated requests while playing are consumed without stacking animations.

The actual board increments a transient presentation cue only after a successful canonical roll with the existing `hard` throw cadence on Island005. Existing dice authority determines that cadence: first roll after entering the available maximum, then every tenth consecutive max roll. Failed rolls, normal throws and other islands do not request the animation. No dice, reward, movement or progression rules are changed. The workbench's **Test creature celebration** button requests the same renderer sequence without spending dice or creating gameplay writes.

## Evidence

- `celebration-tests.log`: trigger suppression, existing1/10/20 cadence, all phases, continuous position boundaries, bounce height, exact current-normal-motion handoff and reduced-motion behaviour PASS.
- `celebration-architecture.log`: zero new violations; three existing allowlisted warnings.
- `celebration-typecheck.log`: TypeScript PASS (empty log).
- `celebration-build.log`: final production build PASS.
- `celebration-v001/capture.json`: real button interaction, all seven phase states including idle, peakY5.5486, zero browser errors, stable sources, normal return and smoke cleanup. Reduced-motion button test retains the original position, suppresses smoke and finishes.
- Screenshot filename timings are approximate: `pop.png` landed during the small bounce and `landing.png` during roll-out due capture latency. Timeline state/position samples independently prove pop-up and fall; these stills are not claimed to show the apex.
- `review-celebration-source.json` and the final independent visual review record own scoped review decisions.

Actual paid max-dice gameplay was not executed for this test; canonical successful-roll wiring is checked through source review and the shared cadence/gating tests. Physical-phone performance is not established, and previous High performance review remains outstanding.
