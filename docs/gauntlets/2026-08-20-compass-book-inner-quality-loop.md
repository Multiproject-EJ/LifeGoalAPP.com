# Compass Book inner quality Gauntlet

**Priority set by Eivind:** the inner Compass Book is more important than further cover polish.

## Goal-image authority

ImageGen goal images are art-direction contracts, not product data or UI assets:

- `evidence/compass-book-inner-goals-2026-08-20/01-desktop-reading-goal.png`
- `evidence/compass-book-inner-goals-2026-08-20/02-phone-chapter-goal.png`
- `evidence/compass-book-inner-goals-2026-08-20/11-wide-chapter-1-goal.png`
- `evidence/compass-book-inner-goals-2026-08-20/18-wide-chapter-2-goal.png`

The real DOM remains authoritative for text, answers, progress, controls, focus, and persistence. Generated words or values must never enter canonical Compass data.

## Baseline assessment

The current implementation is functionally strong but visually split: the procedural left-page compass and the DOM right page read as adjacent layers rather than one open book. On phone, readability is preserved, but the physical-book identity recedes too far after opening.

Ranked issues:

1. **Spread coherence:** align physical left page, spine, DOM right page, and fore-edge tabs as one object.
2. **Inner-page identity:** the left Reading page needs signal geometry and parchment framing around the compass, not a floating mechanism on a largely blank plane.
3. **Wide reading composition:** keep the entire left page visible while giving the DOM page a comfortable readable width.
4. **Phone chapter framing:** retain a single readable page, but make its leather/brass perimeter and tab rail feel physical without putting WebGL behind text.
5. **App chrome:** reduce the visual weight of the top bar and demo controls inside the book.
6. **Page transitions:** preserve direct navigation while making the physical leaf and DOM page turn read as the same event.

## Correction loop

Each loop changes one bounded issue, then captures desktop Reading and phone chapter evidence, critiques against the goal image, and chooses exactly one of `continue`, `refine-code`, `refine-spec`, `request-input`, or `stop`.

### Loop 1 — spread coherence and inner signal structure

- Widen and align the wide-screen physical/DOM page split.
- Add four five-point geometric signal scales around the Reading compass; keep labels and values DOM-owned.
- Add a stronger shared-gutter treatment and reduce wide top-bar weight.

Acceptance: the Reading view reads as one book before fine ornament is considered; no content, persistence, accessibility, or Island Run write path changes.

### Loop 1 review — `refine-code`

Evidence: `07-loop1-inner-3d.jpg`.

The inner spread improved materially: parchment, shared gutter, compass, signal scales, Reading hierarchy, progress summary, direct tabs, and action all read in one frame. The remaining highest-impact defect is exterior relief leaking around the opened left page; it makes the inner compass look doubled.

### Loop 2 — exterior-relief occlusion and phone page framing

- Hide the exterior cover compass and spine medallion once the hinge carries them face-down.
- Keep phone WebGL fully behind the opaque DOM page after opening, while preserving the production 3D cover launch.
- Add a restrained indigo-leather/brass perimeter to the phone parchment page.

Acceptance: no duplicate compass relief around the open spread; phone content remains a single high-contrast, scrollable page with no canvas interference.

### Loop 3 — chapter semantic correctness

- Reading alone uses the current two-page hybrid and its four-signal compass.
- Chapter and Quest Ledger pages hide the Reading relief and use the complete centered DOM page until their own approved physical relief exists.
- The active canonical page ID is exposed only as a presentation attribute; it does not create another state owner.

Acceptance: no chapter can display a visually impressive but semantically wrong Reading compass. Chapter-specific relief production becomes an explicit later slice rather than hidden prototype debt.

### Loop 4 — Chapter I Living Wheel production relief

- Add a page-bound `living_wheel` relief with eight enamel sectors, independent bump/roughness response, three concentric brass bezels, eight raised dividers and studs, a compass-rose hub, and a faceted violet cabochon.
- Keep the relief presentation-only. Player labels, answers, scores, progress, controls, focus, and persistence remain canonical DOM/state concerns.
- Extend the wide hybrid spread only to Chapter I; other chapters stay centered until their own physical relief passes a separate loop.
- Hide the closed-prop physical tab rail once the DOM rail takes over in the open spread, preventing duplicate navigation systems at the gutter.

Evidence:

- Goal: `evidence/compass-book-inner-goals-2026-08-20/11-wide-chapter-1-goal.png`
- Render: `evidence/compass-book-inner-goals-2026-08-20/12-loop-chapter-1-relief.png`
- Comparison: `evidence/compass-book-inner-goals-2026-08-20/13-chapter-1-comparison.png`
- Orbit right: `evidence/compass-book-inner-goals-2026-08-20/14-chapter-1-orbit-right.png`
- Orbit left: `evidence/compass-book-inner-goals-2026-08-20/15-chapter-1-orbit-left.png`
- Map-stripped geometry: `evidence/compass-book-inner-goals-2026-08-20/16-chapter-1-map-stripped.png`

Review action: `continue` for the Chapter I relief component, not `stop` for the whole inner-book programme.

Agent-vision scorecard against the generated achievable goal:

- global fidelity: **0.78**
- silhouette/proportion: **0.79**
- component structure: **0.87**
- form detail: **0.81**
- material/surface: **0.74**
- lighting/camera: **0.70**
- critical eight-sector/bezel/divider system: **0.88**
- critical compass-rose hub: **0.83** after reducing the backplate/jewel and exposing longer blades
- critical page attachment and contact shadow: **0.84**
- critical DOM/3D state ownership separation: **0.98**

The render now reads as a real Chapter I physical relief and clears the 0.70 **agent-vision component** gate. After correcting the capture crop, the deterministic Tier-1 blockout diagnostic passes with silhouette IoU **0.9838**, scale delta **0.0**, aspect-ratio delta **0.0**, and symmetry error **0.025**; the map-stripped lab capture proves the relief is geometry rather than painted detail. The diagnostic still warns that both full-spread images lack isolatable backgrounds, so it is evidence for framing/structure rather than exact material likeness. This component is not a near-reference manual-art match: enamel ornament remains procedural, the generated goal's left-page typography is intentionally omitted, and the current sealed demo legitimately shows canonical summary content rather than the goal image's answer-mode controls. Those are explicit differences, not hidden pass claims.

The orbit pair confirms that rings, sectors, ribs, studs, rose blades, and cabochon retain thickness rather than collapsing into a textured plane. At the normal 1500×1125 high-tier lab viewport the full book held **60 FPS**, **313 render calls**, and **109,572 triangles**; the low tier held **60 FPS**, **134 calls**, and **13,532 triangles**. The inflated 1800×1250 capture briefly produced misleading warm-up readings, so it is not used as performance authority.

### Loop 5 — Chapter II Inner Compass production relief

- Add a page-bound `inner_compass` relief with four fixed canonical cardinal blades, four colored signal stones, four gilt intercardinal points, three concentric bezels, a violet faceted hub, and independent enamel material response.
- Preserve the semantic mapping through the opened-cover transform: North/value is violet, East/energy is amber, South/need is teal, and West/shadow pull is orange.
- Keep all words, personal values, boundary text, result statements, controls, focus, and persistence in the canonical DOM/state layer.
- Extend the approved wide hybrid spread to Chapter II only; later chapters remain centered until their own relief passes a separate loop.

Evidence:

- Baseline: `evidence/compass-book-inner-goals-2026-08-20/17-chapter-2-baseline.png`
- ImageGen goal: `evidence/compass-book-inner-goals-2026-08-20/18-wide-chapter-2-goal.png`
- Production render: `evidence/compass-book-inner-goals-2026-08-20/19-loop-chapter-2-relief.png`
- Goal/render comparison: `evidence/compass-book-inner-goals-2026-08-20/20-chapter-2-comparison.png`
- Orbit positive: `evidence/compass-book-inner-goals-2026-08-20/21-chapter-2-orbit-positive.png`
- Orbit negative: `evidence/compass-book-inner-goals-2026-08-20/22-chapter-2-orbit-negative.png`
- Map-stripped geometry: `evidence/compass-book-inner-goals-2026-08-20/23-chapter-2-map-stripped.png`

Review action: `continue` for the inner-book programme; the Chapter II relief itself clears the component gate.

Agent-vision scorecard against the achievable generated goal:

- global fidelity: **0.80**
- silhouette/proportion: **0.84**
- component structure: **0.91**
- form detail: **0.84**
- material/surface: **0.79**
- lighting/camera: **0.76**
- critical four-direction semantic mapping: **1.00** after the Gauntlet corrected both blade and signal-stone transforms
- critical bezel/intercardinal/hub system: **0.90**
- critical page attachment and orbit thickness: **0.88**
- critical DOM/3D state ownership separation: **0.99**

The deterministic Tier-1 blockout diagnostic passes with silhouette IoU **0.9766**, scale delta **0.0**, aspect-ratio delta **0.0**, and symmetry error **0.0366**. As in Loop 4, the diagnostic warns that the full-spread images are not isolated masks, so these numbers support framing and bilateral structure rather than exact material likeness. The generated goal uses a tighter illustrated book composition; production intentionally retains the existing functional hybrid shell and scrollable canonical DOM page. No generated text or invented answer entered product data.

At the 1200×900 high-tier orbit viewport the full book held **60 FPS**, **285 render calls**, **102,100 rendered triangles**, and **467 meshes**. Both orbit views keep the rings, blades, tip bezels, signal stones, intercardinals, and central cabochon volumetric. The map-stripped capture preserves the complete direction system, proving it is procedural geometry rather than baked image detail.
