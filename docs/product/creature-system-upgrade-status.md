# Creature system upgrade — implementation handoff

Updated 2026-09-20. **Working review implementation, not completed production art or a production-data migration.**

Newest correction: the preferred-family pass was too abstract. The roster now has an explicit **minimum 40/50 creature-bodied families and maximum 10/50 abstract exceptions**. Fern, Nightbloom, Aurora and Cosmos were rebuilt through all nine of their existing forms with locomotion, attention, gesture and strongly changing adult anatomy. Dreamroot and Prism remain the abstract contrast. Coverage remains **33/130 candidate form slots, 13/50 mature families, 12 first forms, 0 approved forms**; the gallery remains **11 families / 29 slots / 58 paired references**. All 34 behavioural tests, targeted TypeScript, isolated build, 168-asset package, dedicated 29-form gallery checks and the full lab browser regression pass at 1440/700/390/320px. Real 3D remains deliberately stopped at the Astra handoff. See `creature-first-progressions-v2-2026-09-20.md` and its manifest; v1 is archived provenance for the superseded four families.

Newest slice: Cinder's existing two-form line, Celest's existing two-form line and Lux's existing three-form line now have complete cinematic/clay review pairs. Eight selected images fill the missing first/final slots; six previous mature references are retained. Each family has a different transformation mechanism, and no gameplay level was added. Current coverage: **22/130 candidate slots, 13/50 mature families, 6 first forms, 0 approved forms**. These are image references, not new meshes. Targeted compile, 34 behavioural tests, isolated build (128 assets), dedicated gallery and full existing browser regression pass at 1440/700/390/320px. See `progression-batch-two-v1-2026-09-19.md` and its exact-prompt JSON.

Previous slice: Echo's full three-form line and Bloom's existing two-form line gained cinematic/clay pairs. Echo develops resonant anatomy; Bloom develops sheltering anatomy. No third Bloom gameplay form was invented. See `echo-bloom-evolution-v1-2026-09-19.md`.

Latest art correction: the user rejected Twilight's near-identical stages. `twilight-evolution-v2-2026-09-19.md` replaces forms 2/3 with genuine anatomical transformation in both cinematic and clay images: little enclosed seed → mobile explorer with folded mantle buds → powerful creature with an unfurled canopy. Four new assets; old versions preserved. Candidate coverage remains 15/130, with no new approved forms or models. The all-family art contract now requires structural stage separation, not just larger size or changed eyes.

Latest authoritative direction and slice: **cinematic, realistic, dramatic card images; rounded clay as the 3D interpretation**. Not one mandatory style for both. Delivered ten new mature families with both image treatments, plus all three planned Twilight forms in both treatments: 25 newly generated saved assets and one retained clay reference. Cinematic images are registered as review candidates; previous images remain archived. Current totals: **15/130 candidate form slots, 13/50 mature families, 0 approved forms**. No new meshes or live gameplay writes. Gallery and paired-image dialogs are in Art production; see `creature-batch-ten-v1-2026-09-19.md` and its exact-prompt JSON. Targeted compile, 33 tests, build (106 packaged assets) and batch browser checks at 1440/700/390/320 pass. Emotion and limited originality-screening caveats remain explicit.

Historical clay-trio slice (blanket style preference superseded by the clarification above): Bloom, Twilight and Echo in 5:7 card frames using clay images, plus a selectable grounded Echo alternative. All preserved. See `rounded-clay-direction-2026-09-19.md`. Its earlier verification covered 31 tests and 81 assets; the newer slice above supersedes those totals. Existing lazy Three.js chunk-size warning remains.

Latest slice: mature trio comparison v2. Art production now compares previous/new original-style Bloom, Twilight and Echo plus three matching rounded clay **images**, not new 3D models. Greyscale, 96px, hidden-hint and enlarged-image review controls work at 1440/390/320px. New files are non-destructive alternatives; active candidates, form counts and approval status are unchanged. Bloom still reads worried, Twilight retains animal-face risk, Echo still reads too sculpture-like. 31 behaviour tests, targeted TypeScript, isolated build and dedicated comparison browser checks pass; 80 assets packaged. Exact prompts, provenance and critique: `creature-trio-comparison-v2-2026-09-19.md`.

Previous slice: Bloom form-2 rounded 3D study and same-pose card pop-out. Open Art production → Open the pop-out card → Try 3D study → tap the figure. Actual procedural model, not a rotating image. Original art remains selectable; other families/forms have no substitute model. Earlier pop-out checks passed at 1440/390/320 including nested Escape/focus, reduced motion and WebGL fallback. 26 named model parts, 18,720 triangles. Geometry is still a rough blockout: concept likeness gates have not passed, no production art approval. This model has not been rebuilt from comparison v2. Details: `creature-card-popout-2026-09-19.md`.

Open `/creature-system-lab.html` on the development server. This is a separate entry that never boots authentication, sync executors or the live gameplay store. The new source is under `src/features/creature-system`. The original dirty checkout is untouched.

Current preview: `http://127.0.0.1:5189/creature-system-lab.html`. Port 5188 now belongs to another HabitGame worktree; do not terminate or reuse that server. Latest priority contract: `creature-production-workflow-2026-09-19.md` — creature artwork/readiness first, matching review afterwards.

Baseline: isolated detached worktree at locally cached `origin/main`, `da642f12`. No fetch, merge, production migration or deployment was performed.

## Before / after

| Area | Before | Implemented now | Still required before release |
|---|---|---|---|
| Missing personality evidence | Neutral placeholders participated in the pilot | Versioned evidence-aware projection; missing dimensions excluded; empty/limited inputs cannot recommend | Review measurement coverage and archetype refinement |
| Kindred | Independent, manually invented 32-score vectors | Six retained foundation controls; 50 draft direct-motivation targets, each with an ordered mix and rationale | Review new identities, sparse target breadth, close-result handling and player comprehension |
| Complement | Broad inflated profiles dominated coverage | Equal-budget profile union; marginal contribution after current slots; alternatives | Player comprehension and roster calibration |
| Favourite | Concept only | Manual owned-family slot; no silent replacement after retests/hatches | Canonical persistence/action integration |
| Team safety | One live companion versus five preview creatures | Three unique owned slots in an isolated external-store fixture; partial teams allowed | Guest/account sync, concurrency, migration, rollback |
| Cards | Multiple competing prototypes | Shared 5:7 card component, proper rarity frames, family code, compact form path, emotion/ownership/affinity labels | Final art/style approval and production composition |
| Family dex | Reference list | Search, tier/Mine filters, 50 family entries and 130 linked planned forms; detail previews | Reconcile 2/3/4-form plans against existing saved form 3 |
| Masks | Three concepts on a sheet | 32 distinct face briefs, full index/detail views, four separate suit candidates | Remaining 28 images and approval of all 32 |
| Creature forms | Sheets or first-form references | 33 candidate form slots; eleven complete review lines in the evolution gallery; 50 visual identity briefs and ten-batch queue | Remaining 97 planned form candidates, expression tests, exports, all approvals |
| Matching statistics | Top-three suggestions only | All-family ranks and affinity, best overall/owned, marginal Complement, owned/unowned filters and sort options | Calibration/player comprehension and live integration |
| Eggs | Existing logic/assets, fragmented UI | Common/Rare/Mythic fixture collect/sell/duplicate flow using canonical sell values; all 12 stage references | Live timers, reveal animation, dormant/reload/account paths and canonical settlement wiring |
| Rewards | Existing economy | No affinity-to-currency link introduced; duplicate collect/sell fixtures idempotent | Approved bond/form/team utility design and live tests |
| Migration | Unspecified | Pure dry run preserves original record, unknown IDs, eggs, bonds, claims and legacy companion; flags form-cap conflicts | Persistent schema/actions, conflict merge and rollback; apply is deliberately disabled |

## Verification

- `npm run test:creature-system`: 34 behavioural tests (including sorting/statistics, paired-asset coverage, eleven complete review lineages, creature-bodied roster policy and explicit model availability).
- `tsc -p tsconfig.creature-system.json`: strict compile of the new implementation.
- `npm run build:creature-system`: isolated review bundle and explicit referenced-asset package.
- `npm run calibrate:creature-system`: deterministic 2,000-sequence diagnostic and 360 single-answer perturbations.
- `npm run check:creature-system-browser`: Chrome/Playwright desktop and 390/320px checks; requires a local Playwright module or `CREATURE_PLAYWRIGHT_MODULE` pointing to it.
- Existing architecture guard: no new violations; three pre-existing allowlisted warnings.
- Browser screenshots and reports: `docs/qa/creature-system/`.

The full repository production build and authenticated live workflows have NOT been validated by these isolated checks.

## Important finding: the archetype link is not fixed by a new distance formula

The original 32 archetype weight definitions overlap substantially. For example, the caring/steady answer fixture ranks Enforcer above Caregiver. Two intended creature mixes have no member in their computed top five. Cards therefore label the intended combination **Art mix**, while the detail panel exposes the computed target and its experimental status.

The new synthetic close-result rate is 26.9%, compared with 77.2% in the earlier pilot. The formula changed, so this is a diagnostic comparison—not proof of greater psychological accuracy or a representative player study. All six families appear as Complements in the new sample. Twilight still wins 50.5% of Kindred selections; more calibration is needed.

Recommended next decision: preserve the existing foundation test and add an archetype-refinement step that distinguishes motivations directly. Do not silently replace the test, reinterpret historical answers as new evidence, or present the result as scientifically validated. The user has been asked whether to add refinement or replace the foundation.

## Continuation — motivation refinement prototype

The user asked to keep working. The reversible default is now implemented: retain the foundation, add an explicitly experimental motivation step. This is not a replacement of the live questionnaire or a historical-answer migration. The Gauntlet workflow kept this pass on representative scoring proof before roster-scale art production.

- 32 direct motivation statements grounded in the existing archetype drives; eight pages with one question from each suit. Ratings are 1–5; missing, malformed and equal ratings never become invented distinctions.
- The editable modal has blank-start, skip/clear, progress, keyboard page focus and apply/cancel. No personal ratings are stored outside the in-memory preview.
- Foundation answers remain unchanged. The lab lets reviewers switch between the old diagnostic and the new motivation model. They are never silently blended or compared across incompatible targets.
- Six synthetic targets explicitly encode the intended ordered three-archetype art mix. Rating points (0–4) are normalized to one budget; affinity is overlap, and Complement remains marginal breadth after current choices.
- Applied ratings change recommendations, not the chosen trio. Browser tests enter all 32 blank ratings, produce Bloom's authored mix, verify a 100 self-match, preserve Favourite, cancel edits and verify foundation evidence remains empty.
- Unsupported motivations are named in the UI as a catalogue gap. A profile with zero overlap receives no Kindred recommendation.

### Diagnostic result — not release calibration

`npm run calibrate:creature-system -- --motives` writes `docs/qa/creature-system/motivation-diagnostic-v1.json` separately from the retained foundation baseline.

In 2,000 seeded uniformly random complete ratings: 1,153 close outcomes (57.65%), including 453 exact ties (22.65%); mean best affinity 14.19. All six targets appear as Kindred and Complement. Six sparse target mixes cover 17/32 archetypes, leaving 15 unsupported. The six authored fixtures retain their winners through 768 single-rating perturbations, but self-match and robustness of authored fixtures are not evidence of psychological validity.

This exposes the next design work: broader target profiles and catalogue coverage, mixed-motivation examples, wording/response-bias review, and real-player comprehension/stability checks. Do not hide weak scores with a cosmetic multiplier or declare the matching problem solved. There is only one statement per archetype; this is a game-personality prototype.

Verification for this continuation: 22 behaviour tests; targeted TypeScript and isolated review build; browser checks at 1440/700/390/320px, including the new questionnaire; no browser errors or failed requests. Original live saves, questionnaire, rewards and checkout remain untouched. All production and artwork gates listed above remain open.

## Continuation — full-roster links and coverage map

The user asked to continue. The new draft adds motivation links to the 44 families that already had emotional/expression/practice directions but no archetype mix. The six pilot directions are retained. New proposals live separately in `rosterBriefs.ts`; the audited snapshot is not rewritten. The Gauntlet constraint kept this pass on one variable—catalogue coverage—rather than changing the scoring formula or mass-producing art at the same time.

- All 50 families have valid, distinct ordered three-motive targets. All 32 archetypes appear somewhere; 31 appear as a dominant motivation. Commander is currently supporting only, explicitly visible in the map rather than forced into an unrelated creature.
- Each new mix has an emotional/practice rationale, is labelled Draft on cards and remains reviewable. No new historical foundation answers are invented for creatures.
- The Roster map shows suit color, dominant/supporting families, stable family codes and emotional direction; suit filters and family details work on desktop and phone.
- One same-motives/different-order group is flagged for identity review: Sunring Staglet and Hearth Hare (Guardian/Caregiver/Devotee). This does not merge their ownership or evolution paths.
- Four independently written mixed-motivation examples are selectable: Thoughtful supporter, Curious builder, Quiet pathfinder and Steady organiser. Their leading draft matches are Bloom Mite, Shard Marten, Twilight Seed and Comet Cub respectively. These are synthetic review cases, not validation data.
- Full close-result lists are expandable; small numerical ties use a stable alphabetical order without implying a superior match. Affinity is bounded against floating-point artifacts. The inclusive two-point close boundary uses numerical tolerance consistently.

The same-input six-versus-fifty comparison is recorded in `docs/qa/creature-system/roster-diagnostic-v1.md` and `.json`, including the full 50-family rationale ledger. Mean best affinity rises from 14.19 to 17.07, but exact ties rise from 453 to 950 of 2,000 synthetic inputs. More candidates guarantee a nondecreasing best score; this is not proof of psychological improvement. The sparse target shape and coarse ratings still need work.

Verification: 26 behaviour tests; targeted TypeScript and isolated review build; browser tests at 1440/700/390/320px covering all 50 scored cards, 32 map rows, suit filtering, rationale drill-down, four mixed scenarios and retained Favourite. Original source checkout, live test, save state, rewards, assets and migration boundaries remain unchanged.

Next gate: review new creature motivations against expression/anatomy and address broad-profile/tie quality with controlled comparisons. Artwork production and live integration remain separate unfinished gates.

## Artwork review (unchanged)

Active candidates are in `public/assets/archetype-masks/candidates/` and `public/assets/creatures/candidates/twilight-seed/`. They were generated with the built-in image tool; prompts and source filenames are recorded in `creature-mask-prompts-v1.md` and `creature-form-prompts-v1.md`.

- Dreamer: searching upward wonder, clear moonfold silhouette. Candidate, not approved.
- Guardian: distinct shelter shape, but gaze may still read self-assured rather than protective; refine in expression QA.
- Caregiver v2: corrected from peach/red to a distinct rose-pink Heart palette; concerned tenderness reads clearly.
- Analyst: faceted diamond and sideward investigative gaze. Candidate, not approved.
- Twilight: three recognizable silhouettes and individual files. Form 2 was revised because its first attempt still used oversized baby eyes. Revised eyes are smaller, but mature emotional readability still warrants review; form 3 can read concern as much as wonder. No final art approval claimed.

Production assets remain null in the audited registry. There are now **4/32 mask candidates and 5/130 form candidates**, not approved assets. The remaining existing artwork stays as labelled reference art, not silently reclassified as the redesign. The 2026-09-19 additions and exact prompts/source paths are in `creature-mature-contrast-2026-09-19.md`. Bloom's first new attempt was not selected due to a feline face; the revision and Echo still have explicit expression-review risks.

## 2026-09-19 — user-prioritised creature readiness and statistics

The 50-family visual ledger reserves separate silhouettes, materials, palette placement, motion and mature eyes/attention structures. The ten-batch production queue prioritises the three-organism contrast gate, then the user's preferred reference families. These are design briefs, not proof that all 50 images are distinct or finished. Form-1 baby-eye similarity is allowed; later forms must use family-specific mature expression systems. Existing 2/3/4-form plans remain provisional and are not clamped against saved progress.

The dex and Match statistics default to owned-first A–Z. Options include A–Z, highest affinity, marginal team addition and rarity (Mythic first). Filters distinguish owned/unowned. Ties at displayed precision share catalogue ranks; missing scores sort last and do not become zero. Complement is evaluated after current Kindred/Favourite, and anchor families are excluded. Statistics/sorting never equip or mutate saves. Art production shows five form candidates across three mature families and zero approved production forms.

Verification includes 30 behaviour tests, targeted compilation/review build and the updated browser suite. The first browser run used old port 5188 and correctly failed to find this preview; its listener belonged to a different worktree. This preview was moved to 5189 without touching the other server. See the latest browser report for the final UI result.

## Safety / rollout

The review build writes only to its in-memory fixture store. Reset/reload clears that fixture; serialized reducer replay is tested, but this is not persistence QA. No ownership, egg outcome, timer, reward or active companion in a real save has changed.

Never wire `labStore` into production. Integrate UI reads through `useIslandRunState`, and equip/claim/sell/progression through mutex-protected canonical action services. Trio data must round-trip through normalization, remote persistence, conflict merge and guest/account reconciliation together. Keep `activeCompanionId` effects unchanged until a reviewed replacement avoids double bonuses. Unknown families and already-earned higher forms are retained, not clamped or deleted.
