# Release freeze — 2026-09-20

User decision: stop further ceremony/visual refinement for now, finish the safe
release, publish to live, and leave further improvement for a later task.
This supersedes the earlier full-finish-before-release execution scope.

## Release boundary

- Ship the colorful source-004 island and compact ornate palace, including
  additive construction and optimized geometry.
- Preserve latest main's smooth/fast building, Crystal Miners, authored-world
  previews and mandatory playable-mission completion rules.
- Include the implemented, tested opening animation and gradual-introduction
  services in code, but **do not enroll new or existing players**. There is no
  runtime call to `createOpeningGamesCampaignLedger` outside tests. Normal
  players retain their existing island order, egg/event/puzzle/wheel behavior.
- The proposed 002/004 swap and ceremony-led introduction are therefore not
  activated for ordinary players in this release. The palace remains on004.
- Balcony garden assembly remains a development-only preview. Do not ship the
  over-budget garden preview by silently enabling it.

## Deferred, not claimed complete

Full first-session narrative/egg/event integration and campaign enrollment;
themed traffic-light assets; sculpted coast/integrated gardens; royal sailing
ship; additional ceremony crowds/arrivals/stage dressing. The yacht and floating
mega-arena are proposals, not built features. Physical-phone acceptance and
full-island reference likeness are not established by desktop browser captures.

## Integration

Release checkout: `/private/tmp/island-release-20260920`, branch
`codex/island-release-20260920`. Starting checkpoint `a01f5ed2`; main baseline
`1426f994`. Original workspace, local gallery and untracked art packets are
preserved untouched under the `0094` Codex worktree.

Main moved mission logic to `islandRunMissionObjectives`. The ceremony case,
cohort-aware briefing/restoration lookup and egg-free Welcome activity credit
are retained there; the phone remains main's thin shared-resolver wrapper.
Canonical completion keeps main's required playable missions and uses the
specialized ceremony/Re-Docking gates only for explicitly marked saves.

Validation/deployment results are recorded separately after execution. Earlier
`local-validation-20260920.json` is checkpoint evidence, not deployment proof.
