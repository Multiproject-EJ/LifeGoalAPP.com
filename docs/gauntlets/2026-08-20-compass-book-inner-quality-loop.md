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

### Loop 6 — Chapter III Living Horizon production relief

- Add a page-bound `living_horizon` landscape relief with four layered terrain solids, one uninterrupted violet-and-gilt S-path, sanctuary cottage and inlet, workshop and gear medallion, gathering arena and hearth, and an open horizon gate with a separate sun and ray fan.
- Keep the five canonical zones visually distinct: Sanctuary, Workshop, Gathering Place, Vital Path, and Open Gate.
- Expose the zones, path, gate, sun, rays, and hearth as named presentation parts/animation anchors for later Island Run completion ceremonies.
- Keep all words, player values, answers, progress, controls, focus, and persistence in the canonical DOM/state layer.
- Extend the approved wide hybrid spread to Chapter III only; later chapters remain centered until their own relief passes a separate loop.

Evidence:

- ImageGen goal: `evidence/compass-book-inner-goals-2026-08-20/24-wide-chapter-3-goal.png`
- Pass 1 render: `evidence/compass-book-inner-goals-2026-08-20/25-loop-chapter-3-relief-pass-1.png`
- Pass 1 comparison: `evidence/compass-book-inner-goals-2026-08-20/26-chapter-3-comparison-pass-1.png`
- Production pass 2: `evidence/compass-book-inner-goals-2026-08-20/27-loop-chapter-3-relief-pass-2.png`
- Goal/render comparison: `evidence/compass-book-inner-goals-2026-08-20/28-chapter-3-comparison-pass-2.png`
- Orbit right: `evidence/compass-book-inner-goals-2026-08-20/29-chapter-3-orbit-right.png`
- Orbit left: `evidence/compass-book-inner-goals-2026-08-20/30-chapter-3-orbit-left.png`
- Map-stripped geometry: `evidence/compass-book-inner-goals-2026-08-20/31-chapter-3-map-stripped.png`

Review action: `continue` for the inner-book programme; the Chapter III semantic and structural component gates pass after two visual correction passes.

Agent-vision scorecard against the achievable generated goal:

- global fidelity: **0.80**
- silhouette/proportion: **0.84**
- component structure: **0.83**
- form detail: **0.74**
- material/surface: **0.76**
- lighting/camera: **0.78**
- critical continuous vital path: **0.92**
- critical five-zone readability: **0.84**
- critical open gate, sun, and ray fan: **0.86** after separating the sun and widening the leaves
- critical page attachment and contact depth: **0.94**
- important material-family separation: **0.78**

Pass 1 proved the architecture but exposed two identity defects: the sanctuary read too much like a teal block/book, and the sun was crowded by the gate/path terminus. Pass 2 adds a cottage gable, lit window and chimney; a workshop facade, window and steps; and a wider gate with the sun moved into a clear horizon position. The remaining difference from the ImageGen ceiling is explicit production density: fewer trees, rocks, masonry units, clouds, and patina layers. The semantic spine and color hierarchy are preserved.

The deterministic Tier-1 diagnostic passes with silhouette IoU **0.9699**, scale delta **0.0**, aspect-ratio delta **0.0**, and symmetry error **0.0271**. As with the earlier chapters, the full-spread background mask makes these framing signals advisory rather than an exact material-likeness score. Two axial orbits and the map-stripped render preserve terrace height, building volumes, path rails, ring depth, gate solids, and parchment contact. Part coverage finds zero errors, zero warnings, and zero unnamed meshes across the 27 specified selectable components.

The constrained-device low tier held **60 FPS**, **193 render calls**, and **18.8k rendered triangles** in the lab. High-tier browser capture varied between **24 and 49 FPS** at **412 calls** and **131.5k rendered triangles**; the original aspirational 50 FPS high-tier target is therefore not claimed as proven. Production already auto-selects low tier on narrow or constrained devices, and the high-tier optimization gap remains explicit rather than hidden.

### Loop 7 — Chapter III GPU workload refinement (2026-08-21)

- Replace repeated frame medallions, path milestones, gathering seats, sun rays, terrain trees, and rocks with shared `InstancedMesh` geometry while retaining their named semantic parent systems.
- Reduce only excess high-tier curve/radial/bevel tessellation; keep the low-tier silhouette and triangle budget unchanged.
- Limit the directional-light shadow pass to the macro terrain, path, building, arena, sun, and gate-post forms that communicate relief depth. Every relief solid still receives shadows.
- Preserve the five zones, uninterrupted violet-and-gilt path, cottage/workshop/arena identities, open gate, separate sun and rays, named animation anchors, DOM ownership, and presentation-only runtime contract.

Evidence:

- High-tier baseline: `evidence/compass-book-inner-goals-2026-08-20/32-chapter-3-high-baseline.png`
- Instancing pass: `evidence/compass-book-inner-goals-2026-08-20/33-chapter-3-high-optimized-pass-1.png`
- Final high-tier render: `evidence/compass-book-inner-goals-2026-08-20/34-chapter-3-high-optimized-pass-2.png`
- Final low-tier render: `evidence/compass-book-inner-goals-2026-08-20/35-chapter-3-low-optimized.png`
- Baseline/final comparison: `evidence/compass-book-inner-goals-2026-08-20/36-chapter-3-performance-comparison.png`
- Optimized orbit right: `evidence/compass-book-inner-goals-2026-08-20/37-chapter-3-optimized-orbit-right.png`
- Optimized orbit left: `evidence/compass-book-inner-goals-2026-08-20/38-chapter-3-optimized-orbit-left.png`

Review action: `continue` for the inner-book programme. This is a `refine-code` performance correction against a sound sculpt specification; it does not change the approved Chapter III direction.

Agent-vision preservation scorecard against the pre-optimization production render:

- global visual parity: **0.98**
- silhouette/proportion parity: **0.99**
- critical five-zone readability: **1.00**
- critical continuous path and milestone placement: **1.00**
- critical gate, sun, and radial-ray system: **1.00**
- important terrace/building contact depth: **0.97** after narrowing the shadow-caster set
- off-axis volumetric readability: **0.98** across both optimized orbit views

The deterministic workload delta is the acceptance authority for this pass. At the same high-tier lab view, the full book falls from **412 to 324 render calls** (−21.4%), **131.5k to 114.6k rendered triangles** (−12.9%), and **565 to 536 meshes**. Low tier falls from **193 to 164 calls** while remaining at **18.8k rendered triangles**. Browser FPS remains scheduling-sensitive and is not promoted to physical-device proof; the supported-iPhone high-tier ≥50 FPS gate remains open until tested on hardware.

The refreshed runtime manifest still contains 60 book parts and covers all **27 specified Living Horizon components with zero errors and zero warnings**. Strict sculpt validation passes with the pre-existing `actionProfile` advisories; the live runtime continues to expose the independent sun, ray fan, gate leaves, hearth, violet path, and amber material anchors needed by later Island Run ceremonies. TypeScript, Compass Book assertions, the launch contract, and the production Vite build all pass; existing repository chunk-size/dynamic-import warnings remain unrelated.

### Loop 8 — Chapter IV Ikigai Map through lighting (in progress, 2026-08-21)

- Preserve the canonical Chapter IV metaphor: five forces—Curiosity, Capability, Contribution, Viability, and Willingness—form a constellation, **not** a four-circle Venn diagram.
- Give the five perimeter forces separate raised medallions, connect them with one pentagon and five inward spokes, and keep the central Trial physically independent so it cannot read as a sixth force.
- Represent three candidate paths as subordinate routes and place one dark Mirage marker outside the valid graph with only a broken tether.
- Keep all personal labels, paths, experiment text, warnings, progress, controls, focus, and persistence in the canonical DOM/state layer.

Evidence:

- ImageGen wide production goal: `evidence/compass-book-inner-goals-2026-08-20/41-wide-chapter-4-goal.png`
- Resumable intake: `.img2threejs/compass-book-ikigai-map/`
- Dedicated white-backed admission reference passes at **50.46% foreground coverage** with one connected component.
- Strict sculpt specification: `.img2threejs/compass-book-ikigai-map/ikigai-map-sculpt-spec.json`
- Image-guided iteration target: `evidence/compass-book-inner-goals-2026-08-20/44-wide-chapter-4-goal-iteration-2.png`
- Corrected high-tier render: `evidence/compass-book-inner-goals-2026-08-20/45-wide-chapter-4-render-high-corrected.png`
- Map-stripped geometry proof: `evidence/compass-book-inner-goals-2026-08-20/46-wide-chapter-4-map-stripped.png`
- Orbit proofs: `evidence/compass-book-inner-goals-2026-08-20/47-wide-chapter-4-orbit-left.png` and `48-wide-chapter-4-orbit-right.png`
- ImageGen comparison sheet: `evidence/compass-book-inner-goals-2026-08-20/49-wide-chapter-4-comparison.png`
- Scoped runtime manifest and coverage: `evidence/compass-book-inner-goals-2026-08-20/50-chapter-4-part-manifest.json` and `51-chapter-4-part-coverage.json`
- Form-refinement fixed view: `evidence/compass-book-inner-goals-2026-08-20/53-wide-chapter-4-form-refinement.png`
- Form-refinement orbit views: `evidence/compass-book-inner-goals-2026-08-20/54-wide-chapter-4-form-orbit-right.png` and `55-wide-chapter-4-form-orbit-left.png`
- Multi-angle gate: `evidence/compass-book-inner-goals-2026-08-20/56-chapter-4-form-multi-angle.json`
- Form-refinement comparison: `evidence/compass-book-inner-goals-2026-08-20/57-wide-chapter-4-form-comparison.png`
- Feature scorecard: `evidence/compass-book-inner-goals-2026-08-20/58-chapter-4-form-feature-review.json`

The goal-image component gate passes: five countable nodes, central Trial, three candidate routes, isolated Mirage, page contact, and separable raised solids are all present. The full book image is intentionally not used as silhouette-admission evidence because its 97.5% foreground coverage is not segmentable; the dedicated orthographic plate reference closes that deterministic intake gap.

Strict-quality now passes with **29 components**, **five repetition systems**, **ten mapped intake details**, complete attachment contracts, and source-derived PBR evidence at **0.86 confidence** against a 0.70 target. The integrated production relief uses instanced perimeter rails, spokes, bezels, sockets, chart studs, rivets, and Mirage tether beads. The image-guided correction made the broken Mirage tether visible without adding a draw call.

Agent-vision review accepts the blockout at **0.84** and the structural pass at **0.87**. The procedural force emblems remain simpler than the generated concept art, so neither score is represented as near-reference fidelity. Tier 1 passes with silhouette IoU **0.9749**, and the map-stripped plus two orbit captures prove that the relief is geometry rather than a projected plate. The deterministic orbit check reports no degenerate view.

Form refinement replaces the rounded Trial center with a deliberately faceted dodecahedral gem, expands its mount to four alternating rings and eight radial prongs, turns Curiosity into a separate faceted core plus swept tail, gives Contribution a star beacon, adds the specified wheel inset to Viability, and nests a second solid lobe inside Willingness. The pass scores **0.88** in agent vision. Every critical feature clears its threshold: five-force graph **0.94**, Trial/path/Mirage separation **0.93**, five node identities **0.86**, page contact/depth **0.90**, and material/light hierarchy **0.83**. The refreshed Tier-1 silhouette IoU is **0.9729**; both `long-axis` and `thickness-axis` orbit views remain non-degenerate.

Material-pass is accepted at **0.86** after two bounded corrections. The final high tier uses separately seeded **1024px albedo, roughness, bump, and AO channels** for the five force enamels, Trial crystal, and Mirage; the constrained tier keeps 128px channels. The full-spread materials continue to use the book's independently generated leather, paper, and gilt maps. No texture channel aliases another PBR channel.

The legacy whole-frame five-cluster diagnostic remains documented as unsuitable for eight named material families. It is not bypassed or weakened: the project-local Tier-1 bridge still runs `diagnose_render.py` for silhouette, scale, proportion, and geometry integrity, then requires the stricter official `material_gate.py` result. That gate is backed by eight visible-footprint comparisons, one per named material region, plus a 32-view controlled plan and four saved capture classes. Final region scores range from **0.7258** for the narrow brass-frame footprint to **0.9182** for rose copper; material compatibility, all eight comparisons, and the material gate pass. The final Tier-1 silhouette IoU is **0.9742**.

Final material evidence is `73-wide-chapter-4-material-1024-steady-front.png`, `75-wide-chapter-4-material-1024-steady-right.png`, `72-wide-chapter-4-material-1024-steady.png`, and the focused actual-relief capture `74-chapter-4-material-1024-focused.png`. The comparison sheet is `76-wide-chapter-4-material-1024-comparison.png`; per-region crops, comparison JSON, view plan, multi-angle result, and blocking gate live under `material-regions/`. Agent vision scores the five-node identities **0.88**, material/light hierarchy **0.89**, independent channels **0.88**, and controlled evidence **0.93**.

The first 1024px texture upload produces a short warmup and is not counted as steady performance. After settling, the wide desktop lab samples **38 FPS** front, **42 FPS** right orbit, **32 FPS** left orbit, and **39 FPS** in the focused relief at **304 full-book calls / 121.2k rendered triangles** or **69 focused calls / 31.5k rendered triangles**. Physical supported-iPhone performance remains an explicit launch gate.

The scoped runtime manifest contains **29 named parts**, **zero unnamed meshes**, seven interaction sockets, a relief collider, and separate valid-graph/invalid-satellite destruction groups. Part coverage reports **zero errors and zero warnings**. After form refinement, high tier samples at **304 calls / 121.2k rendered triangles** and **35–43 FPS** in the desktop browser; the accepted low-tier baseline remains **141 calls / 18.6k rendered triangles** and sampled **51 FPS**. These are browser measurements, not supported-iPhone proof.

Surface-pass is accepted at **0.79** after one recorded correction loop. The first grazing review scored 0.68 and correctly rejected a crushed black chart field, broad uniform gilt highlights, and enamel micro-relief that disappeared at player scale. The correction restores visible navy leather grain, strengthens hammered gilt/patina breakup, and raises controlled enamel orange-peel while giving Mirage its own pitted bump profile and Trial its own facet-aligned scratch profile. Eleven relevant component groups now carry explicit `surfaceDetail` contracts. The corrected Tier-1 silhouette IoU is **0.9168**; page contact/depth scores **0.84**, material hierarchy **0.82**, and surface micro-relief **0.80**. Fixed, axial, and close grazing evidence lives under `evidence/2026-08-21-compass-book-chapter-iv-surface-pass/`.

Lighting-pass is accepted at **0.80**. Production and lab now share ACES exposure 1.0, a warm upper-left key, cool camera-right fill, warm rear rim, restrained hemisphere ambient, and PCF soft key shadows with explicit bias and normal-bias values. A neutral proof, reference-matched proof, grazing close-up, two axial orbits, and the actual production hybrid shell confirm that lighting exposes rather than conceals the accepted surfaces. The final Tier-1 silhouette IoU is **0.9074** and both orbit ratios remain non-degenerate. Page contact/depth scores **0.85**, material/light hierarchy **0.83**, and lighting separation **0.82**. Evidence lives under `evidence/2026-08-21-compass-book-chapter-iv-lighting-pass/`.

The production-shell capture also verifies the intended dual presentation: the 3D artifact remains visually active on the book while the right-hand canonical DOM page stays crisp, readable, and state-owning. No gameplay write path or runtime-state mirror was added.

Interaction-pass is accepted at **0.80**. The production shell's existing fragment/chapter celebration event now passes transient progress into `CompassBookThreeModel.setCelebrationProgress`. Chapter IV responds with a five-force disc cascade, independent Trial crystal/ring pulse, progressive candidate-path illumination, and a restrained Mirage recession that preserves its invalid-satellite meaning. Reduced-motion keeps authored transforms fixed and uses material-state emphasis only. Every one of the **29 specified components** now has an explicit stable transform, action role, pivot, transform-channel policy, trigger collider, and non-breakable destruction group. The refreshed live manifest reports **29 parts, zero unnamed meshes, and seven sockets**; coverage passes with zero errors and zero warnings. Trial/path/Mirage separation scores **0.95**, pivot integrity **0.94**, reduced-motion ceremony **0.96**, and presentation/state ownership **0.99**. Evidence lives under `evidence/2026-08-21-compass-book-chapter-iv-interaction-pass/`.

Optimization-pass is accepted with **0.99 pre/post visual parity**. The accepted 1024 color and Chapter IV enamel channels remain unchanged; five non-color full-book roughness/bump maps move from 1024 to 512, saving about **15 MiB RGBA-equivalent** of upload memory while preserving the browser-visible leather, gilt, paper, and enamel response. Focused high tier remains **69 calls / 31.5k rendered triangles**. The final full-book captures record **296 calls / 118.4k triangles** at high tier and **137 calls / 19k triangles** at low tier. Repeated rails, spokes, bezels, collars, chart stars, rivets, and tether beads remain instanced. The production hybrid shell and high/low comparison remain semantically intact. Evidence lives under `evidence/2026-08-21-compass-book-chapter-iv-optimization-pass/`.

Compass Book assertions, strict sculpt validation, TypeScript, and diff hygiene pass. The img2threejs state is now **complete**: blockout, structural, form, material, surface, lighting, interaction, optimization, part coverage, and action readiness all pass. This completes the Chapter IV production-sculpt programme, not the whole launch programme. Because production 3D is a launch requirement, **supported-iPhone hardware profiling remains an explicit blocking launch gate**; desktop FPS evidence and browser device emulation must not be substituted for that measurement.
